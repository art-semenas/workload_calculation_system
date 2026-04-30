# WS-C Step 2 — MVP M-02: RBAC Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement the RBAC-aware frontend: JWT access token auto-refresh via Axios interceptor, role-based navigation (hide admin-only menu items from non-admins), admin Users management page (`/admin/users`), account lockout error handling on login, and division-scoped write access enforcement in editor role (disable write buttons for out-of-scope resources). Follows Quiet design from WS-A.

**Branch:** `feature/mvp-m02-rbac-frontend`
**Depends on:** `feature/mvp-m02-rbac-backend` merged to `feature/implementation`; `feature/design-quiet-step2-components` merged (for `<PageHead>`, `<KPIRow>`)
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m02-auth.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m02-auth.md` — scope, ACs, role matrix, UI screens
2. `docs/TOR_Workload_WebApp.md §12` — RBAC role definitions
3. `docs/TOR_Workload_WebApp.md §21` — JWT flow, refresh token behavior, lockout UX
4. `design/design_handoff_workload_light/README.md` — Quiet design patterns for new pages
5. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass

**Frontend role rules:**
- `admin` — sees all navigation, all write buttons enabled
- `editor` — sees all nav except `/admin/users`; write buttons disabled for out-of-division objects
- `engineer` — read-only, no write buttons; `GET /engineers` returns only own row
- `viewer` — read-only, no write buttons

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m02-rbac-frontend
```

---

## Task 1: Update auth store with role and token refresh

**Files:**
- Modify: `frontend/src/stores/authStore.ts`
- Modify: `frontend/src/api/axios.ts`

**Changes:**
- Auth store must expose `role: 'admin' | 'editor' | 'engineer' | 'viewer' | null`
- Decode role from JWT payload on login and token refresh
- Axios interceptor: on 401, attempt `POST /auth/refresh` once before redirecting to `/login`. If refresh succeeds, retry the original request. If refresh fails, call `authStore.logout()` and redirect.

- [ ] **Step 1: Write failing tests**

```ts
it('decodes role from JWT on login', () => {
  // mock JWT with role=editor in payload
  // verify authStore.role === 'editor' after setToken
})

it('retries request after successful token refresh on 401', async () => {
  // first call returns 401
  // POST /auth/refresh returns new access token
  // original request retried with new token → succeeds
  // verify original API response returned to caller
})

it('redirects to /login when refresh fails', async () => {
  // first call returns 401
  // POST /auth/refresh returns 401
  // verify logout called and redirect to /login
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Update `authStore.ts`**

Add `role` field. Decode JWT payload on `setToken(token)`:

```ts
import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  sub: string
  role: 'admin' | 'editor' | 'engineer' | 'viewer'
  divisionId?: string
  exp: number
}

// In setToken:
const decoded = jwtDecode<JwtPayload>(token)
set({ token, role: decoded.role, divisionId: decoded.divisionId ?? null })
```

Also expose `divisionId: string | null` for editor scope checks.

- [ ] **Step 4: Update Axios interceptor in `axios.ts`**

On 401:
1. If a refresh is already in progress, queue the request
2. Call `POST /auth/refresh` (no auth header — uses cookie)
3. On success: update `authStore` token, retry queued requests
4. On failure: `authStore.logout()`, `window.location.href = '/login'`

- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/authStore.ts frontend/src/api/axios.ts
git commit -m "feat: add role/divisionId to auth store and token refresh retry in Axios interceptor"
```

---

## Task 2: Role-aware navigation

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Rules:**
- `/admin/users` nav item — visible only to `admin`
- Write-path nav items (Create object, Create engineer) — visible to `admin` and `editor`
- All other nav items visible to all authenticated roles

- [ ] **Step 1: Write failing test**

