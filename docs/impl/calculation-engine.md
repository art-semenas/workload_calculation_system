# Calculation Engine

> Extracted from TOR_Workload_WebApp.md §6 + §16. TOR is the source of truth.
> Last sync: TOR v2.26 (2026-03-26)

## Calculation Pipeline Overview

All calculations are performed **server-side only**. The `summaries` table is a precomputed cache.

**PoC (S-02):** When source data changes, the affected summary is recalculated synchronously in the same request thread before the response is returned. No background job, no `is_stale` column.

**MVP (AD-10):** When source data changes, the affected summary is marked `is_stale = 'TRUE'` synchronously in the same transaction. A background worker recalculates stale summaries asynchronously when triggered by admin via `POST /svod/recalculate`.

### §6.1 Pipeline Stages

```
Stage 1 — Per-assignment contribution
  For each (object, device, system_type) assignment:
    r1_contrib = quantity_maintained × context.r1_minutes
    r2_contrib = quantity_maintained × context.r2_minutes

Stage 2 — Per-system per-visit subtotals
  For each system S ∈ {OS, PS, Video}:
    R1_per_visit[S] = SUM(r1_contrib) for all assignments where system_type = S
    R2_per_visit[S] = SUM(r2_contrib) for all assignments where system_type = S

Stage 3 — Annual time (system-specific visit frequencies)
  R1_annual[S] = R1_per_visit[S] × config[S_R1_VISITS_PER_YEAR]
  R2_annual[S] = R2_per_visit[S] × config[S_R2_VISITS_PER_YEAR]

Stage 4 — Monthly average per system
  monthly_avg[S] = (R1_annual[S] + R2_annual[S]) / 12

Stage 5 — Records and repairs (§6.5, §6.6)
  records_monthly = records_6months / config[PRODUCTIVE_MONTHS]  (§6.5)

  For repairs (§6.6):
    repair_work_6months = SUM(count × time_minutes)
    kvo = SUM(count) over work types                  ← acts excluded; see §4.5
    effective_trips = threshold(kvo, ZERO_THRESHOLD, CAP)  ← 0 | kvo | CAP
    repair_travel_6months = effective_trips × round_trip_min
    repair_pzv_6months    = effective_trips × PZV_MINUTES

Stage 6 — СВОД aggregation and final headcount (§6.7, §6.8)
```

## Per-System ТО Formulas

### §6.2 Maintenance Visit Frequencies

Visit frequency is tied to **system type**, not device type. Stored in `app_config`:

| Config Key                 | Value | Meaning                            |
| -------------------------- | ----- | ---------------------------------- |
| `OS_R1_VISITS_PER_YEAR`    | 10    | ОС routine inspections/year        |
| `OS_R2_VISITS_PER_YEAR`    | 2     | ОС full maintenance visits/year    |
| `PS_R1_VISITS_PER_YEAR`    | 8     | ПС routine inspections/year        |
| `PS_R2_VISITS_PER_YEAR`    | 4     | ПС full maintenance visits/year    |
| `VIDEO_R1_VISITS_PER_YEAR` | 10    | Видео routine inspections/year     |
| `VIDEO_R2_VISITS_PER_YEAR` | 2     | Видео full maintenance visits/year |

