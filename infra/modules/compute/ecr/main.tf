#ECR repositories (one per microserv)
resource "aws_ecr_repository" "repo" {
  for_each = var.repositories

  name                 = "${var.project_name}-${each.key}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-${each.key}"
    Environment = var.environment
  }
}



#Lifecycle rule (auto cleanup old images)
resource "aws_ecr_lifecycle_policy" "lifecycle" {
  for_each = var.repositories

  repository = aws_ecr_repository.repo[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.max_image_count} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

