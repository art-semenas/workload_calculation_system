# TOR v2.11 Gap Resolution Task List

**Source document:** [TOR_Workload_WebApp.md](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md)  
**Derived from review:** contradictions and gaps verified on 2026-03-15  
**Purpose:** convert review findings into actionable specification tasks before implementation starts

---

## How to use this list

Each task below is intended as a documentation and contract-alignment task for the TOR, not a code task.  
For each item:

- update all referenced TOR sections, not just the first place where the issue appears
- prefer one canonical rule over explanatory exceptions
- keep PoC and MVP scope markers explicit
- update acceptance criteria if the change affects observable behaviour

---

## Priority Summary

| ID | Priority | Task | Why it matters |
| --- | --- | --- | --- |
| T-01 | Critical | Normalize recalculation semantics | Current TOR describes both on-demand and automatic recalculation |
| T-02 | Critical | Define object hard-delete cascade contract | Delete behaviour is incomplete at schema/API/cache level |
| T-03 | High | Unify admin config API contract | API section and validation section define different endpoints |
| T-04 | High | Fix PoC to MVP milestone mapping | Migration roadmap currently contradicts itself |
| T-05 | High | Normalize import system-type contract | Import examples conflict with canonical system enum values |
| T-06 | Medium | Clarify engineer visibility rules | UI and permission model disagree on `/engineers` access |
| T-07 | Medium | Define manual division/branch creation path | Manual object creation path is underspecified |

---

## T-01 Normalize Recalculation Semantics

**Priority:** Critical

### Problem

The TOR currently mixes two incompatible models:

- **on-demand recalculation only** after admin action
- **automatic or asynchronous recalculation** immediately after save

This contradiction appears in functional requirements, UI copy, API descriptions, and acceptance criteria. As written, two different teams could implement two different systems and both believe they followed the spec.

### Why this matters

- worker design depends on this decision
- stale indicator wording depends on this decision
- API behaviour after writes depends on this decision
- tests and performance targets depend on this decision
- PoC/MVP scope boundaries become unclear

### Affected TOR areas

- [TOR_Workload_WebApp.md:348](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L348)
- [TOR_Workload_WebApp.md:361](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L361)
- [TOR_Workload_WebApp.md:830](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L830)
- [TOR_Workload_WebApp.md:1164](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1164)
- [TOR_Workload_WebApp.md:1180](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1180)
- [TOR_Workload_WebApp.md:1357](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1357)
- [TOR_Workload_WebApp.md:1430](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1430)
- [TOR_Workload_WebApp.md:1454](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1454)
- [TOR_Workload_WebApp.md:1824](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1824)
- [TOR_Workload_WebApp.md:1842](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1842)
- [TOR_Workload_WebApp.md:2022](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2022)
- [TOR_Workload_WebApp.md:2287](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2287)
- [TOR_Workload_WebApp.md:2370](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2370)

### Required resolution

Choose one canonical rule for MVP and rewrite every conflicting sentence to match it.

Recommended direction based on the current document backbone:

- writes mark summaries stale synchronously
- no recalculation starts automatically
- recalculation begins only when admin triggers `POST /svod/recalculate`
- UI says "stale" or "needs recalculation", not "recalculating", unless a job is actually running

Also clarify PoC separately:

- PoC uses synchronous recalculation on save
- MVP uses stale tracking + on-demand recalculation

### Concrete document changes

- replace all "triggers recalculation" wording with either `marks stale` or `starts recalculation`, depending on the chosen model
- separate "write-time invalidation" from "job-time recalculation"
- fix UI copy for stale states versus in-progress states
- align API endpoint comments such as `Update (triggers recalc)`
- align AC-03 with AC-20 so they no longer contradict each other

### Done criteria

- one recalculation model is described consistently across FR, UI, API, architecture, and AC sections
- PoC and MVP behaviour are explicitly different where intended
- there are no remaining phrases that imply auto-recalc if the canonical model is on-demand
- stale state and processing state are described with different UI wording

---

## T-02 Define Object Hard-Delete Cascade Contract

**Priority:** Critical

### Problem

The TOR says object deletion is a hard delete, but does not fully define what happens to child records and dependent caches. The schema lists many foreign keys to `objects`, yet delete semantics are not specified for most of them.

### Why this matters

- schema design cannot be finalized safely
- API behaviour on delete is ambiguous
- engineer summaries may become stale or wrong after object removal
- teams may choose incompatible combinations of DB cascade and application cleanup

### Affected TOR areas

- [TOR_Workload_WebApp.md:126](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L126)
- [TOR_Workload_WebApp.md:490](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L490)
- [TOR_Workload_WebApp.md:501](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L501)
- [TOR_Workload_WebApp.md:519](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L519)
- [TOR_Workload_WebApp.md:548](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L548)
- [TOR_Workload_WebApp.md:563](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L563)
- [TOR_Workload_WebApp.md:610](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L610)
- [TOR_Workload_WebApp.md:692](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L692)
- [TOR_Workload_WebApp.md:1168](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1168)
- [TOR_Workload_WebApp.md:1798](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1798)
- [TOR_Workload_WebApp.md:2212](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2212)

