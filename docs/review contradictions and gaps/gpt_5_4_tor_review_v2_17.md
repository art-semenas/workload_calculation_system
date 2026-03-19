# TOR v2.17 Review — Contradictions & Gaps

**Review date:** 2026-03-16
**Verified against TOR version:** 2.17

---

## Prior Review Status

All 10 items from the v2.11 review are resolved in changelogs v2.11–v2.17:

| Prior Item | Resolution | Changelog |
|-----------|------------|-----------|
| Docker Compose Redis dependency | PoC compose file explicit; §9.1 annotated | v2.11, v2.15 |
| `records_monthly` divisor naming | Renamed to `PLANNING_PERIOD_MONTHS`; hardcoded `/6` removed | v2.11 |
| Migration milestone numbering swap (M-09/M-11) | M-09 = Concurrency (S-09), M-11 = PDF (S-08) — now consistent | v2.11 |
| Admin config API shape conflict | `PUT /admin/config` (batch) in §10.2 aligns with §6.11.1 | v2.11 |
| `app_config` invalidation for PoC | `(MVP)` annotation on §6.10 `app_config UPDATE` row | v2.11 |
| Repair type deletion semantics | Defined in §10.2 with 409 rule | v2.9, v2.11 |
| Object hard-delete cascade | `ON DELETE CASCADE` annotated in §5.2, §8.4, §10.2 | v2.12 |
| Division/Branch CRUD APIs | Full CRUD spec in §10.2 | v2.9+ |
| `POST /auth/refresh` PoC scope | Marked "(out of PoC scope)" in §10.2 | v2.11 |
| PoC recalculation model contradiction | Canonical split applied throughout (S-02, AD-10, C-28, §24) | v2.13, v2.17 |

---

## Contradictions

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-01 | Critical | §5.3 lists 6 indexes under "Mandatory indexes for PoC query performance" and declares all indexes in `v1.0.0-initial-schema.xml`, but those indexes reference MVP-only columns (`is_stale` added in M-06; `period_id` added in M-07). The PoC v1.0.0 Liquibase migration would fail to create these indexes. | §5.3, §15.8 |

### G-01 Detail

The §5.3 preamble states: *"All indexes defined here are part of the initial Liquibase migration (`v1.0.0-initial-schema.xml`). Indexes marked **MVP** are added in the relevant MVP migration file."*

However, the following indexes in the "Mandatory indexes for PoC query performance" block reference columns that do not exist in the PoC schema (per §15.8 MVP-only columns table):

**`is_stale`-dependent indexes** (column added in M-06 to `summaries` and `engineer_summaries`):
```sql
idx_summaries_stale         ON summaries(is_stale) WHERE is_stale = 'TRUE'
idx_summaries_processing    ON summaries(is_stale) WHERE is_stale = 'PROCESSING'
idx_eng_summaries_stale     ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'
idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'
```

**`period_id`-dependent indexes** (column added in M-07 to `records_tasks` and `object_repairs`):
```sql
idx_repairs_object_period   ON object_repairs(object_id, period_id)
idx_records_object_period   ON records_tasks(object_id, period_id)
```

Additionally, the "Already defined as UNIQUE" section lists constraints from the full MVP schema that do not exist in PoC v1.0.0:
- `records_tasks(object_id, period_id) UNIQUE` — period_id absent in PoC
- `object_repairs(object_id, repair_type_id, period_id) UNIQUE` — period_id absent in PoC
- `periods: one_active_period partial UNIQUE INDEX` — `periods` table is MVP-only (S-05)

---

