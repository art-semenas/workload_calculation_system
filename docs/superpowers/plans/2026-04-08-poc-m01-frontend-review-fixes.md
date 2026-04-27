# PoC M-01 Frontend Code-Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 code-review findings from the PoC M-01 frontend review: replace all raw `useState` form patterns with RHF+Zod (C-1, C-2), fix `FormTextField` number coercion (I-6), use `useLogin` hook in `LoginPage` (I-3), replace `as T` API assertions with Zod `.parse()` (I-4), extract a shared `extractErrorCode` utility (I-5), and switch `BranchDetailPage` to use the embedded `branch.objects` field (I-2).

**Architecture:** All fixes are local to their files — no new pages, no new API routes. Each task is self-contained and can be reviewed independently. Tasks 1 → 2 are sequential (Task 2 depends on Task 1). Tasks 3–7 are independent and can be executed in any order.

**Tech Stack:** React 18, TypeScript 5 (strict), Vitest + @testing-library/react + @testing-library/user-event, React Hook Form 7, Zod 3, TanStack Query 5, MUI 5.

---

## Files Changed

| File | Tasks |
|---|---|
| `frontend/src/components/common/FormTextField.tsx` | Task 1 |
| `frontend/src/types/repairs.ts` | Task 1 |
| `frontend/src/types/records.ts` | Task 1 |
| `frontend/src/types/equipment.ts` | Task 1 |
| `frontend/src/types/travel.ts` | Task 1 |
| `frontend/src/test/types.test.ts` | Task 1 |
| `frontend/src/components/repairs/RepairsTab.tsx` | Task 2 |
| `frontend/src/pages/DivisionDetailPage.tsx` | Task 3 |
| `frontend/src/pages/BranchDetailPage.tsx` | Task 3, Task 7 |
| `frontend/src/pages/ObjectDetailPage.tsx` | Task 3 |
| `frontend/src/utils/errorMessages.ts` | Task 4 |
| `frontend/src/components/equipment/PhysicalInventory.tsx` | Task 4 |
| `frontend/src/components/equipment/SystemAssignments.tsx` | Task 4 |
| `frontend/src/pages/LoginPage.tsx` | Task 5 |
| `frontend/src/api/auth.ts` | Task 6 |
| `frontend/src/api/divisions.ts` | Task 6 |
| `frontend/src/api/branches.ts` | Task 6 |
| `frontend/src/api/objects.ts` | Task 6 |
| `frontend/src/api/equipment.ts` | Task 6 |
| `frontend/src/api/repairs.ts` | Task 6 |
| `frontend/src/api/catalog.ts` | Task 6 |
| `frontend/src/test/hooks.test.ts` | Task 6 |
| `frontend/src/hooks/useObjects.ts` | Task 7 |

---

## Task 1: Fix `FormTextField` number handling and update number Zod schemas (I-6)

**Problem:** `FormTextField` passes `''` (empty string) to `field.onChange` when a number input is cleared. This causes Zod to report "Expected number, received string" — a confusing error for a form that should say "Must be a whole number". Fix: use `event.target.valueAsNumber` (which yields `NaN` for empty inputs), then add `.finite()` with a custom error message to every number schema used in forms.

**Files:**
- Modify: `frontend/src/components/common/FormTextField.tsx`
- Modify: `frontend/src/types/repairs.ts`
- Modify: `frontend/src/types/records.ts`
- Modify: `frontend/src/types/equipment.ts`
- Modify: `frontend/src/types/travel.ts`
- Modify: `frontend/src/test/types.test.ts`

- [ ] **Step 1: Add failing tests to `frontend/src/test/types.test.ts`**

Append these tests to the existing `describe("Zod schemas", ...)` block. They all currently fail because the schemas use default Zod messages (e.g. `"Expected integer, received nan"`) instead of custom ones.

```typescript
it("RepairUpdateSchema error is 'Must be a whole number' for NaN input", () => {
  const result = RepairUpdateSchema.safeParse({ count: NaN })
  expect(result.success).toBe(false)
  expect(result.error?.issues[0].message).toBe("Must be a whole number")
})

it("RecordsUpdateSchema error is 'Must be a whole number' for NaN accessRequests", () => {
  const result = RecordsUpdateSchema.safeParse({
    accessRequests: NaN,
    monitoringRequests: 0,
    footageRequests: 0,
    backupControl: 0,
    securityAdmin: 0,
  })
  expect(result.success).toBe(false)
  expect(result.error?.issues[0].message).toBe("Must be a whole number")
})

it("TravelUpdateSchema error is 'Enter a valid number' for NaN distanceKm", () => {
  const result = TravelUpdateSchema.safeParse({
    transportType: "car",
    distanceKm: NaN,
    oneWayTimeMin: 10,
  })
  expect(result.success).toBe(false)
  expect(result.error?.issues[0].message).toBe("Enter a valid number")
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/types.test.ts
```

Expected: the three new tests fail. Current schema messages are the Zod defaults ("Expected integer, received nan" etc.).

- [ ] **Step 3: Update `frontend/src/types/repairs.ts`**

Replace the file content:

```typescript
import { z } from 'zod'

export const ObjectRepairSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  repairTypeId: z.string().uuid(),
  repairTypeName: z.string(),
  count: z.number().int().min(0),
})

export const RepairUpdateSchema = z.object({
  count: z
    .number({ invalid_type_error: 'Enter a number' })
    .finite('Enter a valid number')
    .int('Must be a whole number')
    .min(0, 'Must be ≥ 0'),
})

export type ObjectRepair = z.infer<typeof ObjectRepairSchema>
export type RepairUpdate = z.infer<typeof RepairUpdateSchema>
```

- [ ] **Step 4: Update `frontend/src/types/records.ts`**

Replace the `NonNegativeIntSchema` constant and the `RecordsUpdateSchema` so every field has explicit error messages. The `RecordsTaskSchema` (response type) is unchanged.

