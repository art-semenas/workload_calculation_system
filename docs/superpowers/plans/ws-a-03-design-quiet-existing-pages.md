# WS-A Step 3 — Quiet Design: Sidebar + Existing Page Refactors

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Apply Quiet visual language to the sidebar/layout and all 5 existing content pages. Replace ad-hoc headers with `<PageHead>`, add `<KPIRow>` where applicable, move right-rail content into `<QuietDrawer>`, apply table row height 52px, remove system-color chips from row data, remove avatars from Engineer list, and apply 2-decimal precision on СВОД with show-full toggle. Refactor in place — do not delete/rewrite working pages, keep test suite green.

**Branch:** `feature/design-quiet-step3-existing-pages`
**Depends on:** `feature/design-quiet-step2-components` merged to `feature/implementation`
**Workstream:** A — Design (frontend only)

**Reference:** `design/design_handoff_workload_light/README.md` — screens 3 (Dashboard), 4 (СВОД), 5 (Object detail), 6 (Engineers), 7b (Division detail)
**Prototype screens:** `design/design_handoff_workload_light/prototype/screens-1.jsx` (Dashboard, СВОД), `screens-2.jsx` (Object detail, Engineers)

---

## Source-Of-Truth Alignment

1. `design/design_handoff_workload_light/README.md` — canonical screen specs; each screen section is the implementation target
2. `design/design_handoff_workload_light/prototype/` — visual reference; open `Workload - Quiet.html` in a browser to see artboards
3. Existing page tests in `src/test/` — must stay green after every task
4. No new dependencies. No new API endpoints needed in this step.

**Color discipline rules (CRITICAL from README §"Color discipline"):**
- System type chips (ОС/ПС/Видео) — remove from СВОД rows, Engineer rows, Object Detail tables. Keep only on Device Catalog detail page.
- Avatars — remove from Engineer list rows. Keep only in sidebar user-chip.
- No sunken background on ИТОГО Числ column in СВОД table.
- Row height 52px globally (already in theme — verify it applies).

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/design-quiet-step3-existing-pages
```

---

## Task 1: Sidebar / AppLayout refactor

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Target (screen spec §"Sidebar"):**
- 200px wide, background `var(--bg)`, `1px var(--line)` right border
- Brand: 22px square ink wordmark mark + 13/600 "Workload" wordmark
- Section labels: 10/600/0.08em uppercase ink4, above navigation groups
- Nav items: 13/400 ink3, 6px 10px padding, `2px transparent` left border. Active = ink text, `2px var(--ink)` left border, weight 500. **No filled background. No icons. No badges.**
- User chip pinned at bottom: 24px avatar (initials only), name 12/500, division 11/ink3

- [ ] **Step 1: Open prototype artboard "01 · Login" and sidebar for reference**

Open `design/design_handoff_workload_light/prototype/Workload - Quiet.html` in browser and note sidebar layout before writing code.

- [ ] **Step 2: Refactor `AppLayout.tsx` sidebar**

Key changes:
- Remove all icons from nav items
- Active state: left border 2px ink, text color ink, fontWeight 500; inactive: ink3, transparent border
- No filled background on active nav item
- User chip at bottom: MUI `Avatar` (initials, ink4 bg) + name + division text stack

- [ ] **Step 3: Run existing tests**

```bash
cd frontend && npm test
```

Expected: all pass. Fix any test failures caused by the layout change.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "refactor: apply Quiet sidebar — text-only nav, no icons, left-border active state"
```

---

## Task 2: Dashboard page (`/`)

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

