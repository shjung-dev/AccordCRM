#Log DynamoDB Table
resource "aws_dynamodb_table" "log" {
  name         = "${var.project_name}-log"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "log_id"

  #Enable server-side encryption with the KMS key created in the bootstrap module
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  attribute {
    name = "log_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  tags = {
    Name = "${var.project_name}-log"
  }
}


#Risk Score DynamoDB Table
resource "aws_dynamodb_table" "risk_score" {
  name         = "${var.project_name}-risk-score"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "risk_score_id"

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  attribute {
    name = "risk_score_id"
    type = "S"
  }

  attribute {
    name = "client_id"
    type = "S"
  }

  # GSI to query all churn risk assessments for a given client
  global_secondary_index {
    name            = "client-id-index"
    hash_key        = "client_id"
    projection_type = "ALL"
  }

  tags = {
    Name = "${var.project_name}-risk-score"
  }

}


#AI Chatbot Audit DynamoDB Table
resource "aws_dynamodb_table" "ai_chatbot_audit" {
  name         = "${var.project_name}-ai-chatbot-audit"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ai_chatbot_audit_id"

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  attribute {
    name = "ai_chatbot_audit_id"
    type = "S"
  }

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI to query conversation history by session
  global_secondary_index {
    name            = "session-id-index"
    hash_key        = "session_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI to query all sessions for a user
  global_secondary_index {
    name            = "user-id-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name = "${var.project_name}-ai-chatbot-audit"
  }
}





