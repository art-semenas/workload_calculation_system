# TOR v2.24 Review — Contradictions & Gaps

**Review date:** 2026-03-25
**Verified against TOR version:** 2.24

---

## Cross-Check Results Summary

| Cross-check                        | Result | Notes                                                                                                                             |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| §6 formulas ↔ §6.11 `app_config`   | PASS   | All 19 keys used in formulas are present in the config table; config-key divisors used throughout (no hardcoded `/6` or `/5`)     |
| §10 API ↔ §6.11.1 validation rules | PASS   | v2.24 T-01 correctly re-scoped `/admin/config` and `/admin/audit` — PoC note is explicit; batch PUT shape consistent with §6.11.1 |
| §5 full schema ↔ §15.4 PoC schema  | PASS   | PoC schema is a documented strict subset; MVP-only columns listed in §15.8 exclusion table; no extra columns leaked into PoC      |
| §9.1 tech stack ↔ §15.8 PoC stack  | PASS   | Redis, refresh tokens, and background worker remain MVP-only; PoC compose file omits Redis correctly                              |
| §7.6/§7.9/§7.10 stale wording      | PASS   | `TRUE` → "Данные устарели — нажмите Пересчитать"; `PROCESSING` → "Пересчитывается..." — consistent across all three sections      |
| §15.7 milestones ↔ §15 S-xx items  | PASS   | All "Reversed in: M-xx" references match the milestone table rows (S-05 → M-07, S-02 → M-06, etc.)                                |
| §11.1 import ↔ §15.3 PoC import    | PASS   | S-06 clearly scopes import to MVP; JSON terminology is consistent throughout §11                                                  |
| §4 FR-xx ↔ §14 AC-xx               | PASS   | All FRs have corresponding AC coverage; AC-24 through AC-32 (from v2.23) close all previously open FR gaps                        |
| §6.10 cache invalidation ↔ §15 PoC | PASS   | §6.10 invalidation table now correctly phase-split; §8.4 phase split fixed by v2.24 T-03                                          |

---

## Known Contradiction Pattern Re-check

| Pattern                                      | Result | Notes                                                                                                     |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| PoC recalculation leak (§24/AD-10/C-28/S-02) | PASS   | §24 correctly states PoC uses synchronous recalc on save (S-02); no leak found                            |
| Stale state wording inconsistency            | PASS   | §7.6, §7.9, §7.10 all aligned to canonical two-state model                                                |
| Redis in PoC                                 | PASS   | §9.1, §15.8, and PoC docker-compose.poc.yml all consistently exclude Redis                                |
| XLSX import wording                          | PASS   | "JSON bulk import" label used throughout; no "XLSX import" terminology found in import sections           |
| Admin config API shape                       | PASS   | `PUT /admin/config` (batch) in §10.2; consistent with §6.11.1 batch validation                            |
| Formula divisor hardcoded                    | PASS   | §6.5 uses `config[PLANNING_PERIOD_MONTHS]`; §6.6 uses `config[REPAIR_PRODUCTIVE_MONTHS]`                  |
| Cascade missing                              | PASS   | `ON DELETE CASCADE` annotations present on all child tables referencing `objects.id`                      |
| `responsible_engineer` VARCHAR               | PASS   | Field absent from §5.2 `objects` table; §7.9 СВОД col 5 sourced from `JOIN object_engineers → users.name` |

---

## Contradictions

| ID   | Priority | Description                                                                                                                                                                                                            | Affected sections                |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| C-01 | Critical | Document footer reads `_End of Technical Specification — Version 2.22_` but the document header declares **Version: 2.24**. This creates an ambiguous authoritative version reference for anyone reading the document. | Last line of document, §1 header |

---

## Gaps / Missing Specifications

