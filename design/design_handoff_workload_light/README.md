# Handoff: Workload Calculation System — "Quiet" Direction

## Overview

Internal web application for a bank's facilities-engineering team. The system calculates **maintenance workload** (FTE — full-time-equivalents) for thousands of bank objects (branches, ATMs, offices) based on physical inventory of security/fire/video equipment, per-device norms (R1, R2), and travel distance.

Core domain entities: **Objects**, **Engineers**, **Divisions** (7 regional), **Device Catalog** (per-system norms for ОС / ПС / Видео). The flagship view is **СВОД** — a consolidated 14-column workload table across all 2 935 objects.

This handoff covers the **"Quiet" visual direction**: editorial calm, hairline-separated, borderless, data-first. Same density as the prior hi-fi version but ~60% less visual chrome.

## About the design files

The files in `prototype/` are **design references created in HTML** — React + inline JSX prototypes shown on a `DesignCanvas` for side-by-side review. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase** (existing stack: **React 18 + TypeScript + Vite + MUI v5 + React Router 6 + TanStack Query + Zustand + RHF + Zod + MUI X DataGrid**) using its established patterns. Apply the design system tokens documented below; map the prototype's hand-rolled CSS classes to MUI `sx` props or a thin `styled()` layer + a theme override.

## Fidelity

**High-fidelity.** All colors, spacing, type ramps, table row heights, chip styles, and layout grids are final. Recreate pixel-perfectly using MUI components, with a custom theme that overrides MUI defaults to match the tokens below. **Do not re-skin MUI defaults inline**; centralize in `theme.ts`.

The user already has an `EngineerListPage.tsx` working with MUI Table + Select + Chip. The Engineers screen in the prototype is the Quiet refactor of that file — use it as the worked example for how MUI maps to Quiet.

---

## Design tokens

Implement these in `theme.ts` (MUI `createTheme`) + a CSS variable layer for non-MUI parts.

### Colors

```ts
// Surfaces
bg:        '#f6f6f4'  // page background
bgElev:    '#ffffff'  // elevated surfaces (drawer, modal, master-row selected)
bgSunken:  '#efeeea'  // segmented control track, dist-bar empty, hover

// Lines (hairlines only, used sparingly)
line:        '#e4e2dc'  // default 1px borders
lineStrong:  '#d4d1c9'  // input borders, modal borders

// Ink (text)
ink:    '#1a1a1a'  // primary text, titles
ink2:   '#3d3d3a'  // body
ink3:   '#6b6a64'  // muted, table cells, captions
ink4:   '#9a988f'  // disabled, breadcrumb separators, very meta

// Accent / states (used sparingly — see "Color discipline")
accent:      '#3a4fcf'   accentSoft: '#e8ebff'   accentInk: '#1a2a8a'
ok:          '#2d7a4a'   okSoft:     '#e3f1e6'
warn:        '#a66600'   warnSoft:   '#fbedd2'
danger:      '#b23a3a'   dangerSoft: '#fbe5e0'
```

### Color discipline (CRITICAL)

Quiet specifically reduces accent fills. Apply these rules:

- **System type chips (ОС / ПС / Видео)** — only on **Device Catalog detail page** (header chips, per-system norm cards). **Removed from row data** in СВОД, Engineers, Object Detail tables. In tables, the System column is plain `ink-3` muted text.
- **Avatars** — only in sidebar user-chip and on Engineer profile pages. **Removed** from Engineer list rows (name + email stack as plain text).
- **Status chips** (ok/warn/danger) — used for overload, gap, OK status only.
- **Hero ИТОГО Числ** — the only place a dark filled card appears (in the Drawer).
- **Tone via value color** — KPI tiles communicate state by changing the value's color, not by a colored card border or fill.

### Typography

```ts
fontFamily:  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
fontMono:    "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
fontFeatureSettings: "'cv11', 'ss01'"
fontVariantNumeric:  "tabular-nums"  // body-wide
```

