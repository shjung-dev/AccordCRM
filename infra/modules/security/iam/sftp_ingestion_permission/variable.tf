variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}

variable "environment" {
  description = "The deployment environment (e.g., dev, prod)."
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN used for S3 bucket encryption."
  type        = string
}

variable "sftp_credentials_secret_arn" {
  description = "Secrets Manager ARN containing the SFTP credentials for the Transfer Family connector."
  type        = string
}
