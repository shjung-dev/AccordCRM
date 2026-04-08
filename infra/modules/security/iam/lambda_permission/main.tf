#Lambda IAM Role & Policy
resource "aws_iam_role" "lambda_role" {
  for_each = var.lambdas
  name     = "${var.project_name}-${each.key}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project = var.project_name
    Env     = var.environment
    Service = each.key
  }
}


resource "aws_iam_role_policy" "lambda_policy" {
  for_each = var.lambdas
  name     = "${var.project_name}-${each.key}-lambda-policy"
  role     = aws_iam_role.lambda_role[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      for p in each.value.policies : {
        Effect   = p.effect
        Action   = p.actions
        Resource = p.resources
      }
    ]
  })
}



