## 5. Data Model

### 5.1 Entity Relationship Overview

> **Transaction isolation level:** `READ COMMITTED` (PostgreSQL default). This is sufficient because all writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue), not concurrent user transactions. The optimistic locking strategy in §17 handles write conflicts on user-facing tables without requiring a stricter isolation level. `REPEATABLE READ` is used only inside the bulk recalculation batch transaction to ensure consistent reads of normatives and assignments throughout the batch.

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

### 5.2 Tables

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
name                 VARCHAR(500) NOT NULL   -- address / description
responsible_engineer VARCHAR(255)
import_seq_no        INTEGER                 -- original № from Excel
created_at           TIMESTAMP
updated_at           TIMESTAMP
```

---

#### `device_types`
```sql
id          UUID         PK
name        VARCHAR(255) NOT NULL UNIQUE
description TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

One row per named device. "Galaxy 512 (контроллер АСПС и СО)" and "Galaxy 512 (Galaxy Dimension GD-520)" are two separate rows because they have distinct names and normatives.

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

This table is the normatives store. A (device, system_type) pair without a row here is not a valid assignment target. Enforced by FK from `object_system_assignments`.

---

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
system_type         VARCHAR(10)   NOT NULL   -- 'ОС' | 'ПС' | 'Видео'
quantity_maintained DECIMAL(10,2) NOT NULL DEFAULT 0
context_id          UUID          FK → device_system_contexts.id NOT NULL
                                  -- ON DELETE RESTRICT
updated_at          TIMESTAMP
UNIQUE(object_id, device_type_id, system_type)
```

`context_id` references the `device_system_contexts` row where `device_type_id` and `system_type` match. This FK guarantees the (device, system) combination is valid. `ON DELETE RESTRICT` prevents deleting a context that has active assignments.

---

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

One row per (object, period) pair. Past-period rows are read-only once the period is deactivated.

#### `repair_types`
```sql
id           UUID          PK
name         VARCHAR(255)  NOT NULL UNIQUE
time_minutes DECIMAL(10,2) NOT NULL
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

Admin-managed catalog. New entries added via UI without schema changes.

#### `object_repairs`
```sql
id             UUID    PK
object_id      UUID    FK → objects.id NOT NULL
repair_type_id UUID    FK → repair_types.id NOT NULL
                        -- ON DELETE RESTRICT
period_id      UUID    FK → periods.id NOT NULL
count          INTEGER NOT NULL DEFAULT 0
updated_at     TIMESTAMP
UNIQUE(object_id, repair_type_id, period_id)
```

One row per (object, repair_type, period). Past-period rows are read-only once the period is deactivated.

#### `travel`
```sql
id               UUID          PK
object_id        UUID          FK → objects.id UNIQUE NOT NULL
transport_type   VARCHAR(100)
distance_km      DECIMAL(8,2)  NOT NULL DEFAULT 0
one_way_time_min DECIMAL(8,2)  NOT NULL DEFAULT 0
-- round_trip_min is always derived: one_way_time_min × 2. Never stored.
updated_at       TIMESTAMP
```

#### `periods` — Planning Periods
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

---

#### `app_config`
```sql
key         VARCHAR(100) PK
value       VARCHAR(255) NOT NULL
description TEXT
updated_at  TIMESTAMP
updated_by  UUID         FK → users.id
```

All named calculation constants (see §6.12). Changes to any key trigger bulk summary invalidation.

#### `summaries` — Computed Cache

> Summaries are computed from the **active period's** records and repairs data by default. The `period_id` used for the latest computation is stored for traceability.

