# WS-B Step 2 — Unified Error Handling: Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement consistent frontend error handling patterns: toast notifications for network/conflict errors, inline form field errors for validation failures, full-page error display for 5xx, and 401 → redirect to `/login`. Update the Axios interceptor and TanStack Query client. All error codes are checked as numbers, not strings.

**Branch:** `feature/error-handling-frontend`
**Depends on:** `feature/error-handling-backend` merged to `feature/implementation`
**Workstream:** B — Unified Error Handling

**Epic:** `docs/impl/epics/unified-error-handling.md` Part 2 — Frontend Error Handling

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/unified-error-handling.md §"Part 2: Frontend Error Handling"` — canonical patterns and acceptance criteria
2. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass
3. Backend now returns numeric `error.code` (int) — frontend must check `=== 409`, not `=== 'NAME_CONFLICT'`

**Four error display patterns (from epic):**
1. **Toast notification** — 404, 409, network timeout, 5xx
2. **Inline form field error** — 422 validation failures
3. **Full-page error** — unrecoverable 5xx
4. **401 redirect** — automatic JWT expiry handling (already partially implemented)

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/error-handling-frontend
```

---

## Task 1: Create notification store and `<Toast>` component

**Files:**
- Create: `frontend/src/stores/notificationStore.ts`
- Create: `frontend/src/components/common/Toast.tsx`
- Create: `frontend/src/test/Toast.test.tsx`

**Purpose:** Centralized notification system used by all error handlers. Avoids per-component `useState` for toast messages.

- [ ] **Step 1: Create notification store**

```ts
// frontend/src/stores/notificationStore.ts
import { create } from 'zustand'

interface Notification {
  id: string
  message: string
  severity: 'error' | 'warning' | 'info' | 'success'
}

interface NotificationState {
  notifications: Notification[]
  show: (message: string, severity: 'error' | 'warning') => void
  dismiss: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  show: (message, severity) => set((state) => ({
    notifications: [...state.notifications, { id: crypto.randomUUID(), message, severity }]
  })),
  dismiss: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),
}))

// Convenience accessor for use outside React components (e.g., Axios interceptor)
export const showNotification = (message: string, severity: 'error' | 'warning') =>
  useNotificationStore.getState().show(message, severity)
```

- [ ] **Step 2: Create `<Toast>` component**

MUI `Snackbar` + `Alert` rendered at app root level. Subscribe to `notificationStore`. Each notification auto-dismisses after 5 seconds.

```tsx
// Key behaviors:
// - Auto-dismiss after 5000ms
// - Manual × close button
// - severity 'warning' (yellow) for 409 conflicts
// - severity 'error' (red) for other 4xx/5xx
// - stacks multiple notifications (queue them)
```

- [ ] **Step 3: Write test**

```tsx
it('shows and dismisses a notification', async () => {
  useNotificationStore.getState().show('Test error', 'error')
  render(<Toast />)
  expect(await screen.findByText('Test error')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(screen.queryByText('Test error')).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Wire Toast into app root**

Add `<Toast />` to `App.tsx` or the layout root — outside the router, so it renders on all pages.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/notificationStore.ts frontend/src/components/common/Toast.tsx frontend/src/test/Toast.test.tsx
git commit -m "feat: add notification store and Toast component for centralized error display"
```

---

## Task 2: Update Axios interceptor

**Files:**
- Modify: `frontend/src/api/axios.ts`

**Target behavior:**
- `401` → call `useAuthStore.getState().logout()` then `window.location.href = '/login'`
- `>=500` → call `showNotification(message || 'Server error', 'error')`
- Other errors → re-throw so callers handle them (toast vs inline)
- Network error (no response) → `showNotification('Network error. Please check your connection.', 'error')`

- [ ] **Step 1: Write failing test**

```ts
it('redirects to /login on 401', async () => {
  const mockLogout = vi.fn()
  vi.mocked(useAuthStore.getState).mockReturnValue({ logout: mockLogout })
  // mock axios to return 401
  // verify logout called and window.location.href = '/login'
})

it('shows toast on 500', async () => {
  const mockShow = vi.fn()
  vi.mocked(useNotificationStore.getState).mockReturnValue({ show: mockShow })
  // mock axios to return 500
  // verify mockShow called with error severity
})
```

