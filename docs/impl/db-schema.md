# Database Schema

> Extracted from TOR_Workload_WebApp.md §5 + §11.3. TOR is the source of truth.
> Last sync: TOR v2.26 (2026-03-26)

## Transaction Isolation

> **Transaction isolation level:** `READ COMMITTED` (PostgreSQL default). This is sufficient because **MVP:** all writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue) — see AD-13 and S-02. **PoC:** Summaries are written synchronously in the request thread on save; no background worker or Redis is used. The optimistic locking strategy in §17 handles write conflicts on user-facing tables without requiring a stricter isolation level. `REPEATABLE READ` is used only inside the bulk recalculation batch transaction to ensure consistent reads of normatives and assignments throughout the batch.

## Entity Relationship Overview

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

## Tables — PoC Schema

### `divisions`

```sql
id          UUID         PK
name        VARCHAR(255) NOT NULL UNIQUE
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### `branches`

```sql
id          UUID         PK
division_id UUID         FK → divisions.id NOT NULL
name        VARCHAR(255) NOT NULL
created_at  TIMESTAMP
updated_at  TIMESTAMP
UNIQUE(division_id, name)
```

### `objects`

```sql
id                   UUID         PK
branch_id            UUID         FK → branches.id NOT NULL
name                 VARCHAR(500) NOT NULL   -- address / description
import_seq_no        INTEGER                 -- original № from Excel
created_at           TIMESTAMP
updated_at           TIMESTAMP
```

### `device_types`

```sql
id          UUID         PK
name        VARCHAR(255) NOT NULL UNIQUE
description TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

One row per named device. "Galaxy 512 (контроллер АСПС и СО)" and "Galaxy 512 (Galaxy Dimension GD-520)" are two separate rows because they have distinct names and normatives.

### `device_system_contexts`

```sql
id             UUID          PK
device_type_id UUID          FK → device_types.id NOT NULL
system_type    VARCHAR(10)   NOT NULL   -- 'OS' | 'PS' | 'Video'
r1_minutes     DECIMAL(10,4) NOT NULL
r2_minutes     DECIMAL(10,4) NOT NULL
created_at     TIMESTAMP
updated_at     TIMESTAMP
UNIQUE(device_type_id, system_type)
```

This table is the normatives store. A (device, system_type) pair without a row here is not a valid assignment target. Enforced by FK from `object_system_assignments`.

### `object_devices` — Physical Inventory

```sql
id                UUID          PK
object_id         UUID          FK → objects.id NOT NULL  -- ON DELETE CASCADE
device_type_id    UUID          FK → device_types.id NOT NULL
quantity_physical DECIMAL(10,2) NOT NULL DEFAULT 0
updated_at        TIMESTAMP
UNIQUE(object_id, device_type_id)
```

### `object_system_assignments` — Maintenance Assignments

```sql
id                  UUID          PK
object_id           UUID          FK → objects.id NOT NULL  -- ON DELETE CASCADE
device_type_id      UUID          FK → device_types.id NOT NULL
system_type         VARCHAR(10)   NOT NULL   -- 'OS' | 'PS' | 'Video'
quantity_maintained DECIMAL(10,2) NOT NULL DEFAULT 0
context_id          UUID          FK → device_system_contexts.id NOT NULL
                                  -- ON DELETE RESTRICT
updated_at          TIMESTAMP
UNIQUE(object_id, device_type_id, system_type)
```

`context_id` references the `device_system_contexts` row where `device_type_id` and `system_type` match. This FK guarantees the (device, system) combination is valid. `ON DELETE RESTRICT` prevents deleting a context that has active assignments.

### `records_tasks`

```sql
id                  UUID          PK
object_id           UUID          FK → objects.id NOT NULL  -- ON DELETE CASCADE
access_requests     DECIMAL(10,2) NOT NULL DEFAULT 0
monitoring_requests DECIMAL(10,2) NOT NULL DEFAULT 0
footage_requests    DECIMAL(10,2) NOT NULL DEFAULT 0
backup_control      DECIMAL(10,2) NOT NULL DEFAULT 0
security_admin      DECIMAL(10,2) NOT NULL DEFAULT 0
updated_at          TIMESTAMP
UNIQUE(object_id)
-- MVP: period_id column and UNIQUE(object_id, period_id) added in M-07
```

