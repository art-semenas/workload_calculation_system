# Handoff: Workload Calculator — Frontend Redesign

## Overview

This package contains a high-fidelity design exploration for the **Security Systems Maintenance Workload Calculator** — a web application that replaces the legacy Excel workbook (`Шаблон_нагрузки_з_v_4_00.xlsx`) used to calculate required maintenance staffing (нагрузка / численность) for ТО engineers servicing ~2,935 bank branch objects across 7 regional divisions.

The redesign keeps the existing backend API, routing, and data model (per `TOR_Workload_WebApp.md` v2.24) intact. Only the presentation layer changes.

## About the Design Files

The files in this bundle are **design references created in HTML** — static React prototypes rendered inside a pan/zoom design canvas. They show intended look, layout, typography, color, and information hierarchy. They are **not production code to copy directly**.

The task is to **recreate these designs inside the existing codebase** at `frontend/` (React 18 + TypeScript + Vite + MUI v5 + React Router 6 + TanStack Query + Zustand + React Hook Form + Zod + MUI X DataGrid). Use the established file layout (`src/api`, `src/hooks`, `src/components`, `src/pages`, `src/store`, `src/types`) — do not introduce a new framework or state library.

## Fidelity

**High-fidelity.** Colors, typography, spacing, component shapes, and data density are final. Recreate pixel-perfectly using MUI primitives + `sx` / theme overrides. Do not swap MUI for Tailwind, shadcn, etc.

---

## Target Codebase

- **Path:** `frontend/`
- **Stack:** React 18.3, TypeScript 5.9, Vite 6, MUI 5.18, `@mui/x-data-grid` 6.20, TanStack Query 5.74, React Hook Form 7.55, Zod 3.24, Zustand 5, React Router 6.30
- **Existing pages to update:**
  - `src/pages/DashboardPage.tsx` → screen 01
  - `src/pages/SvodPage.tsx` → screen 02
  - `src/pages/ObjectDetailPage.tsx` → screen 03
  - `src/pages/EngineerListPage.tsx` (currently a stub) → screen 04
  - New admin route for device catalog → screen 05
- **Layout to update:** `src/components/layout/AppLayout.tsx`
- **Do NOT modify:** `src/api/*`, `src/hooks/*`, `src/store/*`, `src/types/*`. The UI layer consumes these unchanged.

---

## Design Tokens

Recreate these in a new `src/theme.ts` exported as an MUI `createTheme(...)` instance, and wrap the app in `<ThemeProvider>` inside `main.tsx`.

### Colors

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#f6f6f4` | App background (warm off-white) |
| `--bg-elev` | `#ffffff` | Cards, tables, sidebar |
| `--bg-sunken` | `#efeeea` | Inset surfaces, segmented controls, muted badges |
| `--line` | `#e4e2dc` | Dividers, card borders |
| `--line-strong` | `#d4d1c9` | Input borders |
| `--ink` | `#1a1a1a` | Primary text; primary button bg |
| `--ink-2` | `#3d3d3a` | Secondary text |
| `--ink-3` | `#6b6a64` | Tertiary / captions |
| `--ink-4` | `#9a988f` | Disabled / decorative |
| `--accent` | `#3a4fcf` | Single indigo accent (links, ОС system) |
| `--accent-soft` | `#e8ebff` | Accent badge bg |
| `--accent-ink` | `#1a2a8a` | Text on accent-soft |
| `--ok` | `#2d7a4a` | Healthy capacity, success |
| `--ok-soft` | `#e3f1e6` | ok chip bg |
| `--warn` | `#a66600` | Near capacity, stale, ПС system |
| `--warn-soft` | `#fbedd2` | warn chip bg |
| `--danger` | `#b23a3a` | Overload, coverage gap, destructive |
| `--danger-soft` | `#fbe5e0` | danger chip bg |

**System-type color coding** (used consistently across chips, column headers, icons):
- **ОС (Security)** → accent (indigo)
- **ПС (Fire)** → warn (amber)
- **Видео (Video)** → ok (green)

### Typography

- **Sans:** `Inter`, weights 400 / 450 / 500 / 600 / 700. Load from Google Fonts.
- **Mono:** `JetBrains Mono`, weights 400 / 500 / 600. Load from Google Fonts.
- **Numeric cells, KPI values, IDs, timestamps, FTE values MUST use mono + `font-variant-numeric: tabular-nums`.** This is non-negotiable — numbers are the hero data in this product.

Type scale (key variants only):

