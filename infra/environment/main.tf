locals {
  # Only expose frontend through the ALB; backend services are reached
  # directly by the frontend via Cloud Map DNS (internal VPC only).
  alb_microservices = {
    for name, cfg in var.compute_microservices : name => {
      port              = cfg.port
      health_check_path = cfg.health_check_path
      path_patterns     = cfg.path_patterns
      priority          = cfg.listener_priority
    }
    if name == "frontend"
  }

  frontend_secrets = var.enable_cognito && var.enable_compute ? [
    { name = "COGNITO_CLIENT_ID",    valueFrom = aws_ssm_parameter.frontend_cognito_client_id[0].arn },
    { name = "USER_SERVICE_URL",     valueFrom = aws_ssm_parameter.frontend_user_service_url[0].arn },
    { name = "CLIENT_SERVICE_URL",   valueFrom = aws_ssm_parameter.frontend_client_service_url[0].arn },
    { name = "ACCOUNT_SERVICE_URL",  valueFrom = aws_ssm_parameter.frontend_account_service_url[0].arn },
    { name = "AUTH_COOKIE_SECRET",   valueFrom = aws_ssm_parameter.frontend_session_secret.arn },
    { name = "INTERNAL_SERVICE_KEY",      valueFrom = aws_ssm_parameter.frontend_internal_key.arn },
    { name = "SMARTCRM_CHATBOT_ENABLED", valueFrom = aws_ssm_parameter.frontend_smartcrm_chatbot_enabled.arn },
  ] : []

  backend_secrets = concat(
    [{ name = "INTERNAL_SERVICE_KEY", valueFrom = aws_ssm_parameter.frontend_internal_key.arn }],
    var.enable_cognito ? [{ name = "COGNITO_USER_POOL_ID", valueFrom = aws_ssm_parameter.cognito_user_pool_id[0].arn }] : []
  )

  user_secrets = concat(local.backend_secrets, var.enable_rds ? [
    { name = "DB_URL",        valueFrom = aws_ssm_parameter.user_db_url[0].arn },
    { name = "DB_USERNAME",   valueFrom = aws_ssm_parameter.user_db_username[0].arn },
    { name = "DB_PASSWORD",   valueFrom = aws_ssm_parameter.user_db_password[0].arn },
    { name = "LOG_QUEUE_URL", valueFrom = aws_ssm_parameter.log_queue_url.arn },
  ] : [])

  client_secrets = concat(local.backend_secrets, var.enable_rds ? [
    { name = "DB_URL",           valueFrom = aws_ssm_parameter.client_db_url[0].arn },
    { name = "DB_USERNAME",      valueFrom = aws_ssm_parameter.client_db_username[0].arn },
    { name = "DB_PASSWORD",      valueFrom = aws_ssm_parameter.client_db_password[0].arn },
    { name = "LOG_QUEUE_URL",    valueFrom = aws_ssm_parameter.log_queue_url.arn },
    { name = "EMAIL_QUEUE_URL",  valueFrom = aws_ssm_parameter.email_queue_url.arn },
  ] : [])

  account_transaction_secrets = concat(local.backend_secrets, var.enable_rds ? [
    { name = "DB_URL",        valueFrom = aws_ssm_parameter.account_db_url[0].arn },
    { name = "DB_USERNAME",   valueFrom = aws_ssm_parameter.account_db_username[0].arn },
    { name = "DB_PASSWORD",   valueFrom = aws_ssm_parameter.account_db_password[0].arn },
    { name = "LOG_QUEUE_URL", valueFrom = aws_ssm_parameter.log_queue_url.arn },
    { name = "EMAIL_QUEUE_URL", valueFrom = aws_ssm_parameter.email_queue_url.arn },
  ] : [])

  backend_service_secrets = {
    user                = local.user_secrets
    client              = local.client_secrets
    "account-transaction" = local.account_transaction_secrets
  }

  ecs_microservices = {
    for name, cfg in var.compute_microservices : name => {
      name              = cfg.name
      port              = cfg.port
      health_check_path = cfg.health_check_path
      path_patterns     = cfg.path_patterns
      priority          = cfg.listener_priority
      cpu               = cfg.cpu
      memory            = cfg.memory
      image             = cfg.image != "" ? cfg.image : "${module.ecr[0].repository_urls[replace(name, "-", "_")]}:latest"
      desired_count     = cfg.desired_capacity
      env_vars = name == "frontend" ? {
        "COGNITO_REGION"           = var.region
        "PROXY_RATE_LIMIT_ENABLED" = "false"
      } : merge(
        {
          "COGNITO_REGION"   = var.region
          "AWS_REGION"       = var.region
          "USER_SERVICE_URL" = "http://user.accord-crm.local:8081"
        },
        name == "user" ? {
          "LOG_DYNAMODB_TABLE" = module.dynamodb.log_dynamodb_name
        } : {},
        name == "account-transaction" ? {
          "CLIENT_SERVICE_URL" = "http://client.accord-crm.local:8082"
          "USER_SERVICE_URL"   = "http://user.accord-crm.local:8081"
        } : name == "user" ? {
          "CLIENT_SERVICE_URL" = "http://client.accord-crm.local:8082"
        } : name == "client" ? {
          "ACCOUNT_SERVICE_URL" = "http://account-transaction.accord-crm.local:8083"
        } : {},
        name == "client" && var.enable_elasticache ? {
          "CLIENT_REDIS_HOST" = module.elasticache[0].client_cache_endpoint
          "CLIENT_REDIS_PORT" = tostring(module.elasticache[0].client_cache_port)
        } : {},
        name == "account-transaction" && var.enable_elasticache ? {
          "ACCOUNT_TRANSACTION_REDIS_HOST" = module.elasticache[0].account_transaction_cache_endpoint
          "ACCOUNT_TRANSACTION_REDIS_PORT" = tostring(module.elasticache[0].account_transaction_cache_port)
          "AI_OUTPUT_REDIS_HOST"           = module.elasticache[0].ai_output_cache_endpoint
          "AI_OUTPUT_REDIS_PORT"           = tostring(module.elasticache[0].ai_output_cache_port)
        } : {}
      )
      secrets     = name == "frontend" ? local.frontend_secrets : lookup(local.backend_service_secrets, name, [])
      autoscaling = {
        min_count  = cfg.min_size
        max_count  = cfg.max_size
        cpu_target = cfg.cpu_scale_up_threshold
      }
    }
  }

  service_policy_catalog = {
    user = [
      {
        effect    = "Allow"
        actions   = ["sqs:SendMessage"]
        resources = [module.sqs.log_queue_arn]
      },
      {
        effect    = "Allow"
        actions   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"]
        resources = [module.dynamodb.log_dynamodb_arn, "${module.dynamodb.log_dynamodb_arn}/index/*"]
      },
      {
        effect    = "Allow"
        actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"]
        resources = [var.kms_key_arn]
      },
      {
        effect    = "Allow"
        actions   = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage"]
        resources = [module.ecr[0].repository_arns["user"]]
      },
      {
        effect  = "Allow"
        actions = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:ListUsers"
        ]
        resources = ["arn:aws:cognito-idp:${var.region}:*:userpool/*"]
      }
    ]

    client = [
      {
        effect    = "Allow"
        actions   = ["sqs:SendMessage"]
        resources = [module.sqs.log_queue_arn, module.sqs.email_queue_arn]
      },
      {
        effect    = "Allow"
        actions   = ["ses:SendEmail", "ses:SendRawEmail"]
        resources = ["*"]
      },
      {
        effect    = "Allow"
        actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"]
        resources = [var.kms_key_arn]
      },
      {
        effect    = "Allow"
        actions   = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage"]
        resources = [module.ecr[0].repository_arns["client"]]
      }
    ]

    "account-transaction" = [
      {
        effect    = "Allow"
        actions   = ["sqs:SendMessage"]
        resources = [module.sqs.log_queue_arn, module.sqs.email_queue_arn]
      },
      {
        effect    = "Allow"
        actions   = ["ses:SendEmail", "ses:SendRawEmail"]
        resources = ["*"]
      },
      {
        effect    = "Allow"
        actions   = ["bedrock:*"]
        resources = ["*"]
      },
      {
        effect    = "Allow"
        actions   = ["aws-marketplace:ViewSubscriptions", "aws-marketplace:Subscribe"]
        resources = ["*"]
      },
      {
        effect    = "Allow"
        actions   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan", "dynamodb:PutItem", "dynamodb:UpdateItem"]
        resources = [
          module.dynamodb.risk_score_dynamodb_arn,
          "${module.dynamodb.risk_score_dynamodb_arn}/index/*",
          module.dynamodb.ai_chatbot_audit_dynamodb_arn,
          "${module.dynamodb.ai_chatbot_audit_dynamodb_arn}/index/*"
        ]
      },
      {
        effect    = "Allow"
        actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"]
        resources = [var.kms_key_arn]
      },
      {
        effect    = "Allow"
        actions   = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage"]
        resources = [module.ecr[0].repository_arns["account_transaction"]]
      }
    ]
  }

  microservice_policies = {
    for name, cfg in var.compute_microservices :
    name => {
      name     = name
      policies = tolist(lookup(local.service_policy_catalog, name, []))
    }
  }

  rds_db_configs = {
    user = {
      db_url      = "jdbc:postgresql://${try(module.rds[0].user_rds_address, "")}:${var.user_rds_port}/${var.user_rds_db_name}?sslmode=require"
      db_username = var.user_rds_username
      db_password = var.user_rds_password
    }
    client = {
      db_url      = "jdbc:postgresql://${try(module.rds[0].client_rds_address, "")}:${var.client_rds_port}/${var.client_rds_db_name}?sslmode=require"
      db_username = var.client_rds_username
      db_password = var.client_rds_password
    }
    "account-transaction" = {
      db_url      = "jdbc:postgresql://${try(module.rds[0].account_transaction_rds_address, "")}:${var.account_transaction_rds_port}/${var.account_transaction_rds_db_name}?sslmode=require"
      db_username = var.account_transaction_rds_username
      db_password = var.account_transaction_rds_password
    }
  }


  # ALB → ECS ingress is restricted to the frontend only; backend ports
  # are accessible only via the ECS self-referencing rule (inter-service).
  security_group_microservices = {
    for name, cfg in var.compute_microservices : name => {
      port = cfg.port
    }
    if name == "frontend"
  }


  lambda_functions = {
    log = {
      handler      = "lambda_function.handler"
      runtime      = "python3.11"
      package_path = "${path.module}/../../lambda/sqs_log_processor/lambda_function.zip"
      memory_size  = 256
      timeout      = 20
      env_vars = {
        DYNAMO_TABLE_NAME = module.dynamodb.log_dynamodb_name
      }
      schedule_expression = ""
      policies = [
        {
          effect    = "Allow"
          actions   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
          resources = [module.dynamodb.log_dynamodb_arn]
        },
        {
          effect    = "Allow"
          actions   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
          resources = [module.sqs.log_queue_arn]
        },
        {
          effect    = "Allow"
          actions   = ["kms:GenerateDataKey", "kms:Decrypt"]
          resources = [var.kms_key_arn]
        },
        {
          effect    = "Allow"
          actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
          resources = ["arn:aws:logs:*:*:*"]
        },
      ]
    }

    email = {
      handler      = "email_sender.handler"
      runtime      = "python3.11"
      package_path = "${path.module}/../../lambda/sqs_email_sender/lambda_function.zip"
      memory_size  = 256
      timeout      = 20
      env_vars = {
        EMAIL_QUEUE_URL = module.sqs.email_queue_url
        SES_FROM_EMAIL  = var.ses_email
      }
      schedule_expression = ""
      policies = [
        {
          effect    = "Allow"
          actions   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
          resources = [module.sqs.email_queue_arn]
        },
        {
          effect    = "Allow"
          actions   = ["ses:SendEmail", "ses:SendRawEmail"]
          resources = ["*"]
        }
      ]
    }

    # Triggered by EventBridge on a schedule; calls transfer:StartFileTransfer to pull from external SFTP
    sftp_initiator = {
      handler      = "sftp_initiator.handler"
      runtime      = "python3.11"
      package_path = "${path.module}/../../lambda/sftp_initiator/lambda_function.zip"
      memory_size  = 256
      timeout      = 60
      env_vars = {
        SFTP_CONNECTOR_ID = var.enable_sftp_ingestion ? module.sftp_ingestion[0].sftp_connector_id : ""
        SFTP_REMOTE_PATH  = var.sftp_remote_path
        # Bucket name is deterministic from project/environment naming convention
        S3_BUCKET = "${var.project_name}-sftp-staging-${var.environment}"
        S3_PREFIX = "incoming"
      }
      schedule_expression = var.sftp_pull_schedule
      policies            = []
    }

    # Triggered by S3 event when a file lands in the staging bucket; parses and writes to RDS
    sftp_processor = {
      handler      = "sftp_processor.handler"
      runtime      = "python3.11"
      package_path = "${path.module}/../../lambda/sftp_processor/lambda_function.zip"
      memory_size  = 512
      timeout      = 300
      env_vars = {
        DB_HOST     = var.enable_rds ? module.rds[0].account_transaction_rds_address : ""
        DB_PORT     = tostring(var.account_transaction_rds_port)
        DB_NAME     = var.account_transaction_rds_db_name
        DB_USER     = var.account_transaction_rds_username
        DB_PASSWORD = var.account_transaction_rds_password
      }
      schedule_expression = "" # event-driven via S3
      policies            = []
    }
  }

  sqs_queue_arn_map = {
    log   = module.sqs.log_queue_arn
    email = module.sqs.email_queue_arn
  }

  lambda_sqs_event_source_mappings = var.enable_serverless ? {
    for name, cfg in var.lambda_sqs_triggers : name => {
      lambda_key                         = cfg.lambda_key
      event_source_arn                   = local.sqs_queue_arn_map[cfg.queue_key]
      batch_size                         = cfg.batch_size
      maximum_batching_window_in_seconds = cfg.maximum_batching_window_in_seconds
      enabled                            = cfg.enabled
    }
    if contains(keys(local.lambda_functions), cfg.lambda_key) && contains(keys(local.sqs_queue_arn_map), cfg.queue_key)
  } : {}

  # sftp_initiator and sftp_processor use dedicated IAM roles from sftp_ingestion_permission module
  sftp_lambda_names = toset(["sftp_initiator", "sftp_processor"])

  lambda_permission_lambdas = {
    for name, cfg in local.lambda_functions : name => {
      policies = concat(
        [
          {
            effect  = "Allow"
            actions = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
            resources = [
              "arn:aws:logs:*:*:*"
            ]
          }
        ],
        cfg.policies
      )
    }
    # sftp lambdas use dedicated IAM roles from sftp_ingestion_permission module
    if !contains(local.sftp_lambda_names, name)
  }

  lambda_runtime_lambdas = {
    for name, cfg in local.lambda_functions : name => {
      handler     = cfg.handler
      runtime     = cfg.runtime
      jar_path    = cfg.package_path
      memory_size = cfg.memory_size
      timeout     = cfg.timeout
      env_vars    = cfg.env_vars
      vpc_config = name == "sftp_processor" ? {
        subnet_ids         = module.subnets.private_lambda_subnet_ids
        security_group_ids = [module.security_group.lambda_sg_id]
      } : null
    }
    if !contains(local.sftp_lambda_names, name) || var.enable_sftp_ingestion
  }


  eventbridge_lambdas = var.enable_serverless ? {
    for name, cfg in {
      for n, c in local.lambda_functions : n => c
      if c.schedule_expression != "" && (!contains(local.sftp_lambda_names, n) || var.enable_sftp_ingestion)
      } : name => {
      lambda_name         = module.lambda[0].lambda_names[name]
      lambda_arn          = module.lambda[0].lambda_arns[name]
      schedule_expression = cfg.schedule_expression
    }
  } : {}
}


