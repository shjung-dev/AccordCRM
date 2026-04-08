"""
Lambda: SFTP Initiator
-----------------------
Triggered by EventBridge Scheduler on a cron schedule.
Calls AWS Transfer Family StartFileTransfer to pull files from an
external SFTP server into the S3 staging bucket via the configured connector.

Environment variables required:
  SFTP_CONNECTOR_ID  - AWS Transfer Family connector ID
  SFTP_REMOTE_PATH   - Comma-separated absolute file paths on the remote SFTP server
                       e.g. /incoming/transactions.csv,/incoming/accounts.csv
  S3_BUCKET          - Destination S3 bucket name (sftp staging bucket)
  S3_PREFIX          - (optional) S3 key prefix for destination e.g. incoming
"""

import logging
import os

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

client = boto3.client('transfer', region_name='ap-southeast-1')


def handler(event, context):
    connector_id = os.environ["SFTP_CONNECTOR_ID"]
    remote_path = os.environ["SFTP_REMOTE_PATH"]
    s3_bucket = os.environ["S3_BUCKET"]
    s3_prefix = os.environ.get("S3_PREFIX", "").strip("/")

    if s3_prefix:
        local_directory_path = f"/{s3_bucket}/{s3_prefix}"
    else:
        local_directory_path = f"/{s3_bucket}"

    retrieve_paths = [p.strip() for p in remote_path.split(",") if p.strip()]

    if not retrieve_paths:
        raise ValueError("SFTP_REMOTE_PATH is empty — provide comma-separated file paths")

    logger.info("ENV SFTP_CONNECTOR_ID = '%s'", connector_id)
    logger.info("ENV SFTP_REMOTE_PATH = '%s'", remote_path)
    logger.info("ENV S3_BUCKET = '%s'", s3_bucket)
    logger.info("Computed LocalDirectoryPath = '%s'", local_directory_path)
    logger.info("RetrieveFilePaths = %s", retrieve_paths)

    response = client.start_file_transfer(
        ConnectorId=connector_id,
        RetrieveFilePaths=retrieve_paths,
        LocalDirectoryPath=local_directory_path,
    )

    transfer_id = response.get("TransferId")
    logger.info("Transfer started: TransferId=%s", transfer_id)

    return {
        "statusCode": 200,
        "transferId": transfer_id,
        "connectorId": connector_id,
        "retrievePaths": retrieve_paths,
    }