| Use | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Page title (h1 / `variant="h4"`) | Inter | 28px | 600 | -0.02em |
| Page subtitle | Inter | 13px | 400 | 0 |
| Card title | Inter | 13px | 600 | -0.005em |
| Card sub | Inter | 11px | 400 | 0 |
| Table header | Inter | 11px | 600 uppercase | 0.04em |
| Table cell text | Inter | 13px | 450 | 0 |
| Numeric cell | JetBrains Mono | 13px | 500–600 | -0.01em |
| KPI value | JetBrains Mono | 30px | 500 | -0.02em |
| Hero FTE (dark card) | JetBrains Mono | 42px | 500 | -0.02em |
| Nav label (section) | Inter | 10px | 600 uppercase | 0.08em |
| Chip / badge | Inter | 11px | 500 | 0 |

### Spacing & Shape

- Border radius: `6px` small (buttons, chips, inputs), `10px` cards, `14px` large cards, `999px` pills
- Card border: always `1px solid var(--line)`, **never box-shadow** (except the period pill and dark hero card)
- Inner padding: card head `16px 20px 12px`, card body `16px 20px`
- Table row height: ~44px (via `padding: 12px` on `td`)
- App grid: `240px` sidebar + fluid content

### Iconography

Use **1.5-stroke line icons** throughout. The prototype uses a custom inline set (`components.jsx` → `Icons`). In the real codebase use `@mui/icons-material` equivalents — all icons are already in that package:

| Mock name | MUI equivalent |
|---|---|
| `dashboard` | `DashboardOutlined` |
| `building` | `ApartmentOutlined` |
| `users` | `GroupOutlined` |
| `grid` | `GridViewOutlined` |
| `branch` | `AccountTreeOutlined` |
| `catalog` | `MenuBookOutlined` |
| `wrench` | `BuildOutlined` |
| `settings` | `SettingsOutlined` |
| `shield` | `ShieldOutlined` (ОС) |
| `flame` | `LocalFireDepartmentOutlined` (ПС) |
| `camera` | `VideocamOutlined` (Видео) |
| `car` | `DirectionsCarOutlined` |
| `alert` | `WarningAmberOutlined` |

Icon size in nav/chips: 12–15px. Icon size in buttons: 13–14px.

---

## Shared Components to Build

Create in `src/components/common/`:

### `<Num value={number} digits={6} />`
Renders a number in JetBrains Mono with `font-variant-numeric: tabular-nums`. If `value === 0`, render an em-dash `—` in muted color. Default `digits = 6` (FTE precision per TOR).

### `<Sparkline data={number[]} width={80} height={28} color="currentColor" />`
Tiny inline SVG sparkline — area fill at 12% opacity under a 1.25px stroke line. Used in dashboard division rows and engineer trend columns.

### `<CapBar value={number} max={number} width={90} />`
6px-tall horizontal bar, `--bg-sunken` track, `--ok` fill. Turns `--warn` at ≥ 85% of max, `--danger` at ≥ 100%. Width prop in px.

### `<StatusChip kind="ok|warn|danger|accent|default">children</StatusChip>`
Pill-shaped badge with a 6px leading dot. Uses `chip` class from `styles.css` — port to MUI `Chip` with `sx` overrides.

### `<KpiTile label value unit delta deltaKind spark />`
Used in dashboard. White card, uppercase 11px label, mono 30px value, tiny delta pill, optional sparkline absolute-positioned bottom-right.

### `<DonutMini value max size stroke color track />`
Thin-stroke ring gauge — not heavily used, but available for capacity readouts.

### `<SystemChip system="OS|PS|Video" />`
Convenience wrapper combining the right icon + color for a system type. Three lines of code.

---

## Screens

All screens assume a `1440×900` canvas. The layout is fluid below that.

### App Chrome (all screens)

**Sidebar** — `240px` fixed, white bg, right border `1px solid var(--line)`:
1. Brand row: black 28×28 rounded square with white mono "W", product name "Workload" + sub "Calculator · v2.24", divider below.
2. Section label "WORKSPACE" (uppercase 10px letter-spaced), followed by nav items: Dashboard, Summary · СВОД (badge `2 935`), Objects (badge `2 935`), Engineers (badge `148`), Divisions.
3. Section label "ADMINISTRATION": Device catalog, Repair types, Settings.
4. Active item: `--ink` black background, white text, 6px radius, with mono count-badge on dark translucent bg.
5. Bottom: user chip — 28px avatar (indigo soft bg, mono initials), name + role underneath.

