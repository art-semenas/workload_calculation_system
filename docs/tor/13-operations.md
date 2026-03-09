## 17. Concurrency & Locking

**Scope: MVP.** The PoC uses last-write-wins (S-09). This section defines the strategy that replaces S-09 in M-11.

---

### 17.1 Risk Scenarios

With editors across multiple divisions and admins performing bulk operations simultaneously, uncontrolled concurrent writes produce silent data loss:

- Two editors open the same object's equipment tab simultaneously. Both make changes. The second save overwrites the first with no error.
- An admin updates a normative while a background recalculation job is mid-flight. The job writes a summary computed from the old normative after the new normative is saved.
- A bulk XLSX import runs while an editor is updating an object that appears in the import. The import overwrites the editor's in-flight change.

---

### 17.2 Strategy: Optimistic Locking via `updated_at` Version

All writable tables carry an `updated_at TIMESTAMP` column. On every write, the client sends the `updated_at` value it last read. The server checks that the row's current `updated_at` matches before applying the update:

```sql
UPDATE equipment_entries
SET    quantity = :new_qty, updated_at = now()
WHERE  id = :id
AND    updated_at = :client_version;   -- optimistic lock check

-- If 0 rows affected → conflict detected → return HTTP 409
```

This requires no database-level locks and adds no latency on the happy path.

---

### 17.3 Conflict Response

When a conflict is detected (0 rows updated), the API returns:

```json
HTTP 409 Conflict
{
  "error": {
    "code": "EDIT_CONFLICT",
    "message": "Данные изменены другим пользователем. Перезагрузите страницу.",
    "current_updated_at": "2025-06-15T14:23:11Z"
  }
}
```

The UI catches 409 responses and displays a non-blocking alert:
> **"Данные были изменены другим пользователем. Ваши изменения не сохранены. Перезагрузить страницу?"**

No automatic merge is attempted. The user must reload to get the latest state and re-enter their changes if needed.

---

### 17.4 Tables Covered by Optimistic Locking

| Table | `updated_at` column | Locking applied |
|---|---|---|
| `objects` | ✅ | On metadata updates |
| `equipment_entries` / `object_system_assignments` | ✅ | On quantity changes |
| `records_tasks` | ✅ | On task count updates |
| `object_repairs` | ✅ | On repair count updates |
| `travel` | ✅ | On travel data updates |
| `object_engineers` | ✅ | On assignment changes |
| `device_system_contexts` | ✅ | On normative edits (admin only) |
| `repair_types` | ✅ | On time_minutes edits (admin only) |
| `app_config` | ✅ | On constant changes (admin only) |
| `summaries` / `engineer_summaries` | ❌ | Written only by background worker; no concurrent user writes |

---

### 17.5 Transaction Boundaries

The following operations must execute within a single database transaction:

| Operation | What must be atomic |
|---|---|
| Save equipment + trigger recalc | UPDATE equipment_entries + UPDATE summaries (if sync) |
| Assign engineer to object | INSERT object_engineers + mark engineer_summaries stale |
| Remove engineer from object | DELETE object_engineers + mark all co-engineers' summaries stale |
| Activate a planning period | UPDATE periods SET is_active=FALSE (all) + UPDATE periods SET is_active=TRUE (new) |
| Bulk XLSX import | All object/equipment/repair/records INSERTs + summary computation — committed together or rolled back entirely |
| Normative update | UPDATE device_system_contexts + mark all affected summaries stale |

Transactions must not span HTTP requests. Long-running operations (bulk import, bulk recalculation) run inside a single database transaction per batch, not per row.

---

### 17.6 Import Concurrency

The XLSX import (MVP) locks the affected objects for the duration of the import batch using `SELECT ... FOR UPDATE` on the `objects` rows being imported. Any concurrent edit to those objects returns HTTP 409 to the editor attempting the edit. The import holds the lock for a maximum of 30 seconds per batch; if exceeded, the import batch is rolled back and re-queued.

---

### 17.7 Background Worker Isolation

The recalculation worker (MVP) reads `summaries.is_stale = TRUE` rows and updates them. To prevent two worker instances from computing the same object simultaneously:

```sql
-- Worker claims a batch atomically
UPDATE summaries
SET    is_stale = 'PROCESSING'   -- intermediate status
WHERE  is_stale = TRUE
LIMIT  100
RETURNING id, object_id;
```

If the worker crashes mid-batch, a watchdog resets `PROCESSING → TRUE` after a configurable timeout (default: 5 minutes). This prevents summaries from being stuck in `PROCESSING` state permanently.


