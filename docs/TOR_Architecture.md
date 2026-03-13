# Architectural & Design Decisions

> **Extracted from:** TOR_Workload_WebApp.md v2.11
> **Date:** 2026-03-13
> **Purpose:** This document contains all technology choices, database schemas, API design, infrastructure, deployment, security hardening, and architectural decisions — separated from the pure business logic.
> **Companion document:** [TOR_BusinessLogic.md](file:///d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_BusinessLogic.md)

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Architecture Constraints & Decisions](#2-architecture-constraints--decisions)
3. [API Design](#3-api-design)
4. [Migrations & Data Import](#4-migrations--data-import)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [PoC Scope & Simplifications](#6-poc-scope--simplifications)
7. [Concurrency & Locking](#7-concurrency--locking)
8. [Observability & Monitoring](#8-observability--monitoring)
9. [Testing Strategy](#9-testing-strategy)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Security Hardening](#11-security-hardening)
12. [Multi-Environment Definition](#12-multi-environment-definition)
13. [Normative Versioning Policy](#13-normative-versioning-policy)
14. [Calculation Snapshot & Freeze](#14-calculation-snapshot--freeze)
15. [Backup & Disaster Recovery](#15-backup--disaster-recovery)

---

## 1. Data Model

### 1.1 Entity Relationship Overview

> **Transaction isolation level:** `READ COMMITTED` (PostgreSQL default). `REPEATABLE READ` used inside bulk recalculation batch transactions.

```
Division ──< Branch ──< Object ──────────────────────────────┐
                           │                                  │
           ┌───────────────┼──────────────────┐    object_engineers (join)
           │               │                  │              │
    object_devices   object_system_      records_tasks       │
    (physical qty)   assignments         (Записи)       engineers/users
           │         (maintained qty)              (capacity_fte, home_division)
           │               │                                  │
           └───────┬───────┘                    engineer_summaries (computed)
             device_type_id ──> device_types
                   │                 │
             system_type ──> device_system_contexts
                             (R1/R2 normatives)
           │
    ┌──────┴──────┐
 object_       travel
 repairs
    │
 repair_type_id ──> repair_types

summaries (per-object computed cache)
engineer_summaries (per-engineer computed cache)
```

### 1.2 Tables

#### `divisions`

```sql
id          UUID         PK
name        VARCHAR(255) NOT NULL UNIQUE
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

#### `branches`

```sql
id          UUID         PK
division_id UUID         FK → divisions.id NOT NULL
name        VARCHAR(255) NOT NULL
created_at  TIMESTAMP
updated_at  TIMESTAMP
UNIQUE(division_id, name)
```

#### `objects`

```sql
id                   UUID         PK
branch_id            UUID         FK → branches.id NOT NULL
name                 VARCHAR(500) NOT NULL
import_seq_no        INTEGER
created_at           TIMESTAMP
updated_at           TIMESTAMP
```

#### `device_types`

```sql
id          UUID         PK
name        VARCHAR(255) NOT NULL UNIQUE
description TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

#### `device_system_contexts`

```sql
id             UUID          PK
device_type_id UUID          FK → device_types.id NOT NULL
system_type    VARCHAR(10)   NOT NULL   -- 'ОС' | 'ПС' | 'Видео'
r1_minutes     DECIMAL(10,4) NOT NULL
r2_minutes     DECIMAL(10,4) NOT NULL
created_at     TIMESTAMP
updated_at     TIMESTAMP
UNIQUE(device_type_id, system_type)
```

#### `object_devices` — Physical Inventory

```sql
id                UUID          PK
object_id         UUID          FK → objects.id NOT NULL
device_type_id    UUID          FK → device_types.id NOT NULL
quantity_physical DECIMAL(10,2) NOT NULL DEFAULT 0
updated_at        TIMESTAMP
UNIQUE(object_id, device_type_id)
```

#### `object_system_assignments` — Maintenance Assignments

```sql
id                  UUID          PK
object_id           UUID          FK → objects.id NOT NULL
device_type_id      UUID          FK → device_types.id NOT NULL
system_type         VARCHAR(10)   NOT NULL
quantity_maintained DECIMAL(10,2) NOT NULL DEFAULT 0
context_id          UUID          FK → device_system_contexts.id NOT NULL
                                  -- ON DELETE RESTRICT
updated_at          TIMESTAMP
UNIQUE(object_id, device_type_id, system_type)
```

#### `records_tasks`

```sql
id                  UUID          PK
object_id           UUID          FK → objects.id NOT NULL
period_id           UUID          FK → periods.id NOT NULL
access_requests     DECIMAL(10,2) NOT NULL DEFAULT 0
monitoring_requests DECIMAL(10,2) NOT NULL DEFAULT 0
footage_requests    DECIMAL(10,2) NOT NULL DEFAULT 0
backup_control      DECIMAL(10,2) NOT NULL DEFAULT 0
security_admin      DECIMAL(10,2) NOT NULL DEFAULT 0
updated_at          TIMESTAMP
UNIQUE(object_id, period_id)
```

#### `repair_types`

```sql
id           UUID          PK
name         VARCHAR(255)  NOT NULL UNIQUE
time_minutes DECIMAL(10,2) NOT NULL
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

#### `object_repairs`

```sql
id             UUID    PK
object_id      UUID    FK → objects.id NOT NULL
repair_type_id UUID    FK → repair_types.id NOT NULL -- ON DELETE RESTRICT
period_id      UUID    FK → periods.id NOT NULL
count          INTEGER NOT NULL DEFAULT 0
updated_at     TIMESTAMP
UNIQUE(object_id, repair_type_id, period_id)
```

#### `travel`

```sql
id               UUID          PK
object_id        UUID          FK → objects.id UNIQUE NOT NULL
transport_type   VARCHAR(100)
distance_km      DECIMAL(8,2)  NOT NULL DEFAULT 0
one_way_time_min DECIMAL(8,2)  NOT NULL DEFAULT 0
updated_at       TIMESTAMP
```

#### `periods` — Planning Periods

```sql
id          UUID         PK
name        VARCHAR(50)  NOT NULL UNIQUE
start_date  DATE         NOT NULL
end_date    DATE         NOT NULL
is_active   BOOLEAN      NOT NULL DEFAULT FALSE
created_at  TIMESTAMP
updated_at  TIMESTAMP
CHECK (end_date > start_date)
-- Partial unique index:
CREATE UNIQUE INDEX one_active_period ON periods (is_active) WHERE is_active = TRUE;
```

#### `app_config`

```sql
key         VARCHAR(100) PK
value       VARCHAR(255) NOT NULL
description TEXT
updated_at  TIMESTAMP
updated_by  UUID         FK → users.id
```

#### `summaries` — Computed Cache

```sql
id                         UUID           PK
object_id                  UUID           FK → objects.id UNIQUE NOT NULL
os_r1_per_visit            DECIMAL(10,4)
os_r2_per_visit            DECIMAL(10,4)
ps_r1_per_visit            DECIMAL(10,4)
ps_r2_per_visit            DECIMAL(10,4)
video_r1_per_visit         DECIMAL(10,4)
video_r2_per_visit         DECIMAL(10,4)
r1_per_visit_total         DECIMAL(10,4)
r2_per_visit_total         DECIMAL(10,4)
os_monthly_avg             DECIMAL(10,4)
ps_monthly_avg             DECIMAL(10,4)
video_monthly_avg          DECIMAL(10,4)
records_6months            DECIMAL(10,4)
records_monthly            DECIMAL(10,4)
total_repairs              INTEGER
repair_work_6months        DECIMAL(10,4)
repair_travel_6months      DECIMAL(10,4)
repair_pzv_6months         DECIMAL(10,4)
repair_no_travel_monthly   DECIMAL(10,4)
repair_with_travel_monthly DECIMAL(10,4)
round_trip_min             DECIMAL(10,4)
pzv_minutes                DECIMAL(10,4)
total_no_travel_min        DECIMAL(10,4)
itogo_chislo_no_travel     DECIMAL(14,10)
total_with_travel_min      DECIMAL(10,4)
itogo_chislo_with_travel   DECIMAL(14,10)
period_id                  UUID            FK → periods.id
is_stale                   VARCHAR(20)     NOT NULL DEFAULT 'FALSE'
                                           -- 'FALSE' | 'TRUE' | 'PROCESSING'
computed_at                TIMESTAMP
```

#### `users`

```sql
id               UUID          PK
email            VARCHAR(255)  NOT NULL UNIQUE
name             VARCHAR(255)
role             VARCHAR(20)   NOT NULL DEFAULT 'viewer'
                               -- 'admin' | 'editor' | 'viewer' | 'engineer'
division_id      UUID          FK → divisions.id NULL
home_division_id UUID          FK → divisions.id NULL
capacity_fte     DECIMAL(4,2)  NOT NULL DEFAULT 1.0 CHECK (capacity_fte > 0)
employee_id      VARCHAR(100)  NULL
is_active        BOOLEAN       NOT NULL DEFAULT TRUE
requires_activation BOOLEAN    NOT NULL DEFAULT FALSE
password_hash    VARCHAR(255)
failed_login_count INTEGER     NOT NULL DEFAULT 0     -- MVP
locked_until     TIMESTAMP     NULL                   -- MVP
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

#### `object_engineers`

```sql
id          UUID      PK
object_id   UUID      FK → objects.id NOT NULL
engineer_id UUID      FK → users.id   NOT NULL
assigned_at TIMESTAMP NOT NULL DEFAULT now()
assigned_by UUID      FK → users.id   NULL
UNIQUE(object_id, engineer_id)
```

#### `engineer_summaries`

```sql
id                    UUID          PK
engineer_id           UUID          FK → users.id UNIQUE NOT NULL
total_load            DECIMAL(14,10)
object_count          INTEGER
os_load               DECIMAL(14,10)
ps_load               DECIMAL(14,10)
video_load            DECIMAL(14,10)
records_load          DECIMAL(14,10)
repair_load           DECIMAL(14,10)
capacity_fte          DECIMAL(4,2)
load_ratio            DECIMAL(10,6)
status                VARCHAR(20)     -- 'normal' | 'warning' | 'overloaded'
is_stale              VARCHAR(20)     NOT NULL DEFAULT 'FALSE'
computed_at           TIMESTAMP
```

#### `audit_log`

```sql
id          UUID         PK
user_id     UUID         FK → users.id
table_name  VARCHAR(100)
record_id   UUID
action      VARCHAR(20)  -- 'CREATE'|'UPDATE'|'DELETE'
old_value   JSONB
new_value   JSONB
created_at  TIMESTAMP
```

### 1.3 Indexing Strategy

See full index definitions in TOR §5.3: mandatory indexes for PoC, unique indexes, and MVP-only indexes (including GIN for full-text search and audit log indexes).

An `IndexUsageTest` must run `EXPLAIN ANALYZE` on top query patterns and assert no `Seq Scan` on tables with >100 rows.

---

## 2. Architecture Constraints & Decisions

### 2.1 Technology Stack

#### Backend

| Component   | Choice                      | Notes                                |
| ----------- | --------------------------- | ------------------------------------ |
| Runtime     | Java 21 (LTS)               | Virtual threads available            |
| Framework   | Spring Boot 3.x             | Auto-configuration                   |
| REST        | Spring Web (MVC)            | Standard REST controllers            |
| Persistence | Spring Data JPA (Hibernate) | `BigDecimal` for precision           |
| Security    | Spring Security + JWT       | Stateless JWT; refresh tokens in MVP |
| Validation  | Spring Validation (Jakarta) | Bean validation on DTOs              |
| Metrics     | Spring Boot Actuator        | Health, metrics, prometheus          |
| Build       | Maven                       | Multi-module for PoC→MVP             |
| DTO mapping | MapStruct                   | Compile-time mapping                 |
| Boilerplate | Lombok                      | Optional per class                   |
| Logging     | log4j2                      | JSON layout, SLF4J facade            |
| XLSX        | Apache POI                  | Read/write                           |

#### Database & Migrations

| Component  | Choice     |
| ---------- | ---------- |
| Database   | PostgreSQL |
| Migrations | Liquibase  |

#### Caching & Async

| Component       | Choice                       | Notes                                     |
| --------------- | ---------------------------- | ----------------------------------------- |
| Cache + Queue   | Redis                        | Job queue (primary), response cache (MVP) |
| Job integration | Spring Data Redis / Redisson |                                           |

#### Frontend

| Component     | Choice                              |
| ------------- | ----------------------------------- |
| Framework     | React 18 + TypeScript               |
| Build         | Vite                                |
| Routing       | React Router v6                     |
| Server state  | TanStack Query                      |
| Client state  | Zustand (PoC) / Redux Toolkit (MVP) |
| UI components | Material UI (MUI) v5+               |
| HTTP          | Axios                               |
| Forms         | React Hook Form + Zod               |

#### Testing

| Tool                        | Scope                 |
| --------------------------- | --------------------- |
| JUnit 5                     | Unit tests            |
| Mockito                     | Mock dependencies     |
| Testcontainers (PostgreSQL) | Integration tests     |
| RestAssured                 | API integration tests |
| WireMock                    | External API mocking  |
| Jacoco                      | Coverage reports      |

#### Infrastructure

| Component        | Choice                                 |
| ---------------- | -------------------------------------- |
| Containerisation | Docker                                 |
| Orchestration    | Docker Compose (5 containers)          |
| Reverse proxy    | Nginx (TLS, static serving, API proxy) |
| CI/CD            | GitHub Actions                         |
| APM              | Datadog                                |
| Rate limiting    | Bucket4j                               |

### 2.2 Architectural Decisions

**AD-01: Equipment schema is fully dynamic.** No fixed equipment tables. Adding a device type requires only DB inserts — zero migrations, zero code changes.

**AD-02: Normatives live on (device, system_type) context pairs.** `device_system_contexts` is the normatives store. No flat "normatives" table.

**AD-03: System type determines visit frequency, not device type.**

**AD-04: Physical and maintained quantities are independent.** Never auto-derived from each other.

**AD-05: Context deletion with active assignments is hard-blocked.** `ON DELETE RESTRICT` FK + API 409 guard.

**AD-06: Repair types are a catalog, not hardcoded columns.**

**AD-07: All calculations are server-side only.** Frontend never computes workload values.

**AD-08: Summaries use explicit staleness tracking.** `is_stale` set synchronously on write, cleared on recalculation.

**AD-09: Config values are read from `app_config` at compute time.** Not cached for process lifetime.

**AD-10: Engineers are users, not a separate entity.** One `users` table with `role = 'engineer'`.

**AD-11: Engineer workload split ratio is always computed, never stored.**

**AD-12: Engineer summaries depend on object summaries.** Background worker must process object summaries before engineer summaries.

**AD-13: Soft delete for engineers.** `is_active BOOLEAN` — inactive engineers hidden from dropdowns but historical data preserved.

**AD-14: Recalculation is on-demand, not event-driven.** Admin triggers explicitly. Post-MVP may move to automatic.

**AD-15: Period is the unit of data versioning for operational data.** Equipment, travel, assignments are current-state only.

**AD-16: Travel time is per-object, manually entered.** Not computed from coordinates.

**AD-17: Redis scope is job queue first, cache second.** No business data in Redis. Graceful degradation if Redis unavailable.

**AD-18: All API responses go through DTOs.** MapStruct compile-time mappers. JPA entities never serialised to JSON directly.

**AD-19: Monolith for PoC and MVP.** Single service. Decompose only if engineer module grows post-MVP.

---

## 3. API Design

### 3.1 Base URL

```
/api/v1
```

### 3.2 Endpoints

#### Objects
```
GET    /objects                        List (paginated, filterable)
POST   /objects                        Create
GET    /objects/:id                    Get metadata
PUT    /objects/:id                    Update metadata
DELETE /objects/:id                    Delete
GET    /objects/:id/summary            Get computed summary
```

#### Physical Inventory
```
GET    /objects/:id/devices            List physical devices
POST   /objects/:id/devices            Add device
PUT    /objects/:id/devices/:dtid      Update physical quantity
DELETE /objects/:id/devices/:dtid      Remove (cascades assignments)
```

#### System Assignments
```
GET    /objects/:id/assignments        List all assignments
POST   /objects/:id/assignments        Create assignment
PUT    /objects/:id/assignments/:aid   Update quantity_maintained
DELETE /objects/:id/assignments/:aid   Remove assignment
```

#### Records, Repairs, Travel
```
GET    /objects/:id/records            Get records task quantities
PUT    /objects/:id/records            Update
GET    /objects/:id/repairs            List repair counts per type
PUT    /objects/:id/repairs/:rtid      Set count for one repair type
GET    /objects/:id/travel             Get travel data
PUT    /objects/:id/travel             Update
```

#### Device Catalog
```
GET    /catalog/devices                List all device types
POST   /catalog/devices                Create device type
GET    /catalog/devices/:id            Get with all system contexts
PUT    /catalog/devices/:id            Update name/description
DELETE /catalog/devices/:id            Delete (blocked if in use)
GET    /catalog/devices/:id/contexts   List system contexts
POST   /catalog/devices/:id/contexts   Add context
PUT    /catalog/devices/:id/contexts/:cid  Update r1/r2
DELETE /catalog/devices/:id/contexts/:cid  Delete (blocked if in use; 409)
```

#### Repair Type Catalog
```
GET    /catalog/repairs                List all repair types
POST   /catalog/repairs                Create
PUT    /catalog/repairs/:id            Update
DELETE /catalog/repairs/:id            Delete (blocked if in use; 409)
```

#### СВОД & Summary
```
GET    /svod                           All summaries (paginated)
GET    /svod/export/xlsx               Export to XLSX
GET    /svod/export/pdf                Export to PDF
```

#### App Configuration & Periods
```
GET    /admin/config                   List all config keys/values
PUT    /admin/config/:key              Update value
GET    /admin/audit                    Audit log
GET    /admin/periods                  List all periods
POST   /admin/periods                  Create period
PUT    /admin/periods/:id/activate     Set as active period
GET    /admin/periods/active           Get active period
```

#### Recalculation
```
POST   /svod/recalculate               Trigger full recalculation (admin)
POST   /svod/recalculate/:object_id    Recalculate one object (admin)
GET    /svod/recalculate/status        Check background job status
```

#### Engineers
```
GET    /engineers                       List all engineers (paginated)
POST   /engineers                       Create engineer (admin)
GET    /engineers/:id                   Get with summary
PUT    /engineers/:id                   Update (admin)
DELETE /engineers/:id                   Deactivate (admin)
GET    /engineers/:id/summary           Get engineer_summaries
GET    /engineers/:id/objects           List assigned objects
POST   /engineers/:id/objects           Assign object
DELETE /engineers/:id/objects/:oid      Remove assignment
```

#### Object-Engineer Assignments (from object side)
```
GET    /objects/:id/engineers           List engineers at object
POST   /objects/:id/engineers           Assign engineer
DELETE /objects/:id/engineers/:eid      Remove assignment
```

#### Coverage & Aggregations
```
GET    /coverage/gaps                   Objects with zero engineers
GET    /aggregations/company            Company-wide totals
GET    /aggregations/divisions          All divisions summary
GET    /aggregations/divisions/:id      Single division detail
GET    /aggregations/branches           All branches summary
GET    /aggregations/branches/:id       Single branch detail
```

#### Import / Export / Auth
```
POST   /import/data                     Upload JSON; returns preview
POST   /import/data/confirm             Execute confirmed import
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

### 3.3 Response Format

```json
{ "data": { ... }, "meta": { "page": 1, "total": 2935, "per_page": 100 }, "error": null }
```

Error format:
```json
{ "data": null, "error": { "code": "...", "message": "...", "affected_count": 42 } }
```

---

## 4. Migrations & Data Import

### 4.1 Import Payload Structure

JSON payload with keys: `device_types`, `device_system_contexts`, `repair_types`, `objects` (with nested equipment, records, repairs, travel).

### 4.2 Import Processing Steps

1. Upsert device types and system contexts
2. Upsert repair types
3. Create Division → Branch → Object hierarchy (dedup by name)
4. Create equipment (object_devices + object_system_assignments)
5. Populate records_tasks and object_repairs
6. Populate travel
7. Return validation report
8. Queue bulk recalculation

**Engineer resolution:** Name matching creates placeholder accounts for unresolved names.

**Alternative:** Plain text list import via separate calls per entity type.

### 4.3 Database Migrations (Liquibase)

```
db/changelog/
  db.changelog-master.xml
  changes/
    v1.0.0-initial-schema.xml    ← PoC schema
    v1.1.0-periods.xml           ← MVP: planning periods
    v1.2.0-rbac.xml              ← MVP: roles, division scoping
    v1.3.0-app-config.xml        ← MVP: app_config table
```

Liquibase runs on startup. Seed data loaded as Liquibase changesets.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- СВОД page (100 rows) loads in <3 seconds
- Single object recalculation in <200ms
- Bulk recalculation of 2,935 objects in <60 seconds
- Engineer detail page <2 seconds for 500 assigned objects

### 5.2 Scalability

- Up to 10,000 objects and 500 device types
- Up to 500 engineers and 50 concurrent users

### 5.3 Security

- Authentication required for all routes except `/login` and `/actuator/health`
- HTTPS (TLS) only in production (Nginx)
- JWT-based stateless authentication
- Input validation via Spring Validation
- Rate limiting: Bucket4j (100 req/min unauthenticated, 300 req/min authenticated)
- All audit-worthy changes written to `audit_log`

### 5.4 Data Integrity

- `ON DELETE RESTRICT` on context and repair type FKs
- `is_stale` set in same transaction as data change
- Engineer summaries must wait for dependent object summaries

### 5.5 Availability

- 99% uptime during business hours (08:00–20:00 Mon–Fri)

### 5.6 Browser Support

- Chrome, Firefox, Edge — latest two major versions
- Minimum resolution: 1280×768

---

## 6. PoC Scope & Simplifications

### 6.1 Purpose

Demonstrate correct ИТОГО Числ calculation per object and per engineer. Minimum build to prove core value proposition.

### 6.2 PoC Simplifications

| ID   | Simplification                  | Full TOR behaviour                           | MVP milestone |
| ---- | ------------------------------- | -------------------------------------------- | ------------- |
| S-02 | Synchronous recalculation       | is_stale + background worker + admin trigger | M-06          |
| S-03 | Static normatives (no admin UI) | Admin-editable catalogs                      | M-04, M-05    |
| S-04 | No access control enforcement   | Full RBAC with division scoping              | M-02          |
| S-05 | No planning periods             | Period-scoped repairs/records                | M-01          |
| S-06 | Manual data entry (no import)   | JSON/text import                             | M-01          |
| S-07 | No audit log                    | Full auditing                                | M-08          |
| S-08 | No PDF export                   | PDF export                                   | M-09          |
| S-09 | No concurrency/locking          | Optimistic locking                           | M-11          |

### 6.3 PoC Data Model

Simplified schema — strict subset of MVP. No columns dropped at migration, only added.

**MVP-only columns excluded from PoC:**
- `failed_login_count`, `locked_until` on `users`
- `period_id` on `records_tasks`, `object_repairs`
- `is_stale`, `period_id` on `summaries`, `engineer_summaries`

### 6.4 PoC → MVP Migration Path

| ID   | Item                                 | Depends on | Priority |
| ---- | ------------------------------------ | ---------- | -------- |
| M-01 | Import (JSON/text)                   | —          | Highest  |
| M-02 | RBAC                                 | M-01       |          |
| M-04 | Device catalog UI                    | M-02       |          |
| M-05 | Repair type catalog UI               | M-02       |          |
| M-06 | Staleness + background recalculation | M-02       |          |
| M-07 | Planning periods                     | M-01, M-06 |          |
| M-08 | Audit log                            | M-02       |          |
| M-09 | Concurrency/locking                  | M-06       |          |
| M-10 | `app_config` table + admin UI        | M-02       |          |
| M-11 | PDF export                           | —          | Post-MVP |

### 6.5 PoC Technology Stack

Full production stack — no throwaway code. Same Java/Spring Boot/React/PostgreSQL stack as MVP.

**PoC differences:** No Redis (synchronous recalc), JWT access tokens only (no refresh), basic rate limiting, no audit log.

### 6.6 PoC Docker Compose

```yaml
services:
  backend:  # Spring Boot JAR, port 8080
  frontend: # Nginx serving Vite build, port 3000
  postgres: # PostgreSQL 15, port 5432
  nginx:    # Reverse proxy: / → frontend, /api → backend
```

---

## 7. Concurrency & Locking

**Scope: MVP** (PoC uses last-write-wins).

### 7.1 Strategy: Optimistic Locking via `updated_at`

Client sends `updated_at` value. Server checks match before applying update. Mismatch → HTTP 409 EDIT_CONFLICT.

### 7.2 Tables Covered

All writable user-facing tables. `summaries` and `engineer_summaries` are excluded (written by background worker only).

### 7.3 Transaction Boundaries

Atomic operations: equipment save + recalc trigger, engineer assignment + stale marking, period activation, bulk import, normative update + stale marking.

### 7.4 Background Worker Isolation

Worker claims batch with `SELECT ... FOR UPDATE SKIP LOCKED`, sets `is_stale = 'PROCESSING'`. Watchdog resets stuck PROCESSING → TRUE after 5 min timeout.

---

## 8. Observability & Monitoring

### 8.1 PoC Tier

- **Structured logging:** log4j2 with `JsonTemplateLayout` to stdout. MDC-injected `request_id` and `user_id`.
- **Health endpoint:** Spring Actuator `/actuator/health` with PostgreSQL and disk checks.
- **Datadog integration:** Agent as Docker Compose sidecar. Log aggregation + JVM/HTTP metrics via Micrometer.
- **Error alerting:** Datadog alert on `status:error` logs. Email notification.

### 8.2 MVP Tier

- Full APM tracing (Datadog Java agent)
- Performance thresholds and alerting (p95 latency, error rates, job durations)
- Database monitoring (slow queries, connection pool, table bloat)
- Background job failure alerting
- 90-day log retention in production

---

## 9. Testing Strategy

### 9.1 Test Pyramid

- **Unit:** JUnit 5 + Mockito (services, calculation engine, mappers)
- **Integration:** Testcontainers + RestAssured (repository layer, API round-trips, migration correctness)
- **E2E:** Manual for PoC, Playwright post-MVP

### 9.2 Coverage Targets (Jacoco)

| Package                   | Line coverage | Branch coverage |
| ------------------------- | ------------- | --------------- |
| `*.service.calculation.*` | ≥ 95%         | ≥ 90%           |
| `*.service.*` (other)     | ≥ 80%         | ≥ 75%           |
| `*.mapper.*`              | ≥ 80%         | —               |
| Overall                   | ≥ 75%         | ≥ 70%           |

### 9.3 Frontend Testing

- Vitest for unit tests (Zod schemas, utilities)
- React Testing Library for component tests
- Manual testing for СВОД table, export, engineer dashboard

---

## 10. CI/CD Pipeline

### 10.1 PR Workflow (`pr.yml`)

Compile → unit tests → integration tests (Testcontainers) → Jacoco coverage check → frontend type check + Vitest. Target: <5 minutes.

### 10.2 Main Branch Workflow (`main.yml`)

All PR steps + Docker image build → push to registry → deploy via SSH → health check → notify.

### 10.3 Nightly (`nightly.yml`)

Full test suite + OWASP Dependency Check (CVE scan).

### 10.4 Secrets

`DD_API_KEY`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `REGISTRY_USERNAME/TOKEN`, `DEPLOY_SSH_KEY/HOST` — GitHub Actions Secrets.

### 10.5 Rollback Procedure

Manual: scale down → pull previous image → compose up → verify health.

---

## 11. Security Hardening

### 11.1 Password Policy (PoC)

- Min 6 characters, uppercase + digit + special character required
- Max 128 characters (bcrypt DoS prevention)
- Common password blocklist
- bcrypt with cost factor ≥ 12

### 11.2 JWT Strategy

- Access token: 15 min, in-memory storage
- Refresh token: 24 hours, HttpOnly cookie (MVP only)
- HS256 signing (migrate to RS256 in MVP)
- Token rotation on refresh; immediate invalidation of old refresh token

### 11.3 Account Lockout (MVP)

5 consecutive failures → 15 min lockout. Per account, not per IP.

### 11.4 Encryption at Rest (MVP)

- Full-disk encryption (LUKS/dm-crypt)
- GPG-encrypted backups
- TLS 1.2+ for all network communication
- Isolated Docker bridge network for internal communication

### 11.5 Field-Level Access Control (MVP)

Role-based data scoping: admin (all), editor (own division), engineer (own objects), viewer (read-only all).

---

## 12. Multi-Environment Definition

| Environment | Purpose               | Data                          | Deployment                    |
| ----------- | --------------------- | ----------------------------- | ----------------------------- |
| local       | Developer workstation | Synthetic seed                | Manual docker compose         |
| dev         | Shared integration    | Synthetic + anonymised subset | Auto on push to `develop`     |
| staging     | Pre-production        | Full anonymised copy          | Auto on push to `main`        |
| production  | Live                  | Real data                     | Manual approval (2 approvers) |

Data anonymisation applied to staging copies (email, name, password replaced; object data preserved).

---

## 13. Normative Versioning Policy

**PoC/MVP:** Not versioned. Single current value. Audit log tracks changes but summaries reflect current normatives after recalculation.

**Post-MVP:** `device_system_contexts_history` table with `effective_from`/`effective_to` dates for full historical reproducibility.

---

## 14. Calculation Snapshot & Freeze

**Scope: Post-MVP.** `summary_snapshots` table for point-in-time copies. `is_frozen` flag on periods prevents recalculation of frozen periods.

---

## 15. Backup & Disaster Recovery

**Scope: MVP** (PoC: manual pg_dump before demos).

### 15.1 Strategy

- PostgreSQL: daily `pg_dump` + continuous WAL archiving (5-min intervals)
- Redis: hourly BGSAVE (transient data only)
- Docker images: pushed to registry per build

### 15.2 Recovery Objectives

| Metric                | Target      |
| --------------------- | ----------- |
| RPO                   | ≤ 5 minutes |
| RTO                   | ≤ 2 hours   |
| Backup test frequency | Monthly     |

### 15.3 Recovery Procedure

Base backup restore → WAL replay to target time → restart application → trigger recalculation → verify health.

---

_End of Architectural & Design Decisions_
