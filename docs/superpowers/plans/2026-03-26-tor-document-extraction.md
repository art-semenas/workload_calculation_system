# TOR Document Extraction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 6 focused implementation documents from `docs/TOR_Workload_WebApp.md` so developers can work on individual subsystems without reading the full 258 KB spec.

**Architecture:** Each output document is a faithful extraction of specific TOR sections, reformatted for standalone use. No new requirements are invented. PoC and MVP content is separated or clearly annotated in every document. The TOR remains the single source of truth — extracted docs reference it by section.

**Tech Stack:** Markdown. Read tool with `offset`/`limit` for chunked TOR reading. Write tool for output files.

---

## TOR Section Line Map (verified)

| Section | Lines | Content |
|---------|-------|---------|
| §1–§3 | 66–129 | Overview, goals, glossary |
| §4 Functional Requirements | 130–404 | FR-01 through FR-12 |
| §5 Data Model | 405–847 | Full DB schema, all tables |
| §6 Calculation Engine | 848–1411 | Formulas, config keys, cache |
| §7 UI Requirements | 1412–1666 | All screens and tabs |
| §8 NFR | 1667–1719 | Performance, security refs |
| §9 Architecture | 1720–1853 | Tech stack, AD-xx decisions |
| §10 API Design | 1854–2333 | All endpoints |
| §11 Migrations & Import | 2334–2452 | Liquibase structure, JSON import |
| §12 Roles & Permissions | 2453–2482 | RBAC matrix |
| §13 Clarifications | 2483–2670 | C-xx items |
| §14 Acceptance Criteria | 2671–2848 | AC-xx items |
| §15 PoC Scope | 2849–3236 | S-xx, M-xx milestones, PoC schema |
| §16 Aggregation Rules | 3237–3410 | Division/branch/engineer rollup |
| §17 Concurrency | 3411–3527 | Locking, optimistic concurrency |
| §18 Observability | 3528–3721 | Logging, metrics, health |
| §19 Testing Strategy | 3722–3854 | Unit/integration/e2e strategy |
| §20 CI/CD | 3855–4015 | Pipeline stages |
| §21 Security | 4016–4131 | Auth, lockout, JWT |
| §22 Multi-Env | 4132–4197 | Dev/staging/prod config |
| §23 Normative Versioning | 4198–4267 | Version policy |
| §24 Snapshot/Freeze | 4268–4323 | Post-MVP freeze |
| §25 Backup/DR | 4324–4402 | Recovery strategy |

---

## Output Files

| File | Sources |
|------|---------|
| `docs/impl/poc-scope.md` | §15 (2849–3236) |
| `docs/impl/db-schema.md` | §5 (405–847) + §11 migrations (2334–2452) |
| `docs/impl/calculation-engine.md` | §6 (848–1411) + §16 (3237–3410) |
| `docs/impl/api-spec.md` | §10 (1854–2333) |
| `docs/impl/ui-spec.md` | §7 (1412–1666) + §12 (2453–2482) |
| `docs/impl/epics/poc-m01-core-crud.md` | §15 milestones + §4 FR-01–FR-03 + §14 ACs |
| `docs/impl/epics/poc-m02-calculation.md` | §15 milestones + §4 FR-07 + §6 formulas |
| `docs/impl/epics/poc-m03-import.md` | §15 milestones + §4 FR-01 import + §11 |
| `docs/impl/epics/mvp-m04-auth.md` | §15 milestones + §12 + §21 |
| `docs/impl/epics/mvp-m05-engineers.md` | §15 milestones + §4 FR-10–FR-11 |
| `docs/impl/epics/mvp-m06-background.md` | §15 milestones + §9 AD-13 + §17 |
| `docs/impl/epics/mvp-m07-periods.md` | §15 milestones + §4 FR-12 |

---

## Task 1: Extract `docs/impl/poc-scope.md`

**Files:**
- Read: `docs/TOR_Workload_WebApp.md` lines 2849–3236
- Create: `docs/impl/poc-scope.md`