## 18. Observability & Monitoring

Requirements are tiered: **PoC** covers the minimum needed to operate the demo confidently; **MVP** adds production-grade monitoring.

---

### 18.1 PoC Tier (Required for PoC Delivery)

#### Structured Logging — log4j2

Configure log4j2 with `JsonTemplateLayout` (or `JsonLayout`) so all log output is newline-delimited JSON to stdout. Docker captures stdout; Datadog Agent tails container logs.

`log4j2-spring.xml` minimum configuration:

```xml
<JsonTemplateLayout eventTemplateUri="classpath:LogstashJsonEventLayoutV1.json"/>
```

Minimum fields on every log line:

```json
{
  "timestamp": "2025-06-15T14:23:11.432Z",
  "level": "INFO",
  "logger": "com.company.workload.service.CalculationService",
  "thread": "http-nio-8080-exec-3",
  "request_id": "c3d8e2a1",
  "user_id": "uuid-or-null",
  "message": "Object summary recalculated",
  "object_id": "uuid",
  "duration_ms": 4,
  "service": "workload-api",
  "version": "1.0.0",
  "environment": "poc"
}
```

`request_id` is injected by a Spring `OncePerRequestFilter` that generates a UUID and stores it in MDC. `user_id` is set from the JWT principal in the same filter.

Log levels: `DEBUG` (dev only, disabled in all other environments), `INFO` (normal operations), `WARN` (recoverable issues — e.g. stale summary detected), `ERROR` (exceptions, failed operations, job failures).

**No plaintext logs permitted in any environment** — including PoC. log4j2 `ConsoleAppender` with JSON layout is configured from day one.

#### Health Endpoint — Spring Actuator

Spring Boot Actuator provides the health endpoint out of the box:

```
GET /actuator/health
```

Auto-configured `HealthIndicators` check:
- PostgreSQL datasource connectivity (`DataSourceHealthIndicator`)
- Redis connectivity (`RedisHealthIndicator`)
- Disk space (`DiskSpaceHealthIndicator`)

Returns HTTP 200 `{"status": "UP"}` when all healthy; HTTP 503 when any component is DOWN.

`/actuator/health` is accessible publicly (used by Nginx health check and Docker Compose `healthcheck`). All other `/actuator/**` endpoints are restricted to internal network only (Nginx rule: deny external access to `/actuator` except `/actuator/health`).

Docker Compose healthcheck:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
  interval: 30s
  timeout: 5s
  retries: 3
```

#### Datadog Integration — PoC

Install the Datadog Agent as a Docker Compose sidecar:

```yaml
datadog-agent:
  image: datadog/agent:latest
  environment:
    DD_API_KEY: ${DD_API_KEY}
    DD_LOGS_ENABLED: "true"
    DD_APM_ENABLED: "true"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - /proc:/host/proc:ro
    - /sys/fs/cgroup:/host/sys/fs/cgroup:ro
```

Label backend container for Datadog log collection:
```yaml
backend:
  labels:
    com.datadoghq.ad.logs: '[{"source":"java","service":"workload-api"}]'
```

Spring Actuator exports metrics to Datadog via Micrometer:
```yaml
# application.yml
management:
  metrics:
    export:
      datadog:
        api-key: ${DD_API_KEY}
        step: 30s
