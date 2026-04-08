

output "tf_state_bucket_name" {
  description = "The name of the S3 bucket used for storing Terraform state."
  value       = module.s3.tf_state_bucket_name
}

output "kms_key_id" {
  description = "The ID of the KMS key used for encrypting Terraform state in S3."
  value       = module.kms.kms_key_id
}


output "kms_key_arn" {
  description = "The ARN of the KMS key used for encrypting Terraform state in S3."
  value       = module.kms.kms_key_arn
}


output "account_id" {
  description = "The AWS account ID where the resources are provisioned."
  value       = module.kms.account_id
}