```tsx
it('hides /admin/users link for editor role', () => {
  mockAuthStore({ role: 'editor' })
  render(<AppLayout />)
  expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument()
})

it('shows /admin/users link for admin role', () => {
  mockAuthStore({ role: 'admin' })
  render(<AppLayout />)
  expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement role-gated nav items**

Add a `useAuthStore()` call in `AppLayout`. Conditionally include nav items based on `role`:

```tsx
const { role } = useAuthStore()
// ...
{role === 'admin' && <NavItem to="/admin/users" label="Users" />}
```

- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "feat: hide admin-only nav items based on role from auth store"
```

---

## Task 3: Login page — lockout error handling

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

**Spec:** When login returns HTTP 401 with lockout message `"Account locked. Try again after {time}."`, display the message inline below the form (not a generic "wrong credentials" error).

- [ ] **Step 1: Write failing test**

```tsx
it('shows lockout message when account is locked', async () => {
  mockLoginApi.mockRejectedValue({
    response: { status: 401, data: { error: { message: 'Account locked. Try again after 14:32.' } } }
  })
  render(<LoginPage />)
  // fill email and password, submit
  expect(await screen.findByText(/Account locked/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Update `LoginPage.tsx` login handler**

Differentiate lockout (message contains "locked") from invalid credentials. Show lockout message as a persistent `<Alert severity="warning">` — not dismissible, not auto-fading.

- [ ] **Step 3: Run test — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: display account lockout message inline on login page"
```

---

## Task 4: Admin Users page (`/admin/users`)

**Files:**
- Create: `frontend/src/pages/AdminUsersPage.tsx`
- Create: `frontend/src/hooks/useAdminUsers.ts`
- Create: `frontend/src/types/adminUser.ts`
- Create: `frontend/src/test/AdminUsersPage.test.tsx`
- Modify: `frontend/src/router.tsx`

**Target (Quiet design):**
- `<PageHead title="Users" subtitle="{N} users" actions={<Button variant="contained">Create user</Button>} />`
- Filter row: role Select (`all | admin | editor | engineer | viewer`) + is_active toggle
- Table columns: Name / Email / Role chip / Division (editor only) / Status (active/inactive) / Actions (Edit · Deactivate)
- "Create user" dialog: name, email, role (admin/editor/viewer — not engineer), divisionId (required for editor role only)
- "Edit user" dialog: same fields + admin-only "Unlock account" button (sets `locked_until = null`)
- "Activate placeholder" button shown when `requires_activation = true`
- Deactivate confirmation dialog with "Cannot delete: engineer has active assignments" guard

- [ ] **Step 1: Write failing integration test**

```tsx
it('renders users table with role filters', async () => {
  mockUseAdminUsers.mockReturnValue({
    data: { users: [{ id: 'u1', name: 'Alice', email: 'a@x.com', role: 'editor', isActive: true }] }
  })
  render(<AdminUsersPage />)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('editor')).toBeInTheDocument()
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
  isActive: z.boolean(),
  requiresActivation: z.boolean(),
  lockedUntil: z.string().nullable(),
})
```

- [ ] **Step 3: Create `useAdminUsers.ts` hooks**

```ts
export function useAdminUsers(filters?: { role?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => api.get('/admin/users', { params: filters }).then(r => r.data.data)
  })
}

export function useCreateAdminUser() { /* mutation */ }
export function useUpdateAdminUser() { /* mutation */ }
export function useActivateUser() { /* mutation */ }
export function useDeactivateUser() { /* mutation */ }
```

- [ ] **Step 4: Implement `AdminUsersPage.tsx`**

Use `<PageHead>`, `<SectionBlock>`, MUI `Table`. Include create/edit/activate/deactivate dialogs.

- [ ] **Step 5: Add route — admin only guard**

```tsx
// In router.tsx:
{role === 'admin' && <Route path="/admin/users" element={<AdminUsersPage />} />}
// or use a ProtectedRoute wrapper that checks role
```

