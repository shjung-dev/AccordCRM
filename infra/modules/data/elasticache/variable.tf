variable "project_name" {
  description = "The name of the project, used for naming resources."
  type        = string
}

variable "cache_cluster_azs" {
  description = "Availability Zones that Cache cluster will be deployed"
  type        = list(string)
}

variable "client_cache_node_type" {
  description = "The node type for the client cache cluster (e.g., cache.t3.micro)."
  type        = string
}

variable "client_cache_num_clusters" {
  description = "The number of cache clusters for the client cache replication group."
  type        = number
}

variable "client_cache_failover" {
  description = "Whether automatic failover is enabled for the client cache replication group."
  type        = bool
}


variable "client_cache_engine" {
  description = "The cache engine for the client cache cluster (e.g., redis)."
  type        = string
}


variable "client_cache_parameter_group" {
  description = "The name of the parameter group to associate with the client cache cluster."
  type        = string
}

variable "client_cache_port" {
  description = "The port number on which the client cache cluster accepts connections."
  type        = number
}

variable "client_cache_multi_az" {
  description = "Whether the client cache replication group is Multi-AZ enabled."
  type        = bool
}


variable "account_transaction_cache_node_type" {
  description = "The node type for the account and transaction cache cluster (e.g., cache.t3.micro)."
  type        = string
}


variable "account_transaction_cache_num_clusters" {
  description = "The number of cache clusters for the account and transaction cache replication group."
  type        = number
}

variable "account_transaction_cache_failover" {
  description = "Whether automatic failover is enabled for the account and transaction cache replication group."
  type        = bool
}


variable "account_transaction_cache_engine" {
  description = "The cache engine for the account and transaction cache cluster (e.g., redis)."
  type        = string
}


variable "account_transaction_cache_parameter_group" {
  description = "The name of the parameter group to associate with the account and transaction cache cluster."
  type        = string
}


variable "account_transaction_cache_port" {
  description = "The port number on which the account and transaction cache cluster accepts connections."
  type        = number
}



variable "account_transaction_cache_multi_az" {
  description = "Whether the account and transaction cache replication group is Multi-AZ enabled."
  type        = bool
}



variable "ai_output_cache_node_type" {
  description = "The node type for the AI output cache cluster (e.g., cache.t3.micro)."
  type        = string
}

variable "ai_output_cache_num_clusters" {
  description = "The number of cache clusters for the AI output cache replication group."
  type        = number
}

variable "ai_output_cache_failover" {
  description = "Whether automatic failover is enabled for the AI output cache replication group."
  type        = bool
}

variable "ai_output_cache_engine" {
  description = "The cache engine for the AI output cache cluster (e.g., redis)."
  type        = string
}


variable "ai_output_cache_parameter_group" {
  description = "The name of the parameter group to associate with the AI output cache cluster."
  type        = string
}

variable "ai_output_cache_port" {
  description = "The port number on which the AI output cache cluster accepts connections."
  type        = number
}

variable "ai_output_cache_multi_az" {
  description = "Whether the AI output cache replication group is Multi-AZ enabled."
  type        = bool
}


variable "private_data_subnet_ids" {
  description = "List of private subnet IDs for the data layer where ElastiCache will be deployed."
  type        = list(string)
}

variable "elasticache_sg_id" {
  description = "Security group ID for ElastiCache instances."
  type        = string
}


variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)."
  type        = string
}



variable "client_cache_engine_version" {
  description = "The engine version for the client cache cluster (e.g., 7.x)."
  type        = string
}

variable "account_transaction_cache_engine_version" {
  description = "The engine version for the account and transaction cache cluster (e.g., 7.x)."
  type        = string
} 

variable "ai_output_cache_engine_version" {
  description = "The engine version for the AI output cache cluster (e.g., 7.x)."
  type        = string
} 



