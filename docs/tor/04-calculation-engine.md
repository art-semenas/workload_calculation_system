## 6. Calculation Engine

All calculations are performed **server-side only**. The `summaries` table is a precomputed cache. When source data changes, the affected summary is marked `is_stale = TRUE` synchronously; a background job recalculates it asynchronously.

### 6.1 Pipeline Overview

```
Stage 1 — Per-assignment contribution
  For each (object, device, system_type) assignment:
    r1_contrib = quantity_maintained × context.r1_minutes
    r2_contrib = quantity_maintained × context.r2_minutes

Stage 2 — Per-system per-visit subtotals
  For each system S ∈ {ОС, ПС, Видео}:
    R1_per_visit[S] = SUM(r1_contrib) for all assignments where system_type = S
    R2_per_visit[S] = SUM(r2_contrib) for all assignments where system_type = S

Stage 3 — Annual time (system-specific visit frequencies)
  R1_annual[S] = R1_per_visit[S] × config[S_R1_VISITS_PER_YEAR]
  R2_annual[S] = R2_per_visit[S] × config[S_R2_VISITS_PER_YEAR]

Stage 4 — Monthly average per system
  monthly_avg[S] = (R1_annual[S] + R2_annual[S]) / 12

Stage 5 — Records and repairs (§6.5, §6.6)
  records_monthly = records_6months / 6  (§6.5)

  For repairs (§6.6):
    repair_work_6months = SUM(count × time_minutes)
    kvo = COUNT(repair types with count > 0)          ← distinct type count, NOT sum of quantities
    effective_trips = threshold(kvo, ZERO_THRESHOLD, CAP)  ← 0 | kvo | CAP
    repair_travel_6months = effective_trips × round_trip_min
    repair_pzv_6months    = effective_trips × PZV_MINUTES

Stage 6 — СВОД aggregation and final headcount (§6.7, §6.8)
```

### 6.2 Maintenance Visit Frequencies

Visit frequency is tied to **system type**, not device type. Stored in `app_config`:

| Config Key | Value | Meaning |
|---|---|---|
| `OS_R1_VISITS_PER_YEAR` | 10 | ОС routine inspections/year |
| `OS_R2_VISITS_PER_YEAR` | 2 | ОС full maintenance visits/year |
| `PS_R1_VISITS_PER_YEAR` | 8 | ПС routine inspections/year |
| `PS_R2_VISITS_PER_YEAR` | 4 | ПС full maintenance visits/year |
| `VIDEO_R1_VISITS_PER_YEAR` | 10 | Видео routine inspections/year |
| `VIDEO_R2_VISITS_PER_YEAR` | 2 | Видео full maintenance visits/year |

### 6.3 Per-System Monthly Average

```sql
-- Pseudocode for system S:
R1_per_visit[S] = SUM(
    osa.quantity_maintained * dsc.r1_minutes
    FROM object_system_assignments osa
    JOIN device_system_contexts dsc ON dsc.id = osa.context_id
    WHERE osa.object_id = :object_id
    AND   osa.system_type = S
)

R2_per_visit[S] = SUM(
    osa.quantity_maintained * dsc.r2_minutes
    -- same joins and WHERE
)

R1_annual[S]   = R1_per_visit[S] * config[S + '_R1_VISITS_PER_YEAR']
R2_annual[S]   = R2_per_visit[S] * config[S + '_R2_VISITS_PER_YEAR']
monthly_avg[S] = (R1_annual[S] + R2_annual[S]) / 12
```

**Verified example — ОС, Object "Архив г. Брест":**
```
Assignments for ОС:
  серий А6, Аларм × 2:     R1 = 2×5=10,     R2 = 2×8=16
  Устройство доступа × 2:  R1 = 2×1=2,      R2 = 2×4=8
  Шлейфы × 12:             R1 = 12×0.06=0.72, R2 = 12×0.7=8.4
  Каналы × 2:              R1 = 2×0.02=0.04,  R2 = 2×1.5=3
  Извещатели × 21:         R1 = 21×0.7=14.7,  R2 = 21×3=63

R1_per_visit = 29.14,  R2_per_visit = 98.4
R1_annual    = 29.14 × 10 = 291.4
R2_annual    = 98.4  × 2  = 196.8
monthly_avg  = 488.2 / 12 = 40.683 min  ✓
```

