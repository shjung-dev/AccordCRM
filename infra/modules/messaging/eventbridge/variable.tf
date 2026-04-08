variable "lambdas" {
  description = "A map of lambda function configurations, including schedule expressions and ARNs."
  type = map(object({
    lambda_name       = string
    lambda_arn        = string
    schedule_expression = string
  }))
}

variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}

