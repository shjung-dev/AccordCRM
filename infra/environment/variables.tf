  variable "project_name" {
    type    = string
    default = "accord-crm"
  }

  variable "ses_email" {
    type    = string
    default = "accordcrm.noreply@gmail.com"
  }

  variable "region" {
    type    = string
    default = "ap-southeast-1"
  }

  variable "environment" {
    type = string
  }

  variable "kms_key_id" {
    type    = string
    default = "90e272eb-591c-43e0-a843-0a9476f4801b"
  }


  variable "kms_key_arn" {
    type    = string
    default = "arn:aws:kms:ap-southeast-1:163683790602:key/90e272eb-591c-43e0-a843-0a9476f4801b"
  }

  variable "vpc_name" {
    description = "Name of our VPC"
    type        = string
    default     = "accord-crm-vpc"
  }


  variable "s3_frontend_bucket_name" {
    type    = string
    default = "accord-crm-s3-frontend-bucket"
  }


  ##FOR ELASTICACHE MODULE##
  variable "cache_cluster_azs" {
    type    = list(string)
    default = ["ap-southeast-1a", "ap-southeast-1b"]
  }

  //client cache cluster
  variable "client_cache_node_type" {
    type    = string
    default = "cache.t3.micro"
  }

  variable "client_cache_num_clusters" {
    type    = number
    default = 2
  }

  variable "client_cache_failover" {
    type    = bool
    default = true
  }

  variable "client_cache_engine" {
    type    = string
    default = "redis"
  }

  variable "client_cache_parameter_group" {
    type    = string
    default = "default.redis6.x"
  }

  variable "client_cache_port" {
    type    = number
    default = 6379
  }

  variable "client_cache_multi_az" {
    type    = bool
    default = true
  }

  variable "client_cache_engine_version" {
    description = "The engine version for the client cache cluster (e.g., 7.x)."
    type        = string
    default     = "6.x"
  }

  //account and transaction cache cluster
  variable "account_transaction_cache_node_type" {
    type    = string
    default = "cache.t3.micro"
  }

  variable "account_transaction_cache_num_clusters" {
    type    = number
    default = 2
  }

  variable "account_transaction_cache_failover" {
    type    = bool
    default = true
  }

  variable "account_transaction_cache_engine" {
    type    = string
    default = "redis"
  }

  variable "account_transaction_cache_parameter_group" {
    type    = string
    default = "default.redis6.x"
  }

  variable "account_transaction_cache_port" {
    type    = number
    default = 6379
  }

  variable "account_transaction_cache_multi_az" {
    type    = bool
    default = true
  }

  variable "account_transaction_cache_engine_version" {
    description = "The engine version for the account & transaction cache cluster (e.g., 7.x)."
    type        = string
    default     = "6.x"
  }



  //AI output cache cluster
  variable "ai_output_cache_node_type" {
    type    = string
    default = "cache.t3.micro"
  }

  variable "ai_output_cache_num_clusters" {
    type    = number
    default = 2
  }

  variable "ai_output_cache_failover" {
    type    = bool
    default = true
  }

  variable "ai_output_cache_engine" {
    type    = string
    default = "redis"
  }

  variable "ai_output_cache_engine_version" {
    description = "The engine version for the AI output cache cluster (e.g., 7.x)."
    type        = string
    default     = "6.x"
  }

  variable "ai_output_cache_parameter_group" {
    type    = string
    default = "default.redis6.x"
  }

  variable "ai_output_cache_port" {
    type    = number
    default = 6379
  }

  variable "ai_output_cache_multi_az" {
    type    = bool
    default = true
  }



  ##FOR RDS MODULE##
  variable "enable_rds" {
    description = "Whether to deploy the RDS instances"
    type        = bool
    default     = true
  }

  variable "skip_final_snapshot" {
    type    = bool
    default = true
  }



  //User RDS Instance
  variable "user_rds_allocated_storage" {
    description = "The allocated storage for the user RDS instance (in GB)"
    type        = number
    default     = 20
  }

  variable "user_rds_engine" {
    description = "The database engine for the user RDS instance (e.g., 'mysql')"
    type        = string
    default     = "postgres"
  }

  variable "user_rds_engine_version" {
    description = "The database engine version for the user RDS instance (e.g., '8.0')"
    type        = string
    default     = "17.6"
  }

  variable "user_rds_instance_class" {
    description = "The instance class for the user RDS instance (e.g., 'db.t3.micro')"
    type        = string
    default     = "db.t3.small"
  }

  variable "user_rds_username" {
    description = "The master username for the user RDS instance"
    type        = string
    default     = "user_admin"
  }

  variable "user_rds_password" {
    description = "The master password for the user RDS instance"
    type        = string
    sensitive   = true
    default     = "UserAdmin123!"
  }


  variable "user_rds_port" {
    description = "The port number for the user RDS instance (e.g., 3306)"
    type        = number
    default     = 5432
  }

  variable "user_rds_multi_az" {
    description = "Whether to enable Multi-AZ for the user RDS instance"
    type        = bool
    default     = true
  }

  variable "user_rds_db_name" {
    description = "The database name on the user RDS instance"
    type        = string
    default     = "user_db"
  }


  //Client RDS Instance
  variable "client_rds_allocated_storage" {
    description = "The allocated storage for the client RDS instance (in GB)"
    type        = number
    default     = 20
  }

  variable "client_rds_engine" {
    description = "The database engine for the client RDS instance (e.g., 'mysql')"
    type        = string
    default     = "postgres"
  }

  variable "client_rds_engine_version" {
    description = "The database engine version for the client RDS instance (e.g., '8.0')"
    type        = string
    default     = "17.6"
  }

  variable "client_rds_instance_class" {
    description = "The instance class for the client RDS instance (e.g., 'db.t3.micro')"
    type        = string
    default     = "db.t3.small"
  }

  variable "client_rds_username" {
    description = "The master username for the client RDS instance"
    type        = string
    default     = "client_admin"
  }

  variable "client_rds_password" {
    description = "The master password for the client RDS instance"
    type        = string
    sensitive   = true
    default     = "ClientAdmin123!"
  }


  variable "client_rds_port" {
    description = "The port number for the client RDS instance (e.g., 3306)"
    type        = number
    default     = 5432
  }

  variable "client_rds_multi_az" {
    description = "Whether to enable Multi-AZ for the client RDS instance"
    type        = bool
    default     = true
  }

  variable "client_rds_db_name" {
    description = "The database name on the client RDS instance"
    type        = string
    default     = "client_db"
  }


  //Account & Transaction RDS Instance
  variable "account_transaction_rds_allocated_storage" {
    description = "The allocated storage for the account & transaction RDS instance (in GB)"
    type        = number
    default     = 20
  }

  variable "account_transaction_rds_engine" {
    description = "The database engine for the account & transaction RDS instance (e.g., 'mysql')"
    type        = string
    default     = "postgres"
  }

  variable "account_transaction_rds_engine_version" {
    description = "The database engine version for the account & transaction RDS instance (e.g., '8.0')"
    type        = string
    default     = "17.6"
  }

  variable "account_transaction_rds_instance_class" {
    description = "The instance class for the account & transaction RDS instance (e.g., 'db.t3.micro')"
    type        = string
    default     = "db.t3.small"
  }

  variable "account_transaction_rds_username" {
    description = "The master username for the account & transaction RDS instance"
    type        = string
    default     = "acct_txn_admin"
  }


  variable "account_transaction_rds_password" {
    description = "The master password for the account & transaction RDS instance"
    type        = string
    sensitive   = true
    default     = "AcctTxnAdmin123!"
  }


  variable "account_transaction_rds_port" {
    description = "The port number for the account & transaction RDS instance (e.g., 5432)"
    type        = number
    default     = 5432
  }

  variable "account_transaction_rds_multi_az" {
    description = "Whether to enable Multi-AZ for the account & transaction RDS instance"
    type        = bool
    default     = true
  }




  ##FOR CONTROLLING MODULE DEPLOYMENT(IF NEEDED)##
  variable "enable_ecr" {
    type    = bool
    default = true
  }

  variable "enable_cognito" {
    type    = bool
    default = true
  }

  variable "enable_edge" {
    type    = bool
    default = true
  }

  variable "enable_acm" {
    type    = bool
    default = true
  }

  variable "enable_compute" {
    type    = bool
    default = true
  }

  variable "enable_ecs" {
    type    = bool
    default = true
  }



  variable "enable_serverless" {
    type    = bool
    default = true
  }

  variable "enable_sftp_ingestion" {
    description = "Enable the Transfer Family SFTP ingestion pipeline (S3 staging + VPC Lambda → RDS)."
    type        = bool
    default     = false
  }

  variable "enable_mock_sftp_server" {
    description = "Spin up a mock EC2 SFTP server for dev testing. Automatically wires into sftp_ingestion. Do not use in prod."
    type        = bool
    default     = false
  }

  variable "enable_elasticache" {
    description = "Enable ElastiCache Redis clusters for account/transaction, client, and AI output caching."
    type        = bool
    default     = true
  }








  ##FOR ECR MODULE##
  variable "ecr_repositories" {
    type = map(any)
    default = {
      user                = {}
      client              = {}
      account_transaction = {}
      frontend            = {}
    }
  }

  variable "ecr_max_image_count" {
    type    = number
    default = 30
  }








  ##MICROSERVICE CONFIGURATIONS##
  variable "compute_microservices" {
    type = map(object({
      name              = string
      port              = number
      health_check_path = string
      path_patterns     = list(string)
      listener_priority = number
      cpu               = number
      memory            = number
      image             = string
      min_size          = number
      max_size          = number
      desired_capacity  = number
      cpu_scale_up_threshold = number
    }))
    default = {
      user = {
        name                   = "user"
        port                   = 8081
        health_check_path      = "/actuator/health"
        path_patterns          = ["/api/users/*"]
        listener_priority      = 10
        cpu                    = 256
        memory                 = 512
        image                  = ""
        min_size               = 2
        max_size               = 5
        desired_capacity       = 2
        cpu_scale_up_threshold = 70
      }
      client = {
        name                   = "client"
        port                   = 8082
        health_check_path      = "/actuator/health"
        path_patterns          = ["/api/clients/*"]
        listener_priority      = 20
        cpu                    = 256
        memory                 = 512
        image                  = ""
        min_size               = 2
        max_size               = 5
        desired_capacity       = 2
        cpu_scale_up_threshold = 70
      }
      account-transaction = {
        name                   = "account-transaction"
        port                   = 8083
        health_check_path      = "/actuator/health"
        path_patterns          = ["/api/accounts/*", "/api/transactions/*", "/api/ai/*"]
        listener_priority      = 30
        cpu                    = 512
        memory                 = 1024
        image                  = ""
        min_size               = 2
        max_size               = 5
        desired_capacity       = 2
        cpu_scale_up_threshold = 70
      }
      frontend = {
        name                   = "frontend"
        port                   = 3000
        health_check_path      = "/healthz"
        path_patterns          = ["/*"]
        listener_priority      = 100
        cpu                    = 512
        memory                 = 1024
        image                  = ""
        min_size               = 1
        max_size               = 2
        desired_capacity       = 1
        cpu_scale_up_threshold = 70
      }
    }
  }




  ##FOR DLQ MODULE##
  variable "log_dlq_visibility_timeout_seconds" {
    type    = number
    default = 30
  }

  variable "log_dlq_message_retention_seconds" {
    type    = number
    default = 1209600
  }

  variable "email_dlq_visibility_timeout_seconds" {
    type    = number
    default = 30
  }

  variable "email_dlq_message_retention_seconds" {
    type    = number
    default = 1209600
  }




  ##FOR SQS MODULE##
  variable "log_queue_visibility_timeout_seconds" {
    type    = number
    default = 60
  }

  variable "log_queue_message_retention_seconds" {
    type    = number
    default = 345600
  }

  variable "log_queue_max_receive_count" {
    type    = number
    default = 5
  }

  variable "email_queue_visibility_timeout_seconds" {
    type    = number
    default = 60
  }

  variable "email_queue_message_retention_seconds" {
    type    = number
    default = 345600
  }

  variable "email_queue_max_receive_count" {
    type    = number
    default = 5
  }

  variable "lambda_sqs_triggers" {
    description = "SQS to Lambda trigger mappings. queue_key must be one of: log, email."
    type = map(object({
      lambda_key                         = string
      queue_key                          = string
      batch_size                         = optional(number, 10)
      maximum_batching_window_in_seconds = optional(number, 0)
      enabled                            = optional(bool, true)
    }))
    default = {
      log = {
        lambda_key                         = "log"
        queue_key                          = "log"
        batch_size                         = 10
        maximum_batching_window_in_seconds = 0
        enabled                            = true
      }
      email = {
        lambda_key                         = "email"
        queue_key                          = "email"
        batch_size                         = 10
        maximum_batching_window_in_seconds = 0
        enabled                            = true
      }
    }
  }





  ##FOR COGNITO MODULE##
  variable "cognito_password_policy" {
    type = object({
      minimum_length                   = number
      require_uppercase                = bool
      require_lowercase                = bool
      require_numbers                  = bool
      require_symbols                  = bool
      temporary_password_validity_days = number
    })
    default = {
      minimum_length                   = 10
      require_uppercase                = true
      require_lowercase                = true
      require_numbers                  = true
      require_symbols                  = true
      temporary_password_validity_days = 7
    }
  }

  variable "cognito_token_validity" {
    type = object({
      access_token_hours = number
      id_token_hours     = number
      refresh_token_days = number
    })
    default = {
      access_token_hours = 1
      id_token_hours     = 1
      refresh_token_days = 30
    }
  }

  variable "cognito_custom_attributes" {
    type = list(object({
      name       = string
      data_type  = string
      required   = bool
      mutable    = bool
      min_length = number
      max_length = number
    }))
    default = [
      {
        name       = "role"
        data_type  = "String"
        required   = false
        mutable    = true
        min_length = 1
        max_length = 50
      },
      {
        name       = "isRootAdmin"
        data_type  = "String"
        required   = false
        mutable    = true
        min_length = 1
        max_length = 5
      }
    ]
  }

  variable "cognito_root_user_email" {
    description = "Email for the root admin Cognito user."
    type        = string
    default     = "root@accordcrm.com"
  }

  variable "cognito_root_user_temp_password" {
    description = "Temporary password for the root admin Cognito user."
    type        = string
    sensitive   = true
    default     = "AccordCRM@2025!"
  }

  variable "cognito_enable_seed_users" {
    description = "Set to true to create Cognito accounts for the seeded DB users (admins + agents from V3__seed.sql). Safe to leave false in production."
    type        = bool
    default     = true
  }

  variable "cognito_seed_user_temp_password" {
    description = "Temporary password for all seeded Cognito users. Must be changed on first login. Only used when cognito_enable_seed_users = true."
    type        = string
    sensitive   = true
    default     = "AccordCRM@2025!"
  }







  variable "github_actions_role_arn" {
    description = "ARN of the GitHub Actions IAM role (Github-WebIdentityRole) used for S3/ECR/ECS deployments"
    type        = string
    default     = "arn:aws:iam::163683790602:role/Github-WebIdentityRole"
  }

  variable "domain_name" {
    type    = string
    default = "itsag2t2.com"
  }

  variable "subdomain_name" {
    type    = string
    default = "www.itsag2t2.com"
  }

  variable "root_domain_record_type" {
    type    = string
    default = "A"
  }

  variable "sub_domain_record_type" {
    type    = string
    default = "A"
  }

  variable "cloudfront_price_class" {
    type    = string
    default = "PriceClass_100"
  }



  variable "acm_subject_alternative_names" {
    type    = list(string)
    default = ["www.itsag2t2.com"]
  }



  variable "waf_rules" {
    type = list(object({
      name                       = string
      priority                   = number
      managed_rule_group_name    = string
      vendor_name                = string
      metric_name                = string
      cloudwatch_metrics_enabled = optional(bool, true)
      sampled_requests_enabled   = optional(bool, true)
    }))
    default = [
      {
        name                       = "AWS-AWSManagedRulesCommonRuleSet"
        priority                   = 1
        managed_rule_group_name    = "AWSManagedRulesCommonRuleSet"
        vendor_name                = "AWS"
        metric_name                = "common-rules"
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
    ]
  }


  ##FOR SFTP INGESTION PIPELINE##
  variable "sftp_host" {
    description = "Hostname of the external SFTP server (without sftp:// prefix)."
    type        = string
    default     = ""
  }

  variable "sftp_credentials_secret_arn" {
    description = "ARN of the Secrets Manager secret with SFTP credentials. Secret must contain keys: Username, PrivateKey."
    type        = string
    default     = ""
  }

  variable "sftp_trusted_host_keys" {
    description = "List of trusted host public keys for the external SFTP server (base64-encoded)."
    type        = list(string)
    default     = []
  }

  variable "sftp_remote_path" {
    description = "Comma-separated absolute file paths on the remote SFTP server to pull. e.g. /incoming/transactions.csv"
    type        = string
    default     = "/incoming/transactions.csv"
  }

  variable "sftp_pull_schedule" {
    description = "EventBridge rate/cron expression for how often the initiator Lambda triggers a pull."
    type        = string
    default     = "rate(1 hour)"
  }

  variable "sftp_s3_filter_prefix" {
    description = "S3 key prefix filter for the bucket notification. Empty string means all objects."
    type        = string
    default     = ""
  }

  # RDS connection details for the sftp_processor Lambda (use existing account_transaction_rds_* vars for engine/class)
  variable "account_transaction_rds_host" {
    description = "Endpoint hostname of the account & transaction RDS instance."
    type        = string
    default     = ""
  }

  variable "account_transaction_rds_db_name" {
    description = "Database name on the account & transaction RDS instance."
    type        = string
    default     = "account_transaction_db"
  }


  ## Log Lambda RDS connection ##
  variable "log_rds_host" {
    description = "Endpoint hostname of the log-service RDS instance."
    type        = string
    default     = ""
  }

  variable "log_rds_port" {
    description = "Port for the log-service RDS instance."
    type        = number
    default     = 5432
  }

  variable "log_rds_db_name" {
    description = "Database name on the log-service RDS instance."
    type        = string
    default     = "log_db"
  }

  variable "log_rds_username" {
    description = "Master username for the log-service RDS instance."
    type        = string
    default     = "log_admin"
  }

  variable "log_rds_password" {
    description = "Master password for the log-service RDS instance."
    type        = string
    sensitive   = true
    default     = ""
  }


  ##KIV##
  variable "sftp_user" {
    description = "The username for SFTP access"
    type        = string
    default     = "sftp_user"
  }

  variable "sftp_private_key" {
    description = "The private key for SFTP access"
    type        = string
    default     = "sftp_private_key"
  }












