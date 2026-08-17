# WS-C Step 2 — MVP M-02: RBAC Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement the RBAC-aware frontend: JWT access token auto-refresh via Axios interceptor, role-based navigation (hide admin-only menu items from non-admins), admin Users management page (`/admin/users`), account lockout error handling on login, division-scoped write access for the editor role, and engineer read scoping (own objects only, no organisation-wide rollups). Follows Quiet design from WS-A.

**Branch:** `feature/mvp-m02-rbac-frontend`
**Depends on:** `feature/mvp-m02-rbac-backend` merged to `feature/implementation`; `feature/design-quiet-step2-components` merged (for `<PageHead>`, `<KPIRow>`)
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m02-auth.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m02-auth.md` — scope, ACs, role matrix, UI screens
2. `docs/TOR_Workload_WebApp.md §12` — RBAC role definitions and engineer read scope
3. `docs/TOR_Workload_WebApp.md §21` — JWT flow, refresh token behavior, lockout UX
4. `design/design_handoff_workload_light/README.md` — Quiet design patterns for new pages
5. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass

**Frontend role rules:**
- `admin` — sees all navigation, all write buttons enabled
- `editor` — sees all nav except `/admin/users`; write buttons disabled for out-of-division objects
- `engineer` — sees only their own objects and their own workload; may edit records/repairs on those objects; no organisation-wide rollups
- `viewer` — read-only everywhere, no write buttons

---

## Backend Contract (verified against `feature/mvp-m02-rbac-backend`, 2026-08-15)

> Read this before writing any API code. Several fields differ from the obvious guess, and the
> mismatches fail **silently** — a wrong query-param name returns unfiltered data with HTTP 200.

### Auth

`POST /auth/login` and `POST /auth/refresh` both return the same envelope:

```jsonc
{ "data": { "token": "<access jwt>",
            "user": { "id", "email", "name", "role", "divisionId", "homeDivisionId",
                      "capacityFte", "employeeId", "active", "requiresActivation" } },
  "meta": null, "error": null }
```

- **`user.role` and `user.divisionId` are already in this payload.** Do **not** decode the JWT for
  them — see Task 2.
- Access-token claims, for reference only: `sub` = **user id** (not email), `email`, `role`,
  **`division_id`** (snake_case), `token_type: "access"`. The refresh token carries only `sub`,
  `email`, `token_type: "refresh"` — no role or division, deliberately, so a role change takes
  effect on the next refresh.
- `POST /auth/refresh` takes **no body** and no `Authorization` header. It reads the `refresh_token`
  cookie: `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`. Same-origin requests send it
  automatically; if the API is ever served from another origin, the Axios instance needs
  `withCredentials: true`.
- `POST /auth/logout` clears the cookie and returns 204.
- Lockout: HTTP **401** with `error.message` = `Account locked. Try again in {n} minutes.` The wait
  is a **duration**, not a clock time — the server can only format a clock time in its own zone
  (UTC in the container), which is wrong for every other reader. Render it verbatim; do not reformat.

### `/admin/users` (admin only)

| Route | Request | Response |
|---|---|---|
| `GET /admin/users` | `?page=&size=&role=&is_active=` (`page ≥ 0`, `1 ≤ size ≤ 200`) | `ApiResponse<Page<AdminUserDto>>` |
| `POST /admin/users` | `{ email, name, role, divisionId?, password? }` | 201 + `AdminUserDto` |
| `GET /admin/users/:id` | — | 200 + `AdminUserDto` |
| `PUT /admin/users/:id` | `{ email, name, role, divisionId?, unlock? }` | 200 + `AdminUserDto` |
| `PUT /admin/users/:id/activate` | no body | 200 + `AdminUserDto` |
| `PUT /admin/users/:id/password` | `{ password }` (min 8) | **204, no body** |
| `DELETE /admin/users/:id` | — | 204 |

- Query params are **snake_case**: `is_active`, not `isActive`. A wrong name is ignored and returns
  the unfiltered list with HTTP 200.
- `data` is a **Spring `Page`** — `{ content, totalElements, totalPages, number, size }` — not an
  array. Mirror `SvodPageSchema` in `frontend/src/types/m02.ts`.
- `AdminUserDto`: `id, email, name, role, divisionId, homeDivisionId, capacityFte, employeeId,`
  **`active`**`, requiresActivation,` **`engineer`**`, lockedUntil, createdAt, updatedAt`.
  The boolean is **`active`**, not `isActive` — note that `EngineerDto` on `/engineers` really does
  use `isActive`, so the two DTOs differ.
- `password` is optional on create. Omitted → a **placeholder**: `active = false`,
  `requiresActivation = true`, and an unusable credential. Activating a placeholder does **not**
  make it able to log in — a password must be issued via `PUT /admin/users/:id/password`.
- `unlock` is opt-in. A plain edit of a locked account leaves the lockout in place by design; only
  `unlock: true` clears `locked_until` and `failed_login_count`.
- Errors: 422 `Engineer accounts cannot be created through this endpoint` (creating `role=engineer`,
  or setting it on a user who is not an engineer); 409 `Engineer has active assignments: {id}` on
  deactivate; 409 `Cannot remove the last administrator` when a role change or deactivation would
  leave no active admin; 404 `User not found`; 400 `Invalid value for parameter '{name}'` for
  out-of-range paging.

### Engineer read scoping (TOR §12)

**Filtered — HTTP 200 with fewer rows, no error to handle:** `GET /objects`, `GET /svod`,
`GET /svod/export/xlsx`, `GET /engineers` (own row only).

**Denied — HTTP 403:** `GET /objects/:id` and every one of its sub-resources —
`/summary`, `/engineers`, `/records`, `/repairs`, `/travel`, `/devices`, `/assignments` — for an
object the engineer is not assigned to; `GET /engineers/:id`, `/engineers/:id/objects`,
`/engineers/:id/summary` for anyone other than themselves; **all** of `/aggregations/*` and
`/coverage/gaps`.

Every 403 carries the standard envelope with `error.code: 403` and
`error.message: "You don't have permission to access this resource"`.

### Role vs. job function

`role` is the permission tier; `users.is_engineer` is the job function, and they are independent —
a team lead can be `role = editor` **and** an engineer. Engineer-specific *permissions* key on the
role; "is this person an engineer" keys on the flag. Task 1 exposes the flag to the client.

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m02-rbac-frontend
```

---

## Task 1: Expose the engineer flag on the auth payload (backend prerequisite)

**Files:**
- Modify: `backend/src/main/java/com/workload/dto/UserDto.java`
- Update: `backend/src/test/java/com/workload/mapper/UserMapperTest.java`
- Update: `backend/src/test/java/com/workload/controller/AuthControllerIT.java`

**Why:** MVP M-02 separated the engineer job function from the permission role, but `UserDto` — the
payload behind `/auth/me` and login — still exposes only `role`. Without the flag the client cannot
tell that an editor is also an engineer, so it cannot show engineer views (own objects, own
workload) to a team lead. `UserMapper` is MapStruct, so the field maps itself once the record has it.

- [ ] **Step 1: Write a failing test** — assert `data.engineer` is `true` on `/auth/me` for an
      engineer account and `false` for the seeded admin.
- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Add `boolean engineer` to `UserDto`**
- [ ] **Step 4: Run — expect PASS**, then `cd backend && mvn spotless:apply verify`
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/dto/UserDto.java backend/src/test/java/com/workload/
git commit -m "feat: expose engineer flag on the auth user payload"
```

---

## Task 2: Auth store — role, division and engineer flag, plus token refresh

**Files:**
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/stores/authStore.ts`
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/api/axios.ts`

**Changes:**

`role` is **already** in the store — `AppLayout` reads `user?.role` today. What is missing is
`divisionId` and `engineer`, and both arrive in the login/refresh payload. `UserSchema` currently
declares only `id, email, name, role`, and Zod strips unknown keys, so the extra fields are being
thrown away at the parse boundary.

> **Do not decode the JWT for this.** The claim is `division_id`, not `divisionId`, so
> `jwtDecode<{divisionId}>(token).divisionId` is `undefined` forever — every editor silently loses
> every write button, and a test that mocks the store directly cannot catch it. Extending
> `UserSchema` is one line, needs no new dependency, and survives a claim rename.

- [ ] **Step 1: Write failing tests**

```ts
it('keeps divisionId and engineer from the login response', () => {
  // parse a login payload with divisionId + engineer:true
  // verify authStore.user.divisionId and .engineer survive UserSchema.parse
})

it('retries request after successful token refresh on 401', async () => {
  // first call returns 401
  // POST /auth/refresh returns { data: { token, user } }
  // original request retried with new token → succeeds
  // verify original API response returned to caller
})

it('redirects to /login when refresh fails', async () => {
  // first call returns 401; POST /auth/refresh returns 401
  // verify logout called and redirect to /login
})

it('does not attempt refresh for a failed login request', () => {
  // 401 from /auth/login must surface to the form, not trigger a refresh loop
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Extend `UserSchema`** in `types/auth.ts`

```ts
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  divisionId: z.string().uuid().nullable(),
  engineer: z.boolean(),
})
```

Expose `role`, `divisionId` and `engineer` as convenience selectors on the store if it reads better
at call sites, but `user` stays the single source — it is already persisted to localStorage.

- [ ] **Step 4: Add `refresh()` to `api/auth.ts`**

```ts
export async function refresh() {
  const response = await api.post<ApiResponse<unknown>>('/auth/refresh', null, {
    skipAuthRedirect: true,
  })
  return LoginResponseSchema.parse(response.data.data)
}
```

`skipAuthRedirect` matters: without it a failed refresh re-enters the 401 handler recursively.

- [ ] **Step 5: Update the Axios response interceptor in `axios.ts`**

The existing interceptor logs out and redirects on 401. Insert a single refresh attempt before that:

1. If a refresh is already in flight, queue the request and wait for it
2. Call `refresh()` (no auth header — uses the cookie)
3. On success: store the new token + user, replay queued requests
4. On failure: `logout()`, `window.location.href = '/login'`

Keep the existing guards intact — `shouldRedirectToLogin` already skips `/auth/login` requests,
requests marked `skipAuthRedirect`, and the case where no token is held. Retry each request **once**;
mark the retried config so a second 401 falls through to logout instead of looping.

- [ ] **Step 6: Run tests — expect PASS**
- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/auth.ts frontend/src/stores/authStore.ts frontend/src/api/auth.ts frontend/src/api/axios.ts
git commit -m "feat: carry divisionId and engineer flag in auth state, retry once after token refresh"
```

---

## Task 3: Role-aware navigation

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Rules:**
- `/admin/users` nav item — visible only to `admin`
- Organisation rollup nav (anything reaching `/aggregations/*` or `/coverage/gaps`) — hidden for
  `engineer`, because the backend answers 403
- All other nav items visible to all authenticated roles

- [ ] **Step 1: Write failing tests**

```tsx
it('hides /admin/users link for editor role', () => {
  mockAuthStore({ user: { role: 'editor' } })
  render(<AppLayout />)
  expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument()
})

it('shows /admin/users link for admin role', () => { /* … */ })

