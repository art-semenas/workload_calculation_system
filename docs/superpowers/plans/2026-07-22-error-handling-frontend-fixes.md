# WS-B Step 2 Follow-up — Error Handling Review Fixes

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Close the findings from the code review of `feature/error-handling-frontend` (PR #15). Three are functional defects where a user action fails and the user is misled or told nothing; the rest are robustness, accessibility, and test-quality gaps.

**Branch:** `feature/error-handling-frontend` (same PR — not yet merged)
**Reviewed range:** `11d4d88..3ccaa74`
**Workstream:** B — Unified Error Handling

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/unified-error-handling.md §"Part 2: Frontend Error Handling"` — AC-FE-01 … AC-FE-07
2. `docs/superpowers/plans/ws-b-02-error-handling-frontend.md` — the original plan
3. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest, Playwright must pass

**Severity note:** finding 9 (toast `aria-hidden` under a modal) is raised from the reviewer's MINOR to IMPORTANT here, because it breaks AC-FE-01's canonical path (409 from `POST /divisions` while the create dialog is open) for assistive technology and it is the reason `CreateDivisionDialog.test.tsx` asserts against the store instead of the DOM — a test that would pass even if `<Toast />` were never mounted.

---

## Consolidated Fix List

### CRITICAL
None.

### IMPORTANT
- [x] `frontend/src/pages/EngineerDetailPage.tsx:153-160` — `handleAssignSubmit` swallows the rejection, so `EngineerAssignDialog` closes on failure exactly as on success and its own error `<Alert>` is unreachable dead code
- [x] `frontend/src/pages/EngineerDetailPage.tsx:141-151` — on a failed remove, the confirm dialog stays open while the message renders behind the modal backdrop
- [x] `frontend/src/api/axios.ts:10-13` — no `timeout` on the Axios instance; AC-FE-05 ("no response within 30s") cannot fire for a hung server
- [x] `frontend/src/utils/errorMessages.ts:50-56` — a 4xx whose body lacks the envelope produces no feedback at all: the interceptor only toasts `>= 500` and this branch returns silently
- [x] `frontend/src/App.tsx:24` — `<Toast />` renders inside `#root`, so MUI's modal manager marks it `aria-hidden` whenever a dialog is open

### MINOR
- [x] `frontend/src/stores/notificationStore.ts:20-27` — message-only dedup suppresses a genuine second notification arriving just before the first auto-dismisses
- [x] `frontend/src/stores/notificationStore.ts:24` — `crypto.randomUUID()` throws outside a secure context; thrown inside the Axios rejection handler it replaces the original error, so the user sees the generic message instead of the server's
- [x] `frontend/src/api/axios.ts:94-99` + `DashboardPage.tsx:67`, `ObjectDetailPage.tsx:583`, `SvodPage.tsx:462` — one 5xx yields both a full-page `ErrorPage` and a toast repeating the same text
- [x] `frontend/src/pages/DashboardPage.tsx:56-57` — `useSvod`/`useCoverageGaps` have no error branch; a failed coverage-gaps query renders "No uncovered objects", a false all-clear on a staffing-risk metric
- [x] `frontend/src/test/axios.test.ts` — nothing asserts the response interceptor is actually registered; deleting the `notifyResponseError(error)` call would keep all 233 tests green
- [x] `frontend/src/store/` — empty directory left on disk after the consolidation

---

## Task 1: Propagate assignment failures to the dialog

**Files:** `frontend/src/pages/EngineerDetailPage.tsx`, `frontend/src/components/engineers/EngineerAssignDialog.tsx`, `frontend/src/test/EngineerDetailPage.test.tsx`

**Defect:** `handleAssignSubmit` catches the rejection and returns normally. `EngineerAssignDialog.handleAssign` awaits it, sees a resolved promise, then clears the selection and calls `onClose()`. A 422 (e.g. `EngineerInactiveException`) therefore closes the dialog as if the assignment succeeded, while the message lands in an `<Alert>` further down the page.

- [x] **Step 1: Write a failing test** — assign fails with 422; assert the dialog stays open and shows the server message.
- [x] **Step 2:** Decide one owner for the error and remove the other. Preferred: `handleAssignSubmit` rethrows after `handleFormError`, and the dialog's own `catch` renders it; or drop the dialog's error state and have the page close the dialog only on success. Do not leave both.
- [x] **Step 3:** Same treatment for `handleRemoveConfirm` — move `setConfirmOpen(false)` so the confirm dialog closes on failure, or surface the message inside the dialog rather than behind it.
- [x] **Step 4:** Run — expect PASS. Commit: `fix: keep engineer assign and remove dialogs open with visible errors on failure`

---

## Task 2: Give the Axios instance a request timeout (AC-FE-05)

**Files:** `frontend/src/api/axios.ts`, `frontend/src/test/axios.test.ts`

**Defect:** `axios.create({ baseURL, headers })` sets no `timeout`, so a hung backend never rejects. AC-FE-05 requires a toast when there is no response within 30s.

- [x] **Step 1: Write a failing test** asserting the instance is configured with `timeout: 30_000`, and that an `ECONNABORTED` error (no `response`) routes to the network toast.
- [x] **Step 2:** Add `timeout: 30_000` to `axios.create`.
- [x] **Step 3:** Consider whether the XLSX export in `SvodPage` needs a longer per-request override; if so set it on that call, not globally.
- [x] **Step 4:** Run — expect PASS. Commit: `fix: add 30s request timeout so hung requests surface a network error toast`

---

## Task 3: Make the `handleFormError` fallback status-driven

**Files:** `frontend/src/utils/errorMessages.ts`, `frontend/src/test/errorMessages.test.ts`

**Defect:** the current guard assumes every envelope-less Axios error is a network error or 5xx already toasted by the interceptor. That is false for 4xx: a proxy-generated 400/413 with an HTML body is reported by nobody.

- [x] **Step 1: Write a failing test** — a 400 with a non-envelope body reports the generic message; a 500 and a network error still stay silent (no double-reporting).
- [x] **Step 2:** Replace `if (!isAxiosError(err))` with a status-driven condition, e.g. report when `!isAxiosError(err) || (err.response?.status ?? 0) < 500`, keeping 401 silent.
- [x] **Step 3:** Run — expect PASS. Commit: `fix: report envelope-less 4xx responses instead of failing silently`

---

## Task 4: Portal the Toast out of the modal's aria-hidden subtree

**Files:** `frontend/src/components/common/Toast.tsx`, `frontend/src/test/Toast.test.tsx`, `frontend/src/test/CreateDivisionDialog.test.tsx`

**Defect:** MUI's `ModalManager` sets `aria-hidden="true"` on every `document.body` child except the modal portal. `<Toast />` renders inside `#root`, so with any dialog open the toast is visible but removed from the accessibility tree — exactly AC-FE-01's scenario.

- [x] **Step 1: Write a failing test** — with a MUI `Dialog` open, a toast is still reachable by `getByRole('alert')`.
- [x] **Step 2:** Wrap the Toast's output in MUI `<Portal>` (renders into `document.body`).
- [x] **Step 3:** Strengthen `CreateDivisionDialog.test.tsx` to assert the rendered toast rather than only the store, so the test can no longer pass with `<Toast />` unmounted.
- [x] **Step 4:** Run — expect PASS. Commit: `fix: portal toasts to document.body so they stay announced while a dialog is open`

---

## Task 5: Refine notification dedup and id generation

**Files:** `frontend/src/stores/notificationStore.ts`, `frontend/src/test/Toast.test.tsx`

- [x] **Step 1: Write failing tests** — (a) a duplicate message restarts the visible toast's dismiss timer instead of being dropped outright; (b) `show` works when `crypto.randomUUID` is undefined.
- [x] **Step 2:** Keep dedup, but refresh the existing notification (new `id` or an explicit `shownAt` the auto-dismiss effect depends on) so the second event extends the toast rather than vanishing.
- [x] **Step 3:** Add an id fallback (`crypto.randomUUID?.() ?? \`n-${Date.now()}-${counter++}\``) so a non-secure-context origin cannot throw inside the Axios rejection handler.
- [x] **Step 4:** Run — expect PASS. Commit: `fix: refresh duplicate notifications and stop relying on crypto.randomUUID`

---

## Task 6: Reconcile the 5xx toast with the full-page ErrorPage

**Files:** `frontend/src/api/axios.ts` or the three error-bounded pages, plus tests

**Defect:** a 500 on a page-critical query renders `ErrorPage` *and* a toast with the identical message. Both were specified independently (original plan Tasks 2 and 5) and never reconciled.

Note this task is in tension with Task 7 — settle the rule first: *a failure that a page renders as a full-page error must not also toast.*

- [x] **Step 1:** Choose the rule. Simplest: drop the blanket 5xx toast from the interceptor and let query failures surface through `ErrorPage`/inline handling, keeping the toast for network errors only. Alternative: mark page-boundary queries with a `meta` flag the interceptor honors.
- [x] **Step 2: Write tests** covering the chosen rule.
- [x] **Step 3:** Implement, run, commit: `refactor: show a 5xx once — full-page error or toast, not both`

---

## Task 7: Extend the 5xx boundary to the remaining Dashboard queries

**Files:** `frontend/src/pages/DashboardPage.tsx`, `frontend/src/test/DashboardPage.test.tsx`

**Defect:** only the divisions query is error-bounded. A failed `useCoverageGaps` renders "No uncovered objects" — a false all-clear on a staffing-risk metric, which is worse than an error.

- [x] **Step 1: Write a failing test** — coverage-gaps query fails with 500; assert the UI does not claim zero gaps.
- [x] **Step 2:** Either extend the `ErrorPage` boundary to all three queries, or render a per-section error state distinguishing "none" from "unknown".
- [x] **Step 3:** Run — expect PASS. Commit: `fix: distinguish unknown from zero when dashboard aggregation queries fail`

---

## Task 8: Test that the response interceptor is wired

**Files:** `frontend/src/test/axios.test.ts`

**Defect:** tests call the exported `notifyResponseError` directly, so removing its call site inside the interceptor would not fail a single test.

- [x] **Step 1: Write a failing test** driving a real request through the instance (e.g. an adapter stub or `axios-mock-adapter`) and asserting the toast appears — verify it fails when the interceptor line is removed.
- [x] **Step 2:** Add a companion test that a 401 redirect does not additionally toast.
- [x] **Step 3:** Run — expect PASS. Commit: `test: cover the response interceptor wiring end to end`

---

## Task 9: Remove the leftover empty store directory

- [x] **Step 1:** `rmdir frontend/src/store` (untracked and empty; nothing to commit unless the OS keeps a stub).

---

## Task 10: Quality gates

- [x] **Step 1:**

```bash
cd frontend
npm run format && npm run lint && npx tsc --noEmit && npm test
```

- [x] **Step 2: E2E against a rebuilt stack**

```bash
docker compose -f docker-compose.poc.yml up --build -d
cd frontend && npx playwright test
```

- [x] **Step 3:** Push to the existing PR branch — do not open a second PR.

---

## Out Of Scope (tracked, not fixed here)

- **Backend healthcheck is broken:** `docker-compose.poc.yml` runs `wget` inside a distroless image that has no `wget`, so the backend container is permanently `unhealthy` even though the API is fine. Any `depends_on: condition: service_healthy` against it would deadlock. Backend/infra change — separate branch.
- **AC-FE-02 presentation split:** dialogs render a form-level `<Alert>` while inline name editors use field-level `setError`. Cosmetic on single-field forms; pick one if it ever matters.
