output "kms_key_arn" {
  value = aws_kms_key.kms_key.arn
}

output "kms_key_id" {
  value = aws_kms_key.kms_key.key_id
}


output "account_id" {
  value = data.aws_caller_identity.current.account_id
}


