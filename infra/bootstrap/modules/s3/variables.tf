variable "tf_state_bucket_name" {
  description = "The name of the S3 bucket to store Terraform state."
  type        = string
}


variable "kms_key_id" {
  description = ""
  type        = string
}