// CloudWatch Log Groups (one per microservice)
resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = var.microservices
  name              = "/ecs/${var.project_name}/${each.key}"
  retention_in_days = 30

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Service     = each.value.name
  }
}


//ECS Cluster
resource "aws_ecs_cluster" "ecs_cluster" {
  name = "${var.project_name}-ecs-cluster"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}


// Cloud Map Service Discovery (one per microservice)
resource "aws_service_discovery_service" "services" {
  for_each = var.microservices

  name = each.key

  dns_config {
    namespace_id   = var.service_discovery_namespace_id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}


//ECS Task Definition
resource "aws_ecs_task_definition" "tasks" {
  for_each = var.microservices

  family                   = "${var.project_name}-${each.key}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arns[each.key]

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = each.value.image
      cpu       = each.value.cpu
      memory    = each.value.memory
      essential = true
      portMappings = [
        {
          containerPort = each.value.port
          hostPort      = each.value.port
          protocol      = "tcp"
        }
      ]
      environment = [for k, v in each.value.env_vars : { name = k, value = v }]
      secrets     = [for s in each.value.secrets : { name = s.name, valueFrom = s.valueFrom }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs[each.key].name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Service     = each.value.name
  }
}

resource "aws_ecs_service" "services" {
  for_each         = var.microservices
  name             = "${var.project_name}-${each.key}-service"
  cluster          = aws_ecs_cluster.ecs_cluster.id
  task_definition  = aws_ecs_task_definition.tasks[each.key].arn_without_revision
  desired_count    = each.value.desired_count
  launch_type      = "FARGATE"
  platform_version = "LATEST"

  network_configuration {
    subnets          = var.private_app_subnet_ids
    security_groups  = var.ecs_sg_ids
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = contains(keys(var.alb_target_group_arns), each.key) ? [1] : []
    content {
      target_group_arn = var.alb_target_group_arns[each.key]
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  service_registries {
    registry_arn = aws_service_discovery_service.services[each.key].arn
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Service     = each.value.name
  }

  depends_on = [
    aws_ecs_task_definition.tasks,
  ]
}


#Auto Scaling Target (Per microservices)
resource "aws_appautoscaling_target" "ecs_service_target" {
  for_each = var.microservices

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.ecs_cluster.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = each.value.autoscaling.min_count
  max_capacity       = each.value.autoscaling.max_count
}


# Autoscaling CPU Policy (per microservice)
resource "aws_appautoscaling_policy" "cpu_target" {
  for_each = var.microservices

  name               = "${var.project_name}-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = each.value.autoscaling.cpu_target
  }
}
