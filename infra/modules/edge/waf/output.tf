# infra/modules/edge/waf/output.tf

# ARN of the WAF Web ACL (needed to associate with CloudFront if not already done in module)
output "web_acl_arn" {
  value       = aws_wafv2_web_acl.frontend_waf.arn
  description = "ARN of the WAF Web ACL"
}

# Name of the WAF Web ACL
output "web_acl_name" {
  value       = aws_wafv2_web_acl.frontend_waf.name
  description = "Name of the WAF Web ACL"
}


# List of rules applied (names and priorities)
output "waf_rules_applied" {
  value = [for r in aws_wafv2_web_acl.frontend_waf.rule : {
    name     = r.name
    priority = r.priority
  }]
  description = "List of rules applied to the Web ACL with their priority"
}


