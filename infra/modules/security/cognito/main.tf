# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = var.password_policy.minimum_length
    require_uppercase                = var.password_policy.require_uppercase
    require_lowercase                = var.password_policy.require_lowercase
    require_numbers                  = var.password_policy.require_numbers
    require_symbols                  = var.password_policy.require_symbols
    temporary_password_validity_days = var.password_policy.temporary_password_validity_days
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # Standard attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  schema {
    name                = "given_name"
    attribute_data_type = "String"
    required            = false
    mutable             = true
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                = "family_name"
    attribute_data_type = "String"
    required            = false
    mutable             = true
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  # Custom attributes from variable
  dynamic "schema" {
    for_each = var.custom_attributes
    content {
      name                = schema.value.name
      attribute_data_type = schema.value.data_type
      required            = schema.value.required
      mutable             = schema.value.mutable
      string_attribute_constraints {
        min_length = schema.value.min_length
        max_length = schema.value.max_length
      }
    }
  }

  tags = { Name = "${var.project_name}-${var.environment}-user-pool" }
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Admin users"
}

resource "aws_cognito_user_group" "agent" {
  name         = "agent"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Agent users"
}

resource "aws_cognito_user_group" "root_admin" {
  name         = "root_admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Root admin users"
}

resource "aws_cognito_user" "root_admin" {
  user_pool_id       = aws_cognito_user_pool.main.id
  username           = var.root_user_email
  temporary_password = var.root_user_temp_password

  attributes = {
    email          = var.root_user_email
    email_verified = "true"
  }

  lifecycle {
    ignore_changes = [temporary_password]
  }
}

resource "aws_cognito_user_in_group" "root_admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = aws_cognito_user.root_admin.username
  group_name   = aws_cognito_user_group.root_admin.name
}

# App Client
resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.project_name}-${var.environment}-frontend"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  access_token_validity  = var.token_validity.access_token_hours
  id_token_validity      = var.token_validity.id_token_hours
  refresh_token_validity = var.token_validity.refresh_token_days

  prevent_user_existence_errors = "ENABLED"

  read_attributes = concat(
    [
      "email",
      "given_name",
      "family_name",
    ],
    [for attr in var.custom_attributes : "custom:${attr.name}"]
  )

  write_attributes = concat(
    [
      "email",
      "given_name",
      "family_name",
    ],
    [for attr in var.custom_attributes : "custom:${attr.name}"]
  )
}