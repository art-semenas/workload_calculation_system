# TOR v2.17 Gap Resolution Task List

## Priority Summary

| ID   | Priority | Task                                                                 | Why it matters                                                                 |
|------|----------|----------------------------------------------------------------------|--------------------------------------------------------------------------------|
| T-01 | Critical | Fix S-05 "Reversed in:" label from M-01 to M-07                     | Developers reading S-05 will plan planning periods into M-01 sprint — wrong dependency ordering |
| T-02 | High     | Fix §10.2 validation failure example request values                  | Example shows valid config values triggering a constraint error — confuses developers about when the error fires |
| T-03 | High     | Document two-step import workflow in §11.1                           | `POST /import/data/confirm` has no specification — developers won't know what the confirm step does |
| T-04 | High     | Add PoC scope notes to §7.2 and §7.3                                 | Engineers implementing PoC СВОД tab will add stale indicator wiring that doesn't exist in PoC schema |
| T-05 | Medium   | Fix "Two new app_config keys" header in §6.13                        | Misleads implementers into looking for a second configurable key               |
| T-06 | Medium   | Clarify §16.6 branch-level overload attribution                      | Branch-level engineer overload count duplicates division-level data — silent design gap |
| T-07 | Medium   | Add "(MVP)" annotations to AC-03, AC-17, AC-20                       | PoC test planning may include these ACs, which require MVP milestones to be testable |

---

## T-01: Fix S-05 "Reversed in: M-01" Label

**Priority:** Critical

### Problem

§15.3 S-05 says:
```
_Reversed in:_ M-01 (MVP)
```

§15.7 milestone table says:
```
| M-01 | JSON bulk import (FR bulk)      | — | Resolves S-06 |
| M-07 | Planning periods (FR-12) | M-01, M-06 | Resolves S-05 |
```

M-01 is JSON bulk import, which resolves S-06 (manual data entry). Planning periods (S-05) are implemented in M-07, which explicitly states "Resolves S-05." The "Reversed in: M-01" on S-05 is a copy-paste error — it copied the label from the adjacent S-06 entry.

### Why this matters

A developer reading S-05 will interpret planning periods as part of the M-01 sprint. M-07 depends on M-01 and M-06 — treating periods as M-01 work would incorrectly front-load a feature that should come later and omit the M-06 dependency. This breaks sprint planning.

### Affected TOR areas

- [§15.3 S-05](TOR_Workload_WebApp.md) — "Reversed in: M-01 (MVP)" line

### Required resolution

Change the "Reversed in:" line in S-05 from:
```
_Reversed in:_ M-01 (MVP)
```
to:
```
_Reversed in:_ M-07 (MVP)
```

---

## T-02: Fix §10.2 Validation Failure Example

**Priority:** High

### Problem

§10.2 "Config Update Request/Response" shows a **validation failure** (HTTP 422) response with this request body:
```json
{
  "REPAIR_TRAVEL_CAP": 10,
  "REPAIR_TRAVEL_ZERO_THRESHOLD": 5,
  "ENGINEER_WARNING_THRESHOLD": 0.8
}
```

The cross-key constraint is `REPAIR_TRAVEL_ZERO_THRESHOLD < REPAIR_TRAVEL_CAP`. With values 5 and 10, this evaluates to `5 < 10 = TRUE` — constraint satisfied, no violation. The 422 response body claiming `CONFIG_REPAIR_THRESHOLDS_INVERTED` would never fire for these inputs.

Compare with §6.11.1 which correctly demonstrates the error with ZERO_THRESHOLD=8, CAP=5 (inverted values).

The violation `detail` in the §10.2 example also says "REPAIR_TRAVEL_ZERO_THRESHOLD (5) must be less than REPAIR_TRAVEL_CAP (10)" — which is a true statement, not an error condition.

### Why this matters

A developer implementing `AppConfigValidator` will test their implementation against this example and conclude the validator is broken (it rejects valid input). Alternatively they'll implement incorrect logic that fires the error when the constraint is actually satisfied.

### Affected TOR areas

- [§10.2 Config Update Request/Response](TOR_Workload_WebApp.md) — "Response on validation failure (HTTP 422)" example

### Required resolution

