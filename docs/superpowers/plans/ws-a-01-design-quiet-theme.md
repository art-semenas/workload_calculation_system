# WS-A Step 1 — Quiet Design: Theme & CSS Variables

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Establish the "Quiet" design system foundation. Create `src/theme.ts` with all MUI overrides and `src/index.css` with CSS variables. Wrap the app in `ThemeProvider`. Remove any inline color/spacing literals from existing pages and let theme drive them. No component changes in this step — theme only.

**Branch:** `feature/design-quiet-step1-theme`
**Depends on:** `feature/implementation` (PoC M-03 complete)
**Workstream:** A — Design (frontend only, no backend changes)

**Reference:** `design/design_handoff_workload_light/README.md` — "Design tokens", "Theme implementation", "Migration plan step 1"

---

## Source-Of-Truth Alignment

1. `design/design_handoff_workload_light/README.md` — canonical token values, type ramp, spacing scale, component overrides
2. `design/design_handoff_workload_light/prototype/styles.css` — token implementation reference
3. `CONTRIBUTING.md` — frontend quality gates (ESLint, TypeScript, Prettier, Vitest)
4. Do not introduce new dependencies without asking. No new libraries in this step.

---

## Task 0: Create feature branch

- [ ] **Step 1: Check out and create branch**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/design-quiet-step1-theme
```

---

## Task 1: Create `src/theme.ts`

**Files:**
- Create: `frontend/src/theme.ts`

- [ ] **Step 1: Create theme with all Quiet tokens**

Create `frontend/src/theme.ts` implementing `createTheme` with:

**Palette (exact hex values from README):**
```ts
// Surfaces
bg: '#f6f6f4', bgElev: '#ffffff', bgSunken: '#efeeea'
// Lines
line: '#e4e2dc', lineStrong: '#d4d1c9'
// Ink
ink: '#1a1a1a', ink2: '#3d3d3a', ink3: '#6b6a64', ink4: '#9a988f'
// Accent
accent: '#3a4fcf', accentSoft: '#e8ebff', accentInk: '#1a2a8a'
// States
ok: '#2d7a4a', okSoft: '#e3f1e6'
warn: '#a66600', warnSoft: '#fbedd2'
danger: '#b23a3a', dangerSoft: '#fbe5e0'
```

Map to MUI palette:
```ts
palette: {
  background: { default: tokens.bg, paper: tokens.bgElev },
  text: { primary: tokens.ink, secondary: tokens.ink3 },
  divider: tokens.line,
  primary: { main: tokens.ink },
  success: { main: tokens.ok },
  warning: { main: tokens.warn },
  error: { main: tokens.danger },
}
```

**Typography (Inter + JetBrains Mono):**
```ts
typography: {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontWeightRegular: 450,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: { fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' },
  h2: { fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' },
  h3: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' },
  body1: { fontSize: 14, fontWeight: 450 },
  body2: { fontSize: 13, fontWeight: 450 },
  caption: { fontSize: 12, fontWeight: 400 },
}
```

**Shape:** `borderRadius: 6`

**Component overrides:**
```ts
components: {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: { root: { textTransform: 'none', height: 32, fontSize: 13 } }
  },
  MuiPaper: { defaultProps: { elevation: 0 } },
  MuiTableCell: {
    styleOverrides: {
      root: { padding: '14px 12px', borderColor: tokens.line },
      head: { textTransform: 'uppercase', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.04em', color: tokens.ink3, padding: '10px 12px' }
    }
  },
  MuiTableRow: {
    styleOverrides: {
      root: { height: 52, '&:hover td': { backgroundColor: 'rgba(0,0,0,0.012)' } }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 999, fontSize: 11, fontWeight: 500, height: 22 }
    }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: { height: 32, fontSize: 13, '& fieldset': { borderColor: tokens.lineStrong } }
    }
  },
  MuiDrawer: {
    styleOverrides: {
      paper: { width: 380, borderLeft: `1px solid ${tokens.line}`, boxShadow: 'none' }
    }
  },
}
```

Export `tokens` alongside `theme` for use in CSS variables.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/theme.ts
git commit -m "feat: add Quiet design system theme with MUI overrides"
```

---

## Task 2: Add CSS variables to `src/index.css`

**Files:**
- Update: `frontend/src/index.css`

- [ ] **Step 1: Add CSS variable declarations**

Add to the top of `frontend/src/index.css`:

```css
:root {
  --bg: #f6f6f4;
  --bg-elev: #ffffff;
  --bg-sunken: #efeeea;
  --line: #e4e2dc;
  --line-strong: #d4d1c9;
  --ink: #1a1a1a;
  --ink2: #3d3d3a;
  --ink3: #6b6a64;
  --ink4: #9a988f;
  --accent: #3a4fcf;
  --accent-soft: #e8ebff;
  --ok: #2d7a4a;
  --ok-soft: #e3f1e6;
  --warn: #a66600;
  --warn-soft: #fbedd2;
  --danger: #b23a3a;
  --danger-soft: #fbe5e0;

  /* Spacing scale */
  --gap-xs: 8px;
  --gap-s: 12px;
  --gap-m: 20px;
  --gap-l: 32px;
  --gap-xl: 40px;
  --gap-xxl: 56px;

  /* Radius */
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 14px;
  --r-pill: 999px;
}

body {
  background-color: var(--bg);
  font-variant-numeric: tabular-nums;
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add Quiet CSS variables and mono utility class to index.css"
```

---

## Task 3: Wire `ThemeProvider` in `main.tsx`

**Files:**
- Update: `frontend/src/main.tsx`

- [ ] **Step 1: Wrap app in ThemeProvider**

Import `theme` from `./theme` and wrap with MUI `ThemeProvider` and `CssBaseline`:

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './theme'

// In render:
<ThemeProvider theme={theme}>
  <CssBaseline />
  <App />
</ThemeProvider>
```

- [ ] **Step 2: Start dev server and verify app loads**

```bash
npm run dev
```

Open browser. Confirm app loads with the updated background color (`#f6f6f4`) instead of MUI default white. No visual regressions on login page.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "chore: wire Quiet ThemeProvider and CssBaseline in main.tsx"
```

---

## Task 4: Add Google Fonts import for Inter and JetBrains Mono

**Files:**
- Update: `frontend/index.html`

- [ ] **Step 1: Add font preconnect and stylesheet links**

Add to `<head>` in `frontend/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "chore: add Inter and JetBrains Mono font imports for Quiet design system"
```

---

## Task 5: Run quality gates

- [ ] **Step 1: Format**

```bash
cd frontend && npm run format
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Tests**

```bash
npm test
```

Expected: all existing tests pass. Theme code has no testable units — no new test files required for this step.

- [ ] **Step 5: Push branch**

```bash
git push -u origin feature/design-quiet-step1-theme
```

---

## Final Scope Checklist

- [ ] `theme.ts` exported from `frontend/src/theme.ts` with all Quiet color, typography, shape, and component overrides
- [ ] CSS variables declared in `index.css` matching all Quiet tokens
- [ ] App wrapped in `ThemeProvider` — theme applies globally
- [ ] `CssBaseline` applied — browser default margin/padding reset
- [ ] `body` background is `#f6f6f4` (Quiet bg token)
- [ ] `tabular-nums` applied body-wide
- [ ] `.mono` utility class available for numeric data cells
- [ ] Inter and JetBrains Mono fonts load correctly
- [ ] All existing tests pass
- [ ] No inline color literals introduced

## References

- `design/design_handoff_workload_light/README.md` §"Design tokens", §"Theme implementation"
- `design/design_handoff_workload_light/prototype/styles.css`
