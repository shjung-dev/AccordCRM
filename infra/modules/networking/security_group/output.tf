#ALB SG ID
output "alb_sg_id" {
  value = aws_security_group.alb_sg.id
}



#ECS SG ID
output "ecs_sg_id" {
  value = aws_security_group.ecs_sg.id
} 


#RDS SG ID
output "rds_sg_id" {
  value = aws_security_group.rds_sg.id
}



#ElastiCache SG ID
output "elasticache_sg_id" {
  value = aws_security_group.elasticache_sg.id
}



#VPC Endpoint SG ID
output "vpc_endpoint_sg_id" {
  value = aws_security_group.vpc_endpoint_sg.id
}



#Lambda VPC SG ID
output "lambda_sg_id" {
  value = aws_security_group.lambda_sg.id
}   