Replace the §10.2 request body values to demonstrate an actually-inverted case. Canonical fix (matching §6.11.1):

```json
// Request — inverted thresholds (should trigger error)
{
  "REPAIR_TRAVEL_ZERO_THRESHOLD": 8,
  "REPAIR_TRAVEL_CAP": 5
}
```

And update the violation detail to match:
```json
{
  "key": "REPAIR_TRAVEL_ZERO_THRESHOLD",
  "rule": "CONFIG_REPAIR_THRESHOLDS_INVERTED",
  "detail": "REPAIR_TRAVEL_ZERO_THRESHOLD (8) must be less than REPAIR_TRAVEL_CAP (5)"
}
```

Note: the key attribution (`REPAIR_TRAVEL_ZERO_THRESHOLD` vs `REPAIR_TRAVEL_CAP`) should also be made consistent with §6.11.1, which attributes the violation to `REPAIR_TRAVEL_CAP`. Pick one and apply it consistently.

---

## T-03: Document Two-Step Import Workflow in §11.1

**Priority:** High

### Problem

§10.2 API defines two separate import endpoints:
- `POST /import/data` — "Upload JSON payload; returns preview + validation report"
- `POST /import/data/confirm` — "Execute confirmed import"

§11.1 processing steps 1–9 describe the execution logic (what happens when data is committed) but never describe:
1. What the **preview** response looks like — what does the validation report contain?
2. What distinguishes a "preview" call from a "confirm" call — does `/import/data` do a dry run? Does it write anything?
3. What session or token links the preview to its confirm?
4. Whether the confirm can be called without a prior preview.

### Why this matters

Without this specification, developers face two unresolvable questions: (a) whether `POST /import/data` is idempotent or performs a dry-run only, and (b) what state is carried between the two calls. If the preview writes to a temp table, that table is not defined anywhere. If it's stateless, the confirm must re-validate the entire payload.

### Affected TOR areas

- [§10.2 Import endpoints](TOR_Workload_WebApp.md) — `POST /import/data` and `POST /import/data/confirm`
- [§11.1 Processing steps](TOR_Workload_WebApp.md) — steps 1–9

### Required resolution

Add to §11.1 a sub-section "Two-step import flow" that defines:

1. `POST /import/data` performs **validation and dry-run only** — no database writes. Returns a preview report containing: object count, warning list (unresolved engineers, unknown devices), skipped entry count, estimated import summary. No session state is stored.
2. `POST /import/data/confirm` accepts the same JSON payload and executes all writes atomically (steps 1–9). The client is responsible for re-submitting the payload — no server-side state is carried between calls.

If a different stateful design is intended (e.g., upload → server stores temp → confirm by token), that must be specified and a temporary storage mechanism defined.

---

## T-04: Add PoC Scope Notes to §7.2 and §7.3

**Priority:** High

### Problem

§7.2 (Object Detail Page tabs) defines the СВОД tab as:
> "СВОД — Computed summary (read-only; shows stale indicator when `is_stale = 'TRUE'`; period shown in header)"

§7.3 (Equipment Tab) states:
> "Saving any value marks the object summary stale. The СВОД tab shows a 'Данные устарели — нажмите Пересчитать' indicator until the admin triggers recalculation via `POST /svod/recalculate`."

Neither section has a PoC scope caveat. In PoC (S-02), `is_stale` does not exist in the schema (§15.4), recalculation is synchronous, and no stale indicator is shown.

By contrast, §7.6 Section 5, §7.9, and §7.10 all include:
> "_PoC: No stale indicator is shown — engineer summaries recalculate synchronously on save (S-02)._"

### Why this matters

A PoC developer reading §7.2 and §7.3 will wire up stale indicator display logic for the СВОД tab, then encounter a missing `is_stale` column in the schema. The mismatch creates confusion about whether the schema is incomplete or the spec is wrong.

### Affected TOR areas

- [§7.2 Object Detail Page — Tabs](TOR_Workload_WebApp.md) — СВОД tab description
- [§7.3 Equipment Tab](TOR_Workload_WebApp.md) — "Saving any value marks the object summary stale" paragraph

### Required resolution

Add to the СВОД tab description in §7.2:
> _(PoC: stale indicator not shown — summary updates synchronously on save per S-02.)_