One row per object. No period scope in PoC (S-05).

### `repair_types`

```sql
id           UUID          PK
name         VARCHAR(255)  NOT NULL UNIQUE
time_minutes DECIMAL(10,2) NOT NULL
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

Admin-managed catalog. New entries added via UI without schema changes.

### `object_repairs`

```sql
id             UUID    PK
object_id      UUID    FK → objects.id NOT NULL  -- ON DELETE CASCADE
repair_type_id UUID    FK → repair_types.id NOT NULL
                        -- ON DELETE RESTRICT
count          INTEGER NOT NULL DEFAULT 0
updated_at     TIMESTAMP
UNIQUE(object_id, repair_type_id)
-- MVP: period_id column and UNIQUE(object_id, repair_type_id, period_id) added in M-07
```

One row per (object, repair_type). No period scope in PoC (S-05).

### `travel`

```sql
id               UUID          PK
object_id        UUID          FK → objects.id UNIQUE NOT NULL  -- ON DELETE CASCADE
transport_type   VARCHAR(100)
distance_km      DECIMAL(8,2)  NOT NULL DEFAULT 0
one_way_time_min DECIMAL(8,2)  NOT NULL DEFAULT 0
-- round_trip_min is always derived: one_way_time_min × 2. Never stored.
updated_at       TIMESTAMP
```

### `users`

```sql
id               UUID          PK
email            VARCHAR(255)  NOT NULL UNIQUE
name             VARCHAR(255)
role             VARCHAR(20)   NOT NULL DEFAULT 'viewer'
                               -- 'admin' | 'editor' | 'viewer' | 'engineer'
division_id      UUID          FK → divisions.id NULL
                               -- scope restriction for editors; NULL = all divisions
home_division_id UUID          FK → divisions.id NULL
                               -- display/filter home for engineers; no access restriction
is_engineer           BOOLEAN       NOT NULL DEFAULT FALSE  -- MVP only: job function, independent of role (M-02)
                                     CHECK (role <> 'engineer' OR is_engineer = TRUE)
capacity_fte          DECIMAL(4,2)  NOT NULL DEFAULT 1.0
                                     -- meaningful only when is_engineer = TRUE; ignored for others
                                     CHECK (capacity_fte > 0)
employee_id           VARCHAR(100)  NULL     -- optional HR identifier
is_active             BOOLEAN       NOT NULL DEFAULT TRUE
                                     -- FALSE = deactivated (hidden from dropdowns, historical data preserved)
requires_activation   BOOLEAN       NOT NULL DEFAULT FALSE
                                     -- TRUE = placeholder account created by import; needs admin activation
password_hash         VARCHAR(255)
failed_login_count    INTEGER       NOT NULL DEFAULT 0     -- MVP only: brute-force protection (§21.3)
locked_until          TIMESTAMP     NULL                   -- MVP only: account lockout expiry (§21.3)
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

> **Note:** `division_id` is the **access-control** scope used by editors — it restricts which **objects** (and their branches) an editor can manage. It does **not** restrict which engineers an editor can see or assign.
> `home_division_id` is the **display** home for engineers — used for grouping and filtering in reports and dashboards. Engineers can be assigned to objects in any division regardless of this value, and editors can assign any active engineer to objects in their own division.
> `is_active` controls soft-delete for engineers (AD-18). Inactive engineers are hidden from assignment dropdowns but their historical data is preserved (C-24).
> `requires_activation` flags placeholder accounts created during import (C-31). Admins activate them by setting a password.
> `is_engineer` (MVP, M-02) is the job function; `role` is the permission tier. They vary independently, so an engineer promoted to `editor` or `admin` stays in `GET /engineers`, stays assignable, and keeps their workload share. `ck_users_engineer_role` constrains the other direction: `role = 'engineer'` is the self-scoped tier and is only valid for an account that is actually an engineer.

### `object_engineers` — Object-Engineer Assignments

```sql
id          UUID      PK
object_id   UUID      FK → objects.id NOT NULL  -- ON DELETE CASCADE
engineer_id UUID      FK → users.id   NOT NULL  -- must have role = 'engineer'
                                                 -- ON DELETE RESTRICT
assigned_at TIMESTAMP NOT NULL DEFAULT now()
assigned_by UUID      FK → users.id   NULL       -- who created the assignment
UNIQUE(object_id, engineer_id)
```

