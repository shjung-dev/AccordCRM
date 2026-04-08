##NETWORKING MODULE OUTPUTS##
output "vpc_name" {
  description = "Name of the VPC"
  value       = module.vpc.vpc_name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.subnets.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "IDs of the private application subnets"
  value       = module.subnets.private_app_subnet_ids
}

output "private_data_subnet_ids" {
  description = "IDs of the private data subnets"
  value       = module.subnets.private_data_subnet_ids
}

output "alb_sg_id" {
  description = "ID of the ALB security group"
  value       = module.security_group.alb_sg_id
}

output "ecs_sg_id" {
  description = "ID of the ECS security group"
  value       = module.security_group.ecs_sg_id
}

output "rds_sg_id" {
  description = "ID of the RDS security group"
  value       = module.security_group.rds_sg_id
}

output "elasticache_sg_id" {
  description = "ID of the ElastiCache security group"
  value       = module.security_group.elasticache_sg_id
}

output "vpc_endpoint_sg_id" {
  description = "ID of the VPC endpoint security group"
  value       = module.security_group.vpc_endpoint_sg_id
}
##NETWORKING MODULE OUTPUTS##




##INTERNET GATEWAY MODULE OUTPUTS##
output "igw_id" {
  description = "ID of the Internet gateway"
  value       = module.internet_gateway.igw_id
}
##INTERNET GATEWAY MODULE OUTPUTS##





##ROUTE TABLE MODULE OUTPUTS##
output "private_app_rt_id" {
  description = "ID of the private app route table"
  value       = module.route_table.private_app_rt_id
}

output "private_data_rt_id" {
  description = "ID of the private data route table"
  value       = module.route_table.private_data_rt_id
}
##ROUTE TABLE MODULE OUTPUTS##






##DYNAMODB MODULE OUTPUTS##
output "log_dynamodb_name" {
  value = module.dynamodb.log_dynamodb_name
}

output "risk_score_dynamodb_name" {
  value = module.dynamodb.risk_score_dynamodb_name
}

output "ai_chatbot_audit_dynamodb_name" {
  value = module.dynamodb.ai_chatbot_audit_dynamodb_name
}

output "risk_score_dynamodb_arn" {
  value = module.dynamodb.risk_score_dynamodb_arn
}

output "ai_chatbot_audit_dynamodb_arn" {
  value = module.dynamodb.ai_chatbot_audit_dynamodb_arn
}

output "log_dynamodb_arn" {
  value = module.dynamodb.log_dynamodb_arn
}
##DYNAMODB MODULE OUTPUTS##







# ##ELASTICACHE MODULE OUTPUTS##
# output "client_cache_cluster_id" {
#   value = module.elasticache.client_cache_cluster_id
# }

# output "account_transaction_cache_cluster_id" {
#   value = module.elasticache.account_transaction_cache_cluster_id
# }

# output "ai_output_cache_cluster_id" {
#   value = module.elasticache.ai_output_cache_cluster_id
# }

# output "client_cache_endpoint" {
#   value = module.elasticache.client_cache_endpoint
# }

# output "account_transaction_cache_endpoint" {
#   value = module.elasticache.account_transaction_cache_endpoint
# }

# output "ai_output_cache_endpoint" {
#   value = module.elasticache.ai_output_cache_endpoint
# }

# output "client_cache_port" {
#   value = module.elasticache.client_cache_port
# }

# output "account_transaction_cache_port" {
#   value = module.elasticache.account_transaction_cache_port
# }

# output "ai_output_cache_port" {
#   value = module.elasticache.ai_output_cache_port
# }
# ##ELASTICACHE MODULE OUTPUTS##









# ##RDS MODULE OUTPUTS##
# output "user_rds_endpoint" {
#   value = module.rds.user_rds_endpoint
# }

# output "client_rds_endpoint" {
#   value = module.rds.client_rds_endpoint
# }

# output "account_transaction_rds_endpoint" {
#   value = module.rds.account_transaction_rds_endpoint
# }

# output "user_rds_id" {
#   value = module.rds.user_rds_id
# }

# output "client_rds_id" {
#   value = module.rds.client_rds_id
# }

# output "account_transaction_rds_id" {
#   value = module.rds.account_transaction_rds_id
# }
# ##RDS MODULE OUTPUTS##







##SQS MODULE OUTPUTS##
output "log_dlq_arn" {
  value = module.dlq.log_dlq_arn
}

output "email_dlq_arn" {
  value = module.dlq.email_dlq_arn
}

output "log_queue_arn" {
  value = module.sqs.log_queue_arn
}