### Required resolution

Specify the delete contract for:

- `object_devices`
- `object_system_assignments`
- `records_tasks`
- `object_repairs`
- `travel`
- `summaries`
- `object_engineers`

Also specify what must happen to `engineer_summaries` when an object is deleted.

Recommended direction:

- child rows tied to object lifecycle are deleted with the object
- affected engineers are marked stale immediately
- recalculation of engineer summaries follows the canonical recalculation model from T-01

### Concrete document changes

- add explicit FK delete actions or state that deletion is handled in service layer plus transaction
- add object deletion row to cache invalidation rules
- document delete response behaviour in API section
- add one acceptance criterion for delete correctness

### Done criteria

- every table referencing `objects` has documented delete behaviour
- `DELETE /objects/:id` has an unambiguous transactional contract
- engineer-summary consequences are explicitly defined
- schema, API, and cache sections agree

---

## T-03 Unify Admin Config API Contract

**Priority:** High

### Problem

Two incompatible API shapes are currently described:

- `PUT /admin/config/:key`
- `PUT /admin/config`

The first implies one-key updates. The second implies batch save with cross-key validation. Since the validation rules include cross-key constraints, the contract cannot remain ambiguous.

### Why this matters

- backend API design is blocked
- frontend form design is blocked
- validation error format depends on batch vs single-key save
- acceptance tests already assume batch save semantics

### Affected TOR areas

- [TOR_Workload_WebApp.md:1212](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1212)
- [TOR_Workload_WebApp.md:1254](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1254)
- [TOR_Workload_WebApp.md:1267](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1267)
- [TOR_Workload_WebApp.md:1868](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1868)
- [TOR_Workload_WebApp.md:2406](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2406)

### Required resolution

Pick one of these models:

1. **Batch-only config save**
2. **Per-key save plus a separate batch validation/save endpoint**

Recommended direction:

- keep `GET /admin/config`
- use `PUT /admin/config` for full save or patch-style multi-key save
- validate cross-key rules before write
- return all violations together

If per-key updates are still desired, they must be explicitly limited to keys that do not participate in cross-key constraints, or they must validate against the full effective config state.

### Concrete document changes

- update API endpoint list
- add request/response body shape
- make validation section use the exact same endpoint
- align AC-23 with final contract
- note PoC versus MVP scope clearly

### Done criteria

- one authoritative endpoint contract exists
- cross-key validation is possible under the chosen design
- frontend can implement the admin form without guessing request shape
- AC and API sections reference the same endpoint name

---

## T-04 Fix PoC to MVP Milestone Mapping

**Priority:** High

### Problem

The simplification section and migration table disagree on which milestone resolves:

- S-08: PDF export
- S-09: concurrency/locking

This is a roadmap contradiction, not just wording noise.

### Why this matters

- milestone planning becomes unreliable
- scope commitments can be assigned to the wrong release
- implementation order and dependencies may be planned incorrectly

### Affected TOR areas

- [TOR_Workload_WebApp.md:2502](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2502)
- [TOR_Workload_WebApp.md:2508](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2508)
- [TOR_Workload_WebApp.md:2647](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2647)

### Required resolution

Correct the mapping so the simplification section and the migration table say the same thing.

Recommended mapping based on the migration table:

- concurrency/locking = `M-09`
- PDF export = `M-11`

Also verify whether "post-MVP" is intended to be represented as a numbered migration milestone. If yes, say so directly. If no, remove the milestone style from post-MVP items.

### Concrete document changes

- fix `_Reversed in:_` references for S-08 and S-09
- confirm dependency notes still make sense after correction
- ensure milestone descriptions and ordering are internally consistent

### Done criteria

- every S-item points to the correct migration item
- milestone numbering is consistent in all references
- readers can use section 15.7 as a roadmap without cross-checking other sections

---

## T-05 Normalize Import System-Type Contract

**Priority:** High

### Problem

The import example uses:

- field name `system`
- Latin values like `OS` and `PS`

But the canonical TOR model uses:

- field name `system_type`
- values `ОС`, `ПС`, `Видео`

No normalization or aliasing rule is specified.

### Why this matters

- import payload producers do not know what exact values are valid
- backend validation behaviour is undefined
- tooling built against the example may fail against the API
- this is a data-contract issue, not just documentation wording

### Affected TOR areas

- [TOR_Workload_WebApp.md:95](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L95)
- [TOR_Workload_WebApp.md:150](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L150)
- [TOR_Workload_WebApp.md:474](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L474)
- [TOR_Workload_WebApp.md:503](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L503)
- [TOR_Workload_WebApp.md:1974](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1974)
- [TOR_Workload_WebApp.md:1991](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1991)
- [TOR_Workload_WebApp.md:2030](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2030)

