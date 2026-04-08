output "sftp_host" {
  description = "Public IP of the mock SFTP server. Use as sftp_host in the connector."
  value       = aws_eip.mock_sftp.public_ip
}

output "sftp_credentials_secret_arn" {
  description = "Secrets Manager ARN containing the SFTP Username + PrivateKey for the connector."
  value       = aws_secretsmanager_secret.sftp_creds.arn
}

output "sftp_host_public_key" {
  description = "SSH host public key (trusted_host_keys) for the Transfer Family Connector."
  value       = trimspace(tls_private_key.ssh_host_key.public_key_openssh)
}
