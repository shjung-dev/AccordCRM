variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}

variable "environment" {
  description = "The deployment environment (e.g., dev, prod)."
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN used to encrypt the S3 staging bucket."
  type        = string
}

variable "sftp_host" {
  description = "Hostname of the external SFTP server (without sftp:// prefix)."
  type        = string
}

variable "sftp_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing SFTP credentials. Secret must have keys: Username, PrivateKey."
  type        = string
}

variable "sftp_trusted_host_keys" {
  description = "List of trusted host public keys for the external SFTP server (base64-encoded)."
  type        = list(string)
}

variable "transfer_family_role_arn" {
  description = "IAM role ARN that AWS Transfer Family assumes to write files to S3."
  type        = string
}
