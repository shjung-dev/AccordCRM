# ── User Service ─────────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "user_db_url" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/user/db-url"
  type      = "SecureString"
  value     = "jdbc:postgresql://${module.rds[0].user_rds_address}:${var.user_rds_port}/${var.user_rds_db_name}?sslmode=require"
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "user_db_username" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/user/db-username"
  type      = "SecureString"
  value     = var.user_rds_username
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "user_db_password" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/user/db-password"
  type      = "SecureString"
  value     = var.user_rds_password
  key_id    = var.kms_key_id
  overwrite = true
}

# ── Client Service ────────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "client_db_url" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/client/db-url"
  type      = "SecureString"
  value     = "jdbc:postgresql://${module.rds[0].client_rds_address}:${var.client_rds_port}/${var.client_rds_db_name}?sslmode=require"
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "client_db_username" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/client/db-username"
  type      = "SecureString"
  value     = var.client_rds_username
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "client_db_password" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/client/db-password"
  type      = "SecureString"
  value     = var.client_rds_password
  key_id    = var.kms_key_id
  overwrite = true
}

# ── Account Service ───────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "account_db_url" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/account/db-url"
  type      = "SecureString"
  value     = "jdbc:postgresql://${module.rds[0].account_transaction_rds_address}:${var.account_transaction_rds_port}/${var.account_transaction_rds_db_name}?sslmode=require"
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "account_db_username" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/account/db-username"
  type      = "SecureString"
  value     = var.account_transaction_rds_username
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "account_db_password" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/account/db-password"
  type      = "SecureString"
  value     = var.account_transaction_rds_password
  key_id    = var.kms_key_id
  overwrite = true
}

# ── SFTP Processor Lambda ─────────────────────────────────────────────────────
# Separate from /accord-crm/account/db-url (JDBC format) — psycopg2 needs
# individual host/port/name components.
resource "aws_ssm_parameter" "sftp_processor_db_host" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/sftp-processor/db-host"
  type      = "SecureString"
  value     = module.rds[0].account_transaction_rds_address
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "sftp_processor_db_port" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/sftp-processor/db-port"
  type      = "String"
  value     = tostring(var.account_transaction_rds_port)
  overwrite = true
}

resource "aws_ssm_parameter" "sftp_processor_db_name" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/sftp-processor/db-name"
  type      = "String"
  value     = var.account_transaction_rds_db_name
  overwrite = true
}

resource "aws_ssm_parameter" "sftp_processor_db_username" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/sftp-processor/db-username"
  type      = "SecureString"
  value     = var.account_transaction_rds_username
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "sftp_processor_db_password" {
  count     = var.enable_rds ? 1 : 0
  name      = "/accord-crm/sftp-processor/db-password"
  type      = "SecureString"
  value     = var.account_transaction_rds_password
  key_id    = var.kms_key_id
  overwrite = true
}

# ── Shared ────────────────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "log_queue_url" {
  name      = "/accord-crm/sqs/log-queue-url"
  type      = "String"
  value     = module.sqs.log_queue_url
  overwrite = true
}

resource "aws_ssm_parameter" "email_queue_url" {
  name      = "/accord-crm/sqs/email-queue-url"
  type      = "String"
  value     = module.sqs.email_queue_url
  overwrite = true
}

resource "aws_ssm_parameter" "client_service_url" {
  count     = var.enable_compute ? 1 : 0
  name      = "/accord-crm/services/client-service-url"
  type      = "String"
  value     = "http://${module.alb[0].alb_dns_name}"
  overwrite = true
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  count     = var.enable_cognito ? 1 : 0
  name      = "/accord-crm/cognito/user-pool-id"
  type      = "String"
  value     = module.cognito[0].cognito_user_pool_id
  overwrite = true
}

# ── Frontend ─────────────────────────────────────────────────────────────────
resource "random_password" "session_secret" {
  length  = 64
  special = false
}

resource "random_password" "internal_key" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "frontend_cognito_client_id" {
  count     = var.enable_cognito ? 1 : 0
  name      = "/accord-crm/frontend/cognito-client-id"
  type      = "SecureString"
  value     = module.cognito[0].cognito_user_pool_client_id
  key_id    = var.kms_key_id
  overwrite = true
}

