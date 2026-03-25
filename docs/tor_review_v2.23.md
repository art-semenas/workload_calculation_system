# TOR v2.23 Review — Contradictions & Gaps

**Review date:** 2026-03-25
**Verified against TOR version:** 2.23

---

## Cross-Check Results Summary

| Cross-check                        | Result  | Notes                                                                                                                                                                             |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §6 formulas ↔ §6.11 `app_config`   | PASS    | Formula keys, defaults, and validation rules remain aligned                                                                                                                       |
| §10 API ↔ §6.11.1 validation rules | PARTIAL | Batch `PUT /admin/config` shape is consistent, but §10.2 still presents config endpoints as usable in PoC even though §6.11.1 explicitly says no HTTP save endpoint exists in PoC |
| §5 full schema ↔ §15.4 PoC schema  | PASS    | PoC schema remains a documented subset of the full schema                                                                                                                         |
| §9.1 tech stack ↔ §15.8 PoC stack  | PASS    | Redis, refresh tokens, and background worker remain correctly scoped MVP-only                                                                                                     |
| §7.6/§7.9/§7.10 stale wording      | PASS    | `TRUE` / `PROCESSING` wording is consistent across all UI sections                                                                                                                |
| §15.7 milestones ↔ §15 S-xx items  | PASS    | Active simplification reversals still match milestone rows                                                                                                                        |
| §11.1 import ↔ §15.3 PoC import    | PASS    | JSON bulk import terminology remains consistent; no XLSX-import leakage found                                                                                                     |
| §4 FR-xx ↔ §14 AC-xx               | PASS    | v2.23 closes the previously missing AC coverage gaps                                                                                                                              |
| §6.10 cache invalidation ↔ §15 PoC | PASS    | The core invalidation section remains correctly phase-split; residual drift now sits in §8.4, not §6.10                                                                           |

---

## Contradictions

| ID   | Priority | Description                                                                                                                                                                                                                                                                                                                   | Affected sections                                   |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| C-01 | High     | §10.2 still exposes `/admin/config` as a live endpoint in PoC (`synchronous recalc — PoC`), but §6.11 and §6.11.1 define PoC configuration as startup-only Docker environment variables with **no HTTP save endpoint**. The same block also exposes `/admin/audit` without MVP-only scoping even though PoC has no audit log. | §6.11, §6.11.1, §7.1, §10.2, §15.3 S-03, §15.3 S-07 |
| C-02 | Medium   | §8.4 Data Integrity still hardcodes MVP-style stale marking for object deletion and same-transaction `is_stale` writes, but the canonical object-delete behavior is phase-split elsewhere: PoC recalculates synchronously and has no `is_stale` columns.                                                                      | §8.4, §6.10, §10.2 Objects, §15.3 S-02              |
| C-03 | Medium   | The PoC runbook tells operators to check `/health`, inspect `/admin/config`, and use Datadog logs. The canonical PoC operational model is different: health lives at `/actuator/health`, config comes from environment variables, and PoC logs are local JSON stdout with no Datadog agent.                                   | §18.3, §18.1, §6.11, §15.2, §15.8                   |

---

## Gaps / Missing Specifications

| ID   | Priority | Description                                                                                                                                                                                                                                                                                                                              | Affected sections                                 |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| G-01 | Medium   | Planning-period UI/API surfaces are still presented as unconditional shared functionality. `/admin/periods`, the shared `/svod` period selector text, and the planning-period endpoints are not marked MVP-only even though S-05 removes periods from PoC, M-07 introduces them, and the PoC route list explicitly omits a periods page. | §7.1, §7.10, §10.2, §15.3 S-05, §15.5, §15.7 M-07 |

---

## Section-by-Section Notes

### §6 Calculation Engine

- Core formula/config alignment is still intact.
- The PoC/MVP split for configuration sources is now clear in §6.11 and §6.11.1, which makes the remaining §10.2 app-config wording stand out as a direct contradiction.

### §7 User Interface Requirements

- Stale-banner wording remains consistent after the v2.14 cleanup.
- Shared route/page descriptions still leak MVP-only planning-period functionality into the unscoped UI table (`/admin/periods`, `/svod` period selector), while §15.5 PoC routes omit that surface entirely.

### §8 Non-Functional Requirements

- §8.4 is now the main residual phase-drift point. It still describes `is_stale` handling as if it were universally available, even though PoC explicitly removes staleness tracking.

### §9 Architecture Constraints

- Redis, refresh-token, and background-worker scoping remain internally consistent. No renewed PoC/MVP drift found here.

### §10 API Design

- Engineer RBAC and stale-marking endpoint notes added in v2.23 are present and consistent.
- Remaining issues are concentrated in admin/MVP surfaces: app-config endpoints are described as usable in PoC, and planning-period endpoints still lack MVP-only scope notes.

### §14 Acceptance Criteria

- The v2.23 additions AC-24 through AC-32 close the FR coverage issues reported in v2.22.
- No new FR/AC mapping gaps were found in this pass.

### §15 PoC Scope

- PoC route list, simplifications, and migration milestones remain internally coherent.
- Those sections now serve as the clearest source of truth showing where §§7, 10, and 18 still drift back toward MVP wording.

### §18 Observability & Monitoring

- Core PoC observability model is coherent: JSON stdout logs, `/actuator/health`, and no Datadog agent in PoC.
- The residual problem is operational guidance: the PoC runbook still points to tools and endpoints that do not exist in the PoC environment.

### §23 Normative Versioning Policy

- The v2.23 rewrite is sound. The previous false claim that PoC gains protection from periods and audit log is gone.