**Verified example — ПС, Object "Архив г. Брест":**
```
R1_per_visit = 10.52,  R2_per_visit = 73.0
R1_annual    = 10.52 × 8 = 84.16
R2_annual    = 73.0  × 4 = 292.0
monthly_avg  = 365.0 / 12 = 30.417 min  ✓
```

### 6.4 Shared-Device Multi-System Example

**Scenario:** One Galaxy 512 (контроллер АСПС и СО) box physically installed at an object, responsible for both ОС and ПС functions.

**Database state:**
```
object_devices:
  { object_X, "Galaxy 512 контроллер", quantity_physical: 1 }
  -- One physical box on site

object_system_assignments:
  { object_X, "Galaxy 512 контроллер", system_type: ОС,
    quantity_maintained: 1, context_id: → dsc[Galaxy 512 контроллер, ОС] }
  { object_X, "Galaxy 512 контроллер", system_type: ПС,
    quantity_maintained: 1, context_id: → dsc[Galaxy 512 контроллер, ПС] }
  -- Same box counted in both systems' maintenance schedules
```

**Calculation contribution:**
```
ОС stage:
  R1_contrib = 1 × 15 = 15 min  (ОС context r1)
  R2_contrib = 1 × 20 = 20 min  (ОС context r2)

ПС stage:
  R1_contrib = 1 × 15 = 15 min  (ПС context r1 — same value here, but independent)
  R2_contrib = 1 × 20 = 20 min  (ПС context r2)

Both contributions feed into their respective system monthly_avg calculations
using ОС visit frequency (10R1+2R2) and ПС visit frequency (8R1+4R2) respectively.
```

**UI representation in the Equipment tab:**
```
Galaxy 512 (контроллер АСПС и СО)  [Physical: 1 unit]
  ├── ОС   qty_maintained: [1]   R1: 15 min   R2: 20 min   [Remove]
  └── ПС   qty_maintained: [1]   R1: 15 min   R2: 20 min   [Remove]
     [+ Assign to system ▾]  → dropdown: Видео (if context exists) only
```

No warning is shown: 1 maintained (per assignment) = 1 physical. The sum
across assignments is 2, but this is expected and does not trigger any alert.

### 6.5 Records Monthly Average

```
records_6months = SUM(task_quantity[j] × records_normative[j])  for all j
records_monthly = records_6months / 6
```

### 6.6 Repair Monthly Averages

#### Step 1 — Work time

```
repair_work_6months = SUM(object_repairs.count × repair_types.time_minutes)
                      WHERE object_repairs.count > 0
                      AND   object_repairs.period_id = current_period
```

#### Step 2 — К-во ремонтов (kvo)

```
kvo = COUNT(object_repairs rows WHERE count > 0 AND period_id = current_period)
```

`kvo` counts **distinct repair types performed at least once** in the period — not the sum of quantities. This is the value tested against thresholds in Steps 3 and 4.

> **Example:** "Замена аккумулятора × 3" and "Замена извещателя × 5" → `kvo = 2`, not 8.

#### Step 3 — Threshold for effective trip count

```
effective_trips =
    kvo <= config[REPAIR_TRAVEL_ZERO_THRESHOLD]:  0
    kvo <= config[REPAIR_TRAVEL_CAP]:             kvo
    kvo >  config[REPAIR_TRAVEL_CAP]:             config[REPAIR_TRAVEL_CAP]
```

New config constants:

| Key | Default | Description |
|---|---|---|
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | 5 | kvo ≤ this value → zero travel and PZV overhead |
| `REPAIR_TRAVEL_CAP` | 10 | kvo above this → cap effective_trips at this value |

#### Step 4 — Travel and PZV overhead

```
round_trip_min        = travel.one_way_time_min × 2

repair_travel_6months = effective_trips × round_trip_min
repair_pzv_6months    = effective_trips × config[PZV_MINUTES]
```

Both use `effective_trips` — not raw `kvo`, not `SUM(count)`.

