#Output cloudfront distribution id
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}


#Output CloudFront distribution ARN
output "cloudfront_distribution_arn" {
  description = "The ARN of the Cloudfront distribution, used by S3 bucket policies"
  value       = aws_cloudfront_distribution.site.arn
}


#Output CloudFront distribution domain name
output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution, used for DNS configuration"
  value       = aws_cloudfront_distribution.site.domain_name
}

#Output CloudFront hosted zone ID (AWS-assigned static value)
output "cloudfront_hosted_zone_id" {
  description = "The hosted zone ID for CloudFront distributions, used for DNS configuration"
  value       = aws_cloudfront_distribution.site.hosted_zone_id
}