**Target (screen 3):**
- `<PageHead crumbs={[{label:'Workload',to:'/'},{label:'Overview'}]} title="Maintenance workload" subtitle="..." actions={<><PeriodControl/><Button>Details ›</Button><Button variant="contained">Recalculate</Button></>} />`
- `<KPIRow>` with 4 items: Required FTE (ok/warn tone), Objects, Coverage gaps (warn if > 0), Overloaded engineers (danger if > 0)
- **Section "FTE by division"**: `<SectionBlock label="FTE by division">` containing the division table. Table columns: Division / Objects / Required FTE / Coverage gap / Status chip / hover-only `<Spark>`. Sparkline column hidden (no data source available — README decision 3)
- **Right column → Drawer**: "Top objects by workload" and "Overloaded engineers" panels move into `<QuietDrawer>` opened via "Details ›" button
- Period control: segmented control buttons for period selection (UI state, Zustand `uiStore`)

- [ ] **Step 1: Update DashboardPage.tsx**

Replace ad-hoc header with `<PageHead>`. Replace KPI cards grid with `<KPIRow>`. Wrap top-objects and overloaded-engineers panels in `<QuietDrawer>`. Add `<SectionBlock>` around division table.

Remove sparkline column from division table (data not available per design decision 3).

- [ ] **Step 2: Run existing tests**

```bash
npm test -- --testPathPattern=Dashboard
```

Fix any failures.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "refactor: apply Quiet design to Dashboard — PageHead, KPIRow, Drawer for right-rail panels"
```

---

## Task 3: СВОД page (`/svod`)

**Files:**
- Modify: `frontend/src/pages/SvodPage.tsx`

**Target (screen 4):**
- `<PageHead crumbs={[...]} title="СВОД" subtitle="Consolidated workload across all objects · 2 935 rows" actions={<Button>Export CSV</Button>} />`
- Filter row: division pill segmented control (All + division names) on `bgSunken` track + search field with `⌘K` hint + Filter button. Right side: `Precision: 2 decimals · show full` toggle stored in Zustand `uiStore`
- **14-column DataGrid**: existing columns + apply Quiet styling
- **Precision toggle**: when `precision=2`, round numeric columns to 2 decimals; `show full` shows 4–6 decimals. Value in Zustand.
- **No dashed group dividers. No sunken background on ИТОГО column.** Remove any system-color chips from row data.
- Footer: `Showing 1–10 of 2 935`, `Avg / Σ page / Σ all` mono center, pagination right

- [ ] **Step 1: Add `svodPrecision` to Zustand UI store**

Add `svodPrecision: 2 | 6` and `setSvodPrecision` to `uiStore`. Default: 2.

- [ ] **Step 2: Update SvodPage.tsx**

Replace header with `<PageHead>`. Add precision toggle button. Apply Quiet DataGrid styles (row height 52px, no vertical dividers, no sunken ИТОГО bg). Remove system-color chips from rows.

Format numeric columns: `value.toFixed(svodPrecision)` (or `toFixed(6)` for full).

- [ ] **Step 3: Run existing tests**

Fix any failures.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SvodPage.tsx frontend/src/stores/uiStore.ts
git commit -m "refactor: apply Quiet design to СВОД — precision toggle, remove color chips, PageHead"
```

---

## Task 4: Object Detail page (`/objects/:id`)

**Files:**
- Modify: `frontend/src/pages/ObjectDetailPage.tsx`

**Target (screen 5):**
- `<PageHead crumbs={[..., {label: objectName}]} title={objectName} subtitle="Branch · Division · с YYYY" actions={<><Button>FTE breakdown ›</Button><Button>Edit object</Button></>} />`
- **Inline summary strip** (5 hairline columns, replaces card row): ИТОГО Числ (mono 32) / FTE no travel / Travel / Engineers / Visits/yr — from `useObjectSummary(id)`
- **Tabs**: Equipment (8 · 6 muted count) / Records / Repairs / Travel / Engineers — active tab: 2px ink underline, no pill bg
- **Section A — Physical inventory**: borderless table, columns: Device / Qty physical / Assigned to systems (plain text, no chips)
- **Section B — System assignments**: borderless table, columns: Device / System (plain ink3 text, no color chip) / Qty maintained / R1 / R2 mono / Contribution (bold mono)
- **Drawer** (opened via "FTE breakdown ›"): `<QuietDrawer>` containing `<HeroCard heroValue={itogoChisloWithTravel}>` + system progress bars + per-visit breakdown + assigned engineers with `<CapBar>`

