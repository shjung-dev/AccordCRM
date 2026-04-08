"""
Lambda: SFTP Processor
-----------------------
Triggered by S3 ObjectCreated events when Transfer Family drops a file
into the sftp staging bucket.

Reads the file from S3, parses each row, and bulk-inserts transactions
into the account-service PostgreSQL RDS database.

Environment variables required:
  DB_HOST     - RDS PostgreSQL host
  DB_PORT     - RDS PostgreSQL port (default: 5432)
  DB_NAME     - Database name
  DB_USER     - Database user
  DB_PASSWORD - Database password
"""

import csv
import io
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3
import psycopg2
import psycopg2.extras

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")

_db_conn = None


def _get_db_conn():
    global _db_conn
    if _db_conn is None or _db_conn.closed:
        _db_conn = psycopg2.connect(
            host=os.environ["DB_HOST"],
            port=int(os.environ.get("DB_PORT", 5432)),
            dbname=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            connect_timeout=5,
        )
        psycopg2.extras.register_uuid()
        logger.info("Opened RDS connection")
    return _db_conn


REQUIRED_COLS = {"client_id", "account_id", "transaction_type", "currency", "amount", "status"}
VALID_TYPES = {"D", "W"}
VALID_STATUSES = {"Completed", "Pending", "Failed"}

INSERT_SQL = """
    INSERT INTO transactions (
        transaction_id, client_id, account_id, correlation_id, idempotency_key,
        transaction_type, currency, amount, status, description,
        failure_reason, created_at, updated_at
    ) VALUES (
        %(transaction_id)s, %(client_id)s, %(account_id)s, %(correlation_id)s, %(idempotency_key)s,
        %(transaction_type)s, %(currency)s, %(amount)s, %(status)s, %(description)s,
        %(failure_reason)s, %(created_at)s, %(updated_at)s
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
"""


def _parse_csv(content: str, filename: str) -> list:
    reader = csv.DictReader(io.StringIO(content))
    reader.fieldnames = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []

    missing = REQUIRED_COLS - set(reader.fieldnames)
    if missing:
        raise ValueError(f"CSV {filename} missing columns: {missing}")

    rows = []
    for line_num, raw in enumerate(reader, start=2):
        row = {k.strip(): (v.strip() if v else "") for k, v in raw.items()}

        t_type = row.get("transaction_type", "").upper()
        if t_type not in VALID_TYPES:
            logger.warning("Row %d: invalid transaction_type '%s' — skipped", line_num, t_type)
            continue

        status = row.get("status", "")
        if status not in VALID_STATUSES:
            logger.warning("Row %d: invalid status '%s' — skipped", line_num, status)
            continue

        try:
            amount = Decimal(row["amount"])
            if amount < 0:
                raise ValueError("negative amount")
        except (InvalidOperation, ValueError):
            logger.warning("Row %d: invalid amount '%s' — skipped", line_num, row.get("amount"))
            continue

        try:
            client_id = uuid.UUID(row["client_id"])
            account_id = uuid.UUID(row["account_id"])
        except ValueError:
            logger.warning("Row %d: bad UUID — skipped", line_num)
            continue

        raw_txn_id = row.get("transaction_id", "")
        try:
            idempotency_key = uuid.UUID(raw_txn_id) if raw_txn_id else uuid.uuid4()
        except ValueError:
            idempotency_key = uuid.uuid4()

        raw_ts = row.get("created_at", "")
        try:
            created_at = (
                datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                if raw_ts
                else datetime.now(timezone.utc)
            )
        except ValueError:
            created_at = datetime.now(timezone.utc)

        rows.append({
            "transaction_id":   uuid.uuid4(),
            "client_id":        client_id,
            "account_id":       account_id,
            "correlation_id":   None,
            "idempotency_key":  idempotency_key,
            "transaction_type": t_type,
            "currency":         row.get("currency", "SGD").upper()[:3],
            "amount":           amount,
            "status":           status,
            "description":      row.get("description") or None,
            "failure_reason":   row.get("failure_reason") or None,
            "created_at":       created_at,
            "updated_at":       datetime.now(timezone.utc),
        })

    return rows


def handler(event, context):
    records = event.get("Records", [])
    total_rows = 0

    for record in records:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        filename = key.split("/")[-1]

        logger.info("Processing s3://%s/%s", bucket, key)

        try:
            obj = s3_client.get_object(Bucket=bucket, Key=key)
            content = obj["Body"].read().decode("utf-8")

            rows = _parse_csv(content, filename)
            if not rows:
                logger.info("No valid rows in %s", filename)
                continue

            conn = _get_db_conn()
            with conn.cursor() as cur:
                psycopg2.extras.execute_batch(cur, INSERT_SQL, rows, page_size=100)
            conn.commit()

            total_rows += len(rows)
            logger.info("Inserted %d rows from %s", len(rows), filename)

        except Exception as exc:
            logger.error("Failed to process %s: %s", key, exc)
            global _db_conn
            if _db_conn and not _db_conn.closed:
                try:
                    _db_conn.rollback()
                except Exception:
                    pass
            raise

    return {
        "statusCode": 200,
        "filesProcessed": len(records),
        "rowsInserted": total_rows,
    }