#### Step 5 — Monthly averages

```
repair_no_travel_monthly   = repair_work_6months
                             / config[REPAIR_PRODUCTIVE_MONTHS]

repair_with_travel_monthly = (repair_work_6months
                               + repair_travel_6months
                               + repair_pzv_6months)
                             / config[REPAIR_PRODUCTIVE_MONTHS]
```

> Divisor is `REPAIR_PRODUCTIVE_MONTHS = 5`. See §13 C-12.

**Verified — Object "Архив г.Брест" (kvo = 8, within 5–10 band):**
```
Repair types with count > 0:
  Замена извещателя пожарного дымового      × 1  →  12 min
  Замена шунт/оконечного резистора ОС       × 3  → 105 min
  Замена шунт/оконечного резистора ПС       × 3  → 105 min
  Замена аккумулятора ОС                    × 1  →   5 min
  Акт о выполненных работах ОС              × 1  →   7 min
  Дефектный акт ОС                          × 1  →  60 min
  Акт о выполненных работах ПС              × 1  →   7 min
  Дефектный акт ПС                          × 1  →  60 min

repair_work_6months = 361 min
kvo = 8  (8 distinct types with count > 0)
round_trip_min = 20

5 < kvo=8 ≤ 10  →  effective_trips = 8
repair_travel_6months = 8 × 20 = 160  ✓
repair_pzv_6months    = 8 × 20 = 160  ✓

repair_no_travel_monthly   = 361 / 5 = 72.2  ✓
repair_with_travel_monthly = (361 + 160 + 160) / 5 = 136.2  ✓
```

**Verified — High repair count (kvo = 17, cap applies):**
```
kvo = 17 > 10  →  effective_trips = 10
round_trip_min = 20
repair_travel_6months = 10 × 20 = 200  ✓
repair_pzv_6months    = 10 × 20 = 200  ✓
```

**Verified — Low repair count (kvo = 1, zero threshold applies):**
```
kvo = 1 ≤ 5  →  effective_trips = 0
repair_travel_6months = 0  ✓
repair_pzv_6months    = 0  ✓
```

### 6.7 R1/R2 Per-Visit Reference Totals

```
r1_per_visit_total = R1_per_visit[ОС] + R1_per_visit[ПС] + R1_per_visit[Видео]
r2_per_visit_total = R2_per_visit[ОС] + R2_per_visit[ПС] + R2_per_visit[Видео]
```

Stored in `summaries` for СВОД columns R and S. Not used in headcount formula.

**Verified — Object "Архив г. Брест":**
```
r1_total = 29.14 + 10.52 + 0 = 39.66  ✓ (СВОД col R)
r2_total = 98.4  + 73.0  + 0 = 171.4  ✓ (СВОД col S)
```

### 6.8 СВОД Monthly Totals and Final Headcount

```
pzv = config[PZV_MINUTES]   -- 20

total_no_travel_min = pzv + round_trip_min
                    + os_monthly_avg + ps_monthly_avg + video_monthly_avg
                    + records_monthly + repair_no_travel_monthly

total_with_travel_min = pzv + round_trip_min
                      + os_monthly_avg + ps_monthly_avg + video_monthly_avg
                      + records_monthly + repair_with_travel_monthly

itogo_chislo_no_travel   = total_no_travel_min   / 60 / config[MONTHLY_HOURS_FUND]
                           × config[ABSENCE_COEFFICIENT]
itogo_chislo_with_travel = total_with_travel_min / 60 / config[MONTHLY_HOURS_FUND]
                           × config[ABSENCE_COEFFICIENT]
```

**Verified — Object "Архив г. Брест":**
```
total_no_travel   = 20+20+40.683+30.417+0+0+72.2  = 183.3 min  ✓
total_with_travel = 20+20+40.683+30.417+0+0+136.2 = 247.3 min  ✓
183.3 / 60 / 142.8 × 1.12 = 0.023961  ✓
247.3 / 60 / 142.8 × 1.12 = 0.032327  ✓
```

### 6.9 Division-Level Aggregation

```
division_headcount = SUM(itogo_chislo_with_travel)  for all objects in division
```