### §6.3 Per-System Monthly Average

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
  Шлейфы × 12:             R1 = 12×0.2=2.4,   R2 = 12×0.7=8.4
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
monthly_avg  = (84.16 + 292.0) / 12 = 376.16 / 12 = 31.347 min  ✓
```

> **Do not calibrate ПС to the source workbook.** `ПС Расчет!AT` is
> `SUM([Р2 за мес]:[Р2 за 4 раз в году])` — a range covering only the two R2 columns — so the
> spreadsheet computes `73 + 292 = 365` and reports `30.417`, dropping R1 entirely while
> double-counting an R2 cycle. Confirmed on all 2 833 numeric rows. The ОС sheet does this
> correctly (`ОС Расчет!AL = [Р2 за 2 раз в году] + [Р1 за 10 раз в году]`); ПС does not.
> Comparing the engine against `СВОД` will therefore show ПС differing on any object with ПС
> equipment — **in both directions**, since the workbook trades the R1 annual contribution for an
> extra R2 cycle. The engine reads higher on 581 objects and lower on 443; in aggregate the
> workbook overstates ПС by ~18 884 min/year. That is expected, not a regression. Guarded by
> `CalculationServiceTest.psMonthlyAvg_includesR1_notJustR2`. See
> `docs/Excel_to_md/Шаблон_нагрузки_v4_data_extraction_spec.md` §8.4.

### §6.4 Shared-Device Multi-System Example

**Scenario:** One Galaxy 512 (контроллер АСПС и СО) box physically installed at an object, responsible for both ОС and ПС functions.

One physical device is assigned to both ОС and ПС via `object_system_assignments`. Each assignment uses the system-specific `device_system_contexts` row. Both contributions feed into their respective system `monthly_avg` calculations using ОС visit frequency (10R1+2R2) and ПС visit frequency (8R1+4R2) respectively.

## Records Formula (§6.5)

Each `records_tasks` column stores the **quantity** (number of times that task was performed in the 6-month period). Each quantity is multiplied by its corresponding normative from `app_config`:

| `records_tasks` column | ×   | `app_config` key             | Default (min/unit) |
| ---------------------- | --- | ---------------------------- | ------------------ |
| `access_requests`      | ×   | `RECORDS_ACCESS_MINUTES`     | 60                 |
| `monitoring_requests`  | ×   | `RECORDS_MONITORING_MINUTES` | 180                |
| `footage_requests`     | ×   | `RECORDS_FOOTAGE_MINUTES`    | 20                 |
| `backup_control`       | ×   | `RECORDS_BACKUP_MINUTES`     | 3.15               |
| `security_admin`       | ×   | `RECORDS_ADMIN_MINUTES`      | 60                 |

```
records_6months =
    access_requests     × config[RECORDS_ACCESS_MINUTES]
  + monitoring_requests × config[RECORDS_MONITORING_MINUTES]
  + footage_requests    × config[RECORDS_FOOTAGE_MINUTES]
  + backup_control      × config[RECORDS_BACKUP_MINUTES]
  + security_admin      × config[RECORDS_ADMIN_MINUTES]

records_monthly = records_6months / config[PRODUCTIVE_MONTHS]
```

> **Note:** `records_6months` aggregates counts over a 6-month planning period, but the divisor is `config[PRODUCTIVE_MONTHS]` (default **5**), not the period length. One month of the six is absorbed by leave and other non-productive time, so a 6-month total is spread over 5 productive months. This matches `Записи Расчет!L = K / 5` in the source workbook and puts records on the same basis as repairs (§6.6).

## Repair Formulas (§6.6)

### К-во ремонтов (Repair Count)

**CRITICAL:** К-во ремонтов = SUM of repair quantities over **work types only**. This is NOT a count of distinct types, and it excludes the 9 document types (акты).

```
kvo = SUM(object_repairs.count)
      WHERE count > 0
      AND   period_id = current_period
      AND   repair_types.is_document = FALSE
```

`kvo` is the **total number of repair operations performed** in the period. Document types still contribute to `repair_work_6months` below — only the trip estimate excludes them. This is the value tested against thresholds in the travel/PZV formulas.

> **Example:** "Замена аккумулятора × 3" and "Замена извещателя × 5" → `kvo = 8`, not 2.

### Repair Work Time

```
repair_work_6months = SUM(object_repairs.count × repair_types.time_minutes)
                      WHERE object_repairs.count > 0
                      AND   object_repairs.period_id = current_period
```

### 3-Tier Threshold Formula for repair_travel and repair_pzv

```
effective_trips =
    kvo <= config[REPAIR_TRAVEL_ZERO_THRESHOLD]:  0
    kvo <= config[REPAIR_TRAVEL_CAP]:             kvo
    kvo >  config[REPAIR_TRAVEL_CAP]:             config[REPAIR_TRAVEL_CAP]
```

Config constants:

| Key                            | Default | Description                                        |
| ------------------------------ | ------- | -------------------------------------------------- |
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | 5       | kvo ≤ this value → zero travel and PZV overhead    |
| `REPAIR_TRAVEL_CAP`            | 10      | kvo above this → cap effective_trips at this value |

Travel and PZV overhead:

```
round_trip_min        = travel.one_way_time_min × 2

repair_travel_6months = effective_trips × round_trip_min
repair_pzv_6months    = effective_trips × config[PZV_MINUTES]
```

Both use `effective_trips` — not raw `kvo`, not `SUM(count)`.

### Monthly Averages for Repairs

```
repair_no_travel_monthly   = repair_work_6months
                             / config[PRODUCTIVE_MONTHS]

