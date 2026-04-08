output "ecs_cluster_id" {
  value = aws_ecs_cluster.ecs_cluster.id
}

output "ecs_service_arns" {
  value = { for k, s in aws_ecs_service.services : k => s.arn }
}

output "ecs_task_definition_arns" {
  value = { for k, t in aws_ecs_task_definition.tasks : k => t.arn }
}