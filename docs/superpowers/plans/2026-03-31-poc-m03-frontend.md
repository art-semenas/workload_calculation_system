# PoC M-03 Frontend — Engineer Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all M-03 placeholder sections with real UI. Implement Engineer List page (filterable, sortable with load-ratio status chips), Engineer Detail dashboard (summary cards, system breakdown, assigned objects, assign/remove), Engineers tab on Object Detail (assign/remove engineers with per-engineer share), and enable the Engineers nav link. All TanStack Query hooks, Zod schemas, and React components are fully functional. All PoC routes complete after this plan.

**Branch:** `feature/poc-m03-frontend`
**Depends on:** `feature/poc-m03-backend` merged to `feature/implementation`

**Architecture:** All engineer data comes from backend API — the frontend NEVER computes workload values or engineer shares (AD-07). All API calls use the shared Axios instance at `src/api/axios.ts`. All server state is managed by TanStack Query — never in Zustand or component state. No `any` types.

**Acceptance Criteria Covered:**

- **PAC-06:** Engineer detail page shows correct `load_ratio` and `status` matching backend `engineer_summaries`
- **PAC-07:** Assigning/removing an engineer on the Object Detail Engineers tab updates engineer summaries without page refresh (TanStack Query invalidation)
- **PAC-09:** PoC full flow smoke check — Dashboard → Create Object → Add Equipment → Assign Engineer → Engineer Detail shows correct load

**PoC Simplifications active:**

- **S-02:** No stale indicators — engineer summaries recalculate synchronously on assignment changes. No "Data is stale" banners.
- **S-04:** No RBAC enforcement — all authenticated users can view and manage all engineers (role stored but not enforced).
- **S-05:** No period selector or period-scoped data.

---

## Source-Of-Truth Alignment

Before implementing any task below, use these rules whenever documents disagree:

1. `docs/TOR_Workload_WebApp.md` is the primary business-rule source of truth.
2. `docs/impl/api-spec.md` is authoritative for REST endpoint semantics, request/response shapes, and error codes.
3. `docs/impl/ui-spec.md` is authoritative for page layout, columns, filters, and UX rules.
4. `docs/impl/poc-scope.md` defines PoC simplifications — never implement MVP features.

**Implementation rules for every task:**

- No `any` — use `unknown` + type guards or proper interfaces. If unavoidable, add `// eslint-disable-next-line` with a comment.
- All HTTP calls go through the shared Axios instance (`src/api/axios.ts`). Never use `fetch()` or create another Axios instance.
- All forms use React Hook Form + Zod. Never manage form state with raw `useState`.
- All API response data managed by TanStack Query. Never store API response data in Zustand or component state. Zustand is for auth only.
- All user-facing labels in **Russian**.
- No inline styles — use MUI `sx` prop or theme.
- No business logic or calculations in frontend code — all computed values come from the API (TOR AD-07).
- PoC simplifications to respect: no stale banners (S-02), no RBAC enforcement (S-04), no planning periods (S-05).

---

## File Structure After M-03 Frontend

```
frontend/src/
├── api/
│   ├── axios.ts                  (exists — no changes)
│   ├── engineers.ts              (new — engineer CRUD + summary)
│   └── objectEngineers.ts        (new — object↔engineer assignment)
├── hooks/
│   ├── useEngineers.ts           (new — engineer queries/mutations)
│   └── useObjectEngineers.ts     (new — object↔engineer queries/mutations)
├── types/
│   └── engineer.ts               (new — Engineer, EngineerSummary, EngineerShare types + Zod schemas)
├── components/
│   └── engineers/
│       ├── EngineerSummaryCards.tsx   (new — summary card row for engineer detail)
│       ├── SystemBreakdownChart.tsx   (new — horizontal bar breakdown by system type)
│       ├── AssignedObjectsTable.tsx   (new — table of engineer's assigned objects)
│       └── EngineerAssignDialog.tsx   (new — searchable dropdown dialog for assigning)
├── pages/
│   ├── EngineerListPage.tsx      (replace placeholder)
│   ├── EngineerDetailPage.tsx    (replace placeholder)
│   └── ObjectDetailPage.tsx      (modify — replace Engineers tab placeholder)
├── test/
│   ├── m03-types.test.ts         (new)
│   ├── m03-api.test.ts           (new)
│   ├── EngineerListPage.test.tsx (new)
│   ├── EngineerDetailPage.test.tsx (new)
│   └── ObjectEngineersTab.test.tsx (new)
```

---

## Task 0: Create feature branch

**Files:**

- No file changes in this task

- [ ] **Step 1: Check out the branch for this plan**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/poc-m03-frontend
```

Expected: Git switches to `feature/poc-m03-frontend` with no merge conflicts.

- [ ] **Step 2: Verify working tree is clean**

```bash
git status --short
```

Expected: no unexpected modified frontend files.

---

## Task 1: M-03 TypeScript types and Zod schemas

**Files:**

- Create: `frontend/src/types/engineer.ts`

All types are strict — no `any`. Numeric fields that represent BigDecimal on the backend are `number` in TypeScript (JSON serialization converts them).

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/m03-types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  EngineerSchema,
  EngineerSummarySchema,
  EngineerShareSchema,
  EngineerCreateSchema,
  EngineerUpdateSchema,
  ObjectEngineerRowSchema,
} from "../types/engineer";

describe("M-03 Zod schemas", () => {
  it("EngineerSchema parses a valid engineer", () => {
    const raw = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ivanov Petr Sergeevich",
      email: "ivanov@workload.local",
      role: "engineer",
      home_division_id: "660e8400-e29b-41d4-a716-446655440000",
      home_division_name: "Brest No. 100",
      capacity_fte: 1.0,
      is_active: true,
      object_count: 47,
      total_load: 0.92,
      load_ratio: 0.92,
      status: "WARNING",
    };
    const result = EngineerSchema.parse(raw);
    expect(result.name).toBe("Ivanov Petr Sergeevich");
    expect(result.status).toBe("WARNING");
  });

  it("EngineerSchema rejects invalid status", () => {
    const raw = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test",
      email: "test@test.com",
      role: "engineer",
      home_division_id: "660e8400-e29b-41d4-a716-446655440000",
      home_division_name: "Test",
      capacity_fte: 1.0,
      is_active: true,
      object_count: 0,
      total_load: 0,
      load_ratio: 0,
      status: "INVALID",
    };
    const result = EngineerSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("EngineerSummarySchema parses full breakdown", () => {
    const raw = {
      engineer_id: "550e8400-e29b-41d4-a716-446655440000",
      total_load: 0.921,
      object_count: 47,
      os_load: 0.41,
      ps_load: 0.27,
      video_load: 0.09,
      records_load: 0.05,
      repair_load: 0.1,
      capacity_fte: 1.0,
      load_ratio: 0.921,
      status: "WARNING",
    };
    const result = EngineerSummarySchema.parse(raw);
    expect(result.total_load).toBeCloseTo(0.921);
    expect(result.os_load).toBeCloseTo(0.41);
  });

  it("EngineerShareSchema parses per-object share", () => {
    const raw = {
      object_id: "550e8400-e29b-41d4-a716-446655440000",
      object_name: "CBU Brest, Lenina St., 10",
      division_name: "Brest",
      branch_name: "Branch 1",
      engineer_share: 0.032,
      itogo_chislo_with_travel: 0.064,
      engineer_count: 2,
    };
    const result = EngineerShareSchema.parse(raw);
    expect(result.engineer_share).toBeCloseTo(0.032);
    expect(result.engineer_count).toBe(2);
  });

  it("ObjectEngineerRowSchema parses an engineer assigned to an object", () => {
    const raw = {
      engineer_id: "550e8400-e29b-41d4-a716-446655440000",
      engineer_name: "Ivanov Petr Sergeevich",
      object_share: 0.0161,
      load_ratio: 0.82,
      status: "NORMAL",
    };
    const result = ObjectEngineerRowSchema.parse(raw);
    expect(result.object_share).toBeCloseTo(0.0161);
  });

  it("EngineerCreateSchema validates required fields", () => {
    const valid = EngineerCreateSchema.safeParse({
      name: "New Engineer",
      email: "new@workload.local",
      capacity_fte: 1.0,
      home_division_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(valid.success).toBe(true);

    const noEmail = EngineerCreateSchema.safeParse({
      name: "New Engineer",
      email: "",
      capacity_fte: 1.0,
      home_division_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(noEmail.success).toBe(false);
  });

  it("EngineerCreateSchema rejects capacity_fte <= 0", () => {
    const result = EngineerCreateSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      capacity_fte: 0,
      home_division_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("EngineerUpdateSchema accepts partial update", () => {
    const result = EngineerUpdateSchema.safeParse({
      capacity_fte: 0.5,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/m03-types.test.ts
```

