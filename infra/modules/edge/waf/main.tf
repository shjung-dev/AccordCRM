terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}


# WAF for CloudFront (Edge)
resource "aws_wafv2_web_acl" "frontend_waf" {
  provider = aws.us_east_1 # WAF must be created in us-east-1 for CloudFront
  name        = "${var.project_name}-cloudfront-waf" # Web ACL name
  description = "Edge WAF for CloudFront frontend"   # Description
  scope       = "CLOUDFRONT"                         # Scope: CloudFront (edge)

  # Default action if request does not match any rule
  default_action {
    allow {} # Allow requests by default
  }

  # Dynamic block to loop through all rules provided via var.rules
  dynamic "rule" {
    for_each = var.rules # Each element is an object with rule details
    content {
      name     = rule.value.name     # Name of this rule
      priority = rule.value.priority # Priority of the rule

      # Override action for the rule
      override_action {
        count {}
      }

      statement {
        managed_rule_group_statement {
          name        = rule.value.managed_rule_group_name
          vendor_name = rule.value.vendor_name
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = lookup(rule.value, "cloudwatch_metrics_enabled", true)
        metric_name                = rule.value.metric_name # Metric name for this rule
        sampled_requests_enabled   = lookup(rule.value, "sampled_requests_enabled", true)
      }
    }
  }

  # Web ACL level visibility config
  visibility_config {
    cloudwatch_metrics_enabled = true                                 # Enable CloudWatch metrics for the ACL
    metric_name                = "${var.project_name}-cloudfront-waf" # Metric name for the ACL
    sampled_requests_enabled   = true                                 # Sample requests for inspection
  }

  # Tags for tracking environment and project
  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}
