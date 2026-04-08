output "sftp_staging_bucket_id" {
  description = "ID of the S3 staging bucket for SFTP ingestion."
  value       = aws_s3_bucket.sftp_staging.id
}

output "sftp_staging_bucket_arn" {
  description = "ARN of the S3 staging bucket for SFTP ingestion."
  value       = aws_s3_bucket.sftp_staging.arn
}

output "sftp_connector_id" {
  description = "ID of the Transfer Family SFTP connector."
  value       = aws_transfer_connector.sftp.connector_id
}

output "sftp_connector_arn" {
  description = "ARN of the Transfer Family SFTP connector."
  value       = aws_transfer_connector.sftp.arn
}
