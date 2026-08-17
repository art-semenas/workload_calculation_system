# PoC Scope

> Extracted from TOR_Workload_WebApp.md §15. TOR is the source of truth.
> Last sync: TOR v2.26 (2026-03-26)

## What PoC Is

The PoC has one goal: **demonstrate that the web application correctly calculates ИТОГО Числ per object and per engineer**, verifiable by manual spot-checking against the source Excel file. It is the minimum build that proves the core value proposition to stakeholders and justifies full MVP investment.

PoC is **not** a stripped-down MVP. It is a focused validator. Some simplifications will be reversed in MVP — these are explicitly documented below so developers build with the migration in mind.

## What Is in PoC (§15.2)

#### Core (non-negotiable for PoC)

| Feature                 | Notes                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual data entry**   | Create objects, enter equipment, repairs, records, travel via UI. For demo purposes, a representative subset of objects (~20–50 from different divisions) is entered manually — not all 2,934. Full import is MVP (see S-06). |
| **Calculation engine**  | Full calculation: ОС, ПС, Видео, Записи, Ремонт, Дорога → ИТОГО Числ. All formulas from §6.                                                                                                                                   |
| **СВОД table**          | Paginated table matching all 19 source columns.                                                                                                                                                                               |
| **СВОД export to XLSX** | Export matching original template structure. Stakeholders verify spot-checked rows against source file.                                                                                                                       |
| **Object detail page**  | View and edit equipment quantities, repairs, records, travel.                                                                                                                                                                 |
| **Engineer module**     | Engineers as users, object-engineer assignments, workload split, capacity, load ratio, overload status, engineer dashboard. Full §4.10–4.11, §6.12–6.14, §7.4–7.7.                                                            |
| **Aggregation layer**   | Branch, division, company-wide required FTE totals. All computed on the fly (§16).                                                                                                                                            |
| **Basic dashboard**     | Required FTE by division, top objects by workload, coverage gaps.                                                                                                                                                             |
| **Authentication**      | Login / logout. Single role — all authenticated users can read and write.                                                                                                                                                     |
| **Seed normatives**     | Device catalog and repair types loaded as migration seed data. Values from source XLSX.                                                                                                                                       |
| **Basic observability** | Structured logging (JSON to stdout), health endpoint (`/actuator/health`). Job failure alerting via Datadog is MVP (§18.2).                                                                                                   |

## PoC Simplifications (S-xx)

**~~S-01: Flat equipment model — no physical inventory layer~~ (REMOVED in v2.9)**

The PoC now uses the full MVP two-layer equipment model (`object_devices` + `object_system_assignments`) from the start. This eliminates a costly data migration at MVP transition and allows the PoC to validate the two-layer UI and API directly. Physical qty defaults to equal maintained qty at data entry time; editors can adjust `quantity_physical` independently.

_No longer a simplification — M-03 removed from migration path._

**S-02: Synchronous recalculation on save — no staleness tracking**

Full TOR: `is_stale` flag + on-demand background job triggered by admin.

PoC: recalculates object summary synchronously when any of its data is saved (~5ms per object). No background worker, no `is_stale` column, no admin trigger button.

_Reversed in:_ M-06 (MVP)

**S-03: Static normatives — no admin UI for catalog**

Full TOR: admin-editable device types, system contexts, and repair types via UI.

PoC: normatives loaded as migration seed data. No UI to add, edit, or delete device types, contexts, or repair types. Calculation uses seed values directly.

_Reversed in:_ M-04, M-05 (MVP)

**S-04: No division scoping — roles exist but no access restriction**

Full TOR: admin, editor, engineer, viewer roles with division scoping and field-level access control.

PoC: the `role` column exists on `users` and is set correctly (e.g., `'engineer'`, `'admin'`), enabling the engineer module to distinguish engineers from other users. However, **no role-based access control is enforced** — all authenticated users can read and write all data regardless of role. Division-scoped editor restrictions and engineer read-only constraints are not implemented. This provides the data foundation for role-based filtering (engineer lists, assignment logic) without the complexity of access control enforcement.

_Reversed in:_ M-02 (MVP) — adds division scoping for editors, read-only enforcement for viewers, and field-level restrictions for engineers.

