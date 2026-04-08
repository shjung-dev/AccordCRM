variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}


variable "log_queue_visibility_timeout_seconds" {
  description = "The visibility timeout for the log SQS queue in seconds."
  type        = number
}

variable "log_queue_message_retention_seconds" {
  description = "The message retention period for the log SQS queue in seconds."
  type        = number
}


variable "log_queue_max_receive_count" {
  description = "The maximum number of times a message can be received before it is sent to the dead-letter queue."
  type        = number
}


variable "email_queue_visibility_timeout_seconds" {
  description = "The visibility timeout for the email SQS queue in seconds."
  type        = number
}

variable "email_queue_message_retention_seconds" {
  description = "The message retention period for the email SQS queue in seconds."
  type        = number
}

variable "email_queue_max_receive_count" {
  description = "The maximum number of times a message can be received before it is sent to the dead-letter queue."
  type        = number
}

variable "log_dlq_arn" {
  description = "The ARN of the dead-letter queue for the log SQS queue."
  type        = string
}

variable "email_dlq_arn" {
  description = "The ARN of the dead-letter queue for the email SQS queue."
  type        = string
}


variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)."
  type        = string
}

