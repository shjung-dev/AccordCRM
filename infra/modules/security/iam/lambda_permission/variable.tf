variable "lambdas" {
  description = "A map of lambda functions and their associated policies. The key is the name of the lambda function, and the value is an object containing a list of policies with their effect, actions, and resources."
  type = map(object({
    policies = list(object({
      effect    = string
      actions   = list(string)
      resources = list(string)
    }))
  }))
}


variable "project_name" {
  description = "The name of the project. This will be used as a prefix for naming resources."
  type        = string
}

variable "environment" {
  description = "The environment for which the resources are being created (e.g., dev, staging, prod). This will be used as a tag for the resources."
  type        = string
}



