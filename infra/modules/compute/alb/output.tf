output "alb_arn" {
  description = "The ARN of the Application Load Balancer"
  value       = aws_lb.alb.arn
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.alb.dns_name
}

output "alb_target_group_arns" {
  description = "A map of microservice names to their Target Group ARNs"
  value       = { for k, v in aws_lb_target_group.target_group : k => v.arn }
}

output "alb_listener_arn" {
  description = "The ARN of the ALB HTTPS listener"
  value       = aws_lb_listener.http_listener.arn
}


