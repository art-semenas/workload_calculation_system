# AWS Deploy — Hybrid (EC2 compose + RDS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-18-aws-deploy-hybrid-design.md`

**Goal:** Deploy the workload calculation system to AWS using Terraform, fitting inside the AWS Free Tier. A single EC2 instance runs `docker compose` with **three** containers — a reverse-proxy `nginx`, the frontend (nginx + React build), and the Spring Boot backend. Postgres runs as managed RDS. CloudFront fronts the EC2 instance for HTTPS termination with a single origin (the EC2 EIP on port 80). Deploys and destroys are manual-trigger GitHub Actions workflows. After a full destroy with `also_destroy_bootstrap=true`, AWS Billing reads $0/mo.

**Architecture:** Two Terraform configurations: `infra/bootstrap/` (local state, one-time — creates tfstate bucket, DynamoDB lock, OIDC provider, GitHub deployer IAM role) and `infra/terraform/` (S3+DynamoDB backend — creates the main stack). The main stack has **one** CloudFront origin (EC2 :80) and **two** ECR repositories (`workload-backend`, `workload-frontend`). No S3 frontend bucket.

**Tech Stack:** Terraform ≥ 1.6, AWS Provider ≥ 5.30, AWS CLI v2, Bash, GitHub Actions, Java 21 / Maven (backend image), Node 20 (frontend image — built via the existing `frontend/Dockerfile` multi-stage build).

---

## Operator pre-flight (one-time, before any task)

The implementing engineer needs:

1. An AWS account with admin or near-admin permissions (the bootstrap step creates IAM resources).
2. AWS CLI v2 installed and a local profile configured (e.g. `aws configure --profile workload`). All commands below assume `AWS_PROFILE=workload` and a chosen region (default `eu-central-1`). Set:
   ```bash
   export AWS_PROFILE=workload
   export AWS_REGION=eu-central-1
   ```
3. Terraform ≥ 1.6 on PATH. Verify: `terraform -v` must print `Terraform v1.6.0` or higher.
4. Docker daemon running locally (needed to build both images during the first apply).
5. The GitHub repository slug for this project, in `OWNER/REPO` form (used by OIDC trust policy). Determine via `git remote -v` and export:
   ```bash
   export GITHUB_REPO=OWNER/REPO    # e.g. godeltech/workload-calculation-system
   ```
6. The current AWS account ID:
   ```bash
   export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   ```

---

## Phase 1 — Backend Spring profile

### Task 1: Add the `aws` Spring profile

**Files:**
- Create: `backend/src/main/resources/application-aws.yml`

- [ ] **Step 1: Write the file**

```yaml
# Activated by SPRING_PROFILES_ACTIVE=aws on the production EC2 host.
# Overrides actuator exposure and enables CloudFront-aware forwarding.
server:
  forward-headers-strategy: NATIVE

management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: never
```

- [ ] **Step 2: Verify backend still builds**

Run: `cd backend && mvn -B -DskipTests package -q`
Expected: `BUILD SUCCESS`. (Spotless will also run; the new file has no Java code so it passes through unchanged.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/application-aws.yml
git commit -m "feat: add Spring 'aws' profile for production deployment"
```

---

## Phase 2 — `infra/` scaffolding

### Task 2: Create infra directory tree and gitignore

**Files:**
- Create: `infra/.gitignore`
- Create: `infra/README.md`
- Create: `infra/bootstrap/` (empty for now)
- Create: `infra/terraform/` (empty for now)
- Create: `infra/terraform/files/` (empty for now — holds `nginx.conf`)

- [ ] **Step 1: Create directories**

```bash
mkdir -p infra/bootstrap infra/terraform/files
```

- [ ] **Step 2: Write `infra/.gitignore`**

```
# Terraform local state and providers
.terraform/
.terraform.lock.hcl
*.tfstate
*.tfstate.*
*.tfstate.backup

# tfvars may contain secrets
*.tfvars
*.tfvars.json
!*.example.tfvars
```

- [ ] **Step 3: Write `infra/README.md`**

```markdown
# Infra

Terraform configurations for deploying the workload calculation system to AWS (Hybrid architecture: EC2 compose + managed RDS).

- `bootstrap/` — one-time per AWS account. Creates remote state storage and the GitHub Actions OIDC role. Uses **local** state.
- `terraform/` — the main stack. Uses **remote** state in S3.

See the implementation plan at `docs/superpowers/plans/2026-05-18-aws-deploy-hybrid.md`.
```

- [ ] **Step 4: Commit**

```bash
git add infra/.gitignore infra/README.md
git commit -m "chore: scaffold infra/ for AWS Terraform configs"
```

---

## Phase 3 — Bootstrap stack

The bootstrap configuration uses **local** state and is applied once per AWS account. It creates the tfstate bucket, DynamoDB lock table, GitHub OIDC provider, and the IAM role that GitHub Actions assumes for both deploy and destroy.

### Task 3: Bootstrap — providers and variables

**Files:**
- Create: `infra/bootstrap/versions.tf`
- Create: `infra/bootstrap/providers.tf`
- Create: `infra/bootstrap/variables.tf`

- [ ] **Step 1: Write `infra/bootstrap/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }
}
```

- [ ] **Step 2: Write `infra/bootstrap/providers.tf`**

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "workload"
      Env       = "prod"
      ManagedBy = "terraform-bootstrap"
    }
  }
}
```

- [ ] **Step 3: Write `infra/bootstrap/variables.tf`**

```hcl
variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "eu-central-1"
}

variable "github_repo" {
  description = "GitHub repository slug in 'OWNER/REPO' form. Used to scope the OIDC trust policy."
  type        = string
}

variable "project" {
  description = "Project slug used as a prefix and tag."
  type        = string
  default     = "workload"
}
```

- [ ] **Step 4: Commit**

```bash
git add infra/bootstrap/versions.tf infra/bootstrap/providers.tf infra/bootstrap/variables.tf
git commit -m "feat: bootstrap stack scaffolding"
```

### Task 4: Bootstrap — tfstate bucket and lock table

**Files:**
- Create: `infra/bootstrap/state.tf`

- [ ] **Step 1: Write `infra/bootstrap/state.tf`**

```hcl
data "aws_caller_identity" "current" {}

locals {
  tfstate_bucket = "${var.project}-tfstate-${data.aws_caller_identity.current.account_id}"
  lock_table     = "${var.project}-tfstate-lock"
}

resource "aws_s3_bucket" "tfstate" {
  bucket        = local.tfstate_bucket
  force_destroy = false

  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    id     = "expire-noncurrent"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_dynamodb_table" "tfstate_lock" {
  name         = local.lock_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/bootstrap/state.tf
git commit -m "feat: bootstrap S3 tfstate bucket and DynamoDB lock table"
```

### Task 5: Bootstrap — GitHub OIDC provider and deployer role

**Files:**
- Create: `infra/bootstrap/github-oidc.tf`

- [ ] **Step 1: Write `infra/bootstrap/github-oidc.tf`**

