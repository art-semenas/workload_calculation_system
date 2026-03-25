# TOR v2.22 Review — Contradictions & Gaps

**Review date:** 2026-03-24
**Verified against TOR version:** 2.22

---

## Cross-Check Results Summary

| Cross-check | Result | Notes |
|-------------|--------|-------|
| §6 formulas ↔ §6.11 `app_config` | PASS | All 19 config keys used in formulas are defined with type and default |
| §10 API ↔ §6.11.1 validation rules | PASS | `PUT /admin/config` (batch) consistent in both sections; violation codes match |
| §5 full schema ↔ §15.4 PoC schema | PASS | PoC schema is strict subset; all omissions documented in exceptions table |
| §9.1 tech stack ↔ §15.8 PoC stack | PASS | Redis, JWT refresh, background workers all annotated MVP-only; container counts match |
| §7.6/§7.9/§7.10 stale wording | PASS | Identical `TRUE`/`PROCESSING` text and PoC scope notes in all three sections |
| §15.7 milestones ↔ §15 S-xx items | PASS | All 8 active S-xx "Reversed in:" references match milestone table rows |
| §11.1 import ↔ §15.3 PoC import | PASS | No XLSX-import label leaks; JSON terminology consistent; two-step flow defined |
| §4 FR-xx ↔ §14 AC-xx | GAPS | Several FRs lack acceptance criteria coverage |
| §6.10 cache invalidation ↔ §15 PoC | GAPS | §6.10 properly scoped; §10.2 API endpoints lack PoC annotations |

---

## Contradictions

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| C-01 | High | Engineer visibility rules are contradictory — cross-division assignment allowed but editor access table restricts engineer visibility to own `division_id` | §4.11, §7.4, §12 |
| C-02 | High | Engineer API endpoints document admin-only access without PoC phase note, contradicting S-04 (all authenticated users can write) | §10.2, §12, §15.3 |
| C-03 | Medium | §23.2 normative versioning rationale cites planning periods and `audit_log` as PoC protections, but PoC has neither (S-05, S-07) | §23.2, §15.3 |
| C-04 | Medium | `DELETE /objects/:id` in §10.2 describes only MVP stale-marking flow; §6.10 explicitly defines a different PoC flow (synchronous recalc) | §10.2, §6.10 |

---

## Gaps / Missing Specifications

| ID | Priority | Description | Affected sections |
|----|----------|-------------|-------------------|
| G-01 | Medium | §10.2 API endpoints with "marks stale" summaries (`PUT /objects/:id/records`, `PUT /objects/:id/repairs/:rtid`, `PUT /objects/:id/travel`, `PUT /catalog/devices/:id/contexts/:cid`, `PUT /catalog/repairs/:id`, `PUT /admin/config`) lack PoC scope annotations explaining that PoC uses synchronous recalculation instead | §10.2, §6.10, §15.3 |
| G-02 | Medium | §10.2 "Recalculation (on-demand)" sub-section (`POST /svod/recalculate`, `GET /svod/recalculate/status`) lacks an "(MVP only)" header — these endpoints do not exist in PoC | §10.2, §15.5 |
| G-03 | Medium | FR-01 (Object Management) has no dedicated AC for CRUD operations or three-level hierarchy validation | §4.1, §14 |
| G-04 | Medium | FR-04 (Records & Administration Tasks) has no dedicated AC for data entry or management of record task quantities | §4.4, §14 |
| G-05 | Low | FR-06 (Travel Data) has no dedicated AC for travel data entry, round-trip calculation, or transport type selection | §4.6, §14 |
| G-06 | Low | FR-08 (Export) — only SVOD XLSX export is covered by AC-09; PDF export and object inventory XLSX export have no ACs | §4.8, §14 |
| G-07 | Low | FR-12 (Planning Periods) — AC-19 tests data isolation only; no ACs for period creation, active period switching, read-only enforcement, or blocking data entry when no period is active | §4.12, §14 |
| G-08 | Low | AC-08 (Role Enforcement) has no corresponding FR in §4 — RBAC is documented in §12 but not as a functional requirement | §4, §12, §14 |

---

## Section-by-Section Notes

### §4 Functional Requirements
- 12 FRs defined (FR-01 through FR-12). FR coverage is reasonable but AC mapping is incomplete for FR-01, FR-04, FR-06, FR-08, and FR-12 (see G-03 through G-07).

### §5 Data Model
- Full schema and PoC schema are properly aligned. All column-level exceptions are documented in the §15.4 exceptions table with milestone references. No issues found.

### §6 Calculation Engine
- All 19 `app_config` keys are referenced by at least one formula. No orphaned or missing keys.
- §6.10 cache invalidation rules are properly scoped with a header disclaimer covering unmarked rules as MVP-only. The object DELETE rule correctly splits PoC vs MVP behavior.
- §6.11 intro now correctly states that `app_config` is MVP-only (fixed in v2.22).
- §6.11.1 validation rules are correctly marked MVP (requires M-10).

### §7 User Interface Requirements
- Stale wording is fully consistent across §7.6, §7.9, §7.10. All three sections carry identical PoC scope notes.

### §9 Architecture Constraints
- AD-08, AD-09, AD-10, AD-13 are all properly phase-scoped after v2.22 fixes. No residual PoC/MVP leaks in architecture decisions.
- Tech stack table correctly annotates Redis and job integration as MVP-only. Docker Compose container counts are consistent.

### §10 API Design
- Admin config API uses consistent `PUT /admin/config` (batch) shape — no per-key variant exists. Validation violation codes match §6.11.1.
- **Issue:** Six endpoints describe stale-marking behavior without PoC scope notes (G-01). The "Recalculation (on-demand)" sub-section lacks an MVP-only header (G-02). `DELETE /objects/:id` describes only the MVP flow (C-04).
- **Issue:** Engineer management endpoints (`POST/PUT/DELETE /engineers`) are documented as admin-only without phase-aware RBAC notes (C-02), unlike divisions/branches which already have them.

### §11 Migrations & Data Import
- JSON import terminology is consistent. No XLSX-import label leaks. Two-step import flow (dry-run + confirm) is well-defined. Upsert semantics for `object_devices` added in v2.21.

### §12 Roles & Permissions
- Field-level access table restricts editor engineer visibility to own `division_id`, but §4.11 and §7.4 allow unrestricted cross-division assignment (C-01). No PoC phase note on the section.

### §14 Acceptance Criteria
- 23 ACs defined (AC-01 through AC-23). MVP annotations on AC-03, AC-17, AC-20, AC-23 are correctly scoped with proper milestone references.
- Coverage gaps exist for FR-01, FR-04, FR-06, FR-08, FR-12 (see G-03 through G-07).

### §15 PoC Scope
- All 8 active S-xx items correctly reference their reversal milestones. PoC schema exceptions are complete. PoC UI routes include `/engineers/:id/edit` (added v2.19).
- S-04 correctly states all authenticated users can read/write, but this is not reflected in engineer API documentation (C-02).

### §16 Aggregation Rules
- Consistent after v2.20 duplicate note removal. Engineer overload attribution clarification present.

### §17 Concurrency & Locking
- `is_stale` states (`'FALSE'`, `'TRUE'`, `'PROCESSING'`) consistently defined. Technical SQL syntax appropriate for this section.

### §23 Normative Versioning Policy
- §23.2 rationale still incorrectly cites planning periods and `audit_log` as PoC protections (C-03).

### §24 Calculation Snapshot & Freeze
- Properly scoped as Post-MVP after v2.17 fix. No residual PoC recalculation wording.
