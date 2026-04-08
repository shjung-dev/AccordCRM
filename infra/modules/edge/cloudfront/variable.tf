variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend assets"
  type        = string
}


variable "frontend_bucket_id" {
  description = "ID of the S3 bucket for frontend assets"
  type        = string
}

variable "s3_frontend_bucket_domain" {
  description = "Regional domain name of the S3 bucket for frontend assets"
  type        = string
}

variable "root_domain_name" {
  description = "Root domain name for the CloudFront distribution (e.g., example.com)"
  type        = string
}


variable "subdomain_name" {
  description = "Subdomain name for the CloudFront distribution (e.g., www.example.com)"
  type        = string
}


variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for the custom domain (required if root_domain_name is provided)"
  type        = string
  default     = ""
}


variable "price_class" {
  description = "CloudFront price class (e.g., PriceClass_100, PriceClass_200, PriceClass_All)"
  type        = string
}


variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
}


variable "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL to associate with the CloudFront distribution"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the ALB — used as a second CloudFront origin for /api/* requests"
  type        = string
}

variable "cloudfront_secret" {
  description = "Secret header value sent from CloudFront to ALB to verify requests come through CloudFront"
  type        = string
  sensitive   = true
}