```hcl
# GitHub Actions OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # GitHub's certificate thumbprints. AWS recommends pinning both to handle rotation.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

# Trust policy: allow GitHub Actions on this repo to assume this role
data "aws_iam_policy_document" "github_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_deployer" {
  name                 = "${var.project}-github-deployer"
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

# Broad PoC-grade policy. For MVP, scope down to specific resources.
data "aws_iam_policy_document" "github_deployer" {
  statement {
    sid    = "AllowTerraformStateAccess"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketVersioning",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:ListBucketVersions",
    ]
    resources = [
      aws_s3_bucket.tfstate.arn,
      "${aws_s3_bucket.tfstate.arn}/*",
    ]
  }

  statement {
    sid    = "AllowStateLockAccess"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
    ]
    resources = [aws_dynamodb_table.tfstate_lock.arn]
  }

  statement {
    sid    = "AllowProjectInfraManagement"
    effect = "Allow"
    actions = [
      "ec2:*",
      "rds:*",
      "s3:*",
      "cloudfront:*",
      "ecr:*",
      "ssm:*",
      "logs:*",
      "iam:*",
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "sts:GetCallerIdentity",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deployer" {
  name   = "${var.project}-github-deployer"
  role   = aws_iam_role.github_deployer.id
  policy = data.aws_iam_policy_document.github_deployer.json
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/bootstrap/github-oidc.tf
git commit -m "feat: bootstrap GitHub OIDC provider and deployer role"
```

### Task 6: Bootstrap — outputs and README

**Files:**
- Create: `infra/bootstrap/outputs.tf`
- Create: `infra/bootstrap/README.md`

- [ ] **Step 1: Write `infra/bootstrap/outputs.tf`**

```hcl
output "tfstate_bucket" {
  description = "Name of the S3 bucket holding the main stack's Terraform state."
  value       = aws_s3_bucket.tfstate.id
}

output "tfstate_lock_table" {
  description = "Name of the DynamoDB table used for state locking."
  value       = aws_dynamodb_table.tfstate_lock.name
}

output "github_oidc_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC."
  value       = aws_iam_role.github_deployer.arn
}

output "aws_region" {
  description = "Region the bootstrap was applied in. Use this in the main stack backend config."
  value       = var.aws_region
}
```

- [ ] **Step 2: Write `infra/bootstrap/README.md`**

````markdown
# Bootstrap

One-time setup per AWS account. Uses local state.

## Apply

```bash
export AWS_PROFILE=workload
export AWS_REGION=eu-central-1
cd infra/bootstrap

# Inputs: GitHub repo slug (e.g. godeltech/workload-calculation-system)
cat > terraform.tfvars <<EOF
github_repo = "OWNER/REPO"
aws_region  = "${AWS_REGION}"
EOF

terraform init
terraform apply
```

After apply, record the outputs — they configure the main stack's backend and the GitHub Actions repo variables.

## Destroy

The destroy workflow (`destroy-aws.yml`) destroys this stack only when run with `also_destroy_bootstrap=true`. To destroy manually:

```bash
# Empty the tfstate bucket first (versioned objects + delete markers)
BUCKET=$(terraform output -raw tfstate_bucket)
aws s3api list-object-versions --bucket "$BUCKET" \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json \
  | jq -e '.Objects | length > 0' >/dev/null && \
  aws s3api delete-objects --bucket "$BUCKET" --delete "$(aws s3api list-object-versions --bucket "$BUCKET" --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json)"

aws s3api list-object-versions --bucket "$BUCKET" \
  --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json \
  | jq -e '.Objects | length > 0' >/dev/null && \
  aws s3api delete-objects --bucket "$BUCKET" --delete "$(aws s3api list-object-versions --bucket "$BUCKET" --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json)"

terraform destroy
```
````

- [ ] **Step 3: Commit**

```bash
git add infra/bootstrap/outputs.tf infra/bootstrap/README.md
git commit -m "docs: bootstrap outputs and README"
```

### Task 7: Apply bootstrap

- [ ] **Step 1: Create `terraform.tfvars` (gitignored)**

```bash
cd infra/bootstrap
cat > terraform.tfvars <<EOF
github_repo = "${GITHUB_REPO}"
aws_region  = "${AWS_REGION}"
EOF
```

- [ ] **Step 2: Init and apply**

```bash
terraform init
terraform apply
```

Expected: 8 resources to add (S3 bucket + 4 bucket-config resources, DynamoDB table, OIDC provider, IAM role, IAM role policy). Confirm with `yes`.

- [ ] **Step 3: Record outputs**

```bash
terraform output
```

Expected — values like:
```
aws_region           = "eu-central-1"
github_oidc_role_arn = "arn:aws:iam::123456789012:role/workload-github-deployer"
tfstate_bucket       = "workload-tfstate-123456789012"
tfstate_lock_table   = "workload-tfstate-lock"
```

Export these for use in subsequent tasks:
```bash
export TFSTATE_BUCKET=$(terraform output -raw tfstate_bucket)
export TFSTATE_LOCK=$(terraform output -raw tfstate_lock_table)
export GITHUB_OIDC_ROLE=$(terraform output -raw github_oidc_role_arn)
```

### Task 8: Configure GitHub repo variables

The deploy/destroy workflows read these as GitHub Actions repository variables (`vars` context).

- [ ] **Step 1: Set variables via gh CLI**

```bash
gh variable set AWS_REGION --body "${AWS_REGION}"
gh variable set AWS_OIDC_ROLE_ARN --body "${GITHUB_OIDC_ROLE}"
gh variable set TFSTATE_BUCKET --body "${TFSTATE_BUCKET}"
gh variable set TFSTATE_LOCK_TABLE --body "${TFSTATE_LOCK}"
```

If `gh` is not installed, set them in the GitHub web UI under **Settings → Secrets and variables → Actions → Variables**.

- [ ] **Step 2: Verify**

```bash
gh variable list
```

Expected: 4 variables listed.

---

## Phase 4 — Main stack scaffolding

### Task 9: Main stack — providers, backend, variables, outputs skeleton

**Files:**
- Create: `infra/terraform/versions.tf`
- Create: `infra/terraform/providers.tf`
- Create: `infra/terraform/backend.tf`
- Create: `infra/terraform/variables.tf`
- Create: `infra/terraform/outputs.tf`

- [ ] **Step 1: Write `infra/terraform/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }
}
```

- [ ] **Step 2: Write `infra/terraform/backend.tf`**

```hcl
terraform {
  backend "s3" {
    # bucket, region, dynamodb_table are supplied at `terraform init` via `-backend-config`
    key     = "workload/prod/terraform.tfstate"
    encrypt = true
  }
}
```

- [ ] **Step 3: Write `infra/terraform/providers.tf`**

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project
      Env       = var.env
      ManagedBy = "terraform"
    }
  }
}
```

- [ ] **Step 4: Write `infra/terraform/variables.tf`**

```hcl
variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "project" {
  type    = string
  default = "workload"
}

variable "env" {
  type    = string
  default = "prod"
}

variable "ec2_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "rds_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB."
  type        = number
  default     = 20
}

variable "rds_skip_final_snapshot" {
  description = "Skip the final snapshot on RDS deletion. Set true from the destroy workflow."
  type        = bool
  default     = false
}

variable "rds_deletion_protection" {
  description = "Whether to enable RDS deletion protection. Set false from the destroy workflow."
  type        = bool
  default     = true
}

variable "ecr_backend_image_tag" {
  description = "Tag for the backend image the EC2 user-data should pull. Default 'latest'."
  type        = string
  default     = "latest"
}

variable "ecr_frontend_image_tag" {
  description = "Tag for the frontend image the EC2 user-data should pull. Default 'latest'."
  type        = string
  default     = "latest"
}
```

- [ ] **Step 5: Write `infra/terraform/outputs.tf`**

```hcl
output "cloudfront_url" {
  description = "Public HTTPS URL of the deployed application."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used by invalidations."
  value       = aws_cloudfront_distribution.main.id
}

