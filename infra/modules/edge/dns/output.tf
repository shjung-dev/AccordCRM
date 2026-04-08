output "root_domain_record_fqdn"{
  value = aws_route53_record.root_domain.fqdn
}


output "root_domain_name"{
  value = aws_route53_record.root_domain.name
}