### 6.10 Cache Invalidation Rules

Summaries are marked stale automatically on data change, but **recalculation is triggered on-demand by admins only** — not automatically. The background worker runs only when explicitly triggered via `POST /svod/recalculate` (see §10). This simplifies operations and gives admins control over when calculations are refreshed (e.g. after a bulk data entry session).

| Triggering Event | Staleness Action (immediate, same transaction) |
|---|---|
| `object_system_assignments` INSERT / UPDATE / DELETE | Mark this object's `summaries.is_stale = TRUE` |
| `object_devices` INSERT / UPDATE / DELETE | Mark this object's `summaries.is_stale = TRUE` |
| `records_tasks` INSERT / UPDATE | Mark this object's `summaries.is_stale = TRUE` |
| `object_repairs` INSERT / UPDATE / DELETE | Mark this object's `summaries.is_stale = TRUE` (any change to repair counts or the set of performed types changes kvo and repair_work_6months) |
| `travel` UPDATE | Mark this object's `summaries.is_stale = TRUE` |
| `device_system_contexts` UPDATE (r1 or r2) | Mark `is_stale = TRUE` for ALL objects with assignments using this context |
| `repair_types.time_minutes` UPDATE | Mark `is_stale = TRUE` for ALL objects with this repair type |
| `app_config` UPDATE (any calculation key) | Mark ALL `summaries.is_stale = TRUE` |
| `periods.is_active` changed (period switch) | Mark ALL `summaries.is_stale = TRUE` |
| Any `summaries.is_stale` set TRUE | Mark all engineers assigned to that object: `engineer_summaries.is_stale = TRUE` |

**Recalculation trigger:** Admin clicks "Пересчитать" in the UI or calls `POST /svod/recalculate`. The background worker then processes all stale summaries in dependency order: object summaries first, then engineer summaries.

### 6.11 Application Configuration Constants

| Key | Default | Description |
|---|---|---|
| `MONTHLY_HOURS_FUND` | 142.8 | Monthly working hours per employee |
| `ABSENCE_COEFFICIENT` | 1.12 | Absence coefficient (коэффициент невыходов) |
| `PZV_MINUTES` | 20 | Prep/wrap-up time per visit (minutes) |
| `OS_R1_VISITS_PER_YEAR` | 10 | ОС routine visits/year |
| `OS_R2_VISITS_PER_YEAR` | 2 | ОС full maintenance visits/year |
| `PS_R1_VISITS_PER_YEAR` | 8 | ПС routine visits/year |
| `PS_R2_VISITS_PER_YEAR` | 4 | ПС full maintenance visits/year |
| `VIDEO_R1_VISITS_PER_YEAR` | 10 | Видео routine visits/year |
| `VIDEO_R2_VISITS_PER_YEAR` | 2 | Видео full maintenance visits/year |
| `REPAIR_PLANNING_MONTHS` | 6 | Repair planning horizon (months) |
| `REPAIR_PRODUCTIVE_MONTHS` | 5 | Divisor for repair monthly averaging |
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | 5 | kvo ≤ this → zero travel and PZV overhead for repairs |
| `REPAIR_TRAVEL_CAP` | 10 | kvo above this → cap effective_trips at this value |
| `ENGINEER_WARNING_THRESHOLD` | 0.9 | Load ratio at which engineer status becomes "warning" |

All constants are stored in `app_config`, editable by admins at `/admin/config`. Never hardcoded in application logic.

### 6.12 Engineer Workload Calculation

Engineer workload is computed from cached `summaries` rows. It is recalculated whenever:
- An object summary changes for any object the engineer is assigned to.
- The set of engineers at an object changes (split ratio changes for all co-assigned engineers).
- `users.capacity_fte` changes for that engineer.
- `app_config[ENGINEER_WARNING_THRESHOLD]` changes (status may flip).

#### 6.12.1 Object Share per Engineer

For each object an engineer is assigned to:

```
engineer_count[object]   = COUNT(rows in object_engineers WHERE object_id = object)

object_share[engineer, object] = summaries.itogo_chislo_with_travel / engineer_count
```

