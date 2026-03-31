# PoC M-02 Frontend — Calculation Results UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace M-02 placeholder sections with real UI. Implement СВОД table page (19 columns, pagination, division filter, XLSX export), Dashboard with aggregation data (FTE by division, top 10 objects, coverage gaps), СВОД tab on Object Detail, and Division Detail FTE subtotals. All TanStack Query hooks, Zod schemas, and React components are fully functional.

**Branch:** `feature/poc-m02-frontend`
**Depends on:** `feature/poc-m02-backend` merged to `feature/implementation`
**Epic:** `docs/impl/epics/poc-m02-calculation.md` (UI Screens section)

**Architecture:** All СВОД data comes from backend API — the frontend NEVER computes workload values (AD-07). All API calls use the shared Axios instance at `src/api/axios.ts`. All server state is managed by TanStack Query — never in Zustand or component state. No `any` types.

**Acceptance Criteria Covered:**
- **PAC-04:** Editing any equipment quantity and saving immediately updates the СВОД tab values without page refresh (via TanStack Query `invalidateQueries`)
- **PAC-05:** СВОД table loads first 100 rows in under 3 seconds (loading spinner while fetching)
- **PAC-08:** Division dashboard FTE total = SUM of `itogo_chislo_with_travel` for all objects in that division (from API, not computed in frontend)

**PoC Simplifications active:**
- **S-02:** No stale indicators — summaries recalculate synchronously on save. No "Данные устарели" banners.
- **S-05:** No period selector on СВОД page — shows only the current PoC dataset.
- **S-08:** No PDF export — XLSX only.

---

## Task 0: Create feature branch

- [ ] **Step 1: Create and switch to the feature branch**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/poc-m02-frontend
```

---

## Task 1: M-02 TypeScript types and Zod schemas

**Files:**
- Modify: `frontend/src/types/api.ts` — add M-02 domain types

All types are strict — no `any`. Numeric fields that represent BigDecimal on the backend are `number` in TypeScript (JSON serialization converts them).

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/m02-types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  SvodRowSchema,
  ObjectSummarySchema,
  AggregationDivisionSchema,
  AggregationCompanySchema,
  CoverageGapSchema,
} from '../types/m02'

describe('M-02 Zod schemas', () => {
  it('SvodRowSchema parses a valid SVOD row', () => {
    const raw = {
      object_id: '550e8400-e29b-41d4-a716-446655440000',
      object_name: 'Архив г.Брест',
      address: 'ул.Московская, 202Д',
      division_name: 'Брестское',
      branch_name: 'Филиал 1',
      import_seq_no: 1,
      engineers: ['Иванов П.С.'],
      os_monthly_avg: 0.123456,
      ps_monthly_avg: 0.0,
      video_monthly_avg: 0.0,
      records_monthly: 0.05,
      repair_no_travel_monthly: 0.01,
      repair_with_travel_monthly: 0.02,
      round_trip_min: 40.0,
      pzv_minutes: 20.0,
      total_no_travel_min: 1.5,
      itogo_chislo_no_travel: 0.03,
      total_with_travel_min: 2.0,
      itogo_chislo_with_travel: 0.032327,
      r1_per_visit_total: 0.5,
      r2_per_visit_total: 0.3,
      computed_at: '2026-03-30T12:00:00Z',
    }
    const result = SvodRowSchema.parse(raw)
    expect(result.itogo_chislo_with_travel).toBeCloseTo(0.032327, 6)
    expect(result.engineers).toHaveLength(1)
  })

  it('ObjectSummarySchema parses all 19 summary fields', () => {
    const raw = {
      object_id: '550e8400-e29b-41d4-a716-446655440000',
      os_r1_per_visit: 0.1,
      os_r2_per_visit: 0.2,
      ps_r1_per_visit: 0.0,
      ps_r2_per_visit: 0.0,
      video_r1_per_visit: 0.0,
      video_r2_per_visit: 0.0,
      r1_per_visit_total: 0.1,
      r2_per_visit_total: 0.2,
      os_monthly_avg: 0.5,
      ps_monthly_avg: 0.0,
      video_monthly_avg: 0.0,
      records_monthly: 0.03,
      repair_no_travel_monthly: 0.01,
      repair_with_travel_monthly: 0.02,
      round_trip_min: 40.0,
      pzv_minutes: 20.0,
      total_no_travel_min: 1.0,
      itogo_chislo_no_travel: 0.02,
      total_with_travel_min: 2.0,
      itogo_chislo_with_travel: 0.03,
      computed_at: '2026-03-30T12:00:00Z',
    }
    const result = ObjectSummarySchema.parse(raw)
    expect(result.os_monthly_avg).toBe(0.5)
  })

  it('AggregationCompanySchema parses company-wide totals', () => {
    const raw = {
      total_fte: 45.123,
      total_objects: 2935,
      division_count: 7,
    }
    expect(AggregationCompanySchema.parse(raw).total_fte).toBeCloseTo(45.123)
  })

  it('AggregationDivisionSchema parses a division summary', () => {
    const raw = {
      division_id: '550e8400-e29b-41d4-a716-446655440000',
      division_name: 'Брестское',
      total_fte: 12.5,
      object_count: 245,
      gap_count: 12,
    }
    const result = AggregationDivisionSchema.parse(raw)
    expect(result.gap_count).toBe(12)
  })

  it('CoverageGapSchema parses an uncovered object', () => {
    const raw = {
      object_id: '550e8400-e29b-41d4-a716-446655440000',
      object_name: 'Инфокиоск',
      division_name: 'Брестское',
      branch_name: 'Филиал 1',
      itogo_chislo_with_travel: 0.008,
    }
    const result = CoverageGapSchema.parse(raw)
    expect(result.itogo_chislo_with_travel).toBeCloseTo(0.008)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```bash
cd frontend && npx vitest run src/test/m02-types.test.ts
```

Expected: import error — `../types/m02` does not exist.

- [ ] **Step 3: Create the M-02 types and Zod schemas**

Create `frontend/src/types/m02.ts`:

```typescript
import { z } from 'zod'