> **Note on `is_active` filtering (AD-18):** Filtering `is_active = FALSE` engineers from assignment dropdowns is **not** an RBAC feature and is **not** covered by this simplification. It is a UI data-filtering concern — ensuring only active engineers appear as selectable options in assignment dropdowns — and **must** be implemented in PoC. See AD-18 and C-24.

> **New division/branch endpoints and S-04:** The write endpoints `POST /divisions`, `POST /divisions/:id/branches`, `PUT /divisions/:id`, and `PUT /branches/:id` are unenforced in PoC — any authenticated user may call them. The read endpoints `GET /divisions`, `GET /divisions/:id`, `GET /divisions/:id/branches`, and `GET /branches/:id` follow the same rule as all other GETs in PoC: any authenticated user may read freely. The `DELETE /divisions/:id` and `DELETE /branches/:id` endpoints are not available in PoC. Admin-only restriction and editor division-scoping apply from M-02.

**S-05: No planning periods**

Full TOR: `periods` table; repairs and records are period-scoped.

PoC: one `object_repairs` row per (object, repair_type), one `records_tasks` row per object — no period FK.

_Reversed in:_ M-07 (MVP)

**S-06: JSON bulk import is manual — import via UI is MVP**

Full TOR: JSON bulk import of data converted from the source XLSX workbook.

PoC: all data entered manually through the UI. For demo purposes, a representative subset of objects (~20–50 from different divisions) is entered, not all 2,934. Full import is the first MVP milestone.

_Reversed in:_ M-01 (MVP) — this is the highest-priority MVP item since 2,934 rows of manual entry is not viable for production.

> **Priority revised (2026-08-14).** The rationale above — that manual entry of 2 934 objects blocks adoption — no longer holds: the full dataset is loaded by the `demo-data` seed changesets (`v1.0.6`, `v1.0.9`), so the system is usable and demonstrable with real data today. M-01 is still required, because Liquibase changesets are not a production import path and users need a repeatable way to load new periods, but it is no longer the precondition for everything else. This matches the workstream C plan ordering, which places import at `ws-c-09` / `ws-c-10` rather than first. Sequence M-01 on its own merits alongside the other MVP milestones.

**S-07: No audit log**

Full TOR: changes to normatives, config, and assignments are audited.

PoC: no audit log.

_Reversed in:_ M-08 (MVP)

**S-08: No PDF export**

PoC exports СВОД to XLSX only.

_Reversed in:_ M-11 (post-MVP)

**S-09: No concurrency/locking**

Full TOR: optimistic locking with `updated_at` version check (§17).

PoC: last-write-wins. Acceptable with 1–2 demo users.

_Reversed in:_ M-09 (MVP)

**S-10: No object inventory XLSX export**

Full TOR: `GET /objects/:id/export/xlsx` exports per-object equipment inventory, records, repairs, and travel to XLSX.

PoC: this endpoint is not implemented. СВОД XLSX export (`GET /svod/export/xlsx`) is available in PoC; object-level export is out of scope.

_Reversed in:_ M-12 (MVP)

## Milestones

Items are ordered by dependency. M-01 is the highest priority because manual entry of 2,934 objects is not viable for production use.

| ID       | Item                                            | Depends on | Notes                                                                                        |
| -------- | ----------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| M-01     | JSON bulk import (FR bulk)                      | —          | Highest priority. Resolves S-06. Includes engineer name resolution and placeholder accounts. |
| M-02     | RBAC — admin, editor, engineer, viewer roles    | M-01       | Resolves S-04. Division scoping for editors.                                                 |
| ~~M-03~~ | ~~Physical inventory layer (`object_devices`)~~ | —          | ~~Resolves S-01.~~ Moved into PoC scope (v2.9). No migration needed.                         |
| M-04     | Device catalog management UI                    | M-02       | Resolves S-03 (devices). Admin-only.                                                         |
| M-05     | Repair type catalog management UI               | M-02       | Resolves S-03 (repairs). Admin-only.                                                         |
| M-06     | Staleness tracking + on-demand recalculation    | M-02       | Resolves S-02. Background worker, `is_stale`, admin trigger.                                 |
| M-07     | Planning periods (FR-12)                        | M-01, M-06 | Resolves S-05. Period selector in UI, period lock.                                           |
| M-08     | Audit log                                       | M-02       | Resolves S-07.                                                                               |
| M-09     | Concurrency / optimistic locking                | M-06       | Resolves S-09. `updated_at` version check on writes.                                        |
| M-10     | `app_config` table with admin UI                | M-02       | Move hardcoded constants to DB.                                                              |
| M-11     | PDF export                                      | —          | Resolves S-08. Post-MVP.                                                                     |
| M-12     | Object inventory XLSX export                    | M-02       | Resolves S-10. Adds `GET /objects/:id/export/xlsx`; RBAC enforced (editor, admin only).      |