repair_with_travel_monthly = (repair_work_6months
                               + repair_travel_6months
                               + repair_pzv_6months)
                             / config[PRODUCTIVE_MONTHS]
```

> Divisor is `PRODUCTIVE_MONTHS = 5`. See §13 C-12.

**Verified — Object "Архив г.Брест" (kvo = 8, within 5–10 band):**

```
kvo = 1 + 3 + 3 + 1 = 8  (sum of work quantities; the 4 акты are excluded)
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
repair_travel_6months = 10 × 20 = 200  ✓
repair_pzv_6months    = 10 × 20 = 200  ✓
```

**Verified — Low repair count (kvo = 1, zero threshold applies):**

```
kvo = 1 ≤ 5  →  effective_trips = 0
repair_travel_6months = 0  ✓
repair_pzv_6months    = 0  ✓
```

## ПЗВ Formula (§6.9)

`PZV_MINUTES` (default: 20) is a fixed prep/wrap-up time per visit. It is added directly as a fixed constant per object — not per system — in the `total_no_travel_min` and `total_with_travel_min` formulas (see ИТОГО section below). The `pzv` term is always included unless the zero-guard fires (all work components are zero), in which case `itogo_chislo_with_travel = 0` and PZV contributes no phantom FTE.

## ИТОГО Formulas (§6.8)

```
pzv = config[PZV_MINUTES]   -- 20

total_no_travel_min = pzv + round_trip_min
                    + os_monthly_avg + ps_monthly_avg + video_monthly_avg
                    + records_monthly + repair_no_travel_monthly

total_with_travel_min = pzv + round_trip_min
                      + os_monthly_avg + ps_monthly_avg + video_monthly_avg
                      + records_monthly + repair_with_travel_monthly
```

```
itogo_chislo_with_travel =
    IF (os_monthly_avg + ps_monthly_avg + video_monthly_avg
        + records_monthly + repair_with_travel_monthly) = 0
    THEN 0
    ELSE total_with_travel_min / 60 / config[MONTHLY_HOURS_FUND]
         × config[ABSENCE_COEFFICIENT]

itogo_chislo_no_travel =
    IF (os_monthly_avg + ps_monthly_avg + video_monthly_avg
        + records_monthly + repair_no_travel_monthly) = 0
    THEN 0
    ELSE total_no_travel_min / 60 / config[MONTHLY_HOURS_FUND]
         × config[ABSENCE_COEFFICIENT]
```

**Zero-guard rule:** If all work components (ТО + records + repair_time) sum to zero, `itogo_chislo_with_travel = 0` and `itogo_chislo_no_travel = 0`. This prevents phantom PZV/travel FTE on objects with no equipment assigned.

> **Source XLSX formula** ("ИТОГО Числ (с дорогой)" column, verbatim):
>
> ```
> =IF([@[Пожарная сигнализация]]+[@Видео]+[@Охрана]+[@Записи]+[@[Ремонт с дорогой]]=0,
>     0,
>     [@[ТО+записи+ремонт (с дорогой)+ Дорога в месяц, мин]]/60/142.8*1.12)
> ```
>
> — `/60` converts minutes → hours; `/142.8` converts hours → monthly fraction; `×1.12` is the absence coefficient.
> The guard fires when all five system headcount values are zero — i.e. the object has no actual maintenance workload — ensuring PZV and travel overhead alone cannot produce non-zero FTE.

**Verified — Object "Архив г. Брест":**

```
total_no_travel   = 20+20+40.683+31.347+0+0+72.2  = 184.23 min  ✓
total_with_travel = 20+20+40.683+31.347+0+0+136.2 = 248.23 min  ✓
184.23 / 60 / 142.8 × 1.12 = 0.024082  ✓
248.23 / 60 / 142.8 × 1.12 = 0.032448  ✓
```

## Engineer Workload Formulas (§6.12–§6.14)

### §6.12.1 Object Share per Engineer

For each object an engineer is assigned to:

```
engineer_count[object]   = COUNT(rows in object_engineers WHERE object_id = object)

