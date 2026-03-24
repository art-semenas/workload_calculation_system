# TOR v2.21 Gap Resolution Task List

Based on review of `docs/TOR_Workload_WebApp.md` version 2.21.

This file captures the remaining contradictions and specification gaps that are still present in the TOR after the v2.21 updates. Each task is written as a handoff-ready item for another AI agent: it includes the exact conflicting context, why the issue matters, and the expected resolution.

---

## Priority Summary

| ID   | Priority | Task                                                                 | Why it matters                                                                                  |
|------|----------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| T-01 | High ✓   | Re-scope architecture/config rules for PoC vs MVP                    | Resolved in TOR v2.22 by making AD-08/AD-09 and §6.11 explicitly phase-aware |
| T-02 | High     | Resolve engineer visibility and cross-division assignment rules      | Editor assignment flow is internally contradictory and currently impossible to implement cleanly |
| T-03 | High     | Add phase-aware RBAC to engineer endpoints and permissions sections  | PoC says all authenticated users can write, but engineer APIs are documented as admin-only      |
| T-04 | Medium   | Fix normative versioning rationale that relies on missing PoC features | §23.2 says PoC is protected by planning periods and audit log, but PoC explicitly has neither   |
| T-05 | Medium   | Align object delete API with PoC synchronous recalculation model     | `DELETE /objects/:id` still describes MVP stale-marking flow instead of PoC synchronous recompute |

---

## T-01 — Re-scope Architecture and Config Rules for PoC vs MVP ✓ RESOLVED (v2.22)

**Priority:** High

### Problem

The Architecture Constraints section currently states two rules as unconditional:

- `AD-08`: "Summaries use explicit staleness tracking."
- `AD-09`: "All calculation constants are read from app_config at compute time."

But the PoC sections explicitly say the opposite:

- PoC has **no `is_stale` column**, **no background worker**, and **no admin trigger button**.
- PoC does **not** create the `app_config` table; constants come from Docker environment variables.

Relevant TOR excerpts:

> `AD-08: Summaries use explicit staleness tracking.`  
> ``is_stale`` is set synchronously on write, cleared on successful recalculation. Background worker recalculates asynchronously.

> `AD-09: All calculation constants are read from app_config at compute time.`  
> The calculation service must reload config values for each recalculation batch...

versus:

> `PoC: recalculates object summary synchronously when any of its data is saved (~5ms per object). No background worker, no is_stale column, no admin trigger button.`

> `PoC (S-03): This table is not created — constants are bound at startup as Docker environment variables...`

> `All constants are stored in app_config...` immediately followed by `§6.11.1 Configuration Validation Rules (MVP — requires M-10)` and a PoC note explaining env-var config.

### Why this matters

Another agent reading §9 and §6.11 as authoritative will implement the wrong PoC architecture:

- add `is_stale` to PoC tables even though PoC schema says it does not exist
- introduce a worker/admin-trigger flow into PoC even though PoC is synchronous
- load constants from `app_config` in PoC even though the table does not exist

