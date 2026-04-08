#Client Cache Cluster ID
output "client_cache_cluster_id" {
  value = aws_elasticache_replication_group.client_cache.id
}


#Account and Transaction Cache Cluster ID
output "account_transaction_cache_cluster_id" {
  value = aws_elasticache_replication_group.account_transaction_cache.id
}

#AI Output Cache Cluster ID
output "ai_output_cache_cluster_id" {
  value = aws_elasticache_replication_group.ai_output_cache.id
}




#Client Cache Endpoint
output "client_cache_endpoint" {
  value = aws_elasticache_replication_group.client_cache.primary_endpoint_address
}



#Account and Transaction Cache Endpoint
output "account_transaction_cache_endpoint" {
  value = aws_elasticache_replication_group.account_transaction_cache.primary_endpoint_address
}


#AI Output Cache Endpoint
output "ai_output_cache_endpoint" {
  value = aws_elasticache_replication_group.ai_output_cache.primary_endpoint_address
}




#Client Cache Port
output "client_cache_port" {
  value = aws_elasticache_replication_group.client_cache.port
}

#Account and Transaction Cache Port
output "account_transaction_cache_port" {
  value = aws_elasticache_replication_group.account_transaction_cache.port
}


#AI Output Cache Port
output "ai_output_cache_port" {
  value = aws_elasticache_replication_group.ai_output_cache.port
}





