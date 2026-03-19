# TOR v2.17 Gap Resolution Task List

## Priority Summary

| ID | Priority | Task | Why it matters |
|----|----------|------|----------------|
| G-01 | Critical | Move 6 PoC-section indexes that reference MVP-only columns out of `v1.0.0` scope | PoC Liquibase migration would fail — `is_stale` and `period_id` columns don't exist in PoC schema |
| G-02 | High | Add `(MVP)` annotation to §5.1 background worker sentence | Misleads PoC devs into thinking summaries need a job queue / Redis |
| G-03 | High | Add `(MVP)` annotation to §5.2 `app_config` comment | `app_config` table doesn't exist in PoC — comment implies behavior that can't happen |
| G-04 | Medium | Add intermediate `summaries` fields to §15.8 MVP-only columns table with a milestone | Devs have no guidance on when/where to add `records_6months` etc. to the schema |
| G-05 | Medium | Add PoC scope note to §6.14 Engineer Cache Invalidation Rules | No `is_stale` in PoC engineer_summaries — §6.14 table is entirely MVP behavior |

---

## T-01: Move MVP-only indexes to the correct migration section in §5.3

**Priority:** Critical

### Problem

§5.3 preamble states: *"All indexes defined here are part of the initial Liquibase migration (`v1.0.0-initial-schema.xml`). Indexes marked **MVP** are added in the relevant MVP migration file."*

The "Mandatory indexes for PoC query performance" block contains 6 indexes that reference columns not present in the PoC v1.0.0 schema:

```sql
-- These reference is_stale (added in M-06):
idx_summaries_stale         ON summaries(is_stale) WHERE is_stale = 'TRUE'
idx_summaries_processing    ON summaries(is_stale) WHERE is_stale = 'PROCESSING'
idx_eng_summaries_stale     ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'
idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'

-- These reference period_id (added in M-07):
idx_repairs_object_period   ON object_repairs(object_id, period_id)
idx_records_object_period   ON records_tasks(object_id, period_id)
```

Additionally, the "Already defined as UNIQUE" section lists constraints that are also MVP-only:
- `records_tasks(object_id, period_id) UNIQUE` — period_id is M-07
- `object_repairs(object_id, repair_type_id, period_id) UNIQUE` — period_id is M-07
- `periods: one_active_period partial UNIQUE INDEX` — `periods` table is M-07

### Why this matters

If a developer follows §5.3 literally and includes all "Mandatory PoC" indexes in `v1.0.0-initial-schema.xml`, Liquibase will fail at startup because the referenced columns don't exist. This is a build-breaking contradiction.

### Affected TOR areas

- [§5.3 Indexing Strategy](../TOR_Workload_WebApp.md) — lines ~757–832
- [§15.8 MVP-only columns table](../TOR_Workload_WebApp.md) — lines ~3048–3057
- §15.7 M-06 (staleness tracking), M-07 (planning periods)

### Required resolution

**Option A (preferred):** Move the 6 MVP-dependent indexes out of the "Mandatory PoC" code block and add them to the "MVP-only indexes" block (currently at lines ~813–827), each annotated with the appropriate milestone:

```sql
-- Staleness indexes (added in M-06 along with is_stale column)
CREATE INDEX idx_summaries_stale ON summaries(is_stale) WHERE is_stale = 'TRUE';         -- MVP (M-06)
CREATE INDEX idx_summaries_processing ON summaries(is_stale) WHERE is_stale = 'PROCESSING'; -- MVP (M-06)
CREATE INDEX idx_eng_summaries_stale ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'; -- MVP (M-06)
CREATE INDEX idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'; -- MVP (M-06)

-- Period-scope indexes (added in M-07 along with period_id column)
CREATE INDEX idx_repairs_object_period ON object_repairs(object_id, period_id);  -- MVP (M-07)
CREATE INDEX idx_records_object_period ON records_tasks(object_id, period_id);   -- MVP (M-07)
```

Replace the PoC-relevant repairs/records index with a non-period version for PoC:
```sql
-- PoC equivalent (no period_id):
CREATE INDEX idx_repairs_object   ON object_repairs(object_id);
CREATE INDEX idx_records_object   ON records_tasks(object_id);
```

Also update the "Already defined as UNIQUE" section to note that `period_id`-bearing constraints and `periods` partial index are MVP-only.

**Option B:** Add inline `-- MVP (M-06)` / `-- MVP (M-07)` comments on each affected line within the PoC block to signal they must go in a later migration, and add a preamble note to the PoC block clarifying this.

---

## T-02: Annotate §5.1 background worker description as MVP-only

**Priority:** High

### Problem

§5.1 ER Overview contains:

> *"all writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue)"*

This is MVP-only. In PoC, writes to summaries happen synchronously in the request thread on every save (S-02). There is no background worker and no Redis in PoC.

### Why this matters

A developer reading §5.1 for the first time could infer that the PoC also needs a Redis job queue — contradicting S-02 and AD-13. It could cause unnecessary complexity to be added to the PoC backend.

### Affected TOR areas

