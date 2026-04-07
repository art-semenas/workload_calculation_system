# PoC M-01 Frontend Task Checklist

Source plan: `docs/superpowers/plans/2026-03-30-poc-m01-frontend.md`

## Status Key

- `[x]` Verified against current branch
- `[~]` Partially implemented or contract-drifted
- `[ ]` Not verified

## Checklist

- `[x]` **Task 0 — Create feature branch**  
  Branch context is present and the work was verified on `feature/poc-m01-frontend`.

- `[~]` **Task 1 — TypeScript types and Zod validation schemas**  
  All planned type files exist, but object types still include `address`, which drifts from the later verified contract and current TOR alignment.

- `[x]` **Task 2 — API modules and TanStack Query hooks**  
  All planned API and hook modules exist and the frontend quality gates confirm they compile and test cleanly.

- `[x]` **Task 3 — Shared UI components**  
  `ConfirmDialog` and `FormTextField` are implemented and covered by tests.

- `[~]` **Task 4 — Login page**  
  The page, form, validation, and success flow exist, but invalid-login behavior is undermined by the global 401 redirect in the shared Axios interceptor.

- `[x]` **Task 5 — AppLayout update and ProtectedRoute extraction**  
  Disabled nav items, user display, extracted `ProtectedRoute`, and router wiring are present.

- `[x]` **Task 6 — Division list page**  
  Division list, create dialog, loading state, and navigation are implemented.

- `[x]` **Task 7 — Division detail page**  
  Inline rename, branch list, create-branch dialog, and row navigation are implemented.

- `[~]` **Task 8 — Branch detail page**  
  The page works, but it bypasses the planned `BranchDetail.objects` payload and instead loads all objects then filters client-side, so the intended branch-detail contract is only partially implemented.

- `[x]` **Task 9 — Object list page**  
  Division filter, grouped branch selection, create flow, row navigation, and `TOTAL Staffing` placeholder are implemented.

- `[~]` **Task 10 — Object detail page with route modes**  
  `/objects/new`, `/objects/:id`, and `/objects/:id/edit` are all wired and render, but create/edit forms still carry the `address` field and edit mode explicitly prevents branch changes, so object metadata editing is incomplete against the plan.

- `[x]` **Task 11 — Equipment tab**  
  Two-layer equipment UI is implemented with inventory CRUD, assignment CRUD, warnings, filtered options, and error mapping.

- `[x]` **Task 12 — Records tab**  
  RHF + Zod form, prefill, save flow, and loading state are implemented.

- `[x]` **Task 13 — Repairs tab**  
  Dynamic repair rows from catalog, validation, and save behavior are implemented.

- `[x]` **Task 14 — Travel tab**  
  Editable travel fields, read-only round-trip display, and payload exclusion for `roundTripMin` are implemented.

- `[x]` **Task 15 — Dashboard page**  
  Division overview and M-02/M-03 placeholder sections are implemented, including row navigation.

- `[x]` **Task 16 — Run all quality gates**  
  Verified on current branch: `npm run format:check`, `npm run lint`, `npx tsc --noEmit`, and `npm test` all pass. The test run emits React `act(...)` warnings, but exits 0.

## Remaining Gaps To Treat As Open

- `[ ]` Fix auth 401 handling so invalid login stays on the login page with an inline error instead of being redirected by the global Axios interceptor.
- `[ ]` Remove object-form contract drift around `address` if frontend should follow the current TOR-aligned object schema.
- `[ ]` Allow full object metadata editing in edit mode if branch reassignment remains in scope for PoC M-01.
- `[ ]` Rework branch detail to consume the branch-detail object list payload directly instead of loading all objects and filtering client-side.