Key changes from current implementation:
- Replace system-color chips with plain ink3 text in System column
- Add inline summary strip below page header
- Move FTE breakdown panel into `<QuietDrawer>`
- Apply `<SectionBlock>` labels to Physical inventory and System assignments sections

- [ ] **Step 1: Update ObjectDetailPage.tsx**

- [ ] **Step 2: Run existing tests**

```bash
npm test -- --testPathPattern=ObjectDetail
```

Fix failures.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ObjectDetailPage.tsx
git commit -m "refactor: apply Quiet design to Object Detail — summary strip, Drawer, remove system chips"
```

---

## Task 5: Engineers list page (`/engineers`)

**Files:**
- Modify: `frontend/src/pages/EngineerListPage.tsx`

**Target (screen 6 — "Quiet refactor of EngineerListPage"):**
- `<PageHead title="Engineers" actions={<Button variant="contained">Create engineer</Button>} />`
- **Capacity distribution `<DistBar>`** above table: segments Normal/Watch/Overloaded with counts
- Filter row: search + division Select + status Select (as currently implemented)
- **Table changes**:
  - Engineer column: name + email stacked as plain text, **no avatar**
  - Utilisation column: `<CapBar pct={loadRatio} />` replaces numeric display
  - Status column: dot + percentage chip (keep existing implementation)
  - 8-week trend column: removed (no data source)
- Row height 52px (from theme — verify)

- [ ] **Step 1: Update EngineerListPage.tsx**

Remove avatar from engineer name column. Add `<DistBar>` above table. Replace numeric utilisation with `<CapBar>`. Remove trend column.

- [ ] **Step 2: Update EngineerListPage test to match new structure**

Remove avatar assertions. Add `<DistBar>` rendering assertion.

- [ ] **Step 3: Run tests**

```bash
npm test -- --testPathPattern=EngineerList
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EngineerListPage.tsx frontend/src/test/EngineerListPage.test.tsx
git commit -m "refactor: apply Quiet design to Engineers list — DistBar, CapBar, remove avatars"
```

---

## Task 6: Division detail and Branch detail pages

**Files:**
- Modify: `frontend/src/pages/DivisionDetailPage.tsx`
- Modify: `frontend/src/pages/BranchDetailPage.tsx`

**Target (screen 7b — Division detail):**
- `<PageHead crumbs={[...]} title={divisionName} actions={<Button>Edit division</Button>} />`
- `<KPIRow>` with: Objects / Engineers / Required FTE / Utilisation (tone from load ratio)
- Section "Branches": table with Code (mono) / Branch / Objects / Engineers / FTE req. / chevron

**Target (screen 7c — Branch detail):**
- `<PageHead crumbs={[...]} title={branchName} actions={<Button>Edit branch</Button>} />`
- `<KPIRow>`: Objects / Engineers / Required FTE / Avg per object
- Section "Objects in this branch": table with ID (mono) / Object / Tier / FTE / chevron

- [ ] **Step 1: Update DivisionDetailPage.tsx and BranchDetailPage.tsx**
- [ ] **Step 2: Run tests**

```bash
npm test -- --testPathPattern=Division|Branch
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DivisionDetailPage.tsx frontend/src/pages/BranchDetailPage.tsx
git commit -m "refactor: apply Quiet design to Division and Branch detail pages — PageHead, KPIRow, SectionBlock"
```

---

## Task 7: Update E2E tests broken by sidebar and page changes

**Files:**
- Modify: `frontend/e2e/smoke.spec.ts`
- Modify: `frontend/e2e/route-smoke.spec.ts`

The sidebar refactor changes nav items from MUI `Button` elements to plain anchor links (`<a>` / `NavLink`). This breaks every test that uses `getByRole('button', { name: '...' })` to find navigation items.

**Exact selector changes required in `smoke.spec.ts`:**

| Old selector | New selector |
|---|---|
| `getByRole('button', { name: 'Objects' })` | `getByRole('link', { name: 'Objects' })` |
| `getByRole('button', { name: 'Divisions' })` | `getByRole('link', { name: 'Divisions' })` |
| `getByRole('button', { name: 'Engineers' })` (navigation) | `getByRole('link', { name: 'Engineers' })` |
| `getByRole('button', { name: 'Summary' })` (navigation) | `getByRole('link', { name: 'Summary' })` |

**Heading text changes — verify and update if `<PageHead>` or `<SectionBlock>` changes any visible text:**

- `getByRole('heading', { name: 'FTE by Division' })` — `SectionBlock` may render this as a `<p>` label, not a heading. If so, change to `getByText('FTE by division')`.
- `getByText('TOTAL Staffing')` — verify the Dashboard division table column header name is unchanged; update if the Quiet refactor renames it.

- [ ] **Step 1: Run E2E against the refactored build to see all failures**

```bash
docker compose -f docker-compose.poc.yml up --build -d
cd frontend && npx playwright test 2>&1 | grep "✗\|Error" | head -40
```

- [ ] **Step 2: Fix `smoke.spec.ts` — update nav selectors**

Replace all four `getByRole('button', ...)` nav lookups with `getByRole('link', ...)`. Leave logout and other non-nav buttons unchanged (they remain `<button>` elements).

- [ ] **Step 3: Fix `smoke.spec.ts` — verify heading and column selectors**

Check "FTE by Division" and "TOTAL Staffing" selectors against the live build. Update if the rendered element type or text changed.

- [ ] **Step 4: Fix `route-smoke.spec.ts` — verify Object Detail button**

`getByRole('button', { name: 'Delete object' })` — if the Object Detail refactor renames or restructures this button, update the selector.

- [ ] **Step 5: Run full E2E suite — expect all pass**

```bash
npx playwright test
```

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e/smoke.spec.ts frontend/e2e/route-smoke.spec.ts
git commit -m "test: update E2E selectors for Quiet sidebar nav (links replace buttons)"
```

