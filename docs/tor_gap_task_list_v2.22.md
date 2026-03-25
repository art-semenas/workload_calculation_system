# TOR v2.22 Gap Resolution Task List

Based on review of `docs/TOR_Workload_WebApp.md` version 2.22.

This file captures contradictions and specification gaps still present in the TOR. Each task is written as a handoff-ready item: it includes the exact conflicting context, why the issue matters, and the expected resolution.

---

## Priority Summary

| ID   | Priority | Status | Task                                                                 | Why it matters                                                                                  |
|------|----------|--------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| T-01 | High     | **Resolved in v2.23 (Option A)** | Resolve engineer visibility and cross-division assignment rules      | Editor assignment flow is internally contradictory and currently impossible to implement cleanly |
| T-02 | High     | **Resolved in v2.23** | Add phase-aware RBAC to engineer endpoints and permissions sections  | PoC says all authenticated users can write, but engineer APIs are documented as admin-only       |
| T-03 | Medium   | **Resolved in v2.23** | Add PoC scope annotations to §10.2 stale-marking API endpoints      | Six endpoints describe MVP stale-marking without noting PoC uses synchronous recalculation      |
| T-04 | Medium   | **Resolved in v2.23** | Align `DELETE /objects/:id` API with PoC synchronous recalculation   | API contract contradicts §6.10 which defines a different PoC behavior                           |
| T-05 | Medium   | **Resolved in v2.23** | Fix normative versioning rationale that relies on missing PoC features | §23.2 says PoC is protected by planning periods and audit log, but PoC has neither             |
| T-06 | Low      | **Resolved in v2.23** | Add missing acceptance criteria for FR-01, FR-04, FR-06, FR-08, FR-12 | Multiple functional requirements have no or incomplete AC coverage                              |

---

## T-01 — Resolve Engineer Visibility and Cross-Division Assignment Rules

**Priority:** High
**Carried forward from:** v2.21 task list (was T-02)

### Problem

The TOR currently says all of the following:

1. Editors manage assignments within their division.
2. Engineers can be assigned to objects in **any** division (cross-division allowed).
3. The object page engineer picker shows **all active engineers** and is **not restricted by division**.
4. The field-level access table says editors can see only engineers in their `division_id`.
5. The schema note says `division_id` is the access-control scope for editors, while engineers use `home_division_id` as display home.

Relevant excerpts:

> `Admins and editors (within their division) manage assignments...`

> `An engineer can be assigned to objects in any division (cross-division allowed).`

> `"+" button opens a searchable dropdown of all active engineers (not restricted by division).`

> `editor | Own division only (objects, branches, engineers in their division_id) | Own division objects and assignments`

> `division_id is the access-control scope used by editors.`
> `home_division_id is the display home for engineers — they can be assigned to objects in any division regardless of this value.`

### Why this matters

These rules are not simultaneously implementable without an extra rule the TOR does not define.

The unanswered question: **If cross-division assignments are allowed, what exactly may an editor in Division A do?**

- Can the editor assign an engineer whose `home_division_id` is Division B to an object in Division A?
- Should the editor be able to search all engineers, or only those from Division A?
- If the editor can only see engineers "in their `division_id`", how does that apply when engineers are modeled by `home_division_id` rather than `division_id`?

