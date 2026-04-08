variable "project_name" {
  description = "The name of the project."
  type = string
}

variable "environment" {
  description = "The environment (e.g., dev, staging, prod)."
  type        = string
}

variable "password_policy" {
  type = object({
    minimum_length                    = number
    require_uppercase                 = bool
    require_lowercase                 = bool
    require_numbers                   = bool
    require_symbols                   = bool
    temporary_password_validity_days   = number
  })
}


variable "token_validity" {
  type = object({
    access_token_hours  = number
    id_token_hours      = number
    refresh_token_days  = number
  })
}



variable "custom_attributes" {
  type = list(object({
    name      = string
    data_type = string
    required  = bool
    mutable   = bool
    min_length = number
    max_length = number
  }))
}

variable "root_user_email" {
  description = "Email address for the root admin user created in Cognito on first apply."
  type        = string
}

variable "root_user_temp_password" {
  description = "Temporary password for the root admin user. Must be changed on first login."
  type        = string
  sensitive   = true
}

variable "enable_seed_users" {
  description = "Set to true to create Cognito accounts for the seeded DB users. Set to false (or delete seed_users.tf) to disable."
  type        = bool
  default     = false
}

variable "seed_user_temp_password" {
  description = "Temporary password assigned to all seeded Cognito users. Must be changed on first login."
  type        = string
  sensitive   = true
  default     = ""
}




