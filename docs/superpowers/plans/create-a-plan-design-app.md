# Plan: Apply Design Handoff to Frontend

## Context

The `design/design_handoff_workload_calculator/` package specifies a high-fidelity visual redesign for all 5 screens of the workload calculator. It is a pure presentation-layer change — backend API, hooks, store, and types are untouched (per design README constraint). The current frontend uses a default MUI theme with no customisation, no design tokens, and no shared visual primitives.

This plan schedules design work in three phases keyed to backend data availability, and calls out two pre-existing bugs in the M-03 plans that must be fixed before M-03 implementation begins.

**Design reference files:**
- `design/design_handoff_workload_calculator/README.md` — canonical token and screen spec
- `design/design_handoff_workload_calculator/styles.css` — source of truth for all tokens
- `design/design_handoff_workload_calculator/screens/*.jsx` — per-screen layout reference

---

## Pre-condition: Fix M-03 Plan Bugs Before Implementing M-03

These must be resolved before M-03 frontend work begins — they will silently break all engineer UI at runtime.

### Bug 1 — Status casing mismatch (runtime breakage)
- **Backend plan** stores status lowercase: `'normal'` / `'warning'` / `'overloaded'`
- **Frontend plan** validates uppercase: `z.enum(["NORMAL", "WARNING", "OVERLOADED"])`
- **Fix:** Add `.toUpperCase()` to `status` in `EngineerMapper.java` (Java DTO layer), so the API always emits uppercase. No change to Zod schema needed.
- File to edit: `backend/src/main/java/com/workload/mapper/EngineerMapper.java`

### Bug 2 — Missing fields in frontend Zod types
The M-03 frontend `types/engineer.ts` is missing fields that the backend DTO sends and the design needs:

| Missing field | Schema | Used by |
|---|---|---|
| `employee_id: z.string().nullable().optional()` | `EngineerSchema` | engineer detail header |
| `assigned_at: z.string().optional()` | `ObjectEngineerRowSchema` | assignment timestamps |
| `total_load: z.number().optional()` | `ObjectEngineerRowSchema` | CapBar in right rail |
| `capacity_fte: z.number().optional()` | `ObjectEngineerRowSchema` | CapBar in right rail |

- File to edit: `frontend/src/types/engineer.ts` (created in M-03 Task 1)

---

## Phase A — Foundation + Pre-M-03 Screens

**Branch:** `feature/poc-m03-design-foundation`
**Depends on:** `feature/implementation` (M-02 merged)
**Data dependencies:** none — all work is visual, uses existing M-01/M-02 hooks

### A1 — Theme + Fonts

**New file:** `frontend/src/theme.ts`
- Export `createTheme(...)` with the full token set from `styles.css`:
  - Palette: `--bg #f6f6f4`, `--bg-elev #ffffff`, `--ink #1a1a1a`, `--accent #3a4fcf`, `--ok #2d7a4a`, `--warn #a66600`, `--danger #b23a3a` (+ soft variants)
  - Typography: Inter (sans), JetBrains Mono (mono), sizes/weights per README type scale
  - Shape: `borderRadius: 6`
  - Component overrides: `MuiButton`, `MuiChip`, `MuiCard`, `MuiTableCell` to match spec

**Edit:** `frontend/index.html`
- Add Google Fonts `<link>` for Inter (400/450/500/600/700) + JetBrains Mono (400/500/600)

**Edit:** `frontend/src/App.tsx`
- Replace `createTheme()` call with `import theme from './theme'`

### A2 — Shared Common Components

**New files in `frontend/src/components/common/`:**

| File | Props | Description |
|---|---|---|
| `Num.tsx` | `value: number, digits?: number` | JetBrains Mono, tabular-nums; renders `—` when value is 0. Default digits=6. |
| `Sparkline.tsx` | `data: number[], width?, height?, color?` | Inline SVG area sparkline, 1.25px stroke, 12% opacity fill |
| `CapBar.tsx` | `value: number, max: number, width?: number` | 6px track bar; ok → warn at ≥85%, danger at ≥100% |
| `StatusChip.tsx` | `kind: 'ok'\|'warn'\|'danger'\|'accent'\|'default', children` | Pill with 6px leading dot; MUI Chip with sx overrides |
| `KpiTile.tsx` | `label, value, unit?, delta?, deltaKind?, spark?` | White card, uppercase 11px label, mono 30px value, delta pill, optional sparkline |
| `DonutMini.tsx` | `value, max, size?, stroke?, color?, track?` | Thin-stroke SVG ring gauge |
| `SystemChip.tsx` | `system: 'OS'\|'PS'\|'Video'` | Convenience wrapper: right icon + color for system type (3 lines) |

