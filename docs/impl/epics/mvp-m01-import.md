# Epic: MVP M-01 — JSON Bulk Import

**Milestone:** M-01 (from TOR §15.7)
**Phase:** MVP (highest-priority MVP item)
**What it delivers:** §11.1 two-step stateless JSON import flow, bulk object import (2,934 rows from converted XLSX), FR-01 import path (Division → Branch → Object dedup), engineer name resolution with placeholder account creation, bulk recalculation trigger post-import. Resolves S-06.

> **Priority note (TOR §15.7):** M-01 is the highest-priority MVP item. Manual entry of 2,934 objects is not viable for production use.

> **Priority revised (2026-08-14).** The rationale above — that manual entry of 2 934 objects blocks adoption — no longer holds: the full dataset is loaded by the `demo-data` seed changesets (`v1.0.6`, `v1.0.9`), so the system is usable and demonstrable with real data today. M-01 is still required, because Liquibase changesets are not a production import path and users need a repeatable way to load new periods, but it is no longer the precondition for everything else. This matches the workstream C plan ordering, which places import at `ws-c-09` / `ws-c-10` rather than first. Sequence M-01 on its own merits alongside the other MVP milestones.

## Functional Requirements Covered

- **FR-01 — Object Management (§4.1) — import path:** Bulk creation of divisions, branches, and objects from structured JSON. Division/branch deduplication by name. All hierarchy rules enforced during import.
- **FR-02 — Device Catalog (§4.2) — import path:** Upsert of device types and device-system contexts from the import payload's `device_types` and `device_system_contexts` arrays.
- **FR-03 — Object Equipment Inventory (§4.3) — import path:** Create `object_devices` and `object_system_assignments` rows. Key upsert rule: if a device appears in multiple equipment entries for the same object (different `system_type`), the first occurrence's quantity is used as `quantity_physical`; subsequent entries for the same device **skip** the `object_devices` row (prevents UNIQUE(object_id, device_type_id) violation).
- **FR-05 — Repair Type Catalog (§4.5) — import path:** Upsert of repair types. Populate `object_repairs` per object — only non-zero count entries create rows.
- **FR-06 — Travel Data (§4.6) — import path:** Populate `travel` per object.

## Acceptance Criteria In Scope

**AC-01:** Import of the reference dataset (converted from `Шаблон_нагрузки_з_v_4_00.xlsx` to JSON) produces exactly 2,934 object records. All non-zero equipment values are represented as `object_system_assignments` rows with corresponding `object_devices` rows.

> **Count:** the `ОС` table spans `A1:S2935` — one header row plus **2 934** data rows, with `№` running 1…2934 without gaps. Earlier revisions of this document said 2,935, counting the header. The seed changesets `v1.0.6` / `v1.0.9` produce 2 934 objects.

**AC-21:** Import of the reference dataset must: (a) match engineer names to existing `users.name` records, (b) create placeholder accounts for unresolved names, (c) return a report listing matched engineers, created placeholders, and objects with no engineer name in the source. No object must be left without an `object_engineers` row after import (all get either a matched or placeholder account).

## Database Tables Required

From docs/impl/db-schema.md:

All PoC tables are prerequisites (already created in PoC baseline). Import writes to:

- `divisions` — upsert by name
- `branches` — upsert by (division_id, name)
- `objects` — create with `import_seq_no` from source `number` field
- `device_types` — upsert by name
- `device_system_contexts` — upsert by (device_type_id, system_type)
- `repair_types` — upsert by name
- `object_devices` — upsert; first occurrence sets `quantity_physical`, duplicates skipped
- `object_system_assignments` — create per (object, device, system_type) with `quantity_maintained`
- `records_tasks` — populate per object (period-scoped in MVP: requires active period)
- `object_repairs` — populate per object, non-zero counts only (period-scoped in MVP)
- `travel` — populate per object
- `users` — create placeholder accounts for unresolved engineer names (`requires_activation = TRUE`, `is_active = TRUE`, `role = 'engineer'`)
- `object_engineers` — create assignment rows linking objects to matched/placeholder engineer accounts

> **Period scope note:** In MVP (this milestone), `records_tasks` and `object_repairs` use `period_id = active_period.id`. If no period is active, `POST /import/data/confirm` returns HTTP 422. This requires MVP M-07 (planning periods) to have been deployed first, or periods must be created and activated before running import. Alternatively, import can proceed if M-07 is deployed simultaneously.

