# TOR v2.24 Gap Resolution Task List

## Priority Summary

| ID   | Priority | Task                                                          | Why it matters                                                                                          |
| ---- | -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| T-01 | Critical | Fix document footer version string from 2.22 to 2.24          | Authoritative version is ambiguous; anyone reading the last page sees a stale version number            |
| T-02 | High     | Add "MVP only" labels to catalog management routes in §7.1    | PoC developers will build unused catalog UI; S-03 scope intent is invisible from the shared route table |
| T-03 | Medium   | Add "MVP only" scope annotation to §11 header                 | Import section has no in-section phase signal; readers must cross-reference S-06 to discover the scope  |
| T-04 | Medium   | Add active-period reference to §11.1 processing steps 5 and 6 | MVP inserts period-linked rows without the steps saying which period to use; implementation risk        |

---

## T-01 — Fix document footer version string

**Priority:** Critical

### Problem

The final line of the document reads:

> `_End of Technical Specification — Version 2.22_`

The document header on line 5 declares:

> `**Version:** 2.24`

These two references are inconsistent. The footer was last updated when the document was at v2.22 and has not been bumped through the subsequent v2.23 and v2.24 revisions.

### Why this matters

Anyone reading the document from the end (e.g., a stakeholder who scrolls to the last page of a PDF export) will see version 2.22 as the authoritative label. This could cause version confusion in handoffs, audits, or when comparing the document against the changelog list that clearly lists v2.23 and v2.24 entries.

### Affected TOR areas

