# TOR v2.17 Review — Contradictions & Gaps

**Review date:** 2026-03-17
**Verified against TOR version:** 2.17

---

## Prior Review Status

All residual items from the v2.11–v2.16 sweep are resolved in changelogs v2.11–v2.17:

| Prior Item | Resolution | Changelog |
|-----------|------------|-----------|
| Object hard-delete cascade | `ON DELETE CASCADE` annotated in §5.2, §8.4, §10.2 | v2.12 |
| PoC recalculation model contradiction | AD-10, C-28, §24 correctly split PoC vs MVP | v2.13, v2.17 |
| Stale state wording inconsistency (§7.6, §7.9, §7.10) | Canonical two-state wording + PoC scope notes in all three sections | v2.14 |
| Redis in PoC (§9.1, §15.8) | Redis annotated "MVP only — not used in PoC (see §15.8)"; Docker Compose split noted | v2.15 |
| XLSX import wording (§15.8, §11.1) | Apache POI scoped to export only; M-01 adds JSON bulk import; XLSX is external | v2.16 |
| §24 PoC recalculation wording leak | §24 preamble now correctly states PoC = synchronous on save; MVP = on-demand | v2.17 |

---

## Contradictions

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-01 | Critical | §5.3 "Mandatory indexes for PoC query performance" block contains 6 indexes referencing `is_stale` (MVP column added in M-06) and `period_id` (MVP column added in M-07). Including these in `v1.0.0-initial-schema.xml` as directed by the §5.3 preamble will cause Liquibase startup failure in PoC. | §5.3, §15.8 |

### G-01 Detail

§5.3 preamble (line 757): *"All indexes defined here are part of the initial Liquibase migration (`v1.0.0-initial-schema.xml`). Indexes marked **MVP** are added in the relevant MVP migration file."*

The following indexes in the "Mandatory indexes for PoC query performance" block (lines 761–792) reference columns that do not exist in the PoC v1.0.0 schema (per §15.8):

**`is_stale`-dependent (column added M-06):**
```sql
idx_summaries_stale         ON summaries(is_stale) WHERE is_stale = 'TRUE'
idx_summaries_processing    ON summaries(is_stale) WHERE is_stale = 'PROCESSING'
idx_eng_summaries_stale     ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'
idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'
```

**`period_id`-dependent (column added M-07):**
```sql
idx_repairs_object_period   ON object_repairs(object_id, period_id)
idx_records_object_period   ON records_tasks(object_id, period_id)
```

The "Already defined as UNIQUE" section (lines 794–811) also lists three MVP-only constraints:
- `records_tasks(object_id, period_id) UNIQUE` — `period_id` absent in PoC
- `object_repairs(object_id, repair_type_id, period_id) UNIQUE` — `period_id` absent in PoC
- `periods: one_active_period partial UNIQUE INDEX` — `periods` table is MVP-only (S-05)

---

## Gaps / Missing Specifications

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-02 | High | §5.1 ER Overview (line 402) states all writes to `summaries`/`engineer_summaries` "go through the background worker (serialised by the Redis job queue)" with no PoC scope caveat. PoC writes synchronously on save (S-02); no Redis, no background worker. | §5.1, S-02, AD-13 |
| G-03 | High | §5.2 `app_config` table comment (line 609) says "Changes to any key trigger bulk summary invalidation" with no scope annotation. The `app_config` table does not exist in PoC (S-03); PoC uses Docker env vars. | §5.2, S-03, §6.10 |
| G-04 | Medium | §15.8 schema continuity table omits the 5 intermediate `summaries` fields (`records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`) that §15.4 explicitly states are computed in-memory in PoC and deferred to MVP. No migration milestone is assigned for when they are added. | §15.4, §15.8 |
| G-05 | Medium | §6.14 Engineer Cache Invalidation Rules (lines 1375–1386) has no PoC scope note. The entire section describes `is_stale = 'TRUE'` marking and background worker ordering that is MVP-only. Unlike §6.10 which has individual `(MVP)` annotations, §6.14 has none. | §6.14, S-02, §15.8 |
| G-06 | Medium | §6 Calculation Engine preamble (line 837) states "the affected summary is marked `is_stale = 'TRUE'` synchronously; a background job recalculates it asynchronously" with no PoC scope note. This is the opening sentence of the Calculation Engine section and contradicts S-02. | §6 (line 837), S-02 |
| G-07 | Medium | §6.10 Cache Invalidation Rules has three unannotated MVP-only items: (a) `periods.is_active changed` row (line 1199) — `periods` table is MVP-only (S-05) but has no `(MVP)` annotation unlike the `app_config UPDATE (MVP)` row above it; (b) `objects DELETE` row (line 1200) mixes PoC cascade behavior with MVP stale-marking of `engineer_summaries.is_stale` in a single action without per-clause annotation; (c) `Any summaries.is_stale set to 'TRUE'` row (line 1201) is entirely MVP-only (no `is_stale` in PoC schema) but has no `(MVP)` annotation. | §6.10, S-02, S-05 |

