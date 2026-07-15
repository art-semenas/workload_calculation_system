# AWS Deploy — Hybrid (EC2 compose + RDS) Design

**Status:** Draft for review
**Date:** 2026-05-18
**Author:** brainstormed with the user

## Goal

Deploy the workload calculation system to AWS using Terraform, fitting inside the AWS Free Tier. Architecture: a single EC2 instance runs `docker compose` with three containers (nginx reverse proxy, frontend nginx with React build, backend Spring Boot); Postgres runs as a managed RDS instance instead of a container. CloudFront fronts the EC2 instance for HTTPS termination. This mirrors `docker-compose.poc.yml` as closely as possible while keeping the database durable and backed up.

## Non-goals

- Multi-AZ, autoscaling, ALB, WAF — deferred to MVP.
- Datadog / CloudWatch dashboards / alerting — deferred to MVP.
- Multiple environments (dev/staging/prod) — only `prod`.
- Custom domain + Route 53 — using default AWS DNS.
- Blue/green or canary deploys.
- Hosting Postgres on the EC2 instance (durability/backups trade-off rejected).

## Architecture

```
                 ┌──────────────────────────────────────┐
                 │       CloudFront (HTTPS, free)       │
                 │   d2xxxxxx.cloudfront.net            │
                 │   single origin → EC2 EIP :80        │
                 └──────────────────┬───────────────────┘
                                    │ HTTP :80
                                    ▼
       ┌─────────────────────────────────────────────────┐
       │  EC2 t3.micro (Amazon Linux 2023, EIP)          │
       │                                                 │
       │   docker compose:                               │
       │     nginx        :80   reverse proxy            │
       │       /api/*, /actuator/*  → backend:8080       │
       │       everything else      → frontend:80        │
       │     frontend     :80   nginx + React build      │
       │     backend      :8080 Spring Boot              │
       │                                                 │
       │   (postgres NOT here — uses RDS)                │
       └────────────────────┬────────────────────────────┘
                            │ VPC internal (5432)
                            ▼
              ┌───────────────────────┐
              │ RDS PostgreSQL 15     │
              │ db.t3.micro single-AZ │
              └───────────────────────┘
```

## Components

### Networking

Identical to Option A:

- 1× VPC `10.0.0.0/16`
- 2× public subnets in different AZs — RDS subnet group requires 2 AZs
- 1× Internet Gateway
- No NAT Gateway
- Security groups:
  - `ec2-sg`: inbound `80/tcp` from CloudFront managed prefix list; outbound all
  - `rds-sg`: inbound `5432/tcp` from `ec2-sg`; outbound none
- No bastion; admin via SSM Session Manager

### Compute (EC2)

- 1× EC2 `t3.micro`, Amazon Linux 2023, in a public subnet
- 1× Elastic IP attached
- IAM instance profile:
  - `AmazonSSMManagedInstanceCore`
  - `AmazonEC2ContainerRegistryReadOnly` (backend image pull)
  - Custom policy: `ssm:GetParameter*` on `/workload/prod/*`
- User-data (cloud-init):
  1. Install Docker + Docker Compose plugin
  2. ECR login
  3. Fetch SSM parameters → `/etc/workload.env`
  4. Write `/opt/workload/docker-compose.yml` (three services: nginx, frontend, backend), `/opt/workload/nginx.conf`
  5. `docker compose up -d`
- JVM tuning: `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=50 -XX:+UseSerialGC`. With backend + 2× nginx, RAM budget per container is tighter than Option A.

### Containers on the instance

| Container | Image source | Listens | Purpose |
|---|---|---|---|
| `nginx` | `nginx:alpine` (Docker Hub) | `80` (host) | reverse proxy: `/api/*` and `/actuator/*` → `backend:8080`; default → `frontend:80` |
| `frontend` | ECR `workload-frontend:latest` | `80` (container only) | nginx + React build, multi-stage build identical to existing `frontend/Dockerfile` |
| `backend` | ECR `workload-backend:latest` | `8080` (container only) | Spring Boot, env from `/etc/workload.env` |

Differences from `docker-compose.poc.yml`:
- No `postgres` service — backend connects to RDS endpoint instead
- `nginx` config is renamed (`nginx.poc.conf` → an AWS-deployed `nginx.conf` shipped via user-data)
- Backend env vars: only the JWT secret + 19 workload config keys come from SSM; the datasource URL points at RDS