// --- СВОД row (matches GET /svod response, ui-spec.md §7.9 — all 19 columns) ---

export const SvodRowSchema = z.object({
  object_id: z.string().uuid(),
  object_name: z.string(),
  address: z.string().optional(),
  division_name: z.string(),
  branch_name: z.string(),
  import_seq_no: z.number().nullable().optional(),
  engineers: z.array(z.string()),           // column 5: comma-joined in UI
  os_monthly_avg: z.number(),               // column 10: Охрана
  ps_monthly_avg: z.number(),               // column 8: Пожарная сигнализация
  video_monthly_avg: z.number(),            // column 9: Видео
  records_monthly: z.number(),              // column 11: Записи
  repair_no_travel_monthly: z.number(),     // column 12: Ремонт без дороги
  repair_with_travel_monthly: z.number(),   // column 15: Ремонт с дорогой
  round_trip_min: z.number(),               // column 7: Дорога
  pzv_minutes: z.number(),                  // column 6: ПЗВ
  total_no_travel_min: z.number(),          // column 13
  itogo_chislo_no_travel: z.number(),       // column 14: ИТОГО Числ (без дороги)
  total_with_travel_min: z.number(),        // column 16
  itogo_chislo_with_travel: z.number(),     // column 17: ИТОГО Числ (с дорогой)
  r1_per_visit_total: z.number(),           // column 18
  r2_per_visit_total: z.number(),           // column 19
  computed_at: z.string().nullable(),
})
export type SvodRow = z.infer<typeof SvodRowSchema>

// --- Paginated СВОД response ---

export const SvodPageSchema = z.object({
  content: z.array(SvodRowSchema),
  total_elements: z.number(),
  total_pages: z.number(),
  page: z.number(),
  size: z.number(),
})
export type SvodPage = z.infer<typeof SvodPageSchema>

// --- Object summary (GET /objects/:id/summary) ---

export const ObjectSummarySchema = z.object({
  object_id: z.string().uuid(),
  os_r1_per_visit: z.number(),
  os_r2_per_visit: z.number(),
  ps_r1_per_visit: z.number(),
  ps_r2_per_visit: z.number(),
  video_r1_per_visit: z.number(),
  video_r2_per_visit: z.number(),
  r1_per_visit_total: z.number(),
  r2_per_visit_total: z.number(),
  os_monthly_avg: z.number(),
  ps_monthly_avg: z.number(),
  video_monthly_avg: z.number(),
  records_monthly: z.number(),
  repair_no_travel_monthly: z.number(),
  repair_with_travel_monthly: z.number(),
  round_trip_min: z.number(),
  pzv_minutes: z.number(),
  total_no_travel_min: z.number(),
  itogo_chislo_no_travel: z.number(),
  total_with_travel_min: z.number(),
  itogo_chislo_with_travel: z.number(),
  computed_at: z.string().nullable(),
})
export type ObjectSummary = z.infer<typeof ObjectSummarySchema>

// --- Aggregation: company level ---

export const AggregationCompanySchema = z.object({
  total_fte: z.number(),
  total_objects: z.number(),
  division_count: z.number(),
})
export type AggregationCompany = z.infer<typeof AggregationCompanySchema>

// --- Aggregation: division level ---

export const AggregationDivisionSchema = z.object({
  division_id: z.string().uuid(),
  division_name: z.string(),
  total_fte: z.number(),
  object_count: z.number(),
  gap_count: z.number(),
})
export type AggregationDivision = z.infer<typeof AggregationDivisionSchema>

// --- Aggregation: branch level ---

export const AggregationBranchSchema = z.object({
  branch_id: z.string().uuid(),
  branch_name: z.string(),
  division_name: z.string(),
  total_fte: z.number(),
  object_count: z.number(),
})
export type AggregationBranch = z.infer<typeof AggregationBranchSchema>

// --- Coverage gap — objects with no assigned engineer ---

export const CoverageGapSchema = z.object({
  object_id: z.string().uuid(),
  object_name: z.string(),
  division_name: z.string(),
  branch_name: z.string(),
  itogo_chislo_with_travel: z.number(),
})
export type CoverageGap = z.infer<typeof CoverageGapSchema>
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/m02-types.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/m02.ts src/test/m02-types.test.ts
git commit -m "feat: add M-02 TypeScript types and Zod schemas for SVOD, summaries, aggregations"
```

---

## Task 2: API modules and TanStack Query hooks

**Files:**
- Create: `frontend/src/api/svod.ts`
- Create: `frontend/src/api/aggregations.ts`
- Create: `frontend/src/api/summaries.ts`
- Create: `frontend/src/hooks/useSvod.ts`
- Create: `frontend/src/hooks/useAggregations.ts`
- Create: `frontend/src/hooks/useSummary.ts`

All HTTP calls go through the Axios instance at `src/api/axios.ts`. All server state is managed by TanStack Query. Mutations invalidate relevant query keys so the UI stays in sync (PAC-04).

- [ ] **Step 1: Write the failing test for API modules**

Create `frontend/src/test/m02-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../api/axios'
import { getSvod, exportSvodXlsx } from '../api/svod'
import { getCompanyAggregation, getDivisionsAggregation, getDivisionAggregation, getBranchesAggregation, getBranchAggregation, getCoverageGaps } from '../api/aggregations'
import { getObjectSummary } from '../api/summaries'

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockGet = vi.mocked(api.get)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('svod API', () => {
  it('getSvod calls GET /svod with page and division_id params', async () => {
    const mockData = { data: { data: { content: [], total_elements: 0, total_pages: 0, page: 0, size: 100 } } }
    mockGet.mockResolvedValueOnce(mockData)

    await getSvod({ page: 0, size: 100, divisionId: 'abc-123' })
    expect(mockGet).toHaveBeenCalledWith('/svod', {
      params: { page: 0, size: 100, division_id: 'abc-123' },
    })
  })

  it('getSvod omits division_id when not provided', async () => {
    const mockData = { data: { data: { content: [], total_elements: 0, total_pages: 0, page: 0, size: 100 } } }
    mockGet.mockResolvedValueOnce(mockData)

    await getSvod({ page: 0, size: 100 })
    expect(mockGet).toHaveBeenCalledWith('/svod', {
      params: { page: 0, size: 100 },
    })
  })

  it('exportSvodXlsx calls GET /svod/export/xlsx with blob responseType', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    mockGet.mockResolvedValueOnce({ data: mockBlob })

    await exportSvodXlsx()
    expect(mockGet).toHaveBeenCalledWith('/svod/export/xlsx', {
      responseType: 'blob',
    })
  })
})

