## 15. PoC Scope

### 15.1 Purpose

The PoC has one goal: **demonstrate that the web application correctly calculates ИТОГО Числ per object and per engineer**, verifiable by manual spot-checking against the source Excel file. It is the minimum build that proves the core value proposition to stakeholders and justifies full MVP investment.

PoC is **not** a stripped-down MVP. It is a focused validator. Some simplifications will be reversed in MVP — these are explicitly documented below so developers build with the migration in mind.

---

### 15.2 PoC Scope — What Is Built

#### Core (non-negotiable for PoC)

| Feature | Notes |
|---|---|
| **Manual data entry** | Create objects, enter equipment, repairs, records, travel via UI. All 2,935 objects from source file entered manually (import is MVP). |
| **Calculation engine** | Full calculation: ОС, ПС, Видео, Записи, Ремонт, Дорога → ИТОГО Числ. All formulas from §6. |
| **СВОД table** | Paginated table matching all 19 source columns. |
| **СВОД export to XLSX** | Export matching original template structure. Stakeholders verify spot-checked rows against source file. |
| **Object detail page** | View and edit equipment quantities, repairs, records, travel. |
| **Engineer module** | Engineers as users, object-engineer assignments, workload split, capacity, load ratio, overload status, engineer dashboard. Full §4.10–4.11, §6.12–6.14, §7.4–7.7. |
| **Aggregation layer** | Branch, division, company-wide required FTE totals. All computed on the fly (§16). |
| **Basic dashboard** | Required FTE by division, top objects by workload, coverage gaps. |
| **Authentication** | Login / logout. Single role — all authenticated users can read and write. |
| **Seed normatives** | Device catalog and repair types loaded as migration seed data. Values from source XLSX. |
| **Basic observability** | Structured logging, health endpoint, job failure alerting (§18 PoC tier). |

---

### 15.3 PoC Simplifications (Intentional Deviations from Full TOR)

Each simplification is labelled, explained, and marked with its reversal milestone.

**S-01: Flat equipment model — no physical inventory layer**

Full TOR: two layers — `object_devices` (physical qty) + `object_system_assignments` (maintained qty).

PoC: one table `equipment_entries` — `(object_id, device_type_id, system_type, quantity)`. Physical qty is implicitly equal to maintained qty.

*Reversed in:* M-03 (MVP)

**S-02: Synchronous recalculation on save — no staleness tracking**

Full TOR: `is_stale` flag + on-demand background job triggered by admin.

PoC: recalculates object summary synchronously when any of its data is saved (~5ms per object). No background worker, no `is_stale` column, no admin trigger button.

*Reversed in:* M-06 (MVP)

**S-03: Static normatives — no admin UI for catalog**

Full TOR: admin-editable device types, system contexts, and repair types via UI.

PoC: normatives loaded as migration seed data. No UI to add, edit, or delete device types, contexts, or repair types. Calculation uses seed values directly.

*Reversed in:* M-04, M-05 (MVP)

**S-04: Single role — no RBAC**

Full TOR: admin, editor, engineer, viewer roles with division scoping.

PoC: one role — authenticated user. Login/logout only. Engineers log in as regular users; their engineer-specific fields (capacity_fte) are set directly in the database for PoC.

*Reversed in:* M-02 (MVP)

**S-05: No planning periods**

Full TOR: `periods` table; repairs and records are period-scoped.

PoC: one `object_repairs` row per (object, repair_type), one `records_tasks` row per object — no period FK.

*Reversed in:* M-01 (MVP)

**S-06: XLSX import is manual — import via UI is MVP**

Full TOR: bulk XLSX import of source file.

PoC: all data entered manually through the UI. For demo purposes, a representative subset of objects (~20–50 from different divisions) is entered, not all 2,935. Full import is the first MVP milestone.

*Reversed in:* M-01 (MVP) — this is the highest-priority MVP item since 2,935 rows of manual entry is not viable for production.

**S-07: No audit log**

Full TOR: changes to normatives, config, and assignments are audited.

PoC: no audit log.

*Reversed in:* M-08 (MVP)

**S-08: No PDF export**

PoC exports СВОД to XLSX only.

*Reversed in:* M-09 (post-MVP)

**S-09: No concurrency/locking**

Full TOR: optimistic locking with `updated_at` version check (§17).

PoC: last-write-wins. Acceptable with 1–2 demo users.

*Reversed in:* M-11 (MVP)

---

### 15.4 PoC Data Model

Simplified schema — replaces the full §5 schema for PoC only. Designed as a strict subset: no columns are dropped when migrating to MVP, only new tables and columns are added.

