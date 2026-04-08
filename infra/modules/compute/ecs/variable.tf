variable "project_name" {
  type = string
}


variable "environment" {
  type = string
}

variable "microservices" {
  description = "A map of microservices with their configurations"
  type = map(object({
    port              = number
    health_check_path = string
    path_patterns     = list(string)
    priority          = number
    cpu               = number
    memory            = number
    image             = string
    desired_count     = number
    name              = string
    env_vars          = optional(map(string), {})
    secrets           = optional(list(object({ name = string, valueFrom = string })), [])
    autoscaling = object({
      min_count  = number
      max_count  = number
      cpu_target = number
    })
  }))
}


variable "alb_target_group_arns" {
  description = "A map of ARNs for ALB target groups (one per microservice)."
  type        = map(string)
}


variable "execution_role_arn" {
  description = "The ARN of the IAM role that the ECS tasks will use for execution (e.g., to pull images from ECR)."
  type        = string
}


variable "task_role_arns" {
  description = "A map of ARNs for IAM roles that the ECS tasks will assume (one per microservice)."
  type        = map(string)
}


variable "private_app_subnet_ids" {
  description = "A list of private subnet IDs for the ECS tasks to run in."
  type        = list(string)
}

variable "ecs_sg_ids" {
  description = "A list of security group IDs to associate with the ECS tasks."
  type        = list(string)
}

variable "region" {
  description = "AWS region for CloudWatch log group."
  type        = string
}

variable "service_discovery_namespace_id" {
  description = "ID of the AWS Cloud Map private DNS namespace used for Service Discovery."
  type        = string
}
