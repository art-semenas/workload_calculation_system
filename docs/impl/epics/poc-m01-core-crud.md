# Epic: PoC M-01 — Core CRUD

**Milestone:** M-01 (from TOR §15.7 — this is the PoC baseline, not the MVP M-01 import milestone)
**Phase:** PoC
**What it delivers:** FR-01 Object Management (Division → Branch → Object hierarchy CRUD), FR-02 Device Catalog (seed-only, read-only in PoC), FR-03 Equipment Inventory (two-layer: physical + system assignments), FR-05 Repair Type Catalog and object repair data entry, FR-06 Travel data entry — all manual data entry flows via UI.

> **Note on milestone numbering:** TOR §15.7 migration table lists M-01 as "JSON bulk import (MVP)". This epic covers the PoC baseline build — the complete manual-entry CRUD foundation that precedes all milestones. It is referred to as "PoC M-01 Core CRUD" to distinguish it from MVP M-01 (import).

## Functional Requirements Covered

- **FR-01 — Object Management (§4.1):** CRUD operations for objects. Each object has `division`, `branch`, `name/address`. Objects are organized in a two-level hierarchy: Division → Branch → Objects. Divisions and branches created manually via UI (any authenticated user in PoC per S-04). Hard delete with cascade for PoC.
- **FR-02 — Device Catalog Management (§4.2):** Admin-managed registry of device types and device-system contexts (R1/R2 normatives). In PoC, catalog is read-only seed data — no management UI (S-03). Seed data loaded as Liquibase changeset.
- **FR-03 — Object Equipment Inventory (§4.3):** Two-layer equipment model: Layer 1 = physical inventory (`object_devices`), Layer 2 = system assignments (`object_system_assignments`). A device must be added to physical inventory before it can be assigned to a system. `quantity_maintained` drives all workload calculations; `quantity_physical` is the hardware asset count.
- **FR-05 — Repair Type Catalog & Object Repairs (§4.5):** Repair types are seed-only in PoC (no management UI). One `object_repairs` row per (object, repair_type) — no period FK (S-05). Count of repair operations per object entered via UI.
- **FR-06 — Travel Data (§4.6):** Per object: transport type, distance km, one-way travel time. Round-trip time is auto-calculated as `one_way_time × 2` — never user-editable.

## Acceptance Criteria In Scope

**AC-05:** UI "Assign to system" dropdown shows only system types with a valid `device_system_contexts` row for the device. API rejects `POST /objects/:id/assignments` where (device_type_id, system_type) has no context row — returns HTTP 422 with code `NO_CONTEXT_FOR_SYSTEM`.

**AC-06:** `DELETE /catalog/devices/:id/contexts/:cid` returns HTTP 409 listing affected objects when any `object_system_assignments` references that context. Database FK `ON DELETE RESTRICT` also prevents bypass via direct SQL.

**AC-07:** API ignores or rejects attempts to set `round_trip_min`, `is_stale`, or any `summaries` field directly. Returns HTTP 422 if attempted.

**AC-11:** Attempting to `POST /objects/:id/assignments` for a device_type_id that has no corresponding `object_devices` row at that object returns HTTP 422 with code `DEVICE_NOT_IN_INVENTORY`.

**AC-12:** An object with one Galaxy 512 (контроллер АСПС и СО) assigned to both `OS` and `PS` with `quantity_maintained = 1` each produces correct per-system contributions in `summaries` with physical inventory showing 1 unit.

**AC-13:** In the Equipment tab, for a device that has `device_system_contexts` only for `OS`: "Assign to system" dropdown shows only "OS" — PS and Video are absent (not hidden/disabled). Attempting `POST /objects/:id/assignments` with `system_type: "PS"` returns HTTP 422 `NO_CONTEXT_FOR_SYSTEM`.

**AC-24:** Creating an object via `POST /objects` with valid `branch_id`, `name`, and `address` returns HTTP 201 and the object appears in `GET /objects` filtered by the parent division. Updating the object name via `PUT /objects/:id` persists the change. `DELETE /objects/:id` removes the object and all child rows (devices, assignments, records, repairs, travel, summaries) — `GET /objects/:id` returns HTTP 404 after deletion.

**AC-25:** `POST /objects` with an invalid `branch_id` (non-existent or belonging to a different division) returns HTTP 422. Every object belongs to exactly one branch, and every branch belongs to exactly one division. `GET /objects?division_id=X` returns only objects whose branch belongs to division X.

**AC-27:** `PUT /objects/:id/travel` with `transport_type`, `distance_km`, and `one_way_minutes` persists all three fields. `GET /objects/:id/travel` returns the saved values plus `round_trip_min = one_way_minutes × 2` (auto-calculated, never user-editable). Attempting to set `round_trip_min` directly via the API is ignored or returns HTTP 422.

## Database Tables Required

From docs/impl/db-schema.md:

- `divisions` — org hierarchy root
- `branches` — org hierarchy mid-level, FK → divisions
- `objects` — facility records, FK → branches
- `device_types` — device catalog (seed data, read-only in PoC)
- `device_system_contexts` — R1/R2 normatives per (device, system_type) (seed data, read-only in PoC)
- `object_devices` — physical inventory layer, UNIQUE(object_id, device_type_id)
- `object_system_assignments` — maintenance assignment layer, UNIQUE(object_id, device_type_id, system_type)
- `repair_types` — repair catalog (seed data, read-only in PoC)
- `object_repairs` — repair counts per (object, repair_type), UNIQUE(object_id, repair_type_id), no period_id in PoC (S-05)
- `records_tasks` — records task quantities per object, UNIQUE(object_id), no period_id in PoC (S-05)
- `travel` — travel data per object, UNIQUE(object_id)
- `users` — PoC subset: id, email, name, password_hash, role, division_id, home_division_id, capacity_fte, employee_id, is_active, requires_activation, created_at, updated_at (no failed_login_count, no locked_until in PoC)

## API Endpoints Required

From docs/impl/api-spec.md:

- `GET /divisions`
- `POST /divisions`
- `GET /divisions/:id`
- `PUT /divisions/:id`
- `GET /divisions/:id/branches`
- `POST /divisions/:id/branches`
- `GET /branches/:id`
- `PUT /branches/:id`
- `GET /objects`
- `POST /objects`
- `GET /objects/:id`
- `PUT /objects/:id`
- `DELETE /objects/:id`
- `GET /objects/:id/devices`
- `POST /objects/:id/devices`
- `PUT /objects/:id/devices/:dtid`
- `DELETE /objects/:id/devices/:dtid`
- `GET /objects/:id/assignments`
- `POST /objects/:id/assignments`
- `PUT /objects/:id/assignments/:aid`
- `DELETE /objects/:id/assignments/:aid`
- `GET /objects/:id/records`
- `PUT /objects/:id/records`
- `GET /objects/:id/repairs`
- `PUT /objects/:id/repairs/:rtid`
- `GET /objects/:id/travel`
- `PUT /objects/:id/travel`
- `GET /catalog/devices`
- `GET /catalog/devices/:id`
- `GET /catalog/devices/:id/contexts`
- `GET /catalog/repairs`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /actuator/health`

> **PoC note on catalog write endpoints:** `POST /catalog/devices`, `PUT /catalog/devices/:id`, `POST /catalog/devices/:id/contexts`, `PUT /catalog/devices/:id/contexts/:cid`, `DELETE /catalog/devices/:id`, `DELETE /catalog/devices/:id/contexts/:cid`, `POST /catalog/repairs`, `PUT /catalog/repairs/:id`, `DELETE /catalog/repairs/:id` — these endpoints exist in the codebase (Phase: PoC + MVP per api-spec.md) but are not exposed via UI in PoC (S-03). They may be callable by any authenticated user in PoC but there is no management UI page for them. Catalog is managed via seed data only.

## UI Screens Required

From docs/impl/ui-spec.md (PoC routes from §15.5):

- `/login` — Login page
- `/` — Dashboard (required FTE by division, top 10 objects, coverage gaps) — partial: depends on M-02 for calculation results
- `/objects` — Object list — searchable, filterable, shows ИТОГО Числ
- `/objects/new` — Create object
- `/objects/:id` — Object detail — 6 tabs: Оборудование, Записи, Ремонт, Дорога, Инженеры, СВОД
- `/divisions` — Division list — name, branch count, object count; create button
- `/divisions/:id` — Division detail — СВОД + branch list; create branch button
- `/branches/:id` — Branch detail — object list with СВОД; create object button

> **Catalog pages in PoC:** `/catalog/devices` and `/catalog/repairs` are view-only (read-only seed data). No create/edit/delete UI (S-03).

## PoC Simplifications Active in This Milestone

- **S-02:** Synchronous recalculation on save — no staleness tracking. Calculation triggered inline; no `is_stale` column, no background worker, no admin trigger.
- **S-03:** Static normatives — no admin UI for catalog. Device types, contexts, and repair types are seed data only. No UI to add, edit, or delete.
- **S-04:** No division scoping — roles exist on `users.role` but no access control is enforced. All authenticated users can read and write all data. Note: `is_active` filtering for engineer dropdowns IS implemented (not an RBAC feature — see AD-18/C-24).
- **S-05:** No planning periods — one `object_repairs` row per (object, repair_type), one `records_tasks` row per object. No `period_id` FK.
- **S-06:** No bulk import — all data entered manually through the UI.
- **S-07:** No audit log.
- **S-08:** No PDF export.
- **S-09:** No concurrency/locking — last-write-wins.
- **S-10:** No object inventory XLSX export (`GET /objects/:id/export/xlsx` not implemented).

## Out of Scope for This Milestone

- Calculation engine and `summaries` writes (M-02 — PoC calculation epic)
- `GET /objects/:id/summary` results meaningful only after M-02
- Engineer module: `object_engineers`, `engineer_summaries` tables (M-03 — PoC engineer epic)
- Auth/RBAC enforcement — roles are stored but not enforced (MVP M-04)
- Planning periods — `periods` table, `period_id` FKs (MVP M-07)
- Background worker and staleness tracking — `is_stale` columns (MVP M-06)
- JWT refresh tokens (MVP M-04)
- `DELETE /divisions/:id` and `DELETE /branches/:id` — not available in PoC (S-04)
- `GET /objects/:id/export/xlsx` — not available in PoC (S-10)
- Catalog management UI (MVP M-04 for devices, MVP M-05 for repairs)
- `app_config` table — config constants are Docker env vars in PoC (S-03)
- Audit log (MVP M-08)
- Concurrency / optimistic locking (MVP M-09)
