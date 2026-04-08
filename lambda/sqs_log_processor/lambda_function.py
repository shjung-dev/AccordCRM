"""
Lambda: SQS Log Processor
-------------------------
Triggered by SQS. Each message represents an audit log event published by a
backend microservice (client-service, account-service, user-service).
The Lambda parses the message and writes an item to the DynamoDB log table.

Environment variables required:
  DYNAMO_TABLE_NAME - DynamoDB table name for audit logs

SQS message body (JSON):
{
  "userId":        "<UUID>",          -- required: the agent/admin who triggered the action
  "action":        "CLIENT_CREATED",  -- required: see ALLOWED_ACTIONS
  "entityType":    "CLIENT",          -- required: e.g. CLIENT, ACCOUNT, USER
  "entityId":      "<UUID>",          -- required: the primary key of the affected entity
  "attributeName": "First Name",      -- optional: for UPDATE actions
  "beforeValue":   "Lee",             -- optional: previous value (UPDATE only)
  "afterValue":    "Tan",             -- optional: new value (UPDATE only)
  "actionStatus":  "SUCCESS",         -- optional: defaults to SUCCESS
  "errorMessage":  null,              -- optional
  "reason":        null,              -- optional
  "sourceService": "client-service"   -- optional: originating microservice
}
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(os.environ["DYNAMO_TABLE_NAME"])

# ---------------------------------------------------------------------------
# Allowed actions (mirrors LogActionAllowlist.java)
# ---------------------------------------------------------------------------
ALLOWED_ACTIONS = {
    "USER_CREATED", "USER_DELETED", "USER_UPDATED", "PASSWORD_RESET",
    "USER_AUTHENTICATED", "CLIENT_CREATED", "CLIENT_UPDATED", "CLIENT_DELETED",
    "CLIENT_VIEWED", "CLIENT_VERIFICATION_STARTED", "CLIENT_VERIFICATION_PASSED",
    "CLIENT_VERIFICATION_FAILED", "CLIENT_VERIFICATION_REVIEWED",
    "ACCOUNT_CREATED", "ACCOUNT_UPDATED", "ACCOUNT_DELETED", "ACCOUNT_VIEWED",
    "COMMUNICATION_CREATED", "COMMUNICATION_STATUS_CHECKED",
    "TRANSACTIONS_IMPORTED", "TRANSACTION_VIEWED",
    "AUTH_FAILED", "VALIDATION_FAILED",
}


# ---------------------------------------------------------------------------
# Core processing
# ---------------------------------------------------------------------------

def _parse_message(raw_body: str) -> dict:
    """Parse and validate an SQS message body into a DynamoDB item."""
    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in message body: {e}")

    required = {"userId", "action", "entityType", "entityId"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Message missing required fields: {missing}")

    action = data["action"]
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"Unknown action '{action}' — not in allowlist")

    item = {
        "log_id":        str(data.get("logId") or uuid.uuid4()),
        "user_id":       str(data["userId"]),
        "action":        action,
        "entity_type":   data["entityType"],
        "entity_id":     str(data["entityId"]),
        "timestamp":     datetime.now(timezone.utc).isoformat(),
        "action_status": data.get("actionStatus", "SUCCESS"),
        "source_service": data.get("sourceService", "lambda-sqs-processor"),
    }

    # Only include optional fields if present — DynamoDB does not accept null values
    for src_key, dst_key in [
        ("attributeName", "attribute_name"),
        ("beforeValue",   "before_value"),
        ("afterValue",    "after_value"),
        ("errorMessage",  "error_message"),
        ("reason",        "reason"),
    ]:
        if data.get(src_key) is not None:
            item[dst_key] = data[src_key]

    return item


def _put_log(item: dict):
    """Write a log item to DynamoDB. Silently skips duplicates (idempotent)."""
    try:
        _table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(log_id)",
        )
        logger.info("Wrote log_id=%s action=%s entity_type=%s",
                    item["log_id"], item["action"], item["entity_type"])
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.info("Duplicate log_id=%s — skipped", item["log_id"])
        else:
            raise


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """
    Entry point. Processes each record in the SQS batch.
    Failed records are reported back so SQS can retry them individually
    (requires a Dead Letter Queue on the SQS source).
    """
    records = event.get("Records", [])
    logger.info("Received %d SQS record(s)", len(records))

    batch_item_failures = []

    for record in records:
        message_id = record.get("messageId", "unknown")
        body = record.get("body", "")

        try:
            item = _parse_message(body)
            _put_log(item)
        except Exception as exc:
            logger.error("Failed to process messageId=%s: %s", message_id, exc)
            batch_item_failures.append({"itemIdentifier": message_id})

    if batch_item_failures:
        logger.warning("%d record(s) failed and will be retried", len(batch_item_failures))

    return {"batchItemFailures": batch_item_failures}
