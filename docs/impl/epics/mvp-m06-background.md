# Epic: MVP M-06 — Staleness Tracking & Background Recalculation

**Milestone:** M-06 (from TOR §15.7)
**Phase:** MVP
**What it delivers:** AD-13 Redis introduction, background recalculation worker, staleness tracking (`is_stale` column on `summaries` and `engineer_summaries`), §17 concurrency/locking, §6.10 cache invalidation rules, admin-triggered `POST /svod/recalculate`. Resolves S-02. Depends on M-02.

## Functional Requirements Covered

- **AD-13 — Redis (§9.1):** Redis introduced as job queue for background recalculation worker. Not used in PoC; introduced in this milestone.
- **AD-10 — Staleness tracking (§6.10):** When source data changes, the affected `summaries` and/or `engineer_summaries` row is marked `is_stale = 'TRUE'` synchronously in the same transaction. Recalculation happens on-demand when admin triggers `POST /svod/recalculate`.
- **§17 — Concurrency / locking:** Background worker uses `is_stale = 'PROCESSING'` to claim a batch. `REPEATABLE READ` isolation inside bulk recalculation batch transaction. Watchdog support via `idx_summaries_processing` partial index.
- **§6.10 — Cache invalidation rules:** All source-data write operations that previously triggered synchronous recalculation now instead mark summaries stale in the same transaction.

## Acceptance Criteria In Scope

**AC-03:** After an admin updates `r1_minutes` or `r2_minutes` on any `device_system_contexts` row, all affected object summaries are marked stale — without code deployment. UI shows "Данные устарели — нажмите Пересчитать" indicator. Values update only after the admin explicitly triggers `POST /svod/recalculate`. _(Requires M-04 and M-06.)_

**AC-17:** When a third engineer is added to an object that previously had two, all three engineers' `engineer_summaries.is_stale` must be set to TRUE in the same transaction. After admin-triggered recalculation (`POST /svod/recalculate`), each engineer's share of that object must equal `itogo_chislo_with_travel / 3`.

**AC-20:** After updating a normative (`PUT /catalog/devices/:id/contexts/:cid`), all affected summaries must be marked `is_stale = 'TRUE'` but values in the СВОД must remain unchanged (showing stale indicator) until `POST /svod/recalculate` is called. Auto-recalculation must not occur. _(Requires M-04 and M-06.)_

**AC-10:** Bulk recalculation of all objects completes in under 60 seconds (full 2,935-object dataset).

## Database Tables Required

From docs/impl/db-schema.md:

### Schema changes in this milestone (Liquibase migration v1.x.0)

**`summaries` — add MVP-only columns:**

- `is_stale VARCHAR(20)` — 'FALSE' | 'TRUE' | 'PROCESSING'. 'PROCESSING' is set by background worker to claim a batch (§17.7).
- `period_id UUID FK → periods.id` — period used for this computation (active-period traceability)
- `records_6months DECIMAL(10,4)` — intermediate field for traceability/debugging
- `repair_work_6months DECIMAL(10,4)` — intermediate field for traceability/debugging
- `repair_travel_6months DECIMAL(10,4)` — intermediate field for traceability/debugging
- `repair_pzv_6months DECIMAL(10,4)` — intermediate field for traceability/debugging
- `total_repairs INTEGER` — intermediate field for traceability/debugging

**`engineer_summaries` — add MVP-only column:**

- `is_stale VARCHAR(20)` — 'FALSE' | 'TRUE' | 'PROCESSING'

### New indexes (added in this migration)

```sql
-- Staleness indexes
CREATE INDEX idx_summaries_stale ON summaries(is_stale) WHERE is_stale = 'TRUE';
CREATE INDEX idx_summaries_processing ON summaries(is_stale) WHERE is_stale = 'PROCESSING'; -- watchdog (§17.7)
CREATE INDEX idx_eng_summaries_stale ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE';
CREATE INDEX idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING';
```

### Existing tables (behaviour change only, no schema change)

All source-data write operations now mark `summaries.is_stale = 'TRUE'` instead of triggering synchronous recalculation. Tables affected: `object_system_assignments`, `device_system_contexts`, `records_tasks`, `object_repairs`, `travel`, `object_engineers`, `repair_types`, `users` (capacity_fte update).

## API Endpoints Required

From docs/impl/api-spec.md:

### Background recalculation (MVP only — M-06)

- `POST /svod/recalculate` — trigger full recalculation of all stale summaries. Admin only. Enqueues background job via Redis.
- `POST /svod/recalculate/:object_id` — trigger recalculation for a single object. Admin only.
- `GET /svod/recalculate/status` — check background recalculation job status. Response: `{ total_stale, processed, remaining }`