**Topbar** — `56px` tall, white, `1px` bottom border:
- Left: breadcrumbs `/` separated, last crumb darker + 500 weight.
- Right (fixed order): **period pill** (pill-shaped, sunken bg, green 6px dot, "Planning period **H1 2026** · Jan – Jun"), search button (32px icon button), notifications button with red 6px dot when unread.

### 01 · Dashboard — `src/pages/DashboardPage.tsx`

Replaces the current stacked-paper layout.

**Page header:** h4 "Maintenance workload", subtitle "Live view across 7 divisions · last recalc 12 min ago". Right: `Export XLSX` ghost button + `Recalculate` primary (black) button with clock icon.

**KPI grid:** 4-column CSS grid, 12px gap, 20px bottom margin. Tiles:
1. **Required FTE · total** — big mono value with "ставок" unit, up delta pill, inline sparkline.
2. **Objects under maintenance** — `2 935` with neutral delta.
3. **Coverage gaps** — value in `--danger`, warn delta "objects without engineer".
4. **Engineers overloaded** — `3 of 148` with warn delta "load ≥ 1.0".

**Main grid:** `1.6fr 1fr`, 16px gap.

**Left — FTE by division card.** Hover rows go slightly warmer (`#fafaf7`). Columns: Division (w/ 28px mono chip showing division number from name regex), FTE (mono, 600 weight), Objects, Gaps (StatusChip warn/danger), Trend (sparkline), chevron-right. Data source: `useDivisionsAggregation()`.

**Right column, two cards stacked:**
- **Top objects by workload** — list (not table) of 5 rows, object name truncated with ellipsis, tiny subtext `division · engineers (first + "+N")` or red "No engineer", mono FTE on right. Data: `useSvod(0, 5, sortBy='fte')`.
- **Overloaded engineers card** — `#fffbfa` tinted bg, `--danger-soft` border. Danger-themed avatars, mono `×1.24` ratio, mini CapBar. Data: `useEngineers({overloaded: true})`.

### 02 · Consolidated Summary (СВОД) — `src/pages/SvodPage.tsx`

Keep `@mui/x-data-grid` but restyle heavily with `sx`.

**Sticky filter bar** (white, 1px bottom border):
- Page title "Consolidated Summary · СВОД" (22px, not 28px here), sub "2 935 objects · computed from H1 2026 normatives".
- Right actions: Export PDF, Export XLSX, Recalculate (primary).
- Second row: **segmented division filter** — sunken-bg container padding `3px`, pills inside. Active pill: white bg, 1px subtle shadow, 600 weight. Inactive: transparent, muted text. Divisions: All divisions, Брестское, Витебское, Гомельское, Гродненское, Минское, Могилёвское, Минск гор.
- Far right: search input with `⌘K` kbd hint, `3 filters` button.

**Table** — sticky header, tableLayout auto. Column groups separated by 1px dashed vertical border on: Fire (start of system group), R1 (start of per-visit group), FTE no travel (start of totals). Columns:
1. `#` — tiny mono row index, center-aligned, `--ink-4`
2. Object — name 500 weight, sub line "division · branch", optional warn StatusChip "stale"
3. Engineers — **stacked avatar cluster** (22px circles, 2px white border, -6px overlap, max 3 shown), muted "N engineers" to the right. If empty: danger StatusChip "coverage gap".
4. PZV (num, 2 decimals)
5. Travel (num, 2 decimals)
6. Fire · ПС (num, 6 decimals) — dashed left border
7. Video (num, 6 decimals)
8. Security · ОС (num, 6 decimals)
9. Records (num, 6 decimals)
10. Repair (num, 6 decimals)
11. R1 (num, 2 decimals, muted) — dashed left border
12. R2 (num, 2 decimals, muted)
13. FTE (no travel) (num, 6 decimals) — dashed left border
14. **ИТОГО Числ** (num, 6 decimals, **bold, `--bg-sunken` cell background**) — this is the hero column.

Zero values render as em-dash `—` via `<Num>`.

**Footer totals bar** — 12px padding, white bg, 1px top border: "Showing 1–10 of 2 935" left; right — Avg FTE, Σ FTE (page), Σ FTE (all) [bigger, bold], then pagination buttons `‹ 1 2 3 … 294 ›`. Data: `useSvod(page, 100, divisionId)`.

### 03 · Object Detail — `src/pages/ObjectDetailPage.tsx`

