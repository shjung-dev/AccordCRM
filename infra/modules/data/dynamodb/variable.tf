variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}



variable "kms_key_arn" {
  description = "KMS key used to encrypt the data at rest in dynamodb"
  type        = string
}