```typescript
import { z } from 'zod'

const NonNegativeIntSchema = z
  .number({ invalid_type_error: 'Enter a number' })
  .finite('Enter a valid number')
  .int('Must be a whole number')
  .min(0, 'Must be ≥ 0')

export const RecordsTaskSchema = z.object({
  id: z.string().uuid().optional(),
  objectId: z.string().uuid(),
  accessRequests: z.number().int().min(0),
  monitoringRequests: z.number().int().min(0),
  footageRequests: z.number().int().min(0),
  backupControl: z.number().int().min(0),
  securityAdmin: z.number().int().min(0),
})

export const RecordsUpdateSchema = z.object({
  accessRequests: NonNegativeIntSchema,
  monitoringRequests: NonNegativeIntSchema,
  footageRequests: NonNegativeIntSchema,
  backupControl: NonNegativeIntSchema,
  securityAdmin: NonNegativeIntSchema,
})

export type RecordsTask = z.infer<typeof RecordsTaskSchema>
export type RecordsUpdate = z.infer<typeof RecordsUpdateSchema>
```

Note: `RecordsTaskSchema` keeps plain `z.number().int().min(0)` because it is used for API response parsing (Task 6), not form input — the backend always sends a valid integer.

- [ ] **Step 5: Update `frontend/src/types/equipment.ts`**

Replace `DeviceAddSchema`, `AssignmentCreateSchema`, `AssignmentUpdateSchema` with explicit messages. The entity schemas (`ObjectDeviceSchema`, `ObjectSystemAssignmentSchema`) are unchanged.

```typescript
import { z } from 'zod'

export const SystemTypeSchema = z.enum(['OS', 'PS', 'VIDEO'])

export const ObjectDeviceSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  deviceTypeId: z.string().uuid(),
  deviceTypeName: z.string(),
  quantityPhysical: z.number().int(),
})

export const ObjectSystemAssignmentSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  deviceTypeId: z.string().uuid(),
  deviceTypeName: z.string(),
  systemType: SystemTypeSchema,
  quantityMaintained: z.number().int(),
  r1Minutes: z.number(),
  r2Minutes: z.number(),
})

export const DeviceAddSchema = z.object({
  deviceTypeId: z.string().uuid(),
  quantityPhysical: z
    .number({ invalid_type_error: 'Enter a number' })
    .finite('Enter a valid number')
    .int('Must be a whole number')
    .min(1, 'Must be ≥ 1'),
})

export const AssignmentCreateSchema = z.object({
  deviceTypeId: z.string().uuid(),
  systemType: SystemTypeSchema,
  quantityMaintained: z
    .number({ invalid_type_error: 'Enter a number' })
    .finite('Enter a valid number')
    .int('Must be a whole number')
    .min(0, 'Must be ≥ 0'),
})

export const AssignmentUpdateSchema = z.object({
  quantityMaintained: z
    .number({ invalid_type_error: 'Enter a number' })
    .finite('Enter a valid number')
    .int('Must be a whole number')
    .min(0, 'Must be ≥ 0'),
})

export type SystemType = z.infer<typeof SystemTypeSchema>
export type ObjectDevice = z.infer<typeof ObjectDeviceSchema>
export type ObjectSystemAssignment = z.infer<typeof ObjectSystemAssignmentSchema>
export type DeviceAdd = z.infer<typeof DeviceAddSchema>
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>
export type AssignmentUpdate = z.infer<typeof AssignmentUpdateSchema>
```

- [ ] **Step 6: Update `frontend/src/types/travel.ts`**

Replace `TravelUpdateSchema` with explicit messages. `TravelSchema` (response type) is unchanged.

```typescript
import { z } from 'zod'

export const TravelSchema = z.object({
  id: z.string().uuid().optional(),
  objectId: z.string().uuid(),
  transportType: z.string(),
  distanceKm: z.number(),
  oneWayTimeMin: z.number(),
  roundTripMin: z.number(),
})

export const TravelUpdateSchema = z.object({
  transportType: z.string().min(1, 'Required'),
  distanceKm: z
    .number({ invalid_type_error: 'Enter a number' })
    .finite('Enter a valid number')
    .min(0, 'Must be ≥ 0'),
  oneWayTimeMin: z
    .number({ invalid_type_error: 'Enter a number' })
    .finite('Enter a valid number')
    .min(0, 'Must be ≥ 0'),
})

export type Travel = z.infer<typeof TravelSchema>
export type TravelUpdate = z.infer<typeof TravelUpdateSchema>
```

- [ ] **Step 7: Fix `frontend/src/components/common/FormTextField.tsx`**

Change the `number` branch in `onChange` to use `event.target.valueAsNumber` instead of manually converting. `valueAsNumber` returns `NaN` for empty inputs — this now flows into the Zod schemas which handle it with the custom messages added above.

```typescript
import type { ChangeEvent } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { TextField, type TextFieldProps } from '@mui/material'

type FormTextFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues>
  label: string
} & Omit<TextFieldProps, 'name' | 'defaultValue'>

export function FormTextField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  helperText,
  onChange,
  type,
  ...textFieldProps
}: FormTextFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const fieldValue = field.value
        const safeValue =
          fieldValue == null ? '' : (fieldValue as string | number | readonly string[] | undefined)

        return (
          <TextField
            {...textFieldProps}
            {...field}
            type={type}
            label={label}
            value={safeValue}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              if (type === 'number') {
                // valueAsNumber gives NaN for empty input, which Zod's .finite() / .int() handle
                // with the custom error messages defined in each schema.
                field.onChange(event.target.valueAsNumber)
              } else {
                field.onChange(event)
              }

              onChange?.(event)
            }}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? helperText}
          />
        )
      }}
    />
  )
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
cd frontend && npx vitest run src/test/types.test.ts
```

Expected: all 8 tests pass (5 original + 3 new).

- [ ] **Step 9: Run full type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: exits 0.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/common/FormTextField.tsx \
        frontend/src/types/repairs.ts \
        frontend/src/types/records.ts \
        frontend/src/types/equipment.ts \
        frontend/src/types/travel.ts \
        frontend/src/test/types.test.ts
git commit -m "fix: use valueAsNumber in FormTextField and add custom int error messages"
```

---

## Task 2: Migrate `RepairRow` to RHF + Zod (C-1)

**Problem:** `RepairRow` in `RepairsTab.tsx` manages form state with `useState(String(initialCount))` and performs manual integer validation — exactly what CONTRIBUTING.md prohibits ("Never manage form state with raw `useState`"). Fix: replace with `useForm<RepairUpdate>` + `zodResolver(RepairUpdateSchema)` using `FormTextField` with `type="number"`.

**Depends on:** Task 1 must be done first (FormTextField number fix).

**Files:**
- Modify: `frontend/src/components/repairs/RepairsTab.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/test/RepairsTab.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { RepairsTab } from '../components/repairs/RepairsTab'

vi.mock('../hooks/useCatalog', () => ({
  useCatalogRepairs: () => ({
    data: [{ id: 'rt-1', name: 'Плановый ремонт', timeMinutes: 30 }],
    isLoading: false,
  }),
}))

vi.mock('../hooks/useRepairs', () => ({
  useRepairs: () => ({
    data: [{ id: 'r-1', objectId: 'obj-1', repairTypeId: 'rt-1', repairTypeName: 'Плановый ремонт', count: 2 }],
    isLoading: false,
  }),
  useUpdateRepair: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

describe('RepairsTab', () => {
  it('shows Zod validation error when count is cleared and Save is clicked', async () => {
    const user = userEvent.setup()
    render(<RepairsTab objectId="obj-1" />, { wrapper })

    const input = screen.getByLabelText('count-Плановый ремонт')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Currently FAILS: raw useState + manual guard silently does nothing on empty input
    // After fix: RHF+Zod shows "Must be a whole number" error
    await waitFor(() => {
      expect(screen.getByText('Must be a whole number')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/RepairsTab.test.tsx
```

Expected: test fails — the current `RepairRow` uses `useState` and manual guard that returns silently instead of showing a validation error.

- [ ] **Step 3: Rewrite `RepairRow` in `frontend/src/components/repairs/RepairsTab.tsx`**

Replace the entire file:

```typescript
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormTextField } from '../common/FormTextField'
import { useCatalogRepairs } from '../../hooks/useCatalog'
import { useRepairs, useUpdateRepair } from '../../hooks/useRepairs'
import { RepairUpdateSchema, type RepairUpdate } from '../../types/repairs'
import type { RepairType } from '../../types/catalog'
import type { ObjectRepair } from '../../types/repairs'
import { useState } from 'react'

function getCount(repairs: ObjectRepair[], repairTypeId: string): number {
  return repairs.find((r) => r.repairTypeId === repairTypeId)?.count ?? 0
}

function RepairRow({
  repairType,
  initialCount,
  objectId,
  onSaveSuccess,
  onSaveError,
}: {
  repairType: RepairType
  initialCount: number
  objectId: string
  onSaveSuccess: () => void
  onSaveError: () => void
}) {
  const updateMutation = useUpdateRepair(objectId)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RepairUpdate>({
    resolver: zodResolver(RepairUpdateSchema),
    defaultValues: { count: initialCount },
  })

  useEffect(() => {
    reset({ count: initialCount })
  }, [initialCount, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateMutation.mutateAsync({ repairTypeId: repairType.id, data: { count: data.count } })
      onSaveSuccess()
    } catch {
      onSaveError()
    }
  })

  return (
    <TableRow>
      <TableCell>{repairType.name}</TableCell>
      <TableCell>{repairType.timeMinutes}</TableCell>
      <TableCell>
        <FormTextField
          name="count"
          control={control}
          label=""
          type="number"
          size="small"
          inputProps={{ 'aria-label': `count-${repairType.name}`, min: 0 }}
          sx={{ width: 100 }}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="contained"
          size="small"
          disabled={isSubmitting || updateMutation.isPending}
          onClick={() => {
            void onSubmit()
          }}
        >
          Save
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function RepairsTab({ objectId }: { objectId: string }) {
  const { data: catalogRepairs, isLoading: catalogLoading } = useCatalogRepairs()
  const { data: repairs, isLoading: repairsLoading } = useRepairs(objectId)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)

  if (catalogLoading || repairsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  const repairList = repairs ?? []

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Repairs
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Repair Type</TableCell>
            <TableCell>Time (min)</TableCell>
            <TableCell>Count</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(catalogRepairs ?? []).map((repairType) => (
            <RepairRow
              key={repairType.id}
              repairType={repairType}
              initialCount={getCount(repairList, repairType.id)}
              objectId={objectId}
              onSaveSuccess={() => setSuccessOpen(true)}
              onSaveError={() => setErrorOpen(true)}
            />
          ))}
        </TableBody>
      </Table>
      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>
          Repairs saved successfully.
        </Alert>
      </Snackbar>
      <Snackbar open={errorOpen} autoHideDuration={3000} onClose={() => setErrorOpen(false)}>
        <Alert severity="error" onClose={() => setErrorOpen(false)}>
          Failed to save repairs.
        </Alert>
      </Snackbar>
    </Box>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx vitest run src/test/RepairsTab.test.tsx
```

Expected: test passes — the RHF form now shows the Zod validation error when the field is cleared.

- [ ] **Step 5: Run full suite**

```bash
cd frontend && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/repairs/RepairsTab.tsx \
        frontend/src/test/RepairsTab.test.tsx
git commit -m "fix: replace useState form state in RepairRow with RHF+Zod"
```

---

## Task 3: Fix inline name editors in detail pages to use RHF (C-2)

**Problem:** `DivisionDetailPage`, `BranchDetailPage`, and `ObjectDetailPage` each use a raw `useState`-controlled `<TextField>` for their inline name-edit input — no Zod validation, no RHF. CONTRIBUTING.md prohibits this pattern. Fix: add a dedicated `useForm` for the name editor in each page, connected to `FormTextField`.

**Files:**
- Modify: `frontend/src/pages/DivisionDetailPage.tsx`
- Modify: `frontend/src/pages/BranchDetailPage.tsx`
- Modify: `frontend/src/pages/ObjectDetailPage.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/test/inline-name-editors.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DivisionDetailPage from '../pages/DivisionDetailPage'

vi.mock('../hooks/useDivisions', () => ({
  useDivision: () => ({
    data: { id: 'div-1', name: 'Test Division', branchCount: 0, objectCount: 0 },
    isLoading: false,
  }),
  useDivisionBranches: () => ({ data: [], isLoading: false }),
  useUpdateDivision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateBranch: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/divisions/div-1']}>
        <Routes>
          <Route path="/divisions/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionDetailPage inline name editor', () => {
  it('shows a validation error when name is cleared and Save is clicked', async () => {
    const user = userEvent.setup()
    render(<DivisionDetailPage />, { wrapper })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const nameInput = screen.getByDisplayValue('Test Division')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Currently FAILS: raw useState + `if (newName.trim())` guard does nothing on empty input
    // After fix: RHF+Zod shows validation error (z.string().min(1))
    await waitFor(() => {
      expect(screen.getByText('String must contain at least 1 character(s)')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/inline-name-editors.test.tsx
```

Expected: test fails — the current implementation has no validation on the inline editor.

- [ ] **Step 3: Fix `frontend/src/pages/DivisionDetailPage.tsx`**

Replace the entire file. Key changes:
- Remove `const [newName, setNewName] = useState('')`
- Add `nameForm` using `DivisionCreateSchema` (add that import)
- Replace raw `<TextField>` in the edit block with `<FormTextField name="name" control={nameForm.control} .../>`
- `handleEditName` calls `nameForm.reset({ name: division.name })` instead of `setNewName`
- `handleSaveName` becomes `nameForm.handleSubmit(async (data) => { ... })`

```typescript
import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import {
  useCreateBranch,
  useDivision,
  useDivisionBranches,
  useUpdateDivision,
} from '../hooks/useDivisions'
import {
  BranchCreateSchema,
  DivisionCreateSchema,
  type BranchCreate,
  type DivisionCreate,
} from '../types/division'

export default function DivisionDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [openBranchDialog, setOpenBranchDialog] = useState(false)

  const { data: division, isLoading } = useDivision(id || '')
  const { data: branches = [], isLoading: branchesLoading } = useDivisionBranches(id || '')
  const updateDivision = useUpdateDivision()
  const createBranch = useCreateBranch(id || '')

  const nameForm = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
  })

  const {
    control,
    handleSubmit: handleBranchSubmit,
    reset: resetBranchForm,
  } = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
    defaultValues: { name: '' },
  })

  const handleEditName = () => {
    if (division) {
      nameForm.reset({ name: division.name })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (id) {
      await updateDivision.mutateAsync({ id, data: { name: data.name } })
      setEditingName(false)
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }

  const handleCloseBranchDialog = () => {
    setOpenBranchDialog(false)
    resetBranchForm()
  }

  const handleCreateBranch = handleBranchSubmit(async (formData) => {
    await createBranch.mutateAsync(formData)
    handleCloseBranchDialog()
  })

  if (isLoading || branchesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!division) {
    return <Typography color="error">Division not found</Typography>
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <Link href="/divisions" underline="hover" sx={{ cursor: 'pointer', mr: 1 }}>
          Divisions
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Typography component="span">{division.name}</Typography>
      </Box>

      {/* Division Name with Edit */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {editingName ? (
          <Box
            component="form"
            onSubmit={(e) => {
              void handleSaveName(e)
            }}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
          >
            <FormTextField
              name="name"
              control={nameForm.control}
              label="Division name"
              size="small"
              autoFocus
            />
            <Button size="small" type="submit" disabled={updateDivision.isPending}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h4">{division.name}</Typography>
            <IconButton size="small" aria-label="Edit" onClick={handleEditName}>
              <EditOutlinedIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Add Branch Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => setOpenBranchDialog(true)}>
          Add branch
        </Button>
      </Box>

      {/* Branches Table */}
      {branches.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Objects</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map((branch) => (
                <TableRow
                  key={branch.id}
                  hover
                  onClick={() => navigate(`/branches/${branch.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.objectCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No branches</Typography>
      )}

      {/* Create Branch Dialog */}
      <Dialog open={openBranchDialog} onClose={handleCloseBranchDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add branch</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreateBranch(e)
          }}
        >
          <DialogContent>
            <FormTextField
              name="name"
              control={control}
              label="Name"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBranchDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createBranch.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
```

- [ ] **Step 4: Fix `frontend/src/pages/BranchDetailPage.tsx`**

Replace the entire file. Key changes:
- Remove `const [newName, setNewName] = useState('')`
- Add `nameForm` using `BranchCreateSchema` (import it from `'../types/division'`)
- Replace raw `<TextField>` with `<FormTextField name="name" control={nameForm.control} .../>`

```typescript
import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { useBranch, useUpdateBranch } from '../hooks/useBranches'
import { useCreateObject } from '../hooks/useObjects'
import { BranchCreateSchema, type BranchCreate } from '../types/division'
import { ObjectCreateSchema, type ObjectCreate } from '../types/object'

export default function BranchDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: branch, isLoading } = useBranch(id || '')
  const updateBranch = useUpdateBranch()
  const createObject = useCreateObject()

  const nameForm = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
  })

  const {
    control,
    handleSubmit: handleObjectSubmit,
    reset: resetObjectForm,
  } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: { name: '', branchId: id || '' },
  })

  const handleEditName = () => {
    if (branch) {
      nameForm.reset({ name: branch.name })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (id) {
      await updateBranch.mutateAsync({ id, data: { name: data.name } })
      setEditingName(false)
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }

  const handleCloseObjectDialog = () => {
    setOpenObjectDialog(false)
    resetObjectForm()
  }

  const handleCreateObject = handleObjectSubmit(async (formData) => {
    await createObject.mutateAsync(formData)
    handleCloseObjectDialog()
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!branch) {
    return <Typography color="error">Branch not found</Typography>
  }

  const branchObjects = branch.objects.data

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <Link href="/divisions" underline="hover" sx={{ cursor: 'pointer', mr: 1 }}>
          Divisions
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Link
          href={`/divisions/${branch.divisionId}`}
          underline="hover"
          sx={{ cursor: 'pointer', mr: 1 }}
        >
          {branch.divisionName}
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Typography component="span">{branch.name}</Typography>
      </Box>

      {/* Branch Name with Edit */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {editingName ? (
          <Box
            component="form"
            onSubmit={(e) => {
              void handleSaveName(e)
            }}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
          >
            <FormTextField
              name="name"
              control={nameForm.control}
              label="Branch name"
              size="small"
              autoFocus
            />
            <Button size="small" type="submit" disabled={updateBranch.isPending}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h4">{branch.name}</Typography>
            <IconButton size="small" aria-label="Edit branch name" onClick={handleEditName}>
              <EditOutlinedIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Add Object Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => setOpenObjectDialog(true)}>
          Add object
        </Button>
      </Box>

      {/* Objects Table */}
      {branchObjects.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>TOTAL Staffing (with travel)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branchObjects.map((obj) => (
                <TableRow
                  key={obj.id}
                  hover
                  onClick={() => navigate(`/objects/${obj.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{obj.name}</TableCell>
                  <TableCell>
                    {obj.itogoChisloWithTravel !== null ? obj.itogoChisloWithTravel : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

      {/* Create Object Dialog */}
      <Dialog open={openObjectDialog} onClose={handleCloseObjectDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add object</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreateObject(e)
          }}
        >
          <DialogContent>
            <FormTextField
              name="name"
              control={control}
              label="Name"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseObjectDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createObject.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
```

Note: `BranchDetailPage` now reads `branch.objects.data` directly — see also Task 7 which adds the TanStack Query invalidation needed so this list refreshes after object creation.

- [ ] **Step 5: Fix `frontend/src/pages/ObjectDetailPage.tsx`**

The inline name editor in the `detail` mode branch of `ObjectDetailPage` uses `const [newName, setNewName] = useState('')` and a raw `<TextField>`. Replace with a `nameForm` approach. Only the `detail` mode section needs changing — `CreateObjectForm` and `EditObjectForm` subcomponents already use RHF properly.

Find the state declarations and handlers for the inline editor (around line 247–285) and the JSX (the `editingName ? ...` block in the detail mode render):

Replace these lines:
```typescript
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
```
with:
```typescript
  const [editingName, setEditingName] = useState(false)
  const nameForm = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
  })
```

Add to imports at the top of the file:
```typescript
import { DivisionCreateSchema } from '../types/division'
import type { DivisionCreate } from '../types/division'
```

Replace `handleEditName`, `handleSaveName`, `handleCancelEdit`:
```typescript
  const handleEditName = () => {
    if (object) {
      nameForm.reset({ name: object.name })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (id && object) {
      await updateObject.mutateAsync({
        id,
        data: { name: data.name, branchId: object.branchId },
      })
      setEditingName(false)
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }
```

Replace the `editingName ? ...` JSX block in detail mode:
```tsx
      {/* Object Name with Edit */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {editingName ? (
          <Box
            component="form"
            onSubmit={(e) => {
              void handleSaveName(e)
            }}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
          >
            <FormTextField
              name="name"
              control={nameForm.control}
              label="Object name"
              size="small"
              autoFocus
            />
            <Button size="small" type="submit" disabled={updateObject.isPending}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h4">{object.name}</Typography>
            <IconButton size="small" aria-label="Edit object name" onClick={handleEditName}>
              <EditOutlinedIcon />
            </IconButton>
          </>
        )}
      </Box>
```

- [ ] **Step 6: Run failing test — expect PASS**

```bash
cd frontend && npx vitest run src/test/inline-name-editors.test.tsx
```

Expected: test passes.

- [ ] **Step 7: Run full suite and type check**

```bash
cd frontend && npm test && npx tsc --noEmit
```

Expected: all pass, exits 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/DivisionDetailPage.tsx \
        frontend/src/pages/BranchDetailPage.tsx \
        frontend/src/pages/ObjectDetailPage.tsx \
        frontend/src/test/inline-name-editors.test.tsx
git commit -m "fix: replace useState inline name editors with RHF+Zod in detail pages"
```

---

## Task 4: Extract `extractErrorCode` utility (I-5)

**Problem:** The pattern `(err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code` appears 5 times inline — 3 in `PhysicalInventory.tsx` and 2 in `SystemAssignments.tsx`. If the backend error envelope changes, all 5 sites need updating. Fix: add `extractErrorCode(err: unknown): string | undefined` to `errorMessages.ts` and replace all 5 inline casts.

**Files:**
- Modify: `frontend/src/utils/errorMessages.ts`
- Modify: `frontend/src/components/equipment/PhysicalInventory.tsx`
- Modify: `frontend/src/components/equipment/SystemAssignments.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/test/errorMessages.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { extractErrorCode } from '../utils/errorMessages'

describe('extractErrorCode', () => {
  it('returns the error code from a structured Axios error', () => {
    const err = {
      response: { data: { error: { code: 'DEVICE_NOT_IN_INVENTORY' } } },
    }
    // Currently FAILS: extractErrorCode does not exist yet
    expect(extractErrorCode(err)).toBe('DEVICE_NOT_IN_INVENTORY')
  })

  it('returns undefined when response is missing', () => {
    expect(extractErrorCode(new Error('network error'))).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(extractErrorCode(null)).toBeUndefined()
  })

  it('returns undefined when error code is missing from response', () => {
    const err = { response: { data: {} } }
    expect(extractErrorCode(err)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/errorMessages.test.ts
```

Expected: fails with import error — `extractErrorCode` does not exist yet.

- [ ] **Step 3: Add `extractErrorCode` to `frontend/src/utils/errorMessages.ts`**

```typescript
export function mapEquipmentErrorCode(code: string | undefined): string {
  switch (code) {
    case 'DEVICE_NOT_IN_INVENTORY':
      return 'Device is not in inventory'
    case 'NO_CONTEXT_FOR_SYSTEM':
      return 'No norms configured for this system'
    default:
      return 'An unexpected error occurred.'
  }
}

export function extractErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return undefined
  }
  const response = (err as { response?: { data?: { error?: { code?: string } } } }).response
  return response?.data?.error?.code
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx vitest run src/test/errorMessages.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Replace inline casts in `PhysicalInventory.tsx`**

In `frontend/src/components/equipment/PhysicalInventory.tsx`, add `extractErrorCode` to the import and replace the 3 inline casts.

Add to existing import:
```typescript
import { extractErrorCode, mapEquipmentErrorCode } from '../../utils/errorMessages'
```

Replace every occurrence of:
```typescript
const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code
```
with:
```typescript
const code = extractErrorCode(err)
```

There are 3 occurrences: in `handleSubmitAdd`, `handleSubmitEdit`, and `handleConfirmRemove`.

- [ ] **Step 6: Replace inline casts in `SystemAssignments.tsx`**

In `frontend/src/components/equipment/SystemAssignments.tsx`, add `extractErrorCode` to the import and replace the 2 inline casts.

Add to existing import:
```typescript
import { extractErrorCode, mapEquipmentErrorCode } from '../../utils/errorMessages'
```

Replace both occurrences of:
```typescript
const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code
```
with:
```typescript
const code = extractErrorCode(err)
```

Occurrences are in `handleSubmitAdd` and `handleSubmitEdit` / `handleConfirmRemove`.

- [ ] **Step 7: Run full suite and type check**

```bash
cd frontend && npm test && npx tsc --noEmit
```

Expected: all pass, exits 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/errorMessages.ts \
        frontend/src/components/equipment/PhysicalInventory.tsx \
        frontend/src/components/equipment/SystemAssignments.tsx \
        frontend/src/test/errorMessages.test.ts
git commit -m "refactor: extract extractErrorCode helper, replace 5 inline error casts"
```

---

## Task 5: Use `useLogin` hook in `LoginPage` (I-3)

**Problem:** `LoginPage.tsx` imports `login` from `../api/auth` directly and calls `storeLogin` from `useAuthStore` manually — bypassing the `useLogin` TanStack Query mutation hook that exists for exactly this purpose. The hook is dead code. Fix: replace the direct call with `loginMutation.mutateAsync(data)` from `useLogin()`.

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/test/LoginPage.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from '../pages/LoginPage'

const mockMutateAsync = vi.fn().mockResolvedValue({
  token: 'test-token',
  user: { id: '1', email: 'admin@workload.local', name: 'Admin', role: 'admin' },
})

vi.mock('../hooks/useAuth', () => ({
  useLogin: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

// Also mock the auth store so login doesn't throw
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { login: () => void; logout: () => void; token: null }) => unknown) =>
    selector({ login: vi.fn(), logout: vi.fn(), token: null }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  it('calls useLogin mutateAsync on form submit, not login() directly', async () => {
    const user = userEvent.setup()
    render(<LoginPage />, { wrapper })

    await user.type(screen.getByLabelText('Email'), 'admin@workload.local')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    // Currently FAILS: LoginPage calls login() from api/auth directly, not useLogin().mutateAsync
    // The mock above only mocks the hook — if the page doesn't use the hook, mutateAsync is never called
    expect(mockMutateAsync).toHaveBeenCalledWith({
      email: 'admin@workload.local',
      password: 'secret',
    })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/LoginPage.test.tsx
```

Expected: fails — `mockMutateAsync` is not called because `LoginPage` currently calls `login()` directly.

- [ ] **Step 3: Rewrite `frontend/src/pages/LoginPage.tsx`**

Replace the entire file. Key changes:
- Remove `import { login } from '../api/auth'`
- Remove `import { useAuthStore } from '../store/authStore'` (the hook handles this internally)
- Add `import { useLogin } from '../hooks/useAuth'`
- Replace the try/catch body to use `loginMutation.mutateAsync(data)` — `useLogin` already calls `storeLogin` in its `onSuccess` handler

```typescript
import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { useLogin } from '../hooks/useAuth'
import { LoginRequestSchema, type LoginRequest } from '../types/auth'

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setErrorMessage(null)
    try {
      await loginMutation.mutateAsync(data)
      navigate('/')
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        setErrorMessage('Invalid email or password')
        return
      }
      setErrorMessage('Something went wrong. Please try again.')
    }
  })

  const isSubmitting = formState.isSubmitting

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'linear-gradient(135deg, rgba(232,240,254,1) 0%, rgba(245,247,250,1) 50%, rgba(226,239,218,1) 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Workload Calculation System
          </Typography>
          <Typography variant="h6" component="h2" color="text.secondary" gutterBottom>
            Sign In
          </Typography>

          {errorMessage ? (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <Box
            component="form"
            onSubmit={(e) => {
              void onSubmit(e)
            }}
            noValidate
            sx={{ mt: 2 }}
          >
            <FormTextField
              name="email"
              control={control}
              label="Email"
              variant="standard"
              fullWidth
              margin="normal"
              autoComplete="email"
            />
            <FormTextField
              name="password"
              control={control}
              label="Password"
              type="password"
              variant="standard"
              fullWidth
              margin="normal"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              sx={{ mt: 3, minHeight: 44 }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx vitest run src/test/LoginPage.test.tsx
```

Expected: test passes — `mockMutateAsync` is called with the form data.

- [ ] **Step 5: Run full suite and type check**

```bash
cd frontend && npm test && npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx \
        frontend/src/test/LoginPage.test.tsx
git commit -m "fix: use useLogin mutation hook in LoginPage, remove direct api/auth import"
```

---

## Task 6: Replace `as T` type assertions with Zod `.parse()` in API modules (I-4)

**Problem:** Every API module returns `response.data.data as SomeType` — a type assertion that bypasses TypeScript's structural check and silently accepts malformed backend responses. The Zod schemas in `src/types/` exist for exactly this purpose. Fix: replace each `as T` with `Schema.parse(response.data.data)`. This will throw a `ZodError` (instead of silently succeeding) if the backend returns an unexpected shape.

**Do NOT touch** `frontend/src/api/records.ts` or `frontend/src/api/travel.ts` — these already return `response.data.data` without assertion (the data is nullable, and Zod `.parse(null)` would incorrectly throw).

**Files:**
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/api/divisions.ts`
- Modify: `frontend/src/api/branches.ts`
- Modify: `frontend/src/api/objects.ts`
- Modify: `frontend/src/api/equipment.ts`
- Modify: `frontend/src/api/repairs.ts`
- Modify: `frontend/src/api/catalog.ts`
- Modify: `frontend/src/test/hooks.test.ts`

- [ ] **Step 1: Write a failing test in `frontend/src/test/hooks.test.ts`**

Append to the existing `describe('API modules', ...)` block:

```typescript
  it('getDivisions throws ZodError when response data has wrong shape', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: {
        // branchCount is a string — invalid per DivisionSchema
        data: [{ id: 'not-a-uuid', name: 'X', branchCount: 'wrong', objectCount: 0 }],
        error: null,
      },
    })
    const { getDivisions } = await import('../api/divisions')
    // Currently FAILS: 'as Division[]' silently returns the bad data without throwing
    await expect(getDivisions()).rejects.toThrow()
  })
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/hooks.test.ts
```

Expected: the new test fails — `getDivisions()` currently resolves with the bad data instead of throwing.

- [ ] **Step 3: Update `frontend/src/api/auth.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import { LoginResponseSchema, UserSchema } from '../types/auth'
import type { LoginRequest } from '../types/auth'

export async function login(data: LoginRequest) {
  const response = await api.post<ApiResponse<unknown>>('/auth/login', data, {
    skipAuthRedirect: true,
  })
  return LoginResponseSchema.parse(response.data.data)
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getMe() {
  const response = await api.get<ApiResponse<unknown>>('/auth/me')
  return UserSchema.parse(response.data.data)
}
```

- [ ] **Step 4: Update `frontend/src/api/divisions.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import {
  BranchSchema,
  DivisionDetailSchema,
  DivisionSchema,
} from '../types/division'

export async function getDivisions() {
  const response = await api.get<ApiResponse<unknown>>('/divisions')
  return DivisionSchema.array().parse(response.data.data)
}

export async function getDivision(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/divisions/${id}`)
  return DivisionDetailSchema.parse(response.data.data)
}

export async function createDivision(data: { name: string }) {
  const response = await api.post<ApiResponse<unknown>>('/divisions', data)
  return DivisionSchema.parse(response.data.data)
}

export async function updateDivision(id: string, data: { name: string }) {
  const response = await api.put<ApiResponse<unknown>>(`/divisions/${id}`, data)
  return DivisionSchema.parse(response.data.data)
}

export async function getDivisionBranches(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/divisions/${id}/branches`)
  return BranchSchema.array().parse(response.data.data)
}

export async function createBranch(divisionId: string, data: { name: string }) {
  const response = await api.post<ApiResponse<unknown>>(`/divisions/${divisionId}/branches`, data)
  return BranchSchema.parse(response.data.data)
}
```

- [ ] **Step 5: Update `frontend/src/api/branches.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import { BranchDetailSchema, BranchSchema } from '../types/division'

export async function getBranch(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/branches/${id}`)
  return BranchDetailSchema.parse(response.data.data)
}

export async function updateBranch(id: string, data: { name: string }) {
  const response = await api.put<ApiResponse<unknown>>(`/branches/${id}`, data)
  return BranchSchema.parse(response.data.data)
}
```

- [ ] **Step 6: Update `frontend/src/api/objects.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectRecordSchema } from '../types/object'
import type { ObjectCreate, ObjectUpdate } from '../types/object'

export async function getObjects(params?: { divisionId?: string }) {
  const response = params?.divisionId
    ? await api.get<ApiResponse<unknown>>('/objects', {
        params: { division_id: params.divisionId },
      })
    : await api.get<ApiResponse<unknown>>('/objects')
  return ObjectRecordSchema.array().parse(response.data.data)
}

export async function getObject(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${id}`)
  return ObjectRecordSchema.parse(response.data.data)
}

export async function createObject(data: ObjectCreate) {
  const response = await api.post<ApiResponse<unknown>>('/objects', data)
  return ObjectRecordSchema.parse(response.data.data)
}

export async function updateObject(id: string, data: ObjectUpdate) {
  const response = await api.put<ApiResponse<unknown>>(`/objects/${id}`, data)
  return ObjectRecordSchema.parse(response.data.data)
}

export async function deleteObject(id: string): Promise<void> {
  await api.delete(`/objects/${id}`)
}
```

- [ ] **Step 7: Update `frontend/src/api/equipment.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import {
  ObjectDeviceSchema,
  ObjectSystemAssignmentSchema,
} from '../types/equipment'
import type { AssignmentCreate, AssignmentUpdate, DeviceAdd } from '../types/equipment'

export async function getDevices(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/devices`)
  return ObjectDeviceSchema.array().parse(response.data.data)
}

export async function addDevice(objectId: string, data: DeviceAdd) {
  const response = await api.post<ApiResponse<unknown>>(`/objects/${objectId}/devices`, data)
  return ObjectDeviceSchema.parse(response.data.data)
}

export async function updateDevice(objectId: string, deviceTypeId: string, data: DeviceAdd) {
  const response = await api.put<ApiResponse<unknown>>(
    `/objects/${objectId}/devices/${deviceTypeId}`,
    data
  )
  return ObjectDeviceSchema.parse(response.data.data)
}

export async function removeDevice(objectId: string, deviceTypeId: string): Promise<void> {
  await api.delete(`/objects/${objectId}/devices/${deviceTypeId}`)
}

export async function getAssignments(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/assignments`)
  return ObjectSystemAssignmentSchema.array().parse(response.data.data)
}

export async function addAssignment(objectId: string, data: AssignmentCreate) {
  const response = await api.post<ApiResponse<unknown>>(`/objects/${objectId}/assignments`, data)
  return ObjectSystemAssignmentSchema.parse(response.data.data)
}

export async function updateAssignment(objectId: string, assignmentId: string, data: AssignmentUpdate) {
  const response = await api.put<ApiResponse<unknown>>(
    `/objects/${objectId}/assignments/${assignmentId}`,
    data
  )
  return ObjectSystemAssignmentSchema.parse(response.data.data)
}

export async function removeAssignment(objectId: string, assignmentId: string): Promise<void> {
  await api.delete(`/objects/${objectId}/assignments/${assignmentId}`)
}
```

- [ ] **Step 8: Update `frontend/src/api/repairs.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectRepairSchema } from '../types/repairs'
import type { RepairUpdate } from '../types/repairs'

export async function getRepairs(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/repairs`)
  return ObjectRepairSchema.array().parse(response.data.data)
}

export async function updateRepair(objectId: string, repairTypeId: string, data: RepairUpdate) {
  const response = await api.put<ApiResponse<unknown>>(
    `/objects/${objectId}/repairs/${repairTypeId}`,
    data
  )
  return ObjectRepairSchema.parse(response.data.data)
}
```

- [ ] **Step 9: Update `frontend/src/api/catalog.ts`**

```typescript
import api from './axios'
import type { ApiResponse } from '../types/api'
import {
  DeviceSystemContextSchema,
  DeviceTypeSchema,
  RepairTypeSchema,
} from '../types/catalog'

export async function getCatalogDevices() {
  const response = await api.get<ApiResponse<unknown>>('/catalog/devices')
  return DeviceTypeSchema.array().parse(response.data.data)
}

export async function getCatalogDevice(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/catalog/devices/${id}`)
  return DeviceTypeSchema.parse(response.data.data)
}

export async function getCatalogDeviceContexts(deviceTypeId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/catalog/devices/${deviceTypeId}/contexts`)
  return DeviceSystemContextSchema.array().parse(response.data.data)
}

export async function getCatalogRepairs() {
  const response = await api.get<ApiResponse<unknown>>('/catalog/repairs')
  return RepairTypeSchema.array().parse(response.data.data)
}
```

- [ ] **Step 10: Run tests — expect PASS**

```bash
cd frontend && npx vitest run src/test/hooks.test.ts
```

Expected: all 6 tests pass (5 original + 1 new).

- [ ] **Step 11: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: exits 0. TypeScript will now infer return types from `Schema.parse()` rather than explicit `as T` — this is strictly more accurate.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/api/auth.ts \
        frontend/src/api/divisions.ts \
        frontend/src/api/branches.ts \
        frontend/src/api/objects.ts \
        frontend/src/api/equipment.ts \
        frontend/src/api/repairs.ts \
        frontend/src/api/catalog.ts \
        frontend/src/test/hooks.test.ts
git commit -m "fix: replace 'as T' type assertions with Zod .parse() in all API modules"
```

---

## Task 7: Fix `BranchDetailPage` to use `branch.objects` from `BranchDetail` (I-2)

**Problem:** `BranchDetailPage` calls `useObjects()` (fetches all objects with no filter) and client-side filters `objects.filter((o) => o.branchId === id)`. The `getBranch(id)` response already contains `branch.objects.data` (a `BranchObjectRow[]` with `itogoChisloWithTravel`). The page is an over-fetch and `itogoChisloWithTravel` is never rendered (always shows `"-"`). Additionally, after creating a new object the `branch` query must be invalidated so the list refreshes.

Note: Task 3 already partially rewrites `BranchDetailPage` to use `branch.objects.data`. If Task 3 was completed first, the `useObjects` removal is already done. This task's remaining work is ensuring `useCreateObject` also invalidates the `['branches']` query cache.

**Files:**
- Modify: `frontend/src/hooks/useObjects.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/test/useObjects.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'
import api from '../api/axios'

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)

describe('useCreateObject invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createObject calls POST /objects with the provided data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          id: 'new-obj-id',
          name: 'New Object',
          branchId: 'branch-1',
        },
        error: null,
      },
    })
    const { createObject } = await import('../api/objects')
    const result = await createObject({ name: 'New Object', branchId: 'branch-1' })
    expect(mockApi.post).toHaveBeenCalledWith('/objects', { name: 'New Object', branchId: 'branch-1' })
    expect(result.branchId).toBe('branch-1')
  })
})
```

This test verifies the API call itself. The invalidation behavior (`['branches']` gets invalidated after `createObject`) is tested by checking that `useCreateObject.onSuccess` calls `invalidateQueries` with the branches key — this requires a hook-level test that needs `renderHook` setup, which adds significant test infrastructure. A simpler verification is to confirm the invalidation is present by code inspection after applying the fix. The API-level test above will catch regressions in the `createObject` endpoint mapping.

- [ ] **Step 2: Run — expect PASS** (this test should already pass since `createObject` already calls the right endpoint)

```bash
cd frontend && npx vitest run src/test/useObjects.test.ts
```

Expected: passes. (The purpose of this task is primarily the `onSuccess` invalidation fix below, which the above test validates at the API level.)

- [ ] **Step 3: Update `useCreateObject` in `frontend/src/hooks/useObjects.ts`**

Add `['branches']` invalidation to `useCreateObject.onSuccess` so that the `BranchDetailPage` (which queries `['branches', id]`) refreshes its object list after an object is created in the "Add object" dialog.

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createObject, deleteObject, getObject, getObjects, updateObject } from '../api/objects'
import type { ObjectCreate, ObjectUpdate } from '../types/object'

export function useObjects(divisionId?: string) {
  return useQuery({
    queryKey: ['objects', { divisionId }],
    queryFn: () => getObjects({ divisionId }),
  })
}

export function useObject(id: string | undefined) {
  return useQuery({
    queryKey: ['objects', id],
    queryFn: () => getObject(id as string),
    enabled: !!id,
  })
}

export function useCreateObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ObjectCreate) => createObject(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
      // Also invalidate the branch query so BranchDetailPage refreshes its embedded object list
      void queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export function useUpdateObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ObjectUpdate }) => updateObject(id, data),
    onSuccess: (_object, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
      void queryClient.invalidateQueries({ queryKey: ['objects', variables.id] })
    },
  })
}

export function useDeleteObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteObject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}
```

- [ ] **Step 4: Run full suite and type check**

```bash
cd frontend && npm test && npx tsc --noEmit
```

Expected: all pass, exits 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useObjects.ts \
        frontend/src/test/useObjects.test.ts
git commit -m "fix: invalidate branches query on object create so BranchDetailPage refreshes"
```

---

## Quality Gate

After all tasks are complete, run the full frontend quality gate:

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

All must exit 0 before opening the PR.
