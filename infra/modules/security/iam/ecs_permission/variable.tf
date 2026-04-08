variable "microservices"{
    description = "Map of microservices with their specific policies"
    type = map(object({
        name = string
        policies = list(object({
            effect = string
            actions = list(string)
            resources = list(string)
        }))
    }))
}


variable "project_name" {
  description = "The name of the project for tagging purposes"
  type        = string
}


variable "environment" {
  description = "The environment for tagging purposes (e.g., dev, staging, prod)"
  type        = string
}
