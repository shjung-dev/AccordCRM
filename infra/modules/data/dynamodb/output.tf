output "log_dynamodb_name" {
  value = aws_dynamodb_table.log.name
}


output "risk_score_dynamodb_name" {
  value = aws_dynamodb_table.risk_score.name
}


output "ai_chatbot_audit_dynamodb_name" {
  value = aws_dynamodb_table.ai_chatbot_audit.name
}


output "risk_score_dynamodb_arn" {
  value = aws_dynamodb_table.risk_score.arn
}


output "ai_chatbot_audit_dynamodb_arn" {
  value = aws_dynamodb_table.ai_chatbot_audit.arn
}


output "log_dynamodb_arn" {
  value = aws_dynamodb_table.log.arn
}