describe('aggregations API', () => {
  it('getCompanyAggregation calls GET /aggregations/company', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: { total_fte: 45.0, total_objects: 100, division_count: 7 } } })

    await getCompanyAggregation()
    expect(mockGet).toHaveBeenCalledWith('/aggregations/company')
  })

  it('getDivisionsAggregation calls GET /aggregations/divisions', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } })

    await getDivisionsAggregation()
    expect(mockGet).toHaveBeenCalledWith('/aggregations/divisions')
  })

  it('getDivisionAggregation calls GET /aggregations/divisions/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: {} } })

    await getDivisionAggregation('div-123')
    expect(mockGet).toHaveBeenCalledWith('/aggregations/divisions/div-123')
  })

  it('getBranchesAggregation calls GET /aggregations/branches', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } })

    await getBranchesAggregation()
    expect(mockGet).toHaveBeenCalledWith('/aggregations/branches')
  })

  it('getBranchAggregation calls GET /aggregations/branches/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: {} } })

    await getBranchAggregation('br-123')
    expect(mockGet).toHaveBeenCalledWith('/aggregations/branches/br-123')
  })

  it('getCoverageGaps calls GET /coverage/gaps with optional division_id', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } })

    await getCoverageGaps('div-123')
    expect(mockGet).toHaveBeenCalledWith('/coverage/gaps', {
      params: { division_id: 'div-123' },
    })
  })

  it('getCoverageGaps omits division_id when not provided', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } })

    await getCoverageGaps()
    expect(mockGet).toHaveBeenCalledWith('/coverage/gaps', { params: {} })
  })
})

describe('summaries API', () => {
  it('getObjectSummary calls GET /objects/:id/summary', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: {} } })

    await getObjectSummary('obj-123')
    expect(mockGet).toHaveBeenCalledWith('/objects/obj-123/summary')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (modules not found)**

```bash
npx vitest run src/test/m02-api.test.ts
```

Expected: import errors — API modules don't exist yet.

- [ ] **Step 3: Create API modules**

Create `frontend/src/api/svod.ts`:

```typescript
import api from './axios'
import type { SvodPage } from '../types/m02'

interface SvodParams {
  page: number
  size: number
  divisionId?: string
}

export async function getSvod({ page, size, divisionId }: SvodParams): Promise<SvodPage> {
  const params: Record<string, unknown> = { page, size }
  if (divisionId) {
    params.division_id = divisionId
  }
  const response = await api.get('/svod', { params })
  return response.data.data as SvodPage
}

export async function exportSvodXlsx(): Promise<Blob> {
  const response = await api.get('/svod/export/xlsx', {
    responseType: 'blob',
  })
  return response.data as Blob
}
```

Create `frontend/src/api/aggregations.ts`:

```typescript
import api from './axios'
import type { AggregationCompany, AggregationDivision, AggregationBranch, CoverageGap } from '../types/m02'

export async function getCompanyAggregation(): Promise<AggregationCompany> {
  const response = await api.get('/aggregations/company')
  return response.data.data as AggregationCompany
}

export async function getDivisionsAggregation(): Promise<AggregationDivision[]> {
  const response = await api.get('/aggregations/divisions')
  return response.data.data as AggregationDivision[]
}

export async function getDivisionAggregation(id: string): Promise<AggregationDivision> {
  const response = await api.get(`/aggregations/divisions/${id}`)
  return response.data.data as AggregationDivision
}

export async function getBranchesAggregation(): Promise<AggregationBranch[]> {
  const response = await api.get('/aggregations/branches')
  return response.data.data as AggregationBranch[]
}

export async function getBranchAggregation(id: string): Promise<AggregationBranch> {
  const response = await api.get(`/aggregations/branches/${id}`)
  return response.data.data as AggregationBranch
}

export async function getCoverageGaps(divisionId?: string): Promise<CoverageGap[]> {
  const params: Record<string, string> = {}
  if (divisionId) {
    params.division_id = divisionId
  }
  const response = await api.get('/coverage/gaps', { params })
  return response.data.data as CoverageGap[]
}
```

Create `frontend/src/api/summaries.ts`:

```typescript
import api from './axios'
import type { ObjectSummary } from '../types/m02'

export async function getObjectSummary(objectId: string): Promise<ObjectSummary> {
  const response = await api.get(`/objects/${objectId}/summary`)
  return response.data.data as ObjectSummary
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/m02-api.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Create TanStack Query hooks**

Create `frontend/src/hooks/useSvod.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { getSvod } from '../api/svod'

export const SVOD_QUERY_KEY = 'svod'

export function useSvod(page: number, size: number, divisionId?: string) {
  return useQuery({
    queryKey: [SVOD_QUERY_KEY, page, size, divisionId],
    queryFn: () => getSvod({ page, size, divisionId }),
  })
}
```

Create `frontend/src/hooks/useAggregations.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import {
  getCompanyAggregation,
  getDivisionsAggregation,
  getDivisionAggregation,
  getBranchesAggregation,
  getBranchAggregation,
  getCoverageGaps,
} from '../api/aggregations'

export function useCompanyAggregation() {
  return useQuery({
    queryKey: ['aggregation', 'company'],
    queryFn: getCompanyAggregation,
  })
}

export function useDivisionsAggregation() {
  return useQuery({
    queryKey: ['aggregation', 'divisions'],
    queryFn: getDivisionsAggregation,
  })
}

export function useDivisionAggregation(id: string) {
  return useQuery({
    queryKey: ['aggregation', 'divisions', id],
    queryFn: () => getDivisionAggregation(id),
    enabled: !!id,
  })
}