module "vpc" {
  source   = "../modules/networking/vpc"
  vpc_name = var.vpc_name
}

module "subnets" {
  source   = "../modules/networking/subnets"
  vpc_id   = module.vpc.vpc_id
  vpc_name = module.vpc.vpc_name
}

module "security_group" {
  source        = "../modules/networking/security_group"
  project_name  = var.project_name
  vpc_id        = module.vpc.vpc_id
  environment   = var.environment
  microservices = local.security_group_microservices
}

module "internet_gateway" {
  source       = "../modules/networking/internet_gateway"
  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id
}

module "route_table" {
  source                    = "../modules/networking/route_table"
  project_name              = var.project_name
  vpc_id                    = module.vpc.vpc_id
  igw_id                    = module.internet_gateway.igw_id
  public_subnet_ids         = module.subnets.public_subnet_ids
  private_app_subnet_ids    = module.subnets.private_app_subnet_ids
  private_data_subnet_ids   = module.subnets.private_data_subnet_ids
  private_lambda_subnet_ids = module.subnets.private_lambda_subnet_ids
}

module "vpc_endpoint" {
  source                        = "../modules/networking/vpc_endpoints"
  environment                   = var.environment
  project_name                  = var.project_name
  region                        = var.region
  vpc_id                        = module.vpc.vpc_id
  private_app_subnet_ids        = module.subnets.private_app_subnet_ids
  private_app_route_table_id    = module.route_table.private_app_rt_id
  private_lambda_route_table_id = module.route_table.private_lambda_rt_id
  vpc_endpoint_sg_id            = module.security_group.vpc_endpoint_sg_id
}

