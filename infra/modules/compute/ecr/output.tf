output "repository_names" {
  description = "Map of ECR repository names"
  value       = { for k, r in aws_ecr_repository.repo : k => r.name }
}

output "repository_arns" {
  description = "Map of ECR repository ARNs"
  value       = { for k, r in aws_ecr_repository.repo : k => r.arn }
}

output "repository_urls" {
  description = "Map of ECR repository URLs (used for docker pull/push)"
  value       = { for k, r in aws_ecr_repository.repo : k => r.repository_url }
}



