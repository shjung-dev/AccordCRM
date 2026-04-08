locals {
  # Derived from the same naming convention used in modules/data/sftp_ingestion/main.tf
  sftp_staging_bucket_name = "${var.project_name}-sftp-staging-${var.environment}"
  sftp_staging_bucket_arn  = "arn:aws:s3:::${local.sftp_staging_bucket_name}"
}

# IAM role for AWS Transfer Family to read/write the S3 staging bucket
resource "aws_iam_role" "transfer_family_role" {
  name = "${var.project_name}-transfer-family-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "transfer.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_iam_role_policy" "transfer_family_secrets_policy" {
  name = "${var.project_name}-transfer-family-secrets-policy"
  role = aws_iam_role.transfer_family_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.sftp_credentials_secret_arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "transfer_family_s3_policy" {
  name = "${var.project_name}-transfer-family-s3-policy"
  role = aws_iam_role.transfer_family_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
          "s3:DeleteObjectVersion"
        ]
        Resource = "${local.sftp_staging_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = local.sftp_staging_bucket_arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# IAM role for the sftp_initiator Lambda (calls StartFileTransfer on the connector)
resource "aws_iam_role" "sftp_initiator_role" {
  name = "${var.project_name}-sftp-initiator-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_iam_role_policy" "sftp_initiator_policy" {
  name = "${var.project_name}-sftp-initiator-lambda-policy"
  role = aws_iam_role.sftp_initiator_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Resource is "*" because the connector ARN is not available until after first apply
        # (circular dependency with sftp_ingestion module). The initiator Lambda is already
        # constrained by its SFTP_CONNECTOR_ID env var at runtime.
        Effect   = "Allow"
        Action   = ["transfer:StartFileTransfer"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# IAM role for the sftp_processor Lambda (reads S3, writes to RDS via VPC)
resource "aws_iam_role" "sftp_processor_role" {
  name = "${var.project_name}-sftp-processor-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_iam_role_policy" "sftp_processor_policy" {
  name = "${var.project_name}-sftp-processor-lambda-policy"
  role = aws_iam_role.sftp_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${local.sftp_staging_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = local.sftp_staging_bucket_arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arn
      },
      # VPC networking permissions required for VPC-enabled Lambda
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/accord-crm/sftp-processor/*"
      },
      {
        # KMS decrypt for SecureString SSM parameters (db-host, db-username, db-password)
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = var.kms_key_arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
