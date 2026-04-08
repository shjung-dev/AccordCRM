#Private app layer subnets (ECS instances in 2 AZ)
resource "aws_subnet" "app_layer_a" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-southeast-1a"

  tags = {
    Name  = "${var.vpc_name}-app-layer-a"
    Layer = "App"
  }
}


resource "aws_subnet" "app_layer_b" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-southeast-1b"

  tags = {
    Name  = "${var.vpc_name}-app-layer-b"
    Layer = "App"
  }
}


#Private data layer subnets (RDS + ElastiCache in 2 AZ)
resource "aws_subnet" "data_layer_a" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "ap-southeast-1a"

  tags = {
    Name  = "${var.vpc_name}-data-layer-a"
    Layer = "Data"
  }
}


resource "aws_subnet" "data_layer_b" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "ap-southeast-1b"

  tags = {
    Name  = "${var.vpc_name}-data-layer-b"
    Layer = "Data"
  }
}


#Private lambda layer subnets (sftp_processor Lambda in 2 AZs)
resource "aws_subnet" "lambda_layer_a" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.7.0/24"
  availability_zone = "ap-southeast-1a"

  tags = {
    Name  = "${var.vpc_name}-lambda-layer-a"
    Layer = "Lambda"
  }
}

resource "aws_subnet" "lambda_layer_b" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.8.0/24"
  availability_zone = "ap-southeast-1b"

  tags = {
    Name  = "${var.vpc_name}-lambda-layer-b"
    Layer = "Lambda"
  }
}


#Public Subnets (for Internet-facing services -> ALB in 2 AZs)
resource "aws_subnet" "public_a" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.5.0/24"
  availability_zone = "ap-southeast-1a"

  tags = {
    Name  = "${var.vpc_name}-public-a"
    Layer = "Public"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.6.0/24"
  availability_zone = "ap-southeast-1b"

  tags = {
    Name  = "${var.vpc_name}-public-b"
    Layer = "Public"
  }
}