Unit-test `Num` zero-handling (renders `—` when value === 0) and `StatusChip` color variants.

### A3 — AppLayout Reskin

**Edit:** `frontend/src/components/layout/AppLayout.tsx`

Sidebar changes (220px → 240px):
- Brand row: monogram square + "Workload · Calculator · v2.24" + divider
- Section labels "WORKSPACE" / "ADMINISTRATION" (10px uppercase letter-spaced)
- Nav items gain count badges; engineers badge shows `—` (stubbed until M-03)
  - Objects count: derive from `useSvod(0,1)` total, or hard-code 2935 for PoC
  - Active item: `--ink` bg, white text, 6px radius; inactive: `--bg-sunken` on hover
- Bottom: user chip (avatar with initials from `authStore.user.name`, name + role)
- Administration section: Device catalog, Repair types, Settings items (links TBD, shown as inactive)

Topbar changes (height → 56px):
- Left: breadcrumb derived from current route via `useLocation()`
- Right: period pill (`--bg-sunken` bg, green dot, "Planning period H1 2026 · Jan – Jun" — static text per S-05), search icon button, notification icon button (no dot in PoC)

### A4 — Dashboard Redesign (partial — engineers card stubbed)

**Edit:** `frontend/src/pages/DashboardPage.tsx`

Reuse existing hooks: `useDivisionsAggregation()`, `useSvod(0, 5, undefined, 'fte')`, `useCoverageGaps()`

Layout changes:
- **KPI grid** (4-column, `<KpiTile>` components):
  1. Required FTE total — from `useSvod` total `itogoChisloWithTravel` sum ✅
  2. Objects under maintenance — `useSvod` total count ✅
  3. Coverage gaps — `useCoverageGaps()` count ✅
  4. Engineers overloaded — **stub: `—`** (filled in Phase B2 after M-03)
- **Main 2-col grid** (`1.6fr 1fr`):
  - Left: FTE by division table — division name chip (regex number from name), FTE `<Num>`, objects, gaps `<StatusChip>`, trend `<Sparkline>` (placeholder flat line until time-series exists), chevron. Data: `useDivisionsAggregation()`
  - Right column top: Top 5 objects card — `useSvod(0, 5)`, object name truncated, division + engineers subtext, mono FTE right-aligned
  - Right column bottom: Overloaded engineers card — **stub: empty state "No overloaded engineers"** (Phase B2)

### A5 — СВОД Redesign

**Edit:** `frontend/src/pages/SvodPage.tsx`

Reuse: existing `useSvod(page, 100, divisionId)`, `useDivisions()`

Changes:
- Division filter: replace `<Select>` with **segmented pill control** (`--bg-sunken` container, active pill white + shadow). Persist selection in URL via `useSearchParams` (`?division=<id>&page=N`).
- DataGrid `sx` overrides:
  - Column group separators: `borderLeft: '1px dashed var(--line-strong)'` on Fire, R1, FTE-no-travel column starts
  - ИТОГО Числ column: `background: var(--bg-sunken)`, bold, hero column
  - All numeric cells: wrap in `<Num>` (renders `—` for zero)
  - Row height: 44px via `rowHeight` prop
  - Header: 11px uppercase letter-spaced
- Engineers column: replace text count with **stacked avatar cluster stub** (`—` or muted text "N инж.") — Phase B4 replaces with real avatars
- Footer totals bar: custom `slots.footer` showing page range, avg FTE, Σ FTE (page), Σ FTE (all), pagination buttons

### A6 — Object Detail Redesign (right rail partial — engineers card stubbed)

**Edit:** `frontend/src/pages/ObjectDetailPage.tsx`

Reuse: `useObjectSummary()` (M-02 hook, `src/hooks/useSummary.ts`)

Layout: wrap content in `<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>`