Inter weights in active use: **400** (body), **450** (table cells, body), **500** (table totals, nav active, KPI value), **600** (titles, section labels). Weight 700 is used **only** in the brand wordmark "W" mark.

JetBrains Mono **500/600** — used for **all numeric data** (FTE, percentages, IDs, dates, ratios). Body has `font-variant-numeric: tabular-nums` so even Inter numbers align.

#### Type ramp

| Class       | Size | Weight | Letter-spacing | Use |
|-------------|------|--------|----------------|-----|
| `t-page-title` | 28 | 600 | -0.02em | H1 / page titles |
| `t-h1`       | 24 | 600 | -0.015em | dialog titles, secondary heads |
| `t-h2`       | 18 | 600 | -0.01em | drawer titles |
| `t-section`  | 11 | 600 | 0.06em uppercase | **Section labels above grouped blocks (replaces card titles)** |
| `t-eyebrow`  | 11 | 500 | 0.02em | small label above title (e.g. "New object") |
| `t-body`     | 14 | 450 | — | body |
| `t-small`    | 13 | 450 | — | secondary body |
| `t-meta`     | 12 | 400 | — | captions, footers, meta text |
| `t-table-h`  | 11 | 600 | 0.04em uppercase ink-3 | table headers |
| `t-table-c`  | 13 | 450 | — | table cell text |
| `t-kpi`      | 30 | 500 mono | -0.02em | KPI value |
| `t-hero`     | 42 | 500 mono | -0.025em | drawer hero ИТОГО |

### Spacing scale

```
gap-xs:  8   gap-s:  12   gap-m:  20
gap-l:   32  gap-xl: 40   gap-xxl: 56
```

Editorial steps — spacing replaces borders. Sections separated by `gap-xl` (40px). Inside a section, blocks separated by `gap-m`–`gap-l`.

### Radius

```
r-sm: 6   r-md: 10   r-lg: 14   r-pill: 999
```

### Table

- Row height **52px** (was 44 in prior version — extra breath replaces vertical dividers)
- Header: 11/600/uppercase ink-3, padding 10px 12px
- Cell: 13/450 ink-2, padding 14px 12px, `border-bottom: 1px var(--line)`
- **No vertical rules.** **No sunken background on the totals column** (column stays bold + mono, plain bg).
- Hover: `tr:hover td { background: rgba(0,0,0,0.012) }`
- Sparklines / trend columns: `opacity: 0` by default, `tr:hover .row-trend { opacity: 1 }`
- Numeric columns: right-aligned, mono, tabular-nums

### Chips, buttons, inputs

- **Button** — 32px height, 12px h-padding, `r-sm`, `1px lineStrong` border. Primary = filled `ink` bg, white text.
- **Input** — 32px height (or 38px `lg` variant in dialogs), `1px lineStrong` border, `r-sm`. Focus border = `ink`.
- **Chip** — `r-pill`, 11/500, 2px 8px padding. Tone variants: `ok / warn / danger / accent / ghost` use the soft bg + ink color from the palette.
- **Search input** — leading magnifier icon, trailing `⌘K` mono kbd hint in 4px badge.

### Sidebar

- 200px wide, `bg` (no fill), `1px line` right border
- Brand: 22px square ink mark + 13/600 wordmark
- Section labels: 10/600/0.08em uppercase ink-4, 10px left-padding, 28px gap between sections
- Nav item: 13/400 ink-3, 6px 10px padding, 2px transparent left border. Active = ink text, `2px ink` left border, weight 500. **No filled background.** **No icons. No badges.**
- User chip pinned at bottom — 24px avatar (initials, ink-4 fill, white text), name 12/500, division 11/ink-3.

### Drawer

- 380px wide, anchored right, `bgElev`, `1px line` left border, **no shadow**
- Scrim: `rgba(20,20,18,0.18)`, `pointer-events: none` (page stays interactive — dismiss via × or Esc)
- Drawer head: 15/600 title + × close button (24px, `r-sm` hover bg)
- Sections separated by 28px top margin + `t-section` label
- Triggered from page header via `Details ›` / `FTE breakdown ›` button (ghost-styled with chevron)

