# PoC M-01 Frontend Playwright Test Plan

Source checklist: `docs/superpowers/plans/poc-m01-frontend-browser-test-checklist.md`

## Goal

Convert the manual browser checklist into an executable Playwright suite in stages, starting with stable smoke coverage and keeping the more stateful or judgment-based checks manual until the test environment is better controlled.

## Runtime Assumptions

- Frontend base URL: `http://localhost`
- Backend is reachable through the PoC stack reverse proxy
- Docker PoC stack is already running
- Seeded admin credentials:
  - email: `admin@workload.local`
  - password: `password`

## Automation Strategy

- Phase 1: scaffold Playwright and add a read-heavy smoke suite
- Phase 2: add deterministic CRUD tests that create isolated test data
- Phase 3: add stateful object-detail tab flows for records, repairs, travel, and selected equipment actions
- Keep visual quality and exploratory checks manual

## Checklist Mapping

### Automate First

- `1.1` Open login page
- `1.2` Submit empty login form
- `1.3` Submit invalid credentials
- `1.4` Submit valid credentials
- `1.5` Refresh protected page after login
- `2.1` Check main navigation items
- `2.2` Check disabled navigation items
- `2.3` Check user name display
- `2.4` Logout
- `3.1` Open dashboard
- `3.2` Check division overview table
- `3.3` Click division row
- `3.4` Check placeholders
- `6.1` Open object list page
- `6.2` Check TOTAL Staffing column
- `6.3` Filter by division
- `6.4` Open Add object dialog
- `6.5` Check branch selector in Add object dialog
- `6.7` Open object detail from object list
- `7.1` Open `/objects/new` directly
- `7.2` Open `/objects/:id/edit` directly
- `7.4` Open `/objects/:id`
- `8.1` Open delete confirmation
- `8.2` Check delete confirmation text
- `14.1` Engineers navigation item
- `14.2` Summary navigation item
- `14.3` Engineers tab on object detail
- `14.4` Summary tab on object detail
- `15.1` through `15.9` direct route smoke tests

### Automate After Basic Smoke Is Stable

- `4.1` through `4.6` Division CRUD flow
- `5.1` through `5.4` Branch CRUD flow
- `6.6` Create object from object list page
- `7.3` Save object edit
- `8.3` Confirm delete
- `8.4` Verify object is removed
- `9.1` through `9.5` Physical inventory flow
- `10.1` through `10.6` System assignments main flow
- `11.1` through `11.4` Records tab
- `12.1` through `12.4` Repairs tab
- `13.1` through `13.5` Travel tab

### Keep Manual For Now

- `10.7` Trigger inventory error case
- `10.8` Trigger missing norms/context error case
- Final summary freeform sections
- Browser console and screenshot review
- Subjective UX quality notes

## Why These Stay Manual For Now

- Error-path checks for backend codes need deterministic fixtures or API-level fault injection.
- Some CRUD flows mutate shared seed data and need either database reset hooks or disposable namespaces to stay reliable in CI.
- Console review and screenshot capture are useful in Playwright, but interpreting whether they matter is still a human step unless explicit failure rules are added.

## Initial Playwright Suite Scope

The first smoke suite should cover:

- login page loads directly at `/login`
- invalid login stays user-visible
- valid login reaches dashboard
- dashboard basic sections render
- main nav items render and disabled items are visible
- direct route smoke for key M-01 routes after login
- object detail placeholder tabs and delete confirmation text

## Data And Isolation Rules

- Prefer read-only assertions in the first smoke suite
- If a test creates data, use a unique timestamped name and clean it up in the same test when feasible
- Avoid depending on object counts or exact seeded row counts unless the seed dataset is explicitly controlled

## Proposed File Layout

```text
frontend/
  playwright.config.ts
  e2e/
    smoke.spec.ts
    route-smoke.spec.ts
    helpers/
      auth.ts
      selectors.ts
```

## Definition Of Done For Phase 1

- Playwright is installed and runnable from `frontend/`
- A smoke suite runs against `http://localhost`
- At least one authenticated and one unauthenticated flow from the checklist are automated
- Direct-route smoke coverage exists for key PoC M-01 routes
- The manual checklist remains the source for later expansion, but the first high-value section is executable