```

For PoC, this provides: log aggregation, JVM metrics (heap, GC, threads), HTTP request metrics, and basic APM tracing — with zero code instrumentation.

#### Error Alerting — PoC

Datadog alert on `status:error` log events from service `workload-api`. Notification via email (configure in Datadog UI). No on-call paging for PoC. 7-day log retention.

---

### 18.2 MVP Tier (Required Before Production Launch)

#### Application Performance Monitoring (APM)

Datadog APM is the single APM platform (chosen in §9.1). The Datadog Agent (introduced in PoC) is configured for full APM tracing in MVP via the Datadog Java APM agent (`dd-java-agent.jar`). Instrument:

- Every HTTP request: method, route, status code, duration, user_id
- Every database query: query type, table, duration, row count
- Every background job execution: job type, object count, total duration, success/failure
- Every calculation engine run: object_id, duration_ms, result value

#### Performance Thresholds and Alerting

| Metric | Warning threshold | Critical threshold |
|---|---|---|
| HTTP request p95 latency | > 1s | > 3s |
| HTTP error rate (5xx) | > 1% over 5 min | > 5% over 5 min |
| Background job duration | > 30s | > 90s |
| DB query p95 latency | > 200ms | > 500ms |
| DB connection pool exhaustion | > 80% | > 95% |
| Disk usage | > 70% | > 90% |

Alerts route to an admin notification channel (email or Slack webhook, configured via environment variable).

#### Database Monitoring

- Slow query log: capture all queries exceeding 500ms
- Connection pool metrics: active, idle, waiting connections
- Table bloat: monitor `summaries` and `engineer_summaries` for excessive dead tuples (auto-vacuum tuning)
- Index usage: verify the `one_active_period` partial index and UNIQUE indexes are used by query planner

#### Background Job Failure Alerting

The recalculation worker (MVP) must emit a structured `ERROR` log and trigger an alert if:
- A batch fails after 3 retry attempts
- Any object summary remains in `PROCESSING` status for > 5 minutes (watchdog timeout)
- The stale summary queue length exceeds 500 objects (backlog alert)

#### Log Retention

| Environment | Retention | Storage |
|---|---|---|
| PoC | 7 days | Local file rotation |
| MVP Staging | 14 days | Log aggregator |
| MVP Production | 90 days | Log aggregator (compliance minimum) |

#### Structured Logging Extensions for MVP

In addition to PoC fields, MVP log lines include:

```json
{
  "service": "workload-api",
  "version": "1.2.0",
  "environment": "production",
  "trace_id": "otel-trace-id",
  "span_id": "otel-span-id"
}
```

This enables distributed tracing if a second service is added (e.g., a notification service post-MVP).

---

### 18.3 Key Runbook Items (PoC)

Minimal operational runbook for PoC deployment:

| Scenario | Action |
|---|---|
| Application not responding | `docker compose restart api` — check `/health` |
| Database connection errors | Check PostgreSQL container logs; verify connection pool settings |
| Calculation produces wrong values | Check seed normative data via `/admin/config`; compare with source XLSX values in §4.2 |
| XLSX export fails | Check Datadog logs for `ApachePOI` or `XSSFWorkbook` exception; verify column mapping in §7.9 |
| All summaries show stale | Trigger `POST /svod/recalculate` as admin; monitor job logs |


## 19. Testing Strategy

### 19.1 Test Pyramid

```
         /\
        /  \   E2E (manual PoC, Playwright post-MVP)
       /----\
      /      \  Integration — RestAssured + Testcontainers
     /--------\
    /          \  Unit — JUnit 5 + Mockito
   /____________\
```

### 19.2 Unit Tests (JUnit 5 + Mockito)

**Scope:** Services, calculation engine, MapStruct mappers, Zod schemas (frontend).

**Mandatory coverage targets (enforced by Jacoco):**

| Package | Line coverage | Branch coverage |
|---|---|---|
| `*.service.calculation.*` | ≥ 95% | ≥ 90% |
| `*.service.*` (other) | ≥ 80% | ≥ 75% |
| `*.mapper.*` | ≥ 80% | — |
| Overall | ≥ 75% | ≥ 70% |

The calculation engine (§6) receives the highest coverage requirement because a calculation error is the primary business risk.

**Key unit test cases:**
- `CalculationServiceTest`: verify ОС, ПС, Видео monthly averages, repair monthly averages, and ИТОГО Числ against the verified reference values from §6.3 and §6.8.
- `RepairCalculationTest`: verify all three threshold bands explicitly (AC-22):
  - `kvo = 3` → `effective_trips = 0`, travel and PZV both zero
  - `kvo = 8` → `effective_trips = 8`, `repair_with_travel_monthly = 136.2`
  - `kvo = 17` → `effective_trips = 10` (cap), `repair_travel = 10 × round_trip_min`
  - `kvo = 5` → boundary: `effective_trips = 0` (at threshold, not above)
  - `kvo = 6` → boundary: `effective_trips = 6` (just above threshold)
  - `kvo = 10` → boundary: `effective_trips = 10` (at cap, not above)
  - `kvo = 11` → boundary: `effective_trips = 10` (one above cap, still capped)
  - `kvo = 0` → `effective_trips = 0`, `repair_work_6months = 0`
- `EngineerWorkloadServiceTest`: verify workload split for 1, 2, and 3 co-engineers; verify load_ratio and status transitions.
- `AggregationServiceTest`: verify branch_load = SUM(object_loads) for test dataset.

**Jacoco Maven configuration:**
```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <executions>
    <execution>
      <id>check</id>
      <goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <element>PACKAGE</element>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.75</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Build fails if coverage drops below threshold. Coverage reports published to GitHub Actions artifacts on every PR.