- [ ] **Step 1: Read PoC Scope section from TOR**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=2849, limit=388
  ```

  Note these items while reading:
  - List of S-xx PoC simplifications (what is excluded/simplified)
  - List of M-xx milestones (M-01 through the last milestone number)
  - PoC DB schema (§15.4) — which tables exist in PoC and which columns are excluded
  - PoC tech stack (§15.8) — no Redis, 4 Docker containers
  - PoC UI route list (§15.5)
  - PoC API endpoint list (§15.6)

- [ ] **Step 2: Write `docs/impl/poc-scope.md`**

  The document must contain exactly these sections in order:

  ```markdown
  # PoC Scope

  > Extracted from TOR_Workload_WebApp.md §15. TOR is the source of truth.
  > Last sync: TOR v2.24 (2026-03-25)

  ## What PoC Is

  [1 paragraph from §15.1 describing what PoC proves]

  ## PoC Simplifications (S-xx)

  [Full list of S-xx items copied verbatim from §15.2, preserving "Reversed in: M-xx" notes]

  ## Milestones

  [Full M-xx table from §15.7: milestone ID, name, what it delivers]

  ## PoC Database Schema (§15.4)

  [The PoC-specific schema — tables and columns that exist in PoC.
   For every MVP-only column or table, state explicitly: "(excluded from PoC)"]

  ## PoC Tech Stack (§15.8)

  [Stack table from §15.8: Java/Spring Boot version, PostgreSQL, no Redis,
   4 Docker containers (app + db + ...). Copy verbatim.]

  ## PoC UI Routes (§15.5)

  [Full route list from §15.5]

  ## PoC API Endpoints (§15.6)

  [Full endpoint list from §15.6 — only endpoints active in PoC]

  ## What Is NOT in PoC

  A bulleted list synthesized from S-xx items:
  - No Redis / background worker / staleness tracking (S-02)
  - No planning periods (S-05)
  - No JWT refresh tokens (MVP only)
  - No app_config admin UI (MVP only per AD-09)
  - No audit log (MVP only per §23.2)
  - No PDF/XLSX export (MVP — FR-08)
  - No soft-delete / archive (hard delete only)
  [add any others found in S-xx list]
  ```

- [ ] **Step 3: Verify completeness**

  After writing, grep to confirm these items appear in the output:
  ```
  Grep pattern: "S-0[1-9]" in docs/impl/poc-scope.md  → must find multiple hits
  Grep pattern: "M-0[1-9]" in docs/impl/poc-scope.md  → must find multiple hits
  Grep pattern: "Redis"    in docs/impl/poc-scope.md  → must find at least 1 hit
  Grep pattern: "4 container" OR "PoC: 4" in docs/impl/poc-scope.md → at least 1 hit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add docs/impl/poc-scope.md
  git commit -m "docs: extract PoC scope from TOR §15 into docs/impl/poc-scope.md"
  ```

---

## Task 2: Extract `docs/impl/db-schema.md`

**Files:**
- Read: `docs/TOR_Workload_WebApp.md` lines 405–847 (§5 full schema)
- Read: `docs/TOR_Workload_WebApp.md` lines 2334–2452 (§11 migrations)
- Read: `docs/TOR_Workload_WebApp.md` lines 2849–2890 (§15.4 PoC schema header, if not already read)
- Create: `docs/impl/db-schema.md`

- [ ] **Step 1: Read §5 Data Model (full)**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=405, limit=443
  ```

  While reading, note:
  - Every table name and its columns
  - Which columns carry `-- ON DELETE CASCADE` or `-- ON DELETE RESTRICT`
  - Which columns are annotated as MVP-only (e.g., `failed_login_count`, `locked_until`)
  - The partial unique index on `periods.is_active`
  - The `summaries` and `engineer_summaries` computed cache tables
  - Transaction isolation level note (§5.1)

