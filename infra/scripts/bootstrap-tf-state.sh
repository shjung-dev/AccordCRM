#!/usr/bin/env bash
# =============================================================================
# bootstrap-tf-state.sh — Create S3 bucket for Terraform remote state.
# Run this ONCE before the first `terraform init`.
#
# Usage:
#   ./infra/scripts/bootstrap-tf-state.sh <aws-region> <aws-account-id>
#
# Example:
#   ./infra/scripts/bootstrap-tf-state.sh ap-southeast-1 123456789012
# =============================================================================
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <aws-region> <aws-account-id>"
  exit 1
fi

REGION="$1"
ACCOUNT_ID="$2"
BUCKET="accord-crm-tfstate-${ACCOUNT_ID}"

echo "=== Bootstrapping Terraform Remote State ==="
echo "Region: $REGION"
echo "Bucket: $BUCKET"
echo ""

# ---------------------------------------------------------------------------
# Create S3 bucket
# ---------------------------------------------------------------------------
echo "--- Creating S3 bucket for state ---"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "  Bucket already exists, skipping."
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi
  echo "  Created."
fi

echo "--- Enabling versioning ---"
aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

echo "--- Enabling encryption ---"
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo "--- Blocking public access ---"
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo ""
echo "=== Bootstrap Complete ==="
echo ""
echo "Now update infra/terraform/backend.tf:"
echo "  1. Uncomment the backend \"s3\" block"
echo "  2. Set bucket = \"$BUCKET\""
echo "  3. Set region = \"$REGION\""
echo "  4. Run: cd infra/terraform && terraform init"