- [ ] **Step 2: Update `axios.ts` interceptor**

```ts
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!isAxiosError(error)) return Promise.reject(error)

    if (!error.response) {
      // Network error
      showNotification('Network error. Please check your connection and try again.', 'error')
      return Promise.reject(error)
    }

    const status = error.response.status
    const message = error.response.data?.error?.message

    if (status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (status >= 500) {
      showNotification(message || 'An unexpected error occurred.', 'error')
    }

    // 4xx (other than 401) re-throw for caller to handle
    return Promise.reject(error)
  }
)
```

- [ ] **Step 3: Run test — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/axios.ts frontend/src/test/axios.test.ts
git commit -m "feat: update Axios interceptor with 401 redirect, 5xx toast, and network error handling"
```

---

## Task 3: Update TanStack Query client default error handling

**Files:**
- Modify: `frontend/src/main.tsx` (or wherever `QueryClient` is created)

**Target:**
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 4xx errors
        if (isAxiosError(error) && error.response && error.response.status < 500) return false
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
```

This prevents retrying 409 conflicts (which would just fail 3 times), while still retrying transient 5xx/network errors.

- [ ] **Step 1: Update QueryClient config**
- [ ] **Step 2: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: configure TanStack Query with smart retry logic (skip 4xx, retry 5xx up to 3x)"
```

---

## Task 4: Inline error pattern for form submissions

**Files:**
- Modify: `frontend/src/pages/DivisionDetailPage.tsx` (inline edit forms)
- Modify: `frontend/src/pages/ObjectDetailPage.tsx` (travel, records, repairs save buttons)
- Modify: form mutation handlers across all create/edit dialogs

**Pattern:** When a mutation fails with HTTP 422, display the error message inline below the form field (not as a toast).

```ts
// In form submit handler:
try {
  await mutation.mutateAsync(data)
} catch (error) {
  if (isAxiosError(error)) {
    const code = error.response?.data?.error?.code
    const message = error.response?.data?.error?.message
    if (code === 422) {
      // Show inline — set form error or local state
      setSubmitError(message || 'Validation failed')
    } else if (code === 409) {
      // Show toast (already handled by interceptor for 5xx, but 409 needs explicit toast)
      showNotification(message || 'Conflict error', 'warning')
    }
    // 401, 5xx already handled by interceptor
  }
}
```

- [ ] **Step 1: Identify all mutation handlers using the existing pattern**

```bash
grep -r "mutateAsync\|onError" frontend/src/pages/ --include="*.tsx" -l
```

- [ ] **Step 2: Update each mutation handler with the new pattern**

Audit each page/dialog and update the error handling to:
- 422 → inline `<Alert severity="error">` below the form
- 409 → `showNotification(message, 'warning')`
- Other errors → rely on interceptor (do not double-handle)

- [ ] **Step 3: Add tests for key error scenarios**

```tsx
// Example for DivisionCreateDialog:
it('shows inline error on 422', async () => {
  mockCreate.mockRejectedValue({ response: { data: { error: { code: 422, message: 'Name too short' } } } })
  // fill form, submit
  expect(await screen.findByText('Name too short')).toBeInTheDocument()
  expect(screen.queryByRole('alert', { name: /toast/i })).not.toBeInTheDocument()
})

