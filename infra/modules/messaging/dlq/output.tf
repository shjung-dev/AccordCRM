output "log_dlq_arn" {
  value = aws_sqs_queue.log_dlq.arn
}


output "email_dlq_arn" {
  value = aws_sqs_queue.email_dlq.arn
} 


