#ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "elasticache_subnet_group" {
  name        = "${var.project_name}-elasticache-subnet-group"
  subnet_ids  = var.private_data_subnet_ids
  description = "Subnet group for ElastiCache instances in the private data layer"
  tags = {
    Name    = "${var.project_name}-elasticache-subnet-group"
    Project = var.project_name
    Env     = var.environment
  }
}



#Client Cache Cluster
resource "aws_elasticache_replication_group" "client_cache" {
  description                 = "Client cache replication group for ${var.project_name}"
  replication_group_id        = "${var.project_name}-client-cache"
  node_type                   = var.client_cache_node_type
  num_cache_clusters          = var.client_cache_num_clusters
  automatic_failover_enabled  = var.client_cache_failover
  engine                      = var.client_cache_engine
  engine_version              = var.client_cache_engine_version
  parameter_group_name        = var.client_cache_parameter_group
  port                        = var.client_cache_port
  subnet_group_name           = aws_elasticache_subnet_group.elasticache_subnet_group.name
  security_group_ids          = [var.elasticache_sg_id]
  multi_az_enabled            = var.client_cache_multi_az
  preferred_cache_cluster_azs = var.cache_cluster_azs
  
  tags = {
    Name    = "${var.project_name}-client-cache"
    Project = var.project_name
    Env     = var.environment
  }
}



#Account and Transaction Cache Cluster
resource "aws_elasticache_replication_group" "account_transaction_cache" {
  description                 = "Account and transaction cache replication group for ${var.project_name}"
  replication_group_id        = "${var.project_name}-account-transaction-cache"
  node_type                   = var.account_transaction_cache_node_type
  num_cache_clusters          = var.account_transaction_cache_num_clusters
  automatic_failover_enabled  = var.account_transaction_cache_failover
  engine                      = var.account_transaction_cache_engine
  engine_version              = var.account_transaction_cache_engine_version
  parameter_group_name        = var.account_transaction_cache_parameter_group
  port                        = var.account_transaction_cache_port
  subnet_group_name           = aws_elasticache_subnet_group.elasticache_subnet_group.name
  security_group_ids          = [var.elasticache_sg_id]
  multi_az_enabled            = var.account_transaction_cache_multi_az
  preferred_cache_cluster_azs = var.cache_cluster_azs

  tags = {
    Name    = "${var.project_name}-account-transaction-cache"
    Project = var.project_name
    Env     = var.environment
  }
}


#AI Output Cache Cluster
resource "aws_elasticache_replication_group" "ai_output_cache" {
  description                 = "AI output cache replication group for ${var.project_name}"
  replication_group_id        = "${var.project_name}-ai-output-cache"
  node_type                   = var.ai_output_cache_node_type
  num_cache_clusters          = var.ai_output_cache_num_clusters
  automatic_failover_enabled  = var.ai_output_cache_failover
  engine                      = var.ai_output_cache_engine
  engine_version              = var.ai_output_cache_engine_version
  parameter_group_name        = var.ai_output_cache_parameter_group
  port                        = var.ai_output_cache_port
  subnet_group_name           = aws_elasticache_subnet_group.elasticache_subnet_group.name
  security_group_ids          = [var.elasticache_sg_id]
  multi_az_enabled            = var.ai_output_cache_multi_az
  preferred_cache_cluster_azs = var.cache_cluster_azs

  tags = {
    Name    = "${var.project_name}-ai-output-cache"
    Project = var.project_name
    Env     = var.environment
  }
}