Add to §7.3 after the stale indicator sentence:
> _(PoC: saving any value immediately triggers synchronous recalculation — S-02. The СВОД tab shows updated values directly, with no stale indicator.)_

---

## T-05: Fix "Two new app_config keys" Header in §6.13

**Priority:** Medium

### Problem

§6.13 Capacity and Overload Status begins:
> "Two new `app_config` keys:"

The table that follows contains a single row: `ENGINEER_WARNING_THRESHOLD`. The overload boundary (1.0) is mentioned two lines later as "not configurable." This header counts a non-configurable constant as a second "key."

### Why this matters

Developers searching for the second configurable key will scan §6.11 looking for a key they can't find, or assume a key was accidentally omitted from the `app_config` table.

### Affected TOR areas

- [§6.13](TOR_Workload_WebApp.md) — "Two new `app_config` keys" header

### Required resolution

Change "Two new `app_config` keys:" to "One new `app_config` key:" (or remove the header entirely and fold the table into §6.11 where it already appears).

---

## T-06: Clarify §16.6 Branch-Level Overload Attribution

**Priority:** Medium

### Problem

§16.6 defines:
```
engineers_overloaded_branch = COUNT(users)
                               WHERE role = 'engineer'
                               AND home_division_id maps to this branch's division
                               AND engineer_summaries.status = 'overloaded'
```

Engineers are scoped by `home_division_id`, not by branch. Every branch within the same division will produce the same `engineers_overloaded_branch` count — a duplicated division-level metric repeated per branch.

### Why this matters

If a branch report card shows "2 overloaded engineers" for Branch A and "2 overloaded engineers" for Branch B (both in the same division), consumers will double-count when summing across branches. This makes the branch-level stat either misleading or useless. The API response shape in §16.7 doesn't expose branch-level engineer counts, so the issue may be scoped to §16.6 documentation only — but that documentation needs clarification.

### Affected TOR areas

- [§16.6 Overload Summary per Branch and Division](TOR_Workload_WebApp.md)

### Required resolution

Add a clarifying note to §16.6:
> **Note:** Engineer overload is attributed to the engineer's `home_division_id`, not to any specific branch. The `engineers_overloaded_branch` formula returns a division-level count (identical for all branches within the same division). This metric is included for API response parity but is not meaningful at the branch level — use the division-level aggregation endpoint for accurate overload reporting.

---

## T-07: Add "(MVP)" Annotations to AC-03, AC-17, AC-20

**Priority:** Medium

### Problem

Three acceptance criteria in §14 test behaviour that requires MVP milestones not available in PoC:

- **AC-03** requires device catalog editing (S-03, reversed in M-04) and on-demand recalculation with staleness (S-02, reversed in M-06). PoC normatives are read-only seed data; recalculation is synchronous.
- **AC-17** tests that `engineer_summaries.is_stale` is set `TRUE` in the same transaction. The `is_stale` column does not exist in the PoC `engineer_summaries` schema (§15.4 confirms; §15.8 table shows it added in M-06).
- **AC-20** tests that СВОД shows a stale indicator and does not auto-recalculate after a normative update. Both `is_stale` and normative editing are MVP features.

AC-23 in §14 already has the correct pattern: "_(MVP — requires M-10)_".

### Why this matters

Without "(MVP)" labels, QA planning for the PoC sprint may include these criteria. Attempting to verify AC-03, AC-17, or AC-20 against a PoC deployment will fail in confusing ways (missing DB column, no stale indicator) that look like implementation bugs rather than intentional PoC scope decisions.

### Affected TOR areas

- [§14 AC-03](TOR_Workload_WebApp.md)
- [§14 AC-17](TOR_Workload_WebApp.md)
- [§14 AC-20](TOR_Workload_WebApp.md)

### Required resolution

Append scope annotations to the headings:

- **AC-03:** → `### AC-03: Dynamic Normative Editability _(MVP — requires M-04 and M-06)_`
- **AC-17:** → `### AC-17: Assignment Change Marks All Co-Engineers Stale _(MVP — requires M-06)_`
- **AC-20:** → `### AC-20: On-Demand Recalculation Only _(MVP — requires M-04 and M-06)_`