module "dynamodb" {
  source       = "../modules/data/dynamodb"
  project_name = var.project_name
  kms_key_arn  = var.kms_key_arn
}



module "elasticache" {
  count                                     = var.enable_elasticache ? 1 : 0
  source                                    = "../modules/data/elasticache"
  project_name                              = var.project_name
  environment                               = var.environment
  private_data_subnet_ids                   = module.subnets.private_data_subnet_ids
  elasticache_sg_id                         = module.security_group.elasticache_sg_id
  cache_cluster_azs                         = var.cache_cluster_azs
  client_cache_node_type                    = var.client_cache_node_type
  client_cache_num_clusters                 = var.client_cache_num_clusters
  client_cache_failover                     = var.client_cache_failover
  client_cache_engine                       = var.client_cache_engine
  client_cache_engine_version               = var.client_cache_engine_version
  client_cache_parameter_group              = var.client_cache_parameter_group
  client_cache_port                         = var.client_cache_port
  client_cache_multi_az                     = var.client_cache_multi_az
  account_transaction_cache_node_type       = var.account_transaction_cache_node_type
  account_transaction_cache_num_clusters    = var.account_transaction_cache_num_clusters
  account_transaction_cache_failover        = var.account_transaction_cache_failover
  account_transaction_cache_engine          = var.account_transaction_cache_engine
  account_transaction_cache_engine_version  = var.account_transaction_cache_engine_version
  account_transaction_cache_parameter_group = var.account_transaction_cache_parameter_group
  account_transaction_cache_port            = var.account_transaction_cache_port
  account_transaction_cache_multi_az        = var.account_transaction_cache_multi_az
  ai_output_cache_node_type                 = var.ai_output_cache_node_type
  ai_output_cache_num_clusters              = var.ai_output_cache_num_clusters
  ai_output_cache_failover                  = var.ai_output_cache_failover
  ai_output_cache_engine                    = var.ai_output_cache_engine
  ai_output_cache_engine_version            = var.ai_output_cache_engine_version
  ai_output_cache_parameter_group           = var.ai_output_cache_parameter_group
  ai_output_cache_port                      = var.ai_output_cache_port
  ai_output_cache_multi_az                  = var.ai_output_cache_multi_az
}