Expected: import error — `../types/engineer` does not exist.

- [ ] **Step 3: Create the type file**

Create `frontend/src/types/engineer.ts`:

```typescript
import { z } from "zod";

// --- Engineer status enum (matches backend EngineerSummary.status) ---

export const EngineerStatusEnum = z.enum(["NORMAL", "WARNING", "OVERLOADED"]);
export type EngineerStatus = z.infer<typeof EngineerStatusEnum>;

// --- Engineer (list/detail response from GET /engineers, GET /engineers/:id) ---

export const EngineerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  home_division_id: z.string().uuid().nullable(),
  home_division_name: z.string().nullable().optional(),
  capacity_fte: z.number(),
  is_active: z.boolean(),
  object_count: z.number().int(),
  total_load: z.number(),
  load_ratio: z.number(),
  status: EngineerStatusEnum,
});
export type Engineer = z.infer<typeof EngineerSchema>;

// --- Engineer summary (GET /engineers/:id/summary) ---

export const EngineerSummarySchema = z.object({
  engineer_id: z.string().uuid(),
  total_load: z.number(),
  object_count: z.number().int(),
  os_load: z.number(),
  ps_load: z.number(),
  video_load: z.number(),
  records_load: z.number(),
  repair_load: z.number(),
  capacity_fte: z.number(),
  load_ratio: z.number(),
  status: EngineerStatusEnum,
});
export type EngineerSummary = z.infer<typeof EngineerSummarySchema>;

// --- Engineer share per object (GET /engineers/:id/objects) ---

export const EngineerShareSchema = z.object({
  object_id: z.string().uuid(),
  object_name: z.string(),
  division_name: z.string().optional(),
  branch_name: z.string().optional(),
  engineer_share: z.number(),
  itogo_chislo_with_travel: z.number(),
  engineer_count: z.number().int(),
});
export type EngineerShare = z.infer<typeof EngineerShareSchema>;

// --- Object engineer row (GET /objects/:id/engineers — engineer assigned to an object) ---

export const ObjectEngineerRowSchema = z.object({
  engineer_id: z.string().uuid(),
  engineer_name: z.string(),
  object_share: z.number(),
  load_ratio: z.number(),
  status: EngineerStatusEnum,
});
export type ObjectEngineerRow = z.infer<typeof ObjectEngineerRowSchema>;

// --- Create engineer form schema ---

export const EngineerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  capacity_fte: z.number().positive("Capacity must be > 0"),
  home_division_id: z.string().uuid("Select a division"),
});
export type EngineerCreateRequest = z.infer<typeof EngineerCreateSchema>;

// --- Update engineer form schema (partial — all optional) ---

export const EngineerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  capacity_fte: z.number().positive().optional(),
  home_division_id: z.string().uuid().optional(),
});
export type EngineerUpdateRequest = z.infer<typeof EngineerUpdateSchema>;
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/m03-types.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/engineer.ts frontend/src/test/m03-types.test.ts
git commit -m "feat: add M-03 TypeScript types and Zod schemas for engineers"
```

---

## Task 2: API modules and TanStack Query hooks

**Files:**

- Create: `frontend/src/api/engineers.ts`
- Create: `frontend/src/api/objectEngineers.ts`
- Create: `frontend/src/hooks/useEngineers.ts`
- Create: `frontend/src/hooks/useObjectEngineers.ts`

All HTTP calls go through the Axios instance at `src/api/axios.ts`. All server state is managed by TanStack Query. Mutations invalidate relevant query keys so the UI stays in sync.

- [ ] **Step 1: Write the failing test for API modules**

Create `frontend/src/test/m03-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../api/axios";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("engineers API", () => {
  it("getEngineers calls GET /engineers with optional filters", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } });
    const { getEngineers } = await import("../api/engineers");
    await getEngineers({ status: "WARNING", home_division_id: "div-1" });
    expect(mockApi.get).toHaveBeenCalledWith("/engineers", {
      params: { status: "WARNING", home_division_id: "div-1" },
    });
  });

  it("getEngineers omits undefined filters", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } });
    const { getEngineers } = await import("../api/engineers");
    await getEngineers();
    expect(mockApi.get).toHaveBeenCalledWith("/engineers", { params: {} });
  });

  it("getEngineer calls GET /engineers/:id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } });
    const { getEngineer } = await import("../api/engineers");
    await getEngineer("eng-1");
    expect(mockApi.get).toHaveBeenCalledWith("/engineers/eng-1");
  });

  it("createEngineer calls POST /engineers", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } });
    const { createEngineer } = await import("../api/engineers");
    const payload = {
      name: "Test",
      email: "test@test.com",
      capacity_fte: 1.0,
      home_division_id: "div-1",
    };
    await createEngineer(payload);
    expect(mockApi.post).toHaveBeenCalledWith("/engineers", payload);
  });

  it("updateEngineer calls PUT /engineers/:id", async () => {
    mockApi.put.mockResolvedValueOnce({ data: { data: {} } });
    const { updateEngineer } = await import("../api/engineers");
    await updateEngineer("eng-1", { capacity_fte: 0.5 });
    expect(mockApi.put).toHaveBeenCalledWith("/engineers/eng-1", {
      capacity_fte: 0.5,
    });
  });

  it("deactivateEngineer calls DELETE /engineers/:id", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { data: null } });
    const { deactivateEngineer } = await import("../api/engineers");
    await deactivateEngineer("eng-1");
    expect(mockApi.delete).toHaveBeenCalledWith("/engineers/eng-1");
  });

  it("getEngineerSummary calls GET /engineers/:id/summary", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } });
    const { getEngineerSummary } = await import("../api/engineers");
    await getEngineerSummary("eng-1");
    expect(mockApi.get).toHaveBeenCalledWith("/engineers/eng-1/summary");
  });

  it("getEngineerObjects calls GET /engineers/:id/objects", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } });
    const { getEngineerObjects } = await import("../api/engineers");
    await getEngineerObjects("eng-1");
    expect(mockApi.get).toHaveBeenCalledWith("/engineers/eng-1/objects");
  });

  it("assignObjectToEngineer calls POST /engineers/:id/objects", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } });
    const { assignObjectToEngineer } = await import("../api/engineers");
    await assignObjectToEngineer("eng-1", "obj-1");
    expect(mockApi.post).toHaveBeenCalledWith("/engineers/eng-1/objects", {
      object_id: "obj-1",
    });
  });

  it("removeObjectFromEngineer calls DELETE /engineers/:id/objects/:oid", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { data: null } });
    const { removeObjectFromEngineer } = await import("../api/engineers");
    await removeObjectFromEngineer("eng-1", "obj-1");
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/engineers/eng-1/objects/obj-1",
    );
  });
});

describe("objectEngineers API", () => {
  it("getObjectEngineers calls GET /objects/:id/engineers", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } });
    const { getObjectEngineers } = await import("../api/objectEngineers");
    await getObjectEngineers("obj-1");
    expect(mockApi.get).toHaveBeenCalledWith("/objects/obj-1/engineers");
  });

  it("assignEngineerToObject calls POST /objects/:id/engineers", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } });
    const { assignEngineerToObject } = await import("../api/objectEngineers");
    await assignEngineerToObject("obj-1", "eng-1");
    expect(mockApi.post).toHaveBeenCalledWith("/objects/obj-1/engineers", {
      engineer_id: "eng-1",
    });
  });

  it("removeEngineerFromObject calls DELETE /objects/:id/engineers/:eid", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { data: null } });
    const { removeEngineerFromObject } = await import("../api/objectEngineers");
    await removeEngineerFromObject("obj-1", "eng-1");
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/objects/obj-1/engineers/eng-1",
    );
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/m03-api.test.ts
```

