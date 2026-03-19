# TOR v2.17 Gap Resolution Task List

**Updated:** 2026-03-19

## Priority Summary

| ID | Priority | Task | Why it matters |
|----|----------|------|----------------|
| ~~G-03~~ | ~~High~~ | ~~Fix §5.2 `app_config` comment: correct cross-reference from `§6.12` → `§6.11` and add `(MVP)` annotation with PoC note~~ | **DONE** |
| ~~G-06~~ | ~~Medium~~ | ~~Add PoC/MVP split to §6 Calculation Engine preamble (line 843)~~ | **DONE** |
| ~~G-07~~ | ~~Medium~~ | ~~Annotate 5 MVP-only elements in §6.10 (preamble + 3 table rows + closing paragraph)~~ | **DONE** |

---

## T-01: Fix §5.2 `app_config` table comment ✅ DONE

**Priority:** High

### Problem

§5.2 `app_config` table comment (line 609):

> *"All named calculation constants (see §6.12). Changes to any key trigger bulk summary invalidation."*

**Two issues:**

1. **Wrong cross-reference:** `§6.12` is "Engineer Workload Calculation". The configuration constants table is in `§6.11` "Application Configuration Constants". A developer following this reference will land in the wrong section.

2. **Missing MVP annotation:** The `app_config` table does not exist in PoC (S-03 — static normatives; no admin catalog). In PoC, constants are bound at startup as Docker environment variables. The invalidation rule "Changes to any key trigger bulk summary invalidation" cannot fire in PoC because the table and the admin UI that edits it do not exist. The adjacent `§6.10` row for `app_config UPDATE` is correctly annotated `(MVP)`, making the table comment's omission inconsistent.

### Why this matters

A developer reading §5.2 to understand the `app_config` table:
- Is misdirected to §6.12 (engineer workload) when they want §6.11 (config constants).
- May infer the table exists in PoC and attempt to create it and wire up invalidation — work that is explicitly deferred to M-10 (§6.11.1, §15.7).

### Affected TOR areas

- [§5.2 `app_config` table](../TOR_Workload_WebApp.md) — line 609
- S-03 (static normatives; no admin catalog in PoC)
- §6.11 (Application Configuration Constants — the correct cross-reference target)
- §6.11.1 (correctly scoped to MVP — requires M-10)
- §6.10 row `app_config UPDATE (any calculation key) (MVP)` — correctly annotated there

### Required resolution

Replace line 609:

**Before:**
> *"All named calculation constants (see §6.12). Changes to any key trigger bulk summary invalidation."*

**After:**
> *"All named calculation constants (see §6.11). **MVP (M-10):** This table is created in M-10 when admin-editable configuration is introduced; changes to any key trigger bulk summary invalidation (§6.10). **PoC (S-03):** This table is not created — constants are bound at startup as Docker environment variables via `@ConfigurationProperties(prefix=\"workload.config\")`; the admin config UI is introduced in M-10."*

---

## T-02: Add PoC/MVP split to §6 Calculation Engine preamble ✅ DONE

**Priority:** Medium

### Problem

§6 opening paragraph (line 843):

> *"All calculations are performed **server-side only**. The `summaries` table is a precomputed cache. When source data changes, the affected summary is marked `is_stale = 'TRUE'` synchronously; a background job recalculates it asynchronously."*

This is the first sentence a developer reads when approaching the entire Calculation Engine section. It describes MVP-only behaviour (`is_stale`, background job) as universal, with no PoC qualifier.

In PoC (S-02), there is no `is_stale` column and no background job — calculation is synchronous in the same request thread on every save.

### Why this matters

