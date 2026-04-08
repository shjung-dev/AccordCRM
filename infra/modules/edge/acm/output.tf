output "validated_acm_certificate_arn" {
  value = try(aws_acm_certificate_validation.cloudfront_cert_validation[0].certificate_arn, aws_acm_certificate.cloudfront_cert.arn)
}

