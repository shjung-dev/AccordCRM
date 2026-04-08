data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

#ECS Execution Role for pulling images from ECR
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

#Attach AWS managed policy for ECS task execution to the execution role
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow execution role to pull ECR images, create CloudWatch log groups and read SSM secrets
resource "aws_iam_role_policy" "ecs_execution_logs_policy" {
  name = "${var.project_name}-ecs-execution-logs-policy"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:*:*:parameter/accord-crm/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
      }
    ]
  })
}

#ECS Task Role for each microservice (for app to access aws services like SQS / DynamoDB / KMS / Bedrock)
resource "aws_iam_role" "ecs_task_role" {
  for_each = var.microservices

  name = "${var.project_name}-${each.key}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Service     = each.value.name
  }
}

#Scalable attachment of Policy for inline SQS / DynamoDB / KMS / Bedrock access
resource "aws_iam_role_policy" "ecs_task_policy" {
  for_each = var.microservices
  name     = "${var.project_name}-${each.key}-ecs-task-policy"
  role     = aws_iam_role.ecs_task_role[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Effect   = "Allow"
          Action   = ["sqs:SendMessage"]
          Resource = "arn:aws:sqs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${var.project_name}-*"
        }
      ],
      [
        for p in each.value.policies : {
          Effect   = p.effect
          Action   = p.actions
          Resource = p.resources
        }
      ]
    )
  })
}