variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "user_rds_allocated_storage" {
  description = "The allocated storage for the user RDS instance (in GB)"
  type        = number
}


variable "user_rds_engine" {
  description = "The database engine for the user RDS instance (e.g., 'mysql')"
  type        = string
}

variable "user_rds_engine_version" {
  description = "The database engine version for the user RDS instance (e.g., '8.0')"
  type        = string
}

variable "user_rds_instance_class" {
  description = "The instance class for the user RDS instance (e.g., 'db.t3.micro')"
  type        = string
}

variable "user_rds_db_name" {
  description = "The initial database name for the user RDS instance"
  type        = string
}

variable "user_rds_username" {
  description = "The master username for the user RDS instance"
  type        = string
}


variable "user_rds_password" {
  description = "The master password for the user RDS instance"
  type        = string
  sensitive   = true
}

variable "user_rds_port" {
  description = "The port number for the user RDS instance (e.g., 3306)"
  type        = number
}

variable "user_rds_multi_az" {
  description = "Whether to enable Multi-AZ for the user RDS instance"
  type        = bool
}


variable "kms_key_id" {
  description = "The KMS key ID for encrypting RDS storage"
  type        = string
}

variable "kms_key_arn" {
  description = "The KMS key ARN for encrypting RDS storage"
  type        = string
}

variable "skip_final_snapshot" {
  description = "Whether to skip the final snapshot when deleting the RDS instance"
  type        = bool
}


variable "client_rds_allocated_storage" {
  description = "The allocated storage for the client RDS instance (in GB)"
  type        = number
}

variable "client_rds_engine" {
  description = "The database engine for the client RDS instance (e.g., 'mysql')"
  type        = string
}

variable "client_rds_engine_version" {
  description = "The database engine version for the client RDS instance (e.g., '8.0')"
  type        = string
}


variable "client_rds_instance_class" {
  description = "The instance class for the client RDS instance (e.g., 'db.t3.micro')"
  type        = string
}

variable "client_rds_db_name" {
  description = "The initial database name for the client RDS instance"
  type        = string
}

variable "client_rds_username" {
  description = "The master username for the client RDS instance"
  type        = string
}


variable "client_rds_password" {
  description = "The master password for the client RDS instance"
  type        = string
  sensitive   = true
}


variable "client_rds_port" {
  description = "The port number for the client RDS instance (e.g., 3306)"
  type        = number
}

variable "client_rds_multi_az" {
  description = "Whether to enable Multi-AZ for the client RDS instance"
  type        = bool
}


variable "account_transaction_rds_allocated_storage" {
  description = "The allocated storage for the account & transaction RDS instance (in GB)"
  type        = number
}

variable "account_transaction_rds_engine" {
  description = "The database engine for the account & transaction RDS instance (e.g., 'mysql')"
  type        = string
}


variable "account_transaction_rds_engine_version" {
  description = "The database engine version for the account & transaction RDS instance (e.g., '8.0')"
  type        = string
}


variable "account_transaction_rds_instance_class" {
  description = "The instance class for the account & transaction RDS instance (e.g., 'db.t3.micro')"
  type        = string
}


variable "account_transaction_rds_db_name" {
  description = "The initial database name for the account & transaction RDS instance"
  type        = string
}

variable "account_transaction_rds_username" {
  description = "The master username for the account & transaction RDS instance"
  type        = string
}


variable "account_transaction_rds_password" {
  description = "The master password for the account & transaction RDS instance"
  type        = string
  sensitive   = true
}

variable "account_transaction_rds_port" {
  description = "The port number for the account & transaction RDS instance (e.g., 3306)"
  type        = number
}

variable "account_transaction_rds_multi_az" {
  description = "Whether to enable Multi-AZ for the account & transaction RDS instance"
  type        = bool
}


variable "private_data_subnet_ids" {
  description = "List of private subnet IDs for the RDS instances in the data layer"
  type        = list(string)
}


variable "rds_sg_id" {
  description = "The security group ID for the RDS instances in the private data layer"
  type        = string
}



variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)"
  type        = string
}