**Page head:**
- Chip row: accent "Object" chip (building icon), default "Active" chip, tiny mono ID.
- h4 object name.
- Subtitle: "Division · Branch · imported from row N".
- Actions: Export XLSX, Edit, Delete (red text).

**Tabs row** (existing Tabs component, restyle): Equipment (count `8 · 6` — physical · assignments), Records, Repairs (count `4`), Travel, Engineers (count `2`). Active tab: black underline, 500 weight. Inactive: muted gray.

**Body grid:** `1fr 320px`, 20px gap.

**Left column — Equipment tab only (others keep current structure with token refresh):**
- **Card A. Physical inventory.** Head: title + sub "Hardware on site · independent of system", right: primary small "+ Add device". Columns: Device, Qty physical (num, 600), Assigned to systems (SystemChips row), three-dot more icon.
- **Card B. System assignments.** Head: title + "Maintained quantity per (device × system) · R1/R2 pulled from catalog context", right: ghost small "+ Assign". Columns: Device, System (SystemChip), Qty maintained (bold), R1 min (muted), R2 min (muted), Contribution / visit (computed `qty × (r1+r2)`, bold).

**Right rail — 4 stacked cards:**
1. **Dark hero card** — `background: var(--ink)`, white text. Inside: uppercase 10px label "ИТОГО Числ · with travel", mono **42px** value `0.098442`, two columns below (without-travel value, vs-previous-period green delta). Footer strip inside same card, `rgba(255,255,255,0.1)` top border, muted white "Recomputed 4 min ago · H1 2026".
2. **Per-system monthly avg** — card. Rows with labels + mono values + 4px progress bar colored per system (ОС indigo, ПС amber, Видео green, Records gray).
3. **Per-visit breakdown** — 2-col grid inside body: R1 total, R2 total, PZV, Round-trip. Values right-aligned, mono.
4. **Assigned engineers** — list, avatar + name + "Share: 0.049221 FTE" + small CapBar.

### 04 · Engineers — `src/pages/EngineerListPage.tsx`

Replace current stub entirely.

**Page head:** h4 "Engineers", sub "148 active · workload split equally across assigned objects". Actions: Export, primary "+ Add engineer".

**Capacity distribution card:**
- 18px padding body.
- Top row: card title "Capacity distribution" + right-aligned stats "Total capacity **142.5** · Required **138.2** · Utilisation **96.9%**" (bold values mono).
- 10px tall stacked-segment bar: 3% danger, 8% warn, 76% ok, 13% ink-4 (under-utilised). `overflow: hidden`, 5px radius.
- Legend row below: 4 inline StatusChips + mono counts.

**Filter row:** search input, "All divisions" button, "All statuses" button, right: "Sorted by **Load ratio ↓**" muted label.

**Engineers table card.** Columns:
1. Engineer — avatar (colored by status: danger/warn bg, otherwise default indigo-soft), name + email below.
2. Division
3. Objects (num)
4. FTE load (num, bold, colored per status)
5. Capacity (num, muted)
6. Utilisation — CapBar + "%" mono label
7. 8-week trend — Sparkline colored per status (ok/warn/danger)
8. Status — StatusChip (Overloaded / Near cap / Healthy)
9. Chevron

