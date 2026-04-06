# PoC M-01 Frontend — Core CRUD UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all placeholder pages with real UI for PoC M-01. Implement login flow, Division/Branch/Object CRUD, Equipment tab (two-layer: physical inventory + system assignments), Records/Repairs/Travel tabs. All TanStack Query hooks, Zod schemas, React Hook Form forms. All PoC routes from M-01 fully functional.

**Architecture:** React 18 + TypeScript SPA. All API calls go through the shared Axios instance at `src/api/axios.ts`. Server state managed by TanStack Query; client-only state (auth) in Zustand. All forms use React Hook Form + Zod. No business logic or calculations in the frontend — all computed values come from the backend API.

**Tech Stack:**

- Frontend: React 18, TypeScript 5 (strict), Vite, React Router 6, TanStack Query 5, Zustand 5, MUI 5, MUI X DataGrid, Axios, React Hook Form 7, Zod 3
- Testing: Vitest, @testing-library/react, @testing-library/user-event, jsdom
- Quality: ESLint (@typescript-eslint, no `any`), Prettier

**Depends on:** `feature/poc-m01-backend` merged to `feature/implementation`

---

## Source-Of-Truth Alignment

Before implementing any task below, use these rules whenever documents disagree:

1. `docs/TOR_Workload_WebApp.md` is the primary business-rule source of truth.
2. `docs/impl/api-spec.md` is authoritative for REST endpoint semantics, request/response shapes, and error codes.
3. `docs/impl/ui-spec.md` is authoritative for page layout, columns, filters, and UX rules.
4. `docs/impl/epics/poc-m01-core-crud.md` is authoritative for PoC M-01 scope and acceptance criteria.
5. `docs/impl/poc-scope.md` defines PoC simplifications — never implement MVP features.

**Implementation rules for every task:**

- No `any` — use `unknown` + type guards or proper interfaces. If unavoidable, add `// eslint-disable-next-line` with a comment.
- All HTTP calls go through the shared Axios instance (`src/api/axios.ts`). Never use `fetch()` or create another Axios instance.
- All forms use React Hook Form + Zod. Never manage form state with raw `useState`.
- All API response data managed by TanStack Query. Never store API response data in Zustand or component state. Zustand is for auth only.
- All user-facing labels in **Russian**.
- No inline styles — use MUI `sx` prop or theme.
- No business logic or calculations in frontend code — all computed values come from the API (TOR AD-07).
- PoC simplifications to respect: no stale banners (S-02), no catalog management UI (S-03), no RBAC enforcement (S-04), no planning periods (S-05).

---

## File Structure After M-01 Frontend

```
frontend/src/
├── api/
│   ├── axios.ts              (exists — no changes)
│   ├── auth.ts               (new — login/logout/me)
│   ├── divisions.ts          (new — division CRUD)
│   ├── branches.ts           (new — branch read/update)
│   ├── objects.ts            (new — object CRUD)
│   ├── equipment.ts          (new — devices + assignments)
│   ├── records.ts            (new — records get/update)
│   ├── repairs.ts            (new — repairs get/update)
│   ├── travel.ts             (new — travel get/update)
│   └── catalog.ts            (new — catalog reads)
├── hooks/
│   ├── useAuth.ts            (new — login mutation)
│   ├── useDivisions.ts       (new — division queries/mutations)
│   ├── useBranches.ts        (new — branch queries/mutations)
│   ├── useObjects.ts         (new — object queries/mutations)
│   ├── useEquipment.ts       (new — device + assignment queries/mutations)
│   ├── useRecords.ts         (new — records queries/mutations)
│   ├── useRepairs.ts         (new — repairs queries/mutations)
│   ├── useTravel.ts          (new — travel queries/mutations)
│   └── useCatalog.ts         (new — catalog queries)
├── types/
│   ├── api.ts                (exists — extend with M-01 entity types + Zod schemas)
│   ├── division.ts           (new — Division, Branch types + Zod schemas)
│   ├── object.ts             (new — ObjectRecord type + Zod schemas)
│   ├── equipment.ts          (new — device/assignment types + Zod schemas)
│   ├── records.ts            (new — records type + Zod schema)
│   ├── repairs.ts            (new — repair types + Zod schema)
│   ├── travel.ts             (new — travel type + Zod schema)
│   ├── catalog.ts            (new — DeviceType, RepairType types)
│   └── auth.ts               (new — LoginRequest, User types + Zod schemas)
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx     (exists — update nav disabled states)
│   ├── common/
│   │   ├── ConfirmDialog.tsx  (new — reusable confirm/cancel dialog)
│   │   └── FormTextField.tsx  (new — RHF-connected MUI TextField)
│   └── equipment/
│       ├── PhysicalInventory.tsx     (new — Section A)
│       └── SystemAssignments.tsx     (new — Section B)
├── pages/
│   ├── LoginPage.tsx          (replace placeholder)
│   ├── DashboardPage.tsx      (replace placeholder — minimal for M-01)
│   ├── DivisionListPage.tsx   (replace placeholder)
│   ├── DivisionDetailPage.tsx (replace placeholder)
│   ├── BranchDetailPage.tsx   (replace placeholder)
│   ├── ObjectListPage.tsx     (replace placeholder)
│   ├── ObjectDetailPage.tsx   (replace placeholder — 6-tab layout)
│   ├── EngineerListPage.tsx   (keep placeholder — M-03 scope)
│   ├── EngineerDetailPage.tsx (keep placeholder — M-03 scope)
│   └── SvodPage.tsx           (keep placeholder — M-02 scope)
├── store/
│   └── authStore.ts           (exists — no changes)
├── router/
│   └── index.tsx              (exists — extract ProtectedRoute to own file)
└── test/
    ├── setup.ts               (exists — no changes)
    ├── api.test.ts            (exists — no changes)
    └── ... (new test files per task)
```

---

## Task 0: Create feature branch

**Files:**

- No file changes in this task

- [ ] **Step 1: Check out the branch for this plan**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/poc-m01-frontend
```

Expected: Git switches to `feature/poc-m01-frontend` with no merge conflicts.

- [ ] **Step 2: Verify working tree is clean**

```bash
git status --short
```

Expected: no unexpected modified frontend files.

---

## Task 1: TypeScript types and Zod validation schemas

**Files:**

- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/types/division.ts`
- Create: `frontend/src/types/object.ts`
- Create: `frontend/src/types/equipment.ts`
- Create: `frontend/src/types/records.ts`
- Create: `frontend/src/types/repairs.ts`
- Create: `frontend/src/types/travel.ts`
- Create: `frontend/src/types/catalog.ts`

This task defines all TypeScript interfaces and Zod validation schemas for M-01 entities. Zod schemas are used both for API response parsing and form validation (via `@hookform/resolvers/zod`).

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { LoginRequestSchema } from "../types/auth";
import { DivisionCreateSchema } from "../types/division";
import { TravelUpdateSchema } from "../types/travel";

