resource "aws_kms_key" "kms_key" {
  description             = "KMS key for encrypting Terraform state in S3"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
    
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },

      # Allow CloudFront to decrypt S3 objects
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      },
      # Allow ALB to terminate SSL/TLS
      {
        Effect = "Allow"
        Principal = {
          Service = "elasticloadbalancing.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      },
      # Allow GitHub Actions to upload KMS-encrypted objects to S3
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::163683790602:role/Github-WebIdentityRole"
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "kms_key_alias" {
  name          = "alias/kms_key"
  target_key_id = aws_kms_key.kms_key.key_id
}