export function useBranchesAggregation() {
  return useQuery({
    queryKey: ['aggregation', 'branches'],
    queryFn: getBranchesAggregation,
  })
}

export function useBranchAggregation(id: string) {
  return useQuery({
    queryKey: ['aggregation', 'branches', id],
    queryFn: () => getBranchAggregation(id),
    enabled: !!id,
  })
}

export function useCoverageGaps(divisionId?: string) {
  return useQuery({
    queryKey: ['coverage', 'gaps', divisionId],
    queryFn: () => getCoverageGaps(divisionId),
  })
}
```

Create `frontend/src/hooks/useSummary.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { getObjectSummary } from '../api/summaries'

export const SUMMARY_QUERY_KEY = 'object-summary'

export function useObjectSummary(objectId: string) {
  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, objectId],
    queryFn: () => getObjectSummary(objectId),
    enabled: !!objectId,
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/api/svod.ts src/api/aggregations.ts src/api/summaries.ts \
        src/hooks/useSvod.ts src/hooks/useAggregations.ts src/hooks/useSummary.ts \
        src/test/m02-api.test.ts
git commit -m "feat: add M-02 API modules and TanStack Query hooks for SVOD, aggregations, summaries"
```

---

## Task 3: СВОД page (`/svod`)

**Files:**
- Replace: `frontend/src/pages/SvodPage.tsx` — full SVOD table implementation

**Behavioral requirements:**
- MUI DataGrid with server-side pagination (`paginationMode="server"`, `pageSize=100`)
- All 19 СВОД columns from `docs/impl/ui-spec.md` §7.9, in this exact order:

| # | Header (Russian) | Field | Align | Format |
|---|---|---|---|---|
| 1 | № | `import_seq_no` | left | integer |
| 2 | Подразделение | `division_name` | left | text |
| 3 | Филиал | `branch_name` | left | text |
| 4 | Значение | `object_name` | left | text, clickable → `/objects/{id}` |
| 5 | Ответственные ТО | `engineers` | left | comma-separated names |
| 6 | ПЗВ | `pzv_minutes` | right | 2 decimal places |
| 7 | Дорога | `round_trip_min` | right | 2 decimal places |
| 8 | Пожарная сигн. | `ps_monthly_avg` | right | 6 decimal places |
| 9 | Видео | `video_monthly_avg` | right | 6 decimal places |
| 10 | Охрана | `os_monthly_avg` | right | 6 decimal places |
| 11 | Записи | `records_monthly` | right | 6 decimal places |
| 12 | Ремонт без дороги | `repair_no_travel_monthly` | right | 6 decimal places |
| 13 | ТО+записи+ремонт(без дороги)+Дорога, мин | `total_no_travel_min` | right | 6 decimal places |
| 14 | ИТОГО Числ (без дороги) | `itogo_chislo_no_travel` | right | 6 decimal places |
| 15 | Ремонт с дорогой | `repair_with_travel_monthly` | right | 6 decimal places |
| 16 | ТО+записи+ремонт(с дорогой)+Дорога, мин | `total_with_travel_min` | right | 6 decimal places |
| 17 | ИТОГО Числ (с дорогой) | `itogo_chislo_with_travel` | right | 6 decimal places, **bold** |
| 18 | Р1 на объекте всех систем | `r1_per_visit_total` | right | 6 decimal places |
| 19 | Р2 на объекте всех систем | `r2_per_visit_total` | right | 6 decimal places |

**Controls above the table:**
- Division filter dropdown — calls `GET /divisions` for the option list, passes selected `division_id` to `useSvod(page, size, divisionId)`
- "Экспорт XLSX" button — calls `exportSvodXlsx()`, triggers browser download via `URL.createObjectURL` + temporary `<a>` element with `download` attribute

**UX requirements:**
- Show `<CircularProgress>` while loading (PAC-05: first page <3s)
- Zero values may display as blank (matching Excel behavior) — use `valueFormatter` on numeric columns
- Sortable by any column (client-side sort within the loaded page)
- Row ID uses `object_id`
- PoC: No stale indicators, no period selector (S-02, S-05)

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/SvodPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SvodPage from '../pages/SvodPage'

// Mock the hooks
vi.mock('../hooks/useSvod', () => ({
  useSvod: vi.fn(),
}))

vi.mock('../api/svod', () => ({
  exportSvodXlsx: vi.fn(),
}))

// Mock divisions for filter dropdown
vi.mock('../api/divisions', async () => ({
  getDivisions: vi.fn().mockResolvedValue([]),
}))

import { useSvod } from '../hooks/useSvod'
import { exportSvodXlsx } from '../api/svod'

const mockUseSvod = vi.mocked(useSvod)
const mockExport = vi.mocked(exportSvodXlsx)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SvodPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SvodPage', () => {
  it('renders loading spinner while fetching', () => {
    mockUseSvod.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useSvod>)

    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders SVOD table with data', async () => {
    mockUseSvod.mockReturnValue({
      data: {
        content: [
          {
            object_id: '123',
            object_name: 'Архив г.Брест',
            address: 'ул.Московская',
            division_name: 'Брестское',
            branch_name: 'Филиал 1',
            engineers: ['Иванов П.С.'],
            os_monthly_avg: 0.1,
            ps_monthly_avg: 0.0,
            video_monthly_avg: 0.0,
            records_monthly: 0.0,
            repair_no_travel_monthly: 0.0,
            repair_with_travel_monthly: 0.0,
            round_trip_min: 40.0,
            pzv_minutes: 20.0,
            total_no_travel_min: 0.0,
            itogo_chislo_no_travel: 0.0,
            total_with_travel_min: 0.0,
            itogo_chislo_with_travel: 0.032327,
            r1_per_visit_total: 0.5,
            r2_per_visit_total: 0.3,
            computed_at: '2026-03-30T12:00:00Z',
            import_seq_no: 1,
          },
        ],
        total_elements: 1,
        total_pages: 1,
        page: 0,
        size: 100,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSvod>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Архив г.Брест')).toBeInTheDocument()
    })
  })

  it('export button triggers XLSX download', async () => {
    mockUseSvod.mockReturnValue({
      data: { content: [], total_elements: 0, total_pages: 0, page: 0, size: 100 },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSvod>)

    const blob = new Blob(['test'])
    mockExport.mockResolvedValueOnce(blob)

    renderPage()
    const exportBtn = screen.getByRole('button', { name: /экспорт xlsx/i })
    await userEvent.click(exportBtn)
    expect(mockExport).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/SvodPage.test.tsx
```

