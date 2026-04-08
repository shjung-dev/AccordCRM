variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}


variable "vpc_id" {
  description = "VPC ID"
  type = string
}

variable "igw_id" {
  description = "Internet Gateway ID"
  type = string
}


variable "public_subnet_ids" {
  description = "List of public subnet IDs to associate with the public route table"
  type = list(string)
}


variable "private_app_subnet_ids" {
  description = "List of private app subnet IDs to associate with the private app route table"
  type = list(string)
}


variable "private_data_subnet_ids" {
  description = "List of private data subnet IDs to associate with the private data route table"
  type = list(string)
}

variable "private_lambda_subnet_ids" {
  description = "List of private lambda subnet IDs to associate with the private lambda route table"
  type        = list(string)
}