- [ ] **Step 2: Read §11 Migrations & Import**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=2334, limit=119
  ```

  Note: §11.3 Liquibase migration file naming convention and directory structure.

- [ ] **Step 3: Write `docs/impl/db-schema.md`**

  ```markdown
  # Database Schema

  > Extracted from TOR_Workload_WebApp.md §5 + §11.3. TOR is the source of truth.
  > Last sync: TOR v2.24 (2026-03-25)

  ## Transaction Isolation

  [Copy §5.1 note verbatim: READ COMMITTED default; REPEATABLE READ inside bulk
   recalculation batch; PoC vs MVP distinction for summaries writes]

  ## Entity Relationship Overview

  [Copy the ASCII diagram from §5.1 verbatim]

  ## Tables — PoC Schema

  For each table that exists in PoC, show the CREATE TABLE equivalent with:
  - All column names, types, constraints
  - FK references with ON DELETE behaviour
  - UNIQUE constraints
  - MVP-only columns marked: `-- MVP only`

  Tables in PoC (from §15.4): divisions, branches, objects, device_types,
  device_system_contexts, object_devices, object_system_assignments,
  records_tasks, repair_types, object_repairs, travel, users (subset),
  summaries (subset), engineer_summaries (subset)

  ## Tables — MVP Additions

  Tables and columns added in MVP that are NOT in PoC:
  - `periods` table (full definition)
  - `app_config` table (full definition)
  - `audit_log` table (if defined in TOR)
  - MVP-only columns on existing tables (list each: table.column)

  ## Indexing Strategy (§5.3)

  [Copy §5.3 verbatim — PoC index list]

  ## Seed Data

  ### Device Types & Contexts
  [Copy the seed tables from §4.2: ОС contexts, ПС contexts, Видео contexts]

  ### Repair Types
  [Copy the repair types table from §4.5]

  ## Migration File Structure (§11.3)

  [Copy §11.3 Liquibase naming convention and directory layout verbatim]
  ```

- [ ] **Step 4: Verify completeness**

  ```
  Grep "ON DELETE CASCADE" in docs/impl/db-schema.md → must find ≥6 hits
    (object_engineers, object_devices, object_system_assignments,
     records_tasks, object_repairs, travel, summaries all cascade from objects)
  Grep "periods" in docs/impl/db-schema.md → must find at least 1 hit under MVP
  Grep "app_config" in docs/impl/db-schema.md → must find at least 1 hit under MVP
  Grep "is_active" in docs/impl/db-schema.md → must find hit (users table, MVP-only)
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add docs/impl/db-schema.md
  git commit -m "docs: extract DB schema from TOR §5 + §11.3 into docs/impl/db-schema.md"
  ```

---

## Task 3: Extract `docs/impl/calculation-engine.md`

**Files:**
- Read: `docs/TOR_Workload_WebApp.md` lines 848–1200 (§6 first half)
- Read: `docs/TOR_Workload_WebApp.md` lines 1200–1411 (§6 second half — config keys, cache)
- Read: `docs/TOR_Workload_WebApp.md` lines 3237–3410 (§16 Aggregation Rules)
- Create: `docs/impl/calculation-engine.md`

- [ ] **Step 1: Read §6 first half (pipeline, per-system formulas)**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=848, limit=353
  ```

  Note:
  - The 5-stage calculation pipeline (§6.1)
  - Per-system ТО formulas for ОС, ПС, Видео (§6.2–§6.4)
  - Records formula — `records_monthly = records_6months / config[PLANNING_PERIOD_MONTHS]` (§6.5)
  - The repair count formula: К-во ремонтов = COUNT(distinct repair types with count > 0), NOT sum (§6.6)
  - The 3-tier threshold formula for repair_travel and repair_pzv (§6.6)

- [ ] **Step 2: Read §6 second half (itogo, engineer load, config keys, cache)**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=1201, limit=211
  ```

  Note:
  - `itogo_chislo` and `itogo_chislo_with_travel` formulas (§6.8)
  - Zero-guard rule: itogo = 0 when all work components are zero (§6.8)
  - ПЗВ formula (§6.9) — fixed 20 min per visit
  - Cache invalidation rules table (§6.10) — which writes mark which summaries stale
  - Full `app_config` keys table (§6.11) — all 19 keys with types and defaults
  - Config validation rules (§6.11.1) — per-key and cross-key constraints
  - Engineer load formulas (§6.12–§6.14)

- [ ] **Step 3: Read §16 Aggregation Rules**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=3237, limit=174
  ```

  Note:
  - Branch-level rollup formula (§16.3)
  - Division-level rollup formula
  - Engineer overload attribution (§16.6 note about home_division_id)
  - Coverage gap definition

