output "log_queue_arn" {
  value = aws_sqs_queue.log_queue.arn
}


output "log_queue_url" {
  value = aws_sqs_queue.log_queue.id
}

output "email_queue_arn" {
  value = aws_sqs_queue.email_queue.arn
}


output "email_queue_url" {
  value = aws_sqs_queue.email_queue.id
}

