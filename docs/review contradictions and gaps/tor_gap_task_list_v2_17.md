# TOR v2.17 Gap Resolution Task List

## Priority Summary

| ID | Priority | Task | Why it matters |
|----|----------|------|----------------|
| G-01 | Critical | Move 6 PoC-section indexes referencing MVP-only columns to the MVP-only block in §5.3; annotate 3 UNIQUE constraints accordingly | PoC Liquibase migration fails to start — `is_stale` and `period_id` don't exist in `v1.0.0` schema |
| G-02 | High | Add `(MVP)` annotation to §5.1 background worker sentence | Misleads PoC devs into thinking summaries require a job queue / Redis |
| G-03 | High | Add `(MVP)` annotation and PoC clarification to §5.2 `app_config` table comment | `app_config` table doesn't exist in PoC; comment implies behavior that cannot happen |
| G-04 | Medium | Add 5 intermediate `summaries` fields to §15.8 schema continuity table with migration milestone | No canonical guidance on when/where to add `records_6months` etc. to the schema |
| G-05 | Medium | Add PoC scope note to §6.14 Engineer Cache Invalidation Rules | No `is_stale` in PoC `engineer_summaries`; developer could mistakenly add stale marking in PoC |
| G-06 | Medium | Add PoC scope note to §6 Calculation Engine preamble (line 837) | Opening sentence of §6 states "background job recalculates asynchronously" — directly contradicts S-02 |
| G-07 | Medium | Annotate three unannotated MVP-only items in §6.10: `periods.is_active` row, `objects DELETE` stale-marking clause, and `Any summaries.is_stale` row | Pattern inconsistency: `app_config UPDATE` is annotated `(MVP)` but adjacent MVP-only rows are not |

---

## T-01: Move MVP-only indexes to the correct migration section in §5.3

**Priority:** Critical

### Problem

§5.3 preamble (line 757): *"All indexes defined here are part of the initial Liquibase migration (`v1.0.0-initial-schema.xml`). Indexes marked **MVP** are added in the relevant MVP migration file."*

The "Mandatory indexes for PoC query performance" block (lines 761–792) contains 6 indexes referencing columns absent from the PoC `v1.0.0` schema:

```sql
-- Reference is_stale (column added in M-06 to summaries and engineer_summaries):
idx_summaries_stale         ON summaries(is_stale) WHERE is_stale = 'TRUE'
idx_summaries_processing    ON summaries(is_stale) WHERE is_stale = 'PROCESSING'
idx_eng_summaries_stale     ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'
idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'

-- Reference period_id (column added in M-07 to records_tasks and object_repairs):
idx_repairs_object_period   ON object_repairs(object_id, period_id)
idx_records_object_period   ON records_tasks(object_id, period_id)
```

Additionally, the "Already defined as UNIQUE" section (lines 794–811) lists three MVP-only constraints without annotation:
- `records_tasks(object_id, period_id) UNIQUE` — `period_id` is M-07
- `object_repairs(object_id, repair_type_id, period_id) UNIQUE` — `period_id` is M-07
- `periods: one_active_period partial UNIQUE INDEX` — `periods` table is S-05 / M-07

### Why this matters

Following §5.3 literally will cause Liquibase to fail at PoC startup — the migration will attempt to create indexes or constraints on columns that do not exist. This is a build-breaking contradiction.

### Affected TOR areas

- [§5.3 Indexing Strategy](../TOR_Workload_WebApp.md) — lines 755–832
- [§15.8 Schema continuity guarantee](../TOR_Workload_WebApp.md) — lines 3048–3057
- §15.7 M-06 (staleness tracking), M-07 (planning periods)

### Required resolution

**Option A (preferred):** Move the 6 MVP-dependent indexes out of the "Mandatory PoC" code block and add them to the "MVP-only indexes" block (lines 813–827), annotated with the appropriate milestone:

```sql
-- Staleness indexes (added in M-06 along with is_stale column)
CREATE INDEX idx_summaries_stale ON summaries(is_stale) WHERE is_stale = 'TRUE';          -- MVP (M-06)
CREATE INDEX idx_summaries_processing ON summaries(is_stale) WHERE is_stale = 'PROCESSING'; -- MVP (M-06)
CREATE INDEX idx_eng_summaries_stale ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'; -- MVP (M-06)
CREATE INDEX idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'; -- MVP (M-06)

-- Period-scope indexes (added in M-07 along with period_id column)
CREATE INDEX idx_repairs_object_period ON object_repairs(object_id, period_id); -- MVP (M-07)
CREATE INDEX idx_records_object_period ON records_tasks(object_id, period_id);  -- MVP (M-07)
```

Add PoC-equivalent indexes without `period_id` to the PoC block:
```sql
-- PoC equivalent (no period_id):
CREATE INDEX idx_repairs_object ON object_repairs(object_id);
CREATE INDEX idx_records_object ON records_tasks(object_id);
```

For the "Already defined as UNIQUE" section, add inline comments:
```sql
-- records_tasks(object_id, period_id) UNIQUE     -- MVP (M-07): period_id absent in PoC
-- object_repairs(object_id, repair_type_id, period_id) UNIQUE  -- MVP (M-07): period_id absent in PoC
-- periods: one_active_period partial UNIQUE INDEX -- MVP (M-07): periods table absent in PoC (S-05)
```

**Option B:** Add inline `-- MVP (M-06)` / `-- MVP (M-07)` comments on each affected line within the PoC block, and add a preamble note clarifying these must go in a later migration file.

---

## T-02: Annotate §5.1 background worker description as MVP-only

**Priority:** High

### Problem

§5.1 ER Overview (line 402):

> *"all writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue)"*

No PoC scope caveat. In PoC, writes to summaries are synchronous in the request thread on every save (S-02). There is no background worker and no Redis in PoC (AD-13).

### Why this matters

A developer reading §5.1 for context before implementing the PoC calculation engine could infer that Redis and a job queue are required. This contradicts S-02 and AD-13 and could cause unnecessary complexity in the PoC backend.

### Affected TOR areas

- [§5.1 Entity Relationship Overview](../TOR_Workload_WebApp.md) — line 402
- S-02 (synchronous recalculation in PoC)
- AD-13 (Redis is MVP-only, introduced with M-06)

### Required resolution

Replace the §5.1 isolation level note with:

> **Transaction isolation level:** `READ COMMITTED` (PostgreSQL default). **MVP:** All writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue — see AD-13); concurrent user transactions do not write to summaries directly. **PoC:** Summaries are recalculated synchronously in the request thread on every save (S-02); no background worker or Redis is used. The optimistic locking strategy in §17 handles write conflicts on user-facing tables without requiring a stricter isolation level. `REPEATABLE READ` is used only inside the bulk recalculation batch transaction.

---

## T-03: Annotate §5.2 `app_config` table comment as MVP-only

**Priority:** High

### Problem

The §5.2 `app_config` table definition (line 609):

> *"All named calculation constants (see §6.12). Changes to any key trigger bulk summary invalidation."*

This implies the table exists and the invalidation rule fires in all phases. In PoC (S-03), the `app_config` table is **not created** — constants are injected as Docker environment variables. The table is introduced in M-10.

### Why this matters

A developer implementing the PoC could create the `app_config` table and wire up invalidation logic, which is explicitly deferred to M-10 (see §6.11.1 and §15.7). The omission misleads by implication.

### Affected TOR areas

- [§5.2 Tables — `app_config` section](../TOR_Workload_WebApp.md) — lines 599–609
- S-03 (static normatives; no admin catalog in PoC)
- §6.10 row `app_config UPDATE (any calculation key) (MVP)` — correctly annotated there
- §6.11.1 (correctly scoped to MVP)

### Required resolution

Replace the table comment with:

> *"All named calculation constants (see §6.11). **MVP (M-10):** This table is created in M-10 when admin-editable configuration is introduced. Changes to any key trigger bulk summary invalidation (§6.10). **PoC (S-03):** This table is not created — constants are bound at startup as Docker environment variables via `@ConfigurationProperties(prefix=\"workload.config\")`; the admin UI is introduced in M-10."*

---

## T-04: Add intermediate `summaries` fields to §15.8 schema continuity table

**Priority:** Medium

### Problem

§15.4 PoC schema note (lines 2844–2848):

