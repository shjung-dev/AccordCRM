#DLQ for Log SQS
resource "aws_sqs_queue" "log_dlq" {
  name                       = "${var.project_name}-log-dlq"
  visibility_timeout_seconds = var.log_dlq_visibility_timeout_seconds
  message_retention_seconds  = var.log_dlq_message_retention_seconds
  fifo_queue                 = false

  tags = {
    Name    = "${var.project_name}-log-dlq"
    Project = var.project_name
    Env     = var.environment
  }
}





#DLQ for Email SQS
resource "aws_sqs_queue" "email_dlq" {
  name                       = "${var.project_name}-email-dlq"
  visibility_timeout_seconds = var.email_dlq_visibility_timeout_seconds
  message_retention_seconds  = var.email_dlq_message_retention_seconds
  fifo_queue                 = false

  tags = {
    Name    = "${var.project_name}-email-dlq"
    Project = var.project_name
    Env     = var.environment
  }
}





