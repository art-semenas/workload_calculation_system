# TOR v2.17 Review — Contradictions & Gaps

**Review date:** 2026-03-19
**Verified against TOR version:** 2.17

---

## Summary

Full document sweep (all 4,244 lines across §1–§25). All high-risk cross-checks from the review checklist were run. Seven findings total: 1 Critical, 3 High, 3 Medium. No recurrence of previously fixed patterns (PoC recalculation leak in §24, stale wording mismatch, Redis in PoC, XLSX import wording, formula divisor hardcoding, cascade annotations, `responsible_engineer` field) — all confirmed clean.

---

## Contradictions

| ID   | Priority | Description                                                                                                             | Affected sections     |
|------|----------|-------------------------------------------------------------------------------------------------------------------------|-----------------------|
| C-01 | Critical | S-05 "Reversed in: M-01" but M-01 is JSON bulk import (resolves S-06); planning periods are implemented in M-07        | §15.3, §15.7          |
| C-02 | High     | §10.2 validation failure example shows ZERO_THRESHOLD=5, CAP=10 in the request body — these satisfy `ZERO_THRESHOLD < CAP` so the error would not fire; the example is internally inconsistent | §10.2, §6.11.1        |

---

## Gaps / Missing Specifications

| ID   | Priority | Description                                                                                                             | Affected sections     |
|------|----------|-------------------------------------------------------------------------------------------------------------------------|-----------------------|
| G-01 | High     | §11.1 processing steps (1–9) do not document the two-step confirm workflow implied by §10.2's separate `POST /import/data/confirm` endpoint — preview vs execution behaviour is unspecified | §10.2, §11.1          |
| G-02 | High     | §7.2 and §7.3 describe `is_stale`/stale indicator behaviour without a PoC scope note; §7.6, §7.9, §7.10 have proper "PoC: no stale indicator" annotations but §7.2 tab definition and §7.3 equipment tab do not | §7.2, §7.3            |
| G-03 | Medium   | §6.13 says "Two new `app_config` keys:" but the table contains only one key (`ENGINEER_WARNING_THRESHOLD`); the second entry (overload boundary 1.0) is explicitly non-configurable — header is misleading | §6.13                 |
| G-04 | Medium   | §16.6 `engineers_overloaded_branch` formula filters by `home_division_id` mapping to the branch's parent division, not the branch itself — functionally this produces a division-level count repeated for every branch in the division, making branch-level overload meaningless | §16.6                 |
| G-05 | Medium   | AC-03, AC-17, and AC-20 test MVP-only behaviour (`is_stale` tracking, on-demand recalculation, device catalog editing) but lack "(MVP)" scope annotations; AC-23 already has a correctly annotated "(MVP)" label — the pattern is inconsistent | §14 (AC-03, AC-17, AC-20) |

---

## Section-by-Section Notes

### §15.3 PoC Simplifications (S-05 — C-01)

S-05 ends with `_Reversed in:_ M-01 (MVP)`. M-01 in the milestone table (§15.7) is "JSON bulk import — Resolves S-06." Planning periods are implemented in M-07, which explicitly states "Resolves S-05." S-06 correctly says "Reversed in: M-01." The S-05 label is a copy-paste error — it picked up M-01 from the adjacent S-06.

### §10.2 Config Update Validation Failure Example (C-02)

The request body shows:
```json
{
  "REPAIR_TRAVEL_CAP": 10,
  "REPAIR_TRAVEL_ZERO_THRESHOLD": 5,
  "ENGINEER_WARNING_THRESHOLD": 0.8
}
```
With `ZERO_THRESHOLD=5` and `CAP=10`, the constraint `ZERO_THRESHOLD < CAP` evaluates to `5 < 10 = TRUE` — constraint satisfied, no violation. Yet the response body shows `CONFIG_REPAIR_THRESHOLDS_INVERTED`. Compare with §6.11.1 which correctly shows ZERO_THRESHOLD=8, CAP=5 (inverted) to demonstrate the error. The §10.2 example needs its values inverted.

### §10.2 and §11.1 Import Confirm Flow (G-01)