`engineer_count` for workload splitting is computed at query time as
`COUNT(*) WHERE object_id = :id` — never stored.

### `summaries` — Computed Cache

> This is a computed cache table. Recalculation is synchronous on save in PoC (S-02). No `is_stale` tracking, no background worker, no `period_id` FK in PoC.

> **PoC WARNING:** The `v1.0.0` Liquibase migration must NOT include the columns marked `-- MVP only (M-06)` below. Those columns are added in M-06. See TOR §15.8.

```sql
id                         UUID           PK
object_id                  UUID           FK → objects.id UNIQUE NOT NULL  -- ON DELETE CASCADE

-- Per-system per-visit subtotals (→ СВОД cols R, S)
os_r1_per_visit            DECIMAL(10,4)
os_r2_per_visit            DECIMAL(10,4)
ps_r1_per_visit            DECIMAL(10,4)
ps_r2_per_visit            DECIMAL(10,4)
video_r1_per_visit         DECIMAL(10,4)
video_r2_per_visit         DECIMAL(10,4)
r1_per_visit_total         DECIMAL(10,4)   -- СВОД col R
r2_per_visit_total         DECIMAL(10,4)   -- СВОД col S

-- Monthly averages: (R1_annual + R2_annual) / 12
os_monthly_avg             DECIMAL(10,4)   -- СВОД col "Охрана"
ps_monthly_avg             DECIMAL(10,4)   -- СВОД col "Пожарная сигнализация"
video_monthly_avg          DECIMAL(10,4)   -- СВОД col "Видео"

-- Records (6-month total ÷ 6)
records_6months            DECIMAL(10,4)   -- MVP only (M-06): intermediate field, not persisted in PoC
records_monthly            DECIMAL(10,4)   -- СВОД col "Записи"

-- Repairs (6-month horizon ÷ 5)
total_repairs              INTEGER         -- MVP only (M-06): intermediate field, not persisted in PoC
repair_work_6months        DECIMAL(10,4)   -- MVP only (M-06): intermediate field, not persisted in PoC
repair_travel_6months      DECIMAL(10,4)   -- MVP only (M-06): intermediate field, not persisted in PoC
repair_pzv_6months         DECIMAL(10,4)   -- MVP only (M-06): intermediate field, not persisted in PoC
repair_no_travel_monthly   DECIMAL(10,4)   -- СВОД col "Ремонт без дороги"
repair_with_travel_monthly DECIMAL(10,4)   -- СВОД col "Ремонт с дорогой"

-- Travel
round_trip_min             DECIMAL(10,4)   -- one_way_time_min × 2
pzv_minutes                DECIMAL(10,4)   -- PZV_MINUTES at compute time

-- СВОД final totals
total_no_travel_min        DECIMAL(10,4)   -- СВОД col "ТО+ремонт(без дороги)+Дорога"
itogo_chislo_no_travel     DECIMAL(14,10)  -- СВОД col "ИТОГО Числ (без дороги)"
total_with_travel_min      DECIMAL(10,4)   -- СВОД col "ТО+ремонт(с дорогой)+Дорога"
itogo_chislo_with_travel   DECIMAL(14,10)  -- СВОД col "ИТОГО Числ (с дорогой)"

period_id                  UUID            FK → periods.id  -- MVP only (M-06): period used for this computation
is_stale                   VARCHAR(20)     -- MVP only (M-06): 'FALSE' | 'TRUE' | 'PROCESSING'
                                           -- 'PROCESSING' used by background worker (§17.7) to claim a batch
computed_at                TIMESTAMP
```

### `engineer_summaries` — Per-Engineer Computed Cache

> This is a computed cache table, one row per engineer.