### Behaviour changes on existing endpoints (stale-marking replaces synchronous recalculation)

All write endpoints that previously triggered synchronous recalculation now mark summaries stale in the same transaction:
- `PUT /objects/:id/devices/:dtid` → mark `summaries.is_stale = 'TRUE'` for the object
- `PUT /objects/:id/assignments/:aid` → mark stale for the object
- `PUT /objects/:id/records` → mark stale for the object
- `PUT /objects/:id/repairs/:rtid` → mark stale for the object
- `PUT /objects/:id/travel` → mark stale for the object
- `PUT /catalog/devices/:id/contexts/:cid` → mark stale for all objects with assignments using this context
- `PUT /catalog/repairs/:id` → mark stale for all objects with repairs using this type
- `PUT /engineers/:id` (capacity_fte change) → mark `engineer_summaries.is_stale = 'TRUE'` for the engineer
- `POST /objects/:id/engineers` / `DELETE /objects/:id/engineers/:eid` → mark `engineer_summaries.is_stale = 'TRUE'` for all engineers at this object (in same transaction)
- `DELETE /objects/:id` — cascade-delete child rows, mark `engineer_summaries.is_stale = 'TRUE'` for affected engineers (all in same transaction)

## UI Screens Required

From docs/impl/ui-spec.md:

### Stale indicators (canonical wording — must be exact strings)

Applied across three locations:

**§7.6 Engineer Detail Page — Section 5 (stale indicator):**
- `is_stale = 'TRUE'`: banner "Данные устарели — нажмите Пересчитать" across the page
- `is_stale = 'PROCESSING'`: banner "Пересчитывается..." across the page

**§7.9 СВОД Table — stale rows:**
- `is_stale = 'TRUE'`: display "Данные устарели — нажмите Пересчитать" in place of numeric values (never show stale numbers)
- `is_stale = 'PROCESSING'`: display "Пересчитывается..."

**§7.10 Object Detail Header:**
- Same two-state wording as above

**Admin trigger button:** "Пересчитать" button visible on СВОД page and admin dashboard. Disabled for past periods. Calls `POST /svod/recalculate`.

### Docker Compose update

The `docker-compose.poc.yml` (4 containers) is replaced or supplemented by a production compose that adds:
- `redis` container — job queue for background worker
- `depends_on` block for backend → redis

## §6.10 Cache Invalidation Rules

All triggers that mark summaries stale (replacing synchronous recalculation from PoC S-02):

| Trigger | Tables Marked Stale |
|---------|-------------------|
| Equipment quantity change (`object_devices`, `object_system_assignments`) | `summaries` for the object |
| Records task change (`records_tasks`) | `summaries` for the object |
| Repair count change (`object_repairs`) | `summaries` for the object |
| Travel data change (`travel`) | `summaries` for the object |
| Normative change (`device_system_contexts`) | `summaries` for all objects with assignments using this context |
| Repair type time change (`repair_types`) | `summaries` for all objects with repairs using this type |
| Engineer assignment change (`object_engineers`) | `engineer_summaries` for all engineers at the object |
| Engineer capacity change (`users.capacity_fte`) | `engineer_summaries` for that engineer |
| `home_division_id` change (`users`) | `engineer_summaries` for that engineer |
| Object delete | `engineer_summaries` for all previously assigned engineers |
| Config constant change (`app_config`, M-10) | All `summaries` and `engineer_summaries` |

## §17 Concurrency / Locking

- Worker claims a batch by setting `is_stale = 'PROCESSING'` for a set of rows atomically.
- `REPEATABLE READ` isolation inside bulk recalculation batch transaction — ensures consistent reads of normatives and assignments throughout the batch.
- Watchdog: `idx_summaries_processing` partial index allows detection of rows stuck in 'PROCESSING' state (worker crash recovery).
- User-facing write endpoints use the existing `updated_at` version check (optimistic locking — added in M-09).

## PoC Simplifications Active in This Milestone

- **S-05:** Planning periods not yet implemented — `period_id` on `summaries` FK → `periods.id` requires M-07. Until M-07 is deployed, `period_id` in `summaries` is NULL.
- **S-07:** Audit log not yet implemented — M-08.
- **S-09:** Concurrency / optimistic locking not yet enforced — M-09.

This milestone **reverses S-02** (synchronous recalculation → staleness tracking + background worker).

## Out of Scope for This Milestone

- Planning period FK on `summaries.period_id` populated with real period data — requires M-07
- `period_id` on `records_tasks` and `object_repairs` — M-07
- Audit log for normative changes — M-08
- Optimistic locking (`updated_at` version check on user-facing writes) — M-09
- `app_config` table (config constants move from env vars to DB) — M-10; bulk stale-marking on config change requires M-10