**Right rail (4 stacked cards):**
1. **Dark hero card** — `background: var(--ink)`, white text; `<Num>` 42px for `itogo_chislo_with_travel`; secondary row: without-travel value + delta. Footer strip with "Recomputed N min ago · H1 2026". Data: `useObjectSummary(id)` ✅
2. **Per-system monthly avg** — rows: ОС (indigo), ПС (amber), Видео (green), Records (gray); `<CapBar>` per system; mono values. Data: `useObjectSummary()` fields `os_monthly_avg`, `ps_monthly_avg`, `video_monthly_avg`, `records_monthly` ✅
3. **Per-visit breakdown** — 2-col grid: R1 total, R2 total, PZV, Round-trip. Data: `useObjectSummary()` ✅
4. **Assigned engineers card** — **stub: "No engineers assigned"** muted state (Phase B3)

**Equipment tab** (left column when tab 0 active):
- Card A: Physical inventory — restyle existing `<PhysicalInventory objectId={objectId} />` in a titled card with "+ Add device" button
- Card B: System assignments — restyle existing `<SystemAssignments objectId={objectId} />` in titled card with `<SystemChip>` per row
- Layout: two vertically stacked cards, each with `16px 20px` head padding per design

**Tab bar:** restyle with black underline active tab, muted inactive tabs; add count badges on Equipment (`physicalCount · assignmentCount`) and Repairs tabs

---

## Phase B — After M-03: Engineer-Dependent Design

**Branch:** `feature/poc-m04-design-engineers`
**Depends on:** `feature/poc-m03-frontend` merged + M-03 pre-condition bugs fixed

### B1 — Engineer List Visual Upgrade (Screen 04)

**Edit:** `frontend/src/pages/EngineerListPage.tsx` (M-03 builds functional version first)

Add design treatment on top of M-03 functional implementation:
- Avatar column: 28px circle, colored bg by status (`--danger-soft` / `--warn-soft` / `--accent-soft`), mono initials
- Replace % chip with `<CapBar value={total_load} max={capacity_fte} width={90} />` + `%` mono label in Utilisation column
- Add StatusChip labels: "Healthy" / "Near cap" / "Overloaded" (not percentage)
- **Capacity distribution card** (above table): sum `capacity_fte` and `total_load` from `useEngineers()` list; stacked segment bar split by status counts; legend with `<StatusChip>` + counts
- 8-week trend column: **stub `—`** (MVP — no historical data in PoC schema)

### B2 — Dashboard Engineers Card + KPI Tile

**Edit:** `frontend/src/pages/DashboardPage.tsx`
- KPI tile 4: sum `engineersOverloaded` across `useDivisionsAggregation()` divisions (M-03 adds this field to aggregation DTO)
- Overloaded engineers card: `useEngineers({ status: 'OVERLOADED' })` → render danger-tinted card with avatars, mono `×N.NN` ratio, `<CapBar>`

### B3 — Object Detail Right Rail Engineers Card

**Edit:** `frontend/src/pages/ObjectDetailPage.tsx`
- Replace stub in right rail card 4 with real data from `useObjectEngineers(id)` (M-03 hook)
- Per engineer: avatar + name + "Share: N.NNNNNN FTE" + `<CapBar value={object_share} max={capacity_fte}>`

### B4 — СВОД Engineers Avatar Column

**Edit:** `frontend/src/pages/SvodPage.tsx`
- Replace "N инж." stub in engineers column with stacked avatar cluster (max 3 shown, overflow "+N" badge)
- **Note:** Fetching per-object engineer lists in СВОД requires N calls for 100 rows — use TanStack Query with `enabled: !!objectId` for each row, accept the N+1 for PoC

### B5 — AppLayout Engineers Badge

**Edit:** `frontend/src/components/layout/AppLayout.tsx`
- Replace `—` stub with `useEngineers()` response length (active engineers count)

### B6 — Device Catalog (Screen 05)

**Prerequisite verification:** Check if `GET /api/v1/device-types` endpoint exists in current backend. The M-02 equipment management feature uses device types, so a read endpoint likely exists.

If endpoint exists:
- Add `frontend/src/hooks/useDeviceTypes.ts` + `frontend/src/api/deviceTypes.ts`
- Add route `/admin/catalog` in `frontend/src/router/index.tsx`
- New page `frontend/src/pages/DeviceCatalogPage.tsx`: `420px 1fr` master/detail layout, device list left, context cards + normative history right

