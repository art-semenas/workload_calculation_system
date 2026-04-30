# WS-C Step 4 — MVP M-04/M-05: Catalog Management Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Enable admin write access to the device and repair type catalogs in the UI. Upgrade the existing read-only `CatalogPage` (from WS-A step 4) to support admin create/edit/delete of device types, system contexts, and repair types. Apply all Quiet design patterns.

**Branch:** `feature/mvp-m04-m05-catalog-frontend`
**Depends on:** `feature/mvp-m04-m05-catalog-backend` merged; `feature/design-quiet-step4-new-pages` merged (for the base `CatalogPage`)
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m04-m05-engineers-catalog.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m04-m05-engineers-catalog.md` — scope, ACs, UI screens
2. `design/design_handoff_workload_light/README.md §"Screen 8"` — Catalog page layout spec
3. `docs/TOR_Workload_WebApp.md §4.2, §4.5` — business rules for catalog management
4. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m04-m05-catalog-frontend
```

---

## Task 1: Update catalog API hooks for write operations

**Files:**
- Modify: `frontend/src/hooks/useCatalog.ts` (or create `useCatalogMutations.ts`)
- Modify: `frontend/src/types/catalog.ts`

- [ ] **Step 1: Add mutation hooks**

```ts
export function useCreateDeviceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/catalog/devices', data).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] })
  })
}

export function useUpdateDeviceType() { /* PUT /catalog/devices/:id */ }
export function useDeleteDeviceType() { /* DELETE /catalog/devices/:id */ }
export function useCreateContext() { /* POST /catalog/devices/:id/contexts */ }
export function useUpdateContext() { /* PUT /catalog/devices/:id/contexts/:cid */ }
export function useDeleteContext() { /* DELETE /catalog/devices/:id/contexts/:cid */ }
export function useCreateRepairType() { /* POST /catalog/repairs */ }
export function useUpdateRepairType() { /* PUT /catalog/repairs/:id */ }
export function useDeleteRepairType() { /* DELETE /catalog/repairs/:id */ }
```

- [ ] **Step 2: Update `catalog.ts` schemas to include context CRUD fields**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/ frontend/src/types/catalog.ts
git commit -m "feat: add catalog write mutation hooks for device types, contexts, and repair types"
```

---

## Task 2: Device type create/edit dialogs

**Files:**
- Create: `frontend/src/components/dialogs/DeviceTypeDialog.tsx`
- Create: `frontend/src/test/DeviceTypeDialog.test.tsx`

**Target:**
- 560px dialog, Quiet style
- Eyebrow "Device type" + h1 "Create device type" or "Edit device type"
- Fields: Name (required), Description (optional)
- On 409: inline warning `"A device type with this name already exists"`
- Footer: Cancel + "Create" / "Save"

- [ ] **Step 1: Write failing tests**

```tsx
it('creates device type on submit', async () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 'dt1', name: 'My Device' })
  // render dialog, fill name, submit
  expect(mockCreate).toHaveBeenCalledWith({ name: 'My Device' })
})