### 19.3 Integration Tests (Testcontainers + RestAssured)

**Scope:** Repository layer, full HTTP API round-trips, Liquibase migration correctness.

**Testcontainers:** Each integration test class spins up a real PostgreSQL 15 container (and Redis container where needed). Spring `@SpringBootTest` with `webEnvironment = RANDOM_PORT`. Liquibase migrations run automatically on test DB startup — this validates that migration scripts are correct.

**RestAssured test examples:**

```java
// Calculation accuracy integration test
given()
  .auth().oauth2(adminToken)
  .body(referenceObjectEquipmentPayload)
.when()
  .post("/api/v1/objects/{id}/equipment", objectId)
.then()
  .statusCode(200);

given()
  .auth().oauth2(adminToken)
.when()
  .get("/api/v1/objects/{id}/summary", objectId)
.then()
  .statusCode(200)
  .body("data.itogo_chislo_with_travel",
        closeTo(0.032327, 0.000001));  // PAC-01 verified value
```

**Key integration tests:**
- Full calculation pipeline for reference object (PAC-01 value).
- Period isolation: repairs in period A do not appear in period B summary.
- Optimistic lock conflict: simultaneous PUT returns 409 for second writer (MVP).
- Role enforcement: editor cannot write to another division's objects (MVP).
- Liquibase: all migrations apply cleanly to empty DB; rollbacks apply where defined.

### 19.4 WireMock (External API Mocking)

WireMock is configured for any future external integrations (e.g., Datadog API calls in tests, external HR system for engineer import). Not used in PoC — no external API calls in PoC scope. Stub stubs are set up as placeholders in `src/test/resources/wiremock/`.

### 19.5 Frontend Testing

| Tool | Scope |
|---|---|
| Vitest | Unit tests for Zod schemas and utility functions |
| React Testing Library | Component tests for form validation behaviour |
| Manual testing | СВОД table rendering, export download, engineer dashboard |

Playwright E2E tests are post-MVP.

### 19.6 Test Execution in CI

See §20. All unit and integration tests run on every pull request. Build is blocked if:
- Any test fails
- Jacoco coverage drops below threshold
- Liquibase migration fails on clean DB


## 20. CI/CD Pipeline

### 20.1 Platform

GitHub Actions. All workflows defined in `.github/workflows/`.

### 20.2 Workflow: Pull Request (`pr.yml`)

Triggered on: every pull request to `main` or `develop`.

```
Steps:
1. Checkout
2. Set up Java 21 (Temurin)
3. Maven: compile
4. Maven: unit tests (JUnit 5 + Mockito)
5. Maven: integration tests (Testcontainers — requires Docker-in-Docker runner)
6. Jacoco: generate coverage report
7. Jacoco: enforce coverage threshold (build fails if below minimum)
8. Upload coverage report to GitHub Actions artifacts
9. Frontend: npm ci
10. Frontend: TypeScript type check (tsc --noEmit)
11. Frontend: Vitest unit tests
12. Post PR status check (pass/fail)
```

**No Docker build on PRs** — keeps PR feedback fast (target: under 5 minutes).

### 20.3 Workflow: Main Branch (`main.yml`)

Triggered on: push to `main` (after PR merge).

```
Steps:
1–11. All PR steps (full test suite)
12. Docker: build backend image  (tag: git SHA + latest)
13. Docker: build frontend image (tag: git SHA + latest)
14. Docker: push both images to container registry
15. Deploy: SSH to on-premise server, pull new images, docker compose up -d
16. Health check: poll /actuator/health until UP (timeout 60s)
17. Notify: post deployment status to Slack/email
```

### 20.4 Workflow: Nightly (`nightly.yml`)

Triggered on: cron `0 2 * * *` (02:00 UTC daily).

```
Steps:
1. Full test suite (same as PR)
2. OWASP Dependency Check (CVE scan on Maven dependencies)
3. Publish CVE report to GitHub Actions artifacts
4. Alert on new HIGH/CRITICAL CVEs
```

### 20.5 Environment Variables & Secrets

All sensitive values stored as GitHub Actions Secrets:

| Secret | Used by |
|---|---|
| `DD_API_KEY` | Datadog Agent in Docker Compose |
| `POSTGRES_PASSWORD` | PostgreSQL container |
| `JWT_SECRET` | Spring Security JWT signing |
| `REGISTRY_USERNAME` / `REGISTRY_TOKEN` | Docker image push |
| `DEPLOY_SSH_KEY` | SSH to on-premise server |
| `DEPLOY_HOST` | On-premise server address |