## PoC Database Schema (§15.4)

Simplified schema — replaces the full §5 schema for PoC only. Designed as a strict subset: no columns are dropped when migrating to MVP, only new tables and columns are added.

```sql
-- Org structure
divisions  (id, name, created_at, updated_at)
branches   (id, division_id, name, created_at, updated_at)
objects    (id, branch_id, name, import_seq_no, created_at, updated_at)

-- Device catalog — seed data, read-only in PoC
device_types            (id, name, description TEXT, created_at, updated_at)
device_system_contexts  (id, device_type_id, system_type, r1_minutes, r2_minutes, created_at, updated_at)
repair_types            (id, name, time_minutes, created_at, updated_at)

-- Equipment — full two-layer model (S-01 removed in v2.9)
object_devices  (id, object_id, device_type_id, quantity_physical DECIMAL(10,2), updated_at)
UNIQUE(object_id, device_type_id)

object_system_assignments  (id, object_id, device_type_id, system_type, quantity_maintained DECIMAL(10,2),
                            context_id UUID FK → device_system_contexts.id, updated_at)
UNIQUE(object_id, device_type_id, system_type)

-- Operational data — no period FK (S-05)
records_tasks  (id, object_id, access_requests, monitoring_requests,
                footage_requests, backup_control, security_admin, updated_at)
UNIQUE(object_id)

object_repairs  (id, object_id, repair_type_id, count INTEGER, updated_at)
UNIQUE(object_id, repair_type_id)

travel  (id, object_id, transport_type, distance_km, one_way_time_min, updated_at)
UNIQUE(object_id)

-- Computed cache — synchronous, no is_stale (S-02)
-- Note: intermediate computed fields (records_6months, repair_work_6months,
-- repair_travel_6months, repair_pzv_6months, total_repairs) are computed
-- in-memory during calculation but NOT persisted in PoC. Only the final
-- monthly outputs are stored. For MVP, these fields are added to summaries
-- for traceability and debugging.
summaries  (id, object_id,
            os_r1_per_visit, os_r2_per_visit,
            ps_r1_per_visit, ps_r2_per_visit,
            video_r1_per_visit, video_r2_per_visit,
            r1_per_visit_total, r2_per_visit_total,
            os_monthly_avg, ps_monthly_avg, video_monthly_avg,
            records_monthly,
            repair_no_travel_monthly, repair_with_travel_monthly,
            round_trip_min, pzv_minutes,
            total_no_travel_min, itogo_chislo_no_travel,
            total_with_travel_min, itogo_chislo_with_travel,
            computed_at)
UNIQUE(object_id)

-- Engineer module — full (S-04: roles exist but no access enforcement)
users  (id, email, name, password_hash,
        role VARCHAR(20) NOT NULL DEFAULT 'viewer',
        -- 'admin' | 'editor' | 'viewer' | 'engineer'
        -- PoC: role column present for engineer identification;
        -- no access control enforcement (all users can read/write all data)
        division_id UUID FK → divisions.id NULL,
        -- access-control scope for editors; NULL = all divisions
        home_division_id UUID FK → divisions.id NULL,
        capacity_fte DECIMAL(4,2) DEFAULT 1.0 CHECK (capacity_fte > 0),
        employee_id VARCHAR(100) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        requires_activation BOOLEAN DEFAULT FALSE,
        created_at, updated_at)
        -- NOTE: failed_login_count and locked_until are NOT in PoC schema.
        -- They are added in MVP when account lockout is implemented (§21.3, M-02).
        -- NOTE: is_engineer is NOT in PoC schema either. In PoC, role='engineer' is the
        -- only way to be an engineer; MVP M-02 splits the job function off the role.
        -- The v1.0.0 Liquibase migration must NOT include these columns.

object_engineers  (id, object_id, engineer_id, assigned_at, assigned_by UUID NULL)
UNIQUE(object_id, engineer_id)

engineer_summaries  (id, engineer_id,
                     total_load, object_count,
                     os_load, ps_load, video_load, records_load, repair_load,
                     capacity_fte, load_ratio, status,
                     computed_at)
UNIQUE(engineer_id)

-- Config constants — injected as Docker environment variables for PoC (S-03)
-- Spring maps WORKLOAD_CONFIG_<KEY> → @ConfigurationProperties(prefix="workload.config")
-- Naming convention: WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES=15 (see §6.11 for full key list)
-- Application fails to start (Spring binding exception) if any required env var is missing or type-invalid
-- Moved to app_config table with admin UI in MVP (M-10)
```

