# TOR v2.18 Gap Resolution Task List

## Priority Summary

| ID   | Priority | Task                                                                            | Why it matters                                                                          |
|------|----------|---------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| T-01 | Critical | Fix version header and footer to read 2.18                                      | Mismatch between changelog version and declared version causes confusion about current state |
| T-02 | High     | Resolve Datadog agent PoC/MVP scope between §18.1 and §15.8                    | Developer building PoC compose gets contradictory instructions from two authoritative sections |
| T-03 | High     | Resolve manual data entry scope contradiction in §15.2 vs §15.3 S-06           | §15.2 implies 2,935-object manual entry (impractical); S-06 says 20–50 for demo           |
| T-04 | Medium ✓ | Add `/engineers/:id/edit` to §15.5 PoC UI routes                               | Missing route for a feature §15.2 claims is fully in scope for PoC                        |
| T-05 | Medium ✓ | Remove duplicate note in §16.6 overload metric                                 | Two near-identical notes create ambiguity about which is authoritative                     |
| T-06 | Medium ✓ | Change §11.1 step 4 "Create" to "Upsert" `object_devices` and specify conflict resolution | Silent UNIQUE violation when same device appears under multiple system types in import payload |

---

## T-01 — Version Fields Out of Sync

**Priority:** Critical

### Problem

Three places declare the document version and they all disagree:

| Location | Current value | Should be |
|----------|--------------|-----------|
| `**Version:**` header (line 5) | `2.17` | `2.18` |
| Most recent changelog entry | `v2.18` (T-01 through T-07) | — (this is correct) |
| Footer (line 4270) | `_End of Technical Specification — Version 2.11_` | `_End of Technical Specification — Version 2.18_` |

### Why this matters