The UI section and access-control section point in different directions.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §4.11 (FR-11)](docs/TOR_Workload_WebApp.md#L368)
- [docs/TOR_Workload_WebApp.md — §7.4 (engineer picker)](docs/TOR_Workload_WebApp.md#L1500)
- [docs/TOR_Workload_WebApp.md — §12 (field-level access)](docs/TOR_Workload_WebApp.md#L4006)

### Required resolution

Choose one canonical rule and apply it everywhere:

**Option A:** Editors may assign any active engineer to objects in their own division.
If chosen:
- Keep cross-division assignment allowed
- Keep the unrestricted engineer picker
- Change the access-control text so editor engineer visibility is not limited to same-division engineers

**Option B:** Editors may assign only engineers from their own division; cross-division assignment is admin-only.
If chosen:
- Change FR-11 and §7.4 picker text
- Explicitly state that only admins can create cross-division assignments

Also fix the schema/access wording so it no longer refers to engineer visibility by `division_id` if engineers are meant to be filtered by `home_division_id`.

---

## T-02 — Add Phase-Aware RBAC to Engineer Endpoints and Permissions

**Priority:** High
**Carried forward from:** v2.21 task list (was T-03)

### Problem

PoC simplification S-04 says:

> `all authenticated users can read and write all data regardless of role`

and the PoC scope claims the **full engineer module** is included.

However the API section documents engineer management endpoints as:

```text
POST   /engineers      Create engineer (admin only)
PUT    /engineers/:id  Update name, capacity_fte, home_division (admin only)
DELETE /engineers/:id  Deactivate ... (admin only)
```

The general Roles & Permissions section (§12) is also written as unconditional MVP-style RBAC, without a PoC note.

This is especially inconsistent because the divisions/branches API sections **already contain** explicit "RBAC by phase" notes, while the engineer endpoints do not.

### Why this matters

An agent implementing from §10 alone will lock engineer creation/editing to admins, which contradicts PoC S-04 and breaks the PoC promise:

- the engineer module is "full"
- `/engineers/:id/edit` exists in the PoC UI
- all authenticated users can read/write in PoC

Without a phase note, a reasonable implementer can build the wrong authorization behavior and still believe they followed the spec.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §10.2 engineer endpoints](docs/TOR_Workload_WebApp.md#L2205)
- [docs/TOR_Workload_WebApp.md — §12 roles & permissions](docs/TOR_Workload_WebApp.md#L2392)
- [docs/TOR_Workload_WebApp.md — §15.3 S-04](docs/TOR_Workload_WebApp.md#L2802)

### Required resolution

1. Add explicit RBAC-by-phase notes to the engineer endpoints, matching the pattern already used for divisions and branches.
2. Clarify PoC behavior for:
   - `POST /engineers`
   - `PUT /engineers/:id`
   - `DELETE /engineers/:id`
   - Assignment endpoints under `/engineers/:id/objects` and `/objects/:id/engineers`
3. Mark §12 Roles & Permissions as either:
   - MVP-only, or
   - Split into PoC and MVP behavior tables.

---

## T-03 — Add PoC Scope Annotations to §10.2 Stale-Marking API Endpoints

**Priority:** Medium
**New in v2.22 review**

### Problem

§6.10 properly scopes all cache invalidation rules with a header note ("stale-marking actions apply to MVP only unless stated otherwise") and explicitly splits PoC vs MVP behavior for object deletion.

However, §10.2 API endpoint descriptions use "marks stale" summaries in their one-line descriptions without any PoC scope annotation:

| Endpoint | Description |
|----------|-------------|
| `PUT /objects/:id/records` | "Update (marks stale)" |
| `PUT /objects/:id/repairs/:rtid` | "Set count for one repair type (marks stale)" |
| `PUT /objects/:id/travel` | "Update (marks stale)" |
| `PUT /catalog/devices/:id/contexts/:cid` | "Update r1/r2 (marks stale for affected objects)" |
| `PUT /catalog/repairs/:id` | "Update (marks stale for affected objects)" |
| `PUT /admin/config` | "Batch update... marks summaries stale" |

Additionally, the "Recalculation (on-demand)" sub-section documents `POST /svod/recalculate`, `POST /svod/recalculate/:object_id`, and `GET /svod/recalculate/status` — endpoints that do not exist in PoC — without an "(MVP only)" header.

### Why this matters

An implementer reading §10.2 without cross-referencing §6.10 will:

- Add `is_stale` writes to PoC endpoints even though PoC has no `is_stale` column
- Expect a `/svod/recalculate` endpoint in PoC that does not exist
- Miss the PoC behavior: synchronous recalculation in the same request

§6.10 already defines the correct behavior, but §10.2 silently assumes the MVP model everywhere.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §10.2 data endpoints](docs/TOR_Workload_WebApp.md#L2086)
- [docs/TOR_Workload_WebApp.md — §10.2 recalculation endpoints](docs/TOR_Workload_WebApp.md#L2201)
- [docs/TOR_Workload_WebApp.md — §6.10 cache invalidation](docs/TOR_Workload_WebApp.md#L1202)

### Required resolution

1. Add a header note to §10.2 (or to the "Data Endpoints" sub-section) mirroring §6.10's disclaimer: "Stale-marking behavior described below applies to MVP only. In PoC, all affected summaries are recalculated synchronously on save (S-02)."
2. Add "(MVP only)" to the "Recalculation (on-demand)" sub-section header.
3. Optionally add inline "(MVP)" annotations to each stale-marking endpoint for explicit clarity.

---

## T-04 — Align `DELETE /objects/:id` With the PoC Recalculation Model

**Priority:** Medium
**Carried forward from:** v2.21 task list (was T-05)

### Problem

§6.10 explicitly defines different behavior for object deletion:

- **PoC:** immediately recalculate affected engineer summaries synchronously
- **MVP:** mark engineer summaries stale and wait for admin-triggered recalculation

But the API section for `DELETE /objects/:id` documents only the MVP-style flow:

> mark `engineer_summaries.is_stale = 'TRUE'`
> recalculate on-demand when `POST /svod/recalculate` is triggered

That is incompatible with PoC S-02, where there is no `is_stale` column and no admin trigger.

### Why this matters

This is a direct behavioral contradiction in the API contract. An implementer following §10.2 will produce different PoC behavior than an implementer following §6.10.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §10.2 DELETE /objects/:id](docs/TOR_Workload_WebApp.md#L2051)
- [docs/TOR_Workload_WebApp.md — §6.10 objects DELETE rule](docs/TOR_Workload_WebApp.md#L1216)

### Required resolution

Update the `DELETE /objects/:id` documentation to mirror the PoC/MVP split already defined in §6.10:

- **PoC:** synchronous recomputation of affected engineer summaries in the same request flow
- **MVP:** stale-marking plus later admin-triggered recalculation

If the API section is intended to describe MVP-only behavior, mark it explicitly.

**Note:** If T-03 is resolved with a section-level header note, this task may be partially addressed. However, the DELETE endpoint warrants an explicit split because it involves cascade behavior, not just stale-marking.

---

## T-05 — Fix Normative Versioning Rationale That Relies on Missing PoC Features

**Priority:** Medium
**Carried forward from:** v2.21 task list (was T-04)

### Problem

§23.2 says non-versioned normatives are acceptable in **PoC and MVP** because:

1. Planning periods provide historical isolation
2. `audit_log` provides a complete change trail

But the PoC simplifications explicitly say:

- S-05: No planning periods
- S-07: No audit log

### Why this matters

This section currently overstates the auditability and historical safety of the PoC. A downstream agent reading §23.2 will conclude that PoC already has period-based historical isolation and audited normative changes. In reality, PoC has neither.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §23.2](docs/TOR_Workload_WebApp.md#L4093)
- [docs/TOR_Workload_WebApp.md — §15.3 S-05, S-07](docs/TOR_Workload_WebApp.md#L2814)

### Required resolution

1. Rewrite §23.2 so the PoC rationale does not cite planning periods or `audit_log`.
2. State the real PoC limitation plainly:
   - PoC has no normative versioning, no audit log, no planning periods
   - Therefore historical reproducibility is intentionally weak in PoC
3. Fix any sub-clause in C-29 that describes period-lock behavior as if it already exists in PoC.

---

## T-06 — Add Missing Acceptance Criteria for Uncovered Functional Requirements

**Priority:** Low
**New in v2.22 review**

### Problem

Several functional requirements have no dedicated acceptance criteria or only partial coverage:

| FR | Title | AC Coverage Gap |
|----|-------|----------------|
| FR-01 | Object Management | No AC for CRUD operations, three-level hierarchy, or bulk import workflow |
| FR-04 | Records & Administration Tasks | No AC for data entry or record task quantity management |
| FR-06 | Travel Data | No AC for travel data entry, round-trip auto-calculation, or transport type selection |
| FR-08 | Export | Only SVOD XLSX export tested (AC-09); PDF export and object inventory XLSX export untested |
| FR-12 | Planning Periods | Only data isolation tested (AC-19); no ACs for period CRUD, active switching, or read-only enforcement |

Additionally, AC-08 (Role Enforcement) has no corresponding FR in §4 — RBAC is documented in §12 but not expressed as a functional requirement.

### Why this matters

Acceptance criteria are the primary verification contract. Without ACs for these FRs, there is no formal definition of "done" for object management, records entry, travel input, or full export capability. Testing plans derived from §14 will miss these areas entirely.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §4 (FR-01, FR-04, FR-06, FR-08, FR-12)](docs/TOR_Workload_WebApp.md#L80)
- [docs/TOR_Workload_WebApp.md — §14 (AC list)](docs/TOR_Workload_WebApp.md#L2615)

### Required resolution

1. Add dedicated ACs for:
   - FR-01: Object CRUD lifecycle, hierarchy validation
   - FR-04: Record task data entry and persistence
   - FR-06: Travel data entry, round-trip calculation
   - FR-08: PDF export fidelity, object inventory XLSX export (both MVP)
   - FR-12: Period creation, active period switching, read-only enforcement, data entry blocking
2. Either add an FR for role-based access control in §4 or cross-reference §12 from AC-08.
3. Mark any new ACs that are MVP-only with appropriate milestone annotations.

---

## Suggested Execution Order

1. **T-01 first** — the cross-division assignment ambiguity affects both UI and access-control implementation and should be settled before coding begins.
2. **T-02 next** — engineer endpoint permissions depend on T-01's resolution of who can do what.
3. **T-03 and T-04 together** — both address §10.2 PoC scope gaps; T-03's section-level header may partially resolve T-04.
4. **T-05** — standalone consistency fix in §23.2.
5. **T-06 last** — AC coverage is important but does not block implementation; it primarily affects test planning.