module "rds" {
  count                                     = var.enable_rds ? 1 : 0
  source                                    = "../modules/data/rds"
  project_name                              = var.project_name
  environment                               = var.environment
  private_data_subnet_ids                   = module.subnets.private_data_subnet_ids
  rds_sg_id                                 = module.security_group.rds_sg_id
  kms_key_id                                = var.kms_key_id
  kms_key_arn                               = var.kms_key_arn
  skip_final_snapshot                       = var.skip_final_snapshot
  user_rds_allocated_storage                = var.user_rds_allocated_storage
  user_rds_engine                           = var.user_rds_engine
  user_rds_engine_version                   = var.user_rds_engine_version
  user_rds_instance_class                   = var.user_rds_instance_class
  user_rds_db_name                          = var.user_rds_db_name
  user_rds_username                         = var.user_rds_username
  user_rds_password                         = var.user_rds_password
  user_rds_port                             = var.user_rds_port
  user_rds_multi_az                         = var.user_rds_multi_az
  client_rds_allocated_storage              = var.client_rds_allocated_storage
  client_rds_engine                         = var.client_rds_engine
  client_rds_engine_version                 = var.client_rds_engine_version
  client_rds_instance_class                 = var.client_rds_instance_class
  client_rds_db_name                        = var.client_rds_db_name
  client_rds_username                       = var.client_rds_username
  client_rds_password                       = var.client_rds_password
  client_rds_port                           = var.client_rds_port
  client_rds_multi_az                       = var.client_rds_multi_az
  account_transaction_rds_allocated_storage = var.account_transaction_rds_allocated_storage
  account_transaction_rds_engine            = var.account_transaction_rds_engine
  account_transaction_rds_engine_version    = var.account_transaction_rds_engine_version
  account_transaction_rds_instance_class    = var.account_transaction_rds_instance_class
  account_transaction_rds_db_name           = var.account_transaction_rds_db_name
  account_transaction_rds_username          = var.account_transaction_rds_username
  account_transaction_rds_password          = var.account_transaction_rds_password
  account_transaction_rds_port              = var.account_transaction_rds_port
  account_transaction_rds_multi_az          = var.account_transaction_rds_multi_az
}