### Required resolution

Define one canonical external import contract.

Recommended direction:

- use `system_type` in payloads
- explicitly list accepted values
- if aliases such as `OS`, `PS`, `VIDEO` are allowed, document them as input normalization rules only
- define validation failure for unsupported values

### Concrete document changes

- rewrite JSON examples to match canonical names
- add validation rule for system-type normalization or rejection
- ensure examples match DB/API terminology
- update text-list import notes if they also accept aliases

### Done criteria

- payload examples, validation rules, and core model use the same field names
- accepted input values are explicitly defined
- import tooling can be implemented without interpretation

---

## T-06 Clarify Engineer Visibility Rules

**Priority:** Medium

### Problem

The permissions model says engineers can only see their own data, but the UI section defines a general `/engineers` list page showing all engineers and load ratios. The TOR does not state whether engineers:

- cannot access that page at all
- can access it but only see themselves
- can access full list but not details

### Why this matters

- frontend routing and menu visibility are blocked
- backend filtering rules are underspecified
- role-based tests cannot be written unambiguously

### Affected TOR areas

- [TOR_Workload_WebApp.md:1384](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1384)
- [TOR_Workload_WebApp.md:1457](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1457)
- [TOR_Workload_WebApp.md:2066](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2066)
- [TOR_Workload_WebApp.md:2082](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2082)
- [TOR_Workload_WebApp.md:2085](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2085)
- [TOR_Workload_WebApp.md:3613](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L3613)
- [TOR_Workload_WebApp.md:3616](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L3616)

### Required resolution

Pick one access model and state it consistently in UI, API, and permissions sections.

Recommended options:

1. hide `/engineers` from engineer role entirely
2. allow `/engineers` but return exactly one row for self
3. introduce a dedicated self-only page and reserve `/engineers` for admin/editor/viewer

Option 3 is usually the cleanest specification model.

### Concrete document changes

- clarify route visibility by role
- clarify `GET /engineers` behaviour per role
- clarify whether engineer can open another engineer's detail page
- align permissions matrix and field-level access text

### Done criteria

- engineer visibility rules are unambiguous
- route access and API filtering match
- RBAC test cases can be written directly from the TOR

---

## T-07 Define Manual Division and Branch Creation Path

**Priority:** Medium

### Problem

Objects require `division` and `branch`, and there is a manual object creation route. However, the TOR does not define how divisions and branches are created or selected during manual data entry. Import can create them on the fly, but the manual workflow is not specified.

### Why this matters

- object create form cannot be designed completely
- API for object creation is underspecified
- seed-data-only versus user-managed org structure is not decided

### Affected TOR areas

- [TOR_Workload_WebApp.md:122](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L122)
- [TOR_Workload_WebApp.md:1368](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1368)
- [TOR_Workload_WebApp.md:1371](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1371)
- [TOR_Workload_WebApp.md:1795](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L1795)
- [TOR_Workload_WebApp.md:2012](/d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md#L2012)

### Required resolution

Choose one of these models:

1. divisions and branches are managed entities with their own CRUD API/UI
2. object creation may create missing division/branch records implicitly
3. divisions and branches are immutable seed/reference data and object creation must select existing ones only

Recommended direction:

- if the bank org structure is relatively stable, use existing-entity selection only
- if manual setup is required for PoC, add minimal admin CRUD or explicit seeded reference setup steps

### Concrete document changes

- define object-create request shape clearly
- define whether create form uses dropdowns, autocomplete, or free text
- add missing endpoints if org structure is user-managed
- add validation rules for duplicate branch names within division if applicable

### Done criteria

- manual object creation workflow is fully specifiable
- frontend knows whether division/branch are selectable or creatable
- API no longer relies on assumptions imported from the bulk import path

---

## Suggested Execution Order

1. T-01 Normalize recalculation semantics
2. T-02 Define object hard-delete cascade contract
3. T-03 Unify admin config API contract
4. T-05 Normalize import system-type contract
5. T-06 Clarify engineer visibility rules
6. T-07 Define manual division and branch creation path
7. T-04 Fix PoC to MVP milestone mapping

Rationale:

- T-01 and T-02 affect multiple other sections and should be settled first
- T-03 and T-05 are API-contract blockers
- T-06 and T-07 affect UI and RBAC clarity
- T-04 is important, but it is roadmap cleanup rather than behavioural ambiguity

---

## Expected Output After Completion

When all tasks are finished, the TOR should have:

- one consistent recalculation model per scope level
- a complete delete contract for objects
- one authoritative config API contract
- aligned PoC to MVP roadmap references
- a stable import payload contract
- unambiguous engineer-visibility rules
- a fully specified manual object-creation workflow
