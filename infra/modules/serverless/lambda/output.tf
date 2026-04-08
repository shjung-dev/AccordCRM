output "lambda_arns" {
  description = "ARNs of the created Lambda functions."
  value       = { for key, lambda in aws_lambda_function.lambda : key => lambda.arn }
}


output "lambda_names" {
  description = "Names of the created Lambda functions."
  value       = { for key, lambda in aws_lambda_function.lambda : key => lambda.function_name }
}

output "sqs_event_source_mapping_ids" {
  description = "IDs of SQS event source mappings keyed by mapping name."
  value       = { for key, mapping in aws_lambda_event_source_mapping.sqs_trigger : key => mapping.id }
}

output "sqs_event_source_mapping_uuids" {
  description = "UUIDs of SQS event source mappings keyed by mapping name."
  value       = { for key, mapping in aws_lambda_event_source_mapping.sqs_trigger : key => mapping.uuid }
}