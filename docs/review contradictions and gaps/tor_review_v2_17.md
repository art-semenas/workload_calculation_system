# TOR v2.17 Review — Contradictions & Gaps

**Review date:** 2026-03-19
**Verified against TOR version:** 2.17

---

## Prior Review Status

Items identified in the previous v2.17 review cycle (2026-03-17) and their current status:

| Prior Item | Status | Evidence |
|-----------|--------|---------|
| G-01: §5.3 PoC index block contained 6 MVP-only indexes | ✅ Resolved | PoC block (lines 761–788) is clean; `is_stale`/`period_id` indexes moved to MVP-only block (lines 812–832); UNIQUE section has `-- MVP (M-07)` comments |
| G-02: §5.1 background worker sentence had no PoC annotation | ✅ Resolved | Line 402 now explicitly splits **MVP:** / **PoC:** — synchronous vs background-worker path |
| G-04: §15.8 schema continuity table omitted 5 intermediate `summaries` fields | ✅ Resolved | Lines 3064–3068 now list all 5 fields (`records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`) with M-06 milestone |
| G-05: §6.14 Engineer Cache Invalidation Rules had no PoC scope note | ✅ Resolved | Line 1393 now has explicit PoC note: "No stale marking is performed — engineer summaries recalculate synchronously... This table applies to MVP only." |

---

## Contradictions

_No outright contradictions found in this cycle — all remaining issues are annotation gaps (missing PoC scope qualifiers)._

---

## Gaps / Missing Specifications

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-03 | High | §5.2 `app_config` table comment (line 609) has two problems: (a) no `(MVP)` annotation on "Changes to any key trigger bulk summary invalidation" — the `app_config` table does not exist in PoC (S-03); (b) cross-reference points to `§6.12` (Engineer Workload Calculation) instead of `§6.11` (Application Configuration Constants). | §5.2, S-03, §6.11 |
| G-06 | Medium | §6 Calculation Engine preamble (line 843) states "the affected summary is marked `is_stale = 'TRUE'` synchronously; a background job recalculates it asynchronously" with no PoC scope note. This is the first sentence a developer reads entering §6. In PoC there is no `is_stale`, no background job; calculation is synchronous on save (S-02). | §6 (line 843), S-02, AD-10 |
| G-07 | Medium | §6.10 Cache Invalidation Rules has five unannotated MVP-only elements: (a) §6.10 opening preamble (line 1193) describes the on-demand admin trigger and background worker with no PoC scope note; (b) `periods.is_active changed` row (line 1205) has no `(MVP)` annotation — `periods` table is S-05/M-07; (c) `objects DELETE` row (line 1206) mixes PoC cascade behaviour with MVP stale-marking of `engineer_summaries.is_stale` in a single action clause with no per-clause split; (d) `Any summaries.is_stale set to 'TRUE'` row (line 1207) is entirely MVP-only but has no `(MVP)` annotation; (e) Recalculation trigger paragraph (line 1210) describes background worker ordering with no PoC note. | §6.10, S-02, S-05, AD-10 |

---

## Section-by-Section Notes

### §5.1 Entity Relationship Overview
Background worker description (line 402): correctly split into **MVP:** / **PoC:** clauses. ✅

### §5.2 Tables — `app_config`
Two-part gap (G-03):
- Line 609: *"All named calculation constants (see §6.12). Changes to any key trigger bulk summary invalidation."*
  - Cross-reference `§6.12` is wrong — §6.12 is "Engineer Workload Calculation"; constants are in §6.11 "Application Configuration Constants".
  - The invalidation sentence carries no `(MVP)` scope annotation; the `app_config` table is not created in PoC (S-03).

### §5.3 Indexing Strategy
PoC block (lines 761–788): clean — no `is_stale` or `period_id` indexes. MVP-only block (lines 812–832): correct. UNIQUE section: `-- MVP (M-07)` comments present. ✅

### §6 Calculation Engine (preamble)
Annotation gap (G-06): opening sentence (line 843) describes `is_stale = 'TRUE'` and background job with no PoC qualifier.

### §6.10 Cache Invalidation Rules
Five annotation gaps (G-07):
- Preamble (line 1193): "The background worker runs only when explicitly triggered via `POST /svod/recalculate`…" — no PoC note. In PoC all recalculation is synchronous on every data-changing request.
- `periods.is_active` row (line 1205): missing `(MVP)` — `periods` table is S-05 MVP-only.
- `objects DELETE` row (line 1206): cascade delete (PoC behaviour) and `engineer_summaries.is_stale = 'TRUE'` marking (MVP-only) combined in one action clause with no PoC/MVP split.
- `Any summaries.is_stale` row (line 1207): entirely MVP-only, no `(MVP)` annotation.
- Recalculation trigger paragraph (line 1210): "The background worker then processes all stale summaries in dependency order…" — no PoC scope note.
- Note: the `app_config UPDATE (MVP)` row directly above line 1205 is correctly annotated — making the unannotated adjacent rows a clear pattern inconsistency.

### §6.14 Engineer Cache Invalidation Rules
PoC scope note present at line 1393. ✅

### §7.6, §7.9, §7.10 UI wording
All three sections carry consistent two-state wording (`TRUE` → "Данные устарели"; `PROCESSING` → "Пересчитывается…") and PoC scope notes. ✅

### §9.1 Technology Stack
Redis annotated "MVP only — not used in PoC (see §15.8)". Docker Compose split correct. ✅

### §10.2 API Design
`PUT /admin/config` (batch) aligns with §6.11.1. `POST /auth/refresh` marked out of PoC scope. Cascade DELETE annotated. ✅

### §11.1 Initial Data Import
Import step 9 correctly differentiates PoC (synchronous bulk recalculation inline) vs MVP (admin triggers via `POST /svod/recalculate`). ✅

### §15.4 PoC Data Model
`summaries` schema correctly omits `is_stale` and intermediate fields; in-memory note present. ✅

### §15.8 Schema continuity guarantee
All 5 intermediate `summaries` fields now listed (lines 3064–3068) with M-06 milestone. ✅

### §24 Calculation Snapshot & Freeze
Correctly states PoC = synchronous on save (S-02), MVP = on-demand recalculation (AD-10, C-28). ✅

---

## Summary

3 open findings: 1 High, 2 Medium.

All three are annotation-gap findings following the same root pattern: MVP-only staleness / background-worker behaviour described in prominent locations without a PoC scope qualifier. G-03 adds a wrong section cross-reference on top of the annotation gap.

| G-03 (High) | Fix the `app_config` table comment: correct the cross-reference from `§6.12` to `§6.11`, and add an `(MVP)` annotation with a PoC note that constants are Docker env vars in PoC. |
| G-06 (Medium) | Add a PoC/MVP split to the §6 preamble opening sentence. |
| G-07 (Medium) | Annotate 5 MVP-only elements in §6.10 (preamble, 2 table rows, 1 table row, closing paragraph). |