### Modal dialog (Create object / Create engineer)

- Centered, 520–560px wide, `bgElev`, `r-lg`, **`1px lineStrong` border** (borders **kept here** — modals are the one place explicit borders are warranted)
- Padding 28px 32px 24px 32px
- Scrim: `rgba(20,20,18,0.32)` (heavier than drawer)
- Eyebrow + h1 stacked at top, × close button right
- Footer separator: 1px `line` top border + 20px padding-top, contains hint text + Cancel / Primary buttons

---

## Screens

20 artboards in the prototype, organized into 5 sections on the design canvas.

### 1 · Login (split brand)
Two-column layout. Left: dark `ink` brand pane with wordmark, headline, lede, and a **3-cell hairline KPI strip** (Objects 2 935 / Required FTE 187.42 / Engineers 204) using mono 22/500. Right: sign-in form (email, password, "Keep me signed in" checkbox, primary "Sign in", ghost "Continue with corporate SSO").

### 2 · Login (minimal card)
380px card centered on a faint 32px grid background. Logo + wordmark, "Sign in" h1 + meta, email + password fields, primary button, "or" divider, SSO button.

### 3 · Dashboard
- Page head: breadcrumb `Workload / Overview`, h1 "Maintenance workload", subtitle. Actions: period segmented control (FY25 / FY26 / Q-by-Q), `Details ›`, primary `Recalculate`.
- **KPI row** (4 columns, hairline-separated): Required FTE 187.42 (+2.14 vs Q3, ok delta) / Objects 2 935 / Coverage gaps 4.3 (warn tone) / Overloaded engineers 7 (danger tone).
- **Section: "FTE by division"** (`t-section` label) — 7-row table with Division / Objects / Required FTE / Coverage gap / Status chip / hover-only sparkline.
- **Section: "Top objects by workload"** — top 5, format: `[mono ID] [Object name] [bold mono total]`.
- Right column (Top objects, Overloaded engineers panels) **moves to Drawer** — opened via `Details ›` button.

### 4 · СВОД (Consolidated)
- Page head: breadcrumb, h1 "СВОД", subtitle "Consolidated workload across all objects · 2 935 rows". Actions: `Export CSV`.
- Filter row: division pill segmented control (All + 7 divisions) on `bgSunken` track + search (`⌘K` hint) + Filter button.
- Right side of filter row: `Precision: 2 decimals · show full` toggle.
- **14-column DataGrid** (use MUI X): #, Object, Eng, PZV, Travel, ПС, Видео, ОС, Records, Repair, R1, R2, FTE no tr, **ИТОГО Числ** (bold mono totals column).
- Numeric columns rounded to **2 decimals**; "show full" expands to 4–6.
- No dashed group dividers. No sunken background on ИТОГО column.
- Footer: `Showing 1–10 of 2 935` left, `Avg / Σ page / Σ all` mono center, pagination right.

### 5 · Object detail
- Page head: breadcrumb chain `Workload / Objects / Минск гор. / 03-021`, h1 "Минск — Партизанский 6А", subtitle "Отделение №217 · Минск гор. · обслуживается с 2014". Actions: `Edit object`.
- Meta row: `Tier-2 office` chip + `03-021` mono ID + `FTE breakdown ›` button right.
- **Inline summary strip** (5 hairline columns): ИТОГО Числ 1.611624 (mono 32) / FTE no travel 0.43 / Travel 0.02 / Engineers 3 / Visits/yr 24. **This strip is critical — it gives the middle of the page hierarchy without a card.**
- Tabs: Equipment (8 · 6 muted mono count) / Records / Repairs / Travel / Engineers. Active tab = 2px ink underline, no pill bg.
- **Section A · Physical inventory** — 8-row borderless table: Device / Qty physical / Assigned to systems (plain text, comma-separated).
- **Section B · System assignments** — 6-row table: Device / System / Qty maintained / R1 / R2 (4 decimals mono) / Contribution per visit (bold mono totals).
- **Drawer** (opened via `FTE breakdown ›`): dark hero card with ИТОГО 1.611624 mono 42 + 4-cell sub-stats, By system progress bars, Per-visit breakdown grid, Assigned engineers list with CapBars.

