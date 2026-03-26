# Epic: MVP M-02 — RBAC (Auth & Roles)

**Milestone:** M-02 (from TOR §15.7)
**Phase:** MVP
**What it delivers:** §21 JWT access + refresh token flow, RBAC enforcement from §12 (admin, editor, engineer, viewer roles with division scoping), MVP-only `users` columns (`failed_login_count`, `locked_until`), account lockout (§21.3), `/admin/users` user management endpoints, DELETE /divisions/:id and DELETE /branches/:id. Resolves S-04. Depends on M-01.

## Functional Requirements Covered

- **FR-01 — Object Management (§4.1) — RBAC path:** Admin-only restriction on `POST/PUT/DELETE /divisions` and `POST/PUT/DELETE /branches`. Editor division scoping on object write operations.
- **FR-10 — Engineer Management (§4.10) — admin path:** Admin creates/edits/deactivates engineer accounts via `/admin/users` screen. Activate placeholder accounts via `PUT /admin/users/:id/activate`.
- **RBAC cross-cutting (§12):** Division-scoped access for editors. Engineer self-service read-only restrictions. Viewer read-only enforcement. Admin unrestricted access.

## Acceptance Criteria In Scope

**AC-08:** Editor assigned to Division A cannot read or write objects in Division B. `PUT /objects/:id` for a Division B object returns HTTP 403.

**PAC-06:** Unauthenticated requests to any route redirect to `/login`.

## Database Tables Required

From docs/impl/db-schema.md:

- `users` — full MVP schema including MVP-only columns:
  - `failed_login_count INTEGER NOT NULL DEFAULT 0` — brute-force protection counter (§21.3)
  - `locked_until TIMESTAMP NULL` — account lockout expiry (§21.3)
  - All PoC columns remain unchanged (no drop/rename)
- All PoC tables unchanged — RBAC enforcement is added at the application layer

## API Endpoints Required

From docs/impl/api-spec.md:

### Auth (MVP additions)

- `POST /auth/refresh` — obtain a new access token using a refresh token (MVP only — out of PoC scope per §21.2)

### User Administration (M-02 — MVP only)

- `GET /admin/users` — list all users of all roles (paginated; filterable by `?role=&is_active=`). Admin only.
- `POST /admin/users` — create a non-engineer user (admin/editor/viewer roles). Admin only. To create an engineer, use `POST /engineers`. Returns `422 INVALID_ROLE_FOR_ENDPOINT` if role=engineer.
- `GET /admin/users/:id` — get user details. Admin only.
- `PUT /admin/users/:id` — update user fields (name, email, role, division_id). Admin only.
- `PUT /admin/users/:id/activate` — activate placeholder account (sets `is_active = TRUE`, `requires_activation = FALSE`). Admin only.
- `DELETE /admin/users/:id` — deactivate user (sets `is_active = FALSE`). Admin only. Blocked if engineer has active object assignments (`409 ENGINEER_HAS_ACTIVE_ASSIGNMENTS`).

### Division / Branch deletes (MVP only — not available in PoC per S-04)

- `DELETE /divisions/:id` — delete division. Admin only. Blocked with `409 DIVISION_HAS_BRANCHES` if branches exist.
- `DELETE /branches/:id` — delete branch. Admin only. Blocked with `409 BRANCH_HAS_OBJECTS` if objects exist.

### RBAC enforcement on existing endpoints (behaviour change, not new endpoints)

All existing PoC endpoints gain enforcement:
- `POST /divisions`, `PUT /divisions/:id`, `POST /divisions/:id/branches`, `PUT /branches/:id` — admin only
- `POST /objects`, `PUT /objects/:id`, `DELETE /objects/:id` — admin or editor (editor: own division only)
- Object equipment, records, repairs, travel write endpoints — admin or editor (editor: own division), engineer (records/repairs on own objects only)
- `POST /engineers`, `PUT /engineers/:id`, `DELETE /engineers/:id` — admin only
- Engineer assignment endpoints — admin unrestricted; editor: own-division objects, any active engineer
- `GET /engineers` — returns all rows for admin/editor/viewer; returns only own row for engineer role
- `GET /admin/users` — admin only

## UI Screens Required

From docs/impl/ui-spec.md:

- `/admin/users` — User management (admin only). List all users/engineers with roles, activation status. Create, edit, deactivate users.
- `/login` — updated to handle refresh token flow and account lockout messaging

## PoC Simplifications Active in This Milestone

None from S-04 category — this milestone **reverses S-04** (no division scoping in PoC; this MVP milestone adds RBAC enforcement).

Other simplifications still in force (not yet reversed by this milestone):
- **S-02:** Staleness tracking not yet implemented — reversed by M-06.
- **S-03:** Catalog management UI not yet added — partially reversed by M-04 (devices) and M-05 (repairs).
- **S-05:** Planning periods not yet implemented — reversed by M-07.

## RBAC Matrix (§12)

> This milestone implements the full MVP permission matrix. See docs/impl/ui-spec.md §12 for the complete table.

Key rules:
- **admin:** global, full access — all objects, all catalogs, config, import, bulk recalculation, users
- **editor:** own division — edit objects/equipment/travel in own division; assign any active engineer; no catalog management; `division_id` scopes which objects editor can write (not which engineers they can assign)
- **viewer:** read-only — view all objects and СВОД; export; view engineer list; no write access
- **engineer:** own objects — edit records/repairs for assigned objects in active period; view own workload only; `GET /engineers` returns only own row

Editor division scoping: `users.division_id` restricts write operations to objects in that division. `home_division_id` on engineers is display-only — does not restrict cross-division assignment.

## Account Lockout (§21.3)

- `failed_login_count` increments on each failed login attempt
- After threshold exceeded: `locked_until` is set to `now() + lockout_duration`
- During lockout: login returns HTTP 429 with lockout expiry time
- `failed_login_count` resets to 0 on successful login
- Admin can unlock via `PUT /admin/users/:id` (set `locked_until = NULL`)

## Out of Scope for This Milestone

- Device catalog management UI (M-04)
- Repair type catalog management UI (M-05)
- Staleness tracking and background worker (M-06)
- Planning periods (M-07)
- Audit log (M-08) — note: this milestone is the prerequisite for M-08
- Concurrency / optimistic locking (M-09)
- `app_config` admin UI (M-10)