Data source: `useEngineers()` (add to hooks — currently `useEngineers.ts` doesn't exist; align with TOR §4.10–4.11).

### 05 · Device Catalog — new route `/admin/catalog`

**Layout:** 2-column, `420px 1fr`, full viewport height inside main (`calc(100vh - 56px)`).

**Left list pane** (white bg, right 1px border):
- Top: "Device catalog" title, primary "+ New" button, sub "N types · dynamic — no schema changes", search input.
- Scrollable list. Each row: device name (13px, 500), SystemChip row, right-aligned mono "N uses". Selected row: `--bg-sunken` bg, 2px ink left border.

**Right detail pane** (scrollable, 24px 28px padding):
- Accent "Device type" chip, h4 name, sub "Assigned to N objects across M systems".
- Actions: Edit, icon-only Trash (danger tint).
- **Context cards grid** (1 / 2 / 3 columns depending on how many contexts the device has): per-context card with SystemChip header, edit icon, 2-col body of R1 / R2 with labels and mono **24px** values + "min" unit. Missing-context slots: dashed-border placeholder "+ Add context".
- **Normative history card** below — table: Date (mono tiny), Author, System (SystemChip), Change (plain text), Status chip.

Data: call to `/admin/device-types`. Align with TOR §4.2 `device_types` + `device_system_contexts`.

---

## Interactions & Behavior

- **Tables:** hover row → `#fafaf7` bg. Entire row clickable where applicable (navigate to detail). Chevron on right is decorative.
- **Sidebar nav items:** hover → `--bg-sunken` bg. Active → `--ink` bg, white text.
- **Buttons:** primary (`bg: --ink`, white text) / ghost (transparent, `border: 1px --line-strong`). Both 6px radius, `8px 14px` padding. No elevation.
- **Chips:** 2px 8px, 999px radius. The leading dot is `currentColor`, 6px.
- **Stale indicator:** warn StatusChip "stale" appears in Object subtext rows per TOR §7 stale banner rules (MVP only — in PoC this chip is never shown).
- **Period pill:** green dot when an active period exists, red-tinted chip "No active period" when the backend returns no active period (blocks repair/records data entry per TOR §4.12).
- **No animations beyond MUI defaults.** This is a dense data tool — motion should be minimal. Skeleton shimmer on initial table load is fine.

## State Management

Continue using:
- **TanStack Query** for all server data via existing hooks in `src/hooks/`. The handoff introduces no new caching.
- **Zustand** only for `authStore` (existing). Do not add new stores for UI-only state — lift local state into the page component.
- **URL-as-state** for СВОД pagination and division filter (use `useSearchParams`). This enables deep links like `/svod?division=<id>&page=3`.

New hooks to add (conforming to existing naming):
- `useEngineers(filters?)` → `GET /api/v1/engineers`
- `useEngineer(id)` → `GET /api/v1/engineers/:id`
- `useDeviceTypes()` → `GET /api/v1/device-types`
- `useDeviceType(id)` → `GET /api/v1/device-types/:id`

## Forms & Validation

Keep React Hook Form + Zod. Add schemas to `src/types/engineer.ts` and `src/types/catalog.ts` matching TOR §4.10 / §4.2.

## Accessibility

- All icon-only buttons must have `aria-label`.
- Color alone must not signal overload state — always pair color with the StatusChip text ("Overloaded", "Near cap", "Healthy").
- Numeric cells need `text-align: right`; keep this in DataGrid `align: 'right'` + `headerAlign: 'right'`.
- Tab panels must preserve existing `role="tabpanel"` + `aria-labelledby` wiring in `ObjectDetailPage.tsx`.

---

## Files in this bundle (design references only)

- `Workload Calculator.html` — entry point; opens the design canvas with all 5 screens
- `styles.css` — canonical design tokens + component classes. **Treat this as the source of truth for tokens.**
- `components.jsx` — shared primitives (Icons, Sparkline, Donut, CapBar, StatusChip, Sidebar, Topbar). Read to understand intent; do not copy JSX directly into MUI.
- `design-canvas.jsx` — the canvas host. Not part of the product.
- `screens/dashboard.jsx` — screen 01
- `screens/svod.jsx` — screen 02
- `screens/object-detail.jsx` — screen 03
- `screens/engineers.jsx` — screen 04
- `screens/catalog.jsx` — screen 05

To view the mocks locally: open `Workload Calculator.html` in a browser via a static file server (e.g. `python -m http.server` from the handoff folder).

## Implementation Order (suggested)

1. **Tokens + theme + fonts** — `src/theme.ts`, wrap `main.tsx` in `<ThemeProvider>`, add Google Fonts `<link>` in `index.html`. Verify every existing page still renders (should just look reskinned).
2. **Shared common components** — `Num`, `Sparkline`, `CapBar`, `StatusChip`, `SystemChip`, `KpiTile`. Unit-test `Num` zero-handling.
3. **AppLayout reskin** — sidebar sectioning, brand block, badges, user chip, topbar period pill.
4. **Dashboard** — KPIs row, division table with sparklines, top objects + overloaded engineers column.
5. **СВОД** — DataGrid restyle, segmented division filter, sticky footer totals.
6. **Object Detail** — split Equipment tab into layers A + B, add right summary rail with dark hero card.
7. **Engineers** — capacity distribution card + full table (new hook required).
8. **Device catalog** — new route + master/detail layout + new hooks.

Each step is independently shippable behind no feature flag.

## Out of Scope

- Mobile breakpoints (product is desktop-only per TOR §8).
- Dark mode.
- Localization toggle — UI copy is a mix of English and Russian per domain convention (ОС, ПС, СВОД, ИТОГО Числ are kept in Russian even when the rest of the UI is English; this matches the existing codebase).
- Any change to API, types, backend, or routing paths (except adding `/admin/catalog` and `/engineers/*`).
