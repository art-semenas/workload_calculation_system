# PoC M-01 Frontend Browser Test Checklist

## Purpose

Use this checklist to manually test the frontend in the browser.

For every step:

- mark whether it passed or failed
- write short notes about what happened
- if something is broken, describe exactly what you clicked, what you expected, and what happened instead

This file is meant to be reusable by another AI agent for bug fixing.

## How To Fill This In

- `Status:` use one of: `PASS`, `FAIL`, `PARTIAL`, `NOT TESTED`
- `Notes:` describe symptoms, error text, console errors, screenshots, URLs, or reproduction details
- Keep notes concrete and short

---

## Environment

- Date tested:
- Branch:
- Frontend URL:
- Backend URL:
- Browser:
- Test user:

## Global Notes

Status:

Notes:

---

## 1. Authentication Flow

### 1.1 Open login page

- Expected: `/login` loads and shows email + password fields
- Status: FAIL
- Notes: for http://localhost/login i get error 404, but for http://localhost i see login page

### 1.2 Submit empty login form

- Expected: validation errors are shown
- Status: PASS
- Notes: 

### 1.3 Submit invalid credentials

- Expected: login fails with a visible error message
- Status: FAIL
- Notes: login fail but redirect to localhost/login and nginx show 404 not found

### 1.4 Submit valid credentials

- Expected: login succeeds and redirects to `/`
- Status: PASS
- Notes:

### 1.5 Refresh protected page after login

- Expected: app stays usable and does not drop back to login unexpectedly
- Status: PASS
- Notes:

---

## 2. Layout And Navigation

### 2.1 Check main navigation items

- Expected: Dashboard, Objects, Divisions are enabled
- Status: PASS
- Notes:

### 2.2 Check disabled navigation items

- Expected: Engineers and Summary are visible but disabled
- Status: PASS
- Notes:

### 2.3 Check user name display

- Expected: logged-in user name is visible in layout/app bar
- Status: PASS
- Notes:

### 2.4 Logout

- Expected: logout returns user to `/login`
- Status: PASS
- Notes:

---

## 3. Dashboard Flow

### 3.1 Open dashboard

- Expected: `/` shows Dashboard heading
- Status: PASS
- Notes:

### 3.2 Check division overview table

- Expected: divisions table is rendered
- Status: PASS
- Notes: 

### 3.3 Click division row

- Expected: navigates to `/divisions/:id`
- Status: PASS
- Notes:

### 3.4 Check placeholders

- Expected: M-02 and M-03 placeholder cards are visible
- Status: PASS
- Notes:

---

## 4. Division CRUD Flow

### 4.1 Open division list page

- Expected: `/divisions` loads with divisions table or empty state
- Status: PASS
- Notes: 

### 4.2 Add division

- Expected: create dialog opens and division can be created
- Status: PASS
- Notes:

### 4.3 Confirm division appears in list

- Expected: new division appears without manual DB refresh
- Status: PASS
- Notes:

### 4.4 Open division detail page

- Expected: clicking division row opens `/divisions/:id`
- Status: PASS
- Notes:

### 4.5 Rename division inline

- Expected: inline edit works and saved name persists
- Status: PASS
- Notes:

### 4.6 Add branch from division detail

- Expected: branch dialog works and branch appears in branch table
- Status: PASS 
- Notes: 

---

## 5. Branch CRUD Flow

### 5.1 Open branch detail page

- Expected: clicking branch row opens `/branches/:id`
- Status: PASS
- Notes:

### 5.2 Rename branch inline

- Expected: inline edit works and saved name persists
- Status: PASS
- Notes:

### 5.3 Add object from branch page

- Expected: object dialog works and new object appears in branch object list
- Status: PASS
- Notes: 

### 5.4 Open object from branch list

- Expected: clicking object row opens `/objects/:id`
- Status: PASS
- Notes:

---

## 6. Object List Flow

### 6.1 Open object list page

- Expected: `/objects` loads object table or empty state
- Status: PASS
- Notes:

### 6.2 Check TOTAL Staffing column

- Expected: column exists and shows `-` in M-01
- Status: PASS
- Notes:

### 6.3 Filter by division

- Expected: selecting division changes object list
- Status: PASS
- Notes: 

### 6.4 Open Add object dialog

- Expected: dialog opens without frontend crash
- Status: PASS
- Notes:

### 6.5 Check branch selector in Add object dialog

- Expected: branch selector contains real branches grouped by division
- Status: PASS
- Notes:

### 6.6 Create object from object list page

- Expected: object is created successfully and appears in list
- Status: PASS
- Notes:

### 6.7 Open object detail from object list

- Expected: clicking row opens `/objects/:id`
- Status: PASS
- Notes:

---

## 7. Object Route Modes

### 7.1 Open `/objects/new` directly

- Expected: create form is shown, not an error page
- Status: PASS
- Notes:

### 7.2 Open `/objects/:id/edit` directly

- Expected: edit form is shown with prefilled values
- Status: PASS
- Notes:

### 7.3 Save object edit

- Expected: changes persist and detail page reflects updates
- Status: PASS
- Notes: there is Adress field that is not shown anywhere else

### 7.4 Open `/objects/:id`

- Expected: detail page shows tab layout
- Status: PASS
- Notes:

---

## 8. Object Delete Flow

### 8.1 Open delete confirmation

- Expected: delete dialog opens from object detail page
- Status: PASS
- Notes:

### 8.2 Check delete confirmation text

- Expected: text mentions related equipment, records, repairs, and travel data
- Status: PASS
- Notes:

### 8.3 Confirm delete

- Expected: object is deleted and app redirects to `/objects`
- Status: PASS
- Notes:

### 8.4 Verify object is removed

- Expected: deleted object no longer appears in object lists
- Status: PASS
- Notes:

---

## 9. Equipment Tab: Physical Inventory

### 9.1 Open Equipment tab

- Expected: Physical Equipment and System Assignments sections are visible
- Status: PASS
- Notes:

### 9.2 Add physical device

- Expected: add device dialog works and device appears in inventory table
- Status: PASS
- Notes:

### 9.3 Edit physical quantity

- Expected: quantity edit saves successfully
- Status: PASS
- Notes:

### 9.4 Remove physical device without assignments

- Expected: remove confirmation works and device is removed
- Status: PASS
- Notes:

### 9.5 Remove physical device with assignments

- Expected: confirmation text lists affected assignments before removal
- Status: PASS
- Notes:

---

## 10. Equipment Tab: System Assignments

### 10.1 Add system assignment for a device

- Expected: assignment can be created for a valid system
- Status:
- Notes:

### 10.2 Check system labels

- Expected: user-facing labels show `Security`, `Fire`, `Video`
- Status:
- Notes:

### 10.3 Check system options filtering

- Expected: already-used system types do not appear again for the same device
- Status:
- Notes:

### 10.4 Edit maintained quantity

- Expected: maintained quantity update saves successfully
- Status:
- Notes:

### 10.5 Remove system assignment

- Expected: assignment removal works and row disappears
- Status:
- Notes:

### 10.6 Trigger over-capacity warning

- Expected: warning appears when maintained quantity is greater than physical quantity
- Status:
- Notes:

### 10.7 Trigger inventory error case

- Expected: UI shows `Device is not in inventory` when backend returns that error
- Status:
- Notes:

### 10.8 Trigger missing norms/context error case

- Expected: UI shows `No norms configured for this system` when backend returns that error
- Status:
- Notes:

---

## 11. Records Tab

### 11.1 Open Records tab

- Expected: all 5 numeric fields are shown and prefilled
- Status:
- Notes:

### 11.2 Save valid values

- Expected: values save successfully and persist after reload/reopen
- Status:
- Notes:

### 11.3 Try invalid negative value

- Expected: validation blocks save
- Status:
- Notes:

### 11.4 Check numeric input handling

- Expected: no `expected number, received string` validation error
- Status:
- Notes:

---

## 12. Repairs Tab

### 12.1 Open Repairs tab

- Expected: dynamic repair rows are shown from catalog
- Status:
- Notes:

### 12.2 Check default zero behavior

- Expected: repair types without saved data show `0`
- Status:
- Notes:

### 12.3 Save valid repair counts

- Expected: changes save successfully and persist
- Status:
- Notes:

### 12.4 Try invalid negative value

- Expected: validation blocks save
- Status:
- Notes:

---

## 13. Travel Tab

### 13.1 Open Travel tab

- Expected: editable transport, distance, and one-way time fields are shown
- Status:
- Notes:

### 13.2 Check round-trip display

- Expected: read-only `Round Trip Time (min)` is visible with `auto-calculated` text
- Status:
- Notes:

### 13.3 Save valid travel values

- Expected: travel values save successfully and persist
- Status:
- Notes:

### 13.4 Try invalid negative numeric value

- Expected: validation blocks save
- Status:
- Notes:

### 13.5 Check numeric input handling

- Expected: no `expected number, received string` validation error
- Status:
- Notes:

---

## 14. Placeholder Scope Checks

### 14.1 Engineers navigation item

- Expected: visible but disabled
- Status:
- Notes:

### 14.2 Summary navigation item

- Expected: visible but disabled
- Status:
- Notes:

### 14.3 Engineers tab on object detail

- Expected: placeholder text for M-03 only
- Status:
- Notes:

### 14.4 Summary tab on object detail

- Expected: placeholder text for M-02 only
- Status:
- Notes:

---

## 15. Direct Route Smoke Test

Test each route directly in browser address bar.

### 15.1 `/login`

- Status:
- Notes:

### 15.2 `/`

- Status:
- Notes:

### 15.3 `/divisions`

- Status:
- Notes:

### 15.4 `/divisions/:id`

- Status:
- Notes:

### 15.5 `/branches/:id`

- Status:
- Notes:

### 15.6 `/objects`

- Status:
- Notes:

### 15.7 `/objects/new`

- Status:
- Notes:

### 15.8 `/objects/:id`

- Status:
- Notes:

### 15.9 `/objects/:id/edit`

- Status:
- Notes:

---

## Final Summary For AI Agent

### Working Features

Status:

Notes:

### Broken Features

Status:

Notes:

### Reproduction Steps For Bugs

Status:

Notes:

### Error Messages Seen

Status:

Notes:

### Browser Console Errors Seen

Status:

Notes:

### Screenshot References

Status:

Notes:
