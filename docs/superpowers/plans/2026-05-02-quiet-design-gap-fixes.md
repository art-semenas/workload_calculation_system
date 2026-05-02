# Quiet Design Gap Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all "Easy/Medium" design gaps catalogued in `docs/DESIGN_IMPLEMENTATION_GAPS.md` — bringing the frontend into compliance with the Quiet design spec without any backend changes.

**Architecture:** Three phases executed in dependency order — (1) theme-level tokens so all pages inherit fixes, (2) page-level visual wins, (3) create dialog structural overhaul with extracted dialog components. Dialogs are extracted from inline page code into `src/components/dialogs/` to match the existing `CreateObjectDialog` pattern.

**Tech Stack:** React 18 · TypeScript 5 (strict) · MUI 5 · React Hook Form + Zod · TanStack Query 5 · Vite

---

## File Structure

### New files
- `frontend/src/components/dialogs/QuietDialog.tsx` — reusable MUI Dialog wrapper with Quiet paper overrides (border, radius, no shadow, configurable width)
- `frontend/src/components/dialogs/CreateEngineerDialog.tsx` — extracted + overhauled engineer create dialog
- `frontend/src/components/dialogs/CreateDivisionDialog.tsx` — extracted + overhauled division create dialog
- `frontend/src/components/dialogs/CreateBranchDialog.tsx` — extracted + overhauled branch create dialog

### Modified files
- `frontend/src/theme.ts` — add `MuiButton` outlined border override + h-padding; add dialog input height override
- `frontend/src/pages/LoginPage.tsx` — full Quiet overhaul (background, card, brand, inputs, extras)
- `frontend/src/pages/SvodPage.tsx` — replace division `<Select>` with pill segmented control
- `frontend/src/pages/ObjectListPage.tsx` — fix Select sizes/borders, count position, add chevron column
- `frontend/src/pages/EngineerListPage.tsx` — fix Select size/border, search adornments, replace inline dialog
- `frontend/src/pages/CatalogPage.tsx` — system color chips, system tags in master, system chip in detail
- `frontend/src/pages/DivisionsListPage.tsx` — replace inline dialog with `<CreateDivisionDialog />`
- `frontend/src/pages/DivisionDetailPage.tsx` — replace inline dialog with `<CreateBranchDialog />`
- `frontend/src/components/dialogs/CreateObjectDialog.tsx` — fix eyebrow, h1 size, 2-col grid, Tier→Select, Division field, monospace on disabled fields

### Deleted files
- `frontend/src/pages/DivisionListPage.tsx` — confirmed dead code (router check in Task 14)

---

## Task 1: Theme — Button border color + h-padding

**Files:**
- Modify: `frontend/src/theme.ts:97-108`

- [ ] **Step 1: Open theme.ts, locate the `MuiButton` block (lines 97–108)**

Current code:
```ts
MuiButton: {
  defaultProps: {
    disableElevation: true,
  },
  styleOverrides: {
    root: {
      textTransform: 'none',
      height: 32,
      fontSize: 13,
    },
  },
},
```

- [ ] **Step 2: Replace the `MuiButton` block with border + padding overrides**

```ts
MuiButton: {
  defaultProps: {
    disableElevation: true,
  },
  styleOverrides: {
    root: {
      textTransform: 'none',
      height: 32,
      fontSize: 13,
      paddingLeft: 12,
      paddingRight: 12,
    },
    outlined: {
      borderColor: tokens.lineStrong,
      '&:hover': {
        borderColor: tokens.ink4,
      },
    },
  },
},
```

- [ ] **Step 3: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: both exit 0 with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/theme.ts
git commit -m "fix: outlined button border → lineStrong, lock h-padding to 12px"
```

---

## Task 2: Theme — Dialog input height (38px)

**Files:**
- Modify: `frontend/src/theme.ts`

- [ ] **Step 1: Add `MuiDialog` context override after the `MuiOutlinedInput` block (after line 160)**

Add this block inside `components: { ... }` after `MuiOutlinedInput`:

```ts
MuiDialog: {
  styleOverrides: {
    paper: {
      '& .MuiOutlinedInput-root': {
        height: 38,
      },
    },
  },
},
```

- [ ] **Step 2: Run type check**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/theme.ts
git commit -m "fix: dialog input height override to 38px per Quiet spec"
```

---

## Task 3: Filter-row alignment — ObjectListPage

**Files:**
- Modify: `frontend/src/pages/ObjectListPage.tsx:119-147`

- [ ] **Step 1: Open ObjectListPage.tsx, find the filter row (lines 101–148)**

Current issues:
- Division `<FormControl>` and Tier `<FormControl>` have no `size` prop → render at `medium` (~40px), taller than the search `TextField` (which has `size="small"`, 32px)
- No `sx` border overrides on either `<Select>`
- Count meta is not right-aligned by default (it uses `ml: 'auto'` on a Box but the Typography lacks alignment)

- [ ] **Step 2: Replace the filter row Block (the `<Box sx={{ display: 'flex', gap: 2, mb: 3... }}>` section)**

```tsx
{/* Filter Row */}
<Box
  sx={{
    display: 'flex',
    gap: 1.5,
    mb: 3,
    alignItems: 'center',
  }}
>
  <TextField
    placeholder="Search objects..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    variant="outlined"
    size="small"
    sx={{ minWidth: 200 }}
  />

  <FormControl size="small" sx={{ minWidth: 160 }}>
    <InputLabel>Division</InputLabel>
    <Select
      value={selectedDivisionId}
      label="Division"
      onChange={(e) => setSelectedDivisionId(e.target.value)}
      sx={{
        '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
      }}
    >
      <MenuItem value="">All divisions</MenuItem>
      {divisions?.map((div) => (
        <MenuItem key={div.id} value={div.id}>
          {div.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 120 }} disabled>
    <InputLabel>Tier</InputLabel>
    <Select value="" label="Tier">
      <MenuItem value="">All tiers</MenuItem>
    </Select>
  </FormControl>

  <Typography sx={{ ml: 'auto', fontSize: 12, color: 'text.secondary' }}>
    {filteredObjects.length} objects
  </Typography>
</Box>
```

- [ ] **Step 3: Add `tokens` import if not present**

Check the top of the file — if `tokens` is not imported, add:
```ts
import { tokens } from '../theme'
```

- [ ] **Step 4: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ObjectListPage.tsx
git commit -m "fix: filter-row Select size/border alignment on ObjectListPage"
```

---

## Task 4: Filter-row alignment — EngineerListPage

**Files:**
- Modify: `frontend/src/pages/EngineerListPage.tsx`

- [ ] **Step 1: Find the filter row in EngineerListPage.tsx**

Search for the `<TextField placeholder="Search` block and the adjacent `<FormControl>` / `<Select>` elements for filtering (status/division filters).

- [ ] **Step 2: Add `size="small"` and border `sx` to every filter-row `<FormControl>` that is currently missing it**

For each `<FormControl>` in the filter row that does not already have `size="small"`, add it:
```tsx
<FormControl size="small" sx={{ minWidth: 160 }}>
  <InputLabel>Division</InputLabel>
  <Select
    value={...}
    label="Division"
    onChange={...}
    sx={{
      '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
    }}
  >
    ...
  </Select>
</FormControl>
```

Apply the same pattern to any status Select in the same row.

- [ ] **Step 3: Add `tokens` import if not already present**

```ts
import { tokens } from '../theme'
```

- [ ] **Step 4: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EngineerListPage.tsx
git commit -m "fix: filter-row Select size/border alignment on EngineerListPage"
```

---

## Task 5: Search field adornments — magnifier + ⌘K hint

**Files:**
- Modify: `frontend/src/pages/ObjectListPage.tsx`
- Modify: `frontend/src/pages/EngineerListPage.tsx`
- Modify: `frontend/src/pages/SvodPage.tsx` (search field, if one exists)
- Modify: `frontend/src/pages/CatalogPage.tsx`

> There is no search field in SvodPage — skip it for that page.

- [ ] **Step 1: Update the `TextField` search field on ObjectListPage**

Find:
```tsx
<TextField
  placeholder="Search objects..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  variant="outlined"
  size="small"
  sx={{ minWidth: 200 }}
/>
```

Replace with:
```tsx
<TextField
  placeholder="Search objects..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  variant="outlined"
  size="small"
  sx={{ minWidth: 200 }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <SearchIcon sx={{ fontSize: 16, color: tokens.ink4 }} />
      </InputAdornment>
    ),
    endAdornment: (
      <InputAdornment position="end">
        <Box
          component="kbd"
          sx={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: tokens.ink4,
            border: `1px solid ${tokens.line}`,
            borderRadius: 'var(--r-sm)',
            px: '4px',
            py: '1px',
            lineHeight: 1.4,
          }}
        >
          ⌘K
        </Box>
      </InputAdornment>
    ),
  }}
/>
```

Add these imports at the top:
```ts
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
```

- [ ] **Step 2: Apply the same pattern to EngineerListPage search field**

Find the `<TextField placeholder="Search` in `EngineerListPage.tsx` and apply the same `InputProps` block as above. Add the same imports.

- [ ] **Step 3: Apply to CatalogPage search field**

Find `<TextField` with `placeholder="Search devices..."` in `CatalogPage.tsx` and apply the same `InputProps` block. Add imports.

- [ ] **Step 4: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ObjectListPage.tsx frontend/src/pages/EngineerListPage.tsx frontend/src/pages/CatalogPage.tsx
git commit -m "feat: add magnifier icon and ⌘K hint to all filter search fields"
```

---

## Task 6: SvodPage — replace division Select with pill segmented control

**Files:**
- Modify: `frontend/src/pages/SvodPage.tsx:273-302`

The current code (lines 273–302) renders a `<FormControl size="small">` wrapping a `<Select>`. The design spec says: pill buttons on a `bgSunken` track (same pattern as DashboardPage period toggle at `DashboardPage.tsx:66–89`).

- [ ] **Step 1: Remove the `FormControl` import** if it is only used for the division filter (check the file — it may also be used elsewhere; only remove if unused after this task).

- [ ] **Step 2: Replace the division filter block**

Find the comment `{/* Division filter dropdown */}` and replace the entire `<FormControl ...>` block with:

```tsx
{/* Division filter — pill segmented control */}
<Box
  sx={{
    display: 'flex',
    border: `1px solid ${tokens.line}`,
    borderRadius: 'var(--r-pill)',
    overflow: 'hidden',
    backgroundColor: tokens.bgSunken,
    flexShrink: 0,
  }}
>
  {[{ id: '', name: 'All' }, ...divisions].map((d, i) => (
    <Box
      key={d.id}
      component="button"
      onClick={() => {
        setDivisionId(d.id)
        setPage(0)
      }}
      sx={{
        fontSize: 12,
        fontWeight: divisionId === d.id ? 500 : 400,
        color: divisionId === d.id ? tokens.ink : tokens.ink3,
        background: divisionId === d.id ? tokens.bgElev : 'transparent',
        border: 'none',
        borderLeft: i !== 0 ? `1px solid ${tokens.line}` : 'none',
        cursor: 'pointer',
        px: '10px',
        py: '5px',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
    >
      {d.name}
    </Box>
  ))}
</Box>
```

- [ ] **Step 3: Remove the `FormControl`, `MenuItem`, and `Select` imports** from SvodPage if they are no longer used after this change (check the full file first).

- [ ] **Step 4: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SvodPage.tsx
git commit -m "feat: replace SvodPage division Select with pill segmented control"
```

---

## Task 7: ObjectListPage — add chevron column

**Files:**
- Modify: `frontend/src/pages/ObjectListPage.tsx`

- [ ] **Step 1: Add `ChevronRightIcon` import**

```ts
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
```

- [ ] **Step 2: Add header cell for chevron in `<TableHead>`**

Find:
```tsx
<TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
  FTE
</TableCell>
```

Replace with:
```tsx
<TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
  FTE
</TableCell>
<TableCell sx={{ width: 32, p: 0 }} />
```

- [ ] **Step 3: Add chevron cell to `ObjectStaffingRow`**

Find the last `<TableCell>` in `ObjectStaffingRow` (the FTE cell) and add after it:
```tsx
<TableCell sx={{ width: 32, p: 0, pr: 1, textAlign: 'right' }}>
  <ChevronRightIcon sx={{ fontSize: 16, color: tokens.ink4, display: 'block' }} />
</TableCell>
```

- [ ] **Step 4: Add `tokens` import to ObjectStaffingRow scope** — `tokens` is already used via the outer component since it's in the same file, but confirm the import at the top of the file covers it.

- [ ] **Step 5: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ObjectListPage.tsx
git commit -m "feat: add chevron icon column to ObjectListPage rows"
```

---

## Task 8: CatalogPage — system chip colors + system tags + detail header chip

**Files:**
- Modify: `frontend/src/pages/CatalogPage.tsx`

- [ ] **Step 1: Add `useQueries` import and the system-tone map**

At the top of `CatalogPage.tsx`, add:
```ts
import { useQueries } from '@tanstack/react-query'
import { getCatalogDeviceContexts } from '../api/catalog'
```

Add this constant after the imports (before the component function):
```ts
const SYSTEM_TONE: Record<string, { bg: string; color: string }> = {
  'ОС':    { bg: tokens.accentSoft,  color: tokens.accentInk },
  'ПС':    { bg: tokens.okSoft,      color: tokens.ok },
  'Видео': { bg: tokens.warnSoft,    color: tokens.warn },
}

function systemChipSx(systemName: string): { backgroundColor: string; color: string } {
  return SYSTEM_TONE[systemName] ?? { backgroundColor: tokens.bgSunken, color: tokens.ink3 }
}
```

- [ ] **Step 2: Fetch contexts for all devices using `useQueries`**

Inside the `CatalogPage` component function, after the existing `useCatalogDevices` call, add:

```ts
const allContextQueries = useQueries({
  queries: devices.map((device) => ({
    queryKey: ['catalog', 'devices', device.id, 'contexts'],
    queryFn: () => getCatalogDeviceContexts(device.id),
    staleTime: Number.POSITIVE_INFINITY,
  })),
})

const deviceSystemTags: Record<string, string[]> = Object.fromEntries(
  devices.map((device, i) => [
    device.id,
    allContextQueries[i]?.data?.map((c) => c.systemType.name) ?? [],
  ]),
)
```

- [ ] **Step 3: Show system tags below device name in the master list**

Find the device list item rendering in the master rail. It currently shows only `device.name`. Find the `<Box>` or `<Typography>` rendering `{device.name}` in the scrollable list and add system tags below it:

```tsx
{/* Device name */}
<Typography sx={{ fontSize: 13, fontWeight: 450, color: tokens.ink }}>
  {device.name}
</Typography>
{/* System tags */}
{(deviceSystemTags[device.id] ?? []).length > 0 && (
  <Typography sx={{ fontSize: 11, color: tokens.ink4, mt: 0.25 }}>
    {(deviceSystemTags[device.id] ?? []).join(', ')}
  </Typography>
)}
```

- [ ] **Step 4: Fix per-system norm card chip colors**

Find the `<Chip>` inside the `contexts.map(...)` loop in the detail panel (around line 184 in the original, now possibly shifted). Currently:
```tsx
<Chip
  label={context.systemType.name}
  size="small"
  variant="filled"
  sx={{
    backgroundColor: tokens.accentSoft,
    color: tokens.accentInk,
  }}
/>
```

Replace the `sx` prop with:
```tsx
sx={systemChipSx(context.systemType.name)}
```

- [ ] **Step 5: Add system color chip to detail header**

Find the detail panel `{/* Title */}` section with `<Typography variant="h1">`. Add a chip before the h1:

```tsx
{/* System chip(s) in detail header */}
{contexts.length > 0 && (
  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
    {[...new Set(contexts.map((c) => c.systemType.name))].map((name) => (
      <Chip
        key={name}
        label={name}
        size="small"
        variant="filled"
        sx={systemChipSx(name)}
      />
    ))}
  </Box>
)}
<Typography variant="h1" sx={{ mb: 1 }}>
  {selectedDevice.name}
</Typography>
```

- [ ] **Step 6: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/CatalogPage.tsx
git commit -m "feat: system-coded chip colors, system tags in master, chip in detail header"
```

---

## Task 9: LoginPage full Quiet overhaul

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

The current file is 116 lines. This task replaces the entire JSX return body while keeping the form logic intact.

- [ ] **Step 1: Add missing imports**

Add to the import block:
```ts
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import { useState as useLocalState } from 'react' // already imported as useState
```

Actually `useState` is already imported. Add these MUI imports:
```ts
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
```

Also add `tokens` import:
```ts
import { tokens } from '../theme'
```

And add local state for the checkbox:
```ts
const [keepSignedIn, setKeepSignedIn] = useState(false)
```

- [ ] **Step 2: Replace the JSX return body**

Replace everything from `return (` through the closing `)` with:

```tsx
return (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      backgroundColor: tokens.bg,
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 31px, ${tokens.line} 31px, ${tokens.line} 32px),
        repeating-linear-gradient(90deg, transparent, transparent 31px, ${tokens.line} 31px, ${tokens.line} 32px)
      `,
    }}
  >
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        backgroundColor: tokens.bgElev,
        borderRadius: 'var(--r-lg)',
        border: `1px solid ${tokens.lineStrong}`,
        p: '28px 32px 24px',
      }}
    >
      {/* Brand mark + wordmark */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            backgroundColor: tokens.ink,
            borderRadius: 'var(--r-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            W
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink, letterSpacing: '-0.01em' }}>
          Workload
        </Typography>
      </Box>

      {/* Page heading */}
      <Typography component="h1" sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', mb: 0.5 }}>
        Sign in
      </Typography>
      <Typography sx={{ fontSize: 13, color: tokens.ink3, mb: 3 }}>
        Internal maintenance workload system
      </Typography>

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <Box
        component="form"
        onSubmit={(e) => { void onSubmit(e) }}
        noValidate
      >
        <FormTextField
          name="email"
          control={control}
          label="Email"
          variant="outlined"
          fullWidth
          margin="normal"
          autoComplete="email"
        />
        <FormTextField
          name="password"
          control={control}
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          autoComplete="current-password"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              size="small"
            />
          }
          label={<Typography sx={{ fontSize: 13 }}>Keep me signed in</Typography>}
          sx={{ mt: 1 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disableRipple
          disabled={isSubmitting}
          sx={{ mt: 2 }}
        >
          {isSubmitting ? <CircularProgress size={16} color="inherit" /> : 'Sign in'}
        </Button>

        <Divider sx={{ my: 2, fontSize: 12, color: tokens.ink3 }}>or</Divider>

        <Button fullWidth variant="outlined">
          Continue with corporate SSO
        </Button>
      </Box>
    </Box>
  </Box>
)
```

- [ ] **Step 3: Remove unused imports**

Remove `Card` and `CardContent` from the MUI import (no longer used). Keep `Alert`, `Box`, `Button`, `CircularProgress`, `Typography`.

- [ ] **Step 4: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: Quiet design overhaul for LoginPage — grid bg, card border, brand mark, outlined inputs"
```

---

## Task 10: `QuietDialog` wrapper component

**Files:**
- Create: `frontend/src/components/dialogs/QuietDialog.tsx`

This component is a thin MUI `Dialog` wrapper that applies the standard Quiet paper overrides. It will be used by the three dialogs extracted in Tasks 11–13.

- [ ] **Step 1: Create `frontend/src/components/dialogs/QuietDialog.tsx`**

```tsx
import Dialog from '@mui/material/Dialog'
import { tokens } from '../../theme'
import type { ReactNode } from 'react'

interface QuietDialogProps {
  open: boolean
  onClose: () => void
  paperWidth?: number
  children: ReactNode
}

export function QuietDialog({ open, onClose, paperWidth = 480, children }: QuietDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDialog-paper': {
          width: paperWidth,
          maxWidth: paperWidth,
          borderRadius: 'var(--r-lg)',
          border: `1px solid ${tokens.lineStrong}`,
          boxShadow: 'none',
        },
      }}
    >
      {children}
    </Dialog>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dialogs/QuietDialog.tsx
git commit -m "feat: add QuietDialog wrapper with Quiet paper overrides"
```

---

## Task 11: `CreateEngineerDialog` — extract and overhaul

**Files:**
- Create: `frontend/src/components/dialogs/CreateEngineerDialog.tsx`
- Modify: `frontend/src/pages/EngineerListPage.tsx` (remove inline dialog, import new component)

- [ ] **Step 1: Create `frontend/src/components/dialogs/CreateEngineerDialog.tsx`**

```tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { QuietDialog } from './QuietDialog'
import { FormTextField } from '../common/FormTextField'
import { useDivisions } from '../../hooks/useDivisions'
import { useCreateEngineer } from '../../hooks/useEngineers'
import { EngineerCreateSchema, type EngineerCreate } from '../../types/engineer'
import { tokens } from '../../theme'

interface CreateEngineerDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateEngineerDialog({ open, onClose }: CreateEngineerDialogProps) {
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()
  const createMutation = useCreateEngineer()

  const { control, handleSubmit, reset } = useForm<EngineerCreate>({
    resolver: zodResolver(EngineerCreateSchema),
    defaultValues: { name: '', email: '', password: '', capacityFte: 1, homeDivisionId: '' },
  })

  const handleClose = () => {
    reset()
    setSendWelcomeEmail(false)
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    await createMutation.mutateAsync(data)
    handleClose()
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={520}>
      <DialogTitle sx={{ position: 'relative', pb: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', color: tokens.ink3, mb: 0.5 }}>
          New engineer
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create engineer
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={(e) => { void onSubmit(e) }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {createMutation.isError && (
            <Alert severity="error">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed to create engineer'}
            </Alert>
          )}
          <FormTextField name="name" control={control} label="Name" fullWidth autoFocus />
          <FormTextField name="email" control={control} label="Email" fullWidth type="email" />
          <FormTextField
            name="password"
            control={control}
            label="Password"
            fullWidth
            type="password"
            helperText="Min 8 characters · engineer must change on first sign-in"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormTextField
                name="capacityFte"
                control={control}
                label="Capacity FTE"
                fullWidth
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="homeDivisionId"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error}>
                    <InputLabel>Division</InputLabel>
                    <Select {...field} label="Division" displayEmpty disabled={divisionsLoading}>
                      <MenuItem value="">Select a division</MenuItem>
                      {divisions?.map((div) => (
                        <MenuItem key={div.id} value={div.id}>
                          {div.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography color="error" variant="caption" sx={{ mt: 0.5 }}>
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: 13 }}>Send welcome email</Typography>}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create engineer
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
```

> **Note:** If `useCreateEngineer` does not exist as a named hook, check `frontend/src/hooks/useEngineers.ts` for the actual hook name and adjust the import accordingly.

- [ ] **Step 2: Replace the inline dialog in `EngineerListPage.tsx`**

In `EngineerListPage.tsx`:
1. Remove all state and form logic that belongs exclusively to the inline dialog (the `useForm` call for engineer creation, `dialogOpen`, `handleDialogClose`, `handleCreateEngineer`, `createMutation`).
2. Remove the `<Dialog ... >` block (lines ~248–313).
3. Add import: `import { CreateEngineerDialog } from '../components/dialogs/CreateEngineerDialog'`
4. Replace the removed dialog block with:
   ```tsx
   <CreateEngineerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
   ```

- [ ] **Step 3: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dialogs/CreateEngineerDialog.tsx frontend/src/pages/EngineerListPage.tsx
git commit -m "feat: extract CreateEngineerDialog with Quiet styling and side-by-side FTE/division"
```

---

## Task 12: `CreateDivisionDialog` — extract and overhaul

**Files:**
- Create: `frontend/src/components/dialogs/CreateDivisionDialog.tsx`
- Modify: `frontend/src/pages/DivisionsListPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/dialogs/CreateDivisionDialog.tsx`**

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { QuietDialog } from './QuietDialog'
import { FormTextField } from '../common/FormTextField'
import { useCreateDivision } from '../../hooks/useDivisions'
import { DivisionCreateSchema, type DivisionCreate } from '../../types/division'
import { tokens } from '../../theme'

interface CreateDivisionDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateDivisionDialog({ open, onClose }: CreateDivisionDialogProps) {
  const createDivision = useCreateDivision()

  const { control, handleSubmit, reset } = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
    defaultValues: { name: '' },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    await createDivision.mutateAsync(data)
    handleClose()
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={480}>
      <DialogTitle sx={{ position: 'relative', pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create division
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={(e) => { void onSubmit(e) }}>
        <DialogContent sx={{ pt: 1 }}>
          <FormTextField name="name" control={control} label="Division name" fullWidth autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
            Code is auto-derived from name
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createDivision.isPending}>
              Create division
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
```

> **Note:** Check `frontend/src/hooks/useDivisions.ts` for the actual mutation hook name (`useCreateDivision` or similar) and adjust the import.

- [ ] **Step 2: Replace inline dialog in `DivisionsListPage.tsx`**

1. Remove the `<Dialog ... >` block (lines ~202–221).
2. Remove the `useForm` + `handleCreate` logic that belongs exclusively to that dialog (if DivisionsListPage only uses it for the create dialog).
3. Add import: `import { CreateDivisionDialog } from '../components/dialogs/CreateDivisionDialog'`
4. Replace with:
   ```tsx
   <CreateDivisionDialog open={open} onClose={handleClose} />
   ```

- [ ] **Step 3: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dialogs/CreateDivisionDialog.tsx frontend/src/pages/DivisionsListPage.tsx
git commit -m "feat: extract CreateDivisionDialog with Quiet styling and footer hint"
```

---

## Task 13: `CreateBranchDialog` — extract and overhaul

**Files:**
- Create: `frontend/src/components/dialogs/CreateBranchDialog.tsx`
- Modify: `frontend/src/pages/DivisionDetailPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/dialogs/CreateBranchDialog.tsx`**

```tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { QuietDialog } from './QuietDialog'
import { FormTextField } from '../common/FormTextField'
import { useCreateBranch } from '../../hooks/useBranches'
import { BranchCreateSchema, type BranchCreate } from '../../types/division'
import { tokens } from '../../theme'

interface CreateBranchDialogProps {
  open: boolean
  onClose: () => void
  /** Pre-selected division — passed from DivisionDetailPage context */
  divisionId: string
  divisionName: string
}

export function CreateBranchDialog({ open, onClose, divisionId, divisionName }: CreateBranchDialogProps) {
  const createBranch = useCreateBranch()

  const { control, handleSubmit, reset } = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
    defaultValues: { name: '' },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    await createBranch.mutateAsync({ ...data, divisionId })
    handleClose()
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={480}>
      <DialogTitle sx={{ position: 'relative', pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create branch
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={(e) => { void onSubmit(e) }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormTextField name="name" control={control} label="Branch name" fullWidth autoFocus />
          <FormControl fullWidth disabled>
            <InputLabel>Division</InputLabel>
            <Select value={divisionId} label="Division">
              <MenuItem value={divisionId}>{divisionName}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
            Branch №/ID is auto-assigned
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createBranch.isPending}>
              Create branch
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
```

> **Note:** Check `frontend/src/hooks/useBranches.ts` for the actual mutation hook name and the expected payload shape (`BranchCreate` may or may not include `divisionId` — if the schema does not include it, pass `divisionId` separately to the mutation). Check `BranchCreateSchema` in `frontend/src/types/division.ts` to confirm the fields.

- [ ] **Step 2: Replace inline dialog in `DivisionDetailPage.tsx`**

1. The dialog is at lines ~251–277. Remove that block.
2. Remove the `useForm<BranchCreate>` call (`control`, `handleBranchSubmit`, `resetBranchForm`) — lines ~63–70.
3. Add import: `import { CreateBranchDialog } from '../components/dialogs/CreateBranchDialog'`
4. The page already has `division` data from `useDivision(id)`. Replace the dialog block with:
   ```tsx
   {division && (
     <CreateBranchDialog
       open={openBranchDialog}
       onClose={handleCloseBranchDialog}
       divisionId={division.id}
       divisionName={division.name}
     />
   )}
   ```

- [ ] **Step 3: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dialogs/CreateBranchDialog.tsx frontend/src/pages/DivisionDetailPage.tsx
git commit -m "feat: extract CreateBranchDialog with Quiet styling, disabled division field, footer hint"
```

---

## Task 14: Fix `CreateObjectDialog` — eyebrow, h1, 2-col grid, fields

**Files:**
- Modify: `frontend/src/components/dialogs/CreateObjectDialog.tsx`

- [ ] **Step 1: Fix eyebrow typography (line ~115–124)**

Find the eyebrow Typography. Current:
```tsx
<Typography
  sx={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: tokens.ink3,
    mb: 0.5,
  }}
>
  New object
</Typography>
```

Change `fontWeight: 600` → `fontWeight: 500` and `letterSpacing: '0.06em'` → `letterSpacing: '0.02em'`. Remove `textTransform: 'uppercase'`.

```tsx
<Typography
  sx={{
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
    color: tokens.ink3,
    mb: 0.5,
  }}
>
  New object
</Typography>
```

- [ ] **Step 2: Fix h1 fontSize (line ~125)**

Find the h1 Typography. Current has `fontSize: 28`. Change to `24`:
```tsx
<Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
  Create object
</Typography>
```

- [ ] **Step 3: Add × close button to DialogTitle**

After the `<DialogTitle sx={{ pb: 1 }}>` opening tag, verify there is no existing `IconButton`. Add it alongside the eyebrow + h1:

Wrap the existing DialogTitle content and add a close button:
```tsx
<DialogTitle sx={{ position: 'relative', pb: 1 }}>
  <Typography sx={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', color: tokens.ink3, mb: 0.5 }}>
    New object
  </Typography>
  <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
    Create object
  </Typography>
  <IconButton
    onClick={onClose}
    size="small"
    sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
  >
    <CloseIcon fontSize="small" />
  </IconButton>
</DialogTitle>
```

Add import: `import CloseIcon from '@mui/icons-material/Close'` and `IconButton` from `@mui/material`.

- [ ] **Step 4: Switch form to 2-column grid layout**

All fields are currently `xs={12}`. Change Object name and Branch to their columns, and pair remaining fields:

```tsx
<Grid container spacing={2}>
  {/* Object name — full width */}
  <Grid item xs={12}>
    <FormTextField name="name" control={control} label="Object name" fullWidth autoFocus />
  </Grid>

  {/* Branch — full width (grouped select is wide) */}
  <Grid item xs={12}>
    <Controller
      name="branchId"
      ...
    />
  </Grid>

  {/* Address — full width */}
  <Grid item xs={12}>
    <FormTextField name="address" control={control} label="Address" fullWidth />
  </Grid>

  {/* Tier + Object ID side-by-side */}
  <Grid item xs={6}>
    <FormControl fullWidth disabled>
      <InputLabel>Tier</InputLabel>
      <Select value="" label="Tier">
        <MenuItem value="">—</MenuItem>
      </Select>
    </FormControl>
  </Grid>
  <Grid item xs={6}>
    <TextField
      label="Object ID"
      value=""
      disabled
      fullWidth
      placeholder="Auto-assigned"
      inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
    />
  </Grid>

  {/* Travel norm + Visits/year side-by-side */}
  <Grid item xs={6}>
    <TextField
      label="Travel norm h"
      disabled
      fullWidth
      placeholder="Coming soon"
      inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
    />
  </Grid>
  <Grid item xs={6}>
    <TextField
      label="Visits / year"
      disabled
      fullWidth
      placeholder="Coming soon"
      inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
    />
  </Grid>
</Grid>
```

Adjust the existing field JSX rather than copying verbatim — preserve the existing `Controller` for `branchId` (with `ListSubheader` grouping) as-is, just move it into `<Grid item xs={12}>`.

- [ ] **Step 5: Add Division Select field above Branch**

After the Object name Grid item, before Branch:
```tsx
<Grid item xs={12}>
  <FormControl fullWidth disabled>
    <InputLabel>Division</InputLabel>
    <Select value="" label="Division">
      <MenuItem value="">—</MenuItem>
    </Select>
  </FormControl>
</Grid>
```

> This is a display-only placeholder — division is implicit from the selected branch.

- [ ] **Step 6: Run type check and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/dialogs/CreateObjectDialog.tsx
git commit -m "fix: CreateObjectDialog eyebrow typography, 24px h1, 2-column grid, close button, field additions"
```

---

## Task 15: Codebase hygiene — remove DivisionListPage.tsx

**Files:**
- Possibly delete: `frontend/src/pages/DivisionListPage.tsx`

- [ ] **Step 1: Verify the router does not reference `DivisionListPage`**

```bash
cd frontend
grep -r "DivisionListPage" src/
```

Expected: zero matches (or matches only in the file itself). If any route file or component imports `DivisionListPage`, do NOT delete — investigate first and update the import to `DivisionsListPage`.

- [ ] **Step 2: If no references found, delete the file**

```bash
rm frontend/src/pages/DivisionListPage.tsx
```

- [ ] **Step 3: Run type check to confirm nothing broke**

```bash
cd frontend
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead DivisionListPage.tsx (superseded by DivisionsListPage)"
```

---

## Self-Review Against Spec

### Spec coverage check

| Requirement (from DESIGN_IMPLEMENTATION_GAPS.md) | Task |
|---|---|
| Outlined button border → lineStrong | Task 1 |
| Button h-padding 12px | Task 1 |
| Dialog input height 38px | Task 2 |
| ObjectListPage Select size/border alignment | Task 3 |
| EngineerListPage Select size/border alignment | Task 4 |
| Search magnifier + ⌘K hint (all 4 pages) | Task 5 |
| SvodPage pill segmented control | Task 6 |
| ObjectListPage chevron icon | Task 7 |
| CatalogPage system chip colors | Task 8 |
| CatalogPage system tags in master list | Task 8 |
| CatalogPage system chip in detail header | Task 8 |
| LoginPage bg + grid | Task 9 |
| LoginPage card (380px, no shadow, border, r-lg) | Task 9 |
| LoginPage brand mark + wordmark + Sign in h1 | Task 9 |
| LoginPage outlined inputs | Task 9 |
| LoginPage 32px button (remove minHeight override) | Task 9 |
| LoginPage checkbox + divider + SSO button | Task 9 |
| QuietDialog wrapper for shared styling | Task 10 |
| CreateEngineerDialog Quiet styling (520px, border, radius) | Task 11 |
| CreateEngineerDialog eyebrow + h1 header | Task 11 |
| CreateEngineerDialog × close button | Task 11 |
| CreateEngineerDialog FTE + Division side-by-side | Task 11 |
| CreateEngineerDialog password helperText extended | Task 11 |
| CreateEngineerDialog "Send welcome email" checkbox | Task 11 |
| CreateEngineerDialog submit label "Create engineer" | Task 11 |
| CreateDivisionDialog Quiet styling (480px) | Task 12 |
| CreateDivisionDialog × close button | Task 12 |
| CreateDivisionDialog footer hint | Task 12 |
| CreateDivisionDialog submit label "Create division" | Task 12 |
| CreateBranchDialog Quiet styling (480px) | Task 13 |
| CreateBranchDialog title "Create branch" | Task 13 |
| CreateBranchDialog × close button | Task 13 |
| CreateBranchDialog Division Select (pre-filled disabled) | Task 13 |
| CreateBranchDialog footer hint | Task 13 |
| CreateBranchDialog submit label "Create branch" | Task 13 |
| CreateObjectDialog eyebrow typography fix | Task 14 |
| CreateObjectDialog h1 24px | Task 14 |
| CreateObjectDialog × close button | Task 14 |
| CreateObjectDialog 2-column grid | Task 14 |
| CreateObjectDialog Division Select placeholder | Task 14 |
| CreateObjectDialog Tier → Select disabled | Task 14 |
| CreateObjectDialog Object ID field | Task 14 |
| CreateObjectDialog monospace on disabled fields | Task 14 |
| Remove dead DivisionListPage.tsx | Task 15 |

### Known omissions (intentional — blocked by backend)

- Tier chip column on ObjectListPage (no `tier` field on Object)
- Engineers count column on ObjectListPage (no per-object engineer count API)
- CatalogPage "Used on N objects" (no API)
- CatalogPage "Normative history" section (no API)
- DivisionsListPage "Region city" column (no `regionCity` in DivisionDto)

These remain documented in `DESIGN_IMPLEMENTATION_GAPS.md` Phase 3.

### Placeholder scan

All tasks contain actual code. No "TBD" or "implement later" present.

### Type consistency

- `QuietDialog` props use `ReactNode` for children — consistent with React 18 import style.
- `CreateBranchDialog` passes `divisionId` + `divisionName` as props — consistent with how `DivisionDetailPage` already has `division.id` and `division.name` available.
- `useCreateEngineer`, `useCreateDivision`, `useCreateBranch` — these hook names should be verified against actual hook files before executing. The plan notes this explicitly in each task.
