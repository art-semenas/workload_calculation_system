# API Specification

> Extracted from TOR_Workload_WebApp.md §10. TOR is the source of truth.
> Last sync: TOR v2.26 (2026-03-26)

## Base Path

All endpoints are prefixed `/api/v1` (as defined in §9 / §10.1).

## Authentication

**PoC:** Access token only (JWT, no refresh token).
**MVP:** JWT access + refresh token flow (M-04). `POST /auth/refresh` is out of PoC scope — refresh token flow not implemented (see §21.2).

## Response Envelope

All endpoints share a common JSON envelope:

```json
{ "data": { ... }, "meta": { "page": 1, "total": 2935, "perPage": 100 }, "error": null }
```

On error:

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": 409,
    "message": "Cannot delete: 42 objects have active assignments using this context"
  }
}
```

`error.code` is always the numeric HTTP status mirroring the response status line — never a semantic string. `error.message` is user-facing and carries any detail (such as an affected count); it never exposes stack traces or internals. See `docs/impl/epics/unified-error-handling.md`.

---

## PoC Endpoints

### `GET /divisions`

**Phase:** PoC + MVP
**Description:** List all divisions.
**Request body:** None.
**Response:** HTTP 200

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Брестское областное управление №100",
      "branchCount": 12,
      "objectCount": 245
    }
  ],
  "meta": { "total": 7 },
  "error": null
}
```

---

### `POST /divisions`

**Phase:** PoC (any authenticated user) / MVP (admin only — S-04)
**Description:** Create a new division.
**Request body:** `{ "name": "Брестское областное управление №100" }`
**Response:** HTTP 201