This is not just wording drift. It changes schema, service wiring, and the expected runtime behavior of the PoC.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — lines 1810-1814](docs/TOR_Workload_WebApp.md#L1810)
- [docs/TOR_Workload_WebApp.md — line 613](docs/TOR_Workload_WebApp.md#L613)
- [docs/TOR_Workload_WebApp.md — lines 1248-1254](docs/TOR_Workload_WebApp.md#L1248)
- [docs/TOR_Workload_WebApp.md — lines 2786-2800](docs/TOR_Workload_WebApp.md#L2786)

### Required resolution

1. Rewrite `AD-08` as either:
   - `MVP only`, or
   - a split rule that explicitly states `PoC = synchronous recalculation, MVP = explicit staleness tracking`.
2. Rewrite `AD-09` and the sentence at §6.11 line 1248 so they do not imply `app_config` exists in PoC.
3. Make one source of truth explicit:
   - `PoC`: environment-bound config at startup
   - `MVP`: `app_config` table with admin UI
4. Sweep nearby architecture wording to ensure the PoC model is not silently overridden by unscoped MVP rules.

---

## T-02 — Resolve Engineer Visibility and Cross-Division Assignment Rules

**Priority:** High

### Problem

The TOR currently says all of the following:

1. Editors manage assignments within their division.
2. Engineers can be assigned to objects in **any** division.
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

These rules are not simultaneously implementable without an extra rule that the TOR does not define.

The unanswered question is:

If cross-division assignments are allowed, what exactly may an editor in Division A do?

Examples of the ambiguity:

- Can the editor assign an engineer whose `home_division_id` is Division B to an object in Division A?
- Should the editor be able to search all engineers, or only engineers from Division A?
- If the editor can only see engineers "in their `division_id`", how does that apply when engineers are modeled by `home_division_id` rather than `division_id`?

Right now the UI section and access-control section point in different directions.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — lines 368-371](docs/TOR_Workload_WebApp.md#L368)
- [docs/TOR_Workload_WebApp.md — lines 1500-1503](docs/TOR_Workload_WebApp.md#L1500)
- [docs/TOR_Workload_WebApp.md — lines 673-695](docs/TOR_Workload_WebApp.md#L673)
- [docs/TOR_Workload_WebApp.md — lines 4006-4008](docs/TOR_Workload_WebApp.md#L4006)

### Required resolution

Choose one canonical rule and apply it everywhere:

**Option A:** Editors may assign any active engineer to objects in their own division.  
If chosen:
- keep cross-division assignment allowed
- keep the unrestricted engineer picker
- change the access-control text so editor engineer visibility is not limited to same-division engineers

**Option B:** Editors may assign only engineers from their own division; cross-division assignment is admin-only.  
If chosen:
- change FR-11 and §7.4 picker text
- explicitly state that only admins can create cross-division assignments

Also fix the schema/access wording so it no longer refers to engineer visibility by `division_id` if engineers are meant to be filtered by `home_division_id`.

---

## T-03 — Add Phase-Aware RBAC to Engineer Endpoints and Permissions

**Priority:** High

### Problem

The PoC simplification `S-04` says:

> `all authenticated users can read and write all data regardless of role`

and the PoC scope claims the **full engineer module** is included.

However the API section documents engineer management endpoints as:

```text
POST   /engineers      Create engineer (admin only)
PUT    /engineers/:id  Update name, capacity_fte, home_division (admin only)
DELETE /engineers/:id  Deactivate ... (admin only)
```

The general Roles & Permissions section is also written as unconditional MVP-style RBAC, without a PoC note.

This is especially inconsistent because the divisions/branches API sections already contain explicit "RBAC by phase" notes, while the engineer endpoints do not.

### Why this matters

An agent implementing from §10 alone will lock engineer creation/editing to admins, which contradicts PoC S-04.

That breaks the PoC promise in §15.2:

- the engineer module is "full"
- `/engineers/:id/edit` exists in the PoC UI
- all authenticated users can read/write in PoC

Without a phase note, a reasonable implementer can build the wrong authorization behavior and still believe they followed the spec.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — lines 2205-2209](docs/TOR_Workload_WebApp.md#L2205)
- [docs/TOR_Workload_WebApp.md — lines 2392-2413](docs/TOR_Workload_WebApp.md#L2392)
- [docs/TOR_Workload_WebApp.md — line 2767](docs/TOR_Workload_WebApp.md#L2767)
- [docs/TOR_Workload_WebApp.md — lines 2802-2808](docs/TOR_Workload_WebApp.md#L2802)

### Required resolution

1. Add explicit RBAC-by-phase notes to the engineer endpoints, matching the pattern already used for divisions and branches.
2. Clarify PoC behavior for:
   - `POST /engineers`
   - `PUT /engineers/:id`
   - `DELETE /engineers/:id`
   - assignment endpoints under `/engineers/:id/objects` and `/objects/:id/engineers`
3. Mark §12 Roles & Permissions as either:
   - MVP-only, or
   - split into `PoC` and `MVP` behavior tables.

---

## T-04 — Fix Normative Versioning Rationale That Relies on Missing PoC Features

**Priority:** Medium

### Problem

§23.2 says non-versioned normatives are acceptable in **PoC and MVP** because:

1. planning periods provide historical isolation
2. `audit_log` provides a complete change trail

But the PoC simplifications explicitly say:

- `S-05: No planning periods`
- `S-07: No audit log`

The contradiction appears again in `C-29`, which says:

> `Once a period is deactivated...`  
> `Equipment, normatives, and travel data are not period-scoped in PoC; only repair counts and records tasks are.`

That sentence implies PoC has active/inactive periods and period-scoped repair/records data, but `S-05` says PoC has neither.

### Why this matters

This section currently overstates the auditability and historical safety of the PoC.

A downstream agent reading §23.2 will conclude that PoC already has:

- period-based historical isolation
- audited normative changes

In reality, PoC has neither. That affects risk assessment, testing expectations, and any implementation work around historical reproducibility.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — lines 4093-4104](docs/TOR_Workload_WebApp.md#L4093)
- [docs/TOR_Workload_WebApp.md — lines 2814-2818](docs/TOR_Workload_WebApp.md#L2814)
- [docs/TOR_Workload_WebApp.md — lines 2830-2834](docs/TOR_Workload_WebApp.md#L2830)
- [docs/TOR_Workload_WebApp.md — lines 2540-2542](docs/TOR_Workload_WebApp.md#L2540)

### Required resolution

1. Rewrite §23.2 so the PoC rationale does not cite planning periods or `audit_log`.
2. State the real PoC limitation plainly:
   - PoC has no normative versioning
   - no audit log
   - no planning periods
   - therefore historical reproducibility is intentionally weak in PoC
3. Fix `C-29` so it no longer describes period-lock behavior as if it already exists in PoC.

---

## T-05 — Align `DELETE /objects/:id` With the PoC Recalculation Model

**Priority:** Medium

### Problem

The cache invalidation rules in §6.10 explicitly define different behavior for object deletion:

- **PoC:** immediately recalculate affected engineer summaries synchronously
- **MVP:** mark engineer summaries stale and wait for admin-triggered recalculation

But the API section for `DELETE /objects/:id` documents only the MVP-style flow:

> mark `engineer_summaries.is_stale = 'TRUE'`  
> recalculate on-demand when `POST /svod/recalculate` is triggered

That is incompatible with PoC `S-02`, where there is no `is_stale` column and no admin trigger.

### Why this matters

This is a direct behavioral contradiction in the API contract.

An implementer following §10.2 will produce different PoC behavior than an implementer following §6.10:

- one version recalculates immediately
- the other version waits for a trigger that does not exist in PoC

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — lines 2051-2055](docs/TOR_Workload_WebApp.md#L2051)
- [docs/TOR_Workload_WebApp.md — line 1216](docs/TOR_Workload_WebApp.md#L1216)
- [docs/TOR_Workload_WebApp.md — lines 2786-2790](docs/TOR_Workload_WebApp.md#L2786)

### Required resolution

Update the `DELETE /objects/:id` documentation to mirror the PoC/MVP split already defined in §6.10:

- **PoC:** synchronous recomputation of affected engineer summaries in the same request flow
- **MVP:** stale-marking plus later admin-triggered recalculation

If the API section is intended to describe MVP-only behavior, mark it explicitly.

---

## Suggested Execution Order

1. Resolve T-01 first, because it affects the global interpretation of PoC vs MVP architecture.
2. Resolve T-03 next, because endpoint behavior and permissions depend on the phase model being clear.
3. Resolve T-02 after T-03, because the cross-division engineer assignment rule depends on the final RBAC model.
4. Resolve T-04 and T-05 last as consistency cleanup once the canonical phase split is settled.