### MVP-only columns (excluded from PoC)

The following columns are **excluded from PoC** and added in later MVP migrations. The PoC Liquibase changelog (`v1.0.0`) must NOT include these columns:

| Column                  | Table                             | Added in                          |
| ----------------------- | --------------------------------- | --------------------------------- |
| `failed_login_count`    | `users`                           | M-02 (account lockout, §21.3)     |
| `locked_until`          | `users`                           | M-02 (account lockout, §21.3)     |
| `is_engineer`           | `users`                           | M-02 (job function split from role) |
| `period_id`             | `records_tasks`, `object_repairs` | M-07 (planning periods, FR-12)    |
| `is_stale`              | `summaries`, `engineer_summaries` | M-06 (staleness tracking)         |
| `period_id`             | `summaries`                       | M-06 (active-period traceability) |
| `records_6months`       | `summaries`                       | M-06 (traceability / debugging)   |
| `repair_work_6months`   | `summaries`                       | M-06 (traceability / debugging)   |
| `repair_travel_6months` | `summaries`                       | M-06 (traceability / debugging)   |
| `repair_pzv_6months`    | `summaries`                       | M-06 (traceability / debugging)   |
| `total_repairs`         | `summaries`                       | M-06 (traceability / debugging)   |

MVP migrations (`v1.1.0` onwards) add tables and columns — they never drop or rename PoC columns. PoC data survives migration intact.

## PoC Tech Stack (§15.8)

The PoC uses the **full production stack** defined in §9.1 — no throwaway stack, no language switch between PoC and MVP. This prevents a rewrite at MVP transition and means every line of PoC code is production-eligible.

### Backend

| Component                 | PoC setting                                       | Notes                                                                                  |
| ------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Java 21 + Spring Boot 3.x | Full stack                                        | Same as MVP                                                                            |
| Spring Data JPA           | PoC simplified schema (§15.4)                     | Entities match PoC tables exactly; MVP entities added incrementally                    |
| Liquibase                 | `v1.0.0-initial-schema.xml` + seed data changeset | PoC schema + all seed normatives in one migration                                      |
| Spring Security + JWT     | Single role, no refresh tokens                    | Refresh tokens added in M-02 (MVP RBAC)                                                |
| Apache POI                | XLSX export only                                  | M-01 adds JSON bulk import; source XLSX conversion remains external to the application |
| log4j2                    | JSON layout from day one                          | Structured logging is non-negotiable even in PoC                                       |
| Spring Actuator           | `/actuator/health` exposed                        | Used for Docker Compose healthcheck; `/actuator/metrics` enabled for Datadog           |
| Bucket4j                  | Basic rate limiting on `/api/**`                  | Prevents accidental hammering during demo                                              |

> **Note:** Redis is **not** used in PoC. The PoC recalculation is synchronous (S-02), so no job queue is needed. Redis is introduced in MVP with M-06 (staleness + background worker).

### Frontend