Non-sensitive config (port numbers, app version) stored as GitHub Actions Variables (not Secrets).

### 20.6 Container Registry

On-premise Docker registry or GitHub Container Registry (`ghcr.io`). Image naming:

```
ghcr.io/{org}/workload-backend:{git-sha}
ghcr.io/{org}/workload-backend:latest
ghcr.io/{org}/workload-frontend:{git-sha}
ghcr.io/{org}/workload-frontend:latest
```

`latest` tag updated only on `main` branch pushes, not on PRs.

### 20.7 Deployment Docker Compose (Production)

```yaml
version: "3.9"
services:
  backend:
    image: ghcr.io/{org}/workload-backend:latest
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/workload
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      SPRING_REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      DD_API_KEY: ${DD_API_KEY}
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    healthcheck:
      test: ["CMD","curl","-f","http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    image: ghcr.io/{org}/workload-frontend:latest

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: workload
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD","pg_isready","-U","postgres"]

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD","redis-cli","ping"]

  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on: [backend, frontend]

  datadog-agent:
    image: datadog/agent:latest
    environment:
      DD_API_KEY: ${DD_API_KEY}
      DD_LOGS_ENABLED: "true"
      DD_APM_ENABLED: "true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /proc:/host/proc:ro
      - /sys/fs/cgroup:/host/sys/fs/cgroup:ro

volumes:
  pgdata:
```

### 20.8 Rollback Procedure

If the health check in step 16 of `main.yml` fails:

```
1. GitHub Actions marks deployment as failed
2. SSH to server: docker compose up -d --scale backend=0
3. Pull previous image tag (git SHA of last good commit)
4. docker compose up -d
5. Verify /actuator/health returns UP
6. Create GitHub Issue with deployment failure label
```

No automated rollback in PoC — manual procedure above. Automated rollback (blue-green or rolling) is post-MVP.


## 21. Security Hardening

**PoC:** Items marked PoC must be in place before any demo. **MVP:** Items marked MVP ship with the production release. Items marked Post-MVP are deferred.

---

### 21.1 Password Policy (PoC)

Applied to all `users` accounts at creation and password change time. Enforced by Spring Validation on the password DTO field — never validated client-side only.

| Rule | Requirement |
|---|---|
| Minimum length | 12 characters |
| Complexity | At least one uppercase letter, one digit, one special character (`!@#$%^&*`) |
| Maximum length | 128 characters (prevents bcrypt DoS) |
| Common password check | Reject passwords matching a blocklist of top-1000 common passwords |
| Password expiry | No automatic expiry for PoC. 180-day rotation policy enforced in MVP. |
| History | Last 5 passwords may not be reused (MVP) |

Storage: passwords are stored as `bcrypt` hashes with a minimum cost factor of 12. The plaintext password is never logged, never returned in API responses, and cleared from memory immediately after hashing.

---

### 21.2 JWT Strategy (PoC)

#### Token Types

| Token | Lifetime | Storage |
|---|---|---|
| Access token | 15 minutes | In-memory (JavaScript variable, not localStorage) |
| Refresh token | 7 days (PoC) / 24 hours (MVP) | HttpOnly, Secure, SameSite=Strict cookie |

#### Token Contents (access token payload)

```json
{
  "sub": "user-uuid",
  "email": "engineer@bank.by",
  "role": "engineer",
  "division_id": "uuid-or-null",
  "iat": 1700000000,
  "exp": 1700000900
}
```

`division_id` is the editor's scoped division. `null` for admins (all divisions). For engineers, the `role` claim is used to gate write access in Spring Security method security annotations.

#### Token Signing

Algorithm: `HS256` with a 256-bit secret key stored in environment variable `JWT_SECRET`. In MVP, migrate to `RS256` (asymmetric) to allow token verification without sharing the signing key.

#### Refresh Flow (PoC)

```
1. Client sends POST /auth/refresh with HttpOnly cookie
2. Server validates refresh token (not expired, not revoked)
3. Server issues new access token + rotates refresh token
4. Old refresh token is immediately invalidated
```

Refresh token rotation prevents replay attacks — a stolen refresh token can only be used once.

#### Token Revocation (MVP)

Maintain a `revoked_tokens` table (or Redis set) with `jti` (JWT ID) values of explicitly revoked tokens. Check on every request. Tokens are revoked on logout and on password change. For PoC, revocation is not implemented — token expiry (15 min) is the only invalidation mechanism.

