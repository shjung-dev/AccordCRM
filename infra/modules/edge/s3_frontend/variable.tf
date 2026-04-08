variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for the frontend"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
}




variable "kms_key_arn" {
  description = "ARN of the KMS key for server-side encryption"
  type        = string
}


variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  type        = string
}

variable "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role that deploys frontend assets to S3"
  type        = string
}