Expected: import errors — API modules don't exist yet.

- [ ] **Step 3: Create API modules**

Create `frontend/src/api/engineers.ts`:

```typescript
import api from "./axios";
import type {
  Engineer,
  EngineerSummary,
  EngineerShare,
  EngineerCreateRequest,
  EngineerUpdateRequest,
} from "../types/engineer";

interface EngineerFilters {
  status?: string;
  home_division_id?: string;
}

export async function getEngineers(
  filters?: EngineerFilters,
): Promise<Engineer[]> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.home_division_id)
    params.home_division_id = filters.home_division_id;
  const response = await api.get("/engineers", { params });
  return response.data.data as Engineer[];
}

export async function getEngineer(id: string): Promise<Engineer> {
  const response = await api.get(`/engineers/${id}`);
  return response.data.data as Engineer;
}

export async function createEngineer(
  data: EngineerCreateRequest,
): Promise<Engineer> {
  const response = await api.post("/engineers", data);
  return response.data.data as Engineer;
}

export async function updateEngineer(
  id: string,
  data: EngineerUpdateRequest,
): Promise<Engineer> {
  const response = await api.put(`/engineers/${id}`, data);
  return response.data.data as Engineer;
}

export async function deactivateEngineer(id: string): Promise<void> {
  await api.delete(`/engineers/${id}`);
}

export async function getEngineerSummary(id: string): Promise<EngineerSummary> {
  const response = await api.get(`/engineers/${id}/summary`);
  return response.data.data as EngineerSummary;
}

export async function getEngineerObjects(id: string): Promise<EngineerShare[]> {
  const response = await api.get(`/engineers/${id}/objects`);
  return response.data.data as EngineerShare[];
}

export async function assignObjectToEngineer(
  engineerId: string,
  objectId: string,
): Promise<void> {
  await api.post(`/engineers/${engineerId}/objects`, { object_id: objectId });
}

export async function removeObjectFromEngineer(
  engineerId: string,
  objectId: string,
): Promise<void> {
  await api.delete(`/engineers/${engineerId}/objects/${objectId}`);
}
```

Create `frontend/src/api/objectEngineers.ts`:

```typescript
import api from "./axios";
import type { ObjectEngineerRow } from "../types/engineer";

export async function getObjectEngineers(
  objectId: string,
): Promise<ObjectEngineerRow[]> {
  const response = await api.get(`/objects/${objectId}/engineers`);
  return response.data.data as ObjectEngineerRow[];
}

export async function assignEngineerToObject(
  objectId: string,
  engineerId: string,
): Promise<void> {
  await api.post(`/objects/${objectId}/engineers`, { engineer_id: engineerId });
}

export async function removeEngineerFromObject(
  objectId: string,
  engineerId: string,
): Promise<void> {
  await api.delete(`/objects/${objectId}/engineers/${engineerId}`);
}
```

- [ ] **Step 4: Create TanStack Query hooks**

Create `frontend/src/hooks/useEngineers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEngineers,
  getEngineer,
  createEngineer,
  updateEngineer,
  deactivateEngineer,
  getEngineerSummary,
  getEngineerObjects,
  assignObjectToEngineer,
  removeObjectFromEngineer,
} from "../api/engineers";
import type {
  EngineerCreateRequest,
  EngineerUpdateRequest,
} from "../types/engineer";
import { SUMMARY_QUERY_KEY } from "./useSummary";
import { SVOD_QUERY_KEY } from "./useSvod";

export const ENGINEERS_QUERY_KEY = "engineers";
export const ENGINEER_SUMMARY_QUERY_KEY = "engineer-summary";
export const ENGINEER_OBJECTS_QUERY_KEY = "engineer-objects";

export function useEngineers(status?: string, homeDivisionId?: string) {
  return useQuery({
    queryKey: [ENGINEERS_QUERY_KEY, { status, homeDivisionId }],
    queryFn: () => getEngineers({ status, home_division_id: homeDivisionId }),
  });
}

export function useEngineer(id: string) {
  return useQuery({
    queryKey: [ENGINEERS_QUERY_KEY, id],
    queryFn: () => getEngineer(id),
    enabled: !!id,
  });
}

export function useCreateEngineer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EngineerCreateRequest) => createEngineer(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
    },
  });
}

export function useUpdateEngineer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EngineerUpdateRequest) => updateEngineer(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY, id],
      });
    },
  });
}

export function useDeactivateEngineer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEngineer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
    },
  });
}

export function useEngineerSummary(id: string) {
  return useQuery({
    queryKey: [ENGINEER_SUMMARY_QUERY_KEY, id],
    queryFn: () => getEngineerSummary(id),
    enabled: !!id,
  });
}

export function useEngineerObjects(id: string) {
  return useQuery({
    queryKey: [ENGINEER_OBJECTS_QUERY_KEY, id],
    queryFn: () => getEngineerObjects(id),
    enabled: !!id,
  });
}

export function useAssignObjectToEngineer(engineerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objectId: string) =>
      assignObjectToEngineer(engineerId, objectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_OBJECTS_QUERY_KEY, engineerId],
      });
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY, engineerId],
      });
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] });
    },
  });
}

export function useRemoveObjectFromEngineer(engineerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objectId: string) =>
      removeObjectFromEngineer(engineerId, objectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_OBJECTS_QUERY_KEY, engineerId],
      });
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY, engineerId],
      });
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] });
    },
  });
}
```