The split is always equal regardless of when each engineer was assigned.

#### 6.12.2 System-Component Breakdown per Engineer

To support the breakdown by system type, apply the headcount formula to each system's monthly average *before* splitting:

```
-- For system component X (os, ps, video, records, repair):
component_coefficient[object, X] = monthly_avg_X / 60
                                   / config[MONTHLY_HOURS_FUND]
                                   × config[ABSENCE_COEFFICIENT]

engineer_component_share[engineer, object, X]
    = component_coefficient[object, X] / engineer_count[object]
```

Note: `os + ps + video + records + repair` components sum to approximately
`itogo_chislo_with_travel` (minor floating-point rounding acceptable).

#### 6.12.3 Engineer Total and Breakdown

```
engineer_total_load = SUM(object_share[engineer, object])
                      for all objects engineer is assigned to

engineer_os_load      = SUM(engineer_component_share[engineer, object, os])
engineer_ps_load      = SUM(engineer_component_share[engineer, object, ps])
engineer_video_load   = SUM(engineer_component_share[engineer, object, video])
engineer_records_load = SUM(engineer_component_share[engineer, object, records])
engineer_repair_load  = SUM(engineer_component_share[engineer, object, repair])
```

All results stored in `engineer_summaries`.

### 6.13 Capacity and Overload Status

```
load_ratio = engineer_total_load / users.capacity_fte

status:
  load_ratio < config[ENGINEER_WARNING_THRESHOLD]   → "normal"
  load_ratio >= config[ENGINEER_WARNING_THRESHOLD]
    AND load_ratio < 1.0                             → "warning"
  load_ratio >= 1.0                                  → "overloaded"
```

Two new `app_config` keys:

| Key | Default | Description |
|---|---|---|
| `ENGINEER_WARNING_THRESHOLD` | 0.9 | Load ratio at which status becomes "warning" |

The overload boundary is always exactly `1.0` (load = capacity) and is not configurable.

### 6.14 Engineer Cache Invalidation Rules

| Triggering Event | Affected Engineers | Action |
|---|---|---|
| `summaries.itogo_chislo_with_travel` updated for object X | All engineers assigned to object X | Mark their `engineer_summaries.is_stale = TRUE` |
| `object_engineers` INSERT (new assignment at object X) | All engineers now assigned to X (split ratio changed) | Mark all `is_stale = TRUE` |
| `object_engineers` DELETE (assignment removed at object X) | All remaining engineers at X + the removed engineer | Mark all `is_stale = TRUE` |
| `users.capacity_fte` UPDATE for engineer E | Engineer E only | Mark E's `engineer_summaries.is_stale = TRUE` |
| `app_config[ENGINEER_WARNING_THRESHOLD]` UPDATE | All engineers | Mark all `engineer_summaries.is_stale = TRUE` |

Staleness is set in the same transaction as the triggering change. Actual recalculation is on-demand (triggered by admin). Background worker processes engineer summaries only after all dependent object summaries are fresh.


---


---

## 16. Aggregation Rules

All branch, division, and company-wide metrics are **computed on the fly** from the `summaries` table. No aggregation results are stored in the database — queries run against fresh `summaries` rows every time. This is viable because the data volume is bounded (~2,935 objects) and the queries are simple SUM aggregations.

---

### 16.1 Required FTE — Definition

At every level, the metric is **required FTE** — the total maintenance workload expressed as full-time equivalent headcount needed to cover all assigned objects:

```
required_fte = SUM(summaries.itogo_chislo_with_travel)
               for all objects in scope
```

The `itogo_chislo_with_travel` variant is used throughout the aggregation chain (not `no_travel`). This is the operationally correct figure — it includes time engineers spend travelling to objects.

There is **no capacity comparison** at branch or division level. Required FTE is reported as an absolute number. Capacity comparison lives only at the individual engineer level (§6.13).

---

### 16.2 Aggregation Chain

```
object_load   = summaries.itogo_chislo_with_travel          (per object)

branch_load   = SUM(object_load)
                WHERE objects.branch_id = branch.id          (per branch)

division_load = SUM(object_load)
                WHERE branches.division_id = division.id     (per division)
              = SUM(branch_load) for all branches in division

company_load  = SUM(object_load) for all objects             (company-wide)
              = SUM(division_load) for all divisions
```