---

### 21.3 Account Lockout & Brute-Force Protection (MVP)

| Rule | Value |
|---|---|
| Failed login threshold | 5 consecutive failures within 15 minutes |
| Lockout duration | 15 minutes automatic unlock; admin can unlock immediately |
| Lockout scope | Per account (not per IP — admins can log in from any IP) |
| Lockout storage | `users.locked_until TIMESTAMP NULL` + `users.failed_login_count INTEGER` |
| Reset on success | `failed_login_count` and `locked_until` reset on successful login |
| Admin notification | Email alert when any account is locked (MVP) |

Brute-force at the network level is handled by Bucket4j rate limiting on `/auth/login` (100 req/min per IP, defined in §8.3). Account lockout is the application-level second layer.

---

### 21.4 Encryption at Rest (MVP)

| Layer | Requirement |
|---|---|
| Database volume | Full-disk encryption via OS/hypervisor (LUKS on Linux, dm-crypt). Managed at infrastructure level — not application level. |
| Backup files | Encrypted before transfer to backup storage (GPG symmetric encryption with key stored separately from backup). |
| Application secrets | Never stored in source code or Docker images. Injected via environment variables (`JWT_SECRET`, `POSTGRES_PASSWORD`, `DD_API_KEY`) managed by the deployment system. |
| Sensitive fields | No sensitive personal data beyond `email`, `name`, `password_hash` in current schema. `password_hash` is a one-way hash — not reversible. No additional field-level encryption required for PoC or MVP. |
| TLS | All network communication uses TLS 1.2+ (enforced at Nginx). Internal Docker network communication (backend↔postgres, backend↔redis) runs on an isolated Docker bridge network — not exposed to the host network or external traffic. |

Post-MVP: evaluate column-level encryption for `users.email` using PostgreSQL `pgcrypto` if regulatory requirements change.

---

### 21.5 Field-Level Access Control (MVP)

This is part of the RBAC implementation (M-02). Until MVP RBAC is in place (S-04 simplification), all authenticated users have full read/write access.

In MVP, field-level access rules are:

| Role | Visible data scope | Write scope |
|---|---|---|
| admin | All divisions, all objects, all engineers | Everything |
| editor | Own division only (objects, branches, engineers in their `division_id`) | Own division objects and assignments |
| engineer | All objects they are assigned to + own engineer profile | Записи and Ремонт for their own objects in active period only |
| viewer | All divisions, all objects (read-only) | Nothing |

An engineer cannot see objects in other divisions that they are not assigned to. The `GET /objects` endpoint filters by the calling user's assignments when `role = 'engineer'`. Admin and editor see the full object list (filtered by their division for editors).

---

## 22. Multi-Environment Definition

### 22.1 Environments

| Environment | Purpose | Data | Deployment trigger |
|---|---|---|---|
| **local** | Developer workstation | Synthetic seed data only | `docker compose up` manually |
| **dev** | Shared integration environment | Synthetic data + anonymised subset of prod | Auto-deploy on push to `develop` branch |
| **staging** | Pre-production acceptance | Full anonymised copy of production data | Auto-deploy on push to `main` branch (before prod) |
| **production** | Live system | Real data | Manual approval gate after staging health check |

### 22.2 Environment Configuration

Each environment has its own set of secrets and config values. No environment shares credentials with any other.

```
Environment variables by environment:
  local:    .env file (gitignored) — developer-managed
  dev:      GitHub Actions environment "dev" secrets
  staging:  GitHub Actions environment "staging" secrets
  prod:     GitHub Actions environment "prod" secrets — requires 2 approvers
```

### 22.3 Deployment Flow

```
Developer pushes feature branch
  → PR opened
  → pr.yml runs (unit + integration tests, coverage check)
  → PR reviewed + merged to develop
  → dev deployment (auto)
  → QA verification on dev
  → PR to main created
  → main.yml runs full test suite
  → staging deployment (auto)
  → Acceptance testing on staging (manual)
  → Production deployment approval required (2 approvers in GitHub)
  → prod deployment
  → Health check poll (/actuator/health)
  → Notify
```

### 22.4 Data Anonymisation (Staging)

Before copying production data to staging:
- `users.email` → replace with `user_{id}@test.local`
- `users.name` → replace with `Тестовый Пользователь {N}`
- `users.password_hash` → replace with bcrypt hash of `Test1234!`
- `users.employee_id` → replace with `EMP_{N}`
- Object names and addresses are **not** anonymised — they are functional data used to verify calculations match expected values.