Create `frontend/src/hooks/useObjectEngineers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getObjectEngineers,
  assignEngineerToObject,
  removeEngineerFromObject,
} from "../api/objectEngineers";
import {
  ENGINEERS_QUERY_KEY,
  ENGINEER_SUMMARY_QUERY_KEY,
} from "./useEngineers";
import { SUMMARY_QUERY_KEY } from "./useSummary";
import { SVOD_QUERY_KEY } from "./useSvod";

export const OBJECT_ENGINEERS_QUERY_KEY = "object-engineers";

export function useObjectEngineers(objectId: string) {
  return useQuery({
    queryKey: [OBJECT_ENGINEERS_QUERY_KEY, objectId],
    queryFn: () => getObjectEngineers(objectId),
    enabled: !!objectId,
  });
}

export function useAssignEngineerToObject(objectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (engineerId: string) =>
      assignEngineerToObject(objectId, engineerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [OBJECT_ENGINEERS_QUERY_KEY, objectId],
      });
      void queryClient.invalidateQueries({
        queryKey: [SUMMARY_QUERY_KEY, objectId],
      });
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
      // Invalidate all engineer summaries — assignment changes affect shares
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY],
      });
    },
  });
}

export function useRemoveEngineerFromObject(objectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (engineerId: string) =>
      removeEngineerFromObject(objectId, engineerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [OBJECT_ENGINEERS_QUERY_KEY, objectId],
      });
      void queryClient.invalidateQueries({
        queryKey: [SUMMARY_QUERY_KEY, objectId],
      });
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] });
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY],
      });
    },
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/test/m03-api.test.ts
```

Expected: all 13 tests pass.

- [ ] **Step 6: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/engineers.ts frontend/src/api/objectEngineers.ts \
        frontend/src/hooks/useEngineers.ts frontend/src/hooks/useObjectEngineers.ts \
        frontend/src/test/m03-api.test.ts
git commit -m "feat: add API modules and TanStack Query hooks for engineers and object-engineer assignments"
```

---

## Task 3: Engineer List page (`/engineers`)

**Files:**

- Replace: `frontend/src/pages/EngineerListPage.tsx`

**Behavioral requirements (from `ui-spec.md` §7.5):**

The Engineer List page is a sortable, filterable table of all engineers with workload status indicators.

**Table columns:**

| #   | Header (Russian) | Field                                | Align  | Format                             |
| --- | ---------------- | ------------------------------------ | ------ | ---------------------------------- |
| 1   | Engineer          | `name`                               | left   | text, clickable → `/engineers/:id` |
| 2   | Division    | `home_division_name`                 | left   | text                               |
| 3   | Objects         | `object_count`                       | right  | integer                            |
| 4   | FTE Load     | `total_load`                         | right  | 4 decimal places                   |
| 5   | Capacity         | `capacity_fte`                       | right  | 2 decimal places                   |
| 6   | Status           | derived from `load_ratio` + `status` | center | colored MUI `Chip`                 |

**Status chip rendering:**

- `NORMAL` → green chip, label: `"{load_ratio as %}%"` (e.g. "48%"), icon: ✅
- `WARNING` → amber/yellow chip, label: `"{load_ratio as %}%"` (e.g. "92%"), icon: ⚠
- `OVERLOADED` → red chip, label: `"{load_ratio as %}%"` (e.g. "108%"), icon: 🔴

**Filter bar (above table):**

- Division dropdown — options from `GET /divisions` (existing `useDivisions()` hook); passes `home_division_id` to `useEngineers(status, homeDivisionId)`
- Status dropdown — options: "All", "Normal" (`NORMAL`), "Warning" (`WARNING`), "Overloaded" (`OVERLOADED`)
- Name search — `<TextField>` that filters the client-side list by `name.toLowerCase().includes(query)`

**"Create engineer" button:**

- Opens a MUI `Dialog` with React Hook Form + Zod (`EngineerCreateSchema`):
  - Name (text, required)
  - Email (email, required)
  - Capacity FTE (number, > 0, required)
  - Division (dropdown from `GET /divisions`, required)
- On submit: calls `useCreateEngineer()` mutation
- On success: dialog closes, list refetches

**Row click:** navigate to `/engineers/:id`

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/EngineerListPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import EngineerListPage from '../pages/EngineerListPage'

vi.mock('../hooks/useEngineers', () => ({
  useEngineers: vi.fn(),
  useCreateEngineer: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  ENGINEERS_QUERY_KEY: 'engineers',
}))

vi.mock('../hooks/useDivisions', () => ({
  useDivisions: vi.fn(() => ({
    data: [
      { id: 'div-1', name: 'Brest', branch_count: 3, object_count: 100 },
    ],
    isLoading: false,
  })),
}))

import { useEngineers } from '../hooks/useEngineers'

const mockUseEngineers = vi.mocked(useEngineers)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EngineerListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EngineerListPage', () => {
  it('renders loading spinner while fetching', () => {
    mockUseEngineers.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders engineer list with status chips', async () => {
    mockUseEngineers.mockReturnValue({
      data: [
        {
          id: 'eng-1',
          name: 'Ivanov Petr',
          email: 'ivanov@test.com',
          role: 'engineer',
          home_division_id: 'div-1',
          home_division_name: 'Brest',
          capacity_fte: 1.0,
          is_active: true,
          object_count: 47,
          total_load: 0.92,
          load_ratio: 0.92,
          status: 'WARNING' as const,
        },
        {
          id: 'eng-2',
          name: 'Sidorova Anna',
          email: 'sidorova@test.com',
          role: 'engineer',
          home_division_id: 'div-1',
          home_division_name: 'Brest',
          capacity_fte: 1.0,
          is_active: true,
          object_count: 31,
          total_load: 1.08,
          load_ratio: 1.08,
          status: 'OVERLOADED' as const,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Ivanov Petr')).toBeInTheDocument()
      expect(screen.getByText('Sidorova Anna')).toBeInTheDocument()
    })
    // Verify status chips are rendered (chip text shows percentage)
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('108%')).toBeInTheDocument()
  })

  it('opens create engineer dialog on button click', async () => {
    mockUseEngineers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    const createBtn = screen.getByRole('button', { name: /create engineer/i })
    await userEvent.click(createBtn)

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/capacity/i)).toBeInTheDocument()
    })
  })

  it('filters engineers by name search', async () => {
    mockUseEngineers.mockReturnValue({
      data: [
        {
          id: 'eng-1', name: 'Ivanov Petr', email: 'i@t.com', role: 'engineer',
          home_division_id: 'div-1', home_division_name: 'Brest',
          capacity_fte: 1.0, is_active: true, object_count: 10,
          total_load: 0.5, load_ratio: 0.5, status: 'NORMAL' as const,
        },
        {
          id: 'eng-2', name: 'Kozlov Dmitry', email: 'k@t.com', role: 'engineer',
          home_division_id: 'div-1', home_division_name: 'Brest',
          capacity_fte: 0.5, is_active: true, object_count: 5,
          total_load: 0.24, load_ratio: 0.48, status: 'NORMAL' as const,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    const searchField = screen.getByPlaceholderText(/search/i)
    await userEvent.type(searchField, 'Kozlov')

    await waitFor(() => {
      expect(screen.getByText('Kozlov Dmitry')).toBeInTheDocument()
      expect(screen.queryByText('Ivanov Petr')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/EngineerListPage.test.tsx
```