it('shows inline error on 409 duplicate name', async () => {
  mockCreate.mockRejectedValue({ response: { data: { error: { code: 409, message: 'Already exists' } } } })
  // submit
  expect(await screen.findByText('Already exists')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement `DeviceTypeDialog.tsx`**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dialogs/DeviceTypeDialog.tsx frontend/src/test/DeviceTypeDialog.test.tsx
git commit -m "feat: add DeviceTypeDialog for create/edit device types"
```

---

## Task 3: System context create/edit dialogs

**Files:**
- Create: `frontend/src/components/dialogs/ContextDialog.tsx`
- Create: `frontend/src/test/ContextDialog.test.tsx`

**Target:**
- Fields: System type (Select: OS / PS / Video), R1 minutes (number, required), R2 minutes (number, required)
- On 409: inline `"A context for this system type already exists"`

- [ ] **Step 1: Write failing test**

```tsx
it('submits context with systemType and normatives', async () => {
  // open for deviceId='dt1'
  // select system type OS
  // fill R1=10, R2=5
  // submit → expect mutation called with { systemType:'OS', r1Minutes:10, r2Minutes:5 }
})
```

- [ ] **Step 2: Implement `ContextDialog.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dialogs/ContextDialog.tsx frontend/src/test/ContextDialog.test.tsx
git commit -m "feat: add ContextDialog for create/edit device system contexts"
```

---

## Task 4: Upgrade `CatalogPage` device detail panel with admin actions

**Files:**
- Modify: `frontend/src/pages/CatalogPage.tsx`

**Changes (admin only, using `useCanWrite()`):**
- Add "Create device type" button in master rail header (admin only)
- Add "Edit" and "Delete" action buttons per device row in master rail (admin only)
- Add "Add context" button in detail panel (admin only)
- Add "Edit" and "Delete" per context row (admin only)
- Delete confirmation dialogs for device types and contexts
- Show 409 error inline when delete is blocked

- [ ] **Step 1: Write failing tests**

```tsx
it('shows Create device type button for admin', () => {
  mockAuthStore({ role: 'admin' })
  render(<CatalogPage />)
  expect(screen.getByRole('button', { name: /create device type/i })).toBeInTheDocument()
})

it('hides write buttons for viewer', () => {
  mockAuthStore({ role: 'viewer' })
  render(<CatalogPage />)
  expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Implement**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CatalogPage.tsx
git commit -m "feat: add admin write actions to CatalogPage — create/edit/delete device types and contexts"
```

---

## Task 5: Repair types page with admin management

**Files:**
- Create: `frontend/src/pages/CatalogRepairsPage.tsx` (or extend `CatalogPage` with a tab)
- Create: `frontend/src/components/dialogs/RepairTypeDialog.tsx`
- Create: `frontend/src/test/CatalogRepairsPage.test.tsx`
- Modify: `frontend/src/router.tsx` (add `/catalog/repairs` route if separate page)

**Target:**
- List of repair types: Name / Time (minutes) / Usage count / Edit · Delete (admin only)
- "Create repair type" button (admin only)
- `RepairTypeDialog`: Name (required), Time minutes (number, required)
- Delete shows 409 guard message inline when in use

- [ ] **Step 1: Write failing test**

```tsx
it('lists repair types', async () => {
  mockUseCatalogRepairs.mockReturnValue({ data: [{ id: 'r1', name: 'Ремонт ОС', timeMinutes: 30 }] })
  render(<CatalogRepairsPage />)
  expect(await screen.findByText('Ремонт ОС')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement page, dialog, route**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CatalogRepairsPage.tsx frontend/src/components/dialogs/RepairTypeDialog.tsx frontend/src/test/CatalogRepairsPage.test.tsx frontend/src/router.tsx
git commit -m "feat: add Catalog Repairs page with admin create/edit/delete repair types"
```

---

## Task 6: Run quality gates and push

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
git push -u origin feature/mvp-m04-m05-catalog-frontend
```

---

## Final Scope Checklist

- [ ] Device type create/edit/delete — admin only (write buttons hidden for other roles)
- [ ] System context create/edit/delete — admin only
- [ ] Repair type create/edit/delete — admin only
- [ ] 409 conflict errors shown inline in dialogs (not toast) per error handling spec
- [ ] Delete confirmation dialog for all destructive actions
- [ ] Device catalog and repair catalog accessible from sidebar navigation
- [ ] AC-04: Admin can create device type, add context, assign to object — СВОД recalculates
- [ ] AC-06: Context delete returns 409 in UI when assignments exist
- [ ] All tests pass, lint clean, TypeScript 0 errors

## References

- `docs/impl/epics/mvp-m04-m05-engineers-catalog.md`
- `design/design_handoff_workload_light/README.md §"Screen 8"`
- `docs/impl/api-spec.md §"Catalog management endpoints"`
