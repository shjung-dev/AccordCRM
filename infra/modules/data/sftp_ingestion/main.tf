# S3 staging bucket for SFTP ingestion
resource "aws_s3_bucket" "sftp_staging" {
  bucket = "${var.project_name}-sftp-staging-${var.environment}"

  tags = {
    Name    = "${var.project_name}-sftp-staging"
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sftp_staging" {
  bucket = aws_s3_bucket.sftp_staging.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "sftp_staging" {
  bucket = aws_s3_bucket.sftp_staging.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "sftp_staging" {
  bucket                  = aws_s3_bucket.sftp_staging.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Transfer Family SFTP Connector (pulls files from external SFTP server into S3)
resource "aws_transfer_connector" "sftp" {
  url         = "sftp://${var.sftp_host}"
  access_role = var.transfer_family_role_arn

  sftp_config {
    user_secret_id    = var.sftp_credentials_secret_arn
    trusted_host_keys = var.sftp_trusted_host_keys
  }

  tags = {
    Name    = "${var.project_name}-sftp-connector"
    Project = var.project_name
    Env     = var.environment
  }
}