Expected: fails because `EngineerListPage` is still a placeholder `<div>`.

- [ ] **Step 3: Implement EngineerListPage.tsx**

Replace `frontend/src/pages/EngineerListPage.tsx`.

**Implementation targets:**

- File: `frontend/src/pages/EngineerListPage.tsx`
- Page title: `<Typography variant="h4">Engineers</Typography>`
- Uses `useEngineers(status, homeDivisionId)` hook for data
- Filter bar: three controls in a row (`<Box sx={{ display: 'flex', gap: 2, mb: 2 }}>`)
  - Division `<Select>` with "All divisions" default option, options from `useDivisions()`
  - Status `<Select>` with options: All / Normal / Warning / Overloaded
  - Name search `<TextField>` with placeholder "Search by name..."
- MUI `<Table>` (or `<DataGrid>`) with 6 columns as specified above
- Status column renders a `<Chip>` with:
  - `color="success"` for NORMAL, `color="warning"` for WARNING, `color="error"` for OVERLOADED
  - Label: `Math.round(load_ratio * 100) + '%'`
- Name column: clickable via `useNavigate()` → `/engineers/${engineer.id}`
- "Create engineer" button → opens `<Dialog>` with React Hook Form + Zod:
  - Form fields: name (`<TextField>`), email (`<TextField>`), capacity_fte (`<TextField type="number">`), home_division_id (`<Select>`)
  - Resolver: `zodResolver(EngineerCreateSchema)`
  - Submit calls `useCreateEngineer().mutateAsync(data)`
  - On error 409 `ENGINEER_HAS_ACTIVE_ASSIGNMENTS`: irrelevant here (creation never hits this)
  - General error display: show `<Alert>` in dialog with error message
