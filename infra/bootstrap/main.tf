module "kms" {
  source = "./modules/kms"
}


module "s3" {
  source = "./modules/s3"
  tf_state_bucket_name = var.tf_state_bucket_name
  kms_key_id = module.kms.kms_key_id
}



