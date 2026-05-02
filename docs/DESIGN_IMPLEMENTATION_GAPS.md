# Design Implementation Gap Analysis

**Date**: 2026-05-01  
**Branch**: `feature/design-quiet-step4-new-pages`  
**Scope**: Comparison of implemented Quiet design pages vs. design handoff specification in `design/design_handoff_workload_light/README.md`

**Last updated**: 2026-05-02 — added Login page gaps (Screens 1 & 2); added create dialog audit (Screens 9–12); added SvodPage filter row gap, CatalogPage chip color gap, global Buttons/Inputs/Dropdowns gaps, codebase hygiene issue (stale DivisionListPage)

---

## Overview

This document catalogs all gaps between the proposed design specification and the current frontend implementation. Gaps are categorized by page/screen, with notes on data availability and implementation feasibility.

---

## Screens 1 & 2 - Login Page (`/login`)

### Design Specification
**Source**: `README.md` §"1 · Login (split brand)" and §"2 · Login (minimal card)"

Two design options were specified — either is acceptable; Screen 2 (minimal card) is the simpler implementation target.

**Screen 1 (split brand)**:
- Two-column full-height layout
- Left: dark `ink` (#1a1a1a) background pane with 22px brand mark + "Workload" wordmark + headline + lede + 3-cell hairline KPI strip (Objects 2 935 / Required FTE 187.42 / Engineers 204) in mono 22/500
- Right: sign-in form

**Screen 2 (minimal card)** — simpler target:
- Background: `bg` (#f6f6f4) with faint **32px grid pattern** (not a gradient)
- Card: 380px wide · `bgElev` · `r-lg` · `1px lineStrong` border (no shadow — `elevation: 0`)
- Brand: 22px square ink mark + 13/600 "Workload" wordmark
- `h1` "Sign in" (24/600) + meta subtitle below
- Fields: Email (outlined, 32px) · Password (outlined, 32px)
- "Keep me signed in" checkbox
- Primary "Sign in" button (32px height, full-width)
- "or" text divider
- Ghost "Continue with corporate SSO" button (full-width)

---

### Current Implementation

**File**: `frontend/src/pages/LoginPage.tsx`

**Background**: ❌ CSS `linear-gradient(135deg, rgba(232,240,254,1) …)` — blue-green gradient; design specifies `bg` color with faint grid pattern

**Card**:
- ❌ `maxWidth: 420` — design says 380px
- ❌ Plain MUI `<Card>` with default shadow and radius — no `bgElev`, no `1px lineStrong` border, no `elevation: 0`, no `r-lg` override

**Brand / Header**:
- ❌ `<Typography variant="h4">Workload Calculation System</Typography>` — full title as h4; design shows compact logo mark + "Workload" wordmark + "Sign in" as separate h1
- ❌ `<Typography variant="h6">Sign In</Typography>` — wrong element, wrong size (h6 ≠ t-h1 24/600)
- ❌ No meta subtitle below h1

**Form fields**:
- ❌ `variant="standard"` on both Email and Password — renders as underline inputs; design specifies `variant="outlined"` at 32px height

**Submit button**:
- ❌ `sx={{ minHeight: 44 }}` — design specifies 32px height (theme default); 44px is non-compliant
- ✅ "Sign in" label correct

**Missing elements**:
- ❌ No "Keep me signed in" checkbox
- ❌ No "or" divider
- ❌ No "Continue with corporate SSO" ghost button
- ❌ No KPI strip (required only for Screen 1 split-brand variant)

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Replace gradient background with `bg` + faint grid pattern | High | Grid pattern can be done with CSS `background-image: repeating-linear-gradient` or SVG — no images needed | Easy |
| Fix card width to 380px | Medium | Change `maxWidth: 420` → `maxWidth: 380` | Easy |
| Apply Quiet card styling (no shadow, `lineStrong` border, `r-lg`) | High | Add `elevation={0}` and `sx={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--r-lg)' }}` to `<Card>` | Easy |
| Replace brand title with logo mark + "Workload" wordmark + "Sign in" h1 | High | Remove `<Typography variant="h4">` · add brand mark (22px `<Box>` with "W") + wordmark text + separate `<Typography>` h1 "Sign in" | Easy |
| Add meta subtitle below "Sign in" h1 | Low | 13/450 ink3 subtitle (e.g. "Internal maintenance workload system") | Easy |
| Change inputs to `variant="outlined"` | High | Remove `variant="standard"` from both fields — `outlined` is the Quiet standard and matches theme override | Easy |
| Fix submit button height to 32px | Medium | Remove `minHeight: 44` — theme already sets button height to 32 globally | Easy — just remove the override |
| Add "Keep me signed in" checkbox | Medium | `<FormControlLabel control={<Checkbox />} label="Keep me signed in" />` — store in RHF or local state; pass to login mutation if API supports it | Easy |
| Add "or" divider | Low | MUI `<Divider>` with text prop (`<Divider>or</Divider>`) | Easy |
| Add "Continue with corporate SSO" ghost button | Low | `<Button variant="outlined" fullWidth>Continue with corporate SSO</Button>` — can be non-functional placeholder | Easy |

**Note on Screen 1 (split brand)**: The KPI strip on the left brand pane requires live data from `useAggregations()`. This is a higher-effort variant. Screen 2 (minimal card) is the recommended implementation target and requires no API changes.

---

## Screen 4 - СВОД Page (`/svod`)

### Design Specification
**Source**: `README.md` §"4 · СВОД (Consolidated)"

**Filter row**:
- Division filter: **pill segmented control** (All + 7 division names as pill buttons) on a `bgSunken (#efeeea)` track
- Search field with `⌘K` kbd hint
- Right side: `Precision: 2 decimals · show full` toggle

---

### Current Implementation

**Filter row**:
- ❌ **WRONG COMPONENT**: Division filter is a standard MUI `<Select>` dropdown, not a pill segmented control on a `bgSunken` track
- ✅ Search field present (no `⌘K` hint — see global inputs section)
- ✅ Precision toggle exists (accent-colored text button)

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Replace division `<Select>` with pill segmented control | High | Design explicitly specifies pills on `bgSunken` track — this is the primary filter interaction for СВОД | Easy — pure frontend, no data changes; replicate the `Box component="button"` pattern already used for period toggle in DashboardPage |

**Note**: The plan document `ws-a-03-design-quiet-existing-pages.md` Task 3 correctly specified "pill segmented control" but the implementation used a `<Select>` instead.

---

## Screen 3b - Object List Page (`/objects`)

### Design Specification
**Source**: `README.md` §"3b · Object list"

**Filter row**:
- Components: search + division Select + tier Select + branch Select + count meta (right)
- Behavior: search filters objects real-time; tier disabled (future scope); count shows filtered result total

**Table columns** (8 columns):
1. ID (mono, left)
2. Object (name, left)
3. Division (left)
4. Branch (mono, format ф-NNN, left)
5. Tier (chip — `Tier-1 branch` solid chip, others ghost, left)
6. FTE (totals column, bold mono, right)
7. Engineers (count, right)
8. Chevron → (right)

**Row interaction**:
- Click → `/objects/:id`
- Hover: subtle bg

**Pagination**: footer with count + pagination

---

### Current Implementation

**Filter row**:
- ✅ Search field (filters real-time)
- ✅ Division Select
- ✅ Tier Select (disabled, marked "future scope")
- ❌ **MISSING**: Branch Select filter
- ❌ **MISSING**: Count meta on right (currently shows "N objects" but placement/style unclear)

**Table columns** (currently 5):
1. ✅ ID (mono, first 8 chars of UUID)
2. ✅ Object name
3. ✅ Division
4. ✅ Branch (mono)
5. ✅ FTE (bold mono, using `itogoChisloWithTravel`)

**Missing columns**:
- ❌ Tier chip (Object schema has no `tier` field)
- ❌ Engineers count (no `engineerCount` exposed per object)
- ❌ Chevron icon

**Row interaction**:
- ✅ Click → `/objects/:id`
- ✅ Hover bg

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Add branch Select to filter row | Medium | Optional per spec; would enable branch-level filtering | Medium — need useBranches hook or add to filter state |
| Move count to right side of filter row | Medium | Currently shows "N objects" but should be right-aligned in filter row | Easy — CSS/layout change |
| Add Tier chip column | High | Requires `Tier` field on Object type; currently future scope | Blocked — no Tier data in schema |
| Add Engineers count column | High | Requires engineer-object association data | Blocked — no API endpoint for per-object engineer count |
| Add chevron icon (→) to row end | Medium | Visual polish; improves row affordance | Easy — add MUI Icon or text |

**Data Model Blockers**:
- Object schema lacks `tier` field (TOR notes this as future scope post-MVP)
- No API endpoint returns engineer count per object
- Would need to fetch engineer assignments separately or extend object summary

---

## Screen 8 - Device Catalog (`/catalog`)

### Design Specification
**Source**: `README.md` §"8 · Device catalog (master / detail)"

**Master Rail** (380px):
- Section label "Device catalog"
- Search box (filters device list)
- 10-row scrollable list
- Each row layout:
  - Left: device name (13/450)
  - Right: uses count (mono, right-aligned)
  - Below: system tags in 11/ink-4 plain text (e.g., "ОС, ПС")
- Selected row style: 2px ink left border + bgElev fill + ink text
- Hover: subtle bg

**Detail Panel**:
- Breadcrumb: `Catalog / [device name]`
- System color chip (ОС/ПС/Видео) — color-coded badge
- h1 device name
- Meta line: "Used on N objects"
- **Section "Per-system norms"**: grid of cards
  - Each card: system color chip + R1 (mono 24) + R2 (mono 24)
  - Card layout: chip top, values below
- **Section "Normative history"**: borderless table
  - Columns: Effective date (mono) / R1 / R2 / Updated by / Note
  - Shows historical changes to R1/R2 for this device

---

### Current Implementation

**Master Rail**:
- ✅ Section label "Device catalog"
- ✅ Search box
- ✅ Scrollable list
- ✅ Device name displayed
- ✅ Selected row: 2px left border + bgElev fill styling
- ❌ **MISSING**: Uses count on right (mono, right-aligned)
- ❌ **MISSING**: System tags below device name (would show associated systems)

**Detail Panel**:
- ✅ Breadcrumb: `Catalog / [device name]`
- ✅ h1 device name
- ❌ **MISSING**: System color chip (should appear in header area or breadcrumb)
- ❌ **MISSING**: "Used on N objects" metadata line
- ✅ Section "Per-system norms": grid of cards with system chip + R1 (mono 24) + R2 (mono 24)
- ❌ **MISSING ENTIRELY**: Section "Normative history" table

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Add uses count to master list (right) | High | Show how many objects use this device; requires `usageCount` field | Blocked — DeviceType schema has no `usageCount` |
| Add system tags below device name | Medium | Show which systems (ОС/ПС/Видео) this device applies to; could derive from contexts | Easy — render context.systemType.name list below device name |
| Add system color chip to detail header | Medium | Color-coded badge showing primary or all systems | Easy — render Chip from first/primary system type |
| Add "Used on N objects" metadata | High | Count of objects that use this device; requires inventory join | Blocked — no API for per-device object usage count |
| Implement "Normative history" section | High | Table of effective date / R1 / R2 / Updated by / Note | Blocked — no API endpoint for normative history |
| Fix system chip colors in Per-system norm cards | Medium | All system chips currently render with `accentSoft` (#e8ebff) background. Design specifies distinct color-coded chips per system type: ОС, ПС, Видео each get their own tone. Map to existing ok/warn/accent token pairs | Easy — add a `systemTypeToTone` map and apply the correct `sx` per chip |

**Data Model Blockers**:
- DeviceType schema lacks `usageCount` field
- No API endpoint `/catalog/devices/{id}/history` or equivalent for normative history
- Would require schema extension and backend API changes

---

## Common Issues: All Create Dialogs

All four create dialogs (Object, Engineer, Division, Branch) share a set of structural gaps relative to the Quiet design spec.

### Common Gaps to Fix (apply to every create dialog)

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| No Quiet modal paper overrides on inline dialogs | High | Only `CreateObjectDialog` has `1px lineStrong` border, `r-lg` radius, and custom width. The three inline dialogs (Engineer in EngineerListPage, Division in DivisionsListPage, Branch in DivisionDetailPage) use plain MUI `<Dialog fullWidth maxWidth="sm">` with no styling overrides | Medium — extract a `<QuietDialog>` wrapper or add `sx` overrides to each |
| No eyebrow + h1 header pattern on inline dialogs | High | Design specifies eyebrow (11/500 ink3 "New X") + h1 (24/600 "Create X") two-line header. Inline dialogs use a single plain `<DialogTitle>` string with no typography treatment | Easy — add eyebrow `<Typography>` before h1 inside `<DialogTitle>` |
| No × close button in any dialog header | Medium | Design specifies an × close button top-right of every modal. None of the four dialogs implement it | Easy — add `<IconButton onClick={onClose}>` to `<DialogTitle>` |
| Submit button label truncated | Low | All inline dialogs use "Create" as the submit label. Design labels are "Create engineer", "Create division", "Create branch" | Easy — update button text |
| Dialog padding not locked | Low | Design specifies `28px 32px 24px 32px`. MUI defaults differ | Easy — add `sx` to `<DialogContent>` and `<DialogTitle>` |

---

## Screen 9 - Create Object Dialog

### Design Specification
**Source**: `README.md` §"9 · Create object dialog"

**Layout**: 560px modal, 2-column form grid

**Fields** (in order):
1. Object name (full-width, required, 14/450)
2. Object ID (mono, likely auto-generated/display-only)
3. Tier (Select, dropdown)
4. Division (Select, dropdown)
5. Branch № (Select, required)
6. Address (full-width, optional, 14/450)
7. Travel norm h (mono, text input, disabled — future scope)
8. Visits / year (mono, text input, disabled — future scope)

**Header**:
- Eyebrow: "New object" (11/500 ink3)
- h1: "Create object" (24/600 ink)

**Footer**:
- Left: hint text "Equipment & assignments are added after creation" (12/400 ink3)
- Right: Cancel + primary `Create object` buttons

**Styling**: 560px wide · `bgElev` · `r-lg` · `1px lineStrong` border · padding 28/32/24/32 · scrim `rgba(20,20,18,0.32)`

---

### Current Implementation

**Modal styling**: ✅ 560px, `r-lg`, `1px lineStrong` border (only dialog with correct Quiet overrides)

**Header**:
- ⚠️ Eyebrow "New object" present but uses `11/600/0.06em` (section label style) — design specifies `11/500/0.02em` (eyebrow `t-eyebrow` style)
- ✅ h1 "Create object" present (though `fontSize: 28` instead of design's `24/600`)
- ❌ No × close button

**Layout**: ❌ All fields are `xs={12}` — single column. Design specifies 2-column grid.

**Fields**:
1. ✅ Object name (full-width, required)
2. ❌ **MISSING**: Object ID field (mono, display-only)
3. ❌ Tier rendered as `<TextField disabled>` — design specifies `<Select disabled>`
4. ❌ **MISSING**: Division Select
5. ✅ Branch Select (grouped by division)
6. ✅ Address (full-width, optional)
7. ⚠️ Travel norm (disabled) — present but not in monospace font
8. ⚠️ Visits/year (disabled) — present but not in monospace font

**Footer**: ✅ Hint text left · Cancel · "Create object" button

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Fix eyebrow typography to `t-eyebrow` (11/500/0.02em) | Low | Currently uses section-label weight/spacing | Easy — update `fontWeight: 600 → 500`, `letterSpacing: '0.06em' → '0.02em'` |
| Fix h1 fontSize to 24 | Low | Currently `fontSize: 28` (page-title size); dialog h1 is `t-h1 = 24/600` | Easy |
| Add × close button to DialogTitle | Medium | See common gaps | Easy |
| Switch to 2-column Grid layout | Medium | Change inner fields from all `xs={12}` to appropriate `xs={12} sm={6}` pairs | Easy |
| Add Object ID field | Low | Display-only, disabled, monospace — shown after creation or as placeholder | Easy |
| Change Tier from `<TextField>` to `<Select disabled>` | Low | Visual alignment with design field type | Easy |
| Add Division Select field | Medium | Separate selector before Branch; branch list could filter by selection | Medium — needs additional state |
| Apply monospace font to Travel norm and Visits/year | Low | Add `inputProps={{ className: 'mono' }}` | Easy |

**Confirmed decisions**: `ObjectCreateSchema` stays as `{ name, branchId, address? }`. Extra fields remain disabled/display-only placeholders.

---

## Screen 10 - Create Engineer Dialog

### Design Specification
**Source**: `README.md` §"10 · Create engineer dialog"

**Layout**: 520px modal, single column

**Fields** (in order):
1. Full name
2. Email
3. [Capacity FTE (mono) | Home division Select] — 2-cell side-by-side row
4. Initial password + hint "Min 8 characters · engineer must change on first sign-in"

**Header**: Eyebrow "New engineer" · h1 "Create engineer" · × close

**Footer**: "Send welcome email" checkbox (left) · Cancel · "Create engineer"

**Styling**: 520px · `bgElev` · `r-lg` · `1px lineStrong` border · scrim `rgba(20,20,18,0.32)`

---

### Current Implementation

**Location**: Inline `<Dialog>` in `EngineerListPage.tsx` (lines 249–313)

**Modal styling**: ❌ `maxWidth="sm"` (~600px) — no width, border, radius, or paper overrides

**Header**: ❌ Plain `<DialogTitle>Create engineer</DialogTitle>` — no eyebrow, no h1 styling, no × close button

**Fields**:
1. ✅ Full name
2. ✅ Email
3. ❌ Capacity FTE and Division Select on separate full-width rows — design shows them side-by-side
4. ⚠️ Password present with "Minimum 8 characters" hint — missing "· engineer must change on first sign-in"

**Footer**: ❌ No "Send welcome email" checkbox · Cancel · "Create" (should be "Create engineer")

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Add Quiet modal styling (520px, border, radius) | High | See common gaps | Medium — extract inline dialog to `src/components/dialogs/CreateEngineerDialog.tsx` |
| Add eyebrow "New engineer" + h1 styling | High | See common gaps | Easy |
| Add × close button | Medium | See common gaps | Easy |
| Lay out Capacity FTE + Division Select side-by-side | Medium | Use `<Grid container spacing={2}>` with two `xs={6}` items | Easy |
| Extend password helperText | Low | Append "· engineer must change on first sign-in" | Easy |
| Add "Send welcome email" checkbox to footer | Low | UI-state only — pass as separate arg to mutation, not part of schema | Easy |
| Fix submit button label to "Create engineer" | Low | See common gaps | Easy |

---

## Screen 11 - Create Division Dialog

### Design Specification
**Source**: `README.md` §"11 · Create division dialog"

**Layout**: 480px modal, single field

**Fields**: Division name

**Header**: (no eyebrow specified — single-field dialogs use minimal header)

**Footer**: hint "Code is auto-derived from name" · Cancel · "Create division"

**Styling**: 480px · `bgElev` · `r-lg` · `1px lineStrong` border

---

### Current Implementation

**Location**: Inline `<Dialog>` in `DivisionsListPage.tsx` (lines 203–221)

**Modal styling**: ❌ `maxWidth="sm"` (~600px) — no width, border, or radius overrides

**Header**: ❌ Plain `<DialogTitle>Create division</DialogTitle>` — no eyebrow, no × close button

**Fields**: ✅ Division name field present

**Footer**: ❌ No footer hint "Code is auto-derived from name" · Cancel · "Create" (should be "Create division")

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Add Quiet modal styling (480px, border, radius) | High | See common gaps | Easy — add `sx` paper overrides |
| Add × close button | Medium | See common gaps | Easy |
| Add footer hint "Code is auto-derived from name" | Medium | Visible user affordance explaining auto-code logic | Easy — add `<Typography>` in `DialogActions` left slot |
| Fix submit button label to "Create division" | Low | See common gaps | Easy |

---

## Screen 12 - Create Branch Dialog

### Design Specification
**Source**: `README.md` §"12 · Create branch dialog"

**Layout**: 480px modal, two fields

**Fields**: Branch name · Division Select

**Footer**: hint "Branch №/ID is auto-assigned" · Cancel · "Create branch"

**Styling**: 480px · `bgElev` · `r-lg` · `1px lineStrong` border

---

### Current Implementation

**Location**: Inline `<Dialog>` in `DivisionDetailPage.tsx` (lines 251–277)

**Modal styling**: ❌ `maxWidth="sm"` — no width, border, or radius overrides

**Header**: ❌ Title reads "Add branch" (should be "Create branch") — no × close button

**Fields**:
- ✅ Branch name
- ❌ **MISSING**: Division Select — dialog is opened from within a division's detail page so division is implicit, but design shows it as an explicit field

**Footer**: ❌ No footer hint "Branch №/ID is auto-assigned" · Cancel · "Create" (should be "Create branch")

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Add Quiet modal styling (480px, border, radius) | High | See common gaps | Easy — add `sx` paper overrides |
| Rename title "Add branch" → "Create branch" | Low | Consistency with design and other dialogs | Easy |
| Add × close button | Medium | See common gaps | Easy |
| Add Division Select field | Low | Currently implicit from page context; design shows it explicitly. Could pre-populate and disable when opened from DivisionDetailPage | Easy — add disabled Select pre-filled with current division |
| Add footer hint "Branch №/ID is auto-assigned" | Medium | User affordance | Easy |
| Fix submit button label to "Create branch" | Low | See common gaps | Easy |

---

## Screen 7 - Divisions List Page (`/divisions`)

### Design Specification
**Source**: `README.md` §"7 · Divisions (NEW page)"

**Page Head**:
- Breadcrumb: `Workload / Reference / Divisions`
- h1: "Divisions"
- Subtitle: "7 regional divisions · 2 935 objects · 204 engineers"
- Action: Primary button "Create division"

**KPI Row** (4 columns):
1. Divisions: 7
2. Total objects: 2,935
3. Total engineers: 204
4. Avg utilisation: 89% (with tone indicator if > 100%)

**Section "All divisions"** (7-row table):
1. Code (mono, 3-char derived from name: BRE, VTB, GMV, etc.)
2. Division name
3. Head engineer (or `—` if unavailable)
4. Region city ← **Note**: Listed as separate column
5. Objects (count)
6. Engineers (count)
7. FTE req. (totals column, bold mono)
8. Gap (colored value if > 0, else `—`)
9. Utilisation (CapBar visualization)

**Row interaction**:
- Click → `/divisions/:id`

---

### Current Implementation

**Page Head**:
- ✅ Breadcrumb (though shows "Divisions" not "Reference / Divisions")
- ✅ h1: "Divisions"
- ✅ Subtitle with counts
- ✅ "Create Division" button (text may differ)

**KPI Row**:
- ✅ 4-column layout with: Divisions count, Total objects, Total engineers, Avg utilisation
- ✅ Tone indicators for utilisation (warn if > 100%)

**Section "All divisions"** (currently 8 columns):
1. ✅ Code (mono, 3-char uppercase from name)
2. ✅ Division name
3. ✅ Head engineer (or `—`)
4. ❌ **MISSING**: Region city column
5. ✅ Objects (count)
6. ✅ Engineers (count)
7. ✅ FTE req. (totals, bold mono)
8. ✅ Gap (colored if > 0)
9. ✅ Utilisation (CapBar)

**Row interaction**:
- ✅ Click → `/divisions/:id`

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Add "Region city" column | Low | Display region/city for each division; requires additional data | Medium — depends on backend providing city/region field |

**Data Model Notes**:
- Division schema may not have `regionCity` field
- Would require DivisionDto extension if not already present
- Could be populated from branch data if division doesn't expose it directly

---

## Screen 5b–5e - Object Detail Tabs (Future Implementation)

### Design Specification
**Source**: `README.md` §"5b–5e · Object detail tabs"

These screens detail the content of Object Detail page tabs:

**5b - Records tab**:
- Section "Maintenance records" · 24/year count meta
- Table: Date (mono ISO) / Type (ТО-1 / ТО-2 / Inspection) / Engineer / Hours (mono 2-decimal) / Note
- No avatars on engineer column

**5c - Repairs tab**:
- Section "Repair history" · 12-month count meta
- Table: Date / System (plain muted text — no color chip) / Description / Engineer / Hours / Status chip
- Filter for status if backend supports

**5d - Travel tab**:
- Hairline 4-cell stat strip: One-way distance / One-way duration / Visits per year / Annual travel FTE (mono)
- "Origin & route" 2-col table: Origin branch / Transport mode / Distance method / Last verified (mono date + author)

**5e - Engineers tab**:
- Section "Assigned engineers" · sum FTE meta + `+ Assign engineer` button
- Table: Engineer (name + email stack, no avatar) / Role (Lead/Co-engineer chips) / FTE share (totals) / % of object / Their utilisation (CapBar) / chevron

---

### Current Implementation Status

**These tabs are OUT OF SCOPE for the current implementation plan** (`ws-a-04-design-quiet-step4-new-pages.md`). The plan focuses on:
- Tasks 1–4: Backend extension, frontend schemas, CreateObjectDialog
- Tasks 3, 5–6: New pages (DivisionsListPage, CatalogPage, ObjectListPage refinements)
- Tasks 7–9: Polish, E2E tests, QA

**Note**: Existing ObjectDetailPage may have partial implementations of these tabs from prior work. No design-spec comparison is provided for these tabs in the current audit scope.

---

## Global: Buttons, Inputs & Dropdowns

### Design Specification
**Source**: `README.md` §"Chips, buttons, inputs"

- **Button**: 32px height · 12px h-padding · `r-sm` (6px) · `1px lineStrong (#d4d1c9)` border for ghost/outlined · Primary = filled `ink` bg + white text
- **Input / Select**: 32px height in pages · 38px `lg` variant inside modal dialogs · `1px lineStrong` border · focus border = `ink`
- **Search input**: leading magnifier icon · trailing `⌘K` mono kbd hint

---

### Current Implementation vs Design

#### Buttons

**Outlined button border color — wrong**:
- Implementation: MUI `variant="outlined"` picks up `primary.main = #1a1a1a` (ink) as border color — renders as a dark border
- Design specifies: `1px lineStrong = #d4d1c9` (light grey) for outlined/ghost buttons
- Root cause: `theme.ts` has no `MuiButton` border color override; only `MuiOutlinedInput` has `lineStrong`

**H-padding not locked**:
- Implementation: no `paddingLeft`/`paddingRight` in theme button override → MUI defaults to ~14px
- Design specifies: 12px

**Size prop inconsistency across pages**:
- DashboardPage passes `size="small"` on all page-action buttons
- ObjectListPage, DivisionsListPage, EngineerListPage pass no `size` prop (defaults to `medium`)
- Theme height lock (32px) masks this in most cases but it is fragile

#### Filter Row Dropdowns (Select)

**Critical alignment issue** — filter rows on ObjectListPage and EngineerListPage have mismatched heights:

| Page | Search field | Division Select | Tier/Status Select |
|------|-------------|-----------------|-------------------|
| SvodPage | `size="small"` | `size="small"` + explicit sx | N/A — uses pill control |
| ObjectListPage | `size="small"` (32px) | no size prop (`medium`, ~40px) | no size prop (`medium`, ~40px) |
| EngineerListPage | `size="small"` (32px) | no size prop (`medium`, ~40px) | no size prop (`medium`, ~40px) |

Result: on ObjectListPage and EngineerListPage, dropdown filters are visibly taller than the search field in the same row.

Additionally, ObjectListPage and EngineerListPage have **no sx border overrides** on their Select components, so they inherit MUI default border styling instead of the `lineStrong` token.

#### Search Fields — Missing Affordances

All search fields (SvodPage, ObjectListPage, EngineerListPage, CatalogPage) are plain `<TextField>` with no adornments:
- ❌ Missing leading magnifier icon (`InputAdornment` with search icon)
- ❌ Missing trailing `⌘K` kbd hint

#### Dialog Inputs — Wrong Height

Design specifies 38px for inputs inside modal dialogs (separate from the 32px page-level height).
All dialog inputs (CreateObjectDialog, CreateEngineerDialog, DivisionsListPage create dialog) use the theme default of 32px. No `lg` variant or dialog-context override is implemented.

---

### Gaps to Fix

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Outlined button border color | Medium | Add `MuiButton` outlined variant override: `styleOverrides: { outlined: { borderColor: tokens.lineStrong } }` in `theme.ts` | Easy — one line in theme |
| Button h-padding | Low | Add `paddingLeft: 12, paddingRight: 12` to `MuiButton` root override | Easy — one line in theme |
| ObjectListPage/EngineerListPage Select size | Medium | Add `size="small"` to all filter-row `<FormControl>` / `<Select>` elements on both pages | Easy — prop change only |
| Filter-row border styling on ObjectListPage/EngineerListPage | Medium | Add sx border overrides matching SvodPage pattern (`tokens.line` default, `tokens.ink4` on hover/focus) | Easy — copy sx from SvodPage |
| Search field magnifier icon | Low | Wrap with `<InputAdornment position="start"><SearchIcon /></InputAdornment>` on all 4 pages | Easy |
| Search field `⌘K` kbd hint | Low | Add trailing `InputAdornment` with styled `<kbd>⌘K</kbd>` | Easy |
| Dialog input height (38px) | Low | Add `MuiDialog` context override in theme, or set `inputProps={{ style: { height: 38 } }}` on dialog form fields | Easy — theme override preferred |

---

## Codebase Hygiene

### Stale `DivisionListPage.tsx`

`src/pages/DivisionListPage.tsx` (old pre-Quiet divisions page) and `src/pages/DivisionsListPage.tsx` (new Quiet page) both exist. If the old file is no longer routed, it is dead code that creates confusion about which file is canonical.

| Gap | Severity | Notes | Feasibility |
|-----|----------|-------|-------------|
| Remove `DivisionListPage.tsx` if unreachable | Low | Verify the router no longer references `DivisionListPage`; if confirmed dead, delete the file | Easy — delete file after router check |

---

## Screen 6b - Engineer Detail Page

### Design Specification
**Source**: `README.md` §"6b · Engineer detail"

**Header**:
- Large 32px avatar (initials, ink-4 fill, white text) — **only place avatars appear in list/detail views**
- Status chip
- Meta information
- `Reassign objects` button (right)

**Stat strip** (5-cell hairline):
- FTE load (danger color if overloaded)
- Capacity
- Utilisation
- Objects (count)
- Divisions (count)

**Section "FTE by system"**:
- 3-row stacked progress bars: ОС / ПС / Видео with values + percentages

**Section "Assigned objects"**:
- Sortable table: Object / FTE share (totals) / % of total / chevron

---

### Current Implementation Status

**OUT OF SCOPE** for current plan. EngineerDetailPage exists but likely needs Quiet design refactor. Not included in design audit scope.

---

## Summary of Gaps by Page

### LoginPage (Screens 1 & 2)
- ❌ Background is blue-green gradient — should be `bg` (#f6f6f4) with faint 32px grid pattern
- ❌ Card is 420px with default MUI shadow — should be 380px, no shadow, `lineStrong` border, `r-lg`
- ❌ Brand area shows full app title as h4 — should be logo mark + "Workload" wordmark + "Sign in" as h1
- ❌ Inputs use `variant="standard"` (underline) — should be `outlined`
- ❌ Submit button has `minHeight: 44` override — should be theme-default 32px
- ❌ "Keep me signed in" checkbox missing
- ❌ "or" divider + SSO ghost button missing

### SvodPage (Screen 4)
- ❌ Division filter is `<Select>` dropdown — should be pill segmented control on `bgSunken` track

### ObjectListPage (Screen 3b)
- ❌ Branch Select filter
- ❌ Count meta positioning
- ❌ Tier chip column (blocked — no data)
- ❌ Engineers count column (blocked — no data)
- ❌ Chevron icons
- ❌ Filter-row Select size inconsistency (medium instead of small)
- ❌ Filter-row Select border styling missing

### CatalogPage (Screen 8)
- ❌ Uses count on master list (blocked — no data)
- ❌ System tags below device names (easy — can derive from contexts)
- ❌ System color chip in detail (easy)
- ❌ "Used on N objects" metadata (blocked — no data)
- ❌ "Normative history" section (blocked — no API)
- ❌ Per-system norm card chips use uniform `accentSoft` — should be color-coded per system type

### All Create Dialogs (Screens 9–12) — Common
- ❌ Inline dialogs (Engineer, Division, Branch) missing Quiet modal styling (border, radius, width)
- ❌ Inline dialogs missing eyebrow + h1 two-line header
- ❌ All dialogs missing × close button
- ❌ Submit labels truncated to "Create" instead of full label

### CreateObjectDialog (Screen 9)
- ❌ Object ID field missing
- ❌ Division Select missing
- ❌ Single-column layout — should be 2-column grid
- ❌ Tier field should be `<Select disabled>` not `<TextField disabled>`
- ❌ Eyebrow uses wrong typography variant (600 weight / 0.06em spacing vs 500 / 0.02em)
- ❌ Disabled fields (Travel norm, Visits/year) not in monospace font

### CreateEngineerDialog (Screen 10) — inline in EngineerListPage
- ❌ No Quiet modal styling (no 520px width, no border, no radius)
- ❌ No eyebrow header
- ❌ Capacity FTE and Division Select stacked — should be side-by-side
- ❌ Password hint missing "· engineer must change on first sign-in"
- ❌ No "Send welcome email" footer checkbox

### CreateDivisionDialog (Screen 11) — inline in DivisionsListPage
- ❌ No Quiet modal styling (no 480px width, no border, no radius)
- ❌ No footer hint "Code is auto-derived from name"

### CreateBranchDialog (Screen 12) — inline in DivisionDetailPage
- ❌ No Quiet modal styling (no 480px width, no border, no radius)
- ❌ Title "Add branch" should be "Create branch"
- ❌ Division Select missing (implicit from context, design shows it explicitly)
- ❌ No footer hint "Branch №/ID is auto-assigned"

### DivisionsListPage (Screen 7)
- ❌ Region city column (medium — may need backend extension)

### Global: Buttons, Inputs & Dropdowns
- ❌ Outlined button border color is ink (#1a1a1a) — should be lineStrong (#d4d1c9)
- ❌ Button h-padding not locked to 12px
- ❌ EngineerListPage filter-row Select size inconsistency (medium instead of small)
- ❌ EngineerListPage filter-row Select border styling missing
- ❌ Search fields missing magnifier icon on all 4 pages
- ❌ Search fields missing `⌘K` kbd hint on all 4 pages
- ❌ Dialog inputs at 32px — should be 38px

### Codebase Hygiene
- ❌ `DivisionListPage.tsx` (old file) may be dead code alongside new `DivisionsListPage.tsx`

---

## Blocked by Data Model / API

The following gaps require backend changes or data model extensions:

1. **Object Tier field** (`ObjectRecord.tier`)
   - Used for: ObjectListPage tier chip column
   - Status: Future scope per TOR
   - Impact: High (affects table completeness)

2. **Object→Engineer association** (engineer count per object)
   - Used for: ObjectListPage engineers column
   - Status: No existing API endpoint
   - Impact: Medium (useful but not critical for MVP)

3. **DeviceType.usageCount** (how many objects use each device)
   - Used for: CatalogPage master list uses count
   - Status: Not exposed by current DeviceType schema
   - Impact: Medium (provides context but not essential)

4. **Normative history API** (`/catalog/devices/{id}/history`)
   - Used for: CatalogPage "Normative history" section
   - Status: No endpoint exists
   - Impact: Low to Medium (historical reference data)

5. **Division.regionCity** (region or city for each division)
   - Used for: DivisionsListPage "Region city" column
   - Status: May exist in schema, needs verification
   - Impact: Low (supplementary information)

---

## Recommendations

### Phase 1: Theme & Global Fixes (No Backend Changes, Single PR)
These touch `theme.ts` and filter rows — best done together to avoid repeated review:
1. Fix outlined button border color in `theme.ts` (`MuiButton` outlined override → `lineStrong`)
2. Lock button h-padding to 12px in `theme.ts`
3. Fix filter-row Select `size="small"` on ObjectListPage and EngineerListPage
4. Add sx border overrides on those Selects (copy SvodPage pattern)
5. Add magnifier `InputAdornment` to all 4 search fields
6. Add `⌘K` kbd hint to all 4 search fields
7. Add dialog input height override (38px) in `theme.ts`

**Effort**: 2–3 hours  
**Impact**: Fixes the most visible cross-page inconsistencies

### Phase 2: Page-Level Easy Wins (No Backend Changes)
1. **LoginPage**: background → `bg` + faint grid; card → 380px, no shadow, `lineStrong` border; brand mark + "Sign in" h1; inputs → `outlined`; fix button height; add checkbox + SSO button
2. Replace SvodPage division `<Select>` with pill segmented control on `bgSunken` track
3. Fix CatalogPage per-system norm chip colors (map ОС/ПС/Видео to distinct token pairs)
4. Add chevron icons to ObjectListPage rows
5. Add system color chip to CatalogPage detail header
6. Render system tags below device names in CatalogPage master list
7. Verify Region city column in DivisionsListPage (if data available)
8. Verify and remove `DivisionListPage.tsx` if confirmed unreachable

**Effort**: 4–5 hours  
**Impact**: Improves design fidelity significantly; Login is the first screen every user sees

### Phase 2b: Create Dialog Overhaul (No Backend Changes)

All four create dialogs need structural Quiet compliance. Recommended approach: extract Engineer/Division/Branch inline dialogs into `src/components/dialogs/` alongside `CreateObjectDialog`, then apply the common Quiet wrapper to all.

1. Add × close button to all dialogs
2. Add Quiet paper overrides (`1px lineStrong` border, `r-lg`, correct widths) to Engineer (520px), Division (480px), Branch (480px) dialogs
3. Add eyebrow + h1 two-line header to Engineer, Division, Branch dialogs
4. Fix `CreateObjectDialog`: eyebrow typography, h1 size, 2-column grid, Tier → `<Select disabled>`, monospace on disabled fields
5. Add Object ID display-only field to `CreateObjectDialog`
6. Lay out Capacity FTE + Division Select side-by-side in Create Engineer
7. Extend engineer password helperText
8. Add "Send welcome email" checkbox to Create Engineer footer
9. Add footer hints to Create Division ("Code is auto-derived from name") and Create Branch ("Branch №/ID is auto-assigned")
10. Rename "Add branch" → "Create branch"; fix all submit button labels

**Effort**: 3–5 hours  
**Impact**: All create flows visually consistent with Quiet spec

### Phase 3: Blocked on Backend (Requires Sprint Planning)
1. Add `tier` field to Object type + update ObjectListPage column
2. Implement `engineerCount` per object or endpoint
3. Extend DeviceType with `usageCount`
4. Create `/catalog/devices/{id}/history` endpoint
5. Add `regionCity` to Division (if missing)

**Effort**: Depends on backend capacity  
**Impact**: Completes design spec compliance

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-05-01 | Claude Code | Initial audit and gap documentation |
| 2026-05-01 | Claude Code | Added SvodPage filter row gap; CatalogPage chip color gap; global Buttons/Inputs/Dropdowns section; Codebase Hygiene section; updated Summary and Recommendations |
| 2026-05-02 | Claude Code | Added full audit of all 4 create dialogs (Screens 9–12): common structural gaps + per-dialog specifics; added Phase 2b recommendation block |

