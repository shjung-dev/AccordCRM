variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}


variable "log_dlq_visibility_timeout_seconds" {
  description = "The visibility timeout for the log DLQ in seconds."
  type        = number
}

variable "log_dlq_message_retention_seconds" {
  description = "The message retention period for the log DLQ in seconds."
  type        = number
}



variable "email_dlq_visibility_timeout_seconds" {
  description = "The visibility timeout for the email DLQ in seconds."
  type        = number
}

variable "email_dlq_message_retention_seconds" {
  description = "The message retention period for the email DLQ in seconds."
  type        = number
}

variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)."
  type        = string
}