Expected: fails because `SvodPage` is still a placeholder div.

- [ ] **Step 3: Implement SvodPage.tsx**

Replace `frontend/src/pages/SvodPage.tsx` with the full implementation.

**Implementation targets:**
- File: `frontend/src/pages/SvodPage.tsx`
- Use `useSvod(page, pageSize, divisionId)` hook for data
- Use MUI `DataGrid` from `@mui/x-data-grid` with `paginationMode="server"`
- Column definitions: an array of `GridColDef` for all 19 СВОД columns, following the exact column spec above
- Helper function: `formatDecimal(value: number, places: number)` — returns blank string for 0, otherwise `value.toFixed(places)`. Used as `valueFormatter` on all numeric columns.
- Division filter: `<Select>` above the grid. Options fetched via the existing `getDivisions()` from `src/api/divisions.ts` (created in M-01). On change: update `divisionId` state → `useSvod` refetches.
- Export button: calls `exportSvodXlsx()`, creates a Blob URL, triggers download via a temporary `<a>` element, then revokes the URL.
- Loading: `<CircularProgress>` shown when `isLoading` is true.
- Error: `<Alert severity="error">` with the error message.
- Pagination: controlled by `paginationModel` state. `rowCount` from `data.total_elements`.

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/SvodPage.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SvodPage.tsx src/test/SvodPage.test.tsx
git commit -m "feat: implement SVOD table page with 19 columns, pagination, division filter, XLSX export"
```

---

## Task 4: СВОД tab on Object Detail page

**Files:**
- Modify: `frontend/src/pages/ObjectDetailPage.tsx` — replace placeholder with tabbed layout including СВОД tab

**Prerequisite context:** The M-01 frontend plan implements the Object Detail page with 6 tabs (Оборудование, Записи, Ремонт, Дорога, Инженеры, СВОД). The СВОД tab was left as a placeholder in M-01. This task replaces the СВОД tab placeholder only.

If M-01 already implemented the tabbed layout with placeholder tabs, modify only the СВОД tab panel. If the tabbed layout does not yet exist, create the full 6-tab layout with the СВОД tab fully implemented and the other tabs as stubs referencing M-01/M-03 components.

**СВОД tab behavioral requirements:**
- Uses `useObjectSummary(objectId)` hook to fetch `GET /objects/:id/summary`
- Read-only two-column layout (label + value) showing all 19 summary fields
- Field grouping:
  - **Per-visit breakdown:** ОС Р1, ОС Р2, ПС Р1, ПС Р2, Видео Р1, Видео Р2, Р1 итого, Р2 итого
  - **Monthly averages:** ОС, ПС, Видео, Записи, Ремонт без дороги, Ремонт с дорогой
  - **Travel:** ПЗВ, Дорога (время в оба конца)
  - **Totals:** ТО+записи+ремонт(без дороги)+Дорога (мин), ИТОГО Числ (без дороги), ТО+записи+ремонт(с дорогой)+Дорога (мин), ИТОГО Числ (с дорогой)
  - **Computed at:** timestamp
- FTE fields (itogo values): 6 decimal places
- Minute fields (monthly_avg, repair, travel): 2 decimal places
- Shows "Нет данных" when no summary row exists yet
- **PAC-04 support:** The hook uses a query key that includes `objectId`. When source data tabs (Equipment, Records, Repairs, Travel) save successfully, they call `queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, objectId] })`. This causes the СВОД tab to auto-refetch without page refresh.

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/ObjectSvodTab.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ObjectDetailPage from '../pages/ObjectDetailPage'

vi.mock('../hooks/useSummary', () => ({
  useObjectSummary: vi.fn(),
  SUMMARY_QUERY_KEY: 'object-summary',
}))

import { useObjectSummary } from '../hooks/useSummary'

const mockUseObjectSummary = vi.mocked(useObjectSummary)

function renderPage(objectId: string = '123') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/objects/${objectId}`]}>
        <Routes>
          <Route path="/objects/:id" element={<ObjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Object Detail — СВОД tab', () => {
  it('shows "Нет данных" when no summary exists', async () => {
    mockUseObjectSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useObjectSummary>)

    renderPage()
    // Navigate to СВОД tab (tab index 5 — the last tab)
    const svodTab = screen.getByRole('tab', { name: /свод/i })
    await svodTab.click()

    await waitFor(() => {
      expect(screen.getByText('Нет данных')).toBeInTheDocument()
    })
  })

  it('renders summary values when data exists', async () => {
    mockUseObjectSummary.mockReturnValue({
      data: {
        object_id: '123',
        os_r1_per_visit: 0.7,
        os_r2_per_visit: 1.4,
        ps_r1_per_visit: 0.0,
        ps_r2_per_visit: 0.0,
        video_r1_per_visit: 0.0,
        video_r2_per_visit: 0.0,
        r1_per_visit_total: 0.7,
        r2_per_visit_total: 1.4,
        os_monthly_avg: 0.816667,
        ps_monthly_avg: 0.0,
        video_monthly_avg: 0.0,
        records_monthly: 0.0,
        repair_no_travel_monthly: 0.0,
        repair_with_travel_monthly: 0.0,
        round_trip_min: 40.0,
        pzv_minutes: 20.0,
        total_no_travel_min: 0.82,
        itogo_chislo_no_travel: 0.000082,
        total_with_travel_min: 5.37,
        itogo_chislo_with_travel: 0.032327,
        computed_at: '2026-03-30T12:00:00Z',
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useObjectSummary>)

    renderPage()
    const svodTab = screen.getByRole('tab', { name: /свод/i })
    await svodTab.click()

    await waitFor(() => {
      expect(screen.getByText('0.032327')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/ObjectSvodTab.test.tsx
```

Expected: fails because `ObjectDetailPage` is still a placeholder or lacks the СВОД tab.

- [ ] **Step 3: Implement the Object Detail page with tabbed layout and СВОД tab**

Modify `frontend/src/pages/ObjectDetailPage.tsx`.

**Implementation targets:**
- Uses `useParams()` to get `id` from the URL
- MUI `Tabs` component with 6 tabs: "Оборудование", "Записи", "Ремонт", "Дорога", "Инженеры", "СВОД"
- Tab panels rendered conditionally based on active tab index
- Tabs 0–3 (Оборудование, Записи, Ремонт, Дорога): render placeholder text `"[M-01] TODO"` if not yet implemented from M-01 plan. If M-01 components already exist, render them.
- Tab 4 (Инженеры): render placeholder text `"[M-03] TODO"` — filled in M-03 frontend plan
- Tab 5 (СВОД): **fully implemented** — uses `useObjectSummary(id)` hook, renders the two-column read-only summary layout described above
- Create a `SummaryTab` component (either inline or as a separate component in `src/components/`) that:
  - Shows `<CircularProgress>` while loading
  - Shows "Нет данных" `<Typography>` when `data` is undefined/null
  - Otherwise renders a `<Grid container>` with label-value pairs grouped as specified

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/ObjectSvodTab.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ObjectDetailPage.tsx src/test/ObjectSvodTab.test.tsx
git commit -m "feat: implement Object Detail tabbed layout with SVOD summary tab (PAC-04)"
```

---

## Task 5: Dashboard page (`/`)

**Files:**
- Replace: `frontend/src/pages/DashboardPage.tsx` — full dashboard implementation

**Behavioral requirements — three sections from `ui-spec.md` §4.9 / §7:**

**Section 1 — FTE by Division** (table)
- Data from `useDivisionsAggregation()` → `GET /aggregations/divisions`
- Columns: Подразделение (`division_name`), ИТОГО FTE (`total_fte`, 4 decimal places), Объектов (`object_count`), Без инженера (`gap_count`)
- Sortable by `total_fte` descending by default
- Row click → navigate to `/divisions/:id`

**Section 2 — Top 10 objects by workload** (table)
- Data from `useSvod(0, 10)` → `GET /svod?page=0&size=10` (backend sorts by `itogo_chislo_with_travel DESC` by default)
- Columns: Объект (`object_name`), Подразделение (`division_name`), ИТОГО Числ (`itogo_chislo_with_travel`, 6 decimal places)
- Row click → navigate to `/objects/:id`

**Section 3 — Coverage gaps** (table)
- Data from `useCoverageGaps()` → `GET /coverage/gaps`
- Columns: Объект (`object_name`), Подразделение (`division_name`), Филиал (`branch_name`), ИТОГО FTE (`itogo_chislo_with_travel`, 6 decimal places)
- Show "Нет непокрытых объектов" when the list is empty

**PAC-08 verification:** The Division FTE column must match the СВОД total. This is guaranteed by the backend — the frontend only displays API data, it does not compute anything.

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/DashboardPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

vi.mock('../hooks/useAggregations', () => ({
  useDivisionsAggregation: vi.fn(),
  useCoverageGaps: vi.fn(),
}))

vi.mock('../hooks/useSvod', () => ({
  useSvod: vi.fn(),
}))

import { useDivisionsAggregation, useCoverageGaps } from '../hooks/useAggregations'
import { useSvod } from '../hooks/useSvod'

const mockDivisions = vi.mocked(useDivisionsAggregation)
const mockGaps = vi.mocked(useCoverageGaps)
const mockSvod = vi.mocked(useSvod)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  it('renders FTE by division section', async () => {
    mockDivisions.mockReturnValue({
      data: [
        { division_id: '1', division_name: 'Брестское', total_fte: 12.5, object_count: 245, gap_count: 12 },
      ],
      isLoading: false,
    } as ReturnType<typeof useDivisionsAggregation>)
    mockSvod.mockReturnValue({ data: { content: [] }, isLoading: false } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Брестское')).toBeInTheDocument()
      expect(screen.getByText('12.5000')).toBeInTheDocument()
    })
  })

  it('renders "Нет непокрытых объектов" when no coverage gaps', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useDivisionsAggregation>)
    mockSvod.mockReturnValue({ data: { content: [] }, isLoading: false } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Нет непокрытых объектов')).toBeInTheDocument()
    })
  })

  it('renders top 10 objects section', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useDivisionsAggregation>)
    mockSvod.mockReturnValue({
      data: {
        content: [
          {
            object_id: 'obj-1',
            object_name: 'ЦБУ г.Брест',
            division_name: 'Брестское',
            branch_name: 'Филиал 1',
            itogo_chislo_with_travel: 0.064,
            engineers: [],
            os_monthly_avg: 0, ps_monthly_avg: 0, video_monthly_avg: 0,
            records_monthly: 0, repair_no_travel_monthly: 0, repair_with_travel_monthly: 0,
            round_trip_min: 0, pzv_minutes: 0, total_no_travel_min: 0,
            itogo_chislo_no_travel: 0, total_with_travel_min: 0,
            r1_per_visit_total: 0, r2_per_visit_total: 0, computed_at: null,
          },
        ],
        total_elements: 1, total_pages: 1, page: 0, size: 10,
      },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ЦБУ г.Брест')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/DashboardPage.test.tsx
```

Expected: fails because `DashboardPage` is still a placeholder.

- [ ] **Step 3: Implement DashboardPage.tsx**

Replace `frontend/src/pages/DashboardPage.tsx`.

**Implementation targets:**
- File: `frontend/src/pages/DashboardPage.tsx`
- Three sections, each with a heading (`<Typography variant="h6">`) and a MUI `<Table>` or `<DataGrid>`
- Section 1: "FTE по подразделениям" — `useDivisionsAggregation()` hook, MUI `<Table>` with 4 columns, rows clickable via `useNavigate()`
- Section 2: "Топ-10 объектов по нагрузке" — `useSvod(0, 10)` hook, MUI `<Table>` with 3 columns, rows clickable
- Section 3: "Непокрытые объекты" — `useCoverageGaps()` hook, MUI `<Table>` with 4 columns, or "Нет непокрытых объектов" `<Typography>` when empty
- Each section shows `<CircularProgress>` while its respective hook is loading
- Page title: `<Typography variant="h4">Дашборд</Typography>`

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/DashboardPage.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx src/test/DashboardPage.test.tsx
git commit -m "feat: implement Dashboard with FTE by division, top 10 objects, coverage gaps (PAC-08)"
```

---

## Task 6: Division Detail — FTE subtotals and coverage gaps

**Files:**
- Modify: `frontend/src/pages/DivisionDetailPage.tsx` — add FTE summary card and coverage gaps section

**Prerequisite context:** The M-01 frontend plan implements `DivisionDetailPage.tsx` with division name, branch list table, and create branch button. This task extends it with M-02 aggregation data.

**Additions to Division Detail page:**

**FTE summary card (top of page, before branch table):**
- Data from `useDivisionAggregation(id)` → `GET /aggregations/divisions/:id`
- MUI `Card` showing: total FTE for this division (`total_fte`, 4 decimal places), object count, gap count
- Three `<Chip>` or info items: "ИТОГО FTE: 12.5000", "Объектов: 245", "Без инженера: 12"

**Branch table FTE column:**
- The existing branch list table (from M-01) gets an additional "FTE" column showing `total_fte` for each branch
- Data source: `useBranchesAggregation()` or individual branch data — join client-side by `branch_id`

**Coverage gaps section (below branch table):**
- Data from `useCoverageGaps(divisionId)` → `GET /coverage/gaps?division_id=:id`
- Heading: "⚠ {count} объектов без назначенного инженера" (or nothing when empty)
- MUI `<Table>`: Объект (`object_name`), Нагрузка (`itogo_chislo_with_travel`, 6 decimal places)
- Per `ui-spec.md` §7.7

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/DivisionDetail.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DivisionDetailPage from '../pages/DivisionDetailPage'

vi.mock('../hooks/useAggregations', () => ({
  useDivisionAggregation: vi.fn(),
  useCoverageGaps: vi.fn(),
}))

import { useDivisionAggregation, useCoverageGaps } from '../hooks/useAggregations'

const mockDivAgg = vi.mocked(useDivisionAggregation)
const mockGaps = vi.mocked(useCoverageGaps)

function renderPage(divisionId: string = 'div-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/divisions/${divisionId}`]}>
        <Routes>
          <Route path="/divisions/:id" element={<DivisionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionDetailPage — M-02 additions', () => {
  it('shows FTE summary card with division totals', async () => {
    mockDivAgg.mockReturnValue({
      data: {
        division_id: 'div-1',
        division_name: 'Брестское',
        total_fte: 12.5,
        object_count: 245,
        gap_count: 12,
      },
      isLoading: false,
    } as ReturnType<typeof useDivisionAggregation>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/12\.5000/)).toBeInTheDocument()
      expect(screen.getByText(/245/)).toBeInTheDocument()
    })
  })

  it('shows coverage gaps section with uncovered objects', async () => {
    mockDivAgg.mockReturnValue({
      data: {
        division_id: 'div-1',
        division_name: 'Брестское',
        total_fte: 12.5,
        object_count: 245,
        gap_count: 1,
      },
      isLoading: false,
    } as ReturnType<typeof useDivisionAggregation>)
    mockGaps.mockReturnValue({
      data: [
        {
          object_id: 'obj-1',
          object_name: 'Инфокиоск INF 00635',
          division_name: 'Брестское',
          branch_name: 'Филиал 1',
          itogo_chislo_with_travel: 0.008,
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/без назначенного инженера/i)).toBeInTheDocument()
      expect(screen.getByText('Инфокиоск INF 00635')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/DivisionDetail.test.tsx
```

Expected: fails because `DivisionDetailPage` is a placeholder or doesn't have aggregation sections.

- [ ] **Step 3: Implement DivisionDetailPage.tsx updates**

Modify `frontend/src/pages/DivisionDetailPage.tsx`.

**Implementation targets:**
- If M-01 already implemented branch list and division header: add the FTE card and coverage gaps section
- If still a placeholder: implement the full page structure:
  - Division name heading + "Редактировать" button
  - FTE summary `<Card>` with three items
  - Branch list `<Table>` with name, object count, and FTE columns
  - Coverage gaps section: `<Alert severity="warning">` header with gap count, then `<Table>` of uncovered objects
- Uses `useParams()` to get division `id`
- Uses `useDivisionAggregation(id)` for the FTE summary card
- Uses `useCoverageGaps(id)` for the gaps section

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/DivisionDetail.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DivisionDetailPage.tsx src/test/DivisionDetail.test.tsx
git commit -m "feat: add FTE subtotals and coverage gaps to Division Detail page"
```

---

## Task 7: Enable СВОД nav link and verify all navigation

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx` — ensure СВОД link is active (not disabled)

The СВОД link was added in scaffolding (`navItems` array in `AppLayout.tsx`) and is already active — it navigates to `/svod`. Verify it is not disabled. If any future M-01 implementation added a `disabled` property to the СВОД or Engineers nav items, remove the disabled state for СВОД.

- [ ] **Step 1: Verify СВОД nav link is active in AppLayout.tsx**

Read `frontend/src/components/layout/AppLayout.tsx` and confirm the СВОД nav item exists without a `disabled` property. The scaffolding plan created it as:

```typescript
const navItems = [
  { label: 'Дашборд', path: '/' },
  { label: 'Объекты', path: '/objects' },
  { label: 'Инженеры', path: '/engineers' },
  { label: 'СВОД', path: '/svod' },
  { label: 'Подразделения', path: '/divisions' },
]
```

If the СВОД item has `disabled: true`, remove that property. If it's already active, no change needed.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "chore: ensure SVOD nav link is active in sidebar"
```

---

## Task 8: Query invalidation wiring for PAC-04

**Files:**
- Modify: `frontend/src/hooks/useSummary.ts` — export `SUMMARY_QUERY_KEY`
- Modify: Source-data mutation hooks (from M-01) to invalidate summary query key after successful mutations

**PAC-04 requirement:** After editing any equipment quantity (or records/repairs/travel) and saving, the СВОД tab values update without page refresh.

**Implementation approach:**

The M-01 plan creates mutation hooks for equipment, records, repairs, and travel. Each mutation's `onSuccess` callback must call:

```typescript
queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, objectId] })
queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
```

This ensures:
1. The СВОД tab on Object Detail refetches the summary
2. The СВОД table page refetches its data

**Files to modify (from M-01 hooks — exact file names depend on M-01 plan execution):**
- `src/hooks/useEquipment.ts` — `useAddDevice`, `useUpdateDevice`, `useRemoveDevice`, `useAddAssignment`, `useUpdateAssignment`, `useRemoveAssignment` mutations
- `src/hooks/useRecords.ts` — `useUpdateRecords` mutation
- `src/hooks/useRepairs.ts` — `useUpdateRepair` mutation
- `src/hooks/useTravel.ts` — `useUpdateTravel` mutation

For each mutation hook, add to the `onSuccess` callback:

```typescript
import { SUMMARY_QUERY_KEY } from './useSummary'
import { SVOD_QUERY_KEY } from './useSvod'

// Inside useMutation options:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, objectId] })
  queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
  // ...any existing invalidations from M-01 (e.g., device list, records, etc.)
}
```

If M-01 mutation hooks don't exist yet (because this plan is being executed before M-01 frontend), create a placeholder comment in `useSummary.ts` noting the invalidation wiring:

```typescript
// PAC-04: Source-data mutations (equipment, records, repairs, travel) must invalidate
// [SUMMARY_QUERY_KEY, objectId] and [SVOD_QUERY_KEY] on success.
// Wiring added when M-01 mutation hooks exist.
```

- [ ] **Step 1: Add invalidation to M-01 mutation hooks (or add placeholder comment)**

Check if M-01 mutation hooks exist:
- `src/hooks/useEquipment.ts`
- `src/hooks/useRecords.ts`
- `src/hooks/useRepairs.ts`
- `src/hooks/useTravel.ts`

If they exist: add `queryClient.invalidateQueries` calls to each mutation's `onSuccess`.
If they don't exist: add the placeholder comment to `src/hooks/useSummary.ts`.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/
git commit -m "feat: wire query invalidation for PAC-04 (SVOD tab auto-refresh on data save)"
```

---

## Task 9: Run all quality gates

- [ ] **Step 1: Auto-format with Prettier**

```bash
cd frontend
npm run format
```

Expected: all files formatted.

- [ ] **Step 2: Run ESLint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings. Fix any issues before proceeding.

- [ ] **Step 3: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type issues before proceeding.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass. This includes:
- `src/test/api.test.ts` (scaffolding — ApiResponseSchema)
- `src/test/m02-types.test.ts` (Task 1 — Zod schemas)
- `src/test/m02-api.test.ts` (Task 2 — API module calls)
- `src/test/SvodPage.test.tsx` (Task 3 — SVOD page rendering)
- `src/test/ObjectSvodTab.test.tsx` (Task 4 — Object Detail SVOD tab)
- `src/test/DashboardPage.test.tsx` (Task 5 — Dashboard sections)
- `src/test/DivisionDetail.test.tsx` (Task 6 — Division Detail FTE + gaps)
- Any pre-existing M-01 tests

Fix any failures.

- [ ] **Step 5: Commit formatting fixes (if any)**

```bash
git add -A
git commit -m "chore: format and lint fixes"
```

- [ ] **Step 6: Push branch**

```bash
git push -u origin feature/poc-m02-frontend
```

---

## Summary of files created/modified

| Action | File | Task |
|---|---|---|
| Create | `src/types/m02.ts` | 1 |
| Create | `src/test/m02-types.test.ts` | 1 |
| Create | `src/api/svod.ts` | 2 |
| Create | `src/api/aggregations.ts` | 2 |
| Create | `src/api/summaries.ts` | 2 |
| Create | `src/hooks/useSvod.ts` | 2 |
| Create | `src/hooks/useAggregations.ts` | 2 |
| Create | `src/hooks/useSummary.ts` | 2 |
| Create | `src/test/m02-api.test.ts` | 2 |
| Replace | `src/pages/SvodPage.tsx` | 3 |
| Create | `src/test/SvodPage.test.tsx` | 3 |
| Modify | `src/pages/ObjectDetailPage.tsx` | 4 |
| Create | `src/test/ObjectSvodTab.test.tsx` | 4 |
| Replace | `src/pages/DashboardPage.tsx` | 5 |
| Create | `src/test/DashboardPage.test.tsx` | 5 |
| Modify | `src/pages/DivisionDetailPage.tsx` | 6 |
| Create | `src/test/DivisionDetail.test.tsx` | 6 |
| Verify | `src/components/layout/AppLayout.tsx` | 7 |
| Modify | `src/hooks/use*.ts` (M-01 mutations) | 8 |

**Total:** 11 new files, 3 modified files, 1 verified file.

## Acceptance criteria verification

| Criterion | How verified | Task |
|---|---|---|
| PAC-04 | Query invalidation wiring: save on any source-data tab → `invalidateQueries` → СВОД tab refetches | 4, 8 |
| PAC-05 | SVOD page shows `<CircularProgress>` while loading; server-side pagination (100 rows/page) limits payload | 3 |
| PAC-08 | Dashboard FTE column displays `total_fte` from `GET /aggregations/divisions` — no frontend calculation | 5 |
| S-02 | No stale indicators anywhere — no "Данные устарели" banners | 3, 4 |
| S-05 | No period selector on SVOD page | 3 |
| S-08 | XLSX export only — no PDF export button | 3 |