it('hides rollup nav for engineer role', () => {
  mockAuthStore({ user: { role: 'engineer' } })
  // verify no link to a route whose page calls /aggregations or /coverage
})
```

- [ ] **Step 2: Implement role-gated nav items**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "feat: hide admin-only and rollup nav items based on role"
```

---

## Task 4: Login page — lockout error handling

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

**Spec:** on HTTP 401 whose `error.message` starts with `Account locked.`, show that message inline
below the form instead of the generic invalid-credentials error.

- [ ] **Step 1: Write failing test**

```tsx
it('shows lockout message when account is locked', async () => {
  mockLoginApi.mockRejectedValue({
    response: { status: 401, data: { error: { code: 401, message: 'Account locked. Try again in 27 minutes.' } } }
  })
  render(<LoginPage />)
  // fill email and password, submit
  expect(await screen.findByText(/Account locked/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Update the login handler** — render the server message verbatim in a persistent
      `<Alert severity="warning">` (not dismissible, not auto-fading). Match on the message prefix,
      not an exact string: the time varies. Never hand-write the wording; the server owns it.
- [ ] **Step 3: Run test — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: display account lockout message inline on login page"
```

---

## Task 5: Admin Users page (`/admin/users`)

**Files:**
- Create: `frontend/src/pages/AdminUsersPage.tsx`
- Create: `frontend/src/hooks/useAdminUsers.ts`
- Create: `frontend/src/api/adminUsers.ts`
- Create: `frontend/src/types/adminUser.ts`
- Create: `frontend/src/test/AdminUsersPage.test.tsx`
- Modify: `frontend/src/router/index.tsx`