- [ ] **Step 6: Run tests — expect PASS**
- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AdminUsersPage.tsx frontend/src/hooks/useAdminUsers.ts frontend/src/types/adminUser.ts frontend/src/test/AdminUsersPage.test.tsx frontend/src/router.tsx
git commit -m "feat: add Admin Users management page with create, edit, activate, deactivate"
```

---

## Task 5: Editor division-scoped write access

**Files:**
- Modify: affected page components and dialogs that contain write buttons

**Rule:** For `editor` role, write operations (PUT, DELETE, POST) on objects not in `authStore.divisionId` must be disabled. This is enforced at the API level (HTTP 403), but the UI should also disable the write buttons proactively to avoid failed requests.

**Helper hook:**

```ts
// frontend/src/hooks/useCanWrite.ts
export function useCanWrite(targetDivisionId?: string | null): boolean {
  const { role, divisionId } = useAuthStore()
  if (role === 'admin') return true
  if (role === 'editor') return divisionId === targetDivisionId
  return false
}
```

- [ ] **Step 1: Create `useCanWrite` hook with tests**

```ts
it('returns true for admin regardless of division', () => {
  mockAuthStore({ role: 'admin', divisionId: 'div-a' })
  expect(useCanWrite('div-b')).toBe(true)
})

it('returns false for editor with different division', () => {
  mockAuthStore({ role: 'editor', divisionId: 'div-a' })
  expect(useCanWrite('div-b')).toBe(false)
})
```

- [ ] **Step 2: Apply `useCanWrite` to write buttons in**
  - `ObjectDetailPage.tsx` — "Edit object", "Add equipment", save buttons
  - `DivisionDetailPage.tsx` — "Edit division" button
  - `BranchDetailPage.tsx` — "Edit branch" button
  - Engineer assignment dialogs — `POST /objects/:id/engineers`

- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useCanWrite.ts frontend/src/pages/
git commit -m "feat: disable write buttons for editor role when object is outside assigned division"
```

---

## Task 6: Engineer self-service read-only view

**Files:**
- Modify: `frontend/src/pages/EngineerListPage.tsx`
- Modify: `frontend/src/hooks/useEngineers.ts`

**Rule:** `GET /engineers` returns only the current user's own row for `engineer` role. The page should work correctly with a single-row response. Write buttons (Create engineer, Edit) must not appear for engineer role.

- [ ] **Step 1: Verify `useEngineers` passes auth token (already done by Axios instance)**
- [ ] **Step 2: Hide write buttons for `engineer` and `viewer` roles**

```tsx
const { role } = useAuthStore()
const canWrite = role === 'admin'
// ...
{canWrite && <Button variant="contained">Create engineer</Button>}
```

- [ ] **Step 3: Run existing tests — all pass**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EngineerListPage.tsx
git commit -m "feat: hide engineer write actions for non-admin roles"
```

---

## Task 7: Run quality gates and push

- [ ] **Step 1:**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass.

- [ ] **Step 2: Push**

```bash
git push -u origin feature/mvp-m02-rbac-frontend
```

---

## Final Scope Checklist

- [ ] JWT role decoded from access token and stored in `authStore.role`
- [ ] `divisionId` decoded from JWT and stored in `authStore.divisionId`
- [ ] Axios interceptor retries request once after token refresh on 401
- [ ] Interceptor redirects to `/login` when refresh token is invalid
- [ ] `/admin/users` nav item visible only to `admin`
- [ ] Login page shows lockout message when `locked_until` is set
- [ ] `/admin/users` page: list, create, edit, activate, deactivate users
- [ ] `useCanWrite` hook returns false for editor on out-of-division objects
- [ ] Write buttons disabled for editor on out-of-division resources
- [ ] Engineer role sees no write buttons in engineer list
- [ ] All tests pass, lint clean, TypeScript 0 errors

## References

- `docs/impl/epics/mvp-m02-auth.md`
- `docs/TOR_Workload_WebApp.md §12, §21`
- `design/design_handoff_workload_light/README.md §"Screen specs"`
