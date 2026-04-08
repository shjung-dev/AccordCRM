# SQS Interface Endpoint
resource "aws_vpc_endpoint" "ecs_to_sqs" {
  vpc_id             = var.vpc_id
  service_name       = "com.amazonaws.${var.region}.sqs"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.private_app_subnet_ids
  security_group_ids = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-sqs-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# Bedrock Interface Endpoint
resource "aws_vpc_endpoint" "ecs_to_bedrock" {
  vpc_id             = var.vpc_id
  service_name       = "com.amazonaws.${var.region}.bedrock-runtime"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.private_app_subnet_ids
  security_group_ids = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-bedrock-endpoint"
    Project = var.project_name
    Env     = var.environment
  }

}


# DynamoDB Gateway Endpoint
resource "aws_vpc_endpoint" "ecs_to_dynamodb" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [var.private_app_route_table_id]

  tags = {
    Name    = "${var.project_name}-dynamodb-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# ECR API Interface Endpoint — allows ECS in private subnets to call ECR API
resource "aws_vpc_endpoint" "ecs_to_ecr_api" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-ecr-api-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# ECR DKR Interface Endpoint — allows ECS in private subnets to docker pull from ECR
resource "aws_vpc_endpoint" "ecs_to_ecr_dkr" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-ecr-dkr-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# CloudWatch Logs Interface Endpoint — required for ECS Fargate in private subnets to ship logs
resource "aws_vpc_endpoint" "ecs_to_logs" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-logs-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# SSM Interface Endpoint — allows ECS in private subnets to pull SSM secrets
resource "aws_vpc_endpoint" "ecs_to_ssm" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-ssm-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# KMS Interface Endpoint — required for ECS to decrypt SSM SecureString parameters
resource "aws_vpc_endpoint" "ecs_to_kms" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.kms"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-kms-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# Cognito Interface Endpoint — allows ECS in private subnets to call Cognito IdP
resource "aws_vpc_endpoint" "ecs_to_cognito" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.cognito-idp"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-cognito-idp-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# STS Interface Endpoint — allows ECS Fargate tasks to obtain AWS credentials
resource "aws_vpc_endpoint" "ecs_to_sts" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.sts"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_app_subnet_ids
  security_group_ids  = [var.vpc_endpoint_sg_id]
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-sts-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}

# S3 Gateway Endpoint — allows VPC Lambda to reach S3 without NAT Gateway
resource "aws_vpc_endpoint" "lambda_to_s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [var.private_app_route_table_id, var.private_lambda_route_table_id]

  tags = {
    Name    = "${var.project_name}-s3-endpoint"
    Project = var.project_name
    Env     = var.environment
  }
}







