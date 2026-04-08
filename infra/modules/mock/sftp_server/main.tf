# Generate SSH key pair for the SFTP user (connector authenticates with this)
resource "tls_private_key" "sftp_user_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Generate a fixed RSA host key so we know the trusted_host_key before EC2 starts
resource "tls_private_key" "ssh_host_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Store SFTP credentials in Secrets Manager (Transfer Family Connector reads this)
resource "aws_secretsmanager_secret" "sftp_creds" {
  name                    = "${var.project_name}-mock-sftp-creds-${var.environment}"
  description             = "SFTP credentials for mock dev SFTP server"
  recovery_window_in_days = 0 # immediate deletion for dev

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "sftp_creds" {
  secret_id = aws_secretsmanager_secret.sftp_creds.id
  secret_string = jsonencode({
    Username   = "sftpuser"
    PrivateKey = tls_private_key.sftp_user_key.private_key_pem
  })
}

# Security group: allow SFTP (port 22) inbound from anywhere (mock/dev only)
resource "aws_security_group" "mock_sftp_sg" {
  name        = "${var.project_name}-mock-sftp-sg"
  description = "Allow SFTP inbound for mock dev server"
  vpc_id      = var.vpc_id

  ingress {
    description = "SFTP from anywhere (dev mock only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-mock-sftp-sg"
    Project = var.project_name
    Env     = var.environment
  }
}

# Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# t3.nano EC2 instance (~$0.0052/hr) running OpenSSH as mock SFTP server
resource "aws_instance" "mock_sftp" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = "t3.nano"
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.mock_sftp_sg.id]
  associate_public_ip_address = true

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    sftp_user_public_key  = trimspace(tls_private_key.sftp_user_key.public_key_openssh)
    ssh_host_private_key  = tls_private_key.ssh_host_key.private_key_pem
  }))

  tags = {
    Name    = "${var.project_name}-mock-sftp-server"
    Project = var.project_name
    Env     = var.environment
  }
}

# Elastic IP for a stable hostname
resource "aws_eip" "mock_sftp" {
  instance = aws_instance.mock_sftp.id
  domain   = "vpc"

  tags = {
    Name    = "${var.project_name}-mock-sftp-eip"
    Project = var.project_name
    Env     = var.environment
  }
}
