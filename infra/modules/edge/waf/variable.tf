variable "rules" {
    description = "List of WAF rules to be applied to web acl"
    type = list(object({
      name =  string
        priority = number
        managed_rule_group_name = string
        vendor_name = string
        metric_name = string
        cloudwatch_metrics_enabled = optional(bool, true)
        sampled_requests_enabled = optional(bool, true)
    }))

}

variable "project_name" {
  description = "The name of the project."
  type        = string
}

variable "environment" {
  description = "The environment for the deployment (e.g., dev, staging, prod)."
  type        = string
}