```json
{
  "data": {
    "id": "uuid",
    "name": "Брестское областное управление №100",
    "createdAt": "2026-03-16T12:00:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**
- Returns HTTP 409 with message "A record with that name already exists".

---

### `GET /divisions/:id`

**Phase:** PoC + MVP
**Description:** Get a single division with its branch list.
**Request body:** None.
**Response:** HTTP 200

```json
{
  "data": {
    "id": "uuid",
    "name": "Брестское областное управление №100",
    "branchCount": 12,
    "objectCount": 245,
    "branches": [{ "id": "uuid", "name": "Брест ЦО", "objectCount": 20 }]
  },
  "meta": null,
  "error": null
}
```

**Errors:**
- Returns HTTP 404 with message "Division not found".

---

### `PUT /divisions/:id`

**Phase:** PoC (any authenticated user) / MVP (admin only — S-04)
**Description:** Rename a division.
**Request body:** `{ "name": "Новое название" }`
**Response:** HTTP 200

```json
{
  "data": {
    "id": "uuid",
    "name": "Новое название",
    "updatedAt": "2026-03-16T12:05:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**
- Returns HTTP 409 with message "A record with that name already exists".
- Returns HTTP 404 with message "Division not found".

---

### `GET /divisions/:id/branches`

**Phase:** PoC + MVP
**Description:** List all branches for a given division.
**Request body:** None.
**Response:** HTTP 200

```json
{
  "data": [{ "id": "uuid", "name": "Брест ЦО", "objectCount": 20 }],
  "meta": { "total": 12 },
  "error": null
}
```

---

### `POST /divisions/:id/branches`

**Phase:** PoC (any authenticated user) / MVP (admin only — S-04)
**Description:** Create a branch within a division.
**Request body:** `{ "name": "Брест ЦО" }`
**Response:** HTTP 201

```json
{
  "data": {
    "id": "uuid",
    "name": "Брест ЦО",
    "divisionId": "uuid",
    "createdAt": "2026-03-16T12:00:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**
- Returns HTTP 409 with message "A record with that name already exists".

---

### `GET /branches/:id`

**Phase:** PoC + MVP
**Description:** Get a branch with its paginated object list. Pagination query params: `?page=1&size=50` (defaults: page 1, size 50).
**Request body:** None.
**Response:** HTTP 200

```json
{
  "data": {
    "id": "uuid",
    "name": "Брест ЦО",
    "divisionId": "uuid",
    "divisionName": "Брестское областное управление №100",
    "objects": {
      "data": [
        {
          "id": "uuid",
          "name": "ул. Московская 202Д",
          "itogoChisloWithTravel": 0.032327,
          "engineerCount": 1
        }
      ],
      "meta": { "total": 20, "page": 1, "size": 50 }
    }
  },
  "meta": null,
  "error": null
}
```

**Notes:** Empty state: `objects.data` is `[]`, `objects.meta.total` is `0`.
**Errors:**
- Returns HTTP 404 with message "Branch not found".

---

### `PUT /branches/:id`

**Phase:** PoC (any authenticated user) / MVP (admin only — S-04)
**Description:** Rename a branch.
**Request body:** `{ "name": "Новое название" }`
**Response:** HTTP 200

```json
{
  "data": {
    "id": "uuid",
    "name": "Новое название",
    "divisionId": "uuid",
    "updatedAt": "2026-03-16T12:05:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**
- Returns HTTP 409 with message "A record with that name already exists".
- Returns HTTP 404 with message "Branch not found".

---

### `GET /objects`

**Phase:** PoC + MVP
**Description:** List all objects (paginated, filterable).
**Request body:** None.

---

### `POST /objects`

**Phase:** PoC + MVP
**Description:** Create an object.
**Request body:** Object creation fields.

---

### `GET /objects/:id`

**Phase:** PoC + MVP
**Description:** Get object metadata.
**Request body:** None.

---

### `PUT /objects/:id`

**Phase:** PoC + MVP
**Description:** Update object metadata.
**Request body:** Object update fields.

---

### `DELETE /objects/:id`

**Phase:** PoC + MVP
**Description:** Hard-delete an object. Cascades all child tables (`object_engineers`, `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`). Before deletion the service reads all engineers assigned to the object.
**Response:** HTTP 204 on success.
**Notes (stale-marking):**
- **PoC (S-02):** Cascade-delete all child rows in the same transaction, then immediately recalculate engineer summaries synchronously for all affected engineers. No `is_stale` column exists in PoC.
- **MVP (AD-10):** Cascade-delete all child rows, then mark affected engineers' `engineer_summaries.is_stale = 'TRUE'` within the same transaction. Recalculation happens on-demand when `POST /svod/recalculate` is triggered.

---

### `GET /objects/:id/summary`

**Phase:** PoC + MVP
**Description:** Get computed summary for an object.
**Request body:** None.

---

### `GET /objects/:id/devices`

**Phase:** PoC + MVP
**Description:** List physical devices for an object.
**Request body:** None.

---

### `POST /objects/:id/devices`

**Phase:** PoC + MVP
**Description:** Add a physical device to an object.
**Request body:** `{ deviceTypeId, quantityPhysical }`

---

### `PUT /objects/:id/devices/:dtid`

**Phase:** PoC + MVP
**Description:** Update the physical quantity of a device on an object.
**Request body:** Updated physical quantity.

---

### `DELETE /objects/:id/devices/:dtid`

**Phase:** PoC + MVP
**Description:** Remove a device from an object. Cascades system assignments.

---

### `GET /objects/:id/assignments`

**Phase:** PoC + MVP
**Description:** List all system assignments for an object.
**Request body:** None.

---

### `POST /objects/:id/assignments`

**Phase:** PoC + MVP
**Description:** Create a system assignment.
**Request body:** `{ deviceTypeId, systemType, quantityMaintained }`

---

### `PUT /objects/:id/assignments/:aid`

**Phase:** PoC + MVP
**Description:** Update `quantityMaintained` for a system assignment.
**Request body:** Updated `quantityMaintained`.

---

### `DELETE /objects/:id/assignments/:aid`

**Phase:** PoC + MVP
**Description:** Remove a system assignment.

---

### `GET /objects/:id/records`

**Phase:** PoC + MVP
**Description:** Get records task quantities for an object.
**Request body:** None.

---

### `PUT /objects/:id/records`

**Phase:** PoC + MVP
**Description:** Update records task quantities.
**Request body:** Updated records task fields.
**Notes (stale-marking):** MVP: marks summaries stale (AD-10). PoC: synchronous recalculation.

---

### `GET /objects/:id/repairs`

**Phase:** PoC + MVP
**Description:** List repair counts per repair type for an object.
**Request body:** None.

---

### `PUT /objects/:id/repairs/:rtid`

**Phase:** PoC + MVP
**Description:** Set count for one repair type.
**Request body:** Updated repair count.
**Notes (stale-marking):** MVP: marks summaries stale (AD-10). PoC: synchronous recalculation.

---

### `GET /objects/:id/travel`

**Phase:** PoC + MVP
**Description:** Get travel data for an object.
**Request body:** None.

---

### `PUT /objects/:id/travel`

**Phase:** PoC + MVP
**Description:** Update travel data for an object.
**Request body:** Updated travel fields.
**Notes (stale-marking):** MVP: marks summaries stale (AD-10). PoC: synchronous recalculation.

---

### `GET /catalog/devices`

**Phase:** PoC + MVP
**Description:** List all device types.
**Request body:** None.

---

### `POST /catalog/devices`

**Phase:** PoC + MVP
**Description:** Create a device type.
**Request body:** Device type fields.

---

### `GET /catalog/devices/:id`

**Phase:** PoC + MVP
**Description:** Get a device type with all its system contexts.
**Request body:** None.

---

### `PUT /catalog/devices/:id`

**Phase:** PoC + MVP
**Description:** Update device type name/description.
**Request body:** Updated name/description.

---

### `DELETE /catalog/devices/:id`

**Phase:** PoC + MVP
**Description:** Delete a device type. Blocked if any `object_devices` rows reference this type.

---

### `GET /catalog/devices/:id/contexts`

**Phase:** PoC + MVP
**Description:** List all system contexts for a device type.
**Request body:** None.

---

### `POST /catalog/devices/:id/contexts`

**Phase:** PoC + MVP
**Description:** Add a system context to a device type.
**Request body:** `{ systemType, r1Minutes, r2Minutes }`

---

### `PUT /catalog/devices/:id/contexts/:cid`

**Phase:** PoC + MVP
**Description:** Update r1/r2 normatives for a system context.
**Request body:** Updated r1/r2 values.
**Notes (stale-marking):** MVP: marks summaries stale for all affected objects (AD-10). PoC: synchronous recalculation.

---

### `DELETE /catalog/devices/:id/contexts/:cid`

**Phase:** PoC + MVP
**Description:** Delete a system context. Blocked if there are active assignments referencing this context.
**Errors:**
- Returns HTTP 409 with message "Cannot delete: N object(s) use this context".

---

### `GET /catalog/repairs`

**Phase:** PoC + MVP
**Description:** List all repair types.
**Request body:** None.

---

### `POST /catalog/repairs`

**Phase:** PoC + MVP
**Description:** Create a repair type.
**Request body:** `{ name, timeMinutes }`

---

### `PUT /catalog/repairs/:id`

**Phase:** PoC + MVP
**Description:** Update a repair type.
**Request body:** Updated fields.
**Notes (stale-marking):** MVP: marks summaries stale for affected objects (AD-10). PoC: synchronous recalculation.

---

### `DELETE /catalog/repairs/:id`

**Phase:** PoC + MVP
**Description:** Delete a repair type. Blocked if any `object_repairs` row references it with `count > 0` in any period (past or active). Rows with `count = 0` do not block deletion.
**Errors:**
- Returns HTTP 409 with message "Repair type {id} has recorded usage with count > 0".

---

### `GET /svod`

**Phase:** PoC + MVP
**Description:** Get all engineer summaries (paginated, filterable).
**Request body:** None.

---

### `GET /svod/export/xlsx`

**Phase:** PoC + MVP
**Description:** Export SVOD to XLSX. Defaults to active period; use `?periodId=` for historical export.
**Request body:** None.

---

### `GET /engineers`

**Phase:** PoC + MVP
**Description:** List all engineers (paginated, filterable). When caller role = `engineer`, returns exactly one row (the calling user's own record).
**Request body:** None.

---

### `POST /engineers`

**Phase:** PoC (any authenticated user) / MVP (admin only)
**Description:** Create an engineer.
**Request body:** Engineer fields including `capacityFte` and `home_divisionId`.

---

### `GET /engineers/:id`

**Phase:** PoC + MVP
**Description:** Get an engineer with their summary.
**Request body:** None.

---

### `PUT /engineers/:id`

**Phase:** PoC (any authenticated user) / MVP (admin only)
**Description:** Update engineer name, `capacityFte`, or `home_division`.
**Request body:** Updated fields.

---

### `DELETE /engineers/:id`

**Phase:** PoC (any authenticated user) / MVP (admin only)
**Description:** Deactivate an engineer. Blocked if the engineer has active assignments.
**Errors:**
- Returns HTTP 409 with message "Engineer has active assignments: {id}".

---

### `GET /engineers/:id/summary`

**Phase:** PoC + MVP
**Description:** Get the `engineer_summaries` row for an engineer.
**Request body:** None.

---

### `GET /engineers/:id/objects`

**Phase:** PoC + MVP
**Description:** List all objects assigned to an engineer with per-object shares.
**Request body:** None.

---

### `POST /engineers/:id/objects`

**Phase:** PoC (any authenticated user) / MVP (editors scoped to own division per §12; admins unrestricted)
**Description:** Assign an object to an engineer.
**Request body:** `{ objectId }`

---

### `DELETE /engineers/:id/objects/:oid`

**Phase:** PoC (any authenticated user) / MVP (editors scoped to own division per §12; admins unrestricted)
**Description:** Remove an object assignment from an engineer.

---

### `GET /objects/:id/engineers`

**Phase:** PoC + MVP
**Description:** List engineers assigned to a given object (alternative entry from object side).
**Request body:** None.

---

### `POST /objects/:id/engineers`

**Phase:** PoC (any authenticated user) / MVP (admins and editors scoped to own-division objects per §12)
**Description:** Assign an engineer to an object.
**Request body:** `{ engineer_id }`

---

### `DELETE /objects/:id/engineers/:eid`

**Phase:** PoC (any authenticated user) / MVP (admins and editors scoped to own-division objects per §12)
**Description:** Remove an engineer assignment from an object.

---

### `GET /coverage/gaps`

**Phase:** PoC + MVP
**Description:** List all objects with zero assigned engineers. Optionally filter by division: `?divisionId=:did`.
**Request body:** None.

---

### `GET /aggregations/company`

**Phase:** PoC + MVP
**Description:** Company-wide required FTE and breakdown (on-the-fly, no cache).
**Request body:** None.

---

### `GET /aggregations/divisions`

**Phase:** PoC + MVP
**Description:** All divisions summary list (on-the-fly, no cache).
**Request body:** None.

---

### `GET /aggregations/divisions/:id`

**Phase:** PoC + MVP
**Description:** Single division detail (§16.7 response shape; on-the-fly, no cache).
**Request body:** None.

---

### `GET /aggregations/branches`

**Phase:** PoC + MVP
**Description:** All branches summary list (on-the-fly, no cache).
**Request body:** None.

---

### `GET /aggregations/branches/:id`

**Phase:** PoC + MVP
**Description:** Single branch detail (on-the-fly, no cache).
**Request body:** None.

---

### `POST /auth/login`

**Phase:** PoC + MVP
**Description:** Authenticate and obtain a JWT access token.

---

### `POST /auth/logout`

**Phase:** PoC + MVP
**Description:** Invalidate the current session.

---

### `GET /auth/me`

**Phase:** PoC + MVP
**Description:** Return the currently authenticated user's profile.

---

## MVP-Only Endpoints

### DELETE /divisions/:id (MVP only)

**Phase:** MVP (admin only — S-04). Not available in PoC.
**Description:** Delete a division. Blocked with 409 if branches exist.
**Response:** HTTP 204 on success.
**Errors:**
- Returns HTTP 409 with message "Cannot delete: division has N branches".
- Returns HTTP 404 with message "Division not found".

---

### DELETE /branches/:id (MVP only)

**Phase:** MVP (admin only — S-04). Not available in PoC.
**Description:** Delete a branch. Blocked with 409 if objects exist.
**Response:** HTTP 204 on success.
**Errors:**
- Returns HTTP 409 with message "Cannot delete: branch has N objects".
- Returns HTTP 404 with message "Branch not found".

---

### Object Export (M-12)

**Phase:** MVP only — out of PoC scope (S-10). Introduced in M-12.

#### `GET /objects/:id/export/xlsx`

**Description:** Export object inventory to XLSX.
**RBAC:** `editor`, `admin` only. `viewer` and `engineer` are not permitted.
**Response:** HTTP 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="object_{id}_export.xlsx"`.
**File contents:** One sheet per data group — physical devices (device type, physical quantity), system assignments (device type, system type, maintained quantity), records task quantities, repair counts by type, and travel data (transport type, distance km, one-way minutes, round-trip minutes). All values match the corresponding `GET` API responses for the same object at the time of export.
**Errors:**
- Returns HTTP 404 with message "Object not found".
- Returns HTTP 403 with message "You don't have permission to access this resource".

---

### SVOD PDF Export (Post-MVP — requires M-11 / S-08)

#### `GET /svod/export/pdf`

**Phase:** Post-MVP — requires M-11 (S-08). Not available in PoC or MVP base.
**Description:** Export SVOD to PDF. Defaults to active period; use `?periodId=` for historical export.

---

### Admin Config (M-10)

> These endpoints do not exist in PoC. In PoC (S-03, S-07), calculation constants are provided only via Docker environment variables at application startup. There is no HTTP config-management API and no audit-log API. See §6.11 and §15.3.

#### `GET /admin/config`

**Phase:** MVP only (M-10)
**Description:** List all config keys and their current values.
**RBAC:** Admin only.
**Request body:** None.

#### `PUT /admin/config`

**Phase:** MVP only (M-10)
**Description:** Batch update multiple config keys. Validates all constraints before writing; all violations in a single save are reported together (not fail-fast per key). On success, marks summaries stale and logs to `audit_log`. This is a **batch** endpoint — NOT `PUT /admin/config/:key`.
**RBAC:** Admin only.
**Request body (example — valid values):**

```json
{
  "REPAIR_TRAVEL_CAP": 10,
  "REPAIR_TRAVEL_ZERO_THRESHOLD": 5,
  "ENGINEER_WARNING_THRESHOLD": 0.8
}
```

**Response on success (HTTP 200):**

```json
{
  "data": {
    "updated_keys": [
      "REPAIR_TRAVEL_CAP",
      "REPAIR_TRAVEL_ZERO_THRESHOLD",
      "ENGINEER_WARNING_THRESHOLD"
    ],
    "timestamp": "2026-03-16T14:32:00Z"
  },
  "meta": null,
  "error": null
}
```

**Response on validation failure (HTTP 422):**

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": 422,
    "message": "Configuration constraint violated: REPAIR_TRAVEL_ZERO_THRESHOLD (8) must be less than REPAIR_TRAVEL_CAP (5)"
  }
}
```

Each violated constraint is reported in `error.message`; multiple violations are joined with `; `.

See §6.11.1 for complete per-key and cross-key constraint definitions.

---

### Admin Audit Log (M-08 / M-10)

#### `GET /admin/audit`

**Phase:** MVP only (requires M-08). Admin only.
**Description:** Retrieve the audit log. Admin only.

---

### Planning Periods (M-07)

> These endpoints do not exist in PoC. In PoC (S-05), planning periods are not implemented; `/admin/periods` is unavailable and summary/data-entry flows operate without period selection. See §15.3 and §15.7.

#### `GET /admin/periods`

**Phase:** MVP only (M-07)
**Description:** List all planning periods.
**Request body:** None.

#### `POST /admin/periods`

**Phase:** MVP only (M-07)
**Description:** Create a new planning period.
**Request body:** `{ name, start_date, end_date }`

#### `GET /admin/periods/:id`

**Phase:** MVP only (M-07)
**Description:** Get period details.
**Request body:** None.

#### `PUT /admin/periods/:id/activate`

**Phase:** MVP only (M-07)
**Description:** Set a period as the active period. Deactivates the current active period.
**Request body:** None.

#### `GET /admin/periods/active`

**Phase:** MVP only (M-07)
**Description:** Get the currently active planning period.
**Request body:** None.

---

### Background Recalculation Trigger (M-06)

> These endpoints do not exist in PoC. In PoC (S-02), all summaries are recalculated synchronously on every data-changing request — there is no `is_stale` column, no background worker, and no admin-triggered recalculation. See §6.10.

#### `POST /svod/recalculate`

**Phase:** MVP only (M-06)
**Description:** Trigger full recalculation of all stale summaries. Admin only.
**Request body:** None.

#### `POST /svod/recalculate/:objectId`

**Phase:** MVP only (M-06)
**Description:** Trigger recalculation for a single object. Admin only.
**Request body:** None.

#### `GET /svod/recalculate/status`

**Phase:** MVP only (M-06)
**Description:** Check background recalculation job status.
**Response shape:** `{ totalStale, processed, remaining }`

---

### User Administration (M-02)

> These endpoints do not exist in PoC. In PoC (S-04), there is only one effective role — all authenticated users can read and write. The `/admin/users` screen and these endpoints are introduced in M-02 when role enforcement is added.

#### `GET /admin/users`

**Phase:** MVP only (M-02)
**Description:** List all users of all roles. Paginated; filterable by `?role=&is_active=`. Admin only.

#### `POST /admin/users`

**Phase:** MVP only (M-02)
**Description:** Create a non-engineer user. Admin only.
**Request body:** `{ name, email, role, divisionId? }` where `role` is `admin`, `editor`, or `viewer`. To create an `engineer`, use `POST /engineers`.
**Errors:**
- Returns HTTP 422 with message "Engineer accounts cannot be created through this endpoint".

#### `GET /admin/users/:id`

**Phase:** MVP only (M-02)
**Description:** Get user details. Admin only.

#### `PUT /admin/users/:id`

**Phase:** MVP only (M-02)
**Description:** Update user fields. Admin only.
**Request body:** `{ name, email, role, divisionId }`

#### `PUT /admin/users/:id/activate`

**Phase:** MVP only (M-02)
**Description:** Activate a placeholder user account. Sets `is_active = TRUE` and `requires_activation = FALSE`. Admin only. Canonical surface for activating placeholder accounts created by bulk import (M-01).
**Request body:** None.

#### `DELETE /admin/users/:id`

**Phase:** MVP only (M-02)
**Description:** Deactivate a user — sets `is_active = FALSE`. Admin only. Blocked if the user is an engineer with active object assignments.
**Errors:**
- Returns HTTP 404 with message "User not found".
- Returns HTTP 409 with message "Engineer has active assignments: {id}".

---

### Auth Refresh (M-04 — out of PoC scope)

#### `POST /auth/refresh`

**Phase:** MVP only (M-04). Out of PoC scope — refresh token flow not implemented in PoC (see §21.2).
**Description:** Obtain a new access token using a refresh token.

---

## Error Reference

`error.code` carries the numeric HTTP status; the condition is conveyed by `error.message`. The table below lists every error condition referenced across §10 with its status and canonical message. Rows marked **(MVP)** describe endpoints not yet implemented in PoC — their messages are the intended wording.

| HTTP | Condition | Canonical message |
|---|---|---|
| 400 | Malformed JSON request body | `Malformed request body` |
| 400 | Required query parameter absent | `Missing required parameter: {name}` |
| 400 | Path or query parameter fails type conversion | `Invalid value for parameter '{name}'` |
| 401 | Wrong email or password at login | `Invalid email or password` |
| 401 | JWT missing, malformed, or expired on a protected endpoint | `Invalid or expired authentication token` |
| 403 | Caller role is not permitted | `You don't have permission to access this resource` |
| 404 | Unknown route | `Resource not found` |
| 404 | Division not found | `Division not found` |
| 404 | Branch not found | `Branch not found` |
| 404 | Object does not exist | `Object not found` |
| 404 | Device type / context / repair type / engineer / assignment not found | `{Entity} not found` |
| 404 | User does not exist **(MVP)** | `User not found` |
| 405 | HTTP method not supported by the route | `Method not allowed` (response carries an `Allow` header) |
| 406 | No response format matches the client's `Accept` header | _(no body — see note below)_ |
| 409 | A resource with this name already exists (divisions, branches) | `A record with that name already exists` |
| 409 | Cannot delete device context: active assignments reference it | `Cannot delete: {n} object(s) use this context` |
| 409 | Cannot delete repair type: has recorded usage (count > 0) | `Repair type {id} has recorded usage with count > 0` |
| 409 | Cannot delete device type: in use by object inventory | `Device type {id} is in use by object inventory` |
| 409 | Engineer deactivation blocked; active assignments exist | `Engineer has active assignments: {id}` |
| 409 | Engineer already assigned to the object | `This engineer is already assigned to the object` |
| 409 | Any other database constraint violation | `A database constraint was violated` |
| 409 | Cannot delete division: it has branches **(MVP)** | `Cannot delete: division has {n} branches` |
| 409 | Cannot delete branch: it has objects **(MVP)** | `Cannot delete: branch has {n} objects` |
| 415 | Request `Content-Type` not supported | `Unsupported media type` (response carries an `Accept` header) |
| 422 | Bean Validation failure on the request body | `{field}: {constraint message}` (joined with `; `) |
| 422 | Device has no context for the requested system type | `No norms configured for this system type` |
| 422 | Device not in the object's inventory; assignment rejected | `Device not found in inventory for this object` |
| 422 | Attempt to set `round_trip_min` directly | `Round trip time is auto-calculated and cannot be edited directly` |
| 422 | Engineer is inactive | `Engineer is inactive: {id}` |
| 422 | Target user is not an engineer | `User is not an engineer: {id}, role={role}` |
| 422 | Attempted to create role `engineer` via `POST /admin/users` **(MVP)** | `Engineer accounts cannot be created through this endpoint` |
| 422 | One or more config key constraints violated (batch) **(MVP)** | `Configuration constraint violated: {detail}` |
| 422 | `REPAIR_TRAVEL_ZERO_THRESHOLD >= REPAIR_TRAVEL_CAP` **(MVP)** | `REPAIR_TRAVEL_ZERO_THRESHOLD must be less than REPAIR_TRAVEL_CAP` |
| 422 | `REPAIR_TRAVEL_ZERO_THRESHOLD < 0` **(MVP)** | `REPAIR_TRAVEL_ZERO_THRESHOLD must not be negative` |
| 422 | `REPAIR_TRAVEL_CAP < 1` **(MVP)** | `REPAIR_TRAVEL_CAP must be at least 1` |
| 422 | `PRODUCTIVE_MONTHS < 1` **(MVP)** | `PRODUCTIVE_MONTHS must be at least 1` |
| 422 | `PRODUCTIVE_MONTHS > PLANNING_PERIOD_MONTHS` **(MVP)** | `PRODUCTIVE_MONTHS must not exceed PLANNING_PERIOD_MONTHS` |
| 429 | Rate limit exceeded | `Too many requests. Please wait before retrying.` |
| 500 | Unexpected server error | `An unexpected error occurred. Please try again later.` |

> **406 is the sole exception to the envelope rule.** No available representation matches the client's `Accept` header, so returning the JSON envelope would contradict the status. The server returns a bare 406 status line with no body. Every other status above carries the full envelope.

---

## Import Endpoints (§11.1)

> **Scope: MVP only (M-01).** Data import via the `/import` endpoint is not available in PoC (S-06). In PoC, all data is entered manually through the UI.

### Two-step import flow

The import API uses a stateless two-call pattern:

1. **`POST /import/data` — dry-run (no writes).** The server validates the entire payload and returns a preview report. No rows are written to the database. The preview report contains:
   - `objects_valid` — count of object entries that would be created/updated.
   - `warnings` — list of entries with non-fatal issues (e.g. unresolved engineer names that would generate placeholder accounts, device type names not found in catalog).
   - `skipped` — count of entries rejected due to fatal validation errors (missing `number`, empty `division`, invalid `systemType`, etc.) with per-entry reasons.
   - `estimated_placeholders` — count of engineer placeholder accounts that would be created.

2. **`POST /import/data/confirm` — execute (all writes).** The client re-submits the identical JSON payload. The server re-validates and executes all processing steps atomically. No server-side session or token links the two calls — the client is responsible for re-submitting the payload.

> If the payload sent to `/confirm` differs from the payload sent to `/data`, the confirm call re-validates from scratch and may produce different results. There is no stale-check between the two calls.

### Payload structure

```jsonc
{
  "device_types": [{ "name": "...", "description": "..." }],
  "device_system_contexts": [
    {
      "deviceTypeName": "...",
      "systemType": "OS" | "PS" | "Video",
      "r1Minutes": 0,
      "r2Minutes": 0
    }
  ],
  "repair_types": [{ "name": "...", "timeMinutes": 0 }],
  "objects": [
    {
      "number": 1,
      "division": "...",
      "branch": "...",
      "name": "...",
      "engineer_name": "Александр Н Соловей",
      "equipment": [
        { "device": "<deviceTypeName>", "systemType": "OS", "quantity": 5 },
        { "device": "<deviceTypeName>", "systemType": "PS", "quantity": 3 }
      ],
      "records": {
        "access": 0,
        "monitoring": 0,
        "footage": 0,
        "backup": 0,
        "admin": 0
      },
      "repairs": { "<repairTypeName>": 2 },
      "travel": { "oneWayTimeMin": 10 }
    }
  ]
}
```

### Processing steps

1. Upsert `device_types` and `device_system_contexts` from their respective arrays (seed data).
2. Upsert `repair_types` from the array.
3. For each entry in `objects`: create Division → Branch → Object (dedup divisions/branches by name).
4. For each non-zero equipment entry: resolve `device_types` by name (create if not found, with warning); resolve `device_system_contexts` for (device, systemType); upsert `object_devices` (first occurrence's quantity used as `quantityPhysical`; subsequent entries for the same device are skipped); create `object_system_assignments` with `quantityMaintained = quantity`.
5. Populate `records_tasks` per object using `periodId = active_period.id`. If no period is active, returns HTTP 422.
6. Populate `object_repairs` per object using `periodId = active_period.id`. Only non-zero count entries create rows.
7. Populate `travel` per object.
8. Return validation report: objects created, warnings, skipped entries.
9. Mark all imported object summaries stale. (PoC: immediately run synchronous bulk recalculation inline; MVP: admin triggers recalculation via `POST /svod/recalculate`.)