```sql
id                    UUID          PK
engineer_id           UUID          FK → users.id UNIQUE NOT NULL

-- Total load across all assigned objects
total_load            DECIMAL(14,10)  -- SUM of object shares
object_count          INTEGER         -- number of assigned objects

-- Breakdown by system component (engineer's share of each)
os_load               DECIMAL(14,10)
ps_load               DECIMAL(14,10)
video_load            DECIMAL(14,10)
records_load          DECIMAL(14,10)
repair_load           DECIMAL(14,10)

-- Capacity and status
capacity_fte          DECIMAL(4,2)    -- snapshot of capacity at compute time
load_ratio            DECIMAL(10,6)   -- total_load / capacity_fte
status                VARCHAR(20)     -- 'normal' | 'warning' | 'overloaded'

is_stale              VARCHAR(20)     -- MVP only (M-06): 'FALSE' | 'TRUE' | 'PROCESSING'
computed_at           TIMESTAMP
```

## Tables — MVP Additions

### `periods` — Planning Periods

```sql
id          UUID         PK
name        VARCHAR(50)  NOT NULL UNIQUE   -- e.g. "H1 2025"
start_date  DATE         NOT NULL
end_date    DATE         NOT NULL
is_active   BOOLEAN      NOT NULL DEFAULT FALSE
created_at  TIMESTAMP
updated_at  TIMESTAMP
CHECK (end_date > start_date)
```

Only one row may have `is_active = TRUE` at a time. Enforced by a partial unique index:

```sql
CREATE UNIQUE INDEX one_active_period ON periods (is_active) WHERE is_active = TRUE;
```

### `app_config`

```sql
key         VARCHAR(100) PK
value       VARCHAR(255) NOT NULL
description TEXT
updated_at  TIMESTAMP
updated_by  UUID         FK → users.id
```

All named calculation constants (see §6.11). **MVP (M-10):** This table is created in M-10 when admin-editable configuration is introduced; changes to any key trigger bulk summary invalidation (§6.10). **PoC (S-03):** This table is not created — constants are bound at startup as Docker environment variables via `@ConfigurationProperties(prefix="workload.config")`; the admin config UI is introduced in M-10.

### `audit_log`

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

Captures changes to `device_system_contexts`, `device_types`, `repair_types`, `app_config`, `object_engineers`, `users.capacity_fte`.

### MVP-only columns on existing tables

| Table   | Column               | Note                                     |
| ------- | -------------------- | ---------------------------------------- |
| `users` | `failed_login_count` | Brute-force protection counter (§21.3)   |
| `users` | `locked_until`       | Account lockout expiry timestamp (§21.3) |
| `users` | `is_engineer`        | Job function, independent of `role` (M-02) |

> **Note:** `users.is_active` is NOT an MVP addition. It is present in the PoC schema (TOR §15.4, S-04 note on AD-18). Filtering inactive engineers from assignment dropdowns must be implemented in PoC.

## Indexing Strategy (§5.3)

All indexes defined here are part of the initial Liquibase migration (`v1.0.0-initial-schema.xml`). Indexes marked **MVP** are added in the relevant MVP migration file.

### Mandatory indexes for PoC query performance

```sql
-- Object list filtering (most common read path)
CREATE INDEX idx_objects_branch_id       ON objects(branch_id);
CREATE INDEX idx_objects_name            ON objects(name);   -- for search

-- Equipment lookup (critical for calculation)
CREATE INDEX idx_obj_devices_object      ON object_devices(object_id);
CREATE INDEX idx_obj_assignments_object  ON object_system_assignments(object_id);
CREATE INDEX idx_obj_assignments_context ON object_system_assignments(context_id);

-- Repairs and records (calculation; no period scope in PoC)
CREATE INDEX idx_repairs_object   ON object_repairs(object_id);
CREATE INDEX idx_records_object   ON records_tasks(object_id);

-- Engineer assignment lookup
CREATE INDEX idx_obj_engineers_object    ON object_engineers(object_id);
CREATE INDEX idx_obj_engineers_engineer  ON object_engineers(engineer_id);

-- Summaries (СВОД page, aggregation queries)
CREATE INDEX idx_summaries_object        ON summaries(object_id);
CREATE INDEX idx_eng_summaries_engineer  ON engineer_summaries(engineer_id);

-- Aggregation (§16 — live SUM over summaries joined to org hierarchy)
CREATE INDEX idx_branches_division       ON branches(division_id);
-- NOTE: aggregation query path: summaries → objects → branches → divisions
-- A covering index on objects(branch_id, id) avoids a second lookup:
CREATE INDEX idx_objects_branch_covering ON objects(branch_id) INCLUDE (id);
```

