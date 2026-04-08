output "transfer_family_role_arn" {
  description = "IAM role ARN for AWS Transfer Family to write to S3."
  value       = aws_iam_role.transfer_family_role.arn
}

output "sftp_initiator_role_arn" {
  description = "IAM role ARN for the sftp_initiator Lambda."
  value       = aws_iam_role.sftp_initiator_role.arn
}

output "sftp_processor_role_arn" {
  description = "IAM role ARN for the sftp_processor Lambda."
  value       = aws_iam_role.sftp_processor_role.arn
}
