output "lambda_role_arns"{
    description = "A map of lambda function names to their corresponding IAM role ARNs."
    value       = { for k, v in aws_iam_role.lambda_role : k => v.arn }
}


