# AWS Deploy — Option A (Split) Design

**Status:** Draft for review
**Date:** 2026-05-18
**Author:** brainstormed with the user

## Goal

Deploy the workload calculation system to AWS using Terraform, fitting inside the AWS Free Tier (12-month, single account, single region). Architecture: backend container on a single EC2 instance, Postgres on RDS, frontend static assets on S3 served by CloudFront. End-to-end HTTPS via a single CloudFront distribution with two origins. Deployments are automated via GitHub Actions.

## Non-goals

- Multi-AZ, autoscaling, ALB, WAF — deferred to MVP.
- Datadog / CloudWatch dashboards / alerting — deferred to MVP.
- Multiple environments (dev/staging/prod) — only `prod`.
- Custom domain + Route 53 — using default AWS DNS.
- Blue/green or canary deploys.
- Log aggregation beyond Docker logs on the instance.

## Architecture

```
                 ┌───────────────────────────────────────┐
                 │       CloudFront (HTTPS, free)        │
                 │   d2xxxxxx.cloudfront.net             │
                 │                                       │
                 │   /api/*, /actuator/*  →  EC2 origin  │
                 │   everything else      →  S3 origin   │
                 └──────────┬──────────────────┬─────────┘
                            │                  │
                            ▼                  ▼
              ┌───────────────────────┐  ┌────────────────────┐
              │ EC2 t3.micro          │  │ S3 (private)       │
              │ docker compose:       │  │ React build assets │
              │   backend (ECR pull)  │  │ accessed via OAC   │
              └──────────┬────────────┘  └────────────────────┘
                         │ VPC internal (5432)
                         ▼
              ┌───────────────────────┐
              │ RDS PostgreSQL 15     │
              │ db.t3.micro single-AZ │
              └───────────────────────┘
```

## Components

### Networking

- 1× VPC `10.0.0.0/16`
- 2× public subnets in different AZs (`10.0.0.0/24`, `10.0.1.0/24`) — RDS subnet group requires 2 AZs even for single-AZ instances
- 1× Internet Gateway, default route via IGW
- No NAT Gateway (cost)
- Security groups:
  - `ec2-sg`: inbound `8080/tcp` from CloudFront managed prefix list (`com.amazonaws.global.cloudfront.origin-facing`); inbound nothing else; outbound all
  - `rds-sg`: inbound `5432/tcp` from `ec2-sg`; outbound none
- No bastion / no inbound SSH — admin via SSM Session Manager

### Compute (EC2)

- 1× EC2 `t3.micro`, Amazon Linux 2023, in a public subnet
- 1× Elastic IP attached
- IAM instance profile granting:
  - `AmazonSSMManagedInstanceCore` (Session Manager + Run Command)
  - `AmazonEC2ContainerRegistryReadOnly` (pull from ECR)
  - Custom policy: `ssm:GetParameter` / `ssm:GetParametersByPath` on `/workload/prod/*`
- User-data (cloud-init):
  1. Install Docker + Docker Compose plugin
  2. Login to ECR (`aws ecr get-login-password ...`)
  3. Fetch SSM parameters under `/workload/prod/` → write `/etc/workload.env`
  4. Write `/opt/workload/docker-compose.yml` (single backend service pointing at the RDS endpoint, env_file `/etc/workload.env`)
  5. `systemctl enable docker; docker compose up -d`
- JVM tuning: `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=60 -XX:+UseSerialGC` (single backend on 1 GB)

### Database (RDS)

- 1× RDS instance: `db.t3.micro`, PostgreSQL 15, single-AZ
- 20 GB gp3 storage, storage-encrypted (KMS aws/rds)
- 7-day automated backups, daily 02:00 UTC snapshot window
- `skip_final_snapshot` controlled by Terraform variable `rds_skip_final_snapshot` (default `false` for normal operation; destroy workflow passes `true` so no orphan snapshot is created)
- `deletion_protection` controlled by Terraform variable `rds_deletion_protection` (default `true` for normal operation; destroy workflow passes `false`)
- DB name: `workload`, master user: `postgres`
- Master password: stored in SSM Parameter Store `SecureString` `/workload/prod/db_password`; Terraform reads it via `data "aws_ssm_parameter"`
- Subnet group spans both public subnets
- `publicly_accessible = false` — only reachable from `ec2-sg`
- Liquibase migrations: run by the Spring Boot app on startup (no separate migration step)