```sql
-- Org structure
divisions  (id, name)
branches   (id, division_id, name)
objects    (id, branch_id, name, responsible_engineer_text VARCHAR, import_seq_no)
-- Note: responsible_engineer_text is a display-only label for PoC.
-- Replaced by object_engineers join table in MVP (S-04 reversal).

-- Device catalog — seed data, read-only in PoC
device_types            (id, name)
device_system_contexts  (id, device_type_id, system_type, r1_minutes, r2_minutes)
repair_types            (id, name, time_minutes)

-- Equipment — flat model (S-01)
equipment_entries  (id, object_id, device_type_id, system_type, quantity DECIMAL(10,2))
UNIQUE(object_id, device_type_id, system_type)

-- Operational data — no period FK (S-05)
records_tasks  (id, object_id, access_requests, monitoring_requests,
                footage_requests, backup_control, security_admin)
UNIQUE(object_id)

object_repairs  (id, object_id, repair_type_id, count INTEGER)
UNIQUE(object_id, repair_type_id)

travel  (id, object_id, transport_type, distance_km, one_way_time_min)
UNIQUE(object_id)

-- Computed cache — synchronous, no is_stale (S-02)
summaries  (id, object_id,
            os_r1_per_visit, os_r2_per_visit,
            ps_r1_per_visit, ps_r2_per_visit,
            video_r1_per_visit, video_r2_per_visit,
            r1_per_visit_total, r2_per_visit_total,
            os_monthly_avg, ps_monthly_avg, video_monthly_avg,
            records_monthly,
            total_repairs,   -- COUNT of distinct repair types with count > 0
            repair_no_travel_monthly, repair_with_travel_monthly,
            round_trip_min, pzv_minutes,
            total_no_travel_min, itogo_chislo_no_travel,
            total_with_travel_min, itogo_chislo_with_travel,
            computed_at)
UNIQUE(object_id)

-- Engineer module — full (S-04 partial: no role column yet)
users  (id, email, name, password_hash,
        capacity_fte DECIMAL(4,2) DEFAULT 1.0,
        home_division_id UUID FK → divisions.id,
        is_active BOOLEAN DEFAULT TRUE,
        created_at)
-- No role column for PoC; all users treated as admins

object_engineers  (id, object_id, engineer_id, assigned_at)
UNIQUE(object_id, engineer_id)

engineer_summaries  (id, engineer_id,
                     total_load, object_count,
                     os_load, ps_load, video_load, records_load, repair_load,
                     capacity_fte, load_ratio, status,
                     computed_at)
UNIQUE(engineer_id)

-- Config constants — hardcoded in application for PoC (S-03)
-- Moved to app_config table in MVP (M-10)
```

---

### 15.5 PoC UI Routes

| Route | View |
|---|---|
| `/login` | Login page |
| `/` | Dashboard — required FTE by division, top 10 objects, coverage gaps |
| `/objects` | Object list — searchable, filterable, shows ИТОГО Числ |
| `/objects/new` | Create object |
| `/objects/:id` | Object detail — 5 tabs: Оборудование, Записи, Ремонт, Дорога, Инженеры |
| `/objects/:id/svod` | СВОД tab (computed summary, read-only) |
| `/engineers` | Engineer list — load ratio, status, object count |
| `/engineers/:id` | Engineer detail — workload dashboard |
| `/svod` | Full СВОД table — paginated, filterable |
| `/svod/export` | Trigger XLSX export |

No catalog management pages, no admin pages, no periods page.

---

### 15.6 PoC Acceptance Criteria

| ID | Criterion |
|---|---|
| **PAC-01** | For a manually entered object matching "Архив г.Брест, ул.Московская, 202Д" with the correct equipment quantities, `itogo_chislo_with_travel = 0.032327 ±0.000001`. |
| **PAC-02** | For an engineer assigned as the sole responsible engineer for that object with `capacity_fte = 1.0`, `engineer_total_load = 0.032327 ±0.000001` and `status = "normal"`. |
| **PAC-03** | СВОД XLSX export, when opened in Excel, matches manually verified reference values within ±0.001. |
| **PAC-04** | Editing any equipment quantity in the UI and saving immediately updates the СВОД tab and the engineer's load ratio without page refresh. |
| **PAC-05** | СВОД table loads first 100 rows in under 3 seconds. |
| **PAC-06** | Unauthenticated requests to any route redirect to `/login`. |
| **PAC-07** | When a second engineer is assigned to the reference object, both engineers' `total_load` updates to `0.032327 / 2 = 0.016163 ±0.000001`. |
| **PAC-08** | Division dashboard shows correct required FTE total = SUM of `itogo_chislo_with_travel` for all objects in that division. |
| **PAC-09** | Health endpoint `GET /health` returns HTTP 200 with `{"status": "ok"}` and database connectivity check. |

---