| ID   | Priority | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Affected sections                                             |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| G-01 | High     | §7.1 route table marks `/admin/config` and `/admin/periods` as "MVP only" but does **not** label `/catalog/devices`, `/catalog/devices/new`, `/catalog/devices/:id`, `/catalog/devices/:id` (edit), and `/catalog/repairs` as MVP-only. S-03 explicitly excludes all catalog management UI from PoC. The pattern of labelling MVP-only routes is applied inconsistently in the single shared route table.                                                                               | §7.1, §15.3 S-03, §15.5                                       |
| G-02 | Medium   | §11 (Migrations & Data Import) has no "MVP only" scope annotation at the section header, unlike §10.2's individual MVP endpoint groups which carry `_(MVP only — requires M-xx)_` labels. S-06 removes the entire import capability from PoC, but a developer reading §11 in isolation has no in-section cue.                                                                                                                                                                           | §11.1, §11.2, §15.3 S-06, §15.5                               |
| G-03 | Medium   | §11.1 processing steps 5 and 6 ("Populate `records_tasks`" and "Populate `object_repairs`") create period-linked rows without referencing the active period. In MVP, both tables define `period_id NOT NULL FK → periods.id`. §11.2 states the rule ("Import assigns all repairs and records to the **active period**"), but the processing steps themselves are silent on this. A developer implementing steps 5–6 may not know to look ahead to §11.2 for the period assignment rule. | §11.1 steps 5–6, §11.2, §5.2 `records_tasks`/`object_repairs` |

---

## Section-by-Section Notes

### §5 Data Model

Full schema and PoC schema remain internally consistent. The §15.8 schema continuity exclusion table correctly lists all MVP-only columns (`failed_login_count`, `locked_until`, `period_id`, `is_stale`, intermediate repair fields, `total_repairs`). No leaked MVP columns were found in the PoC schema definition (§15.4).

### §6 Calculation Engine

All formula references to config constants use the correct `config[KEY]` pattern. No hardcoded divisors found. PoC and MVP phase annotations in §6.10 (invalidation table) and §6.11/§6.11.1 (scope disclaimer) are correctly aligned. The per-key and cross-key validation constraints in §6.11.1 are self-consistent.

### §7 User Interface Requirements

The stale-banner wording is now fully consistent across §7.6, §7.9, and §7.10 (v2.14 and v2.24 fixes hold). The `/svod` row in §7.1 now correctly labels "period selector is MVP only — requires M-07" (v2.24 T-02). The partial labelling gap for catalog management routes (G-01) is the remaining issue.

### §8 Non-Functional Requirements

§8.4 Data Integrity is now correctly phase-split by v2.24 T-03. The object deletion behaviour, `is_stale` staleness write, and cascade rules all carry explicit PoC vs MVP annotations. No residual drift found.

### §9 Architecture Constraints

§9.1 tech stack table remains internally consistent with §15.8 PoC stack. All MVP-only components (Redis, refresh tokens, Datadog) are correctly annotated.

### §10 API Design

v2.24 T-01 successfully re-scoped `/admin/config` and `/admin/audit`. The PoC notes are explicit and correct. T-02 correctly labelled planning-period endpoints. No residual cross-check failures found in §10.2.

### §11 Migrations & Data Import

The two-step import flow, import payload shape, and validation rules are well-specified for MVP. The section lacks a top-level "MVP only" scope label (G-02), and processing steps 5–6 need a period-assignment reference (G-03).

### §15 PoC Scope

The PoC simplification list (S-01 through S-09) is internally coherent. All S-xx reversal milestone references match the §15.7 milestone table. The PoC route list (§15.5) correctly omits catalog, import, periods, and config pages, which makes §7.1's unlabelled catalog routes the most impactful specification gap.

### §16 Aggregation Rules

All aggregation formulas, the required-FTE definition, the component-gap explanation (C-39), and the PoC-in-scope note (§16.8) are internally consistent. The API response shape in §16.7 correctly notes that `breakdown` sums to less than `required_fte`.

### §17 Concurrency & Locking

Correctly scoped to MVP (S-09). The watchdog mechanism and `SKIP LOCKED` pattern are consistent with the MVP background worker model.

### §18 Observability & Monitoring

v2.24 T-04 corrected the PoC runbook. §18.3 now uses `/actuator/health`, `docker compose logs`, and environment-variable config inspection — no residual reference to Datadog or admin config endpoints in PoC runbook items.

### §19–§20 Testing Strategy & CI/CD

No PoC/MVP drift found. The Jacoco thresholds, RestAssured test examples, and deployment workflow are internally consistent.

### §21–§25 Security / Env / Versioning / Snapshot / Backup

§21 security items are correctly scoped with PoC/MVP labels. §23.2 (rewritten in v2.23) remains accurate — correctly states PoC limitations (no periods, no audit log, no admin UI) without false claims. §24 correctly opens with "Scope: Post-MVP" and correctly describes the PoC recalculation model as synchronous-on-save (S-02).

The document footer version mismatch (C-01) renders the last line of §25 misleading.