If endpoint does not exist: raise as a separate backend task before implementing UI.

---

## Phase C — MVP-Deferred (Do Not Implement in PoC)

| Feature | Reason deferred |
|---|---|
| 8-week sparkline in engineers table | Requires time-series data; PoC has single `computed_at` snapshot only |
| Stale indicator chips on СВОД object rows | Requires `is_stale` column (S-02 PoC simplification — MVP M-06) |
| Period pill live state (active/inactive from API) | Requires planning period management (S-05 PoC simplification) |
| Device Catalog admin CRUD (create/edit/delete device types) | May require new backend admin endpoints not in any PoC milestone |
| Notification system (red dot, unread count) | No notification model in PoC schema |
| Dark mode | Out of scope per design README |
| Mobile breakpoints | Desktop-only product per TOR §8 |

---

## Branch + Merge Order

```
feature/implementation  (M-02 merged)
    │
    ├── feature/poc-m03-design-foundation   (Phase A — can start now)
    │       └── merges to feature/implementation
    │
    ├── feature/poc-m03-backend             (M-03 backend)
    │       └── merges to feature/implementation
    │
    └── feature/poc-m03-frontend            (M-03 frontend + pre-condition bug fixes)
            └── merges to feature/implementation
                    │
                    └── feature/poc-m04-design-engineers   (Phase B)
```

Phase A and M-03 backend can run **in parallel** — they have no shared files.

---

## Verification

**After Phase A1–A3 (theme + layout):**
```bash
cd frontend
npm run format && npm run lint && npx tsc --noEmit && npm test
```
All existing tests must pass. Open `http://localhost:5173` and verify every existing page still renders (visual regression — should look reskinned but functional).

**After Phase A4–A6 (screens):**
```bash
docker compose -f docker-compose.poc.yml up --build
cd frontend && npx playwright test
```
All Playwright E2E smoke tests must pass. Visually verify Dashboard, СВОД, and Object Detail against design screens in `Workload Calculator.html`.

**After Phase B (engineers):**
- Manual smoke test per M-03 frontend plan PAC-09: Dashboard → Create Object → Add Equipment → Assign Engineer → Engineer Detail shows correct load
- Verify `<Num>` renders `—` for all zero values in СВОД grid
- Verify `<CapBar>` turns warning at ≥85% and danger at ≥100%

---

## Critical Files Summary

| File | Phase | Action |
|---|---|---|
| `frontend/index.html` | A1 | Add Google Fonts links |
| `frontend/src/App.tsx` | A1 | Import custom theme |
| `frontend/src/theme.ts` | A1 | **Create** — full design tokens |
| `frontend/src/components/common/Num.tsx` | A2 | **Create** |
| `frontend/src/components/common/Sparkline.tsx` | A2 | **Create** |
| `frontend/src/components/common/CapBar.tsx` | A2 | **Create** |
| `frontend/src/components/common/StatusChip.tsx` | A2 | **Create** |
| `frontend/src/components/common/KpiTile.tsx` | A2 | **Create** |
| `frontend/src/components/common/SystemChip.tsx` | A2 | **Create** |
| `frontend/src/components/layout/AppLayout.tsx` | A3 | Reskin sidebar + topbar |
| `frontend/src/pages/DashboardPage.tsx` | A4, B2 | Redesign (engineers stubbed → filled) |
| `frontend/src/pages/SvodPage.tsx` | A5, B4 | Redesign (engineers stubbed → filled) |
| `frontend/src/pages/ObjectDetailPage.tsx` | A6, B3 | Add right rail (engineers card stubbed → filled) |
| `backend/src/main/java/com/workload/mapper/EngineerMapper.java` | pre-M-03 | Add `.toUpperCase()` on status |
| `frontend/src/types/engineer.ts` | pre-M-03 | Add missing fields to schemas |
| `frontend/src/pages/EngineerListPage.tsx` | B1 | Visual upgrade on top of M-03 implementation |
| `frontend/src/pages/DeviceCatalogPage.tsx` | B6 | **Create** (after endpoint verified) |
| `frontend/src/router/index.tsx` | B6 | Add `/admin/catalog` route |