All three levels are derived from the same `summaries` table. The chain is consistent by construction: `company_load = SUM(division_loads) = SUM(branch_loads) = SUM(object_loads)`.

---

### 16.3 System-Component Breakdown at Each Level

The aggregation chain applies identically to each system component:

```
branch_os_load      = SUM(summaries.os_monthly_avg / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_ps_load      = SUM(summaries.ps_monthly_avg / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_video_load   = SUM(summaries.video_monthly_avg / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_records_load = SUM(summaries.records_monthly / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_repair_load  = SUM(summaries.repair_with_travel_monthly / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)

branch_load = branch_os_load + branch_ps_load + branch_video_load
            + branch_records_load + branch_repair_load
            + SUM(pzv + round_trip) contribution
```

In practice it is simpler and equivalent to aggregate `itogo_chislo_with_travel` directly and decompose using the component ratios from individual summaries for display purposes.

---

### 16.4 Staffing Need per Branch and Division

```
staffing_need_branch   = CEIL(branch_load × 10) / 10
                         -- rounded up to nearest 0.1 FTE for reporting

staffing_need_division = CEIL(division_load × 10) / 10

staffing_need_company  = CEIL(company_load × 10) / 10
```

> **Note:** The rounding rule (`CEIL` to nearest 0.1) is a reporting convention. The underlying `branch_load` and `division_load` values are stored and compared with full precision. Only the displayed staffing need figure is rounded.

---

### 16.5 Coverage Metrics per Branch and Division

```
objects_total_branch          = COUNT(objects) WHERE branch_id = branch.id
objects_with_engineer_branch  = COUNT(DISTINCT object_id FROM object_engineers
                                       WHERE object_id IN objects of branch)
coverage_gap_count_branch     = objects_total_branch - objects_with_engineer_branch

uncovered_load_branch         = SUM(itogo_chislo_with_travel)
                                 for objects with NO rows in object_engineers
                                 and branch_id = branch.id
```

`uncovered_load_branch` is the required FTE that currently has no engineer assigned — this is the figure management uses to justify new hires.

The same formulas apply at division level by summing across all branches in the division.

---

### 16.6 Overload Summary per Branch and Division

```
engineers_overloaded_branch   = COUNT(users)
                                 WHERE role = 'engineer'
                                 AND home_division_id maps to this branch's division
                                 AND engineer_summaries.status = 'overloaded'

engineers_warning_branch      = COUNT(users) ... WHERE status = 'warning'
```

> Note: overload is attributed to the engineer's `home_division_id`, not to where their objects are located. An engineer may service objects in multiple divisions — their overload status is reported under their home division.

---

### 16.7 API Aggregation Endpoints

Aggregation queries are exposed as dedicated read-only endpoints (see §10). They are not cached — they run live against `summaries`:

```
GET /aggregations/company              Company-wide totals
GET /aggregations/divisions            All divisions with load, staffing_need, gaps
GET /aggregations/divisions/:id        Single division detail
GET /aggregations/branches             All branches with load, staffing_need, gaps
GET /aggregations/branches/:id         Single branch detail
```

Response shape for division:
```json
{
  "division_id": "...",
  "division_name": "Брестское областное управление №100",
  "object_count": 312,
  "required_fte": 4.2831,
  "staffing_need": 4.3,
  "uncovered_load": 0.124,
  "coverage_gap_count": 8,
  "engineers_total": 4,
  "engineers_overloaded": 1,
  "engineers_warning": 0,
  "breakdown": {
    "os":      1.121,
    "ps":      0.983,
    "video":   0.441,
    "records": 0.217,
    "repair":  1.521
  }
}
```

---

### 16.8 PoC vs MVP Scope for Aggregation

All aggregation rules defined in this section are **in scope for PoC**. Aggregation queries are on-the-fly SQL — no new tables, no caching mechanism, no additional migrations beyond what the PoC schema already provides. The aggregation endpoints and dashboard widgets are part of the PoC deliverable.