> *"intermediate computed fields (`records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`) are computed in-memory during calculation but NOT persisted in PoC. Only the final monthly outputs are stored. For MVP, these fields are added to summaries for traceability and debugging."*

The §15.8 schema continuity table (lines 3050–3055) only lists:

| Column | Table | Added in |
|--------|-------|----------|
| `failed_login_count` | `users` | M-02 |
| `locked_until` | `users` | M-02 |
| `period_id` | `records_tasks`, `object_repairs` | M-07 |
| `is_stale`, `period_id` | `summaries`, `engineer_summaries` | M-06 |

The 5 intermediate fields are absent. No migration milestone is assigned.

### Why this matters

Without a milestone assignment, MVP developers have no canonical place to add these columns. They are at risk of being added in an ad-hoc migration that disrupts the schema continuity guarantee.

### Affected TOR areas

- [§15.4 PoC Data Model — summaries note](../TOR_Workload_WebApp.md) — lines 2844–2848
- [§15.8 Schema continuity guarantee table](../TOR_Workload_WebApp.md) — lines 3048–3057
- §5.2 full `summaries` schema (lists all fields including intermediate ones)

### Required resolution

Add entries to the §15.8 table:

| Column | Table | Added in |
|--------|-------|----------|
| `records_6months` | `summaries` | M-06 (traceability; added alongside staleness tracking) |
| `total_repairs` | `summaries` | M-06 |
| `repair_work_6months` | `summaries` | M-06 |
| `repair_travel_6months` | `summaries` | M-06 |
| `repair_pzv_6months` | `summaries` | M-06 |

M-06 is the natural choice since staleness tracking (M-06) is the first milestone where full per-field traceability becomes operationally useful.

---

## T-05: Add PoC scope note to §6.14 Engineer Cache Invalidation Rules

**Priority:** Medium

### Problem

§6.14 (lines 1375–1386) describes stale-marking behavior for engineer summaries:

> *"Staleness is set in the same transaction as the triggering change. Actual recalculation is on-demand (triggered by admin). Background worker processes engineer summaries only after all dependent object summaries are fresh."*

The section has no PoC scope note. Since `engineer_summaries.is_stale` does not exist in the PoC schema (`is_stale` is added in M-06 per §15.8), the entire table is implicitly MVP-only. Compare with §7.6 Section 5, §7.9, and §7.10 which explicitly state the PoC exception.

### Why this matters

A developer implementing PoC engineer assignment logic might follow §6.14 and add `is_stale` marking to `engineer_summaries` writes — which would fail because the column doesn't exist in the PoC schema, or worse, trigger an unplanned schema change.

### Affected TOR areas

- [§6.14 Engineer Cache Invalidation Rules](../TOR_Workload_WebApp.md) — lines 1375–1386
- S-02 (synchronous recalculation in PoC; no staleness tracking)
- §6.10 (object-level equivalent — has individual `(MVP)` annotations)

### Required resolution

Add a PoC scope note at the end of the §6.14 table:

> **PoC:** No stale marking is performed. Engineer summaries are recalculated synchronously on every triggering event (S-02). The `is_stale` column is not present in the PoC `engineer_summaries` schema — it is added in M-06. The entire table above applies to MVP only.

---

## T-06: Add PoC scope note to §6 Calculation Engine preamble

**Priority:** Medium

### Problem

§6 opening paragraph (line 837):

> *"All calculations are performed **server-side only**. The `summaries` table is a precomputed cache. When source data changes, the affected summary is marked `is_stale = 'TRUE'` synchronously; a background job recalculates it asynchronously."*

This is the first sentence a developer reads when approaching the entire Calculation Engine section. It describes MVP-only behavior without any PoC scope note. In PoC, there is no `is_stale` column and no background job — calculation is synchronous on save (S-02).

### Why this matters

A developer starting from §6 to understand how to implement the PoC calculation engine gets the wrong mental model immediately. This is the most prominent location for this pattern of PoC/MVP conflation.

### Affected TOR areas

- [§6 Calculation Engine preamble](../TOR_Workload_WebApp.md) — line 837
- S-02 (PoC: synchronous recalculation on save)
- AD-10 (on-demand recalculation is MVP-only)

### Required resolution

Replace the preamble with a split description:

> *"All calculations are performed **server-side only**. The `summaries` table is a precomputed cache.*
>
> ***PoC (S-02):** When source data changes, the affected summary is recalculated synchronously in the same request thread before the response is returned. No background job, no `is_stale` column.*
>
> ***MVP (AD-10):** When source data changes, the affected summary is marked `is_stale = 'TRUE'` synchronously in the same transaction. A background worker recalculates stale summaries asynchronously when triggered by admin via `POST /svod/recalculate`."*

---

## T-07: Annotate MVP-only items in §6.10 Cache Invalidation Rules

**Priority:** Medium

### Problem

§6.10 (lines 1185–1204) has one correctly annotated MVP row (`app_config UPDATE (any calculation key) (MVP)`) but three adjacent rows with the same pattern that are missing `(MVP)` annotations:

**Gap (a) — `periods.is_active` row (line 1199):**
```
| `periods.is_active` changed (period switch) | Mark ALL `summaries.is_stale = 'TRUE'` |
```
The `periods` table is MVP-only (S-05, added in M-07). This row is implicitly MVP-only but lacks the `(MVP)` marker that `app_config UPDATE` carries one row above.

**Gap (b) — `objects DELETE` row (line 1200):**
The action column reads: *"Before cascade: read all engineers assigned to the object from `object_engineers`. Cascade-delete all child rows. Mark those engineers' `engineer_summaries.is_stale = 'TRUE'` — all in the same transaction."*
The CASCADE is PoC behavior; the stale-marking of `engineer_summaries.is_stale` is MVP-only (no `is_stale` column in PoC). The clause is not split into PoC/MVP parts.

**Gap (c) — `Any summaries.is_stale` row (line 1201):**
```
| Any `summaries.is_stale` set to `'TRUE'` | Mark all engineers assigned to that object: `engineer_summaries.is_stale = 'TRUE'` |
```
This entire row is MVP-only (no `is_stale` in PoC). No annotation.

**Gap (d) — Recalculation trigger paragraph (line 1204):**
> *"**Recalculation trigger:** Admin clicks "Пересчитать" in the UI or calls `POST /svod/recalculate`. The background worker then processes all stale summaries in dependency order: object summaries first, then engineer summaries."*
No PoC scope note. This paragraph describes MVP-only behavior; in PoC recalculation is synchronous with no admin trigger.

### Why this matters

The pattern is inconsistent: `app_config UPDATE` is correctly marked `(MVP)` while identical MVP-only rows directly above and below are not. A developer scanning §6.10 will apply the annotated row's logic consistently but miss the unannotated ones.

The mixed `objects DELETE` row (gap b) is the most dangerous: it could lead a PoC developer to attempt stale marking of `engineer_summaries` on object deletion — but `is_stale` doesn't exist in the PoC schema.

### Affected TOR areas

- [§6.10 Cache Invalidation Rules](../TOR_Workload_WebApp.md) — lines 1185–1204
- S-02 (no staleness tracking in PoC)
- S-05 (`periods` table is MVP-only)
- §6.14 (related annotation gap covered in T-05)

### Required resolution

**(a)** Add `(MVP)` tag to the `periods.is_active` row:
```
| `periods.is_active` changed (period switch) (MVP) | Mark ALL `summaries.is_stale = 'TRUE'` |
```

**(b)** Split the `objects DELETE` action clause into PoC and MVP parts:
> **PoC:** Before cascade: read all engineers assigned to the object from `object_engineers`. Cascade-delete all child rows (`object_engineers`, `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`) — all in the same transaction. Immediately recalculate engineer summaries synchronously for all affected engineers (S-02).
> **MVP:** Same cascade, then mark those engineers' `engineer_summaries.is_stale = 'TRUE'` in the same transaction.

**(c)** Add `(MVP)` tag to the `Any summaries.is_stale` row:
```
| Any `summaries.is_stale` set to `'TRUE'` (MVP) | Mark all engineers assigned... |
```

**(d)** Add a PoC note to the recalculation trigger paragraph:
> **Recalculation trigger (MVP):** Admin clicks "Пересчитать" or calls `POST /svod/recalculate`. The background worker processes all stale summaries in dependency order: object summaries first, then engineer summaries.
> **PoC:** No admin trigger exists. All summaries are recalculated synchronously on every data-changing request (S-02).