Anonymisation runs as a one-way SQL script before staging restore. Never runs on production.

### 22.5 Environment-Specific Config

| Config key | local | dev | staging | prod |
|---|---|---|---|---|
| `LOG_LEVEL` | DEBUG | INFO | INFO | INFO |
| `JWT_EXPIRY_MINUTES` | 60 | 15 | 15 | 15 |
| `RATE_LIMIT_ENABLED` | false | true | true | true |
| `DD_ENABLED` | false | false | true | true |
| `LIQUIBASE_SEED_DATA` | true | true | false | false (seed once at MVP launch) |

---

## 23. Normative Versioning Policy

### 23.1 Scope

"Normatives" in this context covers:
- `device_system_contexts.r1_minutes` and `r2_minutes`
- `repair_types.time_minutes`
- `app_config` values (MONTHLY_HOURS_FUND, ABSENCE_COEFFICIENT, visit frequencies, thresholds)

### 23.2 PoC Policy (Current)

In PoC and MVP, normatives are not versioned. The `device_system_contexts` and `repair_types` tables contain a single current value. When an admin edits a normative, the change takes effect immediately for the next recalculation. Historical summaries computed before the change remain in `summaries` until recalculation overwrites them.

**What this means for auditing:**
The `audit_log` records *who changed what and when*, but the system does not store *what the previous value produced* once summaries are recalculated. A summary row after recalculation reflects current normatives, not the normatives in effect when the data was originally entered.

This is acceptable for PoC and MVP because:
1. Planning periods (FR-12) provide a form of historical isolation — past period summaries are read-only.
2. The audit_log provides a complete change trail for normative values.
3. The source XLSX values are the normative baseline and are embedded in seed data.

**Risk acknowledged:** If normatives change mid-period, re-triggering recalculation will update summaries for the active period using the new normatives. Division managers may see calculations change after period-end if an admin recalculates. This is a known limitation.

### 23.3 Post-MVP Policy (Normative Versioning)

Post-MVP, implement `device_system_contexts_history` and `repair_types_history` tables:

```sql
-- Tracks normative values with effective date ranges
device_system_contexts_history (
  id                  UUID PK,
  context_id          UUID FK → device_system_contexts.id,
  r1_minutes          DECIMAL(10,4),
  r2_minutes          DECIMAL(10,4),
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,       -- NULL = currently active
  changed_by          UUID FK → users.id,
  changed_at          TIMESTAMP
)
```

With history tables, the calculation engine can be asked: "compute the summary for object X using normatives that were effective on date D" — enabling full historical reproducibility.

The `summaries` table gains a `normatives_snapshot_id` FK once history is implemented, locking each summary row to the exact normative set used to produce it.

**Migration path:** Post-MVP (after M-10 `app_config` admin UI). Not in PoC or MVP scope.

### 23.4 Admin UI Warning for Normative Changes (MVP)

When an admin edits any normative value, the UI displays:

> **⚠ Изменение норматива приведёт к пересчёту {N} объектов при следующем запуске пересчёта. Текущие значения СВОД изменятся. Продолжить?**

Admins must confirm before the change is saved. The confirmation is logged in `audit_log` with the previous and new values.

---

## 24. Calculation Snapshot & Freeze

**Scope: Post-MVP.** The PoC and MVP use on-demand recalculation with no snapshot or freeze concept. This section defines the target design for when approved staffing plans must be locked against further changes.

### 24.1 Business Need

After a 6-month planning period closes, division managers submit staffing figures to HR. These approved figures must be immutable — subsequent normative changes or data corrections must not silently alter the approved numbers. The current system has no mechanism for this.

### 24.2 Snapshot Concept

A **calculation snapshot** is a point-in-time copy of all `summaries` rows for a given period, stored separately from the live `summaries` table:

```sql
summary_snapshots (
  id             UUID PK,
  period_id      UUID FK → periods.id,
  object_id      UUID FK → objects.id,
  snapshot_label VARCHAR(100),   -- e.g. "H1 2025 — Approved by Иванов П.С."
  approved_by    UUID FK → users.id,
  approved_at    TIMESTAMP,
  -- all summaries fields duplicated:
  itogo_chislo_with_travel  DECIMAL(14,10),
  -- ... (all columns from summaries)
)
```

### 24.3 Freeze Flag

A period can be **frozen** by an admin after snapshot creation:

