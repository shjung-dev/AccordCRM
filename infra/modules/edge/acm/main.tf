terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

data "aws_route53_zone" "existing_host_zone" {
  name         = var.domain_name
  private_zone = false
}


# Requests an ACM certificate for your main domain and any subdomains you specify.
resource "aws_acm_certificate" "cloudfront_cert" {
  domain_name       = var.domain_name
  provider          = aws.us_east_1
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  subject_alternative_names = var.subject_alternative_names

  tags = {
    Name    = "${var.project_name}-cloudfront-cert"
    Project = var.project_name
    Env     = var.environment
  }
}



# Creates the DNS validation CNAME records in your Route53 hosted zone so ACM can verify domain ownership.
resource "aws_route53_record" "cert_validation" {
  allow_overwrite = true
  for_each = {
    for dvo in aws_acm_certificate.cloudfront_cert.domain_validation_options :
    dvo.domain_name => dvo
  }
  zone_id = data.aws_route53_zone.existing_host_zone.zone_id

  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  records = [each.value.resource_record_value]
  ttl     = 60
}



# Confirms to ACM that the DNS validation records exist, completing the certificate validation process.
resource "aws_acm_certificate_validation" "cloudfront_cert_validation" {
  count           = length(aws_route53_record.cert_validation) > 0 ? 1 : 0
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cloudfront_cert.arn

  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation :
    record.fqdn
  ]

  depends_on = [aws_route53_record.cert_validation]
}