output "log_queue_url" {
  value = module.sqs.log_queue_url
}

output "email_queue_arn" {
  value = module.sqs.email_queue_arn
}

output "email_queue_url" {
  value = module.sqs.email_queue_url
}
##SQS MODULE OUTPUTS##





##ECR MODULE OUTPUTS##
output "ecr_repository_urls" {
  value = try(module.ecr[0].repository_urls, {})
}

output "ecr_repository_arns" {
  value = try(module.ecr[0].repository_arns, {})
}
##ECR MODULE OUTPUTS##





##COMPUTE MODULE OUTPUTS##
output "alb_dns_name" {
  value = try(module.alb[0].alb_dns_name, null)
}

output "alb_arn" {
  value = try(module.alb[0].alb_arn, null)
}

output "alb_target_group_arns" {
  value = try(module.alb[0].alb_target_group_arns, {})
}

output "ecs_task_role_arns" {
  value = try(module.ecs_permission[0].ecs_task_role_arn, {})
}

output "ecs_execution_role_arn" {
  value = try(module.ecs_permission[0].ecs_execution_role_arn, null)
}

output "ecs_cluster_id" {
  value = try(module.ecs[0].ecs_cluster_id, null)
}

output "ecs_service_arns" {
  value = try(module.ecs[0].ecs_service_arns, {})
}

output "ecs_task_definition_arns" {
  value = try(module.ecs[0].ecs_task_definition_arns, {})
}
##COMPUTE MODULE OUTPUTS##










# ##LAMBDA MODULE OUTPUTS##
output "lambda_role_arns" {
  value = try(module.lambda_permission[0].lambda_role_arns, {})
}

output "lambda_arns" {
  value = try(module.lambda[0].lambda_arns, {})
}

output "lambda_names" {
  value = try(module.lambda[0].lambda_names, {})
}

output "lambda_sqs_event_source_mapping_ids" {
  value = try(module.lambda[0].sqs_event_source_mapping_ids, {})
}

output "lambda_sqs_event_source_mapping_uuids" {
  value = try(module.lambda[0].sqs_event_source_mapping_uuids, {})
}

output "eventbridge_rule_arn" {
  value = try(module.eventbridge[0].eventbridge_rule_arn, {})
}
# ##LAMBDA MODULE OUTPUTS##







##COGNITO MODULE OUTPUTS##
output "cognito_user_pool_id" {
  value = try(module.cognito[0].cognito_user_pool_id, null)
}

output "cognito_user_pool_client_id" {
  value = try(module.cognito[0].cognito_user_pool_client_id, null)
}
##COGNITO MODULE OUTPUTS##








###EDGE MODULE OUTPUTS##
output "cloudfront_distribution_id" {
  value = try(module.cloudfront[0].cloudfront_distribution_id, null)
}

output "cloudfront_distribution_arn" {
  value = try(module.cloudfront[0].cloudfront_distribution_arn, null)
}

output "cloudfront_domain_name" {
  value = try(module.cloudfront[0].cloudfront_domain_name, null)
}

output "validated_acm_certificate_arn" {
  value = try(module.acm[0].validated_acm_certificate_arn, null)
}


output "waf_web_acl_arn" {
  value = try(module.waf[0].web_acl_arn, null)
}

output "frontend_bucket_name" {
  value = try(module.s3_frontend[0].frontend_bucket_name, null)
}

output "frontend_bucket_arn" {
  value = try(module.s3_frontend[0].frontend_bucket_arn, null)
}

output "frontend_bucket_id" {
  value = try(module.s3_frontend[0].frontend_bucket_id, null)
}

output "frontend_bucket_domain_name" {
  value = try(module.s3_frontend[0].frontend_bucket_domain_name, null)
}
####EDGE MODULE OUTPUTS##




## ##EMAIL MODULE OUTPUTS##
output "ses_email" {
  value = try(module.ses.ses_email, null)
}
##EMAIL MODULE OUTPUTS##

##SFTP INGESTION MODULE OUTPUTS##
output "sftp_connector_id" {
  value = try(module.sftp_ingestion[0].sftp_connector_id, null)
}

output "sftp_connector_arn" {
  value = try(module.sftp_ingestion[0].sftp_connector_arn, null)
}

output "sftp_staging_bucket_id" {
  value = try(module.sftp_ingestion[0].sftp_staging_bucket_id, null)
}

output "sftp_staging_bucket_arn" {
  value = try(module.sftp_ingestion[0].sftp_staging_bucket_arn, null)
}
##SFTP INGESTION MODULE OUTPUTS##



