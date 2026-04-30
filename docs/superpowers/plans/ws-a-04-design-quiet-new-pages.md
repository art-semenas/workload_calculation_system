# WS-A Step 4 — Quiet Design: New Pages + Polish

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add the three new screens that don't exist yet (`DivisionsListPage`, `CreateObjectDialog`, Device Catalog page), extend backend `DivisionDto` with metrics fields needed for the divisions list, and apply the final polish pass (sparklines hover-only, table row heights global check, color discipline audit).

**Branch:** `feature/design-quiet-step4-new-pages`
**Depends on:** `feature/design-quiet-step3-existing-pages` merged to `feature/implementation`
**Workstream:** A — Design

**Confirmed decisions:**
- Divisions list → extend backend `DivisionDto` (not client-side composite hook)
- Object Create → narrow dialog only: name + branchId + address
- Sparklines → hide if data not available

**Reference:** `design/design_handoff_workload_light/README.md` — screens 7 (Divisions list), 9 (Create object), 8 (Device catalog), 3b (Object list), additional screens 5b–5e, 6b, 11, 12

---

## Source-Of-Truth Alignment

1. `design/design_handoff_workload_light/README.md` — canonical screen specs
2. `docs/impl/api-spec.md` — existing endpoint contracts; `DivisionDto` extension must be backward-compatible
3. `docs/impl/db-schema.md` — no schema changes needed for divisions metrics (computed on-the-fly)
4. `CONTRIBUTING.md` — TDD mandatory; backend changes require `mvn verify`

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/design-quiet-step4-new-pages
```

---

## Task 1: Extend backend `DivisionDto` with metrics fields

**Files:**
- Modify: `backend/src/main/java/com/workload/dto/DivisionDto.java`
- Modify: `backend/src/main/java/com/workload/service/DivisionService.java`
- Modify: `backend/src/test/java/com/workload/service/DivisionServiceTest.java`

**Context:** The Divisions list page needs engineer count, required FTE, coverage gap, and utilisation per division. This is computed on-the-fly from `engineer_summaries` and `summaries` aggregations (same logic as `GET /aggregations/divisions`).

New fields added to `DivisionDto`:
```java
Long engineerCount         // count of users with role=engineer in this division
BigDecimal requiredFte     // SUM(summaries.itogo_chislo_with_travel) for objects in this division
Long coverageGap           // count of objects with 0 assigned engineers
BigDecimal utilisation     // SUM(engineer_summaries.total_load) / SUM(capacity_fte) for division engineers
```

These fields are nullable — return null when no data exists rather than blocking the response.

- [ ] **Step 1: Write failing service test**

Add test to `DivisionServiceTest`:
```java
@Test
void findAllIncludesMetricsFields() {
    // Given a division with objects and engineers
    // When findAll() is called
    // Then dto.requiredFte is not null
    // And dto.engineerCount is not null
}
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && mvn test -Dtest=DivisionServiceTest
```

- [ ] **Step 3: Update `DivisionDto` record**

Add the four new nullable fields to the record definition.

- [ ] **Step 4: Update `DivisionService.findAll()`**

Compute metrics by joining with `summaries` and `engineer_summaries`. Use existing aggregation repository methods if available, or add targeted `@Query` methods.

- [ ] **Step 5: Run test — expect PASS**

- [ ] **Step 6: Run full backend quality gate**

```bash
mvn spotless:apply && mvn verify
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/dto/DivisionDto.java backend/src/main/java/com/workload/service/DivisionService.java backend/src/test/java/com/workload/service/DivisionServiceTest.java
git commit -m "feat: extend DivisionDto with engineerCount, requiredFte, coverageGap, utilisation metrics"
```

---

## Task 2: Update frontend `DivisionSchema` and `useDivisions` hook

**Files:**
- Modify: `frontend/src/types/division.ts`
- Modify: `frontend/src/hooks/useDivisions.ts`

- [ ] **Step 1: Add new fields to `DivisionSchema`**

```ts
engineerCount: z.number().int().nullable().optional(),
requiredFte: z.number().nullable().optional(),
coverageGap: z.number().int().nullable().optional(),
utilisation: z.number().nullable().optional(),
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/division.ts
git commit -m "feat: extend DivisionSchema with metrics fields from updated backend DivisionDto"
```

---

## Task 3: `DivisionsListPage` — new divisions overview page

**Files:**
- Create: `frontend/src/pages/DivisionsListPage.tsx`
- Create: `frontend/src/test/DivisionsListPage.test.tsx`
- Modify: `frontend/src/router.tsx` (add `/divisions` route)

**Target (screen 7):**
- `<PageHead crumbs={[{label:'Workload',to:'/'},{label:'Divisions'}]} title="Divisions" subtitle="7 regional divisions · 2 935 objects · 204 engineers" actions={<Button variant="contained">Create division</Button>} />`
- `<KPIRow>` with: Divisions 7 / Total objects / Total engineers / Avg utilisation (warn delta if > 100%)
- `<SectionBlock label="All divisions">` containing 7-row table:
  - Columns: Code (mono, first 3 chars of name uppercase) / Division name / Head engineer (— if unavailable) / Objects / Engineers / FTE req. (`requiredFte`) / Gap (danger color if > 0, else `—`) / Utilisation `<CapBar>`
  - Row click → `/divisions/:id`
  - Render `—` for null/unavailable fields (never block render)
- Create division dialog: uses existing `DivisionCreateSchema` — single field (name), same as screen 11

- [ ] **Step 1: Write failing test**

```tsx
it('renders divisions table with metrics columns', async () => {
  mockUseDivisions.mockReturnValue({
    data: [{ id: 'd1', name: 'Brest', branchCount: 10, objectCount: 450,
             engineerCount: 32, requiredFte: 28.4, coverageGap: 3, utilisation: 0.88 }],
    isLoading: false,
  })
  renderPage()
  await waitFor(() => {
    expect(screen.getByText('Brest')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement `DivisionsListPage.tsx`**
- [ ] **Step 4: Add route to router**

```tsx
<Route path="/divisions" element={<DivisionsListPage />} />
```

Note: `/divisions/:id` route already exists.

- [ ] **Step 5: Run test — expect PASS**
- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/DivisionsListPage.tsx frontend/src/test/DivisionsListPage.test.tsx frontend/src/router.tsx
git commit -m "feat: add DivisionsListPage with metrics table, KPIRow, and create division dialog"
```

---

## Task 4: `CreateObjectDialog` refactor

**Files:**
- Create: `frontend/src/components/dialogs/CreateObjectDialog.tsx`
- Create: `frontend/src/test/CreateObjectDialog.test.tsx`
- Modify: `frontend/src/pages/ObjectListPage.tsx` — wire the new dialog

**Target (screen 9 — narrow form):**
- 560px MUI `Dialog`, `r-lg`, `1px var(--line-strong)` border
- Eyebrow "New object" (11/500 ink3) + h1 "Create object"
- Form fields (2-column grid layout):
  - Object name (full-width, required)
  - Branch select (full-width — `useBranches()` grouped by division, required)
  - Address (full-width, optional)
  - Tier (Select, disabled, label "coming soon" — future scope)
  - Travel norm (text, disabled — future scope)
  - Visits/year (text, disabled — future scope)
- Footer: hint left "Equipment & assignments are added after creation" + Cancel + "Create object"
- Schema: `ObjectCreateSchema` (`{ name, branchId, address? }`) — do not add new fields
- Mutation: existing `useCreateObject()` hook (or add if missing)

- [ ] **Step 1: Write failing test**

```tsx
it('submits with name and branchId', async () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 'new-obj' })
  // render dialog open, fill name, select branch, submit
  // verify mockCreate called with { name, branchId }
})

it('shows disabled future-scope fields', () => {
  render(<CreateObjectDialog open onClose={vi.fn()} />)
  expect(screen.getByLabelText(/tier/i)).toBeDisabled()
})
```

- [ ] **Step 2–5:** TDD cycle, then commit:

```bash
git add frontend/src/components/dialogs/CreateObjectDialog.tsx frontend/src/test/CreateObjectDialog.test.tsx frontend/src/pages/ObjectListPage.tsx
git commit -m "feat: add Quiet CreateObjectDialog with narrow schema and disabled future-scope fields"
```

---

## Task 5: Device Catalog page (`/catalog`)

**Files:**
- Create: `frontend/src/pages/CatalogPage.tsx`
- Create: `frontend/src/test/CatalogPage.test.tsx`
- Modify: `frontend/src/router.tsx` (add `/catalog` and `/catalog/:deviceId` routes)

**Target (screen 8):**
- **Master-detail layout** (380px master rail / 1fr detail)
- Master: section label "Device catalog" + search + scrollable list of device types
  - Each row: device name (left) + uses count (mono, right) + system tags below (11/ink4 plain text)
  - Selected row: `2px var(--ink)` left border + `bgElev` fill
- Detail panel: breadcrumb / h1 device name / "Used on N objects" meta
  - Section "Per-system norms": grid of cards, each: system chip (KEPT here — catalog detail only), R1 mono 24, R2 mono 24
  - Section "Normative history": borderless table: Effective date / R1 / R2 / Updated by / Note
- Use existing `useCatalog()`, `useCatalogDevice(id)` hooks (or add if missing)
- Read-only — no add/edit UI in PoC (S-03)

- [ ] **Step 1: Write failing test**

```tsx
it('renders device list in master rail', async () => {
  mockUseCatalog.mockReturnValue({ data: [{ id: 'dt1', name: 'Galaxy 512', usageCount: 42 }] })
  renderPage()
  await waitFor(() => expect(screen.getByText('Galaxy 512')).toBeInTheDocument())
})
```

- [ ] **Step 2–5:** TDD cycle, then commit:

```bash
git add frontend/src/pages/CatalogPage.tsx frontend/src/test/CatalogPage.test.tsx frontend/src/router.tsx
git commit -m "feat: add Device Catalog page with master-detail layout and per-system norm cards"
```

---

## Task 6: Object list page refinements (`/objects`)

**Files:**
- Modify: `frontend/src/pages/ObjectListPage.tsx`

**Target (screen 3b):**
- Filter row: search + division Select + tier Select (disabled — future scope) + branch Select + count meta right
- Table columns: ID (mono) / Object name / Division / Branch (mono ф-NNN) / Tier chip (Tier-1 solid, others ghost) / FTE (totals column, bold mono) / Engineers count / chevron →
- Row click → `/objects/:id`
- "Add object" button → `<CreateObjectDialog>` (from Task 4)

- [ ] **Step 1: Update ObjectListPage.tsx**
- [ ] **Step 2: Run tests**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ObjectListPage.tsx
git commit -m "refactor: apply Quiet design to Object List — filter row, tier chips, FTE column, CreateObjectDialog"
```

---

## Task 7: Final polish pass

**Files:**
- Multiple pages (targeted changes only)

**Polish checklist (from README §"Migration plan step 6"):**

- [ ] **Sparklines**: verify `.row-trend { opacity: 0 }` class applied to `<Spark>` cells in Dashboard division table and Engineers table. Verify columns hidden where no data (`DashboardPage` sparkline column already removed in step 3).
- [ ] **System-color chips audit**: grep for any remaining `ОС`, `ПС`, `Видео` colored chips in СВОД rows, Engineer rows, Object Detail tables. Replace with plain ink3 text.
- [ ] **Row height audit**: verify MUI `MuiTableRow` theme override gives 52px height across all tables. Spot-check in browser.
- [ ] **ИТОГО column**: verify no sunken background on ИТОГО Числ column in СВОД. Check `sx` props on that DataGrid column.
- [ ] **Avatars**: verify no `<Avatar>` renders in Engineer list rows (only sidebar user-chip and Engineer detail page).
- [ ] **Button heights**: verify primary/ghost buttons render at 32px height.

```bash
# Grep for any remaining color chips in table rows
grep -r "color=\"primary\"\|color=\"success\"\|color=\"warning\"\|color=\"error\"" frontend/src/pages/SvodPage.tsx frontend/src/pages/EngineerListPage.tsx
```

Fix any violations found.

- [ ] **Step 1: Fix audit violations**
- [ ] **Step 2: Commit any fixes**

```bash
git add -A
git commit -m "fix: final Quiet polish — remove remaining color chips from table rows, verify row heights"
```

---

## Task 8: Update E2E tests broken by new pages and renamed dialogs

**Files:**
- Modify: `frontend/e2e/crud.spec.ts`
- Modify: `frontend/e2e/route-smoke.spec.ts`

This step introduces `DivisionsListPage` (with "Create division" replacing "Add division") and `CreateObjectDialog` (with "Create object" replacing "Add object"). The `crud.spec.ts` flow tests the full division → branch → object lifecycle and will fail on the renamed buttons and dialogs.

**Exact selector changes required in `crud.spec.ts`:**

| Old selector | New selector | Reason |
|---|---|---|
| `getByRole('button', { name: 'Add division' })` | `getByRole('button', { name: 'Create division' })` | `DivisionsListPage` uses "Create division" |
| `getByRole('dialog', { name: 'Add division' })` | `getByRole('dialog', { name: 'Create division' })` | dialog heading matches button |
| `getByRole('button', { name: 'Add object' })` | `getByRole('button', { name: 'Create object' })` | `CreateObjectDialog` uses "Create object" |
| `getByRole('dialog', { name: 'Add object' })` | `getByRole('dialog', { name: 'Create object' })` | dialog heading matches button |

**Verify and update in `route-smoke.spec.ts`:**

The route smoke test checks `{ path: '/objects/new', heading: 'New Object' }`. If `CreateObjectDialog` (a dialog on `/objects`) replaces the `/objects/new` dedicated page, this route no longer exists. Remove or update that entry:

```ts
// Remove or replace:
{ path: '/objects/new', heading: 'New Object' },
// Remove or replace:
{ path: `/objects/${routeObjectId}/edit`, heading: 'Edit Object' },
// Replace with a check that the dialog appears on the objects page:
// (verified separately in unit tests for CreateObjectDialog)
```

Also verify `{ path: '/divisions', heading: 'Divisions' }` — `DivisionsListPage` renders a `<PageHead title="Divisions">` which produces an `<h1>`, so `getByRole('heading', { name: 'Divisions' })` should still pass.

- [ ] **Step 1: Run E2E against the refactored build to see all failures**

```bash
docker compose -f docker-compose.poc.yml up --build -d
cd frontend && npx playwright test 2>&1 | grep "✗\|Error" | head -40
```

- [ ] **Step 2: Fix `crud.spec.ts` — update dialog and button labels**

Apply the four selector changes from the table above. Keep all other selectors (branch and object flows below division) unchanged unless the build reveals additional failures.

- [ ] **Step 3: Fix `route-smoke.spec.ts` — remove or update stale page routes**

If `/objects/new` no longer renders as a standalone page (dialog-only flow), remove it from the routes array. If it still exists as a redirect or placeholder, verify the heading and update if needed. Same for `/objects/:id/edit`.

- [ ] **Step 4: Run full E2E suite — expect all pass**

```bash
npx playwright test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/crud.spec.ts frontend/e2e/route-smoke.spec.ts
git commit -m "test: update E2E selectors for Quiet CreateObjectDialog and DivisionsListPage"
```

---

## Task 9: Run all quality gates and push

- [ ] **Step 1: Backend verify (for DivisionDto extension)**

```bash
cd backend && mvn spotless:apply && mvn verify
```

- [ ] **Step 2: Frontend quality gates**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass.

- [ ] **Step 3: Push**

```bash
git push -u origin feature/design-quiet-step4-new-pages
```

---

## Final Scope Checklist

- [ ] `DivisionsListPage` at `/divisions` with metrics table, `KPIRow`, `SectionBlock`, create dialog
- [ ] `CatalogPage` at `/catalog` and `/catalog/:deviceId` with master-detail layout
- [ ] `CreateObjectDialog` reusable component wired to `ObjectListPage`
- [ ] `DivisionDto` extended with 4 metrics fields (backend + frontend schema in sync)
- [ ] Disabled future-scope fields in Create object dialog (Tier, Travel norm, Visits/year)
- [ ] System-color chips present ONLY on Catalog detail page; removed from all table rows
- [ ] No avatars in Engineer list rows
- [ ] All 10 prototype screens implemented (Login screens are pre-existing — verify no regression)
- [ ] Backend `mvn verify` passes
- [ ] All frontend unit tests pass, lint clean, TypeScript 0 errors
- [ ] All E2E tests pass (crud and route-smoke selectors updated)

## References

- `design/design_handoff_workload_light/README.md` — screens 7, 8, 9, 3b, 11, 12, §"Form schemas", §"Per-screen state"
- `design/design_handoff_workload_light/prototype/screens-3.jsx` (Divisions, Create dialogs)
- `design/design_handoff_workload_light/CLAUDE.md` — confirmed decisions (recorded in memory)