## API Endpoints Required

From docs/impl/api-spec.md (§11.1 Import Endpoints):

- `POST /import/data` — dry-run (no writes). Validates entire payload, returns preview report:
  - `objectsValid` — count of object entries that would be created/updated
  - `warnings` — non-fatal issues (unresolved engineer names → placeholder accounts, unknown device types)
  - `skipped` — entries rejected due to fatal validation errors with per-entry reasons
  - `estimatedPlaceholders` — count of placeholder engineer accounts that would be created
- `POST /import/data/confirm` — execute (all writes). Client re-submits identical payload. Server re-validates and executes all processing steps atomically. No server-side session links the two calls.

> **Stateless design:** If the payload sent to `/confirm` differs from `/data`, the confirm call re-validates from scratch. There is no stale-check between calls.

### Engineer name resolution endpoints (existing, used post-import):

- `PUT /admin/users/:id/activate` — activate placeholder accounts created by import (admin sets password). Introduced in M-02.

## Import Payload Structure (§11.1)

```jsonc
{
  "deviceTypes": [{ "name": "...", "description": "..." }],
  "deviceSystemContexts": [
    { "deviceTypeName": "...", "systemType": "OS"|"PS"|"Video", "r1Minutes": 0, "r2Minutes": 0 }
  ],
  "repairTypes": [{ "name": "...", "timeMinutes": 0 }],
  "objects": [
    {
      "number": 1,
      "division": "...",
      "branch": "...",
      "name": "...",
      "engineerName": "Александр Н Соловей",
      "equipment": [
        { "device": "<deviceTypeName>", "systemType": "OS", "quantity": 5 }
      ],
      "records": { "access": 0, "monitoring": 0, "footage": 0, "backup": 0, "admin": 0 },
      "repairs": { "<repairTypeName>": 2 },
      "travel": { "oneWayTimeMin": 10 }
    }
  ]
}
```

### Processing steps (§11.1):

1. Upsert `device_types` and `device_system_contexts`
2. Upsert `repair_types`
3. For each object entry: create Division → Branch → Object (dedup by name)
4. For each non-zero equipment entry: resolve device type by name (create if not found, with warning); resolve context for (device, system_type); upsert `object_devices` — **first occurrence sets `quantity_physical`; subsequent entries for the same device skip the `object_devices` row**; create `object_system_assignments` with `quantity_maintained = quantity`
5. Populate `records_tasks` per object using `period_id = active_period.id`. HTTP 422 if no active period.
6. Populate `object_repairs` per object — only non-zero count entries create rows
7. Populate `travel` per object
8. Engineer name resolution: match to existing `users.name`; create placeholder accounts for unmatched names; create `object_engineers` rows
9. Return validation report
10. Mark all imported object summaries stale. MVP: admin triggers recalculation via `POST /svod/recalculate`.

## UI Screens Required

From docs/impl/ui-spec.md:

- `/import` — JSON / text-list import wizard (MVP only — S-06 reversed). Shows dry-run preview report before confirming execution.

## PoC Simplifications Active in This Milestone

None — this milestone **reverses S-06** (JSON bulk import is manual in PoC; this MVP milestone adds the import UI and API).

Other simplifications still in force at this milestone (not yet reversed):
- **S-02:** Synchronous recalculation still applies unless M-06 has been deployed. Post-import: immediately run synchronous bulk recalculation inline (PoC path). If M-06 is deployed first, summaries are marked stale and admin triggers `POST /svod/recalculate`.
- **S-04:** RBAC is not enforced until M-02. If M-02 is deployed, import is admin-only per §12 permissions table.
- **S-05:** Period-scoped import requires M-07. If M-07 is not deployed, import fails if no active period exists.

## Out of Scope for This Milestone

- Period management UI (`/admin/periods`) — MVP M-07 (must be deployed before or alongside this milestone)
- RBAC enforcement on import endpoint — MVP M-02 (admin-only restriction)
- Background recalculation worker — MVP M-06 (post-import recalculation is synchronous until M-06)
- Placeholder account activation UI — MVP M-02 (`/admin/users` screen)
- Source XLSX-to-JSON conversion — this is an external pre-processing step outside the application (Apache POI in the application handles only XLSX export, not XLSX import parsing)
