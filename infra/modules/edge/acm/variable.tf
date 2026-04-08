variable "domain_name" {
  description = "The domain name for the ACM certificate (e.g., example.com)."
  type        = string
}


variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}

variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)."
  type        = string
}


variable "subject_alternative_names" {
  description = "A list of additional domain names to include in the ACM certificate (e.g., www.example.com)."
  type        = list(string)
}