### Database (RDS)

Identical to Option A:

- 1× `db.t3.micro`, PostgreSQL 15, single-AZ
- 20 GB gp3, storage-encrypted
- 7-day automated backups
- `skip_final_snapshot` controlled by `rds_skip_final_snapshot` variable (default `false`; destroy workflow passes `true`)
- `deletion_protection` controlled by `rds_deletion_protection` variable (default `true`; destroy workflow passes `false`)
- Master password from SSM SecureString
- Subnet group spans both public subnets
- `publicly_accessible = false`; only `ec2-sg` allowed in
- Liquibase migrations run on backend startup

### CloudFront

- 1× distribution, HTTPS-only, TLS 1.2_2021 minimum
- Default certificate (`*.cloudfront.net`)
- **Single origin**: EC2 EIP DNS over HTTP/80, custom origin
- Behaviors:
  - `/api/*` → caching disabled (`CachingDisabled` managed policy), all methods, all headers/cookies/query strings forwarded (`AllViewer` origin request policy)
  - `/actuator/*` → same as above
  - default `*` → cached (`CachingOptimized` managed policy), GET/HEAD; React Router routing handled by frontend nginx returning `index.html` on unknown paths
- No custom error response needed — nginx in the frontend container handles SPA fallback

### Container registry (ECR)

- 2× private ECR repositories: `workload-backend`, `workload-frontend`
- Image tag mutability: `MUTABLE` (allows `:latest`)
- Lifecycle policy on each: keep last 3 untagged + last 3 tagged
- Scan on push enabled

### Secrets (SSM Parameter Store)

Identical to Option A: same 21 `SecureString` parameters under `/workload/prod/*`, seeded out-of-band, Terraform manages resource only.

### Remote state and operator bootstrap

`infra/bootstrap/` is a separate Terraform configuration that uses local state. It is applied once per AWS account and contains everything that must outlive a `terraform destroy` of the main stack:

- 1× S3 bucket `workload-tfstate-<account-id>`: versioning + SSE-S3, block-all-public-access, lifecycle rule expiring non-current versions after 30 days
- 1× DynamoDB table `workload-tfstate-lock`: `LockID` (string) hash key, PAY_PER_REQUEST billing
- 1× GitHub OIDC provider (`token.actions.githubusercontent.com`)
- 1× IAM role `workload-github-deployer`: trusted by the OIDC provider, scoped to the project's repo. Inline policy with the permissions needed to manage the main stack plus to empty/delete the tfstate bucket itself

The main `infra/terraform/` configuration uses the S3+DynamoDB backend and the OIDC role for CI auth. Bootstrap is destroyed separately and only as the last step of full cleanup (see destroy workflow).

### CI/CD (GitHub Actions)

Two workflows, both **manual-trigger only** (`workflow_dispatch`). No `on: push` triggers — deploys and destroys are deliberate human actions.

#### `deploy-aws.yml` (manual deploy)

Inputs (workflow_dispatch):
- `ref` — git ref to deploy (default: `main`)

Steps:
1. **Auth**: AWS OIDC role.
2. **Backend image**:
   - `mvn -B -DskipTests package`
   - `docker build -t $BE_ECR:$GITHUB_SHA -t $BE_ECR:latest backend/`
   - `docker push $BE_ECR:$GITHUB_SHA && docker push $BE_ECR:latest`
3. **Frontend image**:
   - `docker build -t $FE_ECR:$GITHUB_SHA -t $FE_ECR:latest frontend/`
   - `docker push $FE_ECR:$GITHUB_SHA && docker push $FE_ECR:latest`
4. **Deploy**:
   - `aws ssm send-command --document-name "AWS-RunShellScript" --targets "Key=instanceids,Values=$EC2_ID" --parameters 'commands=["docker compose -f /opt/workload/docker-compose.yml pull","docker compose -f /opt/workload/docker-compose.yml up -d"]'`
   - Poll `https://<cloudfront>/actuator/health` until 200, max 5 min
5. **CloudFront invalidation**: `aws cloudfront create-invalidation --paths '/*'`. Frontend container serves the React build directly, so the simplest correct behaviour is a wildcard invalidation after every deploy.

