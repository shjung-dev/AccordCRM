#ALB Security Group (public)
# IP restriction removed - ALB listener rules enforce X-CloudFront-Secret header instead
resource "aws_security_group" "alb_sg" {
  name   = "${var.project_name}-alb-sg"
  vpc_id = var.vpc_id

  tags = {
    Name    = "${var.project_name}-alb-sg"
    Project = var.project_name
    Env     = var.environment
  }
}


resource "aws_security_group_rule" "alb_sg_ingress_http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb_sg.id
  description       = "Allow HTTP from anywhere - enforced at listener level via X-CloudFront-Secret header"
}


resource "aws_security_group_rule" "alb_sg_ingress_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb_sg.id
  description       = "Allow HTTPS from anywhere - enforced at listener level via X-CloudFront-Secret header"
}


resource "aws_security_group_rule" "alb_sg_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb_sg.id
}



#ECS Security Group (private app layer)
resource "aws_security_group" "ecs_sg" {
  name        = "${var.project_name}-ecs-sg"
  description = "Security group for ECS instances in the private app layer"
  vpc_id      = var.vpc_id

  tags = {
    Name    = "${var.project_name}-ecs-sg"
    Project = var.project_name
    Env     = var.environment
  }
}



#Dynamic Ingress: Allow traffic only from ALB to ECS instances (for each microservice port)
resource "aws_security_group_rule" "ecs_sg_ingress_from_alb" {
  for_each                 = var.microservices
  type                     = "ingress"
  from_port                = each.value.port
  to_port                  = each.value.port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_sg.id
  source_security_group_id = aws_security_group.alb_sg.id
  description              = "Allow traffic from ALB to ECS instances for ${each.key} microservice"
}




# Ingress: Allow ECS tasks to communicate with each other (inter-service)
resource "aws_security_group_rule" "ecs_sg_ingress_self" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_sg.id
  source_security_group_id = aws_security_group.ecs_sg.id
  description              = "Allow inter-service communication between ECS tasks"
}


#Egress: Allow all outbound traffic (to SQS , RDS , ElastiCache) (From ECS)
resource "aws_security_group_rule" "ecs_sg_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ecs_sg.id
}


#RDS Security Group (private data layer)
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS instances in the private data layer"
  vpc_id      = var.vpc_id

  tags = {
    Name    = "${var.project_name}-rds-sg"
    Project = var.project_name
    Env     = var.environment
  }
}


#Ingress: Postgres from ECS only
resource "aws_security_group_rule" "rds_sg_ingress_postgres_from_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.ecs_sg.id
}



#Egress: Allow all outbound traffic
resource "aws_security_group_rule" "rds_sg_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.rds_sg.id
}




#ElastiCache Security Group (private data layer)
resource "aws_security_group" "elasticache_sg" {
  name        = "${var.project_name}-elasticache-sg"
  description = "Security group for ElastiCache instances in the private data layer"
  vpc_id      = var.vpc_id

  tags = {
    Name    = "${var.project_name}-elasticache-sg"
    Project = var.project_name
    Env     = var.environment
  }
}


#Ingress: Redis from ECS only
resource "aws_security_group_rule" "elasticache_sg_ingress_redis_from_ecs" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.elasticache_sg.id
  source_security_group_id = aws_security_group.ecs_sg.id
}



#Egress: Allow all outbound traffic
resource "aws_security_group_rule" "elasticache_sg_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.elasticache_sg.id
}




# Lambda VPC Security Group (for VPC-enabled Lambdas that need to reach RDS)
resource "aws_security_group" "lambda_sg" {
  name        = "${var.project_name}-lambda-sg"
  description = "Security group for VPC-enabled Lambda functions (sftp_processor)"
  vpc_id      = var.vpc_id

  tags = {
    Name    = "${var.project_name}-lambda-sg"
    Project = var.project_name
    Env     = var.environment
  }
}

# Egress: Lambda → RDS (PostgreSQL)
resource "aws_security_group_rule" "lambda_sg_egress_rds" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  description              = "Allow Lambda to connect to PostgreSQL RDS"
  security_group_id        = aws_security_group.lambda_sg.id
  source_security_group_id = aws_security_group.rds_sg.id
}

# Egress: Lambda → HTTPS (S3 gateway endpoint, Secrets Manager, etc.)
resource "aws_security_group_rule" "lambda_sg_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow Lambda outbound HTTPS for S3 and AWS service calls"
  security_group_id = aws_security_group.lambda_sg.id
}

# Allow RDS to receive connections from VPC Lambda
resource "aws_security_group_rule" "rds_sg_ingress_postgres_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  description              = "Allow PostgreSQL access from VPC Lambda"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.lambda_sg.id
}



#VPC Endpoint Security Group (for SQS and Bedrock interface endpoints)
resource "aws_security_group" "vpc_endpoint_sg" {
  name        = "${var.project_name}-vpc-endpoint-sg"
  description = "Security group for VPC endpoints (SQS and Bedrock)"
  vpc_id      = var.vpc_id

  tags = {
    Name    = "${var.project_name}-vpc-endpoint-sg"
    Project = var.project_name
    Env     = var.environment
  }
}


#Ingress: Allow ECS instances to access SQS and Bedrock endpoints
resource "aws_security_group_rule" "vpc_endpoint_sg_ingress_from_ecs" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  description              = "Allow HTTPS traffic from ECS instances to VPC endpoints"
  security_group_id        = aws_security_group.vpc_endpoint_sg.id
  source_security_group_id = aws_security_group.ecs_sg.id
}

#Egress: Allow all outbound traffic to AWS services
resource "aws_security_group_rule" "vpc_endpoint_sg_egress_to_aws_services" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.vpc_endpoint_sg.id
}