- [ ] **Step 4: Write `docs/impl/calculation-engine.md`**

  ```markdown
  # Calculation Engine

  > Extracted from TOR_Workload_WebApp.md §6 + §16. TOR is the source of truth.
  > Last sync: TOR v2.24 (2026-03-25)

  ## Calculation Pipeline Overview

  [Copy §6.1 pipeline stages verbatim — the 5-stage ordered list]

  ## Per-System ТО Formulas

  ### ОС (Security Alarm)
  [Copy §6.2 formula: monthly_os = SUM(quantity_maintained × r1_minutes × freq_r1
   + quantity_maintained × r2_minutes × freq_r2) / WORKING_MINUTES_PER_MONTH]

  ### ПС (Fire Alarm)
  [Copy §6.3 formula]

  ### Видео (Video)
  [Copy §6.4 formula]

  ## Records Formula (§6.5)

  records_monthly = records_6months / config[PLANNING_PERIOD_MONTHS]

  [Copy full §6.5 verbatim including the clarification that this is a smoothed
   estimate, not guaranteed monthly occurrence]

  ## Repair Formulas (§6.6)

  ### К-во ремонтов (Repair Count)

  **CRITICAL:** К-во ремонтов = COUNT of distinct repair types where count > 0
  for the current period. This is NOT the sum of repair quantities.

  Example: "Замена аккумулятора ОС × 3" and "Замена извещателя × 5"
  → К-во ремонтов = 2 (two distinct types), NOT 8

  ### Repair Time Formula
  [Copy the repair_time formula: SUM(count × time_minutes) for all repair types]

  ### 3-Tier Threshold Formula for repair_travel and repair_pzv

  [Copy the exact threshold formula from §6.6 verbatim:
   if К-во ремонтов ≤ 5  → 0
   if К-во ремонтов ≤ 10 → К-во ремонтов × rate
   if К-во ремонтов > 10 → 10 × rate
   where rate comes from config keys REPAIR_TRAVEL_RATE / REPAIR_PZV_RATE]

  ## ПЗВ Formula (§6.9)

  [Copy §6.9 verbatim: fixed 20 min per visit, how it enters the itogo formula]

  ## ИТОГО Formulas (§6.8)

  itogo_chislo (без дороги) = [formula]
  itogo_chislo_with_travel  = [formula]

  **Zero-guard rule:** If all work components (ТО + records + repair_time) sum to
  zero, itogo_chislo = 0 and itogo_chislo_with_travel = 0. This prevents phantom
  PZV/travel FTE on objects with no equipment assigned.

  ## Engineer Workload Formulas (§6.12–§6.14)

  engineer_load_share   = object.itogo_chislo_with_travel / COUNT(assigned engineers)
  engineer_total_load   = SUM(load_share across all assigned objects)
  load_ratio            = engineer_total_load / capacity_fte
  overload              = load_ratio >= 1.0
  warning               = load_ratio >= config[ENGINEER_WARNING_THRESHOLD]
                          (where ENGINEER_WARNING_THRESHOLD < 1.0)

  [Copy §6.12–§6.14 verbatim for full detail]

  ## Cache Invalidation Rules (§6.10)

  [Copy the full cache invalidation table verbatim: which write event marks
   which summary rows stale, including the objects DELETE cascade rule]

  **PoC:** No staleness tracking. Summaries are recomputed synchronously on every save.
  **MVP:** Same-transaction stale marking; background worker recalculates on demand.

  ## app_config Keys Reference (§6.11)

  [Copy the full 19-key table: key name, type, default value, description]

  ### Config Validation Rules (§6.11.1) — MVP only

  [Copy all per-key and cross-key constraints verbatim.
   Note: §6.11.1 is MVP-only — requires app_config table (M-10).]

  ## Aggregation Rules (§16)

  ### Branch-Level Rollup
  [Copy §16.3 formula: branch_load = SUM(itogo_chislo_with_travel) per object
   belonging to that branch]

  ### Division-Level Rollup
  [Copy division formula]

  ### Engineer Overload Attribution
  [Copy §16.6 note: overload is attributed to engineer's home_division_id,
   not to the branch of the assigned object]

  ### Coverage Gap Definition
  [Copy definition: object with zero assigned engineers]
  ```