### Frontend (S3 + CloudFront)

- S3 bucket: private, block-all-public-access on, versioning enabled
- Bucket policy permits only the CloudFront distribution via Origin Access Control (OAC)
- Frontend build artifacts (`frontend/dist/`) synced into the bucket via CI

### CloudFront

- 1× distribution, HTTPS-only (redirect HTTP→HTTPS), TLS 1.2_2021 minimum
- Default certificate (`*.cloudfront.net`), no custom domain
- Origins:
  - `s3-frontend` — S3 bucket via OAC, no public access
  - `ec2-backend` — EC2 EIP DNS over HTTP/8080, custom origin
- Behaviors (ordered):
  - `/api/*` → `ec2-backend`, all methods, no caching (`CachingDisabled` managed policy), forward all headers/cookies/query strings (`AllViewer` origin request policy)
  - `/actuator/*` → `ec2-backend`, same as above
  - default `*` → `s3-frontend`, GET/HEAD only, caching enabled (`CachingOptimized` managed policy)
- Custom error response: 403/404 from S3 origin → `/index.html` with HTTP 200 (React Router SPA fallback)

### Container registry (ECR)

- 1× private ECR repository: `workload-backend`
- Image tag mutability: `MUTABLE` (allows `:latest`)
- Lifecycle policy: keep last 3 untagged + last 3 tagged images
- Scan on push enabled (free)

### Secrets (SSM Parameter Store)

All `SecureString` (KMS aws/ssm). Path prefix `/workload/prod/`:

- `db_password`
- `jwt_secret`
- 19× `workload_config_*` (the same keys exposed via env vars in `docker-compose.poc.yml`)

Values are **not** committed to Terraform. They are seeded once via a documented `aws ssm put-parameter` runbook in `infra/README.md`. Terraform creates the parameter resource with `lifecycle { ignore_changes = [value] }` and references existing values via `data "aws_ssm_parameter"` for outputs.

### Remote state and operator bootstrap

`infra/bootstrap/` is a separate Terraform configuration that uses local state. It is applied once per AWS account and contains everything that must outlive a `terraform destroy` of the main stack.

Resources in bootstrap:

- 1× S3 bucket `workload-tfstate-<account-id>`: versioning + SSE-S3, block-all-public-access on, lifecycle rule to expire non-current versions after 30 days
- 1× DynamoDB table `workload-tfstate-lock`: `LockID` (string) hash key, PAY_PER_REQUEST billing
- 1× GitHub OIDC provider (`token.actions.githubusercontent.com`)
- 1× IAM role `workload-github-deployer`: trusted by the OIDC provider, scoped to the project's GitHub repo. Inline admin-equivalent policy for the project's resources (EC2, RDS, S3, CloudFront, ECR, SSM, IAM passrole limited to the EC2 instance profile, plus permissions to empty/delete the tfstate bucket itself).
- 1× IAM role for the EC2 instance profile (referenced by the main stack via data source) — alternatively kept in main stack; for split clarity it lives here.

After bootstrap completes, the main `infra/terraform/` configuration uses the S3+DynamoDB backend and the OIDC role for CI auth.

Bootstrap is destroyed separately and only as the last step of full cleanup (see destroy workflow).

### CI/CD (GitHub Actions)

Two workflows, both **manual-trigger only** (`workflow_dispatch`). No `on: push` triggers — deploys and destroys are deliberate human actions.

#### `deploy-aws.yml` (manual deploy)

Inputs (workflow_dispatch):
- `ref` — git ref to deploy (default: `main`)

Steps:
1. **Auth**: AWS credentials via OIDC (`aws-actions/configure-aws-credentials`). No static IAM keys; OIDC role created by Terraform.
2. **Backend image**:
   - `mvn -B -DskipTests package`
   - `docker build -t $ECR_URI:$GITHUB_SHA -t $ECR_URI:latest backend/`
   - `docker push $ECR_URI:$GITHUB_SHA && docker push $ECR_URI:latest`
3. **Frontend build & deploy**:
   - `npm ci && npm run build`
   - `aws s3 sync frontend/dist/ s3://$BUCKET/ --delete`
   - `aws cloudfront create-invalidation --distribution-id $CF_ID --paths '/*'`