object_share[engineer, object] = summaries.itogo_chislo_with_travel / engineer_count
```

The split is always equal regardless of when each engineer was assigned.

### §6.12.2 System-Component Breakdown per Engineer

```
-- monthly_avg_X values used per component:
--   os    → os_monthly_avg
--   ps    → ps_monthly_avg
--   video → video_monthly_avg
--   records → records_monthly
--   repair  → repair_with_travel_monthly   ← must use with-travel value so that
--             the only unattributed gap is (pzv + round_trip_min), not repair overhead
component_coefficient[object, X] = monthly_avg_X / 60
                                   / config[MONTHLY_HOURS_FUND]
                                   × config[ABSENCE_COEFFICIENT]

engineer_component_share[engineer, object, X]
    = component_coefficient[object, X] / engineer_count[object]
```

**Note:** `os + ps + video + records + repair` components sum to **less than** `itogo_chislo_with_travel` because PZV (20 min) and `round_trip_min` are unattributed overhead. These fixed costs are not split into system components — they are object-level constants. `itogo_chislo_with_travel` is always the authoritative total; the component breakdown is for informational display only.

### §6.12.3 Engineer Total and Breakdown

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

### §6.13 Capacity and Overload Status

```
load_ratio = engineer_total_load / users.capacity_fte

status:
  load_ratio < config[ENGINEER_WARNING_THRESHOLD]   → "normal"
  load_ratio >= config[ENGINEER_WARNING_THRESHOLD]
    AND load_ratio < 1.0                             → "warning"
  load_ratio >= 1.0                                  → "overloaded"
```

The overload boundary is always exactly `1.0` (load = capacity) and is not configurable.

### §6.14 Engineer Cache Invalidation Rules

| Triggering Event                                           | Affected Engineers                                    | Action                                            |
| ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `summaries.itogo_chislo_with_travel` updated for object X  | All engineers assigned to object X                    | Mark their `engineer_summaries.is_stale = 'TRUE'` |
| `object_engineers` INSERT (new assignment at object X)     | All engineers now assigned to X (split ratio changed) | Mark all `is_stale = 'TRUE'`                      |
| `object_engineers` DELETE (assignment removed at object X) | All remaining engineers at X + the removed engineer   | Mark all `is_stale = 'TRUE'`                      |
| `users.capacity_fte` UPDATE for engineer E                 | Engineer E only                                       | Mark E's `engineer_summaries.is_stale = 'TRUE'`   |
| `app_config[ENGINEER_WARNING_THRESHOLD]` UPDATE            | All engineers                                         | Mark all `engineer_summaries.is_stale = 'TRUE'`   |

> **PoC:** No stale marking is performed — engineer summaries recalculate synchronously on every triggering event (S-02). The `is_stale` column is not present in the PoC `engineer_summaries` schema (added in M-06). This table applies to MVP only.

## Cache Invalidation Rules (§6.10)

**MVP (AD-10):** Summaries are marked stale automatically on data change; recalculation is triggered on-demand by admins via `POST /svod/recalculate`. The background worker processes stale summaries only when explicitly triggered.

**PoC (S-02):** No staleness tracking. All summaries are recalculated synchronously on every data-changing request.

| Triggering Event                                     | Staleness Action (immediate, same transaction)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `object_system_assignments` INSERT / UPDATE / DELETE | Mark this object's `summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `object_devices` INSERT / UPDATE / DELETE            | Mark this object's `summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `records_tasks` INSERT / UPDATE                      | Mark this object's `summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `object_repairs` INSERT / UPDATE / DELETE            | Mark this object's `summaries.is_stale = 'TRUE'` (any change to repair counts or the set of performed types changes kvo and repair_work_6months)                                                                                                                                                                                                                                                                                                                                                     |
| `travel` UPDATE                                      | Mark this object's `summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `device_system_contexts` UPDATE (r1 or r2)           | Mark `is_stale = 'TRUE'` for ALL objects with assignments using this context                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `repair_types.time_minutes` UPDATE                   | Mark `is_stale = 'TRUE'` for ALL objects with this repair type                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `app_config` UPDATE (any calculation key) (MVP)      | Mark ALL `summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `periods.is_active` changed (period switch) (MVP)    | Mark ALL `summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `objects` DELETE                                     | **PoC:** Before cascade: read all engineers assigned to the object from `object_engineers`. Cascade-delete all child rows (`object_engineers`, `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`) — all in the same transaction. Immediately recalculate engineer summaries synchronously for all affected engineers (S-02). **MVP:** Same cascade, then mark those engineers' `engineer_summaries.is_stale = 'TRUE'` in the same transaction. |
| Any `summaries.is_stale` set to `'TRUE'` (MVP)       | Mark all engineers assigned to that object: `engineer_summaries.is_stale = 'TRUE'`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `users.home_division_id` UPDATE for engineer E       | No automatic summary invalidation. Display a UI warning banner on the engineer's profile page.                                                                                                                                                                                                                                                                                                                                                                                                       |

