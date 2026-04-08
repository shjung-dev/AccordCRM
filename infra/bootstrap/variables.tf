variable "tf_state_bucket_name" {
  description = "Name of the S3 bucket to store Terraform state"
  type        = string
  default     = "accordcrm-terraform-state-bucket"
}



variable "dynamo_lock_name" {
  description = "Name of the Dynamo Lock Table"
  type        = string
  default     = "accordcrm-terraform-state-dynamo-lock"
}


