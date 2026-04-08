variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}

variable "environment" {
  description = "The deployment environment (dev only — do not use in prod)."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID to place the mock SFTP server security group in."
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID to launch the mock SFTP EC2 instance in."
  type        = string
}