describe("Zod schemas", () => {
  it("LoginRequestSchema rejects empty email", () => {
    const result = LoginRequestSchema.safeParse({ email: "", password: "x" });
    expect(result.success).toBe(false);
  });

  it("LoginRequestSchema accepts valid input", () => {
    const result = LoginRequestSchema.safeParse({
      email: "admin@workload.local",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("DivisionCreateSchema rejects empty name", () => {
    const result = DivisionCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("TravelUpdateSchema rejects negative distance", () => {
    const result = TravelUpdateSchema.safeParse({
      transportType: "car",
      distanceKm: -1,
      oneWayTimeMin: 10,
    });
    expect(result.success).toBe(false);
  });

  it("TravelUpdateSchema accepts valid input", () => {
    const result = TravelUpdateSchema.safeParse({
      transportType: "car",
      distanceKm: 15.5,
      oneWayTimeMin: 20,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/types.test.ts
```

Expected: import error — type modules do not exist yet.

- [ ] **Step 3: Create all type files**

Create each type file. All types must match the API response shapes from `docs/impl/api-spec.md` exactly. All Zod schemas for forms enforce the validation rules below.

**`src/types/auth.ts`** — Types and schemas:

- `LoginRequest` — `{ email: string, password: string }`. Zod: `email` must be a valid email, `password` min length 1.
- `LoginResponse` — `{ token: string, user: User }`.
- `User` — `{ id: string, email: string, name: string, role: 'admin' | 'editor' | 'viewer' | 'engineer' }`.
- Export `LoginRequestSchema` for form validation.

**`src/types/division.ts`** — Types and schemas:

- `Division` — `{ id: string, name: string, branchCount: number, objectCount: number, createdAt?: string, updatedAt?: string }`.
- `DivisionDetail` — extends Division with `branches: Branch[]`.
- `Branch` — `{ id: string, name: string, divisionId: string, divisionName?: string, objectCount: number, createdAt?: string, updatedAt?: string }`.
- `BranchDetail` — extends Branch with `objects: { data: BranchObjectRow[], meta: { total: number, page: number, size: number } }`.
- `BranchObjectRow` — `{ id: string, name: string, itogoChisloWithTravel: number | null, engineerCount: number }`.
- Export `DivisionCreateSchema` (`name` min 1), `BranchCreateSchema` (`name` min 1).

**`src/types/object.ts`** — Types and schemas:

- `ObjectRecord` — `{ id: string, name: string, branchId: string, branchName?: string, divisionName?: string, address?: string, importSeqNo?: number, createdAt?: string, updatedAt?: string }`.
- Export `ObjectCreateSchema` (`name` min 1, `branchId` uuid string), `ObjectUpdateSchema`.

**`src/types/equipment.ts`** — Types and schemas:

- `ObjectDevice` — `{ id: string, objectId: string, deviceTypeId: string, deviceTypeName: string, quantityPhysical: number }` (`quantityMaintained` is only on `object_system_assignments`, not `object_devices` — see db-schema.md).
- `ObjectSystemAssignment` — `{ id: string, objectId: string, deviceTypeId: string, deviceTypeName: string, systemType: 'OS' | 'PS' | 'VIDEO', quantityMaintained: number, r1Minutes: number, r2Minutes: number }`.
- Export `DeviceAddSchema` (`deviceTypeId` required, `quantityPhysical` ≥ 1 integer), `AssignmentCreateSchema` (`deviceTypeId` required, `systemType` enum, `quantityMaintained` ≥ 0 integer), `AssignmentUpdateSchema` (`quantityMaintained` ≥ 0 integer).

**`src/types/records.ts`** — Types and schemas:

- `RecordsTask` — `{ id?: string, objectId: string, accessRequests: number, monitoringRequests: number, footageRequests: number, backupControl: number, securityAdmin: number }` (field names match db-schema.md `records_tasks` columns).
- Export `RecordsUpdateSchema` (all 5 fields ≥ 0 integers).

**`src/types/repairs.ts`** — Types and schemas:

- `ObjectRepair` — `{ id: string, objectId: string, repairTypeId: string, repairTypeName: string, count: number }`.
- Export `RepairUpdateSchema` (`count` ≥ 0 integer).

**`src/types/travel.ts`** — Types and schemas:

- `Travel` — `{ id?: string, objectId: string, transportType: string, distanceKm: number, oneWayTimeMin: number, roundTripMin: number }` (field name `oneWayTimeMin` matches db-schema.md column).
- Export `TravelUpdateSchema` (`transportType` min 1, `distanceKm` ≥ 0 number, `oneWayTimeMin` ≥ 0 number). Note: `roundTripMin` is never in the form — it is read-only from the API.

**`src/types/catalog.ts`** — Types only (no forms — catalog is read-only in PoC per S-03):

- `DeviceType` — `{ id: string, name: string, description?: string }` (db-schema.md: `device_types` has `description TEXT`, no manufacturer/model columns).
- `DeviceSystemContext` — `{ id: string, deviceTypeId: string, systemType: 'OS' | 'PS' | 'VIDEO', r1Minutes: number, r2Minutes: number }`.
- `RepairType` — `{ id: string, name: string, timeMinutes: number }`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/types.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ frontend/src/test/types.test.ts
git commit -m "feat: add M-01 TypeScript types and Zod validation schemas"
```

---

## Task 2: API modules and TanStack Query hooks

**Files:**

- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/divisions.ts`
- Create: `frontend/src/api/branches.ts`
- Create: `frontend/src/api/objects.ts`
- Create: `frontend/src/api/equipment.ts`
- Create: `frontend/src/api/records.ts`
- Create: `frontend/src/api/repairs.ts`
- Create: `frontend/src/api/travel.ts`
- Create: `frontend/src/api/catalog.ts`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/hooks/useDivisions.ts`
- Create: `frontend/src/hooks/useBranches.ts`
- Create: `frontend/src/hooks/useObjects.ts`
- Create: `frontend/src/hooks/useEquipment.ts`
- Create: `frontend/src/hooks/useRecords.ts`
- Create: `frontend/src/hooks/useRepairs.ts`
- Create: `frontend/src/hooks/useTravel.ts`
- Create: `frontend/src/hooks/useCatalog.ts`

This task creates thin API call functions (one per endpoint) and TanStack Query hooks that wrap them.

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/hooks.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../api/axios";

// Mock the axios instance — all API modules import this
vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("API modules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDivisions calls GET /divisions", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: [], meta: { total: 0 }, error: null },
    });
    const { getDivisions } = await import("../api/divisions");
    await getDivisions();
    expect(mockApi.get).toHaveBeenCalledWith("/divisions");
  });

  it("createDivision calls POST /divisions", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { data: { id: "1", name: "Test" }, meta: null, error: null },
    });
    const { createDivision } = await import("../api/divisions");
    await createDivision({ name: "Test" });
    expect(mockApi.post).toHaveBeenCalledWith("/divisions", { name: "Test" });
  });

  it("login calls POST /auth/login", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { data: { token: "jwt", user: {} }, meta: null, error: null },
    });
    const { login } = await import("../api/auth");
    await login({ email: "a@b.com", password: "x" });
    expect(mockApi.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.com",
      password: "x",
    });
  });

  it("getTravel calls GET /objects/:id/travel", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: null, meta: null, error: null },
    });
    const { getTravel } = await import("../api/travel");
    await getTravel("obj-1");
    expect(mockApi.get).toHaveBeenCalledWith("/objects/obj-1/travel");
  });

  it("updateTravel calls PUT /objects/:id/travel", async () => {
    mockApi.put.mockResolvedValueOnce({
      data: { data: {}, meta: null, error: null },
    });
    const { updateTravel } = await import("../api/travel");
    await updateTravel("obj-1", {
      transportType: "car",
      distanceKm: 10,
      oneWayTimeMin: 15,
    });
    expect(mockApi.put).toHaveBeenCalledWith("/objects/obj-1/travel", {
      transportType: "car",
      distanceKm: 10,
      oneWayTimeMin: 15,
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/hooks.test.ts
```

Expected: import errors — API modules do not exist yet.

- [ ] **Step 3: Create all API modules**

Each API module exports thin functions that call the axios instance and return `response.data.data`. All functions are typed with return types from the `src/types/` modules.

**`src/api/auth.ts`** — exports:

- `login(data: LoginRequest): Promise<LoginResponse>` — `POST /auth/login`
- `logout(): Promise<void>` — `POST /auth/logout`
- `getMe(): Promise<User>` — `GET /auth/me`

**`src/api/divisions.ts`** — exports:

- `getDivisions(): Promise<Division[]>` — `GET /divisions`
- `getDivision(id: string): Promise<DivisionDetail>` — `GET /divisions/${id}`
- `createDivision(data: { name: string }): Promise<Division>` — `POST /divisions`
- `updateDivision(id: string, data: { name: string }): Promise<Division>` — `PUT /divisions/${id}`
- `getDivisionBranches(id: string): Promise<Branch[]>` — `GET /divisions/${id}/branches`
- `createBranch(divisionId: string, data: { name: string }): Promise<Branch>` — `POST /divisions/${divisionId}/branches`

**`src/api/branches.ts`** — exports:

- `getBranch(id: string): Promise<BranchDetail>` — `GET /branches/${id}`
- `updateBranch(id: string, data: { name: string }): Promise<Branch>` — `PUT /branches/${id}`

**`src/api/objects.ts`** — exports:

- `getObjects(params?: { divisionId?: string }): Promise<ObjectRecord[]>` — `GET /objects` (with optional query param)
- `getObject(id: string): Promise<ObjectRecord>` — `GET /objects/${id}`
- `createObject(data: ObjectCreateRequest): Promise<ObjectRecord>` — `POST /objects`
- `updateObject(id: string, data: ObjectUpdateRequest): Promise<ObjectRecord>` — `PUT /objects/${id}`
- `deleteObject(id: string): Promise<void>` — `DELETE /objects/${id}`

**`src/api/equipment.ts`** — exports:

- `getDevices(objectId: string): Promise<ObjectDevice[]>` — `GET /objects/${objectId}/devices`
- `addDevice(objectId: string, data: DeviceAddRequest): Promise<ObjectDevice>` — `POST /objects/${objectId}/devices`
- `updateDevice(objectId: string, deviceTypeId: string, data): Promise<ObjectDevice>` — `PUT /objects/${objectId}/devices/${deviceTypeId}`
- `removeDevice(objectId: string, deviceTypeId: string): Promise<void>` — `DELETE /objects/${objectId}/devices/${deviceTypeId}`
- `getAssignments(objectId: string): Promise<ObjectSystemAssignment[]>` — `GET /objects/${objectId}/assignments`
- `addAssignment(objectId: string, data: AssignmentCreateRequest): Promise<ObjectSystemAssignment>` — `POST /objects/${objectId}/assignments`
- `updateAssignment(objectId: string, assignmentId: string, data): Promise<ObjectSystemAssignment>` — `PUT /objects/${objectId}/assignments/${assignmentId}`
- `removeAssignment(objectId: string, assignmentId: string): Promise<void>` — `DELETE /objects/${objectId}/assignments/${assignmentId}`

**`src/api/records.ts`** — exports:

- `getRecords(objectId: string): Promise<RecordsTask>` — `GET /objects/${objectId}/records`
- `updateRecords(objectId: string, data: RecordsUpdateRequest): Promise<RecordsTask>` — `PUT /objects/${objectId}/records`

**`src/api/repairs.ts`** — exports:

- `getRepairs(objectId: string): Promise<ObjectRepair[]>` — `GET /objects/${objectId}/repairs`
- `updateRepair(objectId: string, repairTypeId: string, data: { count: number }): Promise<ObjectRepair>` — `PUT /objects/${objectId}/repairs/${repairTypeId}`

**`src/api/travel.ts`** — exports:

- `getTravel(objectId: string): Promise<Travel>` — `GET /objects/${objectId}/travel`
- `updateTravel(objectId: string, data: TravelUpdateRequest): Promise<Travel>` — `PUT /objects/${objectId}/travel`

**`src/api/catalog.ts`** — exports:

- `getCatalogDevices(): Promise<DeviceType[]>` — `GET /catalog/devices`
- `getCatalogDevice(id: string): Promise<DeviceType>` — `GET /catalog/devices/${id}`
- `getCatalogDeviceContexts(deviceTypeId: string): Promise<DeviceSystemContext[]>` — `GET /catalog/devices/${deviceTypeId}/contexts`
- `getCatalogRepairs(): Promise<RepairType[]>` — `GET /catalog/repairs`

Each function follows this pattern:

```typescript
import api from "./axios";
import type { Division } from "../types/division";

export async function getDivisions(): Promise<Division[]> {
  const response = await api.get("/divisions");
  return response.data.data;
}
```

- [ ] **Step 4: Create all TanStack Query hooks**

Each hook file exports query hooks and mutation hooks for a domain. All mutations call `queryClient.invalidateQueries` on relevant query keys after success.

**`src/hooks/useAuth.ts`** — exports:

- `useLogin()` — mutation wrapping `login()`. On success: calls `authStore.login(token, user)`.
- `useLogout()` — mutation wrapping `logout()`. On success: calls `authStore.logout()`.
- `useMe()` — query wrapping `getMe()`, enabled only when token exists.

**`src/hooks/useDivisions.ts`** — exports:

- `useDivisions()` — query: `queryKey: ['divisions']`, `queryFn: getDivisions`.
- `useDivision(id)` — query: `queryKey: ['divisions', id]`, `queryFn: () => getDivision(id)`, `enabled: !!id`.
- `useCreateDivision()` — mutation, invalidates `['divisions']` on success.
- `useUpdateDivision()` — mutation, invalidates `['divisions']` and `['divisions', id]` on success.
- `useCreateBranch(divisionId)` — mutation, invalidates `['divisions', divisionId]` on success.

**`src/hooks/useBranches.ts`** — exports:

- `useBranch(id)` — query: `queryKey: ['branches', id]`, `queryFn: () => getBranch(id)`, `enabled: !!id`.
- `useUpdateBranch()` — mutation, invalidates `['branches', id]` and parent division queries.

**`src/hooks/useObjects.ts`** — exports:

- `useObjects(divisionId?)` — query: `queryKey: ['objects', { divisionId }]`, `queryFn: () => getObjects({ divisionId: divisionId })`.
- `useObject(id)` — query: `queryKey: ['objects', id]`, `queryFn: () => getObject(id)`, `enabled: !!id`.
- `useCreateObject()` — mutation, invalidates `['objects']` on success.
- `useUpdateObject()` — mutation, invalidates `['objects']` and `['objects', id]`.
- `useDeleteObject()` — mutation, invalidates `['objects']`.

**`src/hooks/useEquipment.ts`** — exports:

- `useDevices(objectId)` — query: `queryKey: ['objects', objectId, 'devices']`.
- `useAddDevice(objectId)` — mutation, invalidates `['objects', objectId, 'devices']`.
- `useUpdateDevice(objectId)` — mutation, invalidates `['objects', objectId, 'devices']`.
- `useRemoveDevice(objectId)` — mutation, invalidates `['objects', objectId, 'devices']` and `['objects', objectId, 'assignments']`.
- `useAssignments(objectId)` — query: `queryKey: ['objects', objectId, 'assignments']`.
- `useAddAssignment(objectId)` — mutation, invalidates `['objects', objectId, 'assignments']`.
- `useUpdateAssignment(objectId)` — mutation, invalidates `['objects', objectId, 'assignments']`.
- `useRemoveAssignment(objectId)` — mutation, invalidates `['objects', objectId, 'assignments']`.

**`src/hooks/useRecords.ts`** — exports:

- `useRecords(objectId)` — query: `queryKey: ['objects', objectId, 'records']`.
- `useUpdateRecords(objectId)` — mutation, invalidates `['objects', objectId, 'records']`.

**`src/hooks/useRepairs.ts`** — exports:

- `useRepairs(objectId)` — query: `queryKey: ['objects', objectId, 'repairs']`.
- `useUpdateRepair(objectId)` — mutation, invalidates `['objects', objectId, 'repairs']`.

**`src/hooks/useTravel.ts`** — exports:

- `useTravel(objectId)` — query: `queryKey: ['objects', objectId, 'travel']`.
- `useUpdateTravel(objectId)` — mutation, invalidates `['objects', objectId, 'travel']`.

**`src/hooks/useCatalog.ts`** — exports:

- `useCatalogDevices()` — query: `queryKey: ['catalog', 'devices']`, `staleTime: Infinity` (seed data, read-only in PoC).
- `useCatalogDeviceContexts(deviceTypeId)` — query: `queryKey: ['catalog', 'devices', deviceTypeId, 'contexts']`, `enabled: !!deviceTypeId`, `staleTime: Infinity`.
- `useCatalogRepairs()` — query: `queryKey: ['catalog', 'repairs']`, `staleTime: Infinity`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/test/hooks.test.ts
```

Expected: all 5 API module tests pass.

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. All types resolve correctly.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/ frontend/src/hooks/ frontend/src/test/hooks.test.ts
git commit -m "feat: add API modules and TanStack Query hooks for M-01"
```

---

## Task 3: Shared UI components — ConfirmDialog and FormTextField

**Files:**

- Create: `frontend/src/components/common/ConfirmDialog.tsx`
- Create: `frontend/src/components/common/FormTextField.tsx`

These are small reusable components used across multiple pages.

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/common-components.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../components/common/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Удалить объект?"
        message="Будут удалены все связанные данные."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Удалить объект?')).toBeInTheDocument()
    expect(screen.getByText('Будут удалены все связанные данные.')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Confirm"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    await userEvent.click(screen.getByText('Подтвердить'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Confirm"
        message="Sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    await userEvent.click(screen.getByText('Отмена'))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/common-components.test.tsx
```

Expected: import error — components do not exist.

- [ ] **Step 3: Implement ConfirmDialog**

Create `frontend/src/components/common/ConfirmDialog.tsx`:

A MUI `Dialog` component with props: `open: boolean`, `title: string`, `message: string`, `onConfirm: () => void`, `onCancel: () => void`, optional `confirmLabel?: string` (default "Подтвердить"), optional `cancelLabel?: string` (default "Отмена"). Uses MUI `DialogTitle`, `DialogContent`, `DialogContentText`, `DialogActions`, `Button`. Confirm button uses `color="error"` for destructive actions.

- [ ] **Step 4: Implement FormTextField**

Create `frontend/src/components/common/FormTextField.tsx`:

A wrapper component connecting MUI `TextField` with React Hook Form's `Controller`. Props: `name: string`, `control: Control<any>`, `label: string`, and all remaining MUI `TextFieldProps`. Displays field error text from RHF validation state automatically via `helperText`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/test/common-components.test.tsx
```

Expected: all 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/common/ frontend/src/test/common-components.test.tsx
git commit -m "feat: add ConfirmDialog and FormTextField shared components"
```

---

## Task 4: Login page

**Files:**

- Replace: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/LoginPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

// Mock auth API
const mockLogin = vi.fn()
vi.mock('../api/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock auth store
const mockStoreLogin = vi.fn()
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ login: mockStoreLogin, token: null, user: null, isAuthenticated: () => false, logout: vi.fn() }),
}))

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument()
  })

  it('shows validation error on empty submit', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /войти/i }))
    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument()
    })
  })

  it('calls login API and navigates on success', async () => {
    const mockUser = { id: '1', email: 'a@b.com', name: 'Admin', role: 'admin' }
    mockLogin.mockResolvedValueOnce({ token: 'jwt-token', user: mockUser })

    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/пароль/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password' })
    })
  })

  it('shows error message on 401', async () => {
    mockLogin.mockRejectedValueOnce({ response: { status: 401 } })

    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/пароль/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => {
      expect(screen.getByText(/неверный email или пароль/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/LoginPage.test.tsx
```

Expected: LoginPage is a placeholder, tests fail.

- [ ] **Step 3: Implement LoginPage**

Replace `frontend/src/pages/LoginPage.tsx` with a full implementation:

**Behavioral requirements:**

- Centered MUI `Card` with the app title "Система расчёта нагрузки" and "Вход" heading.
- Form using React Hook Form with `zodResolver(LoginRequestSchema)`.
- Two fields: `email` (MUI TextField, label "Email") and `password` (MUI TextField type="password", label "Пароль").
- Submit button: "Войти" (MUI Button, full width, variant="contained").
- On submit: calls `login()` from `src/api/auth.ts`.
- On success: calls `authStore.login(token, user)` then `navigate('/')`.
- On 401 error: displays MUI `Alert` with text "Неверный email или пароль".
- On other errors: displays MUI `Alert` with text "Произошла ошибка. Попробуйте снова.".
- Loading state: button shows `CircularProgress` and is disabled during API call.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/LoginPage.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/test/LoginPage.test.tsx
git commit -m "feat: implement login page with RHF + Zod validation"
```

---

## Task 5: AppLayout update and ProtectedRoute extraction

**Files:**

- Update: `frontend/src/components/layout/AppLayout.tsx`
- Create: `frontend/src/components/layout/ProtectedRoute.tsx`
- Update: `frontend/src/router/index.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/AppLayout.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ logout: vi.fn(), token: 'test', user: { name: 'Admin' }, isAuthenticated: () => true }),
}))

describe('AppLayout', () => {
  it('renders sidebar nav items', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )
    expect(screen.getByText('Дашборд')).toBeInTheDocument()
    expect(screen.getByText('Объекты')).toBeInTheDocument()
    expect(screen.getByText('Подразделения')).toBeInTheDocument()
  })

  it('shows СВОД and Инженеры as disabled nav items in M-01', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )
    // СВОД link should be present but visually muted (disabled in M-01, enabled in M-02)
    const svodItem = screen.getByText('СВОД')
    expect(svodItem).toBeInTheDocument()
    // Инженеры link present but disabled (enabled in M-03)
    const engItem = screen.getByText('Инженеры')
    expect(engItem).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/AppLayout.test.tsx
```

Expected: fails because AppLayout nav items don't have disabled state yet.

- [ ] **Step 3: Update AppLayout**

Update `frontend/src/components/layout/AppLayout.tsx`:

**Changes:**

- Add `disabled?: boolean` property to `navItems`. Set `disabled: true` for "СВОД" (enabled in M-02) and "Инженеры" (enabled in M-03).
- Disabled items: render with `sx={{ opacity: 0.5, pointerEvents: 'none' }}` and add a tooltip "Доступно в следующей версии".
- Show currently logged-in user's name in the AppBar (from `authStore.user.name`).
- Leave all other behavior (Drawer, Outlet, logout button) unchanged.

- [ ] **Step 4: Extract ProtectedRoute**

Create `frontend/src/components/layout/ProtectedRoute.tsx`:

Extract the inline `ProtectedRoute` function from `router/index.tsx` into its own component file. Same logic: reads `isAuthenticated` from `authStore`, redirects to `/login` if not authenticated.

Update `frontend/src/router/index.tsx` to import `ProtectedRoute` from the new location instead of defining it inline.

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/test/AppLayout.test.tsx
```

Expected: all tests pass.

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/router/index.tsx frontend/src/test/AppLayout.test.tsx
git commit -m "feat: update AppLayout with disabled nav items and extract ProtectedRoute"
```

---

## Task 6: Division list page

**Files:**

- Replace: `frontend/src/pages/DivisionListPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/DivisionListPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DivisionListPage from '../pages/DivisionListPage'

const mockGetDivisions = vi.fn()
const mockCreateDivision = vi.fn()

vi.mock('../api/divisions', () => ({
  getDivisions: (...args: unknown[]) => mockGetDivisions(...args),
  createDivision: (...args: unknown[]) => mockCreateDivision(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DivisionListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDivisions.mockResolvedValue([
      { id: '1', name: 'Подразделение 1', branchCount: 3, objectCount: 50 },
      { id: '2', name: 'Подразделение 2', branchCount: 1, objectCount: 10 },
    ])
  })

  it('renders division list with data', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Подразделение 1')).toBeInTheDocument()
      expect(screen.getByText('Подразделение 2')).toBeInTheDocument()
    })
  })

  it('opens create dialog when button clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Подразделение 1')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Добавить подразделение'))
    expect(screen.getByLabelText(/название/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/DivisionListPage.test.tsx
```

Expected: placeholder page, tests fail.

- [ ] **Step 3: Implement DivisionListPage**

Replace `frontend/src/pages/DivisionListPage.tsx`:

**Behavioral requirements:**

- Page heading: "Подразделения".
- MUI `Table` (or `DataGrid`) listing all divisions from `useDivisions()` hook.
- Columns: Название (name), Филиалов (branchCount), Объектов (objectCount).
- Row click navigates to `/divisions/:id`.
- "Добавить подразделение" MUI `Button` above the table. Opens a MUI `Dialog` with a single "Название" field (React Hook Form + `DivisionCreateSchema`). Confirm creates via `useCreateDivision()` mutation. On success: dialog closes, list refreshes via query invalidation.
- Loading state: MUI `CircularProgress` while fetching.
- Empty state: "Нет подразделений" message when list is empty.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/DivisionListPage.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DivisionListPage.tsx frontend/src/test/DivisionListPage.test.tsx
git commit -m "feat: implement division list page with create dialog"
```

---

## Task 7: Division detail page

**Files:**

- Replace: `frontend/src/pages/DivisionDetailPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/DivisionDetailPage.test.tsx`:

Test setup: mock `useDivision(id)` returning a division with branches. Mock `useParams` to return `{ id: 'div-1' }`.

**Tests:**

- `renders division name as heading` — verifies the division name appears in an `h` element.
- `renders branch table with object counts` — verifies branch rows show name and objectCount.
- `opens create branch dialog` — clicks "Добавить филиал" button, verifies dialog with name field appears.
- `navigates to branch detail on row click` — clicks a branch row, verifies `navigate('/branches/branch-1')` called.
- `allows inline editing of division name` — clicks edit icon, changes name, saves, verifies `updateDivision` mutation called.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/DivisionDetailPage.test.tsx
```

Expected: placeholder page, tests fail.

- [ ] **Step 3: Implement DivisionDetailPage**

Replace `frontend/src/pages/DivisionDetailPage.tsx`:

**Behavioral requirements:**

- Reads `id` from `useParams()`.
- Uses `useDivision(id)` to fetch division detail (includes branches).
- Page heading: division name with an edit icon button. Clicking edit: name becomes an inline text field, save/cancel buttons appear. Save calls `useUpdateDivision()`.
- Breadcrumb: "Подразделения" (link to `/divisions`) > "Division Name".
- Branch list: MUI `Table` with columns: Название (name), Объектов (objectCount). Row click navigates to `/branches/:id`.
- "Добавить филиал" button opens dialog with "Название" field (RHF + `BranchCreateSchema`). Confirm calls `useCreateBranch(divisionId)`.
- Loading state: `CircularProgress`. 404: "Подразделение не найдено" message.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/DivisionDetailPage.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DivisionDetailPage.tsx frontend/src/test/DivisionDetailPage.test.tsx
git commit -m "feat: implement division detail page with branch list"
```

---

## Task 8: Branch detail page

**Files:**

- Replace: `frontend/src/pages/BranchDetailPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/BranchDetailPage.test.tsx`:

Test setup: mock `useBranch(id)` returning a branch with `objects.data` list. Mock `useParams` to return `{ id: 'br-1' }`.

**Tests:**

- `renders branch name and division breadcrumb` — verifies branch name heading and "Подразделения > Division Name > Branch Name" breadcrumb.
- `renders object list table` — verifies object rows with name and ИТОГО column (shows "-" in M-01 since summaries don't exist yet).
- `opens create object form` — clicks "Добавить объект" button, verifies form appears with name field.
- `navigates to object detail on row click` — clicks object row, verifies navigation to `/objects/:id`.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/BranchDetailPage.test.tsx
```

- [ ] **Step 3: Implement BranchDetailPage**

Replace `frontend/src/pages/BranchDetailPage.tsx`:

**Behavioral requirements:**

- Reads `id` from `useParams()`.
- Uses `useBranch(id)` to fetch branch detail with paginated objects.
- Breadcrumb: "Подразделения" > division name (link to `/divisions/:divisionId`) > branch name.
- Branch name heading with edit icon. Inline edit saves via `useUpdateBranch()`.
- Object table: columns: Название (name), ИТОГО Числ (с дорогой) — shows `itogoChisloWithTravel` if available, else "-" (no summaries until M-02). Row click navigates to `/objects/:id`.
- "Добавить объект" button opens a dialog/form with "Название" field and branch is pre-selected (this branch). Confirm calls `useCreateObject()` with `branchId = this branch's id`.
- Loading/error/empty states.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/BranchDetailPage.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/BranchDetailPage.tsx frontend/src/test/BranchDetailPage.test.tsx
git commit -m "feat: implement branch detail page with object list"
```

---

## Task 9: Object list page

**Files:**

- Replace: `frontend/src/pages/ObjectListPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/ObjectListPage.test.tsx`:

Test setup: mock `useObjects()` returning a list of objects. Mock `useDivisions()` for filter dropdown.

**Tests:**

- `renders object table with name and address` — verifies object rows appear.
- `filters by division` — selects a division in the filter dropdown, verifies `getObjects` called with `divisionId`.
- `navigates to object detail on row click` — clicks row, verifies navigation.
- `opens create object dialog` — clicks "Добавить объект", verifies form with name and branch selection fields.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/ObjectListPage.test.tsx
```

- [ ] **Step 3: Implement ObjectListPage**

Replace `frontend/src/pages/ObjectListPage.tsx`:

**Behavioral requirements:**

- Page heading: "Объекты".
- Division filter dropdown above the table. Uses `useDivisions()` for options. "Все подразделения" default. Selecting a division passes `divisionId` to `useObjects(divisionId)`.
- MUI DataGrid with columns: Название (name), Подразделение (divisionName), Филиал (branchName), ИТОГО Числ — shows "-" in M-01. Sortable columns. Row click navigates to `/objects/:id`.
- "Добавить объект" button opens a dialog with fields: Название (text, required), Филиал (dropdown of all branches grouped by division — use `useDivisions()` and expand each to get branches). Confirm calls `useCreateObject()`.
- Loading/empty states.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/ObjectListPage.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ObjectListPage.tsx frontend/src/test/ObjectListPage.test.tsx
git commit -m "feat: implement object list page with division filter"
```

---

## Task 10: Object detail page — 6-tab layout shell

**Files:**

- Replace: `frontend/src/pages/ObjectDetailPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/ObjectDetailPage.test.tsx`:

Test setup: mock `useObject(id)` returning an object. Mock `useParams` to return `{ id: 'obj-1' }`.

**Tests:**

- `renders object name as heading` — verifies the object name appears.
- `renders 6 tabs` — verifies tab labels: "Оборудование", "Записи", "Ремонт", "Дорога", "Инженеры", "СВОД".
- `defaults to Equipment tab` — Оборудование tab is active by default.
- `shows placeholder for Engineers tab` — clicking Инженеры tab shows "Доступно в M-03" placeholder.
- `shows placeholder for СВОД tab` — clicking СВОД tab shows "Доступно в M-02" placeholder.
- `shows delete button` — verifies a "Удалить объект" button is present.
- `confirms before deleting` — clicking delete opens ConfirmDialog; confirming calls `useDeleteObject()`.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/ObjectDetailPage.test.tsx
```

- [ ] **Step 3: Implement ObjectDetailPage**

Replace `frontend/src/pages/ObjectDetailPage.tsx`:

**Behavioral requirements:**

- Reads `id` from `useParams()`. Uses `useObject(id)` to fetch.
- If route is `/objects/new`, renders create form instead of detail tabs (RHF + `ObjectCreateSchema`).
- If route is `/objects/:id/edit`, renders edit form (RHF + `ObjectUpdateSchema`, prefilled).
- Otherwise (`/objects/:id`): renders detail view with:
  - Breadcrumb: "Объекты" > object name.
  - Object name heading with inline edit.
  - "Удалить объект" button (MUI Button, color="error"). Opens `ConfirmDialog` with message "Будут удалены все связанные данные: оборудование, записи, ремонт, дорога. Продолжить?". Confirm calls `useDeleteObject()`, on success navigates to `/objects`.
  - MUI `Tabs` with 6 tabs:
    1. **Оборудование** — renders `EquipmentTab` component (Task 11).
    2. **Записи** — renders `RecordsTab` component (Task 12).
    3. **Ремонт** — renders `RepairsTab` component (Task 13).
    4. **Дорога** — renders `TravelTab` component (Task 14).
    5. **Инженеры** — placeholder: `Typography` "Доступно в M-03".
    6. **СВОД** — placeholder: `Typography` "Доступно в M-02".
- Loading/404 states.

Note: Tab content components (EquipmentTab, RecordsTab, etc.) are stub imports in this task — they will be implemented in Tasks 11–14. Create minimal stub components that export a named function returning a `<div>` with the tab name, so the page compiles.

- [ ] **Step 4: Create tab component stubs**

Create minimal stubs so ObjectDetailPage compiles:

- `frontend/src/components/equipment/EquipmentTab.tsx` — `export function EquipmentTab({ objectId }: { objectId: string }) { return <div>Оборудование — loading...</div> }`
- `frontend/src/components/records/RecordsTab.tsx` — `export function RecordsTab({ objectId }: { objectId: string }) { return <div>Записи — loading...</div> }`
- `frontend/src/components/repairs/RepairsTab.tsx` — `export function RepairsTab({ objectId }: { objectId: string }) { return <div>Ремонт — loading...</div> }`
- `frontend/src/components/travel/TravelTab.tsx` — `export function TravelTab({ objectId }: { objectId: string }) { return <div>Дорога — loading...</div> }`

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/test/ObjectDetailPage.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ObjectDetailPage.tsx frontend/src/components/equipment/ frontend/src/components/records/ frontend/src/components/repairs/ frontend/src/components/travel/ frontend/src/test/ObjectDetailPage.test.tsx
git commit -m "feat: implement object detail page with 6-tab layout"
```

---

## Task 11: Equipment tab — two-layer UI

**Files:**

- Replace: `frontend/src/components/equipment/EquipmentTab.tsx`
- Create: `frontend/src/components/equipment/PhysicalInventory.tsx`
- Create: `frontend/src/components/equipment/SystemAssignments.tsx`

This is the most complex UI in M-01. It implements the two-layer equipment model from ui-spec.md §7.3.

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/EquipmentTab.test.tsx`:

Test setup: mock all equipment and catalog hooks. Provide test data:

- `useCatalogDevices()` returns 3 device types.
- `useDevices(objectId)` returns 2 devices in inventory.
- `useAssignments(objectId)` returns 1 assignment.
- `useCatalogDeviceContexts(deviceTypeId)` returns contexts for each device.

**Tests (Section A — Physical Inventory):**

- `renders device inventory table` — verifies device name, quantityPhysical columns shown.
- `add device dropdown shows only devices NOT already in inventory` — clicks "+ Добавить устройство", dropdown options exclude devices already in inventory. Only the 3rd unassigned device appears.
- `add device calls useAddDevice mutation` — selects a device from dropdown, enters quantity, clicks add. Verifies `addDevice` API called with correct payload.
- `delete device shows confirmation listing affected assignments` — device with an assignment: delete button shows ConfirmDialog message "Это удалит назначения: ОС × 1. Продолжить?".
- `delete device disabled when assignments exist` — (if design choice is to disable) OR shows warning dialog.

**Tests (Section B — System Assignments):**

- `renders assignments grouped by device` — verifies assignment rows show device name, system type, quantityMaintained, R1/R2 read-only values.
- `assign-to-system dropdown shows only valid system types` — for a device with contexts only for OS and PS, dropdown shows only "ОС" and "ПС" (not "Видео"). If OS already assigned, only "ПС" remains (AC-13).
- `shows error on DEVICE_NOT_IN_INVENTORY` — when `addAssignment` returns 422 `DEVICE_NOT_IN_INVENTORY`, displays "Устройство не в инвентаре".
- `shows error on NO_CONTEXT_FOR_SYSTEM` — when `addAssignment` returns 422 `NO_CONTEXT_FOR_SYSTEM`, displays "Нет нормативов для этой системы".
- `shows warning when quantityMaintained > quantityPhysical` — assignment row with quantityMaintained=2 but device's quantityPhysical=1 shows a warning icon with tooltip "Обслуживаемое количество (2) превышает физическое (1)".

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/EquipmentTab.test.tsx
```

- [ ] **Step 3: Implement PhysicalInventory component**

Create `frontend/src/components/equipment/PhysicalInventory.tsx`:

**Props:** `objectId: string`.

**Behavioral requirements:**

- Uses `useDevices(objectId)` for current inventory.
- Uses `useCatalogDevices()` for the full device catalog.
- Renders a MUI `Table` with columns: Устройство (device name), Физ. кол-во (quantityPhysical), Действия. (`quantityMaintained` is on `object_system_assignments`, shown in Section B — not on `object_devices`.)
- "+ Добавить устройство" button above the table. Opens inline form or dialog:
  - Device dropdown: MUI `Autocomplete` searchable. Options = catalog devices filtered to exclude those already in inventory at this object.
  - Quantity field: integer ≥ 1.
  - Confirm calls `useAddDevice(objectId)` with `{ deviceTypeId, quantityPhysical }`.
- Inline editing of `quantityPhysical` per row. Save on blur or enter. Calls `useUpdateDevice(objectId)`. (`quantityMaintained` is edited per assignment in Section B.)
- Remove button per row. If device has any assignments (check `useAssignments(objectId)` data), show `ConfirmDialog` listing affected assignments: "Это удалит назначения: {list}. Продолжить?". Confirm calls `useRemoveDevice(objectId, deviceTypeId)`.

- [ ] **Step 4: Implement SystemAssignments component**

Create `frontend/src/components/equipment/SystemAssignments.tsx`:

**Props:** `objectId: string`.

**Behavioral requirements:**

- Uses `useAssignments(objectId)` for current assignments.
- Uses `useDevices(objectId)` for the physical inventory (determines which devices can be assigned).
- Groups assignments by deviceTypeId. For each device in inventory, shows its assignments and an "+ Назначить в систему" action.
- System type dropdown (per device): shows only system types that have a valid `device_system_contexts` row (uses `useCatalogDeviceContexts(deviceTypeId)`) AND are not already assigned for this device at this object. Hidden entirely if no valid options remain.
- Each assignment row shows: Система (ОС/ПС/Видео), Кол-во обсл. (quantityMaintained, editable), Р1 (read-only from context), Р2 (read-only from context), Действия (remove button).
- quantityMaintained editable inline. Save calls `useUpdateAssignment(objectId)`.
- Remove button calls `useRemoveAssignment(objectId, assignmentId)`.
- **Warning rule:** When `quantityMaintained > quantityPhysical` for the parent device, show yellow ⚠ icon with MUI `Tooltip`: "Обслуживаемое количество (N) превышает физическое (M)".
- **Error handling:** On 422 `DEVICE_NOT_IN_INVENTORY`: MUI `Alert` "Устройство не в инвентаре". On 422 `NO_CONTEXT_FOR_SYSTEM`: MUI `Alert` "Нет нормативов для этой системы".
- **System type display mapping:** `OS` → "ОС", `PS` → "ПС", `VIDEO` → "Видео".

- [ ] **Step 5: Replace EquipmentTab stub**

Update `frontend/src/components/equipment/EquipmentTab.tsx` to compose `PhysicalInventory` and `SystemAssignments`:

```tsx
import { PhysicalInventory } from "./PhysicalInventory";
import { SystemAssignments } from "./SystemAssignments";
import { Typography, Divider, Box } from "@mui/material";

export function EquipmentTab({ objectId }: { objectId: string }) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Физическое оборудование
      </Typography>
      <PhysicalInventory objectId={objectId} />
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>
        Назначения в системы
      </Typography>
      <SystemAssignments objectId={objectId} />
    </Box>
  );
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npx vitest run src/test/EquipmentTab.test.tsx
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/equipment/ frontend/src/test/EquipmentTab.test.tsx
git commit -m "feat: implement two-layer equipment tab (physical inventory + system assignments)"
```

---

## Task 12: Records tab

**Files:**

- Replace: `frontend/src/components/records/RecordsTab.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/RecordsTab.test.tsx`:

Test setup: mock `useRecords(objectId)` returning records data. Mock `useUpdateRecords`.

**Tests:**

- `renders 5 numeric fields with current values` — verifies fields for accessRequests, monitoringRequests, footageRequests, backupControl, securityAdmin are rendered and show current values.
- `validates non-negative integers` — enters -1 in a field, verifies validation error shown.
- `save button calls updateRecords mutation` — fills valid values, clicks "Сохранить", verifies mutation called with correct payload.
- `shows loading state while fetching` — verifies CircularProgress shown when data is loading.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/RecordsTab.test.tsx
```

- [ ] **Step 3: Implement RecordsTab**

Replace `frontend/src/components/records/RecordsTab.tsx`:

**Props:** `objectId: string`.

**Behavioral requirements:**

- Uses `useRecords(objectId)` to fetch current data. Uses `useUpdateRecords(objectId)` for saves.
- Form using React Hook Form with `zodResolver(RecordsUpdateSchema)`.
- 5 MUI `TextField` fields (type="number"), each labeled in Russian:
  - "Доступ" (accessRequests)
  - "Мониторинг" (monitoringRequests)
  - "Видеонаблюдение" (footageRequests)
  - "Резервное копирование" (backupControl)
  - "Администрирование" (securityAdmin)
- All fields require integers ≥ 0.
- "Сохранить" button. On submit: calls `useUpdateRecords(objectId)` with form values.
- On success: MUI `Snackbar` "Данные сохранены".
- Form is pre-filled with current values from API (via `useEffect` + `reset()` when data loads).
- Loading: `CircularProgress` while fetching. Shows empty form if no records exist yet (all zeros).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/RecordsTab.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/records/ frontend/src/test/RecordsTab.test.tsx
git commit -m "feat: implement records tab with RHF form"
```

---

## Task 13: Repairs tab

**Files:**

- Replace: `frontend/src/components/repairs/RepairsTab.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/RepairsTab.test.tsx`:

Test setup: mock `useCatalogRepairs()` returning 3 repair types. Mock `useRepairs(objectId)` returning current counts (may be empty at first). Mock `useUpdateRepair`.

**Tests:**

- `renders a row for every repair type from catalog` — verifies all 3 repair type names shown (dynamic from catalog, not hardcoded — per ui-spec §7.10).
- `shows current count for each repair type` — pre-filled from `useRepairs` data, or 0 if no `object_repairs` row exists for that type.
- `validates non-negative integer` — enters -1, verifies error.
- `save calls updateRepair for changed rows` — changes count for one repair type, clicks save, verifies mutation called with `{ count: newValue }`.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/RepairsTab.test.tsx
```

- [ ] **Step 3: Implement RepairsTab**

Replace `frontend/src/components/repairs/RepairsTab.tsx`:

**Props:** `objectId: string`.

**Behavioral requirements:**

- Uses `useCatalogRepairs()` to get the full list of repair types (seed data, read-only).
- Uses `useRepairs(objectId)` to get current counts for this object.
- Uses `useUpdateRepair(objectId)` for saving.
- Renders a MUI `Table` with columns: Вид ремонта (repair type name), Время (мин) (timeMinutes, read-only from catalog), Количество (count, editable integer input ≥ 0).
- Each row corresponds to a repair type from the catalog. The count field shows the existing `object_repairs.count` for that type, or 0 if no row exists.
- "Сохранить" button at the bottom (or per-row save). On click: for each changed row, calls `PUT /objects/{objectId}/repairs/{repairTypeId}` with `{ count }`.
- Alternatively: save-per-row — each row has a small save icon that appears when the value changes.
- Shows "Нет видов ремонта" if catalog is empty (shouldn't happen with seed data).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/RepairsTab.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/repairs/ frontend/src/test/RepairsTab.test.tsx
git commit -m "feat: implement repairs tab with dynamic repair type list"
```

---

## Task 14: Travel tab

**Files:**

- Replace: `frontend/src/components/travel/TravelTab.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/TravelTab.test.tsx`:

Test setup: mock `useTravel(objectId)` and `useUpdateTravel`.

**Tests:**

- `renders 3 editable fields and 1 read-only field` — verifies "Тип транспорта", "Расстояние (км)", "Время в одну сторону (мин)" are editable, and "Время в оба конца (мин)" is read-only.
- `roundTripMin is never editable` — the roundTripMin field has no input, just a display value. Verifies it is not an input element.
- `roundTripMin shows computed value from API` — when travel data has `oneWayTimeMin: 15`, shows "30 мин (авторасчёт)" for round trip.
- `validates non-negative values` — enters negative distance, verifies error.
- `save calls updateTravel mutation` — fills valid data, saves. Verifies mutation payload has `transportType`, `distanceKm`, `oneWayTimeMin` but NOT `roundTripMin`.
- `shows empty form when no travel data exists` — all fields empty/zero when API returns null.

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/TravelTab.test.tsx
```

- [ ] **Step 3: Implement TravelTab**

Replace `frontend/src/components/travel/TravelTab.tsx`:

**Props:** `objectId: string`.

**Behavioral requirements:**

- Uses `useTravel(objectId)` and `useUpdateTravel(objectId)`.
- Form using React Hook Form with `zodResolver(TravelUpdateSchema)`.
- Fields:
  - "Тип транспорта" — MUI `TextField` (text input).
  - "Расстояние (км)" — MUI `TextField` (type="number", ≥ 0).
  - "Время в одну сторону (мин)" — MUI `TextField` (type="number", ≥ 0).
  - "Время в оба конца (мин)" — **read-only display only**: `Typography` showing `roundTripMin` value from API response + " (авторасчёт)". This is NEVER an input field. roundTripMin is never sent to the API (AC-27).
- "Сохранить" button. Payload: `{ transportType, distanceKm, oneWayTimeMin }` (no `roundTripMin`).
- On success: `Snackbar` "Данные сохранены". Form refreshes with updated data including new `roundTripMin` from API.
- Pre-filled from API data. Empty form if no travel data exists yet.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/TravelTab.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/travel/ frontend/src/test/TravelTab.test.tsx
git commit -m "feat: implement travel tab with read-only roundTripMin"
```

---

## Task 15: Dashboard page — minimal M-01 version

**Files:**

- Replace: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/DashboardPage.test.tsx`:

**Tests:**

- `renders welcome heading` — verifies page shows "Дашборд" heading.
- `renders division summary table` — uses `useDivisions()` to show a simple table with division names and object counts.
- `shows placeholder for M-02 aggregation data` — before M-02 backend exists, aggregation endpoints don't exist. Dashboard shows division list from `GET /divisions` as a basic overview. Areas that will show FTE data display "Данные будут доступны после расчёта".

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/DashboardPage.test.tsx
```

- [ ] **Step 3: Implement DashboardPage**

Replace `frontend/src/pages/DashboardPage.tsx`:

**Behavioral requirements (M-01 version — minimal):**

- Page heading: "Дашборд".
- Section 1: "Подразделения" — simple table from `useDivisions()`: Division name, Branch count, Object count. Row click navigates to `/divisions/:id`.
- Section 2: placeholder MUI `Paper`: "FTE по подразделениям — доступно после M-02".
- Section 3: placeholder MUI `Paper`: "Непокрытые объекты — доступно после M-03".
- This page will be significantly enhanced in M-02 (aggregation data) and M-03 (engineer gaps). The M-01 version provides basic navigation value only.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/DashboardPage.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/test/DashboardPage.test.tsx
git commit -m "feat: implement minimal M-01 dashboard with division overview"
```

---

## Task 16: Run all quality gates

**Files:**

- No new files — quality verification only.

- [ ] **Step 1: Auto-format all files**

```bash
cd frontend
npm run format
```

Expected: Prettier formats all files. No errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: ESLint exits 0. No `any` usage, no unused imports, no disabled rules without comments.

- [ ] **Step 3: TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. All types resolve correctly across all new files.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all Vitest tests pass. Count should be ≥ 30 tests across all test files:

- `api.test.ts` (2 — existing)
- `types.test.ts` (5)
- `hooks.test.ts` (5)
- `common-components.test.tsx` (3)
- `LoginPage.test.tsx` (4)
- `AppLayout.test.tsx` (2)
- `DivisionListPage.test.tsx` (2)
- `DivisionDetailPage.test.tsx` (5)
- `BranchDetailPage.test.tsx` (4)
- `ObjectListPage.test.tsx` (4)
- `ObjectDetailPage.test.tsx` (7)
- `EquipmentTab.test.tsx` (10)
- `RecordsTab.test.tsx` (4)
- `RepairsTab.test.tsx` (4)
- `TravelTab.test.tsx` (6)
- `DashboardPage.test.tsx` (3)

If any gate fails, fix the issue and re-run before proceeding.

- [ ] **Step 5: Final format pass (if any fixes were needed)**

```bash
npm run format
npm run lint
npx tsc --noEmit
npm test
```

- [ ] **Step 6: Commit any quality-gate fixes**

```bash
git add -A
git commit -m "chore: fix quality gate issues"
```

(Skip if no fixes were needed.)

- [ ] **Step 7: Push branch**

```bash
git push -u origin feature/poc-m01-frontend
```

Expected: branch pushed successfully. Ready for PR to `feature/implementation`.