**Target (Quiet design):**
- `<PageHead title="Users" subtitle="{totalElements} users" actions={<Button variant="contained">Create user</Button>} />`
- Filter row: role Select (`all | admin | editor | engineer | viewer`) + active toggle
- Table columns: Name / Email / Role chip / Engineer chip / Division / Status / Actions
- Row status must distinguish three states, because they are three different states:
  **Active**, **Inactive**, **Awaiting activation** (`requiresActivation`), plus a **Locked** badge
  when `lockedUntil` is in the future
- Dialogs: Create · Edit · Set password · Deactivate confirmation

- [ ] **Step 1: Write failing integration test**

```tsx
it('renders users table from a paged response', async () => {
  mockUseAdminUsers.mockReturnValue({
    data: {
      content: [{ id: 'u1', name: 'Alice', email: 'a@x.com', role: 'editor',
                  active: true, requiresActivation: false, engineer: false,
                  divisionId: null, lockedUntil: null }],
      totalElements: 1, totalPages: 1, number: 0, size: 50,
    },
  })
  render(<AdminUsersPage />)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('editor')).toBeInTheDocument()
})

it('sends is_active as a snake_case query param', async () => {
  // toggle the active filter, assert api.get called with params { is_active: false }
})
```

- [ ] **Step 2: Create `adminUser.ts` type/schema**

```ts
export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'engineer', 'viewer']),
  divisionId: z.string().uuid().nullable(),
  active: z.boolean(),              // NOT isActive — see the contract section
  requiresActivation: z.boolean(),
  engineer: z.boolean(),
  lockedUntil: z.string().nullable(),
})

export const AdminUserPageSchema = z.object({
  content: z.array(AdminUserSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number(),
  size: z.number(),
})
```

- [ ] **Step 3: Create `api/adminUsers.ts` + `useAdminUsers.ts` hooks**

Map filters to snake_case explicitly, the way `api/svod.ts` already does:

```ts
export async function getAdminUsers(filters: { role?: string; isActive?: boolean; page?: number }) {
  const params: Record<string, unknown> = { page: filters.page ?? 0, size: 50 }
  if (filters.role !== undefined) params.role = filters.role          // lowercase: 'editor'
  if (filters.isActive !== undefined) params.is_active = filters.isActive
  const response = await api.get<ApiResponse<unknown>>('/admin/users', { params })
  return AdminUserPageSchema.parse(response.data.data)
}
```

Mutations: `useCreateAdminUser`, `useUpdateAdminUser`, `useSetUserPassword`, `useActivateUser`,
`useDeactivateUser`. All invalidate `['admin-users']`. `useSetUserPassword` returns **204 with no
body** — do not parse a response.

- [ ] **Step 4: Implement `AdminUsersPage.tsx`**

Dialog details that follow from the backend contract:

- **Create** — `{ email, name, role, divisionId?, password? }`. Role options are admin/editor/viewer
  only; `engineer` is rejected with 422. `divisionId` is required for `editor` (it is what scopes
  their writes) and otherwise optional. Leaving `password` empty creates a **placeholder** — say so
  in the dialog, because that account cannot log in until a password is issued.
- **Edit** — `{ email, name, role, divisionId?, unlock? }`. Two things to get right:
  - Changing `email` changes the user's login identity and invalidates their current token. Warn in
    the dialog.
  - "Unlock account" must send `unlock: true`. Show it only when `lockedUntil` is in the future.
    An ordinary save deliberately does **not** unlock.
  - Setting `role: 'engineer'` on a user with `engineer === false` returns 422 — offer the engineer
    option only when the row is already an engineer.
- **Set password** — `PUT /admin/users/:id/password`, min 8 characters. This is the only way to make
  an activated placeholder usable, and the only password-reset path in MVP base. Surface it on any
  row, and prominently on rows with `requiresActivation`.
- **Activate** — `PUT /admin/users/:id/activate`, shown when `requiresActivation === true`. Pair it
  with the password action; on its own it does not produce a working login.
- **Deactivate** — confirmation dialog. On 409 render `error.message` from the envelope verbatim
  (`Engineer has active assignments: {id}`); do not hard-code the string, and do not assume the
  `Cannot delete:` prefix — that belongs to the division and branch guards.

- [ ] **Step 5: Add route — admin only guard**

Gate the route itself, not just the nav item, so a typed URL cannot reach the page. A non-admin
hitting `/admin/users` should be redirected rather than shown a page that 403s on every request.
Routes live in `frontend/src/router/index.tsx` and already wrap pages in
`components/layout/ProtectedRoute` — extend that with an optional required role rather than adding
a second guard mechanism.

- [ ] **Step 6: Run tests — expect PASS**
- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AdminUsersPage.tsx frontend/src/hooks/useAdminUsers.ts frontend/src/api/adminUsers.ts frontend/src/types/adminUser.ts frontend/src/test/AdminUsersPage.test.tsx frontend/src/router/index.tsx
git commit -m "feat: add Admin Users management page with create, edit, password, activate, deactivate"
```

---

## Task 6: Write-permission hooks

**Files:**
- Create: `frontend/src/hooks/useCanWrite.ts`
- Modify: affected page components and dialogs that contain write buttons

**Rule:** the API is the enforcement point (403); the UI disables buttons proactively so users do
not fire requests that cannot succeed. Two distinct predicates are needed — collapsing them into one
would wrongly disable records/repairs editing for engineers, which the backend explicitly allows.

```ts
// Object metadata, equipment, travel, assignments: admin anywhere, editor in own division.
export function useCanWrite(targetDivisionId?: string | null): boolean {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'admin') return true
  if (user?.role === 'editor') return user.divisionId === targetDivisionId
  return false
}

// Records and repairs additionally allow the engineer assigned to the object (TOR §12) —
// mirrors RbacService.requireCanEditObjectData on the server.
export function useCanEditObjectData(
  targetDivisionId?: string | null,
  assignedToMe?: boolean
): boolean {
  const user = useAuthStore((s) => s.user)
  if (useCanWrite(targetDivisionId)) return true
  return user?.engineer === true && assignedToMe === true
}
```

`assignedToMe` comes from the object's engineer list (`GET /objects/:id/engineers`), which the
engineer may read for their own objects.

- [ ] **Step 1: Write tests for both hooks**

```ts
it('returns true for admin regardless of division', () => { /* … */ })
it('returns false for editor with different division', () => { /* … */ })
it('allows an assigned engineer to edit records', () => {
  mockAuthStore({ user: { role: 'engineer', engineer: true, divisionId: null } })
  expect(useCanEditObjectData('div-b', true)).toBe(true)
})
it('refuses an engineer on an object they are not assigned to', () => { /* … */ })
```

- [ ] **Step 2: Apply `useCanWrite` to**
  - `ObjectDetailPage.tsx` — "Edit object", "Add equipment", travel save
  - `DivisionDetailPage.tsx` / `BranchDetailPage.tsx` — edit buttons, and the new **Delete** buttons
    if surfaced (admin only; 409 when non-empty — render `error.message` verbatim)
  - Engineer assignment dialogs — `POST /objects/:id/engineers`

- [ ] **Step 3: Apply `useCanEditObjectData` to**
  - `components/records/RecordsTab.tsx`
  - `components/repairs/RepairsTab.tsx`

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useCanWrite.ts frontend/src/pages/ frontend/src/components/
git commit -m "feat: gate write actions by role, division and object assignment"
```