- [ ] **Step 5: Verify completeness**

  ```
  Grep "К-во ремонтов" in docs/impl/calculation-engine.md → ≥2 hits
  Grep "Zero-guard" OR "zero guard" in docs/impl/calculation-engine.md → ≥1 hit
  Grep "PLANNING_PERIOD_MONTHS" in docs/impl/calculation-engine.md → ≥1 hit
  Grep "3-[Tt]ier" OR "≤ 5" in docs/impl/calculation-engine.md → ≥1 hit
  Grep "app_config" in docs/impl/calculation-engine.md → ≥5 hits
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add docs/impl/calculation-engine.md
  git commit -m "docs: extract calculation engine from TOR §6 + §16 into docs/impl/calculation-engine.md"
  ```

---

## Task 4: Extract `docs/impl/api-spec.md`

**Files:**
- Read: `docs/TOR_Workload_WebApp.md` lines 1854–2100 (§10 first half)
- Read: `docs/TOR_Workload_WebApp.md` lines 2100–2333 (§10 second half)
- Create: `docs/impl/api-spec.md`

- [ ] **Step 1: Read §10 first half**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=1854, limit=247
  ```

  Note the endpoint table structure: method, path, description, PoC/MVP phase.

- [ ] **Step 2: Read §10 second half**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=2101, limit=233
  ```

  Note: admin config endpoints (§10.2 — MVP only), import endpoints (§11.1 two-step flow).

- [ ] **Step 3: Write `docs/impl/api-spec.md`**

  ```markdown
  # API Specification

  > Extracted from TOR_Workload_WebApp.md §10. TOR is the source of truth.
  > Last sync: TOR v2.24 (2026-03-25)

  ## Base Path

  All endpoints are prefixed `/api/v1` (or as defined in §9).

  ## Authentication

  **PoC:** Access token only (JWT, no refresh token).
  **MVP:** JWT access + refresh token flow (M-04).

  ## PoC Endpoints

  List only endpoints active in PoC. Format per endpoint:

  ### `METHOD /path`

  **Phase:** PoC / MVP (milestone)
  **Description:** [what it does]
  **Request body:** [fields if applicable]
  **Response:** [shape]
  **Errors:** [HTTP codes and error keys]
  **Notes:** [stale-marking behavior if applicable]

  [Repeat for every endpoint from §10]

  ## MVP-Only Endpoints

  List endpoints that are NOT active in PoC, grouped by feature:

  ### Admin Config (M-10)
  - `GET /admin/config` — read all app_config values
  - `PUT /admin/config` — batch update (NOT single-key PUT)
  [copy from §10.2]

  ### Admin Audit Log (M-10)
  [copy from §10.2]

  ### Planning Periods (M-07)
  [copy from §10.2]

  ### Background Recalculation Trigger (M-06)
  [copy from §10.2]

  ## Error Code Reference

  [Copy all error code strings referenced across §10: NO_CONTEXT_FOR_SYSTEM,
   ZERO_THRESHOLD, REPAIR_TRAVEL_CAP, etc.]

  ## Import Endpoints (§11.1)

  Two-step flow (copy §11.1 two-step import sub-section verbatim):
  1. `POST /import/data` — dry-run, returns preview report
  2. `POST /import/data/confirm` — re-submits full payload, executes all writes
  ```

- [ ] **Step 4: Verify completeness**

  ```
  Grep "POST /import" in docs/impl/api-spec.md → must find both /import/data endpoints
  Grep "PUT /admin/config" in docs/impl/api-spec.md → must find exactly 1 (batch, not /:key)
  Grep "NO_CONTEXT_FOR_SYSTEM" in docs/impl/api-spec.md → ≥1 hit
  Grep "MVP" in docs/impl/api-spec.md → ≥5 hits (confirms MVP-only annotations present)
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add docs/impl/api-spec.md
  git commit -m "docs: extract API specification from TOR §10 into docs/impl/api-spec.md"
  ```

---

## Task 5: Extract `docs/impl/ui-spec.md`

**Files:**
- Read: `docs/TOR_Workload_WebApp.md` lines 1412–1666 (§7 UI)
- Read: `docs/TOR_Workload_WebApp.md` lines 2453–2482 (§12 Roles)
- Create: `docs/impl/ui-spec.md`