#### `destroy-aws.yml` (manual teardown, complete cleanup to $0 charges)

Inputs (workflow_dispatch):
- `confirm` — required string input; workflow fails unless value is exactly `destroy-prod`.
- `also_destroy_bootstrap` — boolean (default `false`). When `true`, the workflow also destroys `infra/bootstrap/` (tfstate bucket, lock table, OIDC role).

The goal is **zero ongoing AWS charges after the workflow succeeds**.

Steps:

1. **Auth**: AWS OIDC role (lives in bootstrap, survives main-stack destroy).
2. **Guard**: fail immediately if `inputs.confirm != 'destroy-prod'`.
3. **Force-delete ECR images** (both `workload-backend` and `workload-frontend`):
   - For each repo, list image IDs and `aws ecr batch-delete-image`, guarded with `|| true`.
4. **Terraform destroy (main stack)** with snapshot/protection overrides:
   - `cd infra/terraform`
   - `terraform init`
   - `terraform destroy -auto-approve -var="rds_skip_final_snapshot=true" -var="rds_deletion_protection=false"`
5. **Sweep stragglers** — defensive cleanup:
   - Delete any RDS manual snapshots matching `workload-final-*`
   - Delete any CloudWatch log groups under `/aws/workload/`
   - Release any orphan Elastic IPs tagged `Project=workload`
6. **(Conditional) Destroy bootstrap** if `also_destroy_bootstrap == true`:
   - Empty the tfstate bucket of all object versions and delete markers
   - `cd infra/bootstrap && terraform init && terraform destroy -auto-approve`
   - OIDC role is destroyed last, after its work is done.
7. **Workflow summary**: prints what was destroyed and what was retained. If `also_destroy_bootstrap=false`, lists the remaining bootstrap resources and their (negligible) cost.

**Sweep step rationale**: Terraform destroys resources it manages. If a previous failed apply orphaned a snapshot, EIP, or log group, only an out-of-band sweep cleans those up. The sweep uses tag filters (`Project=workload`) plus name prefixes to avoid touching anything unrelated.

**Cost after a clean destroy run**:
- With `also_destroy_bootstrap=false`: ~$0/mo (tfstate bucket has only a small state file; DynamoDB PAY_PER_REQUEST with no traffic; IAM is free).
- With `also_destroy_bootstrap=true`: $0/mo — the AWS account incurs no workload-related charges.

## Code changes outside `infra/`

### Backend

- New file: `backend/src/main/resources/application-aws.yml`
  - `spring.datasource.url: ${SPRING_DATASOURCE_URL}`
  - `server.forward-headers-strategy: NATIVE`
  - `management.endpoints.web.exposure.include: health`
- `SPRING_PROFILES_ACTIVE=aws` set in compose env_file

### Frontend

- New file: `frontend/.env.production`
  - `VITE_API_BASE_URL=/api`
- Confirm `src/api/axios.ts` reads `import.meta.env.VITE_API_BASE_URL`
- Existing `frontend/Dockerfile` and `frontend/nginx.conf` are reused as-is

### Reverse proxy nginx config

A new `infra/terraform/files/nginx.conf` is shipped via user-data to `/opt/workload/nginx.conf`. Routing:

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

`X-Forwarded-Proto https` is hardcoded because CloudFront → EC2 hop is HTTP but the external scheme is HTTPS — Spring `forward-headers-strategy: NATIVE` will then build correct redirect URLs.

## Repo layout

```
infra/
├── bootstrap/
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── state.tf                # tfstate bucket + DynamoDB lock table
│   ├── github-oidc.tf          # OIDC provider + workload-github-deployer role
│   ├── outputs.tf
│   └── README.md
├── terraform/
│   ├── backend.tf
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf            # region, env name, instance types,
│   │                           # rds_skip_final_snapshot (default false),
│   │                           # rds_deletion_protection (default true)
│   ├── outputs.tf              # cloudfront_url, ecr_uris, ec2_instance_id
│   ├── network.tf
│   ├── ec2.tf
│   ├── rds.tf
│   ├── cloudfront.tf           # single origin
│   ├── ecr.tf                  # 2 repositories
│   ├── ssm.tf
│   ├── user-data.sh.tftpl
│   ├── files/
│   │   ├── docker-compose.yml.tftpl
│   │   └── nginx.conf
│   └── README.md
├── .gitignore
└── README.md

.github/workflows/
├── deploy-aws.yml
└── destroy-aws.yml
```