it('shows warning toast on 409 duplicate name', async () => {
  mockCreate.mockRejectedValue({ response: { data: { error: { code: 409, message: 'Already exists' } } } })
  // fill form, submit
  expect(await screen.findByText('Already exists')).toBeInTheDocument()
})
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ frontend/src/test/
git commit -m "feat: implement 422 inline form errors and 409 warning toasts across all form submissions"
```

---

## Task 5: Full-page error boundary for 5xx

**Files:**
- Create: `frontend/src/components/common/ErrorPage.tsx`
- Modify: `frontend/src/router.tsx` (add error boundary to query-dependent routes)

**Target:** When a query fails with 5xx (unrecoverable), show a centered message with a Retry button instead of crashing.

```tsx
// ErrorPage.tsx props:
interface ErrorPageProps {
  message?: string
  onRetry?: () => void
}
// Renders centered "Something went wrong" + message + "Try again" button
```

Usage in pages with critical data queries:
```tsx
if (isError && isAxiosError(error) && (error.response?.status ?? 0) >= 500) {
  return <ErrorPage message={error.response?.data?.error?.message} onRetry={refetch} />
}
```

- [ ] **Step 1: Create `ErrorPage.tsx`**
- [ ] **Step 2: Apply to `DashboardPage`, `SvodPage`, `ObjectDetailPage`**
- [ ] **Step 3: Write test**

```tsx
it('renders ErrorPage when query fails with 5xx', async () => {
  mockUseObject.mockReturnValue({ isError: true, error: { response: { status: 500 } } })
  renderPage()
  expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
})
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/ErrorPage.tsx frontend/src/pages/ frontend/src/test/
git commit -m "feat: add ErrorPage component and wire 5xx error boundary to critical pages"
```

---

## Task 6: Migrate `errorMessages.ts` helpers to numeric codes + server messages

**Files:**
- Modify: `frontend/src/utils/errorMessages.ts`
- Modify: `frontend/src/test/errorMessages.test.ts`
- Modify: `frontend/src/test/EquipmentTab.test.tsx`
- Modify: call sites (listed in Step 4)

**Why this is a separate task:** the Task 7 audit greps for `error.code ==` comparisons and does **not** match this file — its string dependency is a `typeof code === 'string'` guard and `case 'DEVICE_NOT_IN_INVENTORY':` switch arms. This is the file behind the current UX regression: with numeric codes, `extractErrorCode` always returns `undefined`, so every error in the Equipment / Travel / Repairs / Records tabs shows the generic fallback.

**Design change:** the old codes `DEVICE_NOT_IN_INVENTORY` and `NO_CONTEXT_FOR_SYSTEM` are both HTTP 422 now — the code alone can no longer discriminate them. Backend messages are user-facing by design (ws-b-01 Task 3), so display `error.message` from the server and use the code only for fallback categories.

- [ ] **Step 1: Write failing tests**

```ts
describe('extractApiError', () => {
  it('extracts numeric code and message', () => {
    const err = { response: { data: { error: { code: 422, message: 'Device not found in inventory for this object' } } } }
    expect(extractApiError(err)).toEqual({ code: 422, message: 'Device not found in inventory for this object' })
  })
  it('returns undefined for non-API errors', () => {
    expect(extractApiError(new Error('network'))).toBeUndefined()
  })
})