resource "aws_ssm_parameter" "frontend_user_service_url" {
  count     = var.enable_compute ? 1 : 0
  name      = "/accord-crm/frontend/user-service-url"
  type      = "String"
  value     = "http://user.accord-crm.local:8081"
  overwrite = true
}

resource "aws_ssm_parameter" "frontend_client_service_url" {
  count     = var.enable_compute ? 1 : 0
  name      = "/accord-crm/frontend/client-service-url"
  type      = "String"
  value     = "http://client.accord-crm.local:8082"
  overwrite = true
}

resource "aws_ssm_parameter" "frontend_account_service_url" {
  count     = var.enable_compute ? 1 : 0
  name      = "/accord-crm/frontend/account-service-url"
  type      = "String"
  value     = "http://account-transaction.accord-crm.local:8083"
  overwrite = true
}

resource "aws_ssm_parameter" "frontend_session_secret" {
  name      = "/accord-crm/frontend/session-secret"
  type      = "SecureString"
  value     = random_password.session_secret.result
  key_id    = var.kms_key_id
  overwrite = true

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "frontend_internal_key" {
  name      = "/accord-crm/frontend/internal-key"
  type      = "SecureString"
  value     = random_password.internal_key.result
  key_id    = var.kms_key_id
  overwrite = true

  lifecycle {
    ignore_changes = [value]
  }
}

# ── CloudFront → ALB Origin Secret ───────────────────────────────────────────
resource "random_password" "cloudfront_secret" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "cloudfront_secret" {
  name      = "/accord-crm/cloudfront/origin-secret"
  type      = "SecureString"
  value     = random_password.cloudfront_secret.result
  key_id    = var.kms_key_id
  overwrite = true

  lifecycle {
    ignore_changes = [value]
  }
}

# ── Feature Flags ────────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "frontend_smartcrm_chatbot_enabled" {
  name      = "/accord-crm/frontend/smartcrm-chatbot-enabled"
  type      = "String"
  value     = "true"
  overwrite = true

  lifecycle {
    ignore_changes = [value]
  }
}

# ── ElastiCache (Redis) ───────────────────────────────────────────────────────
resource "aws_ssm_parameter" "client_redis_host" {
  count     = var.enable_elasticache ? 1 : 0
  name      = "/accord-crm/cache/client/host"
  type      = "String"
  value     = module.elasticache[0].client_cache_endpoint
  overwrite = true
}

resource "aws_ssm_parameter" "client_redis_port" {
  count     = var.enable_elasticache ? 1 : 0
  name      = "/accord-crm/cache/client/port"
  type      = "String"
  value     = tostring(module.elasticache[0].client_cache_port)
  overwrite = true
}

resource "aws_ssm_parameter" "account_transaction_redis_host" {
  count     = var.enable_elasticache ? 1 : 0
  name      = "/accord-crm/cache/account-transaction/host"
  type      = "String"
  value     = module.elasticache[0].account_transaction_cache_endpoint
  overwrite = true
}

resource "aws_ssm_parameter" "account_transaction_redis_port" {
  count     = var.enable_elasticache ? 1 : 0
  name      = "/accord-crm/cache/account-transaction/port"
  type      = "String"
  value     = tostring(module.elasticache[0].account_transaction_cache_port)
  overwrite = true
}

resource "aws_ssm_parameter" "ai_output_redis_host" {
  count     = var.enable_elasticache ? 1 : 0
  name      = "/accord-crm/cache/ai-output/host"
  type      = "String"
  value     = module.elasticache[0].ai_output_cache_endpoint
  overwrite = true
}

resource "aws_ssm_parameter" "ai_output_redis_port" {
  count     = var.enable_elasticache ? 1 : 0
  name      = "/accord-crm/cache/ai-output/port"
  type      = "String"
  value     = tostring(module.elasticache[0].ai_output_cache_port)
  overwrite = true
}

# ── SFTP Ingestion ────────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "sftp_connector_id" {
  count     = var.enable_sftp_ingestion ? 1 : 0
  name      = "/accord-crm/sftp/connector-id"
  type      = "String"
  value     = module.sftp_ingestion[0].sftp_connector_id
  overwrite = true
}

