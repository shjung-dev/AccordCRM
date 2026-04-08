data "aws_route53_zone" "existing_host_zone" {
  name         = var.domain_name
  private_zone = false
}


#Root domain pointing to CloudFront
resource "aws_route53_record" "root_domain" {
  zone_id = data.aws_route53_zone.existing_host_zone.zone_id
  name    = var.domain_name
  type    = var.root_domain_record_type

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = true
  }
}



resource "aws_route53_record" "www_subdomain" {
  zone_id = data.aws_route53_zone.existing_host_zone.zone_id
  name    = "www.${var.domain_name}"
  type    = var.sub_domain_record_type

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = true
  }
}



