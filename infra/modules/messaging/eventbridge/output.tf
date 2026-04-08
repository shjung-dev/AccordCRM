output "eventbridge_rule_arn" {
  value = { for k, v in aws_cloudwatch_event_rule.eventbridge_rule : k => v.arn } # Output the ARN of each EventBridge rule
}

output "eventbridge_rule_name" {
  value = { for k, v in aws_cloudwatch_event_rule.eventbridge_rule : k => v.name } # Output the name of each EventBridge rule
}


output "eventbridge_target_id" {
  value = { for k, v in aws_cloudwatch_event_target.lambda_target : k => v.target_id } # Output the target ID of each EventBridge target
}


output "eventbridge_target_arn" {
  value = { for k, v in aws_cloudwatch_event_target.lambda_target : k => v.arn } # Output the ARN of each EventBridge target
}

