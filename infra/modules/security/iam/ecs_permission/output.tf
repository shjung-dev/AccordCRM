output "ecs_task_role_arn" {
    value = { for k, v in aws_iam_role.ecs_task_role : k => v.arn } # Output the ARN of each ECS task role
}


output "ecs_execution_role_arn" {
    value = aws_iam_role.ecs_execution_role.arn # Output the ARN of the ECS execution role
}