describe('mapSaveError', () => {
  it('prefers the server message when present', () => {
    expect(mapSaveError({ code: 422, message: 'Round trip time is auto-calculated and cannot be edited directly' }))
      .toBe('Round trip time is auto-calculated and cannot be edited directly')
  })
  it('maps 404 to a refresh hint', () => {
    expect(mapSaveError({ code: 404, message: 'Object not found' })).toBe('Object no longer exists. Refresh the page.')
  })
  it('falls back to a generic message', () => {
    expect(mapSaveError(undefined)).toBe('Failed to save. Please try again.')
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- errorMessages`)

- [ ] **Step 3: Rewrite `errorMessages.ts`**

```ts
export interface ApiErrorInfo {
  code: number
  message: string
}

export function extractApiError(err: unknown): ApiErrorInfo | undefined {
  // same narrowing chain as the old extractErrorCode, but accept
  // typeof code === 'number' && typeof message === 'string'
}

// Server messages are user-facing per the unified-error-handling epic — show them directly.
export function mapEquipmentError(info: ApiErrorInfo | undefined): string {
  return info?.message || 'An unexpected error occurred.'
}

export function mapSaveError(info: ApiErrorInfo | undefined): string {
  if (info?.code === 404) return 'Object no longer exists. Refresh the page.'
  return info?.message || 'Failed to save. Please try again.'
}
```

- [ ] **Step 4: Update the call sites** (mechanical rename `extractErrorCode`/`mapEquipmentErrorCode`/`mapSaveErrorCode` → new helpers):
  - `frontend/src/components/travel/TravelTab.tsx`
  - `frontend/src/components/repairs/RepairsTab.tsx`
  - `frontend/src/components/records/RecordsTab.tsx`
  - `frontend/src/components/equipment/PhysicalInventory.tsx` (3 usages)
  - `frontend/src/components/equipment/SystemAssignments.tsx` (3 usages)

- [ ] **Step 5: Fix tests that mock the old string contract** — they pass today while asserting a contract the backend no longer honors:
  - `frontend/src/test/EquipmentTab.test.tsx` ("shows backend error DEVICE_NOT_IN_INVENTORY as alert") — mock `{ error: { code: 422, message: 'Device not found in inventory for this object' } }` and assert the server message renders
  - sweep for the rest: `grep -rn "code: '" frontend/src/test/` and `grep -rn 'code: "' frontend/src/test/`

- [ ] **Step 6: Run — expect PASS, commit**

```bash
git add frontend/src/utils/errorMessages.ts frontend/src/components/ frontend/src/test/
git commit -m "fix: migrate error extraction to numeric codes and server-provided messages"
```

---

## Task 7: Audit string code comparisons

Find any remaining places that check `error.code === 'STRING'` or `error.code === 'NAME_CONFLICT'` etc. and update them to numeric comparisons.

```bash
grep -r "error\.code.*==.*'" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "error\.code.*==.*\"" frontend/src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 1: Find all string code comparisons**
- [ ] **Step 2: Replace with numeric comparisons** (e.g. `code === 409`)
- [ ] **Step 3: Commit if any changes needed**

```bash
git add frontend/src/
git commit -m "fix: replace string error code comparisons with numeric HTTP status checks"
```

---

## Task 8: Run quality gates and push

- [ ] **Step 1:**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass.

- [ ] **Step 2: E2E against the real backend contract**

The unit-test mocks were wrong once already (they asserted string codes after the backend went numeric) — verify against the real stack:

```bash
docker compose -f docker-compose.poc.yml up --build -d
cd frontend
npx playwright test
```

Spot-check one real 422: add a repair for a device not in inventory — the alert must show "Device not found in inventory for this object", **not** "An unexpected error occurred."

- [ ] **Step 3: Push**

```bash
git push -u origin feature/error-handling-frontend
```

---

## Final Scope Checklist — AC verification

- [ ] **AC-FE-01:** 409 on `POST /divisions` → warning toast with `error.message`. Auto-dismisses in 5 seconds.
- [ ] **AC-FE-02:** 422 form failure → inline error below field, red border. No toast.
- [ ] **AC-FE-03:** 401 → clears JWT from auth store, redirects to `/login`.
- [ ] **AC-FE-04:** 5xx → full-page ErrorPage with "Try again" button.
- [ ] **AC-FE-05:** Network timeout → toast "Network error. Please check your connection."
- [ ] **AC-FE-06:** All error code checks use `=== 409` (number), not `=== 'NAME_CONFLICT'` (string).
- [ ] **AC-FE-07:** Toast has × close button. 409 = warning (yellow), others = error (red).
- [ ] TanStack Query retries 5xx up to 3 times with exponential backoff; does not retry 4xx.
- [ ] `<Toast />` component wired at app root level.
- [ ] `errorMessages.ts` helpers accept numeric codes and surface server `error.message`; Equipment/Travel/Repairs/Records tabs no longer show generic fallbacks for specific errors.
- [ ] No frontend test mocks `error.code` as a string.
- [ ] E2E: a real backend 422 renders its specific message in the UI.
- [ ] All tests pass, lint clean, TypeScript 0 errors.

## References

- `docs/impl/epics/unified-error-handling.md §"Part 2: Frontend Error Handling"` — all ACs
- `docs/impl/epics/unified-error-handling.md §"Network Error Handling"` — retry config