- [§5.1 Entity Relationship Overview](../TOR_Workload_WebApp.md) — line ~402 (isolation level note)
- S-02 (synchronous recalculation in PoC)
- AD-13 (Redis is MVP-only)

### Required resolution

Change the §5.1 note to:

> *"**MVP:** All writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue) — see AD-13 and S-02. **PoC:** Summaries are written synchronously in the request thread on save; no background worker or Redis is used."*

---

## T-03: Annotate §5.2 `app_config` table comment as MVP-only

**Priority:** High

### Problem

The §5.2 `app_config` table definition ends with:

> *"All named calculation constants (see §6.12). Changes to any key trigger bulk summary invalidation."*

This description implies the table exists and the invalidation rule fires in all phases. In PoC (S-03), the `app_config` table is **not created** — constants are injected as Docker env vars. The table is introduced in M-10.

### Why this matters

A developer implementing the PoC could create the `app_config` table and wire up invalidation logic, which is explicitly deferred to M-10. The comment misleads by omission.

### Affected TOR areas

- [§5.2 Tables — `app_config` section](../TOR_Workload_WebApp.md) — lines ~599–609
- S-03 (static normatives; no admin catalog in PoC)
- §6.10 row `app_config UPDATE (any calculation key) (MVP)` — correctly annotated there

### Required resolution

Append an MVP annotation to the comment:

> *"All named calculation constants (see §6.11). **MVP:** Changes to any key trigger bulk summary invalidation (§6.10). **PoC (S-03):** This table is not created — constants are bound at startup as Docker environment variables via `@ConfigurationProperties(prefix=\"workload.config\")`; the table and admin UI are introduced in M-10."*

---

## T-04: Add intermediate `summaries` fields to §15.8 MVP-only columns table

**Priority:** Medium

### Problem

§15.4 PoC schema contains the note:

> *"Note: intermediate computed fields (`records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`) are computed in-memory during calculation but NOT persisted in PoC. Only the final monthly outputs are stored. For MVP, these fields are added to summaries for traceability and debugging."*

But §15.8 "Schema continuity guarantee" table only lists:

| Column | Table | Added in |
|--------|-------|----------|
| `failed_login_count` | `users` | M-02 |
| `locked_until` | `users` | M-02 |
| `period_id` | `records_tasks`, `object_repairs` | M-07 |
| `is_stale`, `period_id` | `summaries`, `engineer_summaries` | M-06 |

The 5 intermediate fields are absent from this table. No migration milestone is assigned for when they are added to the persisted `summaries` schema.

### Why this matters

Without a milestone assignment, MVP developers implementing traceability and debugging features have no canonical place to add these columns. There is also a risk they are added in an ad-hoc migration that disrupts the continuity guarantee.

### Affected TOR areas

- [§15.4 PoC Data Model — summaries note](../TOR_Workload_WebApp.md) — lines ~2843–2848
- [§15.8 Schema continuity guarantee table](../TOR_Workload_WebApp.md) — lines ~3048–3057
- §5.2 full `summaries` schema (lists all fields including intermediate ones)

### Required resolution

Add entries to the §15.8 MVP-only columns table:

| Column | Table | Added in |
|--------|-------|----------|
| `records_6months` | `summaries` | M-06 or M-07 (traceability; assign to whichever milestone first needs them) |
| `total_repairs` | `summaries` | same as above |
| `repair_work_6months` | `summaries` | same |
| `repair_travel_6months` | `summaries` | same |
| `repair_pzv_6months` | `summaries` | same |

Decide the milestone (M-06 is the natural choice since staleness tracking is when debugging field traceability becomes relevant) and record it in the table.

---

## T-05: Add PoC scope note to §6.14 Engineer Cache Invalidation Rules

**Priority:** Medium

### Problem

§6.14 describes stale-marking behavior for engineer summaries:

> *"Staleness is set in the same transaction as the triggering change. Actual recalculation is on-demand (triggered by admin). Background worker processes engineer summaries only after all dependent object summaries are fresh."*

The section has no PoC scope note. Since `engineer_summaries.is_stale` doesn't exist in the PoC schema (see §15.8 — `is_stale` added in M-06), the entire table is implicitly MVP-only.

Compare with §7.6 Section 5 and §7.9/§7.10 which explicitly state: *"PoC: No stale indicator is shown — engineer summaries recalculate synchronously on save (S-02)."*

### Why this matters

A developer implementing PoC engineer assignment logic might follow §6.14 and add `is_stale` marking to engineer summary writes — which would fail because the column doesn't exist in the PoC schema, or worse, be added as an unplanned schema change.

### Affected TOR areas

- [§6.14 Engineer Cache Invalidation Rules](../TOR_Workload_WebApp.md) — lines ~1375–1386
- S-02 (no staleness tracking in PoC)
- §6.10 (object-level equivalent — has individual `(MVP)` annotations)

### Required resolution

Add a PoC scope note at the end of the §6.14 table, matching the pattern used in §7.6 and §7.9:

> *"**PoC:** No stale marking is performed — engineer summaries recalculate synchronously on every triggering event (S-02). The `is_stale` column is not present in the PoC `engineer_summaries` schema (added in M-06). This table applies to MVP only."*