---

## Section-by-Section Notes

### §5.1 Entity Relationship Overview
Background worker description (G-02): *"all writes to summaries and engineer_summaries go through the background worker (serialised by the Redis job queue)"* — needs an `(MVP)` qualification.

### §5.2 Tables — `app_config`
Table comment (G-03): *"Changes to any key trigger bulk summary invalidation"* — needs a `(MVP)` annotation and PoC note that constants are bound as Docker env vars.

### §5.3 Indexing Strategy
Critical contradiction (G-01): Six indexes in the "Mandatory PoC" code block reference `is_stale` (M-06) and `period_id` (M-07) columns that do not exist in the PoC schema. Three UNIQUE constraints in the "Already defined as UNIQUE" section are also MVP-only. All must be moved to the MVP-only block or explicitly marked `-- MVP (M-0x)`.

### §6 Calculation Engine (preamble)
Annotation gap (G-06): Opening sentence describes `is_stale = 'TRUE'` and background job without PoC scope note.

### §6.10 Cache Invalidation Rules
Three annotation gaps (G-07):
- `periods.is_active` row — missing `(MVP)` annotation; `periods` table is S-05 MVP-only.
- `objects DELETE` row — action clause "Mark those engineers' `engineer_summaries.is_stale = 'TRUE'`" is MVP-only but not annotated as such; only the cascade part is PoC behavior.
- `Any summaries.is_stale` row — entirely MVP-only; no `(MVP)` annotation.
- Recalculation trigger paragraph (line 1204) — "The background worker then processes all stale summaries..." is MVP-only; no PoC note.

### §6.14 Engineer Cache Invalidation Rules
Annotation gap (G-05): No PoC scope note. The entire section describes stale-marking behavior (`is_stale = 'TRUE'`) and background worker ordering that is MVP-only.

### §7.6, §7.9, §7.10 UI wording
All three sections carry consistent two-state wording and PoC scope notes. ✅

### §9.1 Technology Stack
Redis correctly annotated "MVP only — not used in PoC (see §15.8)". Docker Compose split correct. ✅

### §10.2 API Design
Admin config endpoint `PUT /admin/config` (batch) aligns with §6.11.1. `POST /auth/refresh` marked out of PoC scope. Cascade DELETE annotated. ✅

### §11.1 Initial Data Import
Import step 9 correctly differentiates PoC (synchronous bulk recalculation inline) vs MVP (admin triggers via `POST /svod/recalculate`). ✅

### §15.4 PoC Data Model
`summaries` schema correctly omits `is_stale` and intermediate fields. Note present explaining in-memory computation. ✅

### §15.7 Migration Path
M-09 = Concurrency, M-11 = PDF export — consistent with S-08/S-09 annotations. ✅

### §15.8 Schema continuity guarantee
Correctly lists `failed_login_count`, `locked_until`, `period_id`, `is_stale` with migration milestones. Gap (G-04): 5 intermediate `summaries` fields not listed.

### §24 Calculation Snapshot & Freeze
v2.17 fix correctly states PoC = synchronous on save (S-02), MVP = on-demand recalculation (AD-10, C-28). ✅

---

## Summary

8 findings: 1 Critical, 2 High, 5 Medium.

The single Critical finding (G-01) is a build-breaking Liquibase migration failure: the PoC `v1.0.0-initial-schema.xml` would reference non-existent columns if the §5.3 index block is followed literally.

The two High findings (G-02, G-03) and four Medium annotation gaps (G-04 through G-07) follow a single pattern: MVP-only staleness/background-worker behavior is described in prominent locations without PoC scope notes. G-01 through G-05 were already identified in the GPT v2.17 review and remain unresolved. G-06 and G-07 are new.