4. **Backend deploy**:
   - `aws ssm send-command --document-name "AWS-RunShellScript" --targets "Key=instanceids,Values=$EC2_ID" --parameters 'commands=["docker compose -f /opt/workload/docker-compose.yml pull","docker compose -f /opt/workload/docker-compose.yml up -d"]'`
   - Poll `https://<cloudfront>/actuator/health` until 200, max 5 min, fail otherwise

#### `destroy-aws.yml` (manual teardown, complete cleanup to $0 charges)

Inputs (workflow_dispatch):
- `confirm` — required string input; workflow fails unless value is exactly `destroy-prod`.
- `also_destroy_bootstrap` — boolean (default `false`). When `true`, the workflow also destroys `infra/bootstrap/` (tfstate bucket, lock table, OIDC role). When `false`, bootstrap is retained so the operator can redeploy without re-running `bootstrap`.

The goal is **zero ongoing AWS charges after the workflow succeeds**. Resources that would otherwise linger and accrue cost are explicitly removed.

Steps:

1. **Auth**: AWS OIDC role (lives in bootstrap, survives main-stack destroy).
2. **Guard**: fail immediately if `inputs.confirm != 'destroy-prod'`.
3. **Empty frontend S3 bucket** (versioned — Terraform cannot delete a non-empty versioned bucket):
   - List all object versions and delete markers via `aws s3api list-object-versions`
   - Batch-delete via `aws s3api delete-objects`
4. **Force-delete ECR images**:
   - `aws ecr batch-delete-image --repository-name workload-backend --image-ids "$(aws ecr list-images ... --output json)"`
   - Repeats with `|| true` so a missing repo doesn't fail the workflow.
5. **Terraform destroy (main stack)** with snapshot/protection overrides so nothing persists:
   - `cd infra/terraform`
   - `terraform init`
   - `terraform destroy -auto-approve -var="rds_skip_final_snapshot=true" -var="rds_deletion_protection=false"`
