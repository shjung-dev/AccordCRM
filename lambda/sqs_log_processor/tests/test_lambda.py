"""
Unit tests for sqs_log_processor/lambda_function.py
Run with:  python -m pytest lambda/sqs_log_processor/tests/ -v
           (from repo root)
"""

import importlib
import json
import os
import sys
import uuid
from unittest import mock
from unittest.mock import MagicMock, patch, call

import pytest

# ── Stub psycopg2 before the module is imported ──────────────────────────────
psycopg2_stub = MagicMock()
psycopg2_stub.extras = MagicMock()
sys.modules.setdefault("psycopg2", psycopg2_stub)
sys.modules.setdefault("psycopg2.extras", psycopg2_stub.extras)

# ── Set required env vars before import ──────────────────────────────────────
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "logdb")
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASSWORD", "secret")

# ── Import the module under test ─────────────────────────────────────────────
# Ensure a fresh import (not cached from a previous test run)
if "lambda_function" in sys.modules:
    del sys.modules["lambda_function"]

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import lambda_function as lf  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

USER_ID  = str(uuid.uuid4())
ENTITY_ID = str(uuid.uuid4())


def _make_sqs_event(*bodies: dict) -> dict:
    """Build a minimal SQS event with one or more records."""
    return {
        "Records": [
            {
                "messageId": str(uuid.uuid4()),
                "body": json.dumps(b),
            }
            for b in bodies
        ]
    }


def _valid_body(**overrides) -> dict:
    base = {
        "userId":    USER_ID,
        "action":    "CLIENT_CREATED",
        "entityType": "CLIENT",
        "entityId":  ENTITY_ID,
        "sourceService": "client-service",
    }
    base.update(overrides)
    return base


# ─────────────────────────────────────────────────────────────────────────────
# _parse_message tests
# ─────────────────────────────────────────────────────────────────────────────

class TestParseMessage:

    def test_valid_minimal_message(self):
        row = lf._parse_message(json.dumps(_valid_body()))
        assert row["action"] == "CLIENT_CREATED"
        assert row["entity_type"] == "CLIENT"
        assert row["action_status"] == "SUCCESS"
        assert row["source_service"] == "client-service"

    def test_auto_generates_log_id_when_absent(self):
        row = lf._parse_message(json.dumps(_valid_body()))
        assert isinstance(row["log_id"], uuid.UUID)

    def test_uses_provided_log_id(self):
        lid = str(uuid.uuid4())
        row = lf._parse_message(json.dumps(_valid_body(logId=lid)))
        assert row["log_id"] == uuid.UUID(lid)

    def test_optional_fields_default_to_none(self):
        row = lf._parse_message(json.dumps(_valid_body()))
        assert row["attribute_name"] is None
        assert row["before_value"]   is None
        assert row["after_value"]    is None
        assert row["error_message"]  is None
        assert row["reason"]         is None

    def test_update_action_with_before_after(self):
        body = _valid_body(action="CLIENT_UPDATED",
                           attributeName="First Name",
                           beforeValue="Lee",
                           afterValue="Tan")
        row = lf._parse_message(json.dumps(body))
        assert row["attribute_name"] == "First Name"
        assert row["before_value"]   == "Lee"
        assert row["after_value"]    == "Tan"

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            lf._parse_message("not-json")

    def test_missing_required_field_raises(self):
        body = _valid_body()
        del body["action"]
        with pytest.raises(ValueError, match="missing required fields"):
            lf._parse_message(json.dumps(body))

    def test_unknown_action_raises(self):
        with pytest.raises(ValueError, match="not in allowlist"):
            lf._parse_message(json.dumps(_valid_body(action="DROP_TABLE")))

    def test_invalid_uuid_raises(self):
        with pytest.raises(ValueError):
            lf._parse_message(json.dumps(_valid_body(userId="not-a-uuid")))

    @pytest.mark.parametrize("action", [
        "CLIENT_CREATED", "CLIENT_UPDATED", "CLIENT_DELETED", "CLIENT_VIEWED",
        "ACCOUNT_CREATED", "ACCOUNT_DELETED", "USER_CREATED", "TRANSACTIONS_IMPORTED",
    ])
    def test_all_allowed_actions_accepted(self, action):
        row = lf._parse_message(json.dumps(_valid_body(action=action)))
        assert row["action"] == action


# ─────────────────────────────────────────────────────────────────────────────
# handler tests (db connection is mocked)
# ─────────────────────────────────────────────────────────────────────────────

class TestHandler:

    def _mock_conn(self):
        conn = MagicMock()
        conn.closed = False
        cur = MagicMock()
        conn.cursor.return_value.__enter__ = lambda s: cur
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        return conn, cur

    def test_single_valid_record_inserts_and_returns_no_failures(self):
        conn, cur = self._mock_conn()
        with patch.object(lf, "_get_db_connection", return_value=conn):
            result = lf.handler(_make_sqs_event(_valid_body()), None)
        assert result["batchItemFailures"] == []
        cur.execute.assert_called_once()

    def test_returns_failed_message_id_on_bad_json(self):
        event = {"Records": [{"messageId": "msg-bad", "body": "!!!"}]}
        with patch.object(lf, "_get_db_connection", return_value=MagicMock(closed=False)):
            result = lf.handler(event, None)
        assert any(f["itemIdentifier"] == "msg-bad" for f in result["batchItemFailures"])

    def test_bad_record_does_not_block_good_records(self):
        good_id = "msg-good"
        bad_id  = "msg-bad"
        event = {
            "Records": [
                {"messageId": bad_id,  "body": "invalid-json"},
                {"messageId": good_id, "body": json.dumps(_valid_body())},
            ]
        }
        conn, cur = self._mock_conn()
        with patch.object(lf, "_get_db_connection", return_value=conn):
            result = lf.handler(event, None)

        failed_ids = [f["itemIdentifier"] for f in result["batchItemFailures"]]
        assert bad_id  in failed_ids
        assert good_id not in failed_ids
        cur.execute.assert_called_once()  # good record was inserted

    def test_empty_records_list(self):
        result = lf.handler({"Records": []}, None)
        assert result["batchItemFailures"] == []

    def test_db_error_marks_message_as_failed(self):
        conn = MagicMock()
        conn.closed = False
        conn.cursor.side_effect = Exception("DB down")
        with patch.object(lf, "_get_db_connection", return_value=conn):
            event = _make_sqs_event(_valid_body())
            result = lf.handler(event, None)
        assert len(result["batchItemFailures"]) == 1