### Already defined as UNIQUE (double as indexes automatically)

```sql
-- divisions.name UNIQUE
-- branches(division_id, name) UNIQUE
-- device_types.name UNIQUE
-- device_system_contexts(device_type_id, system_type) UNIQUE
-- object_devices(object_id, device_type_id) UNIQUE
-- object_system_assignments(object_id, device_type_id, system_type) UNIQUE
-- records_tasks(object_id) UNIQUE                         -- PoC; upgraded to (object_id, period_id) in MVP (M-07)
-- object_repairs(object_id, repair_type_id) UNIQUE        -- PoC; upgraded to (object_id, repair_type_id, period_id) in MVP (M-07)
-- travel.object_id UNIQUE
-- periods: one_active_period partial UNIQUE INDEX          -- MVP (M-07)
-- summaries.object_id UNIQUE
-- engineer_summaries.engineer_id UNIQUE
-- object_engineers(object_id, engineer_id) UNIQUE
-- users.email UNIQUE
```

### MVP-only indexes

```sql
-- Staleness indexes (added in M-06 along with is_stale column)
CREATE INDEX idx_summaries_stale ON summaries(is_stale) WHERE is_stale = 'TRUE';              -- MVP (M-06)
CREATE INDEX idx_summaries_processing ON summaries(is_stale) WHERE is_stale = 'PROCESSING';   -- MVP (M-06) watchdog (§17.7)
CREATE INDEX idx_eng_summaries_stale ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'; -- MVP (M-06)
CREATE INDEX idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'; -- MVP (M-06)

-- Period-scope indexes (added in M-07 along with period_id column)
CREATE INDEX idx_repairs_object_period ON object_repairs(object_id, period_id);  -- MVP (M-07)
CREATE INDEX idx_records_object_period ON records_tasks(object_id, period_id);   -- MVP (M-07)

-- Full-text search on object name (if ilike search becomes slow at 10k rows)
CREATE INDEX idx_objects_name_gin ON objects USING gin(to_tsvector('russian', name));  -- MVP

-- Audit log queries (admin UI)
CREATE INDEX idx_audit_table_record  ON audit_log(table_name, record_id);  -- MVP
CREATE INDEX idx_audit_user          ON audit_log(user_id);                -- MVP
CREATE INDEX idx_audit_created       ON audit_log(created_at DESC);        -- MVP

-- Engineer home division lookup (aggregation §16.6)
CREATE INDEX idx_users_home_division ON users(home_division_id)
  WHERE role = 'engineer' AND is_active = TRUE;                            -- MVP
```

### Index validation requirement

The integration test suite (§19.3) must include an `IndexUsageTest` that runs `EXPLAIN ANALYZE` on the five most-used query patterns and asserts that no `Seq Scan` appears on tables with more than 100 rows. This prevents index regressions from schema migrations going undetected.

## Seed Data

### Device Types & Contexts

#### ПС contexts

| Device                            | R1 (min) | R2 (min) |
| --------------------------------- | -------- | -------- |
| серий А6, Аларм                   | 5        | 12       |
| А16-512                           | 6        | 13       |
| СПИ УОО Молния                    | 2        | 3        |
| АМ200-Notifier                    | 5        | 10       |
| Шлейфы сигнализации               | 0.06     | 0.7      |
| Каналы считывания                 | 0.02     | 1.5      |
| Извещатели, оповещатели           | 0.3      | 4        |
| Таблички                          | 0.3      | 2        |
| Galaxy 512 (контроллер АСПС и СО) | 15       | 20       |
| Оракул                            | 3        | 15       |
| Танго ПУ/БП                       | 1        | 17       |
| Танго ПУ/ЗК                       | 1        | 19       |
| Расширитель                       | 0.03     | 3        |
| Адресный модуль                   | 0.03     | 1.8      |
| Адресный шлейфно-релейный модуль  | 0.03     | 3        |
| Усилитель линии УЛТ               | 0.03     | 1        |
| Адресные извещатели               | 0.2      | 2.3      |
| Колонки                           | 0.4      | 3        |

#### ОС contexts