module "dlq" {
  source                               = "../modules/messaging/dlq"
  project_name                         = var.project_name
  environment                          = var.environment
  log_dlq_visibility_timeout_seconds   = var.log_dlq_visibility_timeout_seconds
  log_dlq_message_retention_seconds    = var.log_dlq_message_retention_seconds
  email_dlq_visibility_timeout_seconds = var.email_dlq_visibility_timeout_seconds
  email_dlq_message_retention_seconds  = var.email_dlq_message_retention_seconds
}

module "sqs" {
  source                                 = "../modules/messaging/sqs"
  project_name                           = var.project_name
  environment                            = var.environment
  log_queue_visibility_timeout_seconds   = var.log_queue_visibility_timeout_seconds
  log_queue_message_retention_seconds    = var.log_queue_message_retention_seconds
  log_queue_max_receive_count            = var.log_queue_max_receive_count
  email_queue_visibility_timeout_seconds = var.email_queue_visibility_timeout_seconds
  email_queue_message_retention_seconds  = var.email_queue_message_retention_seconds
  email_queue_max_receive_count          = var.email_queue_max_receive_count
  log_dlq_arn                            = module.dlq.log_dlq_arn
  email_dlq_arn                          = module.dlq.email_dlq_arn
}


module "ecr" {
  count           = var.enable_ecr ? 1 : 0
  source          = "../modules/compute/ecr"
  repositories    = var.ecr_repositories
  project_name    = var.project_name
  environment     = var.environment
  max_image_count = var.ecr_max_image_count
}