### 15.7 PoC → MVP Migration Path

Items are ordered by dependency. M-01 is the highest priority because manual entry of 2,935 objects is not viable for production use.

| ID | Item | Depends on | Notes |
|---|---|---|---|
| M-01 | XLSX import (FR bulk) | — | Highest priority. Resolves S-06. Includes engineer name resolution and placeholder accounts. |
| M-02 | RBAC — admin, editor, engineer, viewer roles | M-01 | Resolves S-04. Division scoping for editors. |
| M-03 | Physical inventory layer (`object_devices`) | — | Resolves S-01. Split equipment UI into two sections. |
| M-04 | Device catalog management UI | M-02 | Resolves S-03 (devices). Admin-only. |
| M-05 | Repair type catalog management UI | M-02 | Resolves S-03 (repairs). Admin-only. |
| M-06 | Staleness tracking + on-demand recalculation | M-02 | Resolves S-02. Background worker, `is_stale`, admin trigger. |
| M-07 | Planning periods (FR-12) | M-01, M-06 | Resolves S-05. Period selector in UI, period lock. |
| M-08 | Audit log | M-02 | Resolves S-07. |
| M-09 | Concurrency / optimistic locking | M-06 | Resolves S-09. `updated_at` version check on writes. |
| M-10 | `app_config` table with admin UI | M-02 | Move hardcoded constants to DB. |
| M-11 | PDF export | — | Resolves S-08. Post-MVP. |

---

### 15.8 PoC Technology Stack

The PoC uses the **full production stack** defined in §9.1 — no throwaway stack, no language switch between PoC and MVP. This prevents a rewrite at MVP transition and means every line of PoC code is production-eligible.

#### Backend — PoC Configuration

| Component | PoC setting | Notes |
|---|---|---|
| Java 21 + Spring Boot 3.x | Full stack | Same as MVP |
| Spring Data JPA | PoC simplified schema (§15.4) | Entities match PoC tables exactly; MVP entities added incrementally |
| Liquibase | `v1.0.0-initial-schema.xml` + seed data changeset | PoC schema + all seed normatives in one migration |
| Spring Security + JWT | Single role, no refresh tokens | Refresh tokens added in M-02 (MVP RBAC) |
| Apache POI | XLSX export only | Import (POI read) added in M-01 (MVP) |
| Redis | Job queue for recalculation | Even synchronous PoC recalc uses Redis queue stub for forward-compatibility |
| log4j2 | JSON layout from day one | Structured logging is non-negotiable even in PoC |
| Spring Actuator | `/actuator/health` exposed | Used for Docker Compose healthcheck; `/actuator/metrics` enabled for Datadog |
| Bucket4j | Basic rate limiting on `/api/**` | Prevents accidental hammering during demo |

#### Frontend — PoC Configuration

| Component | PoC setting | Notes |
|---|---|---|
| React 18 + TypeScript + Vite | Full setup | No shortcuts; strict TypeScript from start |
| Material UI | MUI DataGrid for СВОД table | Pagination and sorting built-in; handles 2,935 rows |
| TanStack Query | Server state for all API calls | Stale-while-revalidate; automatic refetch after mutations |
| Zustand | Minimal client state (auth token, current user) | No Redux for PoC |
| React Hook Form + Zod | All data-entry forms | Equipment, repairs, records, travel, engineer assignment |
| Axios | HTTP client with JWT interceptor | 401 → redirect to login |

#### Infrastructure — PoC Docker Compose

```yaml
services:
  backend:   # Spring Boot JAR, port 8080
  frontend:  # Nginx serving Vite build, port 3000
  postgres:  # PostgreSQL 15, port 5432
  redis:     # Redis 7, port 6379
  nginx:     # Reverse proxy: / → frontend, /api → backend
             # TLS termination with self-signed cert for PoC
```

**Schema continuity guarantee:** The PoC Liquibase changelog (`v1.0.0`) defines a strict subset of the full MVP schema. MVP migrations (`v1.1.0` onwards) add tables and columns — they never drop or rename PoC columns. PoC data survives migration intact.

### 15.9 Architecture: Monolith for PoC and MVP

The system is built as a **single monolithic service** for both PoC and MVP. A separate microservice for engineer workload is not justified because:

- Engineer workload is a simple aggregation (`SUM` over already-cached `summaries` rows) — no independent data source, no separate scaling requirement.
- A service boundary would require inter-service auth, network calls, and separate deployment — significant complexity with no benefit at this scale.
- The monolith can be decomposed later if the engineer module grows to include scheduling, mobile access, or push notifications.

Post-MVP consideration: if the engineer dashboard needs real-time push updates or a mobile client, extract the engineer notifications concern into a lightweight event service. The calculation core stays in the monolith.