6. **Sweep stragglers** — defensive cleanup for anything Terraform might leave behind:
   - Delete any RDS manual snapshots matching `workload-final-*` (covers snapshots left by prior runs that used `skip_final_snapshot=false`)
   - Delete any CloudWatch log groups under `/aws/workload/`
   - Release any orphan Elastic IPs tagged `Project=workload` (shouldn't happen, defensive)
7. **(Conditional) Destroy bootstrap** if `also_destroy_bootstrap == true`:
   - Empty the tfstate bucket of all object versions and delete markers (same approach as step 3)
   - `cd infra/bootstrap && terraform init && terraform destroy -auto-approve`
   - The OIDC role is destroyed *after* its work is done, so this is the last step in the job.
8. **Workflow summary**: prints what was destroyed and what (if anything) was retained. If `also_destroy_bootstrap=false`, lists the remaining bootstrap resources and their (negligible) cost.

**Sweep step rationale**: Terraform destroys resources it manages. If a previous failed apply orphaned a snapshot, EIP, or log group, only an out-of-band sweep cleans those up. The sweep uses tag filters (`Project=workload`) plus name prefixes to avoid touching anything unrelated.

**Cost after a clean destroy run**:
- With `also_destroy_bootstrap=false`: ~$0/mo (tfstate bucket has only a small state file; DynamoDB is PAY_PER_REQUEST with no traffic; IAM is free).
- With `also_destroy_bootstrap=true`: $0/mo — the AWS account incurs no workload-related charges.

## Code changes outside `infra/`

### Backend

- New file: `backend/src/main/resources/application-aws.yml`
  - `spring.datasource.url: ${SPRING_DATASOURCE_URL}` (set from env)
  - `server.forward-headers-strategy: NATIVE` (respect CloudFront `X-Forwarded-*`)
  - `management.endpoints.web.exposure.include: health` (limit actuator)
  - `management.endpoint.health.show-details: never`
- Container env: `SPRING_PROFILES_ACTIVE=aws` set in user-data's compose env_file

### Frontend

- New file: `frontend/.env.production`
  - `VITE_API_BASE_URL=/api`
- Confirm `src/api/axios.ts` reads `import.meta.env.VITE_API_BASE_URL`
- Build artifacts in `frontend/dist/` synced to S3 — no nginx container, no Dockerfile change required

## Repo layout

```
infra/
├── bootstrap/
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── state.tf                # tfstate bucket + DynamoDB lock table
│   ├── github-oidc.tf          # OIDC provider + workload-github-deployer role
│   ├── outputs.tf              # tfstate bucket name, lock table, OIDC role ARN
│   └── README.md               # one-time setup instructions
├── terraform/
│   ├── backend.tf              # S3 + DynamoDB backend (values from bootstrap outputs)
│   ├── versions.tf             # terraform ≥1.6, aws ≥5.30
│   ├── providers.tf
│   ├── variables.tf            # region, env name, instance types,
│   │                           # rds_skip_final_snapshot (default false),
│   │                           # rds_deletion_protection (default true)
│   ├── outputs.tf              # cloudfront_url, ecr_uri, ec2_instance_id, s3_bucket
│   ├── network.tf              # VPC, subnets, IGW, route table, SGs
│   ├── ec2.tf                  # AMI lookup, instance, EIP, IAM, instance profile
│   ├── rds.tf                  # subnet group, parameter group, instance
│   ├── s3-frontend.tf          # bucket, public access block, OAC policy
│   ├── cloudfront.tf           # distribution, OAC, behaviors
│   ├── ecr.tf                  # repository + lifecycle policy
│   ├── ssm.tf                  # parameter resources (ignore_changes value)
│   ├── user-data.sh.tftpl      # cloud-init template
│   └── README.md
├── .gitignore                  # *.tfvars, .terraform/, *.tfstate*
└── README.md                   # high-level guide

.github/workflows/
├── deploy-aws.yml
└── destroy-aws.yml
```

## Acceptance criteria

A reviewer running this from a clean AWS account must be able to:

1. Run `cd infra/bootstrap && terraform init && terraform apply` and see the state bucket + lock table created.
2. Run the documented `aws ssm put-parameter` commands for all 21 SSM parameters (DB password, JWT secret, 19 config keys).
3. Run `cd ../terraform && terraform init && terraform apply` and see all resources created without manual intervention.
4. `curl -fsSL https://<cloudfront-url>/actuator/health` returns HTTP 200 with `{"status":"UP"}` within 5 minutes of apply completion.
5. Loading `https://<cloudfront-url>/` in a browser shows the React login page; logging in with a seeded user (per existing PoC seed data) reaches the dashboard and renders server-fetched data.
6. Manually dispatching `deploy-aws.yml` from the GitHub Actions UI succeeds end-to-end; after success, the new code is live without any manual EC2 action.
7. Manually dispatching `destroy-aws.yml` with `confirm=destroy-prod, also_destroy_bootstrap=false` tears down all `infra/terraform/`-managed resources plus the frontend bucket contents, ECR images, RDS snapshots, and CloudWatch log groups. The tfstate bucket, DynamoDB lock table, and OIDC role are retained.
8. Manually dispatching `destroy-aws.yml` with `confirm=destroy-prod, also_destroy_bootstrap=true` additionally tears down `infra/bootstrap/`. After the workflow succeeds, the AWS Billing dashboard shows $0/mo ongoing charges for workload-related resources.
9. Dispatching `destroy-aws.yml` with the wrong (or empty) `confirm` value fails before any AWS API call is made.

## Cost

| Phase | Estimate |
|---|---|
| AWS Free Tier (months 1–12, new account) | $0/mo if usage stays small |
| Post-Free-Tier | ~$25–35/mo (RDS db.t3.micro ~$15, EC2 t3.micro ~$8, EBS+ECR+S3+CF ~$2–5, data transfer ~$1–3) |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| EC2 instance failure | Single-instance accepted; recovery = re-run `terraform apply` + CI redeploy. ~10 min MTTR. |
| EC2 OOM (1 GB RAM, JVM only) | JVM `-XX:MaxRAMPercentage=60` keeps heap ≤ ~600 MB; no other heavy processes on box. |
| RDS single-AZ failure | Accepted for PoC. Automated daily snapshots provide recovery. |
| Free Tier expiry surprise | README warns about month-12 cliff. AWS Budget alert (set manually outside Terraform) recommended. |
| SSM parameter drift | Terraform manages parameter resource but ignores `value` — values set out-of-band, documented in runbook. |
| CloudFront → EC2 origin uses HTTP | Acceptable: only AWS-internal traffic on the public internet, no end-user secrets in transit at this hop. End-user → CloudFront leg is HTTPS. |

## Open questions

None — all decisions captured above. Implementation plan to be generated next.