---

## Task 7: Engineer read scoping in the UI

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/api/axios.ts` or a shared error helper
- Modify: `frontend/src/pages/ObjectDetailPage.tsx`

> This task exists because the backend now enforces TOR §12 on reads. `DashboardPage` currently
> calls `useDivisionsAggregation` and `useCoverageGaps` unconditionally — **an engineer logging in
> today would land on a page firing two 403s**, and the frontend has no 403 handling at all.

**Rules:**
- List endpoints (`/objects`, `/svod`, `/engineers`) need **no client change** — they return 200
  with the engineer's rows already filtered out server-side. Do not add client-side filtering.
- Organisation rollups return 403 for engineers: do not call them for that role.
- Detail routes return 403 for objects the engineer is not assigned to.

- [ ] **Step 1: Write failing tests**

```tsx
it('does not call aggregation endpoints for engineer role', () => {
  mockAuthStore({ user: { role: 'engineer' } })
  render(<DashboardPage />)
  expect(mockApi.get).not.toHaveBeenCalledWith('/aggregations/divisions')
  expect(mockApi.get).not.toHaveBeenCalledWith('/coverage/gaps', expect.anything())
})

it('renders an access-denied state instead of a crash on 403', async () => {
  mockUseObject.mockReturnValue({ isError: true, error: { response: { status: 403 } } })
  render(<ObjectDetailPage />)
  expect(await screen.findByText(/permission/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Give the engineer role its own dashboard content** — own workload
      (`GET /engineers/:id/summary` for their own id) and their assigned objects
      (`GET /engineers/:id/objects`), in place of the division rollup and coverage-gap panels.
      Gate the rollup queries with TanStack Query's `enabled` so they are never issued for engineers.
- [ ] **Step 3: Add a shared 403 presentation** — a small "You don't have permission to view this"
      state for detail pages, rendering `error.message` from the envelope. Retry and toast behaviour
      already suit this and need no change: `App.tsx:12` does not retry 4xx, and the Axios
      interceptor toasts only 5xx and network errors, re-throwing 4xx to the caller.
- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/ObjectDetailPage.tsx frontend/src/api/
git commit -m "feat: scope engineer dashboard to own workload and handle 403 on detail pages"
```

---

## Task 8: Engineer self-service read-only view

**Files:**
- Modify: `frontend/src/pages/EngineerListPage.tsx`
- Modify: `frontend/src/pages/EngineerDetailPage.tsx`

**Rule:** `GET /engineers` returns only the caller's own row for the `engineer` role, so the page
must read well with a single row. Write actions ("Create engineer", "Edit") are admin only.
`GET /engineers/:id` and its sub-routes 403 for anyone else's id, so an engineer must not be offered
navigation into another engineer's detail page.

- [ ] **Step 1: Hide write actions for non-admin roles** — `EngineerListPage.tsx:106`
      ("Create engineer") is currently unconditional
- [ ] **Step 2: Verify the single-row layout** — no empty-state flash, no "0 of 1" pagination oddity
- [ ] **Step 3: Run existing tests — all pass**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EngineerListPage.tsx frontend/src/pages/EngineerDetailPage.tsx
git commit -m "feat: hide engineer write actions for non-admin roles"
```

---

## Task 9: Run quality gates and push

- [ ] **Step 1:**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass.

- [ ] **Step 2: Rebuild the stack and run E2E** — the backend changed, so stale images would test old
      code (see `CONTRIBUTING.md`)

```bash
docker compose -f docker-compose.poc.yml up --build
cd frontend && npx playwright test
```

- [ ] **Step 3: Push**

```bash
git push -u origin feature/mvp-m02-rbac-frontend
```

---

## Final Scope Checklist

- [ ] `engineer` flag exposed on the auth payload and parsed by `UserSchema`
- [ ] `divisionId` survives `UserSchema.parse` and reaches the store (no JWT decoding)
- [ ] Axios interceptor retries a request once after token refresh on 401
- [ ] Interceptor redirects to `/login` when the refresh token is invalid, without looping
- [ ] `/admin/users` nav item and route both admin-gated
- [ ] Rollup nav hidden for the engineer role
- [ ] Login page shows the server's lockout message inline
- [ ] `/admin/users` page reads the paged envelope and filters with `role` / `is_active`
- [ ] Admin Users table distinguishes active / inactive / awaiting activation / locked
- [ ] Create supports the placeholder path; "Set password" makes a placeholder usable
- [ ] "Unlock account" sends `unlock: true`; a plain edit does not unlock
- [ ] `useCanWrite` false for editor on out-of-division objects
- [ ] `useCanEditObjectData` true for an assigned engineer on records/repairs
- [ ] Engineer dashboard shows own workload; no `/aggregations` or `/coverage` calls for that role
- [ ] 403 renders an access-denied state, not a crash or a retry loop
- [ ] Engineer role sees no write buttons in the engineer list
- [ ] All tests pass, lint clean, TypeScript 0 errors, E2E green against a rebuilt stack

## Corrections Applied (2026-08-15)

This plan was written before the backend was implemented and assumed several contract details that
turned out differently. Verified against `feature/mvp-m02-rbac-backend` and corrected:

1. **JWT `divisionId` claim does not exist** — it is `division_id`. Replaced JWT decoding with
   `UserSchema` fields from the login payload, which already carries `role` and `divisionId`.
   The original approach failed silently and its planned test could not have caught it.
2. **Engineer 403s on the dashboard** — `/aggregations/*` and `/coverage/gaps` are now denied to the
   engineer role, and `DashboardPage` calls both. New Task 7.
3. **`GET /admin/users` returns a Spring `Page`**, not an array; the hook and its test assumed a list.
4. **Filter params are snake_case** (`is_active`); the plan sent `isActive`, which is ignored — the
   toggle would have appeared to work while returning unfiltered data.
5. **`AdminUserDto` exposes `active`, not `isActive`** — a required-field Zod parse would have thrown
   on every row. `EngineerDto` does use `isActive`, so the two differ.
6. **Unlock is opt-in** (`unlock: true`); an ordinary edit deliberately leaves a lockout in place.
7. **`PUT /admin/users/:id/password` was added during implementation** and is required for the
   placeholder flow — activation alone does not produce a usable login.
8. **409 message is `Engineer has active assignments: {id}`**, not the `Cannot delete:` wording,
   which belongs to the division and branch guards.
9. **`useCanWrite` alone was wrong for records/repairs** — the backend lets an assigned engineer edit
   them. Split into `useCanWrite` and `useCanEditObjectData`.
10. **`role` no longer implies engineer status** — an engineer may hold the editor or admin role.
    Task 1 adds the `engineer` flag to the auth payload so the UI can tell.

## References

- `docs/impl/epics/mvp-m02-auth.md`
- `docs/TOR_Workload_WebApp.md §12, §21`
- `docs/impl/api-spec.md §"User Administration"`
- `docs/superpowers/plans/ws-c-01-mvp-m02-rbac-backend.md` §"Verification Notes"
- `design/design_handoff_workload_light/README.md §"Screen specs"`