| Component                    | PoC setting                                     | Notes                                                     |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| React 18 + TypeScript + Vite | Full setup                                      | No shortcuts; strict TypeScript from start                |
| Material UI                  | MUI DataGrid for СВОД table                     | Pagination and sorting built-in; handles 2,934 rows       |
| TanStack Query               | Server state for all API calls                  | Stale-while-revalidate; automatic refetch after mutations |
| Zustand                      | Minimal client state (auth token, current user) | No Redux for PoC                                          |
| React Hook Form + Zod        | All data-entry forms                            | Equipment, repairs, records, travel, engineer assignment  |
| Axios                        | HTTP client with JWT interceptor                | 401 → redirect to login                                   |

### Infrastructure — PoC Docker Compose (4 containers)

The PoC runs **four containers**. Save the file as **`docker-compose.poc.yml`** and start with `docker compose -f docker-compose.poc.yml up`.

> **Redis is absent from the PoC compose file.** Recalculation is synchronous in the PoC (S-02), so no job queue is needed. Redis and its `depends_on` block are introduced in MVP with M-06. See §20.7 for the production compose that adds `redis` and `datadog-agent`.

```yaml
# docker-compose.poc.yml
# PoC only — 4 services, no Redis, no Datadog agent.
# For production compose (with Redis + Datadog) see §20.7.
version: "3.9"
services:
  backend:
    build: ./backend # or image: workload-backend:poc
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/workload
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      # SPRING_REDIS_HOST is NOT set — Redis disabled in PoC
      # WORKLOAD_CONFIG_* env vars are REQUIRED for startup (S-03, AD-09).
      # All 19 keys must be set — see §6.11 for the full list and default values.
      # Example: WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS=6
      # Missing or type-invalid vars cause a Spring binding exception (startup failure).
    depends_on:
      postgres: { condition: service_healthy }
      # redis intentionally omitted
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend # Nginx serving Vite production build
    depends_on: [backend]

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: workload
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 3s
      retries: 5

  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx.poc.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro # self-signed cert for PoC
    depends_on: [backend, frontend]

  # redis — OMITTED in PoC. Add in MVP (M-06). See §20.7.
  # datadog-agent — OMITTED in PoC. Add in MVP. See §20.7.

volumes:
  pgdata:
```

## PoC UI Routes (§15.5)

| Route                 | View                                                                         |
| --------------------- | ---------------------------------------------------------------------------- |
| `/login`              | Login page                                                                   |
| `/`                   | Dashboard — required FTE by division, top 10 objects, coverage gaps          |
| `/objects`            | Object list — searchable, filterable, shows ИТОГО Числ                       |
| `/objects/new`        | Create object                                                                |
| `/objects/:id`        | Object detail — 6 tabs: Оборудование, Записи, Ремонт, Дорога, Инженеры, СВОД |
| `/objects/:id/svod`   | СВОД tab (computed summary, read-only)                                       |
| `/engineers`          | Engineer list — load ratio, status, object count                             |
| `/engineers/:id`      | Engineer detail — workload dashboard                                         |
| `/engineers/:id/edit` | Engineer Edit — Edit name, capacity_fte, home division                       |
| `/svod`               | Full СВОД table — paginated, filterable                                      |
| `/svod/export`        | Trigger XLSX export                                                          |
| `/divisions`          | Division list — name, branch count, object count; create button              |
| `/divisions/:id`      | Division detail — СВОД + branch list; create branch button                   |
| `/branches/:id`       | Branch detail — object list with СВОД; create object button                  |

No catalog management pages, no periods page.

## PoC Acceptance Criteria (§15.6)

| ID         | Criterion                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PAC-01** | For a manually entered object matching "Архив г.Брест, ул.Московская, 202Д" with the correct equipment quantities, `itogo_chislo_with_travel = 0.032448 ±0.000001`.      |
| **PAC-02** | For an engineer assigned as the sole responsible engineer for that object with `capacity_fte = 1.0`, `engineer_total_load = 0.032448 ±0.000001` and `status = "normal"`. |
| **PAC-03** | СВОД XLSX export, when opened in Excel, matches manually verified reference values within ±0.001.                                                                        |
| **PAC-04** | Editing any equipment quantity in the UI and saving immediately updates the СВОД tab and the engineer's load ratio without page refresh.                                 |
| **PAC-05** | СВОД table loads first 100 rows in under 3 seconds.                                                                                                                      |
| **PAC-06** | Unauthenticated requests to any route redirect to `/login`.                                                                                                              |
| **PAC-07** | When a second engineer is assigned to the reference object, both engineers' `total_load` updates to `0.032448 / 2 = 0.016224 ±0.000001`.                                 |
| **PAC-08** | Division dashboard shows correct required FTE total = SUM of `itogo_chislo_with_travel` for all objects in that division.                                                |
| **PAC-09** | Health endpoint `GET /actuator/health` returns HTTP 200 with `{"status": "UP"}` (Spring Boot Actuator default) and includes database connectivity check.                 |

