# TOR v2.24 Review — Contradictions & Gaps

**Review date:** 2026-03-26
**Verified against TOR version:** 2.24 (after gap resolutions from `tor_gap_task_list_v2.24`)

---

## Status of Prior Gaps (v2.24 task list)

All four items from `tor_gap_task_list_v2.24` are resolved in the current TOR:

| ID   | Status   | Resolution verified                                          |
|------|----------|--------------------------------------------------------------|
| T-01 | ✅ Fixed | Footer now reads `_End of Technical Specification — Version 2.24_` (line 4352) |
| T-02 | ✅ Fixed | `/catalog/devices`, `/catalog/devices/new`, `/catalog/devices/:id`, `/catalog/repairs` all carry PoC/MVP scope labels in §7.1 |
| T-03 | ✅ Fixed | §11.1 header now reads `_(MVP — requires M-01)_` with a scope preamble block |
| T-04 | ✅ Fixed | §11.1 steps 5–6 now reference `period_id = active_period.id` and the §11.2 blocking rule |

---

## Contradictions

*(None found in this review cycle.)*

---

## Gaps / Missing Specifications

| ID   | Priority | Description                                                                                       | Affected sections            |
|------|----------|---------------------------------------------------------------------------------------------------|------------------------------|
| G-01 | High     | §15.8 continuity table incorrectly attributes `period_id` to `engineer_summaries` in M-06 row    | §15.8, §5.2                  |
| G-02 | Medium   | `GET /svod/export/pdf` in §10.2 lacks Post-MVP scope annotation; appears alongside XLSX without qualification | §10.2, §15.3 S-08, §15.7 M-11 |
| G-03 | Medium   | `/import` route in §7.1 has no "MVP only — requires M-01" annotation; same pattern as catalog routes fixed in v2.24 T-02 | §7.1, §15.3 S-06, §15.5      |
| G-04 | Medium   | PoC Docker Compose in §15.8 omits all 19 `WORKLOAD_CONFIG_*` env vars with no inline reference or comment | §15.8, §6.11, §15.3 S-03    |

---

## Section-by-Section Notes

### §5 Data Model vs §15.4 PoC Schema

PoC schema is a correct strict subset of the full MVP schema. The schema continuity guarantee table in §15.8 accounts for all MVP-added columns with one exception: the row that covers `engineer_summaries` overstates which columns are added in M-06 (see G-01).

### §6 Calculation Engine vs §6.11 Config Keys

All 19 `app_config` keys defined in §6.11 are referenced in the formulas in §6.3–§6.13. No orphan config keys found; no formula references an undefined key. The per-key constraints in §6.11.1 cover all 19 keys.

### §10.2 API vs §6.11.1 Validation Rules

`PUT /admin/config` (batch update) is consistent between §6.11.1 and §10.2. The 422 response body shape, the "all violations reported together" rule, and the constraint violation codes all match. No contradiction found.

### §7 UI Wording vs §17 Concurrency (`is_stale` state strings)

Stale state strings are consistent across all three sections that reference them (§7.6 object СВОД tab, §7.9 engineer dashboard, §7.10 СВОД page):
- `is_stale = 'TRUE'` → **"Данные устарели — нажмите Пересчитать"**
- `is_stale = 'PROCESSING'` → **"Пересчитывается..."**

§17.7 confirms `VARCHAR(20)` with three valid states: `'FALSE'` | `'TRUE'` | `'PROCESSING'`. No contradiction.

### §9.1 Tech Stack vs §15.8 PoC Stack

Redis is correctly annotated "MVP only — not used in PoC (see §15.8)" in §9.1. Docker Compose container count reads "MVP: 5 containers / PoC: 4 containers (no Redis)". §15.8 and §20.7 are aligned. No contradiction.

### §15.7 Milestones vs §15.3 S-xx Items

All S-xx simplifications have correct "Reversed in: M-xx" references that match the milestone table. M-03 is correctly struck through with a note that S-01 was moved into PoC scope. No dangling references found.

### §24 Calculation Snapshot & Freeze

No PoC recalculation leak. §24 correctly scopes the section as Post-MVP and references PoC synchronous recalculation (S-02) vs MVP on-demand model (AD-10, C-28).

### §11.1 Import Model vs §15.3 S-06

Consistent. §11.1 header is annotated `_(MVP — requires M-01)_` with a scope preamble. §15.3 S-06 says "import via UI is MVP" reversed in M-01. §15.5 PoC routes omit `/import`. One remaining annotation gap in §7.1 (see G-03).