**PoC:** No staleness tracking. Summaries are recomputed synchronously on every save.
**MVP:** Same-transaction stale marking; background worker recalculates on demand via `POST /svod/recalculate`.

## app_config Keys Reference (§6.11)

Calculation constants are externalized and never hardcoded in application logic. **PoC (S-03):** constants are injected from Docker environment variables at startup. **MVP (M-10):** constants are stored in `app_config`, editable by admins at `/admin/config`, and read from the database during recalculation (see AD-09).

| Key                            | Default | Description                                                                                                                                                                                                       |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONTHLY_HOURS_FUND`           | 142.8   | Monthly working hours per employee                                                                                                                                                                                |
| `ABSENCE_COEFFICIENT`          | 1.12    | Absence coefficient (коэффициент невыходов)                                                                                                                                                                       |
| `PZV_MINUTES`                  | 20      | Prep/wrap-up time per visit (minutes)                                                                                                                                                                             |
| `OS_R1_VISITS_PER_YEAR`        | 10      | ОС routine visits/year                                                                                                                                                                                            |
| `OS_R2_VISITS_PER_YEAR`        | 2       | ОС full maintenance visits/year                                                                                                                                                                                   |
| `PS_R1_VISITS_PER_YEAR`        | 8       | ПС routine visits/year                                                                                                                                                                                            |
| `PS_R2_VISITS_PER_YEAR`        | 4       | ПС full maintenance visits/year                                                                                                                                                                                   |
| `VIDEO_R1_VISITS_PER_YEAR`     | 10      | Видео routine visits/year                                                                                                                                                                                         |
| `VIDEO_R2_VISITS_PER_YEAR`     | 2       | Видео full maintenance visits/year                                                                                                                                                                                |
| `PLANNING_PERIOD_MONTHS`       | 6       | Planning horizon (months) — the length of the period repair and records quantities are entered for. Not a divisor; it is the upper bound in the cross-key constraint for `PRODUCTIVE_MONTHS` |
| `PRODUCTIVE_MONTHS`     | 5       | Divisor for repair AND records monthly averaging                                                                                                                                                                              |
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | 5       | kvo ≤ this → zero travel and PZV overhead for repairs                                                                                                                                                             |
| `REPAIR_TRAVEL_CAP`            | 10      | kvo above this → cap effective_trips at this value                                                                                                                                                                |
| `ENGINEER_WARNING_THRESHOLD`   | 0.9     | Load ratio at which engineer status becomes "warning"                                                                                                                                                             |
| `RECORDS_ACCESS_MINUTES`       | 60      | Normative minutes per access/disruption request (Записи)                                                                                                                                                          |
| `RECORDS_MONITORING_MINUTES`   | 180     | Normative minutes per monitoring records request (Записи)                                                                                                                                                         |
| `RECORDS_FOOTAGE_MINUTES`      | 20      | Normative minutes per footage request served without a site visit (Записи)                                                                                                                                                              |
| `RECORDS_BACKUP_MINUTES`       | 3.15    | Normative minutes per storage system per 21-working-day month (Записи). Source is `=0.15*21`; fractional, so BigDecimal not Integer                                                                                                                                                            |
| `RECORDS_ADMIN_MINUTES`        | 60      | Normative minutes per security admin instance (Записи)                                                                                                                                                            |

### Config Validation Rules (§6.11.1) — MVP only

> **Scope: MVP.** This section requires the `app_config` database table (introduced in M-10). In PoC, configuration constants are injected as Docker environment variables (bound at startup via Spring's `@ConfigurationProperties(prefix="workload.config")`) — missing or type-invalid values prevent startup but no HTTP 422 save endpoint exists.

All `app_config` values are validated **on application startup** and **on every admin save** (`PUT /admin/config`). A failed validation must prevent the save and return HTTP 422 with the violated rule identifier. A missing required key on startup must prevent the application from starting (fail-fast).

#### Per-key constraints

| Key                            | Constraint      | Violation code                                   | Reason                                                                                                                                                                 |
| ------------------------------ | --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONTHLY_HOURS_FUND`           | `> 0`           | `CONFIG_MONTHLY_HOURS_FUND_NONPOSITIVE`          | Divisor in itogo formula — zero causes divide-by-zero                                                                                                                  |
| `ABSENCE_COEFFICIENT`          | `> 0`           | `CONFIG_ABSENCE_COEFFICIENT_NONPOSITIVE`         | Multiplier in itogo formula — zero produces zero FTE for any workload                                                                                                  |
| `PZV_MINUTES`                  | `>= 0`          | `CONFIG_PZV_MINUTES_NEGATIVE`                    | May legitimately be 0; negative is physically impossible                                                                                                               |
| `OS_R1_VISITS_PER_YEAR`        | `>= 1`          | `CONFIG_OS_R1_VISITS_ZERO`                       | Used as multiplier — zero eliminates all ОС routine maintenance                                                                                                        |
| `OS_R2_VISITS_PER_YEAR`        | `>= 1`          | `CONFIG_OS_R2_VISITS_ZERO`                       | Same                                                                                                                                                                   |
| `PS_R1_VISITS_PER_YEAR`        | `>= 1`          | `CONFIG_PS_R1_VISITS_ZERO`                       | Same                                                                                                                                                                   |
| `PS_R2_VISITS_PER_YEAR`        | `>= 1`          | `CONFIG_PS_R2_VISITS_ZERO`                       | Same                                                                                                                                                                   |
| `VIDEO_R1_VISITS_PER_YEAR`     | `>= 1`          | `CONFIG_VIDEO_R1_VISITS_ZERO`                    | Same                                                                                                                                                                   |
| `VIDEO_R2_VISITS_PER_YEAR`     | `>= 1`          | `CONFIG_VIDEO_R2_VISITS_ZERO`                    | Same                                                                                                                                                                   |
| `PLANNING_PERIOD_MONTHS`       | `>= 1`          | `CONFIG_PLANNING_PERIOD_MONTHS_ZERO`             | Planning period length (months) — period length only, not a divisor; must be positive                                                                                  |
| `PRODUCTIVE_MONTHS`     | `>= 1`          | `CONFIG_PRODUCTIVE_MONTHS_ZERO`           | Divisor in repair and records monthly formulas — zero causes divide-by-zero                                                                                                         |
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | `>= 0`          | `CONFIG_REPAIR_TRAVEL_ZERO_THRESHOLD_NEGATIVE`   | kvo threshold — negative is meaningless                                                                                                                                |
| `REPAIR_TRAVEL_CAP`            | `>= 1`          | `CONFIG_REPAIR_TRAVEL_CAP_ZERO`                  | Cap on effective_trips — zero would eliminate all repair travel overhead                                                                                               |
| `ENGINEER_WARNING_THRESHOLD`   | `> 0 AND < 1.0` | `CONFIG_ENGINEER_WARNING_THRESHOLD_OUT_OF_RANGE` | Load ratio is bounded [0, ∞); threshold at 1.0 or above means the warning band collapses to zero width and the "warning" state becomes unreachable before "overloaded" |
| `RECORDS_ACCESS_MINUTES`       | `>= 0`          | `CONFIG_RECORDS_ACCESS_MINUTES_NEGATIVE`         | Normative time — negative is physically impossible                                                                                                                     |
| `RECORDS_MONITORING_MINUTES`   | `>= 0`          | `CONFIG_RECORDS_MONITORING_MINUTES_NEGATIVE`     | Same                                                                                                                                                                   |
| `RECORDS_FOOTAGE_MINUTES`      | `>= 0`          | `CONFIG_RECORDS_FOOTAGE_MINUTES_NEGATIVE`        | Same                                                                                                                                                                   |
| `RECORDS_BACKUP_MINUTES`       | `>= 0`          | `CONFIG_RECORDS_BACKUP_MINUTES_NEGATIVE`         | Same                                                                                                                                                                   |
| `RECORDS_ADMIN_MINUTES`        | `>= 0`          | `CONFIG_RECORDS_ADMIN_MINUTES_NEGATIVE`          | Same                                                                                                                                                                   |

