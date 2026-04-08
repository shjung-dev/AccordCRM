variable "repositories" {
  description = "Map of microservices (key = repo name)"
  type        = map(any)
}



variable "project_name" {
  description = "The name of the project, used for naming resources"
  type        = string
}


variable "environment" {
  description = "The deployment environment (e.g., dev, staging, prod)"
  type        = string
}

variable "max_image_count" {
  description = "The maximum number of images to keep in the ECR repository before old ones are expired"
  type        = number
}




