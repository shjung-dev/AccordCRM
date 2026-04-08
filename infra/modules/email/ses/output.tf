output "ses_email" {
  description = "Email address registered in SES"
  value       = aws_ses_email_identity.ses_email_identity.email
}