#### Cross-key constraints

| Rule                      | Constraint                                           | Violation code                              | Reason                                                                                                       |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Repair threshold ordering | `REPAIR_TRAVEL_ZERO_THRESHOLD < REPAIR_TRAVEL_CAP`   | `CONFIG_REPAIR_THRESHOLDS_INVERTED`         | If ZERO_THRESHOLD ≥ CAP the three-band logic inverts: band 2 never fires; effective_trips jump from 0 to cap |
| Productive period consistency | `PRODUCTIVE_MONTHS <= PLANNING_PERIOD_MONTHS` | `CONFIG_PRODUCTIVE_EXCEEDS_PLANNING` | Productive months cannot exceed the planning horizon they derive from                                        |

#### Startup behaviour

On application startup, `AppConfigValidator` must:

1. Verify that **all 19 required keys** are present in `app_config`. Missing keys → log `FATAL: missing config key [KEY]` → abort startup.
2. Evaluate all per-key and cross-key constraints above. Any failure → log `FATAL: config constraint violated [CODE]` → abort startup.
3. On success, log `INFO: app_config validated — all 19 keys present and valid`.

`PUT /admin/config` must run the same validation before writing. All violations in a single save are reported together (not fail-fast per key). On constraint violation return HTTP 422 with a `violations` array.