```sql
id                         UUID           PK
object_id                  UUID           FK → objects.id UNIQUE NOT NULL

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
records_6months            DECIMAL(10,4)
records_monthly            DECIMAL(10,4)   -- СВОД col "Записи"

-- Repairs (6-month horizon ÷ 5)
total_repairs              INTEGER         -- kvo = COUNT(repair_types WHERE count > 0 in period)
repair_work_6months        DECIMAL(10,4)   -- SUM(count × time_minutes) for performed types
repair_travel_6months      DECIMAL(10,4)   -- effective_trips × round_trip_min  (threshold formula §6.6)
repair_pzv_6months         DECIMAL(10,4)   -- effective_trips × PZV_MINUTES     (threshold formula §6.6)
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

period_id                  UUID            FK → periods.id  -- period used for this computation
is_stale                   BOOLEAN         NOT NULL DEFAULT FALSE
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
                               -- scope restriction for editors; NULL = all divisions
home_division_id UUID          FK → divisions.id NULL
                               -- display/filter home for engineers; no access restriction
capacity_fte     DECIMAL(4,2)  NOT NULL DEFAULT 1.0
                               -- meaningful only for role='engineer'; ignored for others
employee_id      VARCHAR(100)  NULL     -- optional HR identifier
password_hash    VARCHAR(255)
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

> **Note:** `division_id` is the **access-control** scope used by editors.  
> `home_division_id` is the **display** home for engineers — they can be assigned to objects in any division regardless of this value.

#### `object_engineers` — Object-Engineer Assignments
```sql
id          UUID      PK
object_id   UUID      FK → objects.id NOT NULL
engineer_id UUID      FK → users.id   NOT NULL  -- must have role = 'engineer'
assigned_at TIMESTAMP NOT NULL DEFAULT now()
assigned_by UUID      FK → users.id   NULL       -- who created the assignment
UNIQUE(object_id, engineer_id)
```

`engineer_count` for workload splitting is computed at query time as  
`COUNT(*) WHERE object_id = :id` — never stored.

---

#### `engineer_summaries` — Per-Engineer Computed Cache
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

is_stale              BOOLEAN         NOT NULL DEFAULT FALSE
computed_at           TIMESTAMP
```

---

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

Captures changes to `device_system_contexts`, `device_types`, `repair_types`, `app_config`, `object_engineers`, `users.capacity_fte`.

### 5.3 Indexing Strategy

All indexes defined here are part of the initial Liquibase migration (`v1.0.0-initial-schema.xml`). Indexes marked **MVP** are added in the relevant MVP migration file.

#### Mandatory indexes for PoC query performance

```sql
-- Object list filtering (most common read path)
CREATE INDEX idx_objects_branch_id       ON objects(branch_id);
CREATE INDEX idx_objects_name            ON objects(name);   -- for search

-- Equipment lookup (critical for calculation)
CREATE INDEX idx_obj_devices_object      ON object_devices(object_id);
CREATE INDEX idx_obj_assignments_object  ON object_system_assignments(object_id);
CREATE INDEX idx_obj_assignments_context ON object_system_assignments(context_id);

-- Repairs and records (calculation + period scope)
CREATE INDEX idx_repairs_object_period   ON object_repairs(object_id, period_id);
CREATE INDEX idx_records_object_period   ON records_tasks(object_id, period_id);

-- Engineer assignment lookup
CREATE INDEX idx_obj_engineers_object    ON object_engineers(object_id);
CREATE INDEX idx_obj_engineers_engineer  ON object_engineers(engineer_id);

-- Summaries (СВОД page, aggregation queries)
CREATE INDEX idx_summaries_object        ON summaries(object_id);
CREATE INDEX idx_summaries_stale         ON summaries(is_stale) WHERE is_stale = TRUE;
CREATE INDEX idx_eng_summaries_engineer  ON engineer_summaries(engineer_id);
CREATE INDEX idx_eng_summaries_stale     ON engineer_summaries(is_stale) WHERE is_stale = TRUE;

-- Aggregation (§16 — live SUM over summaries joined to org hierarchy)
CREATE INDEX idx_branches_division       ON branches(division_id);
-- NOTE: aggregation query path: summaries → objects → branches → divisions
-- A covering index on objects(branch_id, id) avoids a second lookup:
CREATE INDEX idx_objects_branch_covering ON objects(branch_id) INCLUDE (id);
```

#### Already defined as UNIQUE (double as indexes automatically)
```sql
-- divisions.name UNIQUE
-- branches(division_id, name) UNIQUE
-- device_types.name UNIQUE
-- device_system_contexts(device_type_id, system_type) UNIQUE
-- object_devices(object_id, device_type_id) UNIQUE
-- object_system_assignments(object_id, device_type_id, system_type) UNIQUE
-- records_tasks(object_id, period_id) UNIQUE
-- object_repairs(object_id, repair_type_id, period_id) UNIQUE
-- travel.object_id UNIQUE
-- periods: one_active_period partial UNIQUE INDEX
-- summaries.object_id UNIQUE
-- engineer_summaries.engineer_id UNIQUE
-- object_engineers(object_id, engineer_id) UNIQUE
-- users.email UNIQUE
```

#### MVP-only indexes

```sql
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

#### Index validation requirement

The integration test suite (§19.3) must include an `IndexUsageTest` that runs `EXPLAIN ANALYZE` on the five most-used query patterns and asserts that no `Seq Scan` appears on tables with more than 100 rows. This prevents index regressions from schema migrations going undetected.

---