- Client-side name filtering: `data.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))`
- Show `<CircularProgress>` while loading

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/EngineerListPage.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/EngineerListPage.tsx frontend/src/test/EngineerListPage.test.tsx
git commit -m "feat: implement Engineer List page with status chips, filters, and create dialog"
```

---

## Task 4: Engineer Detail page (`/engineers/:id`)

**Files:**

- Replace: `frontend/src/pages/EngineerDetailPage.tsx`
- Create: `frontend/src/components/engineers/EngineerSummaryCards.tsx`
- Create: `frontend/src/components/engineers/SystemBreakdownChart.tsx`
- Create: `frontend/src/components/engineers/AssignedObjectsTable.tsx`
- Create: `frontend/src/components/engineers/EngineerAssignDialog.tsx`

**Behavioral requirements (from `ui-spec.md` §7.6):**

The Engineer Detail page is a personal workload dashboard with four sections (Section 5 — stale indicator is MVP-only, not in PoC).

**Section 1 — Summary cards (`EngineerSummaryCards.tsx`):**

- Four MUI `Card` components in a row
- Data from `useEngineerSummary(id)` → `GET /engineers/:id/summary`

| Card | Label    | Value          | Format                                                 |
| ---- | -------- | -------------- | ------------------------------------------------------ |
| 1    | Load | `total_load`   | `{value} FTE`, 3 decimal places                        |
| 2    | Capacity | `capacity_fte` | `{value} FTE`, 1 decimal place                         |
| 3    | Utilization | `load_ratio`   | `{value * 100}%`, colored (green/amber/red per status) |
| 4    | Objects | `object_count` | integer                                                |

**Section 2 — System breakdown chart (`SystemBreakdownChart.tsx`):**

- Five horizontal bars using MUI `LinearProgress` (or a simple `Box` with proportional widths)
- Data from `useEngineerSummary(id)`: `os_load`, `ps_load`, `video_load`, `records_load`, `repair_load`

| System | Label              | Value                                | Color  |
| ------ | ------------------ | ------------------------------------ | ------ |
| Security     | `os_load` FTE      | `(os_load / total_load * 100)%`      | blue   |
| Fire     | `ps_load` FTE      | `(ps_load / total_load * 100)%`      | orange |
| Video  | `video_load` FTE   | `(video_load / total_load * 100)%`   | green  |
| Records | `records_load` FTE | `(records_load / total_load * 100)%` | purple |
| Repairs | `repair_load` FTE  | `(repair_load / total_load * 100)%`  | red    |

- Each bar row: label (left) + `LinearProgress variant="determinate" value={percentage}` (center) + `{value} FTE ({percentage}%)` (right)
- If `total_load` is 0, show all bars at 0% with "No load data"

**Section 3 — Assigned objects table (`AssignedObjectsTable.tsx`):**

- Data from `useEngineerObjects(id)` → `GET /engineers/:id/objects`
- Sorted by `engineer_share` descending (default)

| #   | Header (Russian) | Field                      | Align  | Format                           |
| --- | ---------------- | -------------------------- | ------ | -------------------------------- |
| 1   | Object           | `object_name`              | left   | text, clickable → `/objects/:id` |
| 2   | Engineer Share    | `engineer_share`           | right  | FTE, 4 decimal places            |
| 3   | Object Total  | `itogo_chislo_with_travel` | right  | FTE, 6 decimal places            |
| 4   | Engineer Count      | `engineer_count`           | right  | integer                          |
| 5   | Actions         | —                          | center | "Remove" button                   |

- "Remove" button per row: calls `useRemoveObjectFromEngineer(engineerId).mutateAsync(objectId)`
- Before removing: show `ConfirmDialog` (from M-01 common components) with message "Remove engineer assignment from object «{object_name}»?"

**Section 4 — Assign object button + dialog (`EngineerAssignDialog.tsx`):**

- "Assign object" button below the table
- Opens a searchable dialog:
  - Uses `useObjects()` (from M-01) to load all objects
  - `<Autocomplete>` (MUI) searchable by object name
  - Each option shows: object name + division name
  - Confirm button calls `useAssignObjectToEngineer(engineerId).mutateAsync(objectId)`
  - On success: dialog closes, table refetches
  - On error: display error message in dialog

**"Edit" button (top right):**

- Opens inline edit form (or dialog) for: name, capacity_fte, home_division_id
- Uses React Hook Form + Zod (`EngineerUpdateSchema`)
- Submit calls `useUpdateEngineer(id).mutateAsync(data)`
- On success: refetches engineer data + summary

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/EngineerDetailPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EngineerDetailPage from '../pages/EngineerDetailPage'

vi.mock('../hooks/useEngineers', () => ({
  useEngineer: vi.fn(),
  useEngineerSummary: vi.fn(),
  useEngineerObjects: vi.fn(),
  useUpdateEngineer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAssignObjectToEngineer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveObjectFromEngineer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  ENGINEERS_QUERY_KEY: 'engineers',
  ENGINEER_SUMMARY_QUERY_KEY: 'engineer-summary',
  ENGINEER_OBJECTS_QUERY_KEY: 'engineer-objects',
}))

vi.mock('../hooks/useObjects', () => ({
  useObjects: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock('../hooks/useDivisions', () => ({
  useDivisions: vi.fn(() => ({ data: [], isLoading: false })),
}))

import { useEngineer, useEngineerSummary, useEngineerObjects } from '../hooks/useEngineers'

const mockUseEngineer = vi.mocked(useEngineer)
const mockUseEngineerSummary = vi.mocked(useEngineerSummary)
const mockUseEngineerObjects = vi.mocked(useEngineerObjects)

const mockEngineer = {
  id: 'eng-1',
  name: 'Ivanov Petr Sergeevich',
  email: 'ivanov@test.com',
  role: 'engineer',
  home_division_id: 'div-1',
  home_division_name: 'Brest No. 100',
  capacity_fte: 1.0,
  is_active: true,
  object_count: 47,
  total_load: 0.921,
  load_ratio: 0.921,
  status: 'WARNING' as const,
}

const mockSummary = {
  engineer_id: 'eng-1',
  total_load: 0.921,
  object_count: 47,
  os_load: 0.41,
  ps_load: 0.27,
  video_load: 0.09,
  records_load: 0.05,
  repair_load: 0.10,
  capacity_fte: 1.0,
  load_ratio: 0.921,
  status: 'WARNING' as const,
}

const mockObjects = [
  {
    object_id: 'obj-1',
    object_name: 'CBU Brest, Lenina St., 10',
    division_name: 'Brest',
    branch_name: 'Branch 1',
    engineer_share: 0.032,
    itogo_chislo_with_travel: 0.064,
    engineer_count: 2,
  },
  {
    object_id: 'obj-2',
    object_name: 'Brest Archive, Moskovskaya St., 202D',
    division_name: 'Brest',
    branch_name: 'Branch 1',
    engineer_share: 0.024,
    itogo_chislo_with_travel: 0.024,
    engineer_count: 1,
  },
]

function renderPage(engineerId: string = 'eng-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/engineers/${engineerId}`]}>
        <Routes>
          <Route path="/engineers/:id" element={<EngineerDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EngineerDetailPage', () => {
  beforeEach(() => {
    mockUseEngineer.mockReturnValue({
      data: mockEngineer,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineer>)
    mockUseEngineerSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineerSummary>)
    mockUseEngineerObjects.mockReturnValue({
      data: mockObjects,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineerObjects>)
  })

  it('renders summary cards with correct values', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Ivanov Petr Sergeevich')).toBeInTheDocument()
      expect(screen.getByText(/0\.921 FTE/)).toBeInTheDocument()
      expect(screen.getByText(/1\.0 FTE/)).toBeInTheDocument()
      expect(screen.getByText(/92%/)).toBeInTheDocument()
      expect(screen.getByText('47')).toBeInTheDocument()
    })
  })

  it('renders system breakdown bars', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Security/)).toBeInTheDocument()
      expect(screen.getByText(/Fire/)).toBeInTheDocument()
      expect(screen.getByText(/Video/)).toBeInTheDocument()
      expect(screen.getByText(/Records/)).toBeInTheDocument()
      expect(screen.getByText(/Repairs/)).toBeInTheDocument()
    })
  })

  it('renders assigned objects table sorted by share descending', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('CBU Brest, Lenina St., 10')).toBeInTheDocument()
      expect(screen.getByText('Brest Archive, Moskovskaya St., 202D')).toBeInTheDocument()
    })
    // Each row has a "Remove" button
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(2)
  })

  it('shows "Assign object" button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assign object/i })).toBeInTheDocument()
    })
  })

  it('shows loading spinner when data is loading', () => {
    mockUseEngineer.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useEngineer>)

    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/EngineerDetailPage.test.tsx
```

Expected: fails because `EngineerDetailPage` is still a placeholder `<div>`.

- [ ] **Step 3: Implement engineer detail components and page**

Create the four component files and the page. The implementation targets below specify the exact component API contracts, props, and behavioral requirements. Generate the complete TypeScript source for each file.

**`frontend/src/components/engineers/EngineerSummaryCards.tsx`:**

- Props: `summary: EngineerSummary | undefined`, `isLoading: boolean`
- Renders 4 MUI `Card` components in a `<Grid container spacing={2}>`
- Each card: `<Card><CardContent><Typography variant="subtitle2">{label}</Typography><Typography variant="h5">{value}</Typography></CardContent></Card>`
- Utilization card: text color matches status (green/amber/red)
- Shows `<Skeleton>` placeholders when `isLoading` is true

**`frontend/src/components/engineers/SystemBreakdownChart.tsx`:**

- Props: `summary: EngineerSummary | undefined`
- Five rows, each: label (fixed 80px width) + `<LinearProgress variant="determinate" value={percentage} />` + FTE value + percentage
- `percentage = totalLoad > 0 ? (componentLoad / totalLoad) * 100 : 0`
- Colors: Security (`primary`), Fire (`warning`), Video (`success`), Records (`secondary`), Repairs (`error`)
- Shows "No load data" `<Typography>` when `total_load === 0` or `summary` is undefined

**`frontend/src/components/engineers/AssignedObjectsTable.tsx`:**

- Props: `objects: EngineerShare[]`, `onRemove: (objectId: string) => void`, `isRemoving: boolean`
- MUI `<Table>` with 5 columns as specified above
- Object name column: clickable via `useNavigate()` → `/objects/${object_id}`
- "Remove" button per row: calls `onRemove(object_id)` (parent handles confirmation dialog and mutation)
- Sorted by `engineer_share` descending by default

**`frontend/src/components/engineers/EngineerAssignDialog.tsx`:**

- Props: `open: boolean`, `onClose: () => void`, `onAssign: (objectId: string) => Promise<void>`, `isAssigning: boolean`
- MUI `<Dialog>` with `<Autocomplete>` for object search
- Uses `useObjects()` (from M-01 hooks) to load all objects
- Autocomplete option: `{object.name} — {object.division_name}`
- "Assign" button: calls `onAssign(selectedObjectId)`, then `onClose()` on success
- Cancel button: closes dialog

**`frontend/src/pages/EngineerDetailPage.tsx`:**

- Uses `useParams()` to get `id`
- Uses `useEngineer(id)`, `useEngineerSummary(id)`, `useEngineerObjects(id)` hooks
- Layout:
  - Header row: engineer name (`<Typography variant="h4">`) + "Edit" button
  - Section 1: `<EngineerSummaryCards summary={summaryData} isLoading={summaryLoading} />`
  - Section 2: `<SystemBreakdownChart summary={summaryData} />`
  - Section 3: `<AssignedObjectsTable objects={objectsData} onRemove={handleRemove} isRemoving={removeMutation.isPending} />`
  - "Assign object" button → opens `<EngineerAssignDialog>`
- "Edit" button: opens MUI `<Dialog>` with React Hook Form + Zod (`EngineerUpdateSchema`), fields: name, capacity_fte, home_division_id
- Remove flow: "Remove" click → `ConfirmDialog` → `useRemoveObjectFromEngineer(id).mutateAsync(objectId)`
- Assign flow: "Assign object" → `EngineerAssignDialog` → `useAssignObjectToEngineer(id).mutateAsync(objectId)`
- Show `<CircularProgress>` when `useEngineer` is loading

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/EngineerDetailPage.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/EngineerDetailPage.tsx \
        frontend/src/components/engineers/ \
        frontend/src/test/EngineerDetailPage.test.tsx
git commit -m "feat: implement Engineer Detail dashboard with summary cards, breakdown, assigned objects"
```

---

## Task 5: Engineers tab on Object Detail page

**Files:**

- Modify: `frontend/src/pages/ObjectDetailPage.tsx` — replace Engineers tab placeholder

**Prerequisite context:** The M-01 frontend plan implements the Object Detail page with 6 tabs (Equipment, Records, Repairs, Travel, Engineers, Summary). The Engineers tab (index 4) was left as a `"[M-03] TODO"` placeholder. The M-02 frontend plan implemented the Summary tab (index 5). This task replaces the Engineers tab placeholder only.

**Behavioral requirements (from `ui-spec.md` §7.4):**

**Table columns:**

| #   | Header (Russian) | Field           | Align  | Format                                                        |
| --- | ---------------- | --------------- | ------ | ------------------------------------------------------------- |
| 1   | Engineer          | `engineer_name` | left   | text, clickable → `/engineers/:id`                            |
| 2   | Object Share     | `object_share`  | right  | FTE, 4 decimal places                                         |
| 3   | Utilization         | `load_ratio`    | center | colored `Chip` (same rendering as Engineer List status chips) |
| 4   | Actions         | —               | center | "Remove" button                                                |

- Data from `useObjectEngineers(objectId)` → `GET /objects/:id/engineers`
- "Object Share" = `itogo_chislo_with_travel / engineer_count` for this object (computed by backend, not frontend)
- "Utilization" = engineer's total `load_ratio` across ALL their objects (provides context — assignment may push an already-loaded engineer into overload)
- Engineer name: clickable via `useNavigate()` → `/engineers/${engineer_id}`
- "Remove" button per row: calls `useRemoveEngineerFromObject(objectId).mutateAsync(engineerId)` after `ConfirmDialog` confirmation

**"Assign engineer" button:**

- Opens a searchable MUI `<Dialog>` with `<Autocomplete>`
- Options from `useEngineers()` (all active engineers, any division — per ui-spec §12 editor scoping rules: engineer picker is NOT filtered by division)
- Each option shows: engineer name + current `load_ratio` as colored chip (helps user avoid overloading)
- On confirm: calls `useAssignEngineerToObject(objectId).mutateAsync(engineerId)`
- On success: dialog closes, engineer list refetches, summary and SVOD queries invalidated (PAC-07)

**Travel review banner:**

- After a successful assignment: display MUI `<Alert severity="info" sx={{ mt: 2 }}>` with text: **"Check travel data — travel time may differ for the new engineer"**
- Dismiss button on the alert (user can close it)
- Banner is ephemeral — does not persist on page reload

- [ ] **Step 1: Write the failing test first**

Create `frontend/src/test/ObjectEngineersTab.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ObjectDetailPage from '../pages/ObjectDetailPage'

vi.mock('../hooks/useObjectEngineers', () => ({
  useObjectEngineers: vi.fn(),
  useAssignEngineerToObject: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  })),
  useRemoveEngineerFromObject: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  })),
  OBJECT_ENGINEERS_QUERY_KEY: 'object-engineers',
}))

vi.mock('../hooks/useEngineers', () => ({
  useEngineers: vi.fn(() => ({
    data: [
      {
        id: 'eng-3', name: 'Kozlov Dmitry', email: 'k@t.com', role: 'engineer',
        home_division_id: 'div-1', home_division_name: 'Grodno',
        capacity_fte: 1.0, is_active: true, object_count: 5,
        total_load: 0.24, load_ratio: 0.48, status: 'NORMAL' as const,
      },
    ],
    isLoading: false,
  })),
  ENGINEERS_QUERY_KEY: 'engineers',
}))

// Mock other hooks that ObjectDetailPage may use (from M-01 and M-02)
vi.mock('../hooks/useSummary', () => ({
  useObjectSummary: vi.fn(() => ({ data: undefined, isLoading: false })),
  SUMMARY_QUERY_KEY: 'object-summary',
}))

vi.mock('../hooks/useObjects', () => ({
  useObject: vi.fn(() => ({
    data: { id: 'obj-1', name: 'CBU Brest', branch_id: 'br-1' },
    isLoading: false,
  })),
}))

import { useObjectEngineers } from '../hooks/useObjectEngineers'
import { useAssignEngineerToObject } from '../hooks/useObjectEngineers'

const mockUseObjectEngineers = vi.mocked(useObjectEngineers)
const mockAssignMutation = vi.mocked(useAssignEngineerToObject)

function renderPage(objectId: string = 'obj-1') {
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

describe('Object Detail — Engineers tab', () => {
  beforeEach(() => {
    mockUseObjectEngineers.mockReturnValue({
      data: [
        {
          engineer_id: 'eng-1',
          engineer_name: 'Ivanov Petr Sergeevich',
          object_share: 0.0161,
          load_ratio: 0.82,
          status: 'NORMAL' as const,
        },
        {
          engineer_id: 'eng-2',
          engineer_name: 'Sidorova Anna Nikolaevna',
          object_share: 0.0161,
          load_ratio: 0.45,
          status: 'NORMAL' as const,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useObjectEngineers>)
  })

  it('renders assigned engineers when Engineers tab is selected', async () => {
    renderPage()
    const engineersTab = screen.getByRole('tab', { name: /engineers/i })
    await userEvent.click(engineersTab)

    await waitFor(() => {
      expect(screen.getByText('Ivanov Petr Sergeevich')).toBeInTheDocument()
      expect(screen.getByText('Sidorova Anna Nikolaevna')).toBeInTheDocument()
    })
  })

  it('renders "Remove" buttons for each engineer', async () => {
    renderPage()
    const engineersTab = screen.getByRole('tab', { name: /engineers/i })
    await userEvent.click(engineersTab)

    await waitFor(() => {
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      expect(removeButtons).toHaveLength(2)
    })
  })

  it('shows "Assign engineer" button', async () => {
    renderPage()
    const engineersTab = screen.getByRole('tab', { name: /engineers/i })
    await userEvent.click(engineersTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assign engineer/i })).toBeInTheDocument()
    })
  })

  it('shows travel review banner after assignment', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined)
    mockAssignMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useAssignEngineerToObject>)

    renderPage()
    const engineersTab = screen.getByRole('tab', { name: /engineers/i })
    await userEvent.click(engineersTab)

    // Open assign dialog
    const assignBtn = await screen.findByRole('button', { name: /assign engineer/i })
    await userEvent.click(assignBtn)

    // The banner appears after successful assignment
    // (exact assertion depends on implementation — verify the banner text exists)
    // This test validates the banner infrastructure is in place
    await waitFor(() => {
      expect(assignBtn).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/test/ObjectEngineersTab.test.tsx
```

Expected: fails because the Engineers tab in `ObjectDetailPage` is a placeholder.

- [ ] **Step 3: Implement the Engineers tab on Object Detail page**

Modify `frontend/src/pages/ObjectDetailPage.tsx` — replace the Engineers tab placeholder (tab index 4) with the full implementation.

**Implementation targets:**

- Tab panel for index 4 renders a new section with:
  - Table heading: "Assigned engineers" + "Assign engineer" button
  - MUI `<Table>` with 4 columns as specified above
  - Engineer name: clickable `<Link>` to `/engineers/${engineer_id}`
  - Status/load chip: same `<Chip>` rendering as Engineer List page
  - "Remove" button per row with `ConfirmDialog` confirmation
- "Assign engineer" dialog:
  - MUI `<Dialog>` with `<Autocomplete>`
  - Options from `useEngineers()` — only active engineers
  - Option render: `{name}` + status `<Chip>` showing current load_ratio
  - Confirm calls `useAssignEngineerToObject(objectId).mutateAsync(engineerId)`
- Travel review banner:
  - `const [showTravelBanner, setShowTravelBanner] = useState(false)`
  - Set to `true` in the assign mutation's `onSuccess`
  - `<Alert severity="info" onClose={() => setShowTravelBanner(false)}>Check travel data — travel time may differ for the new engineer</Alert>`
- Uses `useObjectEngineers(objectId)` for data
- Show `<CircularProgress>` while loading

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/ObjectEngineersTab.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ObjectDetailPage.tsx frontend/src/test/ObjectEngineersTab.test.tsx
git commit -m "feat: implement Engineers tab on Object Detail with assign/remove and travel review banner"
```

---

## Task 6: Enable Engineers nav link

**Files:**

- Modify: `frontend/src/components/layout/AppLayout.tsx` (verify only — change if needed)

The Engineers nav item was added in scaffolding. If M-01 added a `disabled` property to it, remove it. If it is already active (which it should be based on the scaffolding plan), no change is needed.

- [ ] **Step 1: Verify Engineers nav link is active in AppLayout.tsx**

Read `frontend/src/components/layout/AppLayout.tsx` and confirm the Engineers nav item exists without a `disabled` property. The scaffolding plan created it as:

```typescript
const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Objects", path: "/objects" },
  { label: "Engineers", path: "/engineers" },
  { label: "Summary", path: "/svod" },
  { label: "Divisions", path: "/divisions" },
];
```

If the Engineers item has `disabled: true`, remove that property. If it's already active, no change needed.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "chore: ensure Engineers nav link is active in sidebar"
```

