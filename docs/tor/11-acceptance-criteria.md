## 14. Acceptance Criteria

### AC-01: Data Completeness
Import of `Шаблон_нагрузки_з_v_4_00.xlsx` produces exactly 2,935 object records. All non-zero equipment values from ОС/ПС/Видео sheets are represented as `object_system_assignments` rows with corresponding `object_devices` rows.

### AC-02: Calculation Accuracy
All computed СВОД values match source XLSX "Расчет" sheet values within ±0.001. Verified fields: `os_monthly_avg`, `ps_monthly_avg`, `video_monthly_avg`, `records_monthly`, `repair_no_travel_monthly`, `repair_with_travel_monthly`, `total_no_travel_min`, `total_with_travel_min`, `itogo_chislo_no_travel`, `itogo_chislo_with_travel`, `r1_per_visit_total`, `r2_per_visit_total`.

### AC-03: Dynamic Normative Editability
After an admin updates `r1_minutes` or `r2_minutes` on any `device_system_contexts` row, all affected object summaries are marked stale and recalculated by the background job — without code deployment. UI shows stale indicator during recalculation.

### AC-04: New Device Type Usable Without Code Changes
Admin creates a device type, adds a system context (R1/R2), assigns it to an object, sets `quantity_maintained`. СВОД recalculates correctly. No code deployment required.

### AC-05: System Context Restriction Enforced
UI "Assign to system" dropdown shows only system types with a valid `device_system_contexts` row for the device. API rejects `POST /objects/:id/assignments` where (device_type_id, system_type) has no context row — returns HTTP 422 with code `NO_CONTEXT_FOR_SYSTEM`.

### AC-06: Context Deletion Blocked When In Use
`DELETE /catalog/devices/:id/contexts/:cid` returns HTTP 409 listing affected objects when any `object_system_assignments` references that context. Database FK `ON DELETE RESTRICT` also prevents bypass via direct SQL.

### AC-07: Computed Fields Are Read-Only
API ignores or rejects attempts to set `total_repairs`, `round_trip_min`, `is_stale`, or any `summaries` field directly. Returns HTTP 422 if attempted. Note: `total_repairs` is the stored snapshot of `kvo` (COUNT of distinct repair types with count > 0) at the time of last calculation — it is a computed output, not an input.

### AC-08: Role Enforcement
Editor assigned to Division A cannot read or write objects in Division B. `PUT /objects/:id` for a Division B object returns HTTP 403.

### AC-09: Export Fidelity
XLSX export of СВОД matches original template column structure and values within ±0.001.

### AC-10: Performance
СВОД page (first 100 rows, 2,935 objects imported) loads in under 3 seconds. Bulk recalculation of all objects completes in under 60 seconds.

### AC-11: Workflow Enforcement — Assign Before Physical Inventory Is Blocked
Attempting to `POST /objects/:id/assignments` for a device_type_id that has no corresponding `object_devices` row at that object returns HTTP 422 with code `DEVICE_NOT_IN_INVENTORY`.

### AC-12: Shared Device Multi-System Calculation Is Correct
An object with one Galaxy 512 (контроллер АСПС и СО) assigned to both ОС and ПС with `quantity_maintained = 1` each produces:
- `os_r1_per_visit` containing the 15 min contribution from this device
- `ps_r1_per_visit` containing the 15 min contribution from the same device
- Physical inventory shows 1 unit
- СВОД `Охрана` and `Пожарная сигнализация` columns both reflect this device's contribution independently

### AC-13: System Context Restriction UI Test
In the Equipment tab, for a device that has `device_system_contexts` only for ОС:
- "Assign to system" dropdown shows only "ОС"
- ПС and Видео are not present in the dropdown (not hidden/disabled — absent)
- Attempting `POST /objects/:id/assignments` with `system_type: "ПС"` returns HTTP 422 `NO_CONTEXT_FOR_SYSTEM`

### AC-14: Engineer Workload Equals Sum of Object Shares
For any engineer E assigned to objects O1…On, `engineer_summaries.total_load` must equal `SUM(summaries[Oi].itogo_chislo_with_travel / COUNT(engineers at Oi))` within ±0.000001.

### AC-15: Equal Split Consistency
The sum of `total_load` across all engineers assigned to a given object must equal that object's `itogo_chislo_with_travel` within ±0.000001.

### AC-16: Capacity and Status Logic
Given engineer with `capacity_fte = 0.8` and `total_load = 0.76`:
- `load_ratio = 0.76 / 0.8 = 0.95`
- With `ENGINEER_WARNING_THRESHOLD = 0.9`: status must be "warning"
Given `total_load = 0.84`: `load_ratio = 1.05` → status must be "overloaded"

### AC-17: Assignment Change Triggers All Co-Engineer Recalculation
When a third engineer is added to an object that previously had two, all three engineers' `engineer_summaries.is_stale` must be set to TRUE in the same transaction. After background recalculation, each engineer's share of that object must equal `itogo_chislo_with_travel / 3`.

### AC-18: Coverage Gap Reporting
`GET /coverage/gaps?division_id=X` returns all objects in division X that have zero rows in `object_engineers`. Verified against manual count from the object list.

### AC-19: Period Data Isolation
Repair counts entered in period H1 2025 must not appear in H2 2025 calculations. After switching the active period, `GET /objects/:id/repairs` returns 0 counts for repair types with no H2 2025 rows, even if H1 2025 rows exist for the same types.

### AC-20: On-Demand Recalculation Only
After updating a normative (`PUT /catalog/devices/:id/contexts/:cid`), all affected summaries must be marked `is_stale = TRUE` but values in the СВОД must remain unchanged (showing stale indicator) until `POST /svod/recalculate` is called. Auto-recalculation must not occur.

### AC-21: Import Engineer Resolution
Import of `Шаблон_нагрузки_з_v_4_00.xlsx` must: (a) match engineer names to existing `users.name` records, (b) create placeholder accounts for unresolved names, (c) return a report listing matched engineers, created placeholders, and objects with no engineer name in the source. No object must be left without an `object_engineers` row after import (all get either a matched or placeholder account).

### AC-22: Repair Threshold Formula — Three-Band Correctness
All three threshold bands must be verified in the integration test suite (`CalculationServiceTest`):

**Band A — mid-range (5 < kvo ≤ 10):** For the reference object with kvo = 8, `round_trip_min = 20`, `PZV = 20`, `repair_work_6months = 361`:
- `effective_trips = 8`
- `repair_travel_6months = 8 × 20 = 160`
- `repair_pzv_6months    = 8 × 20 = 160`
- `repair_with_travel_monthly = (361 + 160 + 160) / 5 = 136.2 ±0.001`

**Band B — zero threshold (kvo ≤ 5):** For an object with kvo = 3:
- `effective_trips = 0`
- `repair_travel_6months = 0`, `repair_pzv_6months = 0`

**Band C — cap (kvo > 10):** For an object with kvo = 17, `round_trip_min = 20`:
- `effective_trips = 10` (capped)
- `repair_travel_6months = 10 × 20 = 200`
- `repair_pzv_6months    = 10 × 20 = 200`

