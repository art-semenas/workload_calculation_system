# Epic: MVP M-04/M-05 — Catalog Management UI + Engineer Full Module

**Milestone:** M-04 (Device Catalog Management UI) + M-05 (Repair Type Catalog Management UI)
**Phase:** MVP
**What it delivers:** FR-10 engineer management (full admin operations), FR-11 object-engineer assignments (full RBAC-enforced), §6.12–§6.14 engineer load formulas, `engineer_summaries` full PoC columns, admin-editable device catalog UI (M-04), admin-editable repair type catalog UI (M-05). Resolves S-03 (partially — devices in M-04, repairs in M-05). Depends on M-02.

> **File naming note:** This file covers milestones M-04 and M-05 together because both require M-02 (RBAC) as a prerequisite and both deliver admin catalog management. The engineer module (FR-10, FR-11) is fully operational in PoC but gains RBAC enforcement from M-02 onward; engineer load formulas (`engineer_summaries`) are PoC-complete. This epic documents what is added on top of the PoC engineer baseline.

## Functional Requirements Covered

- **FR-10 — Engineer Management (§4.10):** Admin creates/edits/deactivates engineer accounts. Set/update `capacityFte` (marks engineer summary stale in MVP — synchronous in PoC). View all engineers with load ratio and status. `is_active` filtering: inactive engineers are hidden from assignment dropdowns (implemented in PoC per AD-18/C-24, enforced by RBAC from M-02).
- **FR-11 — Object-Engineer Assignments (§4.11):** RBAC-enforced assignments: admin unrestricted; editor assigns any active engineer to objects in own division; engineer is read-only. Workload split: `itogo_chislo_with_travel / COUNT(assigned engineers)` — computed dynamically, not stored. Coverage gap detection: objects with zero assigned engineers flagged in dashboard and division detail.
- **FR-02 — Device Catalog Management (§4.2) — admin UI (M-04):** Admin creates device types and device-system contexts via UI. Edit R1/R2 normatives. Delete contexts (blocked if active assignments exist). Admin creates new device type, adds system context, assigns to object → СВОД recalculates correctly without code deployment.
- **FR-05 — Repair Type Catalog (§4.5) — admin UI (M-05):** Admin creates, edits, and deletes repair types via UI. Delete blocked if any `object_repairs` row references the type with `count > 0`.

## Acceptance Criteria In Scope

**AC-03:** After an admin updates `r1Minutes` or `r2Minutes` on any `device_system_contexts` row, all affected object summaries are marked stale. UI shows "Данные устарели — нажмите Пересчитать" indicator. Values update only after admin explicitly triggers `POST /svod/recalculate`. _(Requires M-04 and M-06.)_

**AC-04:** Admin creates a device type, adds a system context (R1/R2), assigns it to an object, sets `quantityMaintained`. СВОД recalculates correctly. No code deployment required.

**AC-05:** UI "Assign to system" dropdown shows only system types with a valid `device_system_contexts` row. API rejects invalid assignments with HTTP 422 and message "Device context not found for this system type".

**AC-06:** `DELETE /catalog/devices/:id/contexts/:cid` returns HTTP 409 listing affected objects when any `object_system_assignments` references that context. Database FK `ON DELETE RESTRICT` prevents bypass.

**AC-14:** For any engineer E assigned to objects O1…On, `engineer_summaries.total_load` must equal `SUM(summaries[Oi].itogo_chislo_with_travel / COUNT(engineers at Oi))` within ±0.000001.

**AC-15:** The sum of `total_load` across all engineers assigned to a given object must equal that object's `itogo_chislo_with_travel` within ±0.000001.

**AC-16:** Given engineer with `capacityFte = 0.8` and `total_load = 0.76`: `loadRatio = 0.76 / 0.8 = 0.95`. With `ENGINEER_WARNING_THRESHOLD = 0.9`: status must be "warning". Given `total_load = 0.84`: `loadRatio = 1.05` → status must be "overloaded".

**AC-18:** `GET /coverage/gaps?divisionId=X` returns all objects in division X that have zero rows in `object_engineers`. Verified against manual count from the object list.

**PAC-02:** For an engineer assigned as the sole responsible engineer for the reference object with `capacityFte = 1.0`, `engineerTotalLoad = 0.032327 ±0.000001` and `status = "normal"`.

**PAC-07:** When a second engineer is assigned to the reference object, both engineers' `total_load` updates to `0.032327 / 2 = 0.016163 ±0.000001`.

## Database Tables Required

From docs/impl/db-schema.md:

### Engineer tables (PoC baseline — already exist, no schema changes in this milestone)

- `object_engineers` — join table: object_id, engineer_id, assigned_at, assigned_by. UNIQUE(object_id, engineer_id). ON DELETE CASCADE from objects; ON DELETE RESTRICT from users.
- `engineer_summaries` — per-engineer computed cache. **PoC columns** (no `is_stale` in PoC):
  - `id`, `engineer_id` (UNIQUE)
  - `total_load`, `object_count`
  - `os_load`, `ps_load`, `video_load`, `records_load`, `repair_load`
  - `capacity_fte`, `load_ratio`, `status`
  - `computed_at`
  - **NOT yet included:** `is_stale` — added in M-06

### Catalog tables (seed data in PoC — admin-editable from this milestone)

- `device_types` — admin can create/edit/delete via UI (M-04)
- `device_system_contexts` — admin can create/edit/delete via UI (M-04)
- `repair_types` — admin can create/edit/delete via UI (M-05)