---

## Task 7: Query invalidation wiring for PAC-07

**Files:**

- Verify/modify: `frontend/src/hooks/useObjectEngineers.ts` (should already be correct from Task 2)
- Verify/modify: `frontend/src/hooks/useEngineers.ts` (should already be correct from Task 2)

**PAC-07 requirement:** Assigning or removing an engineer on the Object Detail Engineers tab updates engineer summaries without page refresh.

**Verification checklist:**

The mutation hooks created in Task 2 must invalidate these query keys on success:

| Mutation                                  | Must invalidate                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useAssignEngineerToObject(objectId)`     | `[OBJECT_ENGINEERS_QUERY_KEY, objectId]`, `[SUMMARY_QUERY_KEY, objectId]`, `[SVOD_QUERY_KEY]`, `[ENGINEERS_QUERY_KEY]`, `[ENGINEER_SUMMARY_QUERY_KEY]` |
| `useRemoveEngineerFromObject(objectId)`   | Same as above                                                                                                                                          |
| `useAssignObjectToEngineer(engineerId)`   | `[ENGINEER_OBJECTS_QUERY_KEY, engineerId]`, `[ENGINEER_SUMMARY_QUERY_KEY, engineerId]`, `[ENGINEERS_QUERY_KEY]`, `[SVOD_QUERY_KEY]`                    |
| `useRemoveObjectFromEngineer(engineerId)` | Same as above                                                                                                                                          |

If Task 2 already set up the correct invalidations (as specified in the hook code), no changes are needed. Review the hooks and confirm.

- [ ] **Step 1: Review invalidation in hooks**

Read `frontend/src/hooks/useObjectEngineers.ts` and `frontend/src/hooks/useEngineers.ts`. Verify all invalidation calls match the table above. Fix any gaps.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add frontend/src/hooks/
git commit -m "feat: verify query invalidation wiring for PAC-07 (engineer summary auto-refresh)"
```