output "ec2_instance_id" {
  description = "EC2 instance ID — used by SSM Run Command for deploys."
  value       = aws_instance.app.id
}

output "ecr_backend_uri" {
  description = "ECR repository URI for the backend image."
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_uri" {
  description = "ECR repository URI for the frontend image."
  value       = aws_ecr_repository.frontend.repository_url
}
```

- [ ] **Step 6: Commit**

```bash
git add infra/terraform/versions.tf infra/terraform/backend.tf infra/terraform/providers.tf infra/terraform/variables.tf infra/terraform/outputs.tf
git commit -m "feat: main stack scaffolding"
```

### Task 10: Networking — VPC, subnets, IGW, security groups

The Hybrid EC2 security group exposes **port 80** (not 8080) — only the reverse-proxy `nginx` container listens on the host.

**Files:**
- Create: `infra/terraform/network.tf`

- [ ] **Step 1: Write `infra/terraform/network.tf`**

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

resource "aws_subnet" "public" {
  count                   = length(local.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${var.project}-public-${local.azs[count.index]}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Managed prefix list for CloudFront origin-facing IPs.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "ec2" {
  name        = "${var.project}-ec2"
  description = "Reverse-proxy nginx — inbound 80 from CloudFront only."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from CloudFront"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    description = "Allow all outbound (ECR, SSM, RDS, OS updates, Docker Hub)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-ec2-sg" }
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "Postgres — inbound 5432 from ec2-sg only."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    description = "No egress (db responses only)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["127.0.0.1/32"]
  }

  tags = { Name = "${var.project}-rds-sg" }
}
```

- [ ] **Step 2: Validate syntax**

```bash
cd infra/terraform
terraform fmt
```

(`terraform validate` requires `terraform init` against the remote backend, which is exercised end-to-end in Task 19. Defer validation until then.)

- [ ] **Step 3: Commit**

```bash
git add infra/terraform/network.tf
git commit -m "feat: VPC, subnets, IGW, security groups"
```

---

## Phase 5 — SSM parameters

### Task 11: SSM Parameter Store resources

**Files:**
- Create: `infra/terraform/ssm.tf`

Terraform creates the SSM parameters with placeholder values; the operator overwrites them out of band (Task 12). Each resource has `lifecycle.ignore_changes = [value]` so subsequent applies don't drift.

- [ ] **Step 1: Write `infra/terraform/ssm.tf`**

```hcl
locals {
  ssm_path = "/${var.project}/${var.env}"

  workload_config_keys = [
    "planning_period_months",
    "repair_productive_months",
    "repair_travel_zero_threshold",
    "repair_travel_cap",
    "pzv_minutes",
    "engineer_warning_threshold",
    "engineer_overload_threshold",
    "os_r1_visits_per_year",
    "os_r2_visits_per_year",
    "ps_r1_visits_per_year",
    "ps_r2_visits_per_year",
    "video_r1_visits_per_year",
    "video_r2_visits_per_year",
    "records_access_minutes",
    "records_monitoring_minutes",
    "records_footage_minutes",
    "records_backup_minutes",
    "records_admin_minutes",
    "minutes_per_month",
  ]
}

resource "aws_ssm_parameter" "db_password" {
  name        = "${local.ssm_path}/db_password"
  description = "RDS master password. Set out-of-band; Terraform ignores changes."
  type        = "SecureString"
  value       = "PLACEHOLDER_SET_OUT_OF_BAND"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "${local.ssm_path}/jwt_secret"
  description = "JWT signing secret. Set out-of-band; Terraform ignores changes."
  type        = "SecureString"
  value       = "PLACEHOLDER_SET_OUT_OF_BAND"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "workload_config" {
  for_each = toset(local.workload_config_keys)

  name        = "${local.ssm_path}/workload_config_${each.key}"
  description = "Workload calculation config key '${each.key}'. Set out-of-band."
  type        = "SecureString"
  value       = "PLACEHOLDER_SET_OUT_OF_BAND"

  lifecycle {
    ignore_changes = [value]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/ssm.tf
git commit -m "feat: SSM Parameter Store resources for secrets and workload config"
```

### Task 12: Seed SSM parameter values (runbook)

This is a one-time operator step, applied after the first `terraform apply` creates the parameter resources. The values are not committed and are only ever set via `aws ssm put-parameter --overwrite`. We document the commands now and execute them in Task 19.

- [ ] **Step 1: Write `infra/terraform/SECRETS.md`** (gitignored — operator notes)

````markdown
# Seeding SSM parameter values

Run these once, after the first `terraform apply` of the main stack.

```bash
export AWS_PROFILE=workload
export AWS_REGION=eu-central-1
export PROJECT=workload
export ENV=prod
PATH_PREFIX=/$PROJECT/$ENV

# Generate strong secrets
DB_PW=$(openssl rand -base64 32 | tr -d '=/+' | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '=/+')

aws ssm put-parameter --name "$PATH_PREFIX/db_password" --value "$DB_PW" --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/jwt_secret"  --value "$JWT_SECRET" --type SecureString --overwrite

# Workload config — values from docker-compose.poc.yml
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_planning_period_months"        --value "6"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_repair_productive_months"      --value "5"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_repair_travel_zero_threshold"  --value "5"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_repair_travel_cap"             --value "10"    --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_pzv_minutes"                   --value "20"    --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_engineer_warning_threshold"    --value "0.9"   --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_engineer_overload_threshold"   --value "1.0"   --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_os_r1_visits_per_year"         --value "10"    --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_os_r2_visits_per_year"         --value "2"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_ps_r1_visits_per_year"         --value "8"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_ps_r2_visits_per_year"         --value "4"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_video_r1_visits_per_year"      --value "10"    --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_video_r2_visits_per_year"      --value "2"     --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_records_access_minutes"        --value "60"    --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_records_monitoring_minutes"    --value "180"   --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_records_footage_minutes"       --value "180"   --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_records_backup_minutes"        --value "120"   --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_records_admin_minutes"         --value "60"    --type SecureString --overwrite
aws ssm put-parameter --name "$PATH_PREFIX/workload_config_minutes_per_month"             --value "166"   --type SecureString --overwrite
```
````

- [ ] **Step 2: Add SECRETS.md to gitignore**

Append to `infra/.gitignore`:
```
SECRETS.md
```

- [ ] **Step 3: Commit gitignore change**

```bash
git add infra/.gitignore
git commit -m "chore: gitignore infra/terraform/SECRETS.md"
```

---

## Phase 6 — ECR + RDS

### Task 13: ECR repositories (backend + frontend)

The Hybrid architecture needs **two** ECR repositories. Both share the same lifecycle policy: keep last 3 tagged, expire untagged after 7 days.

**Files:**
- Create: `infra/terraform/ecr.tf`

- [ ] **Step 1: Write `infra/terraform/ecr.tf`**

```hcl
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project}-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

locals {
  ecr_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 3 tagged images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 3
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy     = local.ecr_lifecycle_policy
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name
  policy     = local.ecr_lifecycle_policy
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/ecr.tf
git commit -m "feat: ECR repositories for backend and frontend images"
```

### Task 14: RDS instance

**Files:**
- Create: `infra/terraform/rds.tf`

- [ ] **Step 1: Write `infra/terraform/rds.tf`**

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db"
  subnet_ids = aws_subnet.public[*].id

  tags = { Name = "${var.project}-db-subnet-group" }
}