| Device                               | R1 (min) | R2 (min) |
| ------------------------------------ | -------- | -------- |
| Galaxy 512 (Galaxy Dimension GD-520) | 7        | 20       |
| Maestro (ППК ОП Maestro-1600)        | 5        | 10       |
| серий А6, Аларм                      | 5        | 8        |
| А16-512                              | 5        | 10       |
| Выносная панель управления ВПУ–А-16  | 4.5      | 4.5      |
| Устройство доступа                   | 1        | 4        |
| Шлейфы сигнализации                  | 0.06     | 0.7      |
| Каналы считывания                    | 0.02     | 1.5      |
| Извещатели, оповещатели              | 0.7      | 3        |
| Galaxy 512 (контроллер АСПС и СО)    | 15       | 20       |
| Расширитель                          | 0.03     | 3        |
| Контроллер системы                   | 3        | 9.5      |
| Системный блок ПЦН                   | 10       | 40       |
| ББП-20, ББП-3/12 (БРП 2401)          | 0.03     | 3        |

#### Видео contexts

| Device                        | R1 (min) | R2 (min) |
| ----------------------------- | -------- | -------- |
| Видеокамеры                   | 1.5      | 1.5      |
| Микрофоны                     | 0.5      | 0.5      |
| Системный блок (видео сервер) | 10       | 40       |

> Note: "серий А6, Аларм", "А16-512", "Расширитель", "Galaxy 512 (контроллер АСПС и СО)" appear in both ОС and ПС. They are **one device_type record each** with **two context rows** (different R1/R2 per system where applicable).

### Repair Types

| Repair Type                                               | Time (min) |
| --------------------------------------------------------- | ---------- |
| Замена ПКП серии А6 ОС                                    | 150        |
| Замена ПКП серии А6 ПС                                    | 150        |
| Замена извещателя охранного оптико-электронного           | 15         |
| Замена извещателя пожарного дымового                      | 12         |
| Замена шунтирующих/оконечного резисторов шлейфа ОС        | 35         |
| Замена шунтирующих/оконечного резисторов шлейфа ПС        | 35         |
| Замена блока бесперебойного питания ОС                    | 30         |
| Замена блока бесперебойного питания ПС                    | 30         |
| Замена аккумулятора ОС                                    | 5          |
| Замена аккумулятора ПС                                    | 5          |
| Замена блока питания видеосервера                         | 20         |
| Замена винчестера видеосервера                            | 10         |
| Замена основных составных частей видеосервера в комплексе | 30         |
| Переустановка ПО на видеосервере                          | 90         |
| Восстановление сигнала IP камеры                          | 35         |
| Восстановление сигнала аналоговой камеры                  | 20         |
| Акт о выполненных работах ОС                              | 7          |
| Дефектный акт ОС                                          | 60         |
| Акт на списание ТМЦ из подотчета ОС                       | 20         |
| Акт о выполненных работах ПС                              | 7          |
| Дефектный акт ПС                                          | 60         |
| Акт на списание ТМЦ из подотчета ПС                       | 20         |
| Акт о выполненных работах Видео                           | 7          |
| Дефектный акт Видео                                       | 60         |
| Акт на списание ТМЦ из подотчета Видео                    | 20         |

## Migration File Structure (§11.3)

Use **Liquibase** for all schema versioning. Changelogs live in `src/main/resources/db/changelog/`. Structure:

```
db/changelog/
  db.changelog-master.xml        ← root changelog, includes all others
  changes/
    v1.0.0-initial-schema.xml    ← PoC schema (divisions, branches, objects, device catalog,
                                     object_devices, object_system_assignments, summaries, …)
    v1.1.0-periods.xml           ← MVP: planning periods (FR-12)
    v1.2.0-rbac.xml              ← MVP: roles, division scoping (M-02)
    v1.3.0-app-config.xml        ← MVP: app_config table and admin UI (M-10)
    …
```

Liquibase runs automatically on application startup via Spring Boot auto-configuration. **Never alter production schema manually.** All changes go through versioned changesets with `author`, `id`, and rollback instructions where applicable.

Seed data (device types, system contexts, repair types) is loaded as a Liquibase changeset — not application-level code — so it runs exactly once and is versioned alongside schema changes.