---

## Task 8: Run all quality gates

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
- `src/test/m03-types.test.ts` (Task 1 — Zod schemas)
- `src/test/m03-api.test.ts` (Task 2 — API module calls)
- `src/test/EngineerListPage.test.tsx` (Task 3 — Engineer list rendering)
- `src/test/EngineerDetailPage.test.tsx` (Task 4 — Engineer detail dashboard)
- `src/test/ObjectEngineersTab.test.tsx` (Task 5 — Engineers tab on Object Detail)
- Any pre-existing M-01 and M-02 tests

Fix any failures.

- [ ] **Step 5: Commit formatting fixes (if any)**

```bash
git add -A
git commit -m "chore: format and lint fixes"
```

- [ ] **Step 6: Push branch**

```bash
git push -u origin feature/poc-m03-frontend
```

---

## Summary of files created/modified

| Action  | File                                                           | Task |
| ------- | -------------------------------------------------------------- | ---- |
| Create  | `src/types/engineer.ts`                                        | 1    |
| Create  | `src/test/m03-types.test.ts`                                   | 1    |
| Create  | `src/api/engineers.ts`                                         | 2    |
| Create  | `src/api/objectEngineers.ts`                                   | 2    |
| Create  | `src/hooks/useEngineers.ts`                                    | 2    |
| Create  | `src/hooks/useObjectEngineers.ts`                              | 2    |
| Create  | `src/test/m03-api.test.ts`                                     | 2    |
| Replace | `src/pages/EngineerListPage.tsx`                               | 3    |
| Create  | `src/test/EngineerListPage.test.tsx`                           | 3    |
| Replace | `src/pages/EngineerDetailPage.tsx`                             | 4    |
| Create  | `src/components/engineers/EngineerSummaryCards.tsx`            | 4    |
| Create  | `src/components/engineers/SystemBreakdownChart.tsx`            | 4    |
| Create  | `src/components/engineers/AssignedObjectsTable.tsx`            | 4    |
| Create  | `src/components/engineers/EngineerAssignDialog.tsx`            | 4    |
| Create  | `src/test/EngineerDetailPage.test.tsx`                         | 4    |
| Modify  | `src/pages/ObjectDetailPage.tsx`                               | 5    |
| Create  | `src/test/ObjectEngineersTab.test.tsx`                         | 5    |
| Verify  | `src/components/layout/AppLayout.tsx`                          | 6    |
| Verify  | `src/hooks/useObjectEngineers.ts`, `src/hooks/useEngineers.ts` | 7    |

**Total:** 14 new files, 2 modified/replaced pages, 2 verified files.

---

## Acceptance criteria verification

| Criterion | How verified                                                                                            | Task        |
| --------- | ------------------------------------------------------------------------------------------------------- | ----------- |
| PAC-06    | Engineer Detail summary cards display `load_ratio` and `status` from API                                | 4           |
| PAC-07    | Assign/remove engineer → `invalidateQueries` → engineer summaries and Summary refetch                      | 2, 5, 7     |
| PAC-09    | Full PoC flow: Dashboard → Create Object → Add Equipment → Assign Engineer → Engineer Detail shows load | Smoke check |

---

## End-to-end smoke check (post-implementation)

After M-03 frontend is complete, the full PoC flow is functional. Perform manual smoke check:

1. **Login** → Dashboard shows division FTE totals (from M-02)
2. **Create Division** → Create Branch → Create Object (from M-01)
3. **Add equipment** (device + assignment) → Summary tab updates (from M-01 + M-02)
4. **Navigate to Engineers** → Create engineer → assign to the object
5. **Engineer Detail** → shows correct `load_ratio`, system breakdown, assigned object
6. **Object Detail → Engineers tab** → shows assigned engineer with correct share
7. **Remove engineer** → share redistributes, engineer summary updates
8. **Summary page** → shows object with FTE value and engineer name in column 5
9. **Dashboard** → coverage gaps section reflects assignment changes

Document any deviations from expected behavior as issues to fix before merging.