resource "aws_service_discovery_private_dns_namespace" "ecs" {
  count       = var.enable_ecs ? 1 : 0
  name        = "${var.project_name}.local"
  description = "Private DNS namespace for ECS Service Connect"
  vpc         = module.vpc.vpc_id

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

module "ecs_permission" {
  count         = var.enable_ecs ? 1 : 0
  source        = "../modules/security/iam/ecs_permission"
  project_name  = var.project_name
  environment   = var.environment
  microservices = local.microservice_policies
}

module "ecs" {
  count                         = var.enable_ecs ? 1 : 0
  source                        = "../modules/compute/ecs"
  project_name                  = var.project_name
  environment                   = var.environment
  region                        = var.region
  alb_target_group_arns         = module.alb[0].alb_target_group_arns
  task_role_arns                = module.ecs_permission[0].ecs_task_role_arn
  execution_role_arn            = module.ecs_permission[0].ecs_execution_role_arn
  private_app_subnet_ids        = module.subnets.private_app_subnet_ids
  ecs_sg_ids                    = [module.security_group.ecs_sg_id]
  microservices                 = local.ecs_microservices
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.ecs[0].id
  depends_on = [
    module.alb,
    aws_service_discovery_private_dns_namespace.ecs,
  ]
}

module "alb" {
  count               = var.enable_compute || var.enable_ecs ? 1 : 0
  source              = "../modules/compute/alb"
  project_name        = var.project_name
  environment         = var.environment
  alb_sg_id           = module.security_group.alb_sg_id
  public_subnet_ids   = module.subnets.public_subnet_ids
  vpc_id              = module.vpc.vpc_id
  acm_certificate_arn = module.acm[0].validated_acm_certificate_arn
  microservices       = local.alb_microservices
  cloudfront_secret   = random_password.cloudfront_secret.result
}


module "cognito" {
  count                   = var.enable_cognito ? 1 : 0
  source                  = "../modules/security/cognito"
  project_name            = var.project_name
  environment             = var.environment
  password_policy         = var.cognito_password_policy
  token_validity          = var.cognito_token_validity
  custom_attributes       = var.cognito_custom_attributes
  root_user_email         = var.cognito_root_user_email
  root_user_temp_password = var.cognito_root_user_temp_password
  enable_seed_users       = var.cognito_enable_seed_users
  seed_user_temp_password = var.cognito_seed_user_temp_password
}

module "lambda_permission" {
  count        = var.enable_serverless ? 1 : 0
  source       = "../modules/security/iam/lambda_permission"
  project_name = var.project_name
  environment  = var.environment
  lambdas      = local.lambda_permission_lambdas
}


module "lambda" {
  count                     = var.enable_serverless ? 1 : 0
  source                    = "../modules/serverless/lambda"
  project_name              = var.project_name
  environment               = var.environment
  lambdas                   = local.lambda_runtime_lambdas
  sqs_event_source_mappings = local.lambda_sqs_event_source_mappings
  lambda_role_arns = merge(
    module.lambda_permission[0].lambda_role_arns,
    var.enable_sftp_ingestion ? {
      sftp_initiator = module.sftp_ingestion_permission[0].sftp_initiator_role_arn
      sftp_processor = module.sftp_ingestion_permission[0].sftp_processor_role_arn
    } : {}
  )
}


module "eventbridge" {
  count        = var.enable_serverless ? 1 : 0
  source       = "../modules/messaging/eventbridge"
  project_name = var.project_name
  lambdas      = local.eventbridge_lambdas
}


# ── SFTP Ingestion Pipeline ────────────────────────────────────────────────────
# Flow: External SFTP → Transfer Family Connector → S3 → sftp_processor Lambda → RDS

# Mock SFTP server (dev only) — EC2 t3.nano with OpenSSH, ~$4/month
module "mock_sftp_server" {
  count            = var.enable_mock_sftp_server ? 1 : 0
  source           = "../modules/mock/sftp_server"
  project_name     = var.project_name
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  public_subnet_id = module.subnets.public_subnet_ids[0]
}

module "sftp_ingestion_permission" {
  count                       = var.enable_sftp_ingestion ? 1 : 0
  source                      = "../modules/security/iam/sftp_ingestion_permission"
  project_name                = var.project_name
  environment                 = var.environment
  kms_key_arn                 = var.kms_key_arn
  sftp_credentials_secret_arn = var.enable_mock_sftp_server ? module.mock_sftp_server[0].sftp_credentials_secret_arn : var.sftp_credentials_secret_arn
}

module "sftp_ingestion" {
  count        = var.enable_sftp_ingestion ? 1 : 0
  source       = "../modules/data/sftp_ingestion"
  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = var.kms_key_arn

  # When mock server is enabled, use its outputs; otherwise fall back to manual vars
  sftp_host                   = var.enable_mock_sftp_server ? module.mock_sftp_server[0].sftp_host : var.sftp_host
  sftp_credentials_secret_arn = var.enable_mock_sftp_server ? module.mock_sftp_server[0].sftp_credentials_secret_arn : var.sftp_credentials_secret_arn
  sftp_trusted_host_keys      = var.enable_mock_sftp_server ? [module.mock_sftp_server[0].sftp_host_public_key] : var.sftp_trusted_host_keys

  transfer_family_role_arn = module.sftp_ingestion_permission[0].transfer_family_role_arn
}

# S3 → Lambda event notification (defined here to avoid circular dependency between
# sftp_ingestion and lambda modules)
resource "aws_lambda_permission" "s3_invoke_sftp_processor" {
  count         = var.enable_sftp_ingestion && var.enable_serverless ? 1 : 0
  statement_id  = "AllowS3InvokeSftpProcessor"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda[0].lambda_arns["sftp_processor"]
  principal     = "s3.amazonaws.com"
  source_arn    = module.sftp_ingestion[0].sftp_staging_bucket_arn
}

resource "aws_s3_bucket_notification" "sftp_staging" {
  count  = var.enable_sftp_ingestion && var.enable_serverless ? 1 : 0
  bucket = module.sftp_ingestion[0].sftp_staging_bucket_id

  lambda_function {
    lambda_function_arn = module.lambda[0].lambda_arns["sftp_processor"]
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = var.sftp_s3_filter_prefix
  }

  depends_on = [aws_lambda_permission.s3_invoke_sftp_processor]
}
# ──────────────────────────────────────────────────────────────────────────────


module "s3_frontend" {
  count                       = var.enable_edge ? 1 : 0
  source                      = "../modules/edge/s3_frontend"
  project_name                = var.project_name
  environment                 = var.environment
  frontend_bucket_name        = var.s3_frontend_bucket_name
  kms_key_arn                 = var.kms_key_arn
  cloudfront_distribution_arn = module.cloudfront[0].cloudfront_distribution_arn
  github_actions_role_arn     = var.github_actions_role_arn
}



module "acm" {
  count  = var.enable_edge && var.enable_acm ? 1 : 0
  source = "../modules/edge/acm"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  project_name              = var.project_name
  environment               = var.environment
  domain_name               = var.domain_name
  subject_alternative_names = var.acm_subject_alternative_names
}


module "cloudfront" {
  count                     = var.enable_edge ? 1 : 0
  source                    = "../modules/edge/cloudfront"
  environment               = var.environment
  frontend_bucket_name      = module.s3_frontend[0].frontend_bucket_name
  frontend_bucket_id        = module.s3_frontend[0].frontend_bucket_id
  s3_frontend_bucket_domain = module.s3_frontend[0].frontend_bucket_domain_name
  root_domain_name          = var.domain_name
  subdomain_name            = var.subdomain_name
  acm_certificate_arn       = module.acm[0].validated_acm_certificate_arn
  price_class               = var.cloudfront_price_class
  waf_web_acl_arn           = module.waf[0].web_acl_arn
  alb_dns_name              = module.alb[0].alb_dns_name
  cloudfront_secret         = random_password.cloudfront_secret.result
}

module "dns" {
  count                     = var.enable_edge ? 1 : 0
  source                    = "../modules/edge/dns"
  domain_name               = var.domain_name
  sub_domain_record_type    = var.sub_domain_record_type
  root_domain_record_type   = var.root_domain_record_type
  cloudfront_domain_name    = module.cloudfront[0].cloudfront_domain_name
  cloudfront_hosted_zone_id = module.cloudfront[0].cloudfront_hosted_zone_id
}


module "waf" {
  count  = var.enable_edge ? 1 : 0
  source = "../modules/edge/waf"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  project_name = var.project_name
  environment  = var.environment
  rules        = var.waf_rules
}


module "ses" {
  source    = "../modules/email/ses"
  ses_email = var.ses_email
}
