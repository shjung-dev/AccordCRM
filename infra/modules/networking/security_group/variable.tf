variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}


variable "vpc_id" {
  description = "VPC ID"
  type        = string
}


variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)."
  type        = string
}

variable "microservices" {
  description = "A map of microservices with their respective ports."
  type = map(object({
    port = number
  }))
}



