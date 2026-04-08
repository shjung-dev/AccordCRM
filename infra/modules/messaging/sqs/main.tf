#Log SQS
resource "aws_sqs_queue" "log_queue" {
  name                       = "${var.project_name}-log-queue"
  visibility_timeout_seconds = var.log_queue_visibility_timeout_seconds
  message_retention_seconds  = var.log_queue_message_retention_seconds
  fifo_queue                 = false

  redrive_policy = jsonencode({
    deadLetterTargetArn = var.log_dlq_arn
    maxReceiveCount     = var.log_queue_max_receive_count
  })

  tags = {
    Name    = "${var.project_name}-log-queue"
    Project = var.project_name
    Env     = var.environment
  }
}


#Email SQS
resource "aws_sqs_queue" "email_queue" {
  name                       = "${var.project_name}-email-queue"
  visibility_timeout_seconds = var.email_queue_visibility_timeout_seconds
  message_retention_seconds  = var.email_queue_message_retention_seconds
  fifo_queue                 = false
  redrive_policy = jsonencode({
    deadLetterTargetArn = var.email_dlq_arn
    maxReceiveCount     = var.email_queue_max_receive_count
  })

  tags = {
    Name    = "${var.project_name}-email-queue"
    Project = var.project_name
    Env     = var.environment
  }
}






