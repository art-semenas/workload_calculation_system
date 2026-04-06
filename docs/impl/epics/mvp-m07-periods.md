# Epic: MVP M-07 — Planning Periods

**Milestone:** M-07 (from TOR §15.7)
**Phase:** MVP
**What it delivers:** FR-12 planning periods, `periods` table, `period_id` FKs on `object_repairs` and `records_tasks` (with updated UNIQUE constraints), period selector in СВОД UI, read-only enforcement for past periods, data entry blocking when no active period. Resolves S-05. Depends on M-01 and M-06.

## Functional Requirements Covered

- **FR-12 — Planning Periods (§4.12):** Repair counts and records tasks are tied to a specific 6-month planning period. A period covers H1 (January–June) or H2 (July–December) of a calendar year. Only one period can be `is_active = TRUE` at a time. All data entry for repairs and records defaults to the currently active period. Past periods are read-only — their data cannot be edited once the period is no longer active. СВОД calculations use active period's data by default; users can select any past period for historical comparison. When no period is active, data entry for repairs and records is blocked with a warning.

## Acceptance Criteria In Scope

**AC-19:** Repair counts entered in period H1 2025 must not appear in H2 2025 calculations. After switching the active period, `GET /objects/:id/repairs` returns 0 counts for repair types with no H2 2025 rows, even if H1 2025 rows exist for the same types.

**AC-30:** `POST /admin/periods` creates a new period with `name`, `startDate`, `endDate`. `PUT /admin/periods/:id/activate` sets the period as active and deactivates the previously active period — verified by `GET /admin/periods/active` returning the newly activated period. Only one period can be active at a time.

**AC-31:** After deactivating a period, `PUT /objects/:id/records` and `PUT /objects/:id/repairs/:rtid` targeting the deactivated period return HTTP 403 or 422 with a message indicating the period is read-only. Data for the deactivated period remains unchanged and accessible via `GET` endpoints.

**AC-32:** When no period is active (all periods deactivated), `PUT /objects/:id/records` and `PUT /objects/:id/repairs/:rtid` return HTTP 422 with a message indicating no active period exists. The UI shows a warning that data entry is blocked until an admin activates a period.

## Database Tables Required

From docs/impl/db-schema.md:

### New table

**`periods`:**
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

Partial unique index (only one active period at a time):
```sql
CREATE UNIQUE INDEX one_active_period ON periods (is_active) WHERE is_active = TRUE;
```

### Schema changes to existing tables (Liquibase migration)

**`records_tasks` — critical data model change:**
- Add column: `period_id UUID FK → periods.id NOT NULL`
- Drop old UNIQUE constraint: `UNIQUE(object_id)`
- Add new UNIQUE constraint: `UNIQUE(object_id, period_id)`
- Add index: `CREATE INDEX idx_records_object_period ON records_tasks(object_id, period_id)`

**`object_repairs` — critical data model change:**
- Add column: `period_id UUID FK → periods.id NOT NULL`
- Drop old UNIQUE constraint: `UNIQUE(object_id, repair_type_id)`
- Add new UNIQUE constraint: `UNIQUE(object_id, repair_type_id, period_id)`
- Add index: `CREATE INDEX idx_repairs_object_period ON object_repairs(object_id, period_id)`

> **Migration note:** Existing PoC rows in `records_tasks` and `object_repairs` (which have no `period_id`) must be migrated. Options: (a) create a "migration" period, backfill all existing rows to that period, then activate the first real period; (b) delete PoC demo data and start fresh. Strategy must be decided before this migration runs.

**`summaries` — populate `period_id` FK (column added in M-06):**
- `period_id UUID FK → periods.id` was added as nullable in M-06. From M-07 onward, it is populated with the active period's id at recalculation time.

## API Endpoints Required

From docs/impl/api-spec.md:

### Planning Periods (MVP only — M-07)

- `GET /admin/periods` — list all planning periods. Admin only.
- `POST /admin/periods` — create a new planning period. Request body: `{ name, startDate, endDate }`. Admin only.
- `GET /admin/periods/:id` — get period details. Admin only.
- `PUT /admin/periods/:id/activate` — set a period as active; deactivates current active period. Admin only.
- `GET /admin/periods/active` — get the currently active planning period.

### Behaviour changes on existing endpoints

**Records and repairs write endpoints gain period scope:**
- `PUT /objects/:id/records` — now scoped to active period. Returns `422` if no active period. Returns `403`/`422` if period is read-only (deactivated).
- `PUT /objects/:id/repairs/:rtid` — same period scoping and enforcement.

**Records and repairs read endpoints gain period filtering:**
- `GET /objects/:id/records` — returns records for active period by default; `?periodId=` for historical.
- `GET /objects/:id/repairs` — same.

**СВОД and export endpoints gain period filtering:**
- `GET /svod` — `?periodId=` param for historical СВОД.
- `GET /svod/export/xlsx` — `?periodId=` param; defaults to active period.

**Import endpoint (`POST /import/data/confirm` from M-01):**
- `records_tasks` and `object_repairs` upsert now uses `period_id = active_period.id`. Returns `422` if no active period.

## UI Screens Required

From docs/impl/ui-spec.md:

- `/admin/periods` — Planning Periods management page (MVP only, admin only). Create periods, activate/deactivate. Shows all periods with status, dates.
- `/svod` — updated: period selector dropdown above СВОД table. Defaults to active period. When non-active period selected: table shows historical data (read-only), "Пересчитать" button disabled.
- `/objects/:id` — Записи tab and Ремонт tab: show active period label. Read-only indicator when viewing past period. Warning banner when no active period exists.

## Data Entry Rules

- All new data entry (UI and API) defaults to `period_id = active_period.id`.
- When no period is active: `PUT /objects/:id/records` and `PUT /objects/:id/repairs/:rtid` return HTTP 422 with "no active period" message. UI shows warning.
- Once a period is deactivated: all its Записи and Ремонт data is read-only for all roles including admin. Period lock is absolute.
- СВОД calculations use active period's data; historical periods accessible read-only via period selector.

## PoC Simplifications Active in This Milestone

None — this milestone **reverses S-05** (no planning periods in PoC).

Other simplifications already reversed by predecessor milestones:
- S-06 reversed by M-01 (import)
- S-04 reversed by M-02 (RBAC)
- S-03 partially reversed by M-04/M-05 (catalog UI)
- S-02 reversed by M-06 (staleness tracking)

Simplifications not yet reversed at this point:
- **S-07:** Audit log — M-08 (if not yet deployed)
- **S-09:** Concurrency / optimistic locking — M-09 (if not yet deployed)

## Out of Scope for This Milestone

- Audit log for period activation/deactivation — M-08
- Optimistic locking on period writes — M-09
- `app_config` admin UI — M-10
- PDF export — M-11 (post-MVP)
- Object inventory XLSX export — M-12
- Background worker already delivered in M-06 — no changes needed here
