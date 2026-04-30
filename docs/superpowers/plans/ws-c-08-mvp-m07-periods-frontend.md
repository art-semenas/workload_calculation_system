# WS-C Step 8 — MVP M-07: Planning Periods Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add the Planning Periods admin management page (`/admin/periods`). Update СВОД page with a period selector dropdown. Show "no active period" warning on Object Detail Records and Repairs tabs. Make all data entry read-only when viewing a past period.

**Branch:** `feature/mvp-m07-periods-frontend`
**Depends on:** `feature/mvp-m07-periods-backend` merged; `feature/design-quiet-step3-existing-pages` merged
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m07-periods.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m07-periods.md §"UI Screens Required"` — screen specs
2. `docs/TOR_Workload_WebApp.md §4.12` — period rules and read-only enforcement
3. `design/design_handoff_workload_light/README.md` — Quiet design patterns
4. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m07-periods-frontend
```

---

## Task 1: Period types, hooks, and active period store

**Files:**
- Create: `frontend/src/types/period.ts`
- Create: `frontend/src/hooks/usePeriods.ts`
- Modify: `frontend/src/stores/uiStore.ts`

- [ ] **Step 1: Create period types**

```ts
export const PeriodSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: z.string(), // ISO date
  endDate: z.string(),
  isActive: z.boolean(),
})
export type Period = z.infer<typeof PeriodSchema>
```

- [ ] **Step 2: Create period hooks**

```ts
export function useAdminPeriods() {
  return useQuery({ queryKey: ['periods'], queryFn: () => api.get('/admin/periods').then(r => r.data.data) })
}

export function useActivePeriod() {
  return useQuery({ queryKey: ['periods', 'active'], queryFn: () => api.get('/admin/periods/active').then(r => r.data.data) })
}

export function useCreatePeriod() { /* POST /admin/periods */ }
export function useActivatePeriod() { /* PUT /admin/periods/:id/activate */ }
```

- [ ] **Step 3: Add `selectedPeriodId` to `uiStore.ts`**

```ts
// In uiStore:
selectedPeriodId: string | null,
setSelectedPeriodId: (id: string | null) => void,
```

Default: `null` (means "use active period").

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/period.ts frontend/src/hooks/usePeriods.ts frontend/src/stores/uiStore.ts
git commit -m "feat: add period types, hooks, and selectedPeriodId to UI store"
```

---

## Task 2: Admin Periods management page

**Files:**
- Create: `frontend/src/pages/AdminPeriodsPage.tsx`
- Create: `frontend/src/test/AdminPeriodsPage.test.tsx`
- Modify: `frontend/src/router.tsx`

**Target (Quiet design, admin only):**
- `<PageHead title="Planning Periods" actions={<Button variant="contained">Create period</Button>} />`
- Table columns: Name / Start date / End date / Status chip (Active = filled green, Inactive = ghost) / Actions (Activate)
- "Create period" dialog: Name (e.g. "H2 2025"), Start date, End date
- "Activate" button per row — shows confirmation: "Activating this period will deactivate the currently active period."
- Active period row highlighted subtly (no color chips in data — use status chip in Status column only)

- [ ] **Step 1: Write failing tests**

```tsx
it('lists periods with status chips', async () => {
  mockUseAdminPeriods.mockReturnValue({
    data: [{ id: 'p1', name: 'H1 2025', isActive: true }, { id: 'p2', name: 'H2 2025', isActive: false }]
  })
  render(<AdminPeriodsPage />)
  expect(await screen.findByText('H1 2025')).toBeInTheDocument()
  expect(screen.getByText('Active')).toBeInTheDocument()
})

