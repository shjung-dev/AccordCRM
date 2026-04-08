#User RDS
output "user_rds_endpoint" {
  value = aws_db_instance.user_rds.endpoint
}

output "user_rds_address" {
  value = aws_db_instance.user_rds.address
}

output "user_rds_port" {
  value = aws_db_instance.user_rds.port
}

output "user_rds_id" {
  value = aws_db_instance.user_rds.id
}


#Client RDS
output "client_rds_endpoint" {
  value = aws_db_instance.client_rds.endpoint
}

output "client_rds_address" {
  value = aws_db_instance.client_rds.address
}

output "client_rds_port" {
  value = aws_db_instance.client_rds.port
}

output "client_rds_id" {
  value = aws_db_instance.client_rds.id
}


#Account & Transaction RDS
output "account_transaction_rds_endpoint" {
  value = aws_db_instance.account_transaction_rds.endpoint
}

output "account_transaction_rds_address" {
  value = aws_db_instance.account_transaction_rds.address
}

output "account_transaction_rds_port" {
  value = aws_db_instance.account_transaction_rds.port
}

output "account_transaction_rds_id" {
  value = aws_db_instance.account_transaction_rds.id
}