## Gaps / Missing Specifications

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-02 | High | §5.1 ER Overview says all writes to `summaries`/`engineer_summaries` "go through the background worker (serialised by the Redis job queue)" with no PoC scope caveat. In PoC, writes are synchronous on save (S-02), no Redis, no background worker. | §5.1, S-02 |
| G-03 | High | §5.2 `app_config` table comment says "Changes to any key trigger bulk summary invalidation" with no scope annotation. The `app_config` table does not exist in PoC (S-03); PoC uses Docker env vars. | §5.2, S-03, §6.10 |
| G-04 | Medium | §15.8 MVP-only columns table is incomplete. §15.4 explicitly states that intermediate `summaries` fields (`records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`) are computed in-memory and not persisted in PoC. But §15.8 does not list them as MVP-only columns with a migration milestone, so no developer reading §15.8 knows when/where to add them. | §15.4, §15.8 |
| G-05 | Medium | §6.14 Engineer Cache Invalidation Rules has no PoC scope note. The entire section describes stale-marking behaviour (`is_stale = 'TRUE'`) that is MVP-only. Unlike §6.10 which has per-row `(MVP)` annotations, §6.14 has none — a developer implementing PoC engineer assignment logic could infer they need staleness marking. | §6.14, S-02 |

---

## Section-by-Section Notes

### §5.1 ER Overview
Background worker description (G-02): *"all writes to `summaries` and `engineer_summaries` go through the background worker (serialised by the Redis job queue)"* — needs an **(MVP)** qualification. The PoC writes summaries synchronously in the request thread (S-02).

### §5.2 Tables
`app_config` table comment (G-03): *"Changes to any key trigger bulk summary invalidation"* — needs a **(MVP)** annotation. In PoC the table doesn't exist and constants are env vars.

### §5.3 Indexing Strategy
Critical contradiction (G-01): Six indexes listed under "Mandatory indexes for PoC query performance" reference `is_stale` (added M-06) and `period_id` (added M-07). These must be moved to the MVP-only section or explicitly marked **MVP** in the code block. The three `periods`-dependent UNIQUE constraints in the "Already defined as UNIQUE" list are also MVP-only and should be so noted.

### §6.14 Engineer Cache Invalidation Rules
Annotation gap (G-05): No PoC scope note. Since the PoC has no `is_stale` column on `summaries` or `engineer_summaries` (per §15.4 and §15.8), the entire table is implicitly MVP-only, but this is not stated. Should mirror §7.6 Section 5 and §7.9/§7.10 which carry explicit PoC notes.

### §7.6, §7.9, §7.10 UI wording
All three sections now carry consistent two-state wording and PoC scope notes. ✅

### §9.1 Technology Stack
Redis correctly annotated "MVP only — not used in PoC (see §15.8)". Docker Compose container count shows "MVP: 5 / PoC: 4 (no Redis)". ✅

### §10.2 API Design
Admin config endpoint is `PUT /admin/config` (batch) — consistent with §6.11.1. ✅
`POST /auth/refresh` marked out of PoC scope. ✅
Object hard-delete behaviour annotated with cascade and stale-marking. ✅

### §15.4 PoC Data Model
`summaries` schema correctly omits `is_stale` and intermediate fields. Note present explaining in-memory computation. ✅

### §15.7 Migration Path
M-09 = Concurrency (S-09), M-11 = PDF export (S-08) — consistent with S-08/S-09 reversal annotations. ✅

### §15.8 MVP-only columns
Correctly lists `failed_login_count`, `locked_until`, `period_id`, `is_stale` with their migration milestones. Gap (G-04): intermediate `summaries` fields not listed.

### §24 Calculation Snapshot & Freeze
v2.17 fix correctly states: *"PoC recalculates synchronously on save (S-02), while MVP uses on-demand recalculation with staleness tracking (AD-10, C-28)"*. ✅

### §6.11.1 Configuration Validation Rules
Correctly scoped to MVP. PoC note present about env vars. ✅

### §6.10 Cache Invalidation Rules
`app_config UPDATE` row carries `(MVP)` annotation. `periods.is_active` row has no MVP annotation — this is a minor gap since the `periods` table is MVP-only (S-05), but the row is not explicitly marked. Acceptable as medium-priority annotation gap.

---

## Summary

5 new findings: 1 Critical, 2 High, 2 Medium. No new Critical contradictions between sections — the single Critical finding (G-01) is an internal inconsistency within §5.3 between its preamble and its index block that would break the PoC Liquibase migration.