it('shows create period dialog on button click', async () => {
  render(<AdminPeriodsPage />)
  await userEvent.click(screen.getByRole('button', { name: /create period/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement `AdminPeriodsPage.tsx`**
- [ ] **Step 3: Add route (admin only)**

```tsx
{role === 'admin' && <Route path="/admin/periods" element={<AdminPeriodsPage />} />}
```

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminPeriodsPage.tsx frontend/src/test/AdminPeriodsPage.test.tsx frontend/src/router.tsx
git commit -m "feat: add Admin Periods management page with create and activate"
```

---

## Task 3: СВОД period selector

**Files:**
- Modify: `frontend/src/pages/SvodPage.tsx`
- Modify: `frontend/src/hooks/useSvod.ts`

**Target:**
- Period selector dropdown in filter row (above table). Options: all periods in reverse chronological order. Default: active period.
- When a non-active (historical) period is selected: table shows historical data; "Пересчитать" button disabled and tooltip "Recalculation is only available for the active period"
- Pass `?periodId=` to `GET /svod` when a non-default period is selected

- [ ] **Step 1: Write failing tests**

```tsx
it('shows period selector with active period selected by default', async () => {
  mockUseActivePeriod.mockReturnValue({ data: { id: 'p1', name: 'H1 2025', isActive: true } })
  render(<SvodPage />)
  expect(await screen.findByDisplayValue('H1 2025')).toBeInTheDocument()
})

it('disables Пересчитать when historical period selected', async () => {
  // select non-active period
  // verify recalculate button is disabled
})
```

- [ ] **Step 2: Implement**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SvodPage.tsx frontend/src/hooks/useSvod.ts
git commit -m "feat: add period selector to СВОД page with historical period support"
```

---

## Task 4: Object Detail — period scoping and read-only indicators

**Files:**
- Modify: `frontend/src/pages/ObjectDetailPage.tsx`

**Target:**
- Records tab and Repairs tab: show active period label above form (e.g. "Period: H1 2025")
- When active period is present: data entry enabled as normal
- When no active period: show warning banner `"Data entry is blocked. Ask your administrator to activate a planning period."` and disable all save buttons on Records and Repairs tabs
- When viewing historical data (not yet in PoC but prepare the hook for `?periodId=` param support)

- [ ] **Step 1: Write failing tests**

```tsx
it('shows no active period warning and disables save', async () => {
  mockUseActivePeriod.mockReturnValue({ data: null, error: { response: { status: 404 } } })
  render(<ObjectDetailPage />)
  await userEvent.click(screen.getByRole('tab', { name: /records/i }))
  expect(await screen.findByText(/Data entry is blocked/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

it('shows period label when active period exists', async () => {
  mockUseActivePeriod.mockReturnValue({ data: { id: 'p1', name: 'H1 2025', isActive: true } })
  render(<ObjectDetailPage />)
  await userEvent.click(screen.getByRole('tab', { name: /records/i }))
  expect(await screen.findByText('H1 2025')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ObjectDetailPage.tsx
git commit -m "feat: add period label and no-active-period warning to Object Detail Records/Repairs tabs"
```

---

## Task 5: Add Periods to admin navigation

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1:** Add `<NavItem to="/admin/periods" label="Periods" />` under the admin section (admin only)
- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "feat: add Planning Periods link to admin navigation"
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
git push -u origin feature/mvp-m07-periods-frontend
```

---

## Final Scope Checklist

- [ ] `Period` TypeScript type with Zod schema
- [ ] `useAdminPeriods`, `useActivePeriod`, `useCreatePeriod`, `useActivatePeriod` hooks
- [ ] `selectedPeriodId` in `uiStore` for СВОД period selection
- [ ] `/admin/periods` page: list, create, activate (admin only)
- [ ] СВОД period selector: all periods in reverse order, defaults to active
- [ ] СВОД "Пересчитать" button disabled when historical period selected
- [ ] СВОД passes `?periodId=` to API when non-default period selected
- [ ] Object Detail Records/Repairs tabs show period label
- [ ] Object Detail shows warning and disables saves when no active period (AC-32)
- [ ] Periods link in admin navigation
- [ ] AC-30 covered by admin periods page activate flow
- [ ] All tests pass, lint clean, TypeScript 0 errors

## References

- `docs/impl/epics/mvp-m07-periods.md §"UI Screens Required"`
- `docs/TOR_Workload_WebApp.md §4.12`