---

## Task 8: Run all quality gates and push

- [ ] **Step 1: Format**

```bash
cd frontend && npm run format
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: All unit tests**

```bash
npm test
```

Expected: all pass. All pre-existing tests must remain green.

- [ ] **Step 5: Push**

```bash
git push -u origin feature/design-quiet-step3-existing-pages
```

---

## Final Scope Checklist

- [ ] Sidebar: no icons, no badges, text-only nav, left-border active state, user chip at bottom
- [ ] Dashboard: `PageHead`, `KPIRow`, `QuietDrawer` for right-rail panels, `SectionBlock` for division table
- [ ] СВОД: precision toggle (2 decimals default), no color chips in rows, no sunken ИТОГО column bg
- [ ] Object Detail: inline summary strip, `QuietDrawer` for FTE breakdown, `HeroCard` inside drawer, system column uses plain ink3 text
- [ ] Engineers: `DistBar` above table, `CapBar` in utilisation column, no avatars in rows
- [ ] Division/Branch detail: `PageHead`, `KPIRow`, `SectionBlock`
- [ ] All row heights 52px (from theme)
- [ ] All existing unit tests pass
- [ ] All E2E tests pass (nav selectors updated for link-based sidebar)
- [ ] No new inline color literals introduced

## References

- `design/design_handoff_workload_light/README.md` — screens 3–7b
- `design/design_handoff_workload_light/prototype/Workload - Quiet.html` — live artboard reference
- `design/design_handoff_workload_light/prototype/screens-1.jsx`, `screens-2.jsx`
