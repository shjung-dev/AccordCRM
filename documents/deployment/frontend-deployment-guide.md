# Frontend Deployment Guide - Cloudfront + S3 (Route 53)

**Live URL**: https://d2rovljjp79ivt.cloudfront.net

---

## 1. SETUP (One-time Only)

### Step 1: Install Prerequisites

Make sure you have these installed:

```bash
aws --version 
terraform --version
node --version    
npm --version
```

### Step 2: Configure AWS Credentials

```bash
aws configure
```

Enter when prompted:
- **Access Key ID**: AWS Access Key
- **Secret Access Key**: AWS Secret Key
- **Default region**: `ap-southeast-1`
- **Output format**: `json`

### Step 3: Create Terraform State Bucket

```bash
# From root repository folder
./infra/scripts/bootstrap-tf-state.sh ap-southeast-1 <AWS-ACCOUNT-ID>
```

### Step 4: Create the `terraform.tfvars` File

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set your bucket name:

```hcl
aws_region = "ap-southeast-1"
environment = "dev"
site_bucket_name = "accord-crm-frontend-dev-<AWS-ACCOUNT-ID>"

price_class = "PriceClass_200"

domain_name     = ""
hosted_zone_id  = ""
certificate_arn = ""
```

### Step 5: Deploy AWS Infrastructure

```bash
cd infra/terraform
terraform init
terraform plan     
terraform apply     # Type 'yes' when prompted
```

### Step 6: Build and Upload Frontend

```bash
# From root repository folder
./infra/scripts/build-static.sh

# Upload to S3
BUCKET=$(cd infra/terraform && terraform output -raw s3_bucket_name)
aws s3 sync frontend/out/ "s3://$BUCKET/" --delete --cache-control "public, max-age=300"
aws s3 sync frontend/out/_next/ "s3://$BUCKET/_next/" --cache-control "public, max-age=31536000, immutable"

# Clear the CDN cache
DIST_ID=$(cd infra/terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

### Step 7: Verify

```bash
# Get your site URL
cd infra/terraform && terraform output site_url
```
---

## 2. REDEPLOY CODE CHANGES

Whenever you make changes to the frontend code, you rebuild and re-upload changes:

```bash
# 1. Build (from root repository folder)
./infra/scripts/build-static.sh

# 2. Upload to S3
BUCKET=$(cd infra/terraform && terraform output -raw s3_bucket_name)
aws s3 sync frontend/out/ "s3://$BUCKET/" --delete --cache-control "public, max-age=300"
aws s3 sync frontend/out/_next/ "s3://$BUCKET/_next/" --cache-control "public, max-age=31536000, immutable"

# 3. Clear CDN cache so users see the latest version
DIST_ID=$(cd infra/terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```
---

## 3. TEARING DOWN (DELETING EVERYTHING)

To remove all AWS resources created by Terraform:

```bash
cd infra/terraform
terraform destroy    # Type 'yes' when prompted
```

This deletes the S3 bucket, CloudFront distribution, and all related resources. The state bucket (`accord-crm-tfstate-*`) is **not** deleted by this command — delete it manually in the S3 console if needed.

---

### Quick Command Reference

| Task | Command |
|------|---------|
| Check site URL | `cd infra/terraform && terraform output site_url` |
| Check all outputs | `cd infra/terraform && terraform output` |
| Check invalidation status | `aws cloudfront list-invalidations --distribution-id <DIST_ID>` |
| View infrastructure state | `cd infra/terraform && terraform show` |
| Destroy everything | `cd infra/terraform && terraform destroy` |