## Aggregation Rules (§16)

All branch, division, and company-wide metrics are **computed on the fly** from the `summaries` table. No aggregation results are stored in the database — queries run against fresh `summaries` rows every time.

### §16.1 Required FTE — Definition

At every level, the metric is **required FTE** — the total maintenance workload expressed as full-time equivalent headcount needed to cover all assigned objects:

```
required_fte = SUM(summaries.itogo_chislo_with_travel)
               for all objects in scope
```

The `itogo_chislo_with_travel` variant is used throughout the aggregation chain (not `no_travel`). There is **no capacity comparison** at branch or division level. Capacity comparison lives only at the individual engineer level (§6.13).

### §16.2 Aggregation Chain

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

### §16.3 Branch-Level Rollup

```
branch_load   = SUM(summaries.itogo_chislo_with_travel)
                for all objects WHERE objects.branch_id = branch.id
```

`itogo_chislo_with_travel` already includes ОС, ПС, Видео, Записи, Ремонт, PZV, and travel for each individual object. Because travel time is stored per-object (not per-branch), the per-object value is the correct unit of aggregation. There is no separate "branch-level PZV + travel contribution" term — that cost is already embedded in each object's `itogo_chislo_with_travel`.

**Component breakdown — informational only:**

```
branch_os_load      = SUM(summaries.os_monthly_avg / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_ps_load      = SUM(summaries.ps_monthly_avg / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_video_load   = SUM(summaries.video_monthly_avg / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_records_load = SUM(summaries.records_monthly / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
branch_repair_load  = SUM(summaries.repair_with_travel_monthly / 60 / MONTHLY_HOURS_FUND × ABSENCE_COEFFICIENT)
```

These five components do not sum to `branch_load`. The gap equals the aggregated PZV + travel overhead across all objects in the branch. `required_fte` (= `branch_load`) is always the authoritative figure.

### §16.4 Division-Level Rollup

```
division_load = SUM(object_load)
                WHERE branches.division_id = division.id
              = SUM(branch_load) for all branches in division
```

### §16.5 Coverage Gap Definition

```
objects_total_branch          = COUNT(objects) WHERE branch_id = branch.id
objects_with_engineer_branch  = COUNT(DISTINCT object_id FROM object_engineers
                                       WHERE object_id IN objects of branch)
coverage_gap_count_branch     = objects_total_branch - objects_with_engineer_branch

uncovered_load_branch         = SUM(itogo_chislo_with_travel)
                                 for objects with NO rows in object_engineers
                                 and branch_id = branch.id
```

A **coverage gap** is an object with zero assigned engineers. `uncovered_load_branch` is the required FTE that currently has no engineer assigned — this is the figure management uses to justify new hires.

### §16.6 Engineer Overload Attribution

```
engineers_overloaded_branch   = COUNT(users)
                                 WHERE role = 'engineer'
                                 AND home_division_id maps to this branch's division
                                 AND engineer_summaries.status = 'overloaded'
```

> **Note:** Engineer overload is attributed to the engineer's `home_division_id`, not to any specific branch. The `engineers_overloaded_branch` formula returns a division-level count (identical for all branches within the same division). This metric is included for API response parity but is not meaningful at the branch level — use the division-level aggregation endpoint for accurate overload reporting.

### §16.8 PoC vs MVP Scope

All aggregation rules defined in §16 are **in scope for PoC**. Aggregation queries are on-the-fly SQL — no new tables, no caching mechanism, no additional migrations beyond what the PoC schema already provides.