```sql
ALTER TABLE periods ADD COLUMN is_frozen BOOLEAN NOT NULL DEFAULT FALSE;
```

When `is_frozen = TRUE`:
- All `object_repairs` and `records_tasks` for that period are read-only (already enforced by period deactivation).
- The `POST /svod/recalculate` endpoint refuses to recalculate summaries for a frozen period.
- `device_system_contexts` and `app_config` changes still apply to the active period — they do not retroactively affect frozen snapshots.

### 24.4 Approval Workflow

This is post-MVP scope — the workflow is described here to allow the data model to be designed with it in mind.

```
1. Period ends → admin deactivates period (FR-12)
2. Admin triggers final recalculation for the closed period
3. System generates snapshot with all current summaries
4. Division managers review snapshot via /svod?period_id=X
5. Admin freezes period (sets is_frozen = TRUE)
6. СВОД export from frozen snapshot is the official HR submission
7. Any subsequent normative changes do NOT affect frozen snapshot
```

---

## 25. Backup & Disaster Recovery

**Scope: MVP** (before production launch). The PoC runs on a single machine with no formal backup requirement.

### 25.1 Backup Strategy

| Component | Method | Frequency | Retention |
|---|---|---|---|
| PostgreSQL database | `pg_dump` logical backup (custom format) | Daily at 02:00 local time | 30 days rolling |
| PostgreSQL WAL | WAL archiving to backup storage | Continuous (every 5 minutes) | 7 days |
| Redis | `BGSAVE` snapshot | On shutdown / hourly | Last 3 snapshots |
| Application config files (`docker-compose.yml`, `.env.prod`, `nginx.conf`) | Git repository (secrets excluded) | Every commit | Indefinite |
| Docker images | Pushed to container registry on every `main` build | Per build | Last 30 builds |

Redis data is transient (job queue + optional cache) — loss of Redis data causes in-flight recalculation jobs to be lost but no business data is affected. PostgreSQL is the only store of business data.

### 25.2 Backup Storage

Backups are stored on a separate physical host or network share from the application server. For on-premise deployment:

```
/backup/
  postgresql/
    daily/         ← pg_dump files, rotated at 30 days
    wal/           ← WAL archive segments
  scripts/
    backup.sh      ← pg_dump invocation, compression, transfer
    restore.sh     ← restore procedure
```

Backups are encrypted with GPG before transfer (see §21.4). Decryption key stored separately from backup files.

### 25.3 Recovery Objectives

| Metric | Target | Basis |
|---|---|---|
| RPO (Recovery Point Objective) | ≤ 5 minutes | WAL archiving every 5 min |
| RTO (Recovery Time Objective) | ≤ 2 hours | pg_restore + application restart |
| Backup test frequency | Monthly | Restore drill to staging environment |

RPO of 5 minutes means: in a worst-case failure, at most 5 minutes of data changes may need to be re-entered manually. This is acceptable for a planning tool — engineers re-enter repair counts; normative changes are preserved in audit log.

### 25.4 Recovery Procedure

```
Point-in-time recovery using WAL:
1. Stop application containers (docker compose down)
2. Restore base backup from last daily pg_dump:
   pg_restore -d workload /backup/postgresql/daily/workload_YYYYMMDD.dump
3. Apply WAL segments up to target time:
   recovery.conf: recovery_target_time = 'YYYY-MM-DD HH:MM:SS'
4. Start PostgreSQL; verify data integrity
5. Restart application containers
6. Trigger POST /svod/recalculate to refresh any summaries that were stale at backup time
7. Verify /actuator/health returns UP
```

### 25.5 Failure Scenarios and Impact

| Failure | Data impact | Recovery |
|---|---|---|
| Application container crash | None (stateless) | `docker compose restart backend` — 30s |
| Redis crash | In-flight recalculation jobs lost; no business data lost | Restart Redis; trigger `POST /svod/recalculate` to requeue |
| PostgreSQL crash (recoverable) | None if WAL intact | pg_recovery from WAL archive — < 30 min |
| Full server failure | Up to 5 min data loss | Full restore from backup — < 2 hours |
| Accidental bulk delete | Data loss proportional to time since last backup | Restore from backup; apply WAL to point before delete |

### 25.6 PoC Backup Minimum

For PoC (demo environment, no production data):
- Daily manual `pg_dump` to a separate directory before any demo session.
- No WAL archiving required.
- No encryption required (demo data is synthetic).
- RTO/RPO objectives do not apply.


---

*End of Technical Specification — Version 2.8*