When a developer opens the document, the first thing they read is "Version: 2.17." This contradicts the changelog showing v2.18 changes were applied. The footer ("Version 2.11") is nine minor versions behind. Anyone using version numbers for review tracking, PR descriptions, or migration filenames will reference the wrong version.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — line 5](docs/TOR_Workload_WebApp.md#L5) — `**Version:** 2.17`
- [docs/TOR_Workload_WebApp.md — line 4270](docs/TOR_Workload_WebApp.md#L4270) — `_End of Technical Specification — Version 2.11_`

### Required resolution

1. Change line 5 from `**Version:** 2.17` to `**Version:** 2.18`.
2. Change line 4270 from `_End of Technical Specification — Version 2.11_` to `_End of Technical Specification — Version 2.18_`.

---

## T-02 — Datadog Agent PoC/MVP Scope Contradiction

**Priority:** High

### Problem

§18.1 is titled "PoC Tier (Required for PoC Delivery)" and contains a subsection "Datadog Integration — PoC" with:
- A working `datadog-agent` Docker Compose YAML snippet
- The statement: "For PoC, this provides: log aggregation, JVM metrics (heap, GC, threads), HTTP request metrics, and basic APM tracing"
- Spring Actuator Micrometer configuration for Datadog

§15.8 `docker-compose.poc.yml` contains:
```
# datadog-agent — OMITTED in PoC. Add in MVP. See §20.7.
```

§15.2 references "§18 PoC tier" for observability requirements. A developer reading §15.2 + §18.1 would add Datadog to PoC; a developer reading only §15.8 would not.

### Why this matters

The PoC Docker Compose definition is the authoritative blueprint for what runs in PoC. If the Datadog agent is excluded from the compose file but §18.1 says it's required for PoC delivery, the PoC build will either be wrong (no observability) or the compose file will be wrong (missing a required container). Demo operations depend on this — error alerting requires Datadog.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md §18.1](docs/TOR_Workload_WebApp.md) — "Datadog Integration — PoC" subsection (~line 3479)
- [docs/TOR_Workload_WebApp.md §15.8](docs/TOR_Workload_WebApp.md) — `docker-compose.poc.yml` (~line 3030)

### Required resolution

**Option A (Recommended — Datadog is PoC):** Remove `# datadog-agent — OMITTED in PoC` comment from §15.8. Add the Datadog agent service to `docker-compose.poc.yml` as a 5th container. Update §15.8 header note from "4 containers" to "5 containers" (or "4 + optional Datadog agent"). Change §15.2 observability note to explicitly say "Datadog agent (§18.1)".

**Option B — Datadog is MVP:** Move the "Datadog Integration" subsection from §18.1 "PoC Tier" to §18.2 "MVP Tier". Update §15.2 observability requirement to read "Structured logging, health endpoint" (drop "job failure alerting (§18 PoC tier)" or re-qualify it as email-only). The §15.8 compose comment is already correct under this option.

The choice depends on whether Datadog access is available for PoC. Option B matches the compose file. Option A matches §18.1.

---

## T-03 — Manual Data Entry Scope Contradiction

**Priority:** High

### Problem

§15.2 "Core (non-negotiable for PoC)" table:
> "Manual data entry — Create objects, enter equipment, repairs, records, travel via UI. **All 2,935 objects** from source file entered manually (import is MVP)."

§15.3 S-06:
> "PoC: all data entered manually through the UI. **For demo purposes, a representative subset of objects (~20–50 from different divisions) is entered, not all 2,935.** Full import is the first MVP milestone."

### Why this matters

If a developer reads only §15.2, they will attempt to manually enter 2,935 objects, which is not viable for a demo. If they read only S-06, they enter 20–50 objects. The contradiction leaves the scope of the PoC demo dataset undefined. This affects demo preparation planning and PAC criteria that verify specific object counts.

Note: C-35 ("Import Is the Highest-Priority MVP Item") and the S-06 rationale ("2,935 rows of manual entry is not viable for production") both support S-06 as the correct intent.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md §15.2](docs/TOR_Workload_WebApp.md) — "Manual data entry" row (~line 2757)
- [docs/TOR_Workload_WebApp.md §15.3 S-06](docs/TOR_Workload_WebApp.md) — (~line 2817)

### Required resolution

Update §15.2 "Manual data entry" notes cell to read:
> "Create objects, enter equipment, repairs, records, travel via UI. For demo purposes, a representative subset of objects (~20–50 from different divisions) is entered manually — not all 2,935. Full import is MVP (see S-06)."

This aligns §15.2 with the pragmatic intent stated in S-06 and C-35.

---

## T-04 — Missing `/engineers/:id/edit` in PoC UI Routes ✓ RESOLVED (v2.19)

**Priority:** Medium

### Problem

§15.2 claims "Engineer module — Engineers as users, object-engineer assignments, workload split, capacity, load ratio, overload status, engineer dashboard. Full §4.10–4.11, §6.12–6.14, §7.4–7.7."

§4.10 includes:
- "Create / edit / deactivate engineer accounts"
- "Set or update `capacity_fte` at any time"

§7.1 defines `/engineers/:id/edit` as "Engineer Edit — Edit name, capacity, home division."

§15.5 PoC UI routes lists:
- `/engineers` — Engineer list
- `/engineers/:id` — Engineer detail

It does not list `/engineers/:id/edit`.

### Why this matters

With S-04 (all authenticated users can read/write in PoC), any user can edit engineer data. The engineer module is supposed to be "full" in PoC. Without a dedicated edit route, there is no UI path to update `capacity_fte` or `home_division_id`, which are required for the load ratio and overload calculations to be testable (PAC-02, PAC-07 require setting capacity and verifying load ratio).

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md §15.5](docs/TOR_Workload_WebApp.md) — PoC UI routes table (~line 2940)
- [docs/TOR_Workload_WebApp.md §7.1](docs/TOR_Workload_WebApp.md) — Full routes table (~line 1410)

### Required resolution

Add a row to the §15.5 PoC UI routes table:

| `/engineers/:id/edit` | Engineer Edit — Edit name, capacity_fte, home division |

---

## T-05 — Duplicate Notes in §16.6 ✓ RESOLVED (v2.20)

**Priority:** Medium

### Problem

§16.6 currently contains two notes about `engineers_overloaded_branch` being a division-level metric:

**Note 1 (original, shorter):**
> "Note: overload is attributed to the engineer's `home_division_id`, not to where their objects are located. An engineer may service objects in multiple divisions — their overload status is reported under their home division."

**Note 2 (added in T-06/v2.18, longer):**
> "**Note:** Engineer overload is attributed to the engineer's `home_division_id`, not to any specific branch. The `engineers_overloaded_branch` formula returns a division-level count (identical for all branches within the same division). This metric is included for API response parity but is not meaningful at the branch level — use the division-level aggregation endpoint for accurate overload reporting."

Note 2 is a superset of Note 1. Both appear consecutively.

### Why this matters

Two notes saying the same thing create ambiguity about which is authoritative. The longer note (Note 2) is more complete and actionable. The shorter note should be removed to avoid confusion.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md §16.6](docs/TOR_Workload_WebApp.md) — (~line 3240)

### Required resolution

Remove the first (shorter) note. Retain the second note starting with "**Note:** Engineer overload is attributed to the engineer's `home_division_id`…" which is more complete.

---

## T-06 — Import Step 4: "Create" Should Be "Upsert" for `object_devices` ✓ RESOLVED (v2.21)

**Priority:** Medium

### Problem

§11.1 processing step 4:
> "- Create `object_devices` with `quantity_physical = quantity`."

The import `equipment` array allows the same device to appear multiple times with different `system_type` values, e.g.:
```json
"equipment": [
  { "device": "Galaxy 512 контроллер", "system_type": "OS", "quantity": 1 },
  { "device": "Galaxy 512 контроллер", "system_type": "PS", "quantity": 1 }
]
```

Both entries refer to the same device. Step 4 processes each entry sequentially. The first entry would INSERT an `object_devices` row. The second entry would attempt another INSERT for the same `(object_id, device_type_id)` pair, violating the `UNIQUE(object_id, device_type_id)` constraint (§5.2).

Steps 1–2 explicitly say "Upsert `device_types`…" and "Upsert `repair_types`…" for catalog entities. Only step 4 says "Create."

Additionally, when the same device appears in multiple equipment entries with different quantities (e.g., OS qty=1, PS qty=2), the `quantity_physical` to store is ambiguous. The TOR states (§4.3): "`quantity_physical` is stored once per (object, device_type) pair" and a device can have different `quantity_maintained` values per system. The import format does not provide a separate `quantity_physical` field.

### Why this matters

Without an explicit upsert rule, the import of any object that has a device assigned to multiple systems will fail with a database constraint violation. This is a fundamental issue for the import of real data — many objects have devices like "Galaxy 512" serving both ОС and ПС.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md §11.1](docs/TOR_Workload_WebApp.md) — Processing steps, step 4 (~line 2321)
- [docs/TOR_Workload_WebApp.md §4.3](docs/TOR_Workload_WebApp.md) — Physical inventory rules (~line 243)

### Required resolution

Change step 4 to explicitly handle `object_devices` as an upsert:

> "- **Upsert** `object_devices`: if no row exists for `(object_id, device_type_id)`, INSERT with `quantity_physical = quantity`. If a row already exists (device appears in multiple equipment entries), **skip** — retain the existing `quantity_physical` value. The import treats the first occurrence's quantity as the physical quantity. `quantity_maintained` is always set per-entry per-system."

Add a note: "After import, editors should review `quantity_physical` for devices assigned to multiple systems, as the physical quantity is taken from the first equipment entry for that device."

This matches the post-import behaviour described in §4.3 and §11.1: "After import, `quantity_physical = quantity_maintained` for all records. Editors adjust `quantity_physical` manually if needed."
