#S3 Bucket for Static Frontend Hosting
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = var.frontend_bucket_name

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}



#Block all public access to frontend bucket
resource "aws_s3_bucket_public_access_block" "frontend_bucket_public_access_block" {
  bucket                  = aws_s3_bucket.frontend_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  depends_on = [aws_s3_bucket.frontend_bucket]
}


#Enable frontend bucket versioning
resource "aws_s3_bucket_versioning" "frontend_bucket_versioning" {
  bucket = aws_s3_bucket.frontend_bucket.id
  versioning_configuration {
    status = "Enabled"
  }

  depends_on = [aws_s3_bucket_public_access_block.frontend_bucket_public_access_block]
}



#Server side encryption using SSE-S3 (AES256)
#Note: CloudFront OAC does not support customer-managed KMS without additional KMS key policy;
#SSE-S3 is sufficient for static assets and works natively with OAC.
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_bucket_encryption" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }

  depends_on = [aws_s3_bucket_versioning.frontend_bucket_versioning]
}



#Allow CloudFront (OAC) to access frontend bucket
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "aws:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      },
      {
        Sid    = "AllowGitHubActionsSync"
        Effect = "Allow"
        Principal = { AWS = var.github_actions_role_arn }
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.frontend_bucket.arn,
          "${aws_s3_bucket.frontend_bucket.arn}/*"
        ]
      }
    ]
  })
}