### 6 · Engineers
Refactored from `EngineerListPage.tsx`.
- Page head + primary `Create engineer`.
- **Capacity distribution stacked bar** (8px height): Normal 142 (ok green) / Watch 48 (warn) / Overloaded 14 (danger). Legend below with dots.
- Filter row: search + division Select + status Select.
- Table columns: Engineer (name + email stack, **no avatar**) / Division / Objects / FTE load / Capacity 1.90 (ink-3 muted) / **Utilisation CapBar** / Status chip (dot + %).
- 8-week trend column **removed**.

### 7 · Divisions (NEW page)

> **Note:** the existing `DivisionListPage.tsx` already renders divisions but with the old visual language. Refactor that file rather than creating a parallel page.

- Page head: breadcrumb `Workload / Reference / Divisions`, h1 "Divisions", subtitle "7 regional divisions · 2 935 objects · 204 engineers". Primary `Create division` (uses existing `DivisionCreateSchema`).
- KPI row: Divisions 7 / Total objects 2 935 / Total engineers 204 / Avg utilisation 89% (warn delta "1 division > 100%"). Numbers come from `useAggregations()` totals where possible.
- **Section: "All divisions"** — 7-row table: Code (mono BRE/VTB/GMV/GRD/MNS/MGV/MNG — derive from name if backend doesn't provide) / Division name / Head engineer / Region city / Objects / Engineers / FTE req. (totals column) / Gap (colored value if > 0) / Utilisation CapBar.
- Row click → `/divisions/:id` (existing `DivisionDetailPage`).
- If the extended fields aren't available yet, render `—` placeholders rather than blocking the screen on a backend change.

### 8 · Device catalog (master / detail)
- 380px master rail / 1fr detail.
- Master: section label "Device catalog" + search + 10-row borderless list. Each row: device name (left) + uses count mono right + system tags below in 11/ink-4. Selected row: `2px ink` left border + `bgElev` fill + ink text.
- Detail: breadcrumb `Catalog / [system]`, system color chip, h1 device name, "Used on N objects" meta.
- **Section: "Per-system norms"** — auto-fit grid of cards. Each card: system color chip, R1 (per device · year) mono 24, R2 (per visit) mono 24. **System color is intentionally kept here.**
- **Section: "Normative history"** — borderless table: Effective (mono date) / R1 / R2 / Updated by / Note.

### 9 · Create object dialog
560px modal over dimmed (55% opacity) Objects page. Eyebrow "New object" + h1 "Create object" + meta. **2-column form grid**: Object name (full-width) / Object ID (mono) / Tier (Select) / Division (Select) / Branch № / Address (full-width) / Travel norm h (mono) / Visits / year (mono). Footer: hint left "Equipment & assignments are added after creation", Cancel + primary `Create object` right.

### 10 · Create engineer dialog
520px modal over dimmed Engineers page. Eyebrow "New engineer" + h1. Single-column: Full name / Email / [Capacity FTE mono | Home division Select] / Initial password with "Min 8 characters · engineer must change on first sign-in" hint. Footer: "Send welcome email" checkbox left, Cancel + primary `Create engineer` right.

---

## Additional screens (added in v2)

### 3b · Object list
Route `/objects`. Filter row: search + division Select + tier Select + branch Select + count meta right. Table columns: ID (mono) / Object / Division / Branch (mono ф-NNN) / Tier (chip — `Tier-1 branch` solid chip, others ghost) / FTE (totals) / Engineers / chevron. Footer: count + pagination. Row click → `/objects/:id`.

### 5b · Object · Records tab
Section "Maintenance records" · 24/year count meta. Table: Date (mono ISO) / Type (ТО-1 / ТО-2 / Inspection) / Engineer / Hours (mono 2-decimal) / Note. No avatars on engineer column.

### 5c · Object · Repairs tab
Section "Repair history" · 12-month count meta. Table: Date / System (plain muted text — no color chip) / Description / Engineer / Hours / Status chip (`closed` ok). Filter for status added if backend supports open/closed.

### 5d · Object · Travel tab
Hairline 4-cell stat strip: One-way distance (12.4 km) / One-way duration (0.45 h) / Visits per year (24) / Annual travel FTE (mono totals). Below, "Origin & route" 2-col table: Origin branch / Transport mode / Distance method (with manual override hint in muted) / Last verified (mono date + author).

### 5e · Object · Engineers tab
Section "Assigned engineers" · sum FTE meta + `+ Assign engineer` button right. Table: Engineer (name + email stack, no avatar) / Role (`Lead` accent chip / `Co-engineer` ghost chip) / FTE share (totals) / % of object / Their utilisation (CapBar) / chevron. Backed by existing `useObjectEngineers()` hook.

### 6b · Engineer detail
Route `/engineers/:id`. Header: large 32px avatar (only place avatars appear in lists/details) + status chip + meta + `Reassign objects` button right. Hairline 5-cell stat strip: FTE load (1.94 danger color) / Capacity / Utilisation / Objects / Divisions. Section "FTE by system" — 3-row stacked progress bars (ОС / ПС / Видео values + percentages). Section "Assigned objects" — sortable table with FTE share + % of total. Refactor existing `EngineerDetailPage.tsx`.

### 7b · Division detail
Route `/divisions/:id`. Page head + `Edit division`. KPI row: Objects / Engineers / Required FTE / Utilisation (with tone). Section "Branches" — table: Code (mono ф-NNN) / Branch / Objects / Engineers / FTE req. (totals) / chevron. Refactor existing `DivisionDetailPage.tsx`.

### 7c · Branch detail
Route `/branches/:id`. Page head + `Edit branch`. KPI row: Objects / Engineers / Required FTE / Avg per object. Section "Objects in this branch" — table: ID (mono) / Object / Tier / FTE (totals) / chevron. Refactor existing `BranchDetailPage.tsx`.

### 11 · Create division dialog
480px modal. Single field: Division name. Footer hint: "Code is auto-derived from name". Uses existing `DivisionCreateSchema`.

### 12 · Create branch dialog
480px modal. Two fields: Branch name + Division Select. Footer hint: "Branch №/ID is auto-assigned". Uses existing `BranchCreateSchema`.

---

## State management & data

Continue current stack:
- **TanStack Query** — server state (engineers, objects, divisions, catalog, СВОД, summaries)
- **Zustand** — auth store, UI prefs (precision toggle, period selector, drawer open state)
- **React Hook Form + Zod** — all dialogs (Create object, Create engineer, edit forms)
- **React Router 6** — route map below

### Routes

```
/login
/dashboard
/svod
/objects                          → Object list (not in prototype, but route exists)
/objects/:id                       → Object detail
/engineers
/engineers/:id                     → Engineer detail (existing)
/divisions                         → Divisions list (NEW — implement per screen 7)
/divisions/:id                     → Division detail (existing)
/catalog                           → Device catalog (master/detail in same route)
/catalog/:deviceId
```

### Per-screen state

| Screen | UI state | Server state (TanStack Query) |
|--------|----------|-------------------------------|
| Dashboard | `period`, `drawerOpen` | `useDashboardSummary(period)` |
| СВОД | `division`, `search`, `precision`, `page`, `pageSize` | `useSvod({ division, search, page })` |
| Object detail | `tab`, `drawerOpen` | `useObject(id)`, `useObjectInventory(id)`, `useObjectAssignments(id)` |
| Engineers | `nameSearch`, `divisionFilter`, `statusFilter`, `dialogOpen` | `useEngineers({ status, divisionId })` (existing), `useDivisions()` (existing), `useCreateEngineer()` (existing) |
| Divisions | — | `useDivisions()` returns `{ id, name, branchCount, objectCount }` today. The Divisions list screen needs **head engineer / engineer count / required FTE / gap / utilisation** in addition. **Two options**: (a) extend the backend `DivisionDto` and `DivisionSchema` with these fields (preferred), or (b) compose them client-side via parallel calls to `useEngineers({ divisionId })` and `useDivisionSummary(id)` from `useAggregations`. Pick (a) if the backend team is available; otherwise build a `useDivisionsWithMetrics()` composite hook. |
| Catalog | `selectedDeviceId`, `search` | `useCatalog()` (existing), `useCatalogDevice(id)`, `useCatalogHistory(id)` |
| Create dialogs | RHF form state, `mutation.isPending` | `useCreateObject()` (NEW), `useCreateEngineer()` (existing) |

### Form schemas (Zod)

**Reuse existing schemas — do not introduce a new shape.**

- `EngineerCreateSchema` (`src/types/engineer.ts`) — already covers name, email, password, capacityFte, homeDivisionId. The Quiet dialog (screen 10) renders these same fields. The "Send welcome email" checkbox is **dialog UI state only**, passed as a separate argument to the mutation, not part of the schema.

- `ObjectCreateSchema` (`src/types/object.ts`) — current shape is `{ name, branchId, address? }`. The Quiet Create-object dialog (screen 9) shows additional fields (Tier, Travel norm, Visits/year) that are **not** in the current backend contract. Treat those extra fields as **visual placeholders for future scope** and only wire `name`, `branchId` (replaces "Division" Select — load via `useBranches()`), and `address` to the mutation. Display the others as `disabled` inputs with a small "coming soon" meta hint, or omit them in v1. **Do not silently invent a new backend contract.**

If the team decides to expand the Object contract later, add a new schema (`ObjectCreateSchemaV2`) and migrate the API + dialog together.

---

## Theme implementation

Create `src/theme.ts`:

```ts
import { createTheme } from '@mui/material';

const tokens = {
  bg: '#f6f6f4', bgElev: '#ffffff', bgSunken: '#efeeea',
  line: '#e4e2dc', lineStrong: '#d4d1c9',
  ink: '#1a1a1a', ink2: '#3d3d3a', ink3: '#6b6a64', ink4: '#9a988f',
  // ... + accent / ok / warn / danger pairs
};

export const theme = createTheme({
  palette: {
    background: { default: tokens.bg, paper: tokens.bgElev },
    text: { primary: tokens.ink, secondary: tokens.ink3 },
    divider: tokens.line,
    primary: { main: tokens.ink },
    success: { main: tokens.ok },
    warning: { main: tokens.warn },
    error:   { main: tokens.danger },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeightRegular: 450,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: { fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' },
    // ... full ramp from "Type ramp" table
  },
  shape: { borderRadius: 6 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', height: 32 } } },
    MuiPaper:  { defaultProps: { elevation: 0 } },
    MuiTableCell: { styleOverrides: { root: { padding: '14px 12px', borderColor: tokens.line }, head: { textTransform: 'uppercase', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: tokens.ink3 } } },
    MuiTableRow:  { styleOverrides: { root: { height: 52, '&:hover': { backgroundColor: 'rgba(0,0,0,0.012)' } } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999, fontSize: 11, fontWeight: 500, height: 22 } } },
    MuiOutlinedInput: { styleOverrides: { root: { height: 32, fontSize: 13, '& fieldset': { borderColor: tokens.lineStrong } } } },
    // ... more overrides per Quiet specs
  },
});
```

Add CSS vars in `src/index.css` for non-MUI components (Sidebar, Drawer, layouts):

```css
:root {
  --bg: #f6f6f4; --bg-elev: #ffffff; /* ...etc */
}
body { font-variant-numeric: tabular-nums; }
.mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
```

---

## Net-new components to build

Place in `src/components/common/`:

- **`<PageHead>`** — props: `crumbs[]`, `title`, `subtitle`, `actions?` (slot). Replaces ad-hoc page headers.
- **`<KPIRow>`** — props: `items: { label, value, delta?, deltaTone?, tone? }[]`. Hairline 4-col grid.
- **`<Drawer>`** — wraps MUI `Drawer` with the Quiet styling (380px, no shadow, hairline border, `pointer-events: none` scrim). Use `DrawerSection` subcomponent for grouped content with `t-section` labels.
- **`<CapBar>`** — props: `pct: number`. Auto-tones >100 danger, >90 warn. Used in tables and drawer.
- **`<DistBar>`** — stacked-segment bar, props: `segments: { tone, w, label, count }[]`. Used on Engineers page.
- **`<SectionBlock>`** — vertical rhythm helper: 40px top margin + `t-section` label + meta + children.
- **`<HeroCard>`** — dark `ink` bg, white text, hero mono number 42 + sub-stats grid. Used inside Drawer.
- **`<Spark>`** — props: `data: number[]`. 64×18 SVG polyline. Used in row-hover trend cells.

Place in `src/components/dialogs/`:

- **`<CreateObjectDialog>`** — RHF + Zod, MUI `Dialog`, layout per screen 9.
- **`<CreateEngineerDialog>`** — refactor existing dialog from `EngineerListPage` per screen 10.

Place in `src/pages/`:

- **`DivisionsListPage.tsx`** — NEW per screen 7. Wire to extended `useDivisions()` hook.

---

## Migration plan (suggested order)

1. **Theme + CSS vars** — `theme.ts`, `index.css`. Wrap app in `ThemeProvider`. Remove any inline color/spacing in existing pages and let theme drive.
2. **Common components** — Build `PageHead`, `KPIRow`, `Drawer`, `CapBar`, `DistBar`, `SectionBlock`, `HeroCard`, `Spark`. Add Storybook entries if you have Storybook.
3. **Sidebar refactor** — Rebuild `AppLayout.tsx` sidebar per screen specs (text-only, sections, no icons/badges).
4. **Existing pages** — Apply Quiet to `DashboardPage`, `SvodPage`, `EngineerListPage`, `ObjectDetailPage`, `EngineerDetailPage`, `DivisionDetailPage`. Move right-rail content into Drawer pattern. Apply 2-decimal precision rounding + show-full toggle on СВОД.
5. **Net-new pages** — `DivisionsListPage`. `CreateObjectDialog` (and wire `useCreateObject` mutation if API doesn't exist yet).
6. **Polish** — sparkline hover-only on Engineers + Dashboard, system-color removal from row data, avatar removal from Engineers list, table row height 52px globally.

---

## Files in this bundle

```
prototype/
  Workload - Quiet.html       Main entry (open in browser to see all 10 artboards on a canvas)
  styles.css                   Token implementation reference
  components.jsx               Sidebar, PageHead, KPIRow, Drawer, CapBar, Spark
  screens-1.jsx                Login×2, Dashboard, СВОД
  screens-2.jsx                Object detail, Engineers, Catalog
  screens-3.jsx                Divisions, Create dialogs
  design-canvas.jsx            Canvas host (not for prod use)

../Workload - Quiet.html       Same prototype, in project root
../README.md                   Original delta-style handoff (companion read)
../COMPARISON.md               5 before/after diffs vs prior hi-fi version
```

To preview the design while implementing: `open "prototype/Workload - Quiet.html"` in any modern browser. Each artboard label maps to a screen number above (e.g., "03 · Dashboard" = screen 3).

---

## Domain glossary (preserved verbatim — do not translate in UI)

- **СВОД** — consolidated workload table (the 14-col DataGrid)
- **ИТОГО Числ** — total numeric workload, the bold mono totals column
- **ОС** — охранная сигнализация (security alarm)
- **ПС** — пожарная сигнализация (fire alarm)
- **Видео** — видеонаблюдение (CCTV)
- **PZV** — подготовительно-заключительное время (prep + closing time per visit)
- **R1** — годовая норма на устройство (annual norm per device)
- **R2** — норма на одно посещение (per-visit norm)
- **FTE no tr** — FTE excluding travel time
- **Числ** — численность (head-count units)

These appear in column headers, breadcrumbs, and meta strings in the prototype. Keep all Russian/Belarusian engineer names and city names verbatim — the dataset is bilingual by design.