§10.2 defines two endpoints: `POST /import/data` (returns "preview + validation report") and `POST /import/data/confirm` (executes confirmed import). §11.1 processing steps 1–9 describe execution-phase logic only — there is no description of what the preview step returns, what the validation report looks like, or how the confirm step differs from the preview step. The two-step workflow is implied by the API surface but never specified as a process.

### §7.2 and §7.3 Missing PoC Scope Notes (G-02)

§7.2 defines the СВОД tab as "shows stale indicator when `is_stale = 'TRUE'`" with no PoC caveat. §7.3 Equipment Tab states "Saving any value marks the object summary stale. The СВОД tab shows a 'Данные устарели — нажмите Пересчитать' indicator..." with no PoC caveat. In PoC (S-02), summaries recalculate synchronously — the СВОД tab updates immediately on save and no stale indicator appears. Sections §7.6 Section 5, §7.9, and §7.10 all have correct "_PoC: No stale indicator..._" notes. §7.2 and §7.3 are the only UI requirement sections that omit this.

### §6.13 "Two new app_config keys" (G-03)

The header at §6.13 reads "Two new `app_config` keys:" but the table that follows contains a single row (`ENGINEER_WARNING_THRESHOLD`). The overload boundary (1.0) is mentioned immediately after as "not configurable." This looks like a leftover from an earlier draft when a second key was included. The header should read "One new `app_config` key:" or the table header should be removed.

### §16.6 Branch-Level Overload Attribution (G-04)

The formula for `engineers_overloaded_branch` uses `WHERE home_division_id maps to this branch's division`. An engineer belongs to a division, not a branch. Every branch in the same division will return the same engineer count. This means if a division has 5 branches, the same overloaded engineer is counted in all 5 branches — making the branch-level metric a duplicated division-level metric. The API response shape in §16.7 shows division-level breakdown only (no branch-level engineer counts), so this discrepancy may be limited to the aggregation rules description. However, §16.5 defines `coverage_gap_count_branch` at true branch level, so the branch granularity is used elsewhere. A clarifying note should explain that engineer overload is not attributable below division level.

### §14 AC Missing MVP Annotations (G-05)

- **AC-03** requires both device catalog editing (S-03, reversed in M-04) and staleness tracking (S-02, reversed in M-06). Neither PoC simplification is reversed yet in PoC. AC-03 should be labelled "_(MVP — requires M-04 and M-06)_".
- **AC-17** tests `engineer_summaries.is_stale` being set `TRUE` in the same transaction — `is_stale` does not exist in the PoC schema (§15.4 confirms, §15.8 table shows it's added in M-06). AC-17 should be labelled "_(MVP — requires M-06)_".
- **AC-20** tests that СВОД shows a stale indicator after a normative update and does not auto-recalculate — both conditions require M-06. AC-20 should be labelled "_(MVP — requires M-04 and M-06)_".

---

## High-Risk Cross-Checks — Results

| Cross-check                                 | Result |
|---------------------------------------------|--------|
| §6 formulas ↔ §6.11 `app_config`            | ✅ Clean — all 19 keys match formula references |
| §10 API ↔ §6.11.1 validation rules          | ✅ Endpoint shape matches; **C-02** flag on example values |
| §5 full schema ↔ §15.4 PoC schema           | ✅ Clean — exclusion table in §15.8 is complete |
| §9.1 tech stack ↔ §15.8 PoC stack           | ✅ Clean — Redis, JWT refresh, Docker Compose all properly annotated |
| §7 UI wording ↔ §17 concurrency             | ✅ Clean — `TRUE`/`PROCESSING` wording identical in §7.6, §7.9, §7.10; **G-02** flag on §7.2 and §7.3 |
| §15.7 milestones ↔ §15 S-xx items           | ❌ **C-01** — S-05 "Reversed in: M-01" should be M-07 |
| §11.1 import model ↔ §15.3 PoC import       | ✅ Clean — JSON only, XLSX external, consistent throughout |
| §4 FR-xx ↔ §14 AC-xx                        | ✅ Clean — all ACs map to FRs; **G-05** flag on scope annotations |
| §6.10 cache invalidation ↔ §15 PoC          | ✅ Clean — all stale-marking actions correctly annotated MVP-only |
