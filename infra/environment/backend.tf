terraform {
  backend "s3" {
    bucket     = "accordcrm-terraform-state-bucket"       //Name of the s3 bucket for storing the terraform state file
    key        = "accord-crm/statefile/terraform.tfstate" //Path to the state file in the s3 bucket
    region     = "ap-southeast-1"                         //AWS region where the s3 bucket is located
    kms_key_id = "90e272eb-591c-43e0-a843-0a9476f4801b"   //KMS key ID for encrypting the state file
  }
}




##This is from Boostrap module output, you can use these values to fill in the above backend configuration##
# account_id = "163683790602"
# dynamo_lock_table_name = "accordcrm-terraform-state-dynamo-lock"
# kms_key_arn = "arn:aws:kms:ap-southeast-1:163683790602:key/05877312-58ce-4389-afb0-e2228948dba1"
# kms_key_id = "05877312-58ce-4389-afb0-e2228948dba1"
# tf_state_bucket_name = "accordcrm-terraform-state-bucket"