## Acceptance criteria

1. `cd infra/bootstrap && terraform init && terraform apply` creates state bucket + lock table.
2. Documented `aws ssm put-parameter` commands seed all 21 SSM parameters.
3. `cd ../terraform && terraform init && terraform apply` creates everything without manual intervention.
4. `curl -fsSL https://<cloudfront>/actuator/health` returns HTTP 200 within 5 minutes of apply.
5. The CloudFront URL loads the React app; login + a server-data page work.
6. `docker compose ps` on the EC2 instance (via SSM Session Manager) shows three healthy containers: `nginx`, `frontend`, `backend`.
7. Manually dispatching `deploy-aws.yml` from the GitHub Actions UI succeeds end-to-end; after success, new code is live.
8. Manually dispatching `destroy-aws.yml` with `confirm=destroy-prod, also_destroy_bootstrap=false` tears down all `infra/terraform/`-managed resources plus ECR images, RDS snapshots, and CloudWatch log groups. The tfstate bucket, DynamoDB lock table, and OIDC role are retained.
9. Manually dispatching `destroy-aws.yml` with `confirm=destroy-prod, also_destroy_bootstrap=true` additionally tears down `infra/bootstrap/`. After the workflow succeeds, the AWS Billing dashboard shows $0/mo ongoing charges for workload-related resources.
10. Dispatching `destroy-aws.yml` with the wrong (or empty) `confirm` value fails before any AWS API call is made.

## Memory budget on t3.micro (1 GB RAM)

| Component | Reserved | Notes |
|---|---|---|
| OS + Docker daemon | ~250 MB | Amazon Linux 2023 baseline |
| nginx (proxy) | ~10 MB | alpine image |
| nginx (frontend) | ~10 MB | alpine image |
| Spring Boot backend | ~500 MB | `-XX:MaxRAMPercentage=50` → ~480 MB heap+metaspace |
| Free for buffers/cache | ~230 MB | tight but workable |

If memory becomes an issue, the recovery is to add a 1 GB swap file in user-data — documented but not enabled by default.

## Cost

| Phase | Estimate |
|---|---|
| Free Tier (months 1–12) | $0/mo if usage stays small |
| Post-Free-Tier | ~$25–35/mo (RDS ~$15, EC2 ~$8, EBS+ECR+CF ~$2–5, data transfer ~$1–3) |

Same ballpark as Option A — RDS dominates either way. The hybrid saves nothing vs Option A on AWS bill; the difference is operational simplicity, not cost.

## Comparison vs Option A

| Dimension | Option A (split) | Hybrid (this) |
|---|---|---|
| Terraform resources | ~25 | ~18 |
| Local→prod parity | low (S3-served frontend ≠ local nginx) | high (same compose, swap DB only) |
| Deploy channels | 3 (ECR, S3, SSM) | 2 (ECR, SSM) |
| ECR repos | 1 | 2 |
| CloudFront origins | 2 (S3 + EC2) | 1 (EC2) |
| Static asset caching | CDN-optimal (S3+CF behaviors) | OK (frontend nginx + CF) |
| EC2 memory pressure | low (~1 container) | medium (3 containers) |
| MVP migration cost | small (already RDS-shaped) | small (already RDS-shaped) |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| EC2 OOM with 3 containers on 1 GB | JVM heap cap, two `alpine` nginx images, swap file on standby |
| EC2 instance failure | Single-instance accepted; recovery = `terraform apply` + redeploy. ~10 min MTTR. |
| RDS single-AZ failure | Accepted for PoC. Daily automated snapshots. |
| Free Tier expiry | README warns; manual AWS Budget alert recommended. |
| nginx.conf change requires user-data re-render | A nginx.conf change forces EC2 user-data update → instance replacement. Mitigation: ship nginx.conf via SSM `aws:downloadContent` or a small S3 config bucket, then SIGHUP nginx — explicitly out of scope for PoC; if you change nginx routing, accept the instance replacement. |
| CloudFront → EC2 origin uses HTTP | Same as Option A: acceptable for PoC; external leg is HTTPS. |

## Open questions

None — implementation plan to be generated next.