- [Last line of TOR (line 4350)](TOR_Workload_WebApp.md#L4350)
- [TOR header version field (line 5)](TOR_Workload_WebApp.md#L5)

### Required resolution

Replace the trailing footer with:

```
_End of Technical Specification — Version 2.24_
```

Update this footer on every future version bump simultaneously with the header version field and the changelog entry.

---

## T-02 — Add "MVP only" labels to catalog management routes in §7.1

**Priority:** High

### Problem

§7.1 route table (shared route list) applies "MVP only" labels to `/admin/config` (added by v2.24 T-01) and `/admin/periods` (added by v2.24 T-02), but does **not** label the following routes that are equally MVP-only per S-03:

| Route                  | Current label in §7.1                                                  | What S-03 says                                                      |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `/catalog/devices`     | "List / create / edit device types and contexts" — no scope annotation | S-03: No UI to add, edit, or delete device types or contexts in PoC |
| `/catalog/devices/new` | "Create device type" — no scope annotation                             | S-03: same                                                          |
| `/catalog/devices/:id` | "View/edit device and all system contexts" — no scope annotation       | S-03: same                                                          |
| `/catalog/repairs`     | "List / create / edit repair type catalog" — no scope annotation       | S-03: No UI to add, edit, or delete repair types in PoC             |

The §15.5 PoC route list omits all four routes, which is consistent with S-03. But a developer reading §7.1 in isolation to plan the PoC UI sees catalogue management listed without qualification and has no signal to skip it.

S-03 is reversed in M-04 (device catalog) and M-05 (repair catalog).

### Why this matters

A developer building the PoC UI using §7.1 as the primary reference will implement catalog management pages that are not required for PoC, adding implementation effort and complexity to the demo environment. The PoC goal (§15.1) is a focused demonstration of the calculation engine — catalog management UI is not required for that goal.

### Affected TOR areas

- [§7.1 route table](TOR_Workload_WebApp.md#L1428) — `/catalog/devices`, `/catalog/devices/new`, `/catalog/devices/:id`, `/catalog/repairs` rows
- [§15.3 S-03](TOR_Workload_WebApp.md#L2891) — PoC simplification that removes catalog management UI
- [§15.5 PoC UI routes](TOR_Workload_WebApp.md#L3008) — reference: catalog pages are absent here

### Required resolution

Add scope annotations to the four catalog routes in §7.1:

```markdown
| `/catalog/devices` | Device Catalog | List / create / edit device types and contexts — **PoC: read-only seed data, no management UI (S-03, M-04)** |
| `/catalog/devices/new` | New Device | Create device type and assign system contexts — **MVP only — requires M-04** |
| `/catalog/devices/:id` | Device Detail | View/edit device and all system contexts — **PoC: view-only; edit requires M-04** |
| `/catalog/repairs` | Repair Types | List / create / edit repair type catalog — **PoC: read-only seed data, no management UI (S-03, M-05)** |
```

The canonical description pattern should match existing MVP-labelled rows: `Route description — MVP only — requires M-xx`.

---

## T-03 — Add "MVP only" scope annotation to §11 header

**Priority:** Medium

### Problem

§11 (Migrations & Data Import) is entirely an MVP feature — S-06 removes import capability from PoC and §15.5 PoC routes omit `/import`. However, §11.1 has no explicit "(MVP only)" label at the section header or the endpoint descriptions.

Compare with the pattern used in §10.2, which labels individual MVP endpoint groups:

```
#### App Configuration _(MVP only — requires M-10)_
#### Planning Periods _(MVP only — requires M-07)_
#### Recalculation (on-demand) _(MVP only — not available in PoC)_
```

§11.1 simply opens: **"The import endpoint (`POST /import/data`) accepts a single JSON payload..."** — with no qualifier.

The full two-step import flow, import payload format, validation rules, and Liquibase migration structure are documented without a PoC scope preamble.

### Why this matters

A developer who reads §11 sequentially before reading §15 will spend time understanding and potentially implementing import logic that is not needed for the PoC. More critically, the import endpoint uses `period_id`-bearing tables (records_tasks, object_repairs) in MVP that do not even have `period_id` columns in PoC — implementing import in PoC would require schema-incompatible code.

### Affected TOR areas

- [§11.1 section header](TOR_Workload_WebApp.md#L2430) — Initial Data Import from JSON / Text Lists
- [§15.3 S-06](TOR_Workload_WebApp.md#L2907) — "JSON bulk import is manual — import via UI is MVP"
- [§15.5 PoC UI routes](TOR_Workload_WebApp.md#L3008) — `/import` absent from PoC routes

### Required resolution

Add a scope preamble immediately after the §11.1 header:

```markdown
### 11.1 Initial Data Import from JSON / Text Lists _(MVP — requires M-01)_

> **Scope: MVP.** Data import via the `/import` endpoint is introduced in M-01 and is **not available in PoC** (S-06). In PoC, all data is entered manually through the UI. The import payload format, two-step flow, and validation rules defined here apply to MVP only. The PoC schema (§15.4) uses `UNIQUE(object_id)` on `records_tasks` and `object_repairs` (no `period_id` column) — the MVP import logic references `period_id` fields not present in PoC.
```

---

## T-04 — Add active-period reference to §11.1 processing steps 5 and 6

**Priority:** Medium

### Problem

§11.1 defines the import processing pipeline in numbered steps. Steps 5 and 6 read:

> **5.** Populate `records_tasks` per object from the `records` map.
> **6.** Populate `object_repairs` per object from the `repairs` map.

In MVP, both `records_tasks` and `object_repairs` require a `period_id NOT NULL FK → periods.id`. The schema definition in §5.2 confirms:

```sql
records_tasks:  (id, object_id, period_id FK → periods.id NOT NULL, ...)
object_repairs: (id, object_id, repair_type_id, period_id FK → periods.id NOT NULL, ...)
```

The rule that governs which period to use is in **§11.2** (Import Validation Rules), last bullet:

> "Import assigns all repairs and records to the **active period** at the time of import. If no period is active, import is blocked until an admin activates a period."

§11.2 is correct and complete, but processing steps 5 and 6 in §11.1 are the natural place a developer would look to understand _how_ these rows are created. Reading steps 5 and 6 in isolation, there is no signal to look at §11.2 for the period assignment, and no indication that the `period_id` column must be set.

### Why this matters

Without a forward-reference in steps 5 and 6, a developer implementing the import service may write generic `INSERT INTO records_tasks (object_id, ...)` queries that fail at runtime with a NOT NULL constraint violation on `period_id`. The bug would only surface in MVP (when `period_id` is added in M-07), not in PoC.

### Affected TOR areas

- [§11.1 processing steps 5–6](TOR_Workload_WebApp.md#L2481) — "Populate records_tasks" and "Populate object_repairs"
- [§11.2 last bullet](TOR_Workload_WebApp.md#L2530) — active period assignment rule
- [§5.2 `records_tasks` schema](TOR_Workload_WebApp.md#L558) — `period_id NOT NULL`
- [§5.2 `object_repairs` schema](TOR_Workload_WebApp.md#L573) — `period_id NOT NULL`

### Required resolution

Update steps 5 and 6 to reference the active period assignment:

```markdown
5. Populate `records_tasks` per object from the `records` map, using `period_id = active_period.id` (the period active at import time — see §11.2). If no period is active, this step is blocked and the import returns HTTP 422.

6. Populate `object_repairs` per object from the `repairs` map, similarly using `period_id = active_period.id`. Only repair types with a non-zero count in the payload create rows; zero-count entries are skipped.
```

This makes the two steps self-contained while maintaining §11.2 as the canonical source for the blocking rule.
