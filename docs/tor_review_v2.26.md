# TOR v2.24 Review — Contradictions & Gaps

**Review date:** 2026-03-26
**Verified against TOR version:** 2.24 (after gap resolutions from `tor_gap_task_list_v2.25`)

---

## Status of Prior Gaps (v2.25 task list)

All four items from `tor_gap_task_list_v2.25` are resolved in the current TOR:

| ID   | Status   | Resolution verified                                                                           |
| ---- | -------- | --------------------------------------------------------------------------------------------- |
| T-01 | ✅ Fixed | §15.8 continuity table now separates `summaries.period_id` from `engineer_summaries.is_stale` |
| T-02 | ✅ Fixed | `GET /svod/export/pdf` now carries a Post-MVP annotation in §10.2                             |
| T-03 | ✅ Fixed | `/import` route in §7.1 now reads `MVP only — requires M-01 (S-06)`                           |
| T-04 | ✅ Fixed | PoC Docker Compose in §15.8 now includes the `WORKLOAD_CONFIG_*` comment block                |

---

## Contradictions

| ID   | Priority | Description                                                                                                                                                                                                                            | Affected sections   |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| C-01 | High     | §18.3 PoC runbook tells operators to inspect and restart a Docker Compose service named `api`, but both Compose examples define the backend service as `backend`. The documented recovery command targets a non-existent service name. | §18.3, §15.8, §20.7 |

---

## Gaps / Missing Specifications

| ID   | Priority | Description                                                                                                                                                                                                                                                                                  | Affected sections              |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| G-01 | High     | FR-08 and AC-29 require object-level XLSX export, but §10.2 contains no corresponding API endpoint. The acceptance criterion uses `GET /objects/:id/export/xlsx` "or equivalent endpoint", leaving the contract undefined.                                                                   | §4.8, §10.2, §14 AC-29         |
| G-02 | Medium   | Object inventory XLSX export is marked `MVP` in AC-29, but §15 never states which PoC simplification excludes it or which milestone introduces it. The migration path defines only PDF export (`M-11`) and says nothing about object inventory XLSX export.                                  | §14 AC-29, §15.2, §15.3, §15.7 |
| G-03 | High     | The UI route `/admin/users` and the permissions matrix imply an admin user-management surface, but §10.2 defines only engineer endpoints (`/engineers`) and no API contract for creating/updating non-engineer users or changing roles. That leaves M-02 RBAC administration underspecified. | §7.1, §12, §10.2               |

---

## Cross-Check Summary

| Cross-check                           | Result         | Notes                                                                                                                 |
| ------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| §6 formulas ↔ §6.11 `app_config`      | PASS           | All 19 config keys referenced by formulas are present in §6.11; no hardcoded divisors reappeared                      |
| §10 API ↔ §6.11.1 validation rules    | PASS           | `PUT /admin/config` remains a batch endpoint and the 422 payload shape matches §6.11.1                                |
| §5 full schema ↔ §15.4 PoC schema     | PASS           | PoC schema remains a strict subset; prior continuity-table error is fixed                                             |
| §9.1 tech stack ↔ §15.8 PoC stack     | PASS           | Redis, refresh tokens, and background worker remain explicitly MVP-only                                               |
| §7 UI wording ↔ §17 concurrency       | PASS           | `TRUE` and `PROCESSING` stale-state strings remain aligned across §7.6, §7.9, §7.10, and §17.7                        |
| §15.7 milestones ↔ §15 S-xx items     | PASS with gap  | Existing S-xx reversal references are correct, but object inventory XLSX export has no S-xx/M-xx anchor at all (G-02) |
| §11.1 import model ↔ §15.3 PoC import | PASS           | JSON bulk import remains MVP-only; no XLSX-import wording leak found                                                  |
| §4 FR-xx ↔ §14 AC-xx                  | PASS with gaps | ACs map to FRs, but AC-29 references an undefined endpoint and unsupported milestone path                             |
| §6.10 cache invalidation ↔ §15 PoC    | PASS           | No new PoC stale-tracking leak found                                                                                  |

---

## Section-by-Section Notes

### §4 Functional Requirements

FR-08 still defines three export capabilities: СВОД XLSX, СВОД PDF, and object inventory XLSX. The first two now have clear API/milestone treatment; the third still does not.

### §7 User Interface Requirements

The shared route table is now better scoped than in earlier cycles. However, `/admin/users` remains only a UI route label with no supporting API contract in §10.2 and no explicit MVP milestone tag.

### §9 Architecture Constraints

The tech stack remains aligned with the PoC stack. No Redis or refresh-token drift reappeared.

### §10 API Design

The admin-config, planning-period, recalculation, import, coverage, and aggregation sections remain internally consistent. The main unresolved issue is the missing contract for object inventory XLSX export and the absence of any `/users` administration endpoints to back `/admin/users`.

### §14 Acceptance Criteria

AC-28 is fully anchored to `M-11` and to a named API endpoint. AC-29 is not: it contains an endpoint placeholder (`or equivalent endpoint`) and does not link to a migration milestone.

### §15 PoC Scope

The PoC/MVP split is coherent for import, PDF export, config UI, audit, periods, and stale tracking. The export story is incomplete only for object inventory XLSX export, which is excluded from the PoC in practice but not documented as an explicit simplification or milestone.

### §18 Observability & Monitoring

The runbook content is mostly aligned with the canonical PoC ops model after the v2.24 cleanup, but the service name in the operational commands still lags the Compose definitions (`api` vs `backend`).

### §20 CI/CD Pipeline

The production Compose example confirms the same backend service name (`backend`) used by the PoC Compose example, which makes the §18.3 `api` command wording a real contradiction rather than an alternate naming convention.