- [ ] **Step 1: Read §7 UI Requirements**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=1412, limit=255
  ```

  Note:
  - §7.1 route list
  - §7.2 СВОД tab description and its columns
  - §7.3 stale indicator — canonical wording
  - §7.6 engineer summary stale banner wording
  - §7.9 СВОД column 5 source (must be JOIN, not field)
  - §7.10 canonical two-state rule for is_stale

- [ ] **Step 2: Read §12 Roles & Permissions**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=2453, limit=30
  ```

- [ ] **Step 3: Write `docs/impl/ui-spec.md`**

  ```markdown
  # UI Specification

  > Extracted from TOR_Workload_WebApp.md §7 + §12. TOR is the source of truth.
  > Last sync: TOR v2.24 (2026-03-25)

  ## Route List (§7.1)

  [Copy full route list verbatim. For each route note PoC/MVP phase.]

  ## Staleness Indicators — Canonical Wording

  **CRITICAL — must be exact strings, not paraphrased:**

  | `is_stale` value | Display text |
  |-----------------|--------------|
  | `'TRUE'`        | "Данные устарели — нажмите Пересчитать" |
  | `'PROCESSING'`  | "Пересчитывается..." |

  This wording applies to ALL three locations: §7.6 (engineer summary),
  §7.9 (СВОД object row), §7.10 (object detail header).

  **PoC:** No stale banners. PoC recalculates synchronously on save — `is_stale`
  is never written. Stale UI is MVP-only (S-02).

  ## Screens

  ### [Screen name from §7.x]
  [For each screen/tab: what data it shows, what actions are available,
   what columns the table has, what PoC/MVP phase each element belongs to]

  Copy all §7.x subsections verbatim.

  ## СВОД Table Columns

  [Copy the СВОД column definition table verbatim from §7.2/§7.9.
   Column 5 source must read: engineer names via object_engineers → users.name JOIN
   (NOT a responsible_engineer field on the objects table — that field does not exist)]

  ## Roles & Permissions (§12)

  [Copy the RBAC matrix verbatim from §12.
   Include the PoC disclaimer note from §12 (PoC has no division scoping).]

  ### Role Definitions

  | Role | Scope | Key Permissions |
  |------|-------|-----------------|
  | admin | global | [copy from §12] |
  | editor | own division | [copy from §12] |
  | viewer | read-only | [copy from §12] |
  | engineer | own objects | [copy from §12] |

  ### Editor Division Scoping (§4.11 / §12)

  Editors may assign **any active engineer** to objects in the editor's own division.
  The engineer picker is NOT filtered by the engineer's home_division_id.
  The editor's division_id scopes which **objects** the editor can see, not which
  engineers they can assign.
  ```

- [ ] **Step 4: Verify completeness**

  ```
  Grep "Данные устарели" in docs/impl/ui-spec.md → exactly 1 hit
  Grep "Пересчитывается" in docs/impl/ui-spec.md → exactly 1 hit
  Grep "responsible_engineer" in docs/impl/ui-spec.md → 0 hits
    (this field must NOT appear — it doesn't exist, engineers are via JOIN)
  Grep "home_division_id" in docs/impl/ui-spec.md → ≥1 hit (editor scoping note)
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add docs/impl/ui-spec.md
  git commit -m "docs: extract UI specification from TOR §7 + §12 into docs/impl/ui-spec.md"
  ```

---

## Task 6: Create Epic Files

**Files:**
- Read: `docs/TOR_Workload_WebApp.md` lines 2849–3236 (§15 PoC Scope — milestones)
- Read: `docs/TOR_Workload_WebApp.md` lines 2671–2848 (§14 Acceptance Criteria)
- Create: `docs/impl/epics/poc-m01-core-crud.md`
- Create: `docs/impl/epics/poc-m02-calculation.md`
- Create: `docs/impl/epics/poc-m03-import.md`
- Create: `docs/impl/epics/mvp-m04-auth.md`
- Create: `docs/impl/epics/mvp-m05-engineers.md`
- Create: `docs/impl/epics/mvp-m06-background.md`
- Create: `docs/impl/epics/mvp-m07-periods.md`

