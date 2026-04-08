variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "environment" {
  description = "The environment (e.g., dev, prod)"
  type        = string
}

variable "alb_sg_id" {
  description = "The security group ID for the ALB"
  type        = string
}

variable "public_subnet_ids" {
  description = "The public subnet IDs for the ALB"
  type        = list(string)
}

variable "vpc_id" {
  description = "The VPC ID"
  type        = string
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for HTTPS"
  type        = string
}

variable "cloudfront_secret" {
  description = "Secret header value sent by CloudFront — ALB listener rules block requests missing this header"
  type        = string
  sensitive   = true
}

variable "microservices" {
  description = "A map of microservices with their configurations"
  type = map(object({
    port              = number
    health_check_path = string
    path_patterns     = list(string)
    priority          = number
  }))
}
