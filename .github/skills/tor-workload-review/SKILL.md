---
name: tor-workload-review
description: Use when reviewing docs/TOR_Workload_WebApp.md for internal contradictions, scope gaps, or PoC/MVP boundary drift. Apply before implementing any TOR-specified feature, after TOR edits, or when something in the spec seems unclear or contradictory.
---

# TOR Workload WebApp — Contradiction & Gap Review

## Overview

`TOR_Workload_WebApp.md` is ~258 KB across 25 sections. It has a **PoC/MVP split** woven throughout — the most common source of contradiction is PoC behaviour leaking into MVP sections or vice versa. Gaps are usually missing scope annotations, undefined cascade behaviour, or formulas that reference config keys without mapping them.

## Document Structure

| Section | Content |
|---------|---------|
| §1–§3 | Overview, goals, glossary |
| §4 | Functional requirements (FR-xx) |
| §5 | Full DB schema (all MVP tables) |
| §6 | Calculation engine (formulas, config keys) |
| §7 | UI requirements |
| §8 | NFRs |
| §9 | Architecture (tech stack, AD-xx) |
| §10 | API design (all endpoints) |
| §11 | Migrations & data import |
| §12 | Roles & permissions |
| §13 | Clarifications (C-xx) |
| §14 | Acceptance criteria (AC-xx) |
| §15 | **PoC scope** (S-xx, M-xx milestones) |
| §16 | Aggregation rules |
| §17 | Concurrency & locking |
| §18 | Observability |
| §19 | Testing strategy |
| §20 | CI/CD pipeline |
| §21 | Security hardening |
| §22 | Multi-environment definition |
| §23 | Normative versioning policy |
| §24 | Calculation snapshot & freeze |
| §25 | Backup & disaster recovery |

## Reading Strategy (File Is Too Large to Read at Once)

Read the TOR in chunks using `offset` + `limit` on the Read tool. Suggested splits:
- Lines 1–500: header, TOC, §1–§4 start
- Lines 500–1000: §4 continued, §5 schema start
- Lines 1000–1500: §5 continued, §6 formulas
- Lines 1500–2000: §6 continued, §7 UI, §8 NFR
- Lines 2000–2500: §9 arch, §10 API, §11 import, §12 roles
- Lines 2500–3000: §13 clarifications, §14 AC, §15 PoC scope
- Lines 3000–3500: §16–§20
- Lines 3500–end: §21–§25

Use Grep first to locate specific sections or terms before reading chunks.

## High-Risk Cross-Checks (Run Every Review)

These section pairs have historically produced contradictions:

| Cross-check | What to verify |
|-------------|----------------|
| §6 formulas ↔ §6.11 `app_config` | Every config key used in a formula must be listed in `app_config` with its type and default |
| §10 API ↔ §6.11.1 validation rules | API endpoint method/path must match the validation section's assumed endpoint shape |
| §5 full schema ↔ §15.4 PoC schema | PoC schema must be the full schema minus explicitly scoped-out columns/tables |
| §9.1 tech stack ↔ §15.8 PoC stack | Redis, JWT refresh, background workers must be annotated MVP-only in §9.1 if PoC doesn't use them |
| §7 UI wording ↔ §17 concurrency | `is_stale` state strings (`TRUE` / `PROCESSING`) must be identical in §7.6, §7.9, §7.10 |
| §15.7 milestones ↔ §15 S-xx items | "Reversed in: M-xx" references must match the milestone table rows |
| §11.1 import model ↔ §15.3 PoC import | Import format (JSON vs XLSX) must be consistent; XLSX is external conversion only |
| §4 FR-xx ↔ §14 AC-xx | Every acceptance criterion must map to a functional requirement |
| §6.10 cache invalidation ↔ §15 PoC | Invalidation rules that reference `is_stale` must carry an (MVP) annotation if PoC has no staleness |

## Known Contradiction Patterns (From Previous Review Cycles)

These patterns have appeared before — check for recurrence after every TOR edit:

| Pattern | Where to look |
|---------|--------------|
| **PoC recalculation leak** — §24 or AD-10 says PoC uses on-demand recalculation | §24, AD-10, C-28, S-02 |
| **Stale state wording inconsistency** — `TRUE` vs `'Данные устарели'` vs banner text not aligned | §7.6, §7.9, §7.10 |
| **Redis in PoC** — tech stack table or Docker Compose lists Redis without MVP annotation | §9.1, §15.8, §20.7 |
| **XLSX import wording** — `XLSX import` label used instead of `JSON bulk import` | §15.7 M-01, §11.1, §13 |
| **Admin config API shape** — `PUT /admin/config/:key` (single) vs `PUT /admin/config` (batch) | §10.2 vs §6.11.1 |
| **Formula divisor hardcoded** — `/6` or `/REPAIR_PLANNING_MONTHS` instead of `config[PLANNING_PERIOD_MONTHS]` | §6.5, §6.11 |
| **Cascade missing** — `ON DELETE CASCADE` on child tables not annotated | §5.2 table definitions |
| **`responsible_engineer` field** — VARCHAR in objects table instead of join through `object_engineers` | §5.2, §7.9, C-22 |

## Review Output Format

Produce two artefacts:

### 1. Structured Findings Report (`tor_review_vX.Y.md`)

```markdown
# TOR vX.Y Review — Contradictions & Gaps

**Review date:** YYYY-MM-DD
**Verified against TOR version:** X.Y

---

## Contradictions

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-01 | Critical | … | §X, §Y |

---

## Gaps / Missing Specifications

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-05 | High | … | §X |

---

## Section-by-Section Notes

### §5 Data Model
…
```

### 2. Actionable Task List (`tor_gap_task_list_vX.Y.md`)

```markdown
# TOR vX.Y Gap Resolution Task List

## Priority Summary

| ID | Priority | Task | Why it matters |
|----|----------|------|----------------|

---

## T-01 …

**Priority:** Critical

### Problem
[What two sections say different things]

### Why this matters
[What breaks if this is not fixed]

### Affected TOR areas
[Line references with markdown links]

### Required resolution
[Canonical rule to adopt]
```

## Review Checklist

Work through each cross-check in the High-Risk table above. For each:
1. Read the relevant chunk(s)
2. Note the claim in section A
3. Read the corresponding section B
4. Record any conflict or gap
5. Assign priority: **Critical** (blocks implementation), **High** (causes ambiguity), **Medium** (annotation gap only)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reporting a finding that's already in a Changelog entry | Check all changelog entries at the top; resolved items are already fixed |
| Stopping after finding 2–3 issues | The document is long; scan all high-risk pairs even after early finds |
| Marking something a "gap" when it's a deliberate PoC simplification | Check §15 S-xx list — if it's an S-xx item, it's intentional |
| Reading only the section the user mentioned | Cross-section consistency is the main source of contradictions |
| Producing only a findings list without a task list | Always produce both artefacts |