### Key Endpoints Active in PoC

**Division and Branch endpoints active in PoC (all authenticated users):**

| Method | Endpoint                       | Notes                                          |
| ------ | ------------------------------ | ---------------------------------------------- |
| GET    | `/divisions`                   | Any authenticated user                         |
| GET    | `/divisions/:id`               | Any authenticated user                         |
| GET    | `/divisions/:id/branches`      | Any authenticated user                         |
| GET    | `/branches/:id`                | Any authenticated user                         |
| POST   | `/divisions`                   | Unenforced in PoC — any authenticated user     |
| POST   | `/divisions/:id/branches`      | Unenforced in PoC — any authenticated user     |
| PUT    | `/divisions/:id`               | Unenforced in PoC — any authenticated user     |
| PUT    | `/branches/:id`                | Unenforced in PoC — any authenticated user     |

**Endpoints NOT available in PoC:**

| Method | Endpoint                    | Reason                                      |
| ------ | --------------------------- | ------------------------------------------- |
| DELETE | `/divisions/:id`            | Not available in PoC (S-04); added in M-02  |
| DELETE | `/branches/:id`             | Not available in PoC (S-04); added in M-02  |
| GET    | `/objects/:id/export/xlsx`  | Not available in PoC (S-10); added in M-12  |

**Key endpoints active in PoC (derived from §15.2 core scope):**

| Method | Endpoint                | Notes                                                    |
| ------ | ----------------------- | -------------------------------------------------------- |
| POST   | `/auth/login`           | Returns JWT                                              |
| GET    | `/actuator/health`      | Returns `{"status": "UP"}` with DB connectivity check    |
| GET    | `/svod/export/xlsx`     | СВОД XLSX export (PoC export feature)                    |

## What Is NOT in PoC

- No Redis / background worker / staleness tracking (S-02)
- No planning periods — no `periods` table, no period FK on records or repairs (S-05)
- No JWT refresh tokens (MVP only — added in M-02)
- No app_config admin UI — config constants are injected as Docker env vars (S-03; MVP only per M-10)
- No audit log (S-07; MVP only per §23.2 — added in M-08)
- No PDF export (S-08; post-MVP — added in M-11)
- No soft-delete / archive — hard delete only (no archive mechanism in PoC schema)
- No role-based access control enforcement — roles exist but are not enforced (S-04; MVP via M-02)
- No catalog management UI — device types, contexts, and repair types are seed-only (S-03)
- No bulk import — all data entered manually through the UI (S-06; highest-priority MVP item M-01)
- No concurrency / optimistic locking — last-write-wins (S-09; MVP via M-09)
- No object inventory XLSX export — only СВОД XLSX export is available (S-10; MVP via M-12)
- No `DELETE /divisions/:id` or `DELETE /branches/:id` endpoints (S-04)
- No `failed_login_count` / `locked_until` columns in `users` table (MVP — account lockout §21.3, M-02)

## Architecture: Monolith (§15.9)

The system is built as a **single monolithic service** for both PoC and MVP. A separate microservice for engineer workload is not justified because:

- Engineer workload is a simple aggregation (`SUM` over already-cached `summaries` rows) — no independent data source, no separate scaling requirement.
- A service boundary would require inter-service auth, network calls, and separate deployment — significant complexity with no benefit at this scale.
- The monolith can be decomposed later if the engineer module grows to include scheduling, mobile access, or push notifications.

Post-MVP consideration: if the engineer dashboard needs real-time push updates or a mobile client, extract the engineer notifications concern into a lightweight event service. The calculation core stays in the monolith.