# Read the password set by the SSM Parameter Store seeding step.
data "aws_ssm_parameter" "db_password" {
  name            = aws_ssm_parameter.db_password.name
  with_decryption = true
}

resource "aws_db_instance" "main" {
  identifier              = "${var.project}-prod"
  engine                  = "postgres"
  engine_version          = "15.7"
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = "workload"
  username                = "postgres"
  password                = data.aws_ssm_parameter.db_password.value
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  multi_az                = false
  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  maintenance_window      = "Mon:03:00-Mon:04:00"

  skip_final_snapshot       = var.rds_skip_final_snapshot
  final_snapshot_identifier = var.rds_skip_final_snapshot ? null : "${var.project}-final-${formatdate("YYYYMMDDHHmmss", timestamp())}"
  deletion_protection       = var.rds_deletion_protection
  apply_immediately         = true

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier, # timestamp() makes this volatile
      password,                  # set via SSM; do not drift
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/rds.tf
git commit -m "feat: RDS PostgreSQL instance"
```

---

## Phase 7 — EC2 + reverse-proxy config

### Task 15: Reverse-proxy nginx config

The reverse-proxy `nginx` container reads this file (mounted at `/etc/nginx/nginx.conf:ro`). It routes `/api/*` and `/actuator/*` to the backend container; everything else to the frontend container. `X-Forwarded-Proto https` is hardcoded so Spring's `forward-headers-strategy: NATIVE` builds correct redirect URLs (the CloudFront→EC2 hop is HTTP but the external scheme is HTTPS).

**Files:**
- Create: `infra/terraform/files/nginx.conf`

- [ ] **Step 1: Write `infra/terraform/files/nginx.conf`**

```nginx
events {}
http {
  upstream backend  { server backend:8080; }
  upstream frontend { server frontend:80; }
  server {
    listen 80;
    location /api/        { proxy_pass http://backend; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto https; }
    location /actuator/   { proxy_pass http://backend; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto https; }
    location /            { proxy_pass http://frontend; }
  }
}
```

> **Note:** the same content is also inlined into `user-data.sh.tftpl` (Task 16) via a heredoc so a fresh EC2 boot produces `/opt/workload/nginx.conf` without depending on this file. We keep the standalone file in the repo for diffability and for any future MVP path that ships it via SSM `aws:downloadContent` instead of user-data.

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/files/nginx.conf
git commit -m "feat: reverse-proxy nginx config for hybrid deploy"
```

### Task 16: EC2 user-data template (3-container bootstrap)

The user-data installs Docker + Compose, logs in to ECR, fetches all 21 SSM parameters, writes `/etc/workload.env`, writes `/opt/workload/nginx.conf` and `/opt/workload/docker-compose.yml` with **three** services (nginx, frontend, backend), then runs `docker compose pull && docker compose up -d`.

JVM heap is capped at `MaxRAMPercentage=50` (tighter than Option A's 60%) because the t3.micro now hosts three containers.

**Files:**
- Create: `infra/terraform/user-data.sh.tftpl`

- [ ] **Step 1: Write `infra/terraform/user-data.sh.tftpl`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Logs go to /var/log/cloud-init-output.log; tail there via SSM Session Manager.
exec > >(tee -a /var/log/workload-bootstrap.log) 2>&1
echo "[workload-bootstrap] starting at $(date -u)"

dnf update -y
dnf install -y docker jq

systemctl enable --now docker
usermod -aG docker ec2-user

# Docker compose plugin (Amazon Linux 2023 ships the docker engine; we add the v2 CLI plugin)
DOCKER_CONFIG=/usr/local/lib/docker
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# ECR login (both repos live in the same registry account)
aws --region ${aws_region} ecr get-login-password \
  | docker login --username AWS --password-stdin ${ecr_registry}

# Pull SSM parameters into /etc/workload.env
mkdir -p /opt/workload /etc
echo "[workload-bootstrap] fetching SSM parameters"
PARAMS=$(aws ssm get-parameters-by-path \
  --region ${aws_region} \
  --path "${ssm_path}/" \
  --with-decryption \
  --recursive \
  --query 'Parameters[].{Name:Name,Value:Value}' \
  --output json)

> /etc/workload.env
echo "$PARAMS" | jq -r '.[] | "\(.Name|split("/")|last|ascii_upcase)=\(.Value)"' >> /etc/workload.env

# Promote DB_PASSWORD → SPRING_DATASOURCE_PASSWORD so Spring picks it up directly
DB_PW=$(grep '^DB_PASSWORD=' /etc/workload.env | cut -d= -f2-)
cat >> /etc/workload.env <<EOF
SPRING_PROFILES_ACTIVE=aws
SPRING_DATASOURCE_URL=jdbc:postgresql://${rds_endpoint}/workload
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=$DB_PW
JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=50 -XX:+UseSerialGC
EOF

chmod 600 /etc/workload.env
chown root:root /etc/workload.env

# Reverse-proxy nginx config (mounted into the nginx container)
cat > /opt/workload/nginx.conf <<'NGINX'
events {}
http {
  upstream backend  { server backend:8080; }
  upstream frontend { server frontend:80; }
  server {
    listen 80;
    location /api/        { proxy_pass http://backend; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto https; }
    location /actuator/   { proxy_pass http://backend; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto https; }
    location /            { proxy_pass http://frontend; }
  }
}
NGINX

# docker compose with three services: nginx (host:80) → frontend / backend
cat > /opt/workload/docker-compose.yml <<COMPOSE
services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - /opt/workload/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend

  frontend:
    image: ${ecr_registry}/${ecr_frontend_repository}:${ecr_frontend_image_tag}
    restart: unless-stopped
    expose:
      - "80"

  backend:
    image: ${ecr_registry}/${ecr_backend_repository}:${ecr_backend_image_tag}
    restart: unless-stopped
    expose:
      - "8080"
    env_file:
      - /etc/workload.env
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
COMPOSE

cd /opt/workload
docker compose pull
docker compose up -d
echo "[workload-bootstrap] finished at $(date -u)"
```

> Note on env_file: docker compose reads `env_file` line-by-line and uppercases keys verbatim. The SSM parameter naming convention (`db_password`, `workload_config_planning_period_months`, etc.) becomes `DB_PASSWORD`, `WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS`, which matches what `application.yml` expects. Only the backend container reads this env file; the `nginx` and `frontend` containers don't need any secrets.

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/user-data.sh.tftpl
git commit -m "feat: EC2 user-data template for 3-container bootstrap"
```

### Task 17: EC2 instance, IAM role, instance profile, EIP

**Files:**
- Create: `infra/terraform/ec2.tf`

- [ ] **Step 1: Write `infra/terraform/ec2.tf`**

```hcl
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "ec2" {
  name = "${var.project}-ec2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_ecr" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "ec2_ssm_params" {
  name = "${var.project}-ec2-ssm-params"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
      ]
      Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_path}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2"
  role = aws_iam_role.ec2.name
}

locals {
  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    aws_region              = var.aws_region
    ssm_path                = local.ssm_path
    ecr_registry            = split("/", aws_ecr_repository.backend.repository_url)[0]
    ecr_backend_repository  = aws_ecr_repository.backend.name
    ecr_frontend_repository = aws_ecr_repository.frontend.name
    ecr_backend_image_tag   = var.ecr_backend_image_tag
    ecr_frontend_image_tag  = var.ecr_frontend_image_tag
    rds_endpoint            = aws_db_instance.main.endpoint
  })
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = local.user_data

  # Replace instance when user_data changes (config drift).
  user_data_replace_on_change = true

  tags = { Name = "${var.project}-app" }
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = { Name = "${var.project}-app-eip" }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/ec2.tf
git commit -m "feat: EC2 instance + IAM + EIP for hybrid deploy"
```

---

## Phase 8 — CloudFront (single origin)

### Task 18: CloudFront distribution

The Hybrid distribution has **one** origin (the EC2 EIP DNS on port 80). The reverse-proxy `nginx` container on the instance routes by path internally, so CloudFront doesn't need separate behaviors per origin — but it still distinguishes `/api/*` and `/actuator/*` (cache-disabled, all methods) from the default `*` (cache-optimized GET/HEAD).

There are **no custom error responses** — the frontend `nginx` container serves `index.html` for unknown paths via its baked-in `try_files $uri /index.html` rule.

**Files:**
- Create: `infra/terraform/cloudfront.tf`

- [ ] **Step 1: Write `infra/terraform/cloudfront.tf`**

```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.project} prod (hybrid)"
  price_class         = "PriceClass_100"

  # Single origin: EC2 EIP DNS over HTTP/80 (reverse-proxy nginx listens there).
  origin {
    origin_id   = "ec2-origin"
    domain_name = aws_eip.app.public_dns

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behaviour: cached frontend assets via the EC2 origin (frontend nginx).
  default_cache_behavior {
    target_origin_id       = "ec2-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS managed: CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # /api/* → cache-disabled, all methods, all headers/cookies/query strings forwarded.
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ec2-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = false

    # AWS managed: CachingDisabled
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    # AWS managed: AllViewer
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  ordered_cache_behavior {
    path_pattern           = "/actuator/*"
    target_origin_id       = "ec2-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = false

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  # No custom_error_response — the frontend nginx container handles SPA fallback.

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/terraform/cloudfront.tf
git commit -m "feat: CloudFront distribution with single EC2 origin"
```

---

## Phase 9 — First apply and smoke test

The first apply must happen with both ECR images already present (the EC2 user-data pulls them on first boot). The recommended order:

1. Apply the main stack — the EC2 user-data fails to pull images on first boot (ECR is empty).
2. Seed SSM parameter values.
3. Build and push both Docker images.
4. `terraform taint aws_instance.app && terraform apply` — the replacement instance pulls real images and reads real SSM values on first boot.

### Task 19: First `terraform apply`

- [ ] **Step 1: Initialise backend**

```bash
cd infra/terraform
terraform init \
  -backend-config="bucket=${TFSTATE_BUCKET}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${TFSTATE_LOCK}"
```

Expected: `Terraform has been successfully initialised!`

- [ ] **Step 2: Validate**

```bash
terraform fmt
terraform validate
```

Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Plan**

```bash
terraform plan -out=tfplan
```

Expected: roughly **40 resources to add** (VPC + 2 subnets + 2 SGs + IGW + 2 route assocs + route table, 21 SSM parameters, 2 ECR repos + 2 lifecycle policies, RDS subnet group + instance, EC2 + EIP + IAM role + 3 attachments + instance profile, CloudFront distribution).

- [ ] **Step 4: Apply**

```bash
terraform apply tfplan
```

Expected: apply succeeds. RDS creation takes ~5 min, CloudFront ~3–5 min. The EC2 user-data fails to pull images on first boot — that is expected; we redeploy below.

- [ ] **Step 5: Seed SSM parameter values**

Open `infra/terraform/SECRETS.md` (created in Task 12) and run every command in it. Verify with:

```bash
aws ssm get-parameters-by-path --path /workload/prod/ --recursive --query 'Parameters[].Name' --output text | wc -w
```

Expected: `21` (db_password + jwt_secret + 19 workload_config_*).

- [ ] **Step 6: Build and push the first backend image**

```bash
cd ../../backend
mvn -B -DskipTests package -q

BE_ECR=$(cd ../infra/terraform && terraform output -raw ecr_backend_uri)
REGISTRY=$(echo "$BE_ECR" | cut -d/ -f1)
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker build -t "${BE_ECR}:latest" .
docker push "${BE_ECR}:latest"
```

Expected: image pushed. Verify:
```bash
aws ecr list-images --repository-name workload-backend
```

- [ ] **Step 7: Build and push the first frontend image**

The existing `frontend/Dockerfile` is a multi-stage build (Node build stage → nginx runtime stage). It is reused as-is — no edits.

```bash
cd ../frontend

FE_ECR=$(cd ../infra/terraform && terraform output -raw ecr_frontend_uri)
# Already logged in to the same registry from the previous step.

docker build -t "${FE_ECR}:latest" .
docker push "${FE_ECR}:latest"
```

Expected: image pushed. Verify:
```bash
aws ecr list-images --repository-name workload-frontend
```

- [ ] **Step 8: Replace the EC2 instance so user-data re-runs with real SSM + images**

```bash
cd ../infra/terraform
terraform taint aws_instance.app
terraform apply -auto-approve
```

Expected: 1 to replace, 0 to add. The new instance boots, user-data fetches the 21 SSM parameters, pulls both images, and starts the 3-container stack.

- [ ] **Step 9: Smoke-test the health endpoint**

```bash
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
# CloudFront distribution can take a few minutes to fully propagate.
for i in {1..30}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${CLOUDFRONT_URL}/actuator/health" || echo "000")
  echo "Health: $CODE"
  [ "$CODE" = "200" ] && break
  sleep 10
done
```

Expected: `Health: 200` within ~5 minutes. Then verify the response body:

```bash
curl -fsSL "${CLOUDFRONT_URL}/actuator/health"
```

Expected: `{"status":"UP"}`.

- [ ] **Step 10: Browser smoke test**

Open `${CLOUDFRONT_URL}/` in a browser. Expected: the React login page loads. Logging in with a seeded user reaches the dashboard. The browser dev-tools Network tab shows requests to `/api/v1/...` returning JSON.

- [ ] **Step 11: Verify the three-container stack on the instance**

```bash
EC2_ID=$(terraform output -raw ec2_instance_id)

CMD_ID=$(aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=instanceids,Values=${EC2_ID}" \
  --parameters 'commands=["docker compose -f /opt/workload/docker-compose.yml ps"]' \
  --query 'Command.CommandId' --output text)

sleep 5

aws ssm list-command-invocations --command-id "$CMD_ID" --details \
  --query 'CommandInvocations[0].CommandPlugins[0].Output' --output text
```

Expected: three rows — `nginx`, `frontend`, `backend` — each `running`.

- [ ] **Step 12: Commit any final fixes** (none expected if everything was committed before)

---

## Phase 10 — GitHub Actions workflows

### Task 20: Deploy workflow

The Hybrid deploy workflow builds and pushes **two** images (backend + frontend), then triggers `docker compose pull && docker compose up -d` on the instance, then invalidates CloudFront.

**Files:**
- Create: `.github/workflows/deploy-aws.yml`

- [ ] **Step 1: Write `.github/workflows/deploy-aws.yml`**

```yaml
name: Deploy to AWS (manual)

on:
  workflow_dispatch:
    inputs:
      ref:
        description: "Git ref to deploy"
        required: true
        default: "main"

concurrency:
  group: aws-prod
  cancel-in-progress: false

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      AWS_REGION: ${{ vars.AWS_REGION }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_OIDC_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.6

      - name: Resolve outputs from existing state
        id: tf
        working-directory: infra/terraform
        run: |
          terraform init \
            -backend-config="bucket=${{ vars.TFSTATE_BUCKET }}" \
            -backend-config="region=${{ vars.AWS_REGION }}" \
            -backend-config="dynamodb_table=${{ vars.TFSTATE_LOCK_TABLE }}"
          {
            echo "be_ecr=$(terraform output -raw ecr_backend_uri)"
            echo "fe_ecr=$(terraform output -raw ecr_frontend_uri)"
            echo "ec2_id=$(terraform output -raw ec2_instance_id)"
            echo "cf_id=$(terraform output -raw cloudfront_distribution_id)"
            echo "cf_url=$(terraform output -raw cloudfront_url)"
          } >> "$GITHUB_OUTPUT"

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
          cache: maven

      - name: Build backend jar
        run: mvn -B -DskipTests package -q
        working-directory: backend

      - name: Login to ECR
        run: |
          REGISTRY="$(echo "${{ steps.tf.outputs.be_ecr }}" | cut -d/ -f1)"
          aws ecr get-login-password --region "${AWS_REGION}" \
            | docker login --username AWS --password-stdin "$REGISTRY"

      - name: Build & push backend image
        working-directory: backend
        run: |
          BE_ECR="${{ steps.tf.outputs.be_ecr }}"
          docker build -t "${BE_ECR}:${{ github.sha }}" -t "${BE_ECR}:latest" .
          docker push "${BE_ECR}:${{ github.sha }}"
          docker push "${BE_ECR}:latest"

      - name: Build & push frontend image
        working-directory: frontend
        run: |
          FE_ECR="${{ steps.tf.outputs.fe_ecr }}"
          docker build -t "${FE_ECR}:${{ github.sha }}" -t "${FE_ECR}:latest" .
          docker push "${FE_ECR}:${{ github.sha }}"
          docker push "${FE_ECR}:latest"

      - name: Trigger rollout via SSM
        id: rollout
        run: |
          CMD_ID=$(aws ssm send-command \
            --document-name "AWS-RunShellScript" \
            --targets "Key=instanceids,Values=${{ steps.tf.outputs.ec2_id }}" \
            --parameters 'commands=["cd /opt/workload && docker compose pull && docker compose up -d"]' \
            --query Command.CommandId --output text)
          echo "command_id=$CMD_ID" >> "$GITHUB_OUTPUT"

          # Wait for the command to finish (max 5 min)
          for i in {1..30}; do
            STATUS=$(aws ssm list-command-invocations --command-id "$CMD_ID" \
              --details --query 'CommandInvocations[0].Status' --output text)
            echo "SSM status: $STATUS"
            case "$STATUS" in
              Success) exit 0 ;;
              Failed|Cancelled|TimedOut) exit 1 ;;
            esac
            sleep 10
          done
          echo "SSM Run Command did not finish in 5 minutes" >&2
          exit 1

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id "${{ steps.tf.outputs.cf_id }}" \
            --paths "/*"

      - name: Smoke test health endpoint
        run: |
          CF_URL="${{ steps.tf.outputs.cf_url }}"
          for i in {1..30}; do
            CODE=$(curl -s -o /dev/null -w "%{http_code}" "${CF_URL}/actuator/health" || echo "000")
            echo "Health: $CODE"
            if [ "$CODE" = "200" ]; then exit 0; fi
            sleep 10
          done
          echo "Health check failed after 5 minutes" >&2
          exit 1
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-aws.yml
git commit -m "feat: GitHub Actions deploy workflow (manual, hybrid)"
```

### Task 21: Destroy workflow

The Hybrid destroy workflow has no S3 frontend bucket to empty. It force-deletes images in **both** ECR repos, runs the main-stack `terraform destroy` with overrides, sweeps stragglers, and optionally tears down bootstrap.

**Files:**
- Create: `.github/workflows/destroy-aws.yml`

- [ ] **Step 1: Write `.github/workflows/destroy-aws.yml`**

```yaml
name: Destroy AWS infrastructure (manual)

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: "Type 'destroy-prod' to confirm. Cannot be undone."
        required: true
        default: ""
      also_destroy_bootstrap:
        description: "Also destroy the tfstate bucket and OIDC role. After this, billing is $0."
        required: true
        type: boolean
        default: false

permissions:
  id-token: write
  contents: read

jobs:
  destroy:
    runs-on: ubuntu-latest
    env:
      AWS_REGION: ${{ vars.AWS_REGION }}
    steps:
      - name: Guard — fail unless confirm == 'destroy-prod'
        run: |
          if [ "${{ inputs.confirm }}" != "destroy-prod" ]; then
            echo "::error::Confirmation failed. You must type 'destroy-prod' exactly."
            exit 1
          fi

      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_OIDC_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.6

      - name: Init main stack
        working-directory: infra/terraform
        run: |
          terraform init \
            -backend-config="bucket=${{ vars.TFSTATE_BUCKET }}" \
            -backend-config="region=${{ vars.AWS_REGION }}" \
            -backend-config="dynamodb_table=${{ vars.TFSTATE_LOCK_TABLE }}"

      - name: Force-delete ECR images (backend + frontend)
        run: |
          for repo in workload-backend workload-frontend; do
            IDS=$(aws ecr list-images --repository-name "$repo" \
              --query 'imageIds[*]' --output json 2>/dev/null || echo "[]")
            if [ "$(echo "$IDS" | jq 'length // 0')" -gt 0 ]; then
              aws ecr batch-delete-image --repository-name "$repo" --image-ids "$IDS" || true
            fi
          done

      - name: Terraform destroy main stack
        working-directory: infra/terraform
        run: |
          terraform destroy -auto-approve \
            -var="rds_skip_final_snapshot=true" \
            -var="rds_deletion_protection=false"

      - name: Sweep stragglers
        run: |
          # Orphan RDS final snapshots
          for snap in $(aws rds describe-db-snapshots --snapshot-type manual \
              --query "DBSnapshots[?starts_with(DBSnapshotIdentifier, 'workload-final-')].DBSnapshotIdentifier" \
              --output text); do
            aws rds delete-db-snapshot --db-snapshot-identifier "$snap" || true
          done

          # CloudWatch log groups
          for lg in $(aws logs describe-log-groups --log-group-name-prefix /aws/workload \
              --query 'logGroups[].logGroupName' --output text); do
            aws logs delete-log-group --log-group-name "$lg" || true
          done

          # Orphan Elastic IPs tagged Project=workload
          for alloc in $(aws ec2 describe-addresses \
              --filters "Name=tag:Project,Values=workload" \
              --query 'Addresses[?AssociationId==`null`].AllocationId' --output text); do
            aws ec2 release-address --allocation-id "$alloc" || true
          done

      - name: Destroy bootstrap (conditional)
        if: ${{ inputs.also_destroy_bootstrap == true }}
        working-directory: infra/bootstrap
        run: |
          # Empty the tfstate bucket first
          BUCKET="${{ vars.TFSTATE_BUCKET }}"

          VERSIONS=$(aws s3api list-object-versions --bucket "$BUCKET" \
            --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json)
          if [ "$(echo "$VERSIONS" | jq '.Objects | length // 0')" -gt 0 ]; then
            aws s3api delete-objects --bucket "$BUCKET" --delete "$VERSIONS"
          fi

          MARKERS=$(aws s3api list-object-versions --bucket "$BUCKET" \
            --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json)
          if [ "$(echo "$MARKERS" | jq '.Objects | length // 0')" -gt 0 ]; then
            aws s3api delete-objects --bucket "$BUCKET" --delete "$MARKERS"
          fi

          # Bootstrap uses local state; the operator must have uploaded it after first apply.
          cat > terraform.tfvars <<EOF
          github_repo = "${{ github.repository }}"
          aws_region  = "${{ vars.AWS_REGION }}"
          EOF

          aws s3 cp "s3://${BUCKET}/bootstrap/terraform.tfstate" terraform.tfstate || \
            echo "::warning::No bootstrap state in S3; bootstrap destroy will fail. Operator must run 'terraform destroy' locally."

          if [ -f terraform.tfstate ]; then
            terraform init
            terraform destroy -auto-approve
          fi

      - name: Summary
        if: always()
        run: |
          echo "## Destroy summary" >> "$GITHUB_STEP_SUMMARY"
          echo "- Main stack destroyed: yes" >> "$GITHUB_STEP_SUMMARY"
          echo "- ECR images deleted (backend + frontend): yes" >> "$GITHUB_STEP_SUMMARY"
          echo "- RDS final snapshots: deleted" >> "$GITHUB_STEP_SUMMARY"
          if [ "${{ inputs.also_destroy_bootstrap }}" = "true" ]; then
            echo "- Bootstrap destroyed: attempted (see logs)" >> "$GITHUB_STEP_SUMMARY"
            echo "- After this run: AWS Billing should read \$0/mo." >> "$GITHUB_STEP_SUMMARY"
          else
            echo "- Bootstrap retained: tfstate bucket + DynamoDB + OIDC role remain (~\$0/mo)." >> "$GITHUB_STEP_SUMMARY"
          fi
```

> Note on bootstrap state in CI: bootstrap uses **local** state, so the destroy workflow needs that state available. The operator uploads `terraform.tfstate` to `s3://${TFSTATE_BUCKET}/bootstrap/terraform.tfstate` once after every bootstrap apply. The workflow pulls it down before destroying. Task 22 handles this.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/destroy-aws.yml
git commit -m "feat: GitHub Actions destroy workflow (manual, full cleanup)"
```

### Task 22: Upload bootstrap state to S3 (for destroy workflow)

- [ ] **Step 1: Upload bootstrap state**

```bash
cd infra/bootstrap
aws s3 cp terraform.tfstate "s3://${TFSTATE_BUCKET}/bootstrap/terraform.tfstate"
```

This is a manual one-time step. The destroy workflow's `also_destroy_bootstrap=true` path reads from this S3 key.

If the operator re-applies the bootstrap stack (rare), they must re-upload.

- [ ] **Step 2: Note the requirement in `infra/bootstrap/README.md`**

Append the following section to `infra/bootstrap/README.md`:

````markdown
## After every apply: upload state to S3

The destroy workflow's `also_destroy_bootstrap=true` path reads bootstrap state from
`s3://<tfstate-bucket>/bootstrap/terraform.tfstate`. After every `terraform apply`
in this directory, run:

```bash
aws s3 cp terraform.tfstate "s3://$(terraform output -raw tfstate_bucket)/bootstrap/terraform.tfstate"
```
````

- [ ] **Step 3: Commit**

```bash
git add infra/bootstrap/README.md
git commit -m "docs: bootstrap — upload state to S3 for destroy workflow"
```

---

## Phase 11 — End-to-end verification

### Task 23: Verify deploy workflow

- [ ] **Step 1: Push the branch and dispatch the workflow**

```bash
git push -u origin HEAD
gh workflow run deploy-aws.yml -f ref=$(git rev-parse --abbrev-ref HEAD)
```

- [ ] **Step 2: Watch the run**

```bash
gh run watch
```

Expected: all steps green, total ~8–12 min (Docker builds for both images dominate).

- [ ] **Step 3: Smoke test in browser**

Open the CloudFront URL in a browser. Log in. Reach the dashboard. Verify data renders.

### Task 24: Verify destroy guard

- [ ] **Step 1: Dispatch destroy with wrong confirm**

```bash
gh workflow run destroy-aws.yml -f confirm=NO -f also_destroy_bootstrap=false
gh run watch
```

Expected: first step ("Guard") fails with `Confirmation failed.` No AWS calls made.

### Task 25: Verify partial destroy (main only)

- [ ] **Step 1: Dispatch with `also_destroy_bootstrap=false`**

```bash
gh workflow run destroy-aws.yml -f confirm=destroy-prod -f also_destroy_bootstrap=false
gh run watch
```

Expected: ~8–12 min. Main stack destroyed; bootstrap retained.

- [ ] **Step 2: Verify**

```bash
aws cloudfront list-distributions --query 'DistributionList.Items[?contains(Comment, `workload`)].Id'
# Expected: empty []
aws ec2 describe-instances \
  --filters "Name=tag:Project,Values=workload" "Name=instance-state-name,Values=running,stopped" \
  --query 'Reservations[].Instances[].InstanceId'
# Expected: []
aws rds describe-db-instances --query 'DBInstances[?DBInstanceIdentifier==`workload-prod`].DBInstanceIdentifier'
# Expected: empty []
aws ecr describe-repositories --query 'repositories[?starts_with(repositoryName, `workload-`)].repositoryName'
# Expected: []
aws s3 ls | grep workload-tfstate
# Expected: still present (bootstrap retained)
```

### Task 26: Re-deploy after partial destroy

- [ ] **Step 1: Re-apply main stack**

```bash
cd infra/terraform
terraform init \
  -backend-config="bucket=${TFSTATE_BUCKET}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${TFSTATE_LOCK}"
terraform apply
```

Expected: all main-stack resources re-created. The OIDC role and tfstate bucket still exist from the retained bootstrap. The first EC2 boot will again find empty ECR repos.

- [ ] **Step 2: Re-seed SSM, rebuild & push both images, taint EC2, smoke-test**

Repeat Task 19 steps 5–11 (seed SSM, build & push backend, build & push frontend, taint EC2, smoke test, verify 3 containers).

### Task 27: Verify full destroy ($0 ongoing)

- [ ] **Step 1: Dispatch with `also_destroy_bootstrap=true`**

```bash
gh workflow run destroy-aws.yml -f confirm=destroy-prod -f also_destroy_bootstrap=true
gh run watch
```

Expected: ~10–15 min. Everything destroyed.

- [ ] **Step 2: Verify**

```bash
aws s3 ls
# Expected: no workload-* buckets
aws iam list-roles --query 'Roles[?starts_with(RoleName, `workload-`)].RoleName' --output text
# Expected: empty
aws iam list-open-id-connect-providers
# Expected: no token.actions.githubusercontent.com (unless other projects use it)
aws dynamodb list-tables --query 'TableNames[?starts_with(@, `workload-`)]' --output text
# Expected: empty
```

- [ ] **Step 3: Check the AWS Billing dashboard the next day**

Open AWS Billing → Bills. The workload-* line items should drop to $0 for the destroy day onwards.

---

## Troubleshooting (3-container debugging)

When the smoke test fails or a deploy step looks fine but the app does not respond, the issue is almost always inside the 3-container stack on the EC2 instance. Open an SSM Session Manager session to the instance:

```bash
EC2_ID=$(cd infra/terraform && terraform output -raw ec2_instance_id)
aws ssm start-session --target "$EC2_ID"
```

Then on the instance:

### Verify all three containers are up

```bash
docker compose -f /opt/workload/docker-compose.yml ps
```

Expected: three rows — `nginx`, `frontend`, `backend` — each `running`. If a container is `restarting` or absent, read its logs.

### Per-container logs

```bash
# Reverse proxy — request routing
docker logs --tail=200 -f $(docker ps -qf "name=nginx$")

# Frontend nginx + React SPA
docker logs --tail=200 -f $(docker ps -qf "name=frontend$")

# Spring Boot backend
docker logs --tail=200 -f $(docker ps -qf "name=backend$")
```

Common patterns:

| Symptom in logs | Likely cause | Fix |
|---|---|---|
| `nginx: [emerg] host not found in upstream "backend"` | The `backend` service crashed on startup; the reverse-proxy nginx is up but its upstream is missing | Check `docker logs backend` for the actual Spring failure (DB password, JWT secret missing) |
| `backend` logs `org.postgresql.util.PSQLException: FATAL: password authentication failed` | `SPRING_DATASOURCE_PASSWORD` does not match RDS master password | Re-run the SSM seeding for `db_password`, then `aws ssm send-command ... 'docker compose up -d'`. If RDS has the old password, reset it via AWS Console |
| `backend` logs `Connection timed out` against RDS endpoint | Security group misconfig — RDS not reachable from EC2 SG | Check `aws_security_group.rds` ingress allows `aws_security_group.ec2` |
| `frontend` logs `nginx: emerg: open() "/usr/share/nginx/html/index.html" failed` | Frontend image build failed; `dist/` not copied | Rebuild `frontend/Dockerfile` locally to confirm it works |
| Reverse-proxy `nginx` returns 502 on `/api/*` | Backend container is up but not yet ready (Spring still starting) | Wait 30–60 s and retry; the healthcheck on `backend` marks ready only after `/actuator/health` returns |
| Reverse-proxy `nginx` returns 404 on `/` | Wrong upstream — frontend container not listening on port 80 | `docker exec` into frontend and `wget -qO- http://localhost/` to verify |

### Verify the env file written by user-data

```bash
sudo cat /etc/workload.env
```

Expected: 21 uppercase keys (DB_PASSWORD, JWT_SECRET, WORKLOAD_CONFIG_*) plus the four extras (`SPRING_PROFILES_ACTIVE`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JAVA_TOOL_OPTIONS`). If the file is short or missing entries, the SSM fetch in user-data failed — check the bootstrap log:

```bash
sudo tail -200 /var/log/workload-bootstrap.log
```

### Verify the reverse-proxy nginx config

```bash
sudo cat /opt/workload/nginx.conf
docker exec $(docker ps -qf "name=nginx$") nginx -t
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`. If `nginx -t` fails, the config was corrupted during user-data templating — re-render by tainting the instance.

### Verify backend can reach RDS from inside the backend container

```bash
docker exec -it $(docker ps -qf "name=backend$") sh -c \
  'wget -qO- http://localhost:8080/actuator/health'
```

Expected: `{"status":"UP"}`. If the backend itself is healthy but the reverse-proxy returns 502, the issue is the `nginx` container's view of the backend (DNS / network — confirm the three services share the default compose network).

### Memory pressure

```bash
free -m
docker stats --no-stream
```

If `MemAvailable` is near zero, the t3.micro is OOM-pressured. The spec lists a 1 GB swap file as the documented recovery. Append to `user-data.sh.tftpl` (and then `terraform taint aws_instance.app && terraform apply` to re-render):

```bash
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Final commit and PR

- [ ] **Step 1: Confirm clean tree**

```bash
git status
```

Expected: clean working tree on the deploy branch.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "feat: AWS deploy (Hybrid — EC2 compose + RDS)" --body "$(cat <<'EOF'
## Summary
- Adds `infra/bootstrap/` and `infra/terraform/` for a Free-Tier AWS deployment.
- Single EC2 t3.micro runs `docker compose` with three containers: reverse-proxy nginx, frontend (nginx + React build), backend (Spring Boot).
- Postgres on RDS db.t3.micro. CloudFront fronts the EC2 EIP with a single origin.
- Manual deploy + destroy workflows. Destroy is full-cleanup to $0/mo when `also_destroy_bootstrap=true`.

## Test plan
- [x] Bootstrap applied locally; outputs recorded as GitHub repo variables.
- [x] Main stack `terraform apply` succeeds from a clean account.
- [x] `curl <cloudfront>/actuator/health` returns 200.
- [x] `docker compose ps` on the instance shows three healthy containers (nginx, frontend, backend).
- [x] Browser smoke test: login + dashboard renders server data.
- [x] `deploy-aws.yml` dispatched manually — succeeds end-to-end (builds + pushes both images, rolls out, invalidates CF).
- [x] `destroy-aws.yml` with wrong confirm fails before any AWS call.
- [x] `destroy-aws.yml` with `also_destroy_bootstrap=false` tears down main stack; bootstrap retained.
- [x] `destroy-aws.yml` with `also_destroy_bootstrap=true` brings AWS Billing to $0.
EOF
)"
```

---

## Acceptance criteria recap

A reviewer running this plan against a clean AWS account must observe:

1. `cd infra/bootstrap && terraform init && terraform apply` creates the state bucket + lock table + OIDC provider + deployer role.
2. The documented `aws ssm put-parameter` commands seed all 21 SSM parameters.
3. `cd ../terraform && terraform init && terraform apply` creates the entire main stack without manual intervention.
4. `curl -fsSL https://<cloudfront>/actuator/health` returns HTTP 200 within 5 minutes of the deploy completing.
5. The CloudFront URL loads the React app; login and a server-data page work.
6. `docker compose ps` on the EC2 instance (via SSM Session Manager) shows three healthy containers: `nginx`, `frontend`, `backend`.
7. Manually dispatching `deploy-aws.yml` succeeds end-to-end; new code is live afterwards.
8. Manually dispatching `destroy-aws.yml` with `confirm=destroy-prod, also_destroy_bootstrap=false` tears down all `infra/terraform/`-managed resources plus ECR images (both repos), RDS snapshots, and CloudWatch log groups. tfstate bucket, lock table, and OIDC role retained.
9. Manually dispatching `destroy-aws.yml` with `confirm=destroy-prod, also_destroy_bootstrap=true` additionally tears down `infra/bootstrap/`. After the workflow succeeds, AWS Billing shows $0/mo ongoing charges.
10. Dispatching `destroy-aws.yml` with the wrong (or empty) `confirm` value fails before any AWS API call is made.

---

## Resource summary

After a successful apply:

| Component | Count | Free-Tier? |
|---|---|---|
| VPC + subnets + IGW + SGs + route table + associations | ~9 | Yes |
| EC2 t3.micro | 1 | 750h/mo free |
| Elastic IP (attached) | 1 | Free while attached |
| RDS db.t3.micro | 1 | 750h/mo free |
| RDS subnet group | 1 | Free |
| ECR repositories (backend + frontend) + 2 lifecycle policies | 4 | 500 MB free (12 mo) |
| CloudFront distribution | 1 | 1 TB egress free |
| SSM parameters (SecureString) | 21 | Free (Standard) |
| EC2 IAM role + profile + 3 policy attachments | 5 | Free |
| **Total main-stack resources (logical groups)** | **~18** | |

Bootstrap stack adds 8 resources (tfstate bucket + 4 config + DynamoDB + OIDC + IAM role + policy).

Total monthly cost: **$0 during Free Tier**, **~$25–35 after** (RDS dominates either way). The Hybrid trades 7 fewer resources vs Option A for higher local-vs-prod parity — same `docker compose` topology, just swap the DB.