- [ ] **Step 1: Read §15 to identify all milestone definitions**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=2849, limit=388
  ```

  Build a table: for each M-xx, list what it delivers, which S-xx items it reverses.

- [ ] **Step 2: Read §14 Acceptance Criteria**

  ```
  Read tool: file_path=docs/TOR_Workload_WebApp.md, offset=2671, limit=178
  ```

  Note which AC-xx items have "(MVP — requires M-xx)" annotations.

- [ ] **Step 3: Write `docs/impl/epics/poc-m01-core-crud.md`**

  ```markdown
  # Epic: PoC M-01 — Core CRUD

  **Milestone:** M-01 (from TOR §15.7)
  **Phase:** PoC
  **What it delivers:** [copy M-01 description from §15.7]

  ## Functional Requirements Covered

  - FR-01: Object Management (CRUD, hierarchy Division→Branch→Object)
  - FR-02: Device Catalog Management (device types + device-system contexts)
  - FR-03: Object Equipment Inventory (physical + system assignments)
  - FR-05: Repair Type Catalog (admin-managed, no code changes needed to add)
  - FR-06: Travel Data entry

  ## Acceptance Criteria In Scope

  [List all AC-xx items that apply to M-01 from §14. For each:
   AC-xx: [copy verbatim from §14]]

  ## Database Tables Required

  From docs/impl/db-schema.md PoC section:
  - divisions, branches, objects
  - device_types, device_system_contexts
  - object_devices, object_system_assignments
  - repair_types, object_repairs
  - travel
  - users (PoC subset — no is_active, no failed_login_count)

  ## API Endpoints Required

  From docs/impl/api-spec.md PoC section:
  [List only M-01 endpoints]

  ## UI Screens Required

  From docs/impl/ui-spec.md:
  [List routes from §7.1 route list that belong to M-01]

  ## PoC Simplifications Active in This Milestone

  [List S-xx items that are still in force at M-01 — not yet reversed]

  ## Out of Scope for This Milestone

  - Planning periods (M-07)
  - Engineer module (M-05)
  - Staleness tracking (M-06)
  - Auth/RBAC (M-04)
  ```

- [ ] **Step 4: Write remaining epic files using the same structure**

  For each file, use the same template as Step 3, substituting the correct milestone data:

  **`poc-m02-calculation.md`** — FR-07 СВОД, §6 formulas, summaries table writes, PoC synchronous recalc
  **`poc-m03-import.md`** — §11.1 two-step JSON import flow, FR-01 bulk import, object_devices upsert rule (§2.21 changelog — duplicate device entries skip after first)
  **`mvp-m04-auth.md`** — §21 JWT, RBAC from §12, users table MVP columns (is_active, failed_login_count, locked_until), JWT refresh token
  **`mvp-m05-engineers.md`** — FR-10 engineer management, FR-11 object-engineer assignments, §6.12–§6.14 engineer load formulas, engineer_summaries
  **`mvp-m06-background.md`** — AD-13 Redis, background worker, staleness tracking, §17 concurrency/locking, §6.10 cache invalidation
  **`mvp-m07-periods.md`** — FR-12 planning periods, periods table, period_id FKs on object_repairs and records_tasks, read-only past periods rule

- [ ] **Step 5: Verify epic files**

  ```
  Grep "Acceptance Criteria" in docs/impl/epics/*.md → must appear in every file
  Grep "Out of Scope" in docs/impl/epics/*.md → must appear in every file
  Grep "PoC Simplifications" in docs/impl/epics/poc-*.md → must appear in PoC files
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add docs/impl/epics/
  git commit -m "docs: create epic files for PoC milestones M-01 through M-03 and MVP M-04 through M-07"
  ```

---

## Self-Review Checklist

Run after all tasks are complete:

- [ ] **poc-scope.md** contains all S-xx items and all M-xx milestones
- [ ] **db-schema.md** has the PoC schema section distinct from the MVP section; MVP-only columns are annotated
- [ ] **calculation-engine.md** has the К-во ремонтов COUNT clarification (not SUM), the zero-guard rule, and the 3-tier repair threshold
- [ ] **api-spec.md** has `PUT /admin/config` as batch (not `PUT /admin/config/:key`)
- [ ] **ui-spec.md** does NOT contain `responsible_engineer` as a field on the objects table
- [ ] **ui-spec.md** has the canonical stale wording: `TRUE` → "Данные устарели — нажмите Пересчитать"
- [ ] Every epic file has an "Out of Scope" section
- [ ] No extracted document introduces new requirements or changes existing ones — all content traces back to a TOR section

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-03-26-tor-document-extraction.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