A developer starting from §6 to implement the PoC calculation engine gets the wrong mental model immediately. They may add `is_stale` staleness-setting logic to every save endpoint (column doesn't exist in PoC schema) or look for a background job scaffolding that is not part of the PoC.

### Affected TOR areas

- [§6 Calculation Engine preamble](../TOR_Workload_WebApp.md) — line 843
- S-02 (PoC: synchronous recalculation on save)
- AD-10 (on-demand recalculation is MVP-only)

### Required resolution

Replace the second and third sentences of the §6 preamble:

**Before:**
> *"When source data changes, the affected summary is marked `is_stale = 'TRUE'` synchronously; a background job recalculates it asynchronously."*

**After:**
> ***PoC (S-02):** When source data changes, the affected summary is recalculated synchronously in the same request thread before the response is returned. No background job, no `is_stale` column.*
>
> ***MVP (AD-10):** When source data changes, the affected summary is marked `is_stale = 'TRUE'` synchronously in the same transaction. A background worker recalculates stale summaries asynchronously when triggered by admin via `POST /svod/recalculate`.*

---

## T-03: Annotate 5 MVP-only elements in §6.10 Cache Invalidation Rules ✅ DONE

**Priority:** Medium

### Problem

§6.10 has one correctly annotated MVP row (`app_config UPDATE (any calculation key) (MVP)`) but five adjacent elements with the same pattern that are missing `(MVP)` annotations:

**Gap (a) — §6.10 preamble (line 1193):**
> *"Summaries are marked stale automatically on data change, but **recalculation is triggered on-demand by admins only** — not automatically. The background worker runs only when explicitly triggered via `POST /svod/recalculate` (see §10). This simplifies operations and gives admins control over when calculations are refreshed (e.g. after a bulk data entry session)."*

This entire preamble describes MVP-only behaviour. In PoC, recalculation is synchronous on every data-changing request (S-02) — there is no admin trigger, no background worker, no on-demand model. No PoC scope note.

**Gap (b) — `periods.is_active` row (line 1205):**
```
| periods.is_active changed (period switch) | Mark ALL summaries.is_stale = 'TRUE' |
```
The `periods` table is MVP-only (S-05, added in M-07). This row is implicitly MVP-only but lacks the `(MVP)` marker that `app_config UPDATE` carries one row above.

**Gap (c) — `objects DELETE` row (line 1206):**
The action column reads: *"Before cascade: read all engineers assigned to the object from `object_engineers`. Cascade-delete all child rows. Mark those engineers' `engineer_summaries.is_stale = 'TRUE'` — all in the same transaction."*

The CASCADE is PoC behaviour; the stale-marking of `engineer_summaries.is_stale` is MVP-only (no `is_stale` column in PoC, added in M-06). The action is not split into PoC/MVP parts.

**Gap (d) — `Any summaries.is_stale` row (line 1207):**
```
| Any summaries.is_stale set to 'TRUE' | Mark all engineers assigned to that object: engineer_summaries.is_stale = 'TRUE' |
```
This entire row is MVP-only (no `is_stale` in PoC schema). No annotation.

**Gap (e) — Recalculation trigger paragraph (line 1210):**
> *"**Recalculation trigger:** Admin clicks "Пересчитать" in the UI or calls `POST /svod/recalculate`. The background worker then processes all stale summaries in dependency order: object summaries first, then engineer summaries."*

Describes MVP-only behaviour. No PoC scope note.

### Why this matters

The pattern inconsistency is the key risk: a developer sees `app_config UPDATE (MVP)` and applies its MVP annotation correctly, but scans the rows directly above and below — which have identical MVP-only semantics — and misses them because they lack the same annotation.

Gap (c) (`objects DELETE`) is the most dangerous: a PoC developer could attempt to add `engineer_summaries.is_stale = 'TRUE'` on object deletion — but `is_stale` doesn't exist in the PoC schema, causing a runtime column-not-found error.

### Affected TOR areas

- [§6.10 Cache Invalidation Rules](../TOR_Workload_WebApp.md) — lines 1193–1210
- S-02 (no staleness tracking in PoC; synchronous recalculation)
- S-05 (`periods` table is MVP-only / M-07)
- AD-10 (on-demand recalculation is MVP-only)

### Required resolution

**(a)** Prepend a PoC/MVP split to the §6.10 preamble:

> **MVP (AD-10):** Summaries are marked stale automatically on data change; recalculation is triggered on-demand by admins via `POST /svod/recalculate`. The background worker processes stale summaries only when explicitly triggered.
> **PoC (S-02):** No staleness tracking. All summaries are recalculated synchronously on every data-changing request. The table below lists triggering events; stale-marking actions apply to MVP only unless stated otherwise.

**(b)** Add `(MVP)` to the `periods.is_active` row:
```
| periods.is_active changed (period switch) (MVP) | Mark ALL summaries.is_stale = 'TRUE' |
```

**(c)** Split the `objects DELETE` action clause:
> **PoC:** Before cascade: read all engineers assigned to the object from `object_engineers`. Cascade-delete all child rows (`object_engineers`, `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`) — all in the same transaction. Immediately recalculate engineer summaries synchronously for all affected engineers (S-02).
> **MVP:** Same cascade, then mark those engineers' `engineer_summaries.is_stale = 'TRUE'` in the same transaction.

**(d)** Add `(MVP)` to the `Any summaries.is_stale` row:
```
| Any summaries.is_stale set to 'TRUE' (MVP) | Mark all engineers assigned to that object: engineer_summaries.is_stale = 'TRUE' |
```

**(e)** Replace the closing recalculation trigger paragraph:
> **Recalculation trigger (MVP):** Admin clicks "Пересчитать" or calls `POST /svod/recalculate`. The background worker processes all stale summaries in dependency order: object summaries first, then engineer summaries.
> **PoC:** No admin trigger. All summaries are recalculated synchronously on every data-changing request (S-02).
