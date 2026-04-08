variable "lambdas" {
  description = "Map of lambda functions and their configuration."
  type = map(object({
    handler       = string            # e.g., com.example.TransactionHandler::handleRequest
    runtime       = string            # java11 or java17
    jar_path      = string            # path to fat jar
    memory_size   = number            # e.g., 1024
    timeout       = number            # seconds
    env_vars      = map(string)       # environment variables
    vpc_config    = optional(object({ # set for VPC-enabled lambdas (e.g., those that need RDS access)
      subnet_ids         = list(string)
      security_group_ids = list(string)
    }))
  }))
}

variable "sqs_event_source_mappings" {
  description = "Map of SQS to Lambda event source mappings."
  type = map(object({
    lambda_key                         = string
    event_source_arn                   = string
    batch_size                         = optional(number, 10)
    maximum_batching_window_in_seconds = optional(number, 0)
    enabled                            = optional(bool, true)
  }))
  default = {}
}

variable "lambda_role_arns" {
  description = "A map of IAM role ARNs for each lambda function."
  type        = map(string)
}


variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}


variable "environment" {
  description = "The environment for the lambda functions (e.g., dev, prod)."
  type        = string
}