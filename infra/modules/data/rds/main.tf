#RDS Subnet Group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name        = "${var.project_name}-rds-subnet-group"
  subnet_ids  = var.private_data_subnet_ids
  description = "Subnet group for RDS instances in the private data layer"

  tags = {
    Name    = "${var.project_name}-rds-subnet-group"
    Project = var.project_name
    Env     = var.environment
  }
}


#User RDS Instance
resource "aws_db_instance" "user_rds" {
  identifier        = "${var.project_name}-user-rds"
  allocated_storage = var.user_rds_allocated_storage
  engine            = var.user_rds_engine
  engine_version    = var.user_rds_engine_version
  instance_class    = var.user_rds_instance_class
  db_name           = var.user_rds_db_name
  username          = var.user_rds_username
  password          = var.user_rds_password
  port              = var.user_rds_port

  storage_encrypted = true

  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [var.rds_sg_id]
  multi_az               = var.user_rds_multi_az

  kms_key_id          = var.kms_key_arn
  publicly_accessible = false

  backup_retention_period = 7
  skip_final_snapshot     = var.skip_final_snapshot

  tags = {
    Name    = "${var.project_name}-user-rds"
    Project = var.project_name
    Env     = var.environment
  }
}


#Client RDS Instance
resource "aws_db_instance" "client_rds" {
  identifier        = "${var.project_name}-client-rds"
  allocated_storage = var.client_rds_allocated_storage
  engine            = var.client_rds_engine
  engine_version    = var.client_rds_engine_version
  instance_class    = var.client_rds_instance_class
  db_name           = var.client_rds_db_name
  username          = var.client_rds_username
  password          = var.client_rds_password
  port              = var.client_rds_port

  storage_encrypted = true

  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [var.rds_sg_id]
  multi_az               = var.client_rds_multi_az

  kms_key_id              = var.kms_key_arn
  publicly_accessible     = false
  backup_retention_period = 7
  skip_final_snapshot     = var.skip_final_snapshot

  tags = {
    Name    = "${var.project_name}-client-rds"
    Project = var.project_name
    Env     = var.environment
  }
}



#Account & Transaction RDS Instance
resource "aws_db_instance" "account_transaction_rds" {
  identifier        = "${var.project_name}-account-transaction-rds"
  allocated_storage = var.account_transaction_rds_allocated_storage
  engine            = var.account_transaction_rds_engine
  engine_version    = var.account_transaction_rds_engine_version
  instance_class    = var.account_transaction_rds_instance_class
  db_name           = var.account_transaction_rds_db_name
  username          = var.account_transaction_rds_username
  password          = var.account_transaction_rds_password
  port              = var.account_transaction_rds_port
  
  storage_encrypted = true

  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [var.rds_sg_id]
  multi_az               = var.account_transaction_rds_multi_az

  kms_key_id              = var.kms_key_arn
  publicly_accessible     = false
  backup_retention_period = 7
  skip_final_snapshot     = var.skip_final_snapshot

  tags = {
    Name    = "${var.project_name}-account-transaction-rds"
    Project = var.project_name
    Env     = var.environment
  }
}





