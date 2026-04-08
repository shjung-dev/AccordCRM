variable "region" {
  description = "The AWS region where the VPC endpoints will be created."
  type        = string
}


variable "vpc_id" {
  description = "VPC ID"
  type        = string
}


variable "private_app_subnet_ids" {
  description = "List of private subnet IDs for application resources (used for interface endpoints)."
  type        = list(string)
}

variable "private_app_route_table_id" {
  description = "Route table ID for private application subnets (used for gateway endpoints)."
  type        = string
}

variable "private_lambda_route_table_id" {
  description = "Route table ID for private lambda subnets (used for S3 gateway endpoint)."
  type        = string
}

variable "vpc_endpoint_sg_id" {
  description = "Security group ID for VPC endpoints (used for interface endpoints)."
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