> **Note:** No schema migrations required for engineer tables — `object_engineers` and `engineer_summaries` (PoC columns) are already present from PoC v1.0.0. The `is_stale` column is added in M-06.

## API Endpoints Required

From docs/impl/api-spec.md:

### Engineer endpoints (all present in PoC; RBAC enforcement added from M-02)

- `GET /engineers` — list all engineers (admin/editor/viewer: full list; engineer role: own row only)
- `POST /engineers` — create engineer (admin only from M-02)
- `GET /engineers/:id` — get engineer with summary
- `PUT /engineers/:id` — update engineer name, capacityFte, homeDivision (admin only from M-02)
- `DELETE /engineers/:id` — deactivate engineer (admin only; blocked if active assignments: `409 ENGINEER_HAS_ACTIVE_ASSIGNMENTS`)
- `GET /engineers/:id/summary` — get `engineer_summaries` row
- `GET /engineers/:id/objects` — list all objects assigned to engineer with per-object shares
- `POST /engineers/:id/objects` — assign object to engineer (admin: unrestricted; editor: own-division objects)
- `DELETE /engineers/:id/objects/:oid` — remove object assignment
- `GET /objects/:id/engineers` — list engineers assigned to an object
- `POST /objects/:id/engineers` — assign engineer to object
- `DELETE /objects/:id/engineers/:eid` — remove engineer from object
- `GET /coverage/gaps` — list objects with zero assigned engineers

### Catalog management endpoints (M-04 — devices; M-05 — repairs)

- `POST /catalog/devices` — create device type (admin only from M-04)
- `PUT /catalog/devices/:id` — update device type name/description (admin only)
- `DELETE /catalog/devices/:id` — delete device type (blocked if `object_devices` rows reference it)
- `POST /catalog/devices/:id/contexts` — add system context (admin only)
- `PUT /catalog/devices/:id/contexts/:cid` — update R1/R2 normatives (admin only; MVP: marks affected summaries stale)
- `DELETE /catalog/devices/:id/contexts/:cid` — delete context (blocked: `409 CONTEXT_IN_USE` if active assignments)
- `POST /catalog/repairs` — create repair type (admin only from M-05)
- `PUT /catalog/repairs/:id` — update repair type (admin only; MVP: marks affected summaries stale)
- `DELETE /catalog/repairs/:id` — delete repair type (blocked: `409 REPAIR_TYPE_IN_USE` if count > 0)

## UI Screens Required

From docs/impl/ui-spec.md:

### Engineer screens (present in PoC; RBAC-enforced from M-02)

- `/engineers` — Engineer list: load ratio, status, object count, home division (§7.5)
- `/engineers/:id` — Engineer detail: workload dashboard with summary cards, breakdown by system type, assigned objects table, assign/remove objects (admin and editor only), stale indicator (MVP only — requires M-06)
- `/engineers/:id/edit` — Engineer edit: name, capacityFte, home division

### Catalog management screens (M-04 and M-05)

- `/catalog/devices` — Device catalog list + create/edit buttons (admin only; PoC: read-only). M-04 adds management UI.
- `/catalog/devices/new` — Create device type and assign system contexts (MVP only — M-04)
- `/catalog/devices/:id` — Device detail: view/edit device and all system contexts, add/delete contexts (PoC: view-only; M-04: edit enabled for admin)
- `/catalog/repairs` — Repair types list + create/edit buttons (admin only; PoC: read-only). M-05 adds management UI.

## Engineer Load Formulas (§6.12–§6.14)

See docs/impl/calculation-engine.md for full formulas.

- **§6.12 — Object share per engineer:** `engineer_share = itogo_chislo_with_travel / COUNT(assigned engineers at object)`
- **§6.13 — Engineer total load:** `total_load = SUM(engineer_share for each assigned object)`; `load_ratio = total_load / capacity_fte`; status: 'normal' (< ENGINEER_WARNING_THRESHOLD), 'warning' (≥ threshold and < 1.0), 'overloaded' (≥ 1.0)
- **§6.14 — Component breakdown:** `os_load`, `ps_load`, `video_load`, `records_load`, `repair_load` — each engineer's share of each component across all assigned objects. PZV and travel are unattributed overhead — not included in per-component breakdown. `itogo_chislo_with_travel` is authoritative.

**Synchronous recalculation (PoC S-02):** Engineer summaries recalculate synchronously whenever an assignment is added/removed, or when any object's `itogo_chislo_with_travel` changes. In MVP (after M-06), assignment changes mark `engineer_summaries.is_stale = 'TRUE'`.

## PoC Simplifications Active in This Milestone

- **S-02:** Staleness tracking not yet implemented — reversed by M-06. In this milestone, engineer summaries still recalculate synchronously.
- **S-05:** Planning periods not yet implemented — reversed by M-07.
- **S-07:** Audit log not yet implemented — reversed by M-08.

This milestone **reverses S-03** (static normatives): admin UI for device catalog (M-04) and repair type catalog (M-05) is added.

## Out of Scope for This Milestone

- `is_stale` column on `engineer_summaries` — added in M-06 (staleness tracking)
- Background recalculation worker — M-06
- Stale indicator on engineer detail page (§7.6 Section 5) — requires M-06 `is_stale`
- Planning periods — M-07
- Audit log for catalog changes — M-08
- `app_config` admin UI — M-10
