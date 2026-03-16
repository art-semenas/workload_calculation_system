# Business Logic & Application Description

> **Extracted from:** TOR_Workload_WebApp.md v2.11
> **Date:** 2026-03-13
> **Purpose:** This document contains the pure business logic, domain rules, and functional requirements — free of technology choices, database schemas, API structures, and infrastructure decisions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Context & Goals](#2-business-context--goals)
3. [Glossary](#3-glossary)
4. [Functional Requirements](#4-functional-requirements)
5. [Calculation Engine](#5-calculation-engine)
6. [User Interface Requirements](#6-user-interface-requirements)
7. [Roles & Permissions](#7-roles--permissions)
8. [Aggregation Rules](#8-aggregation-rules)
9. [Structural Clarifications & Business Rules](#9-structural-clarifications--business-rules)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Project Overview

The system is a web-based replacement for the Excel workbook `Шаблон_нагрузки_з_v_4_00.xlsx`. It automates the calculation of **required maintenance staffing headcount** (нагрузка / численность) for technical maintenance (ТО) engineers responsible for servicing security and fire protection systems at bank branch facilities (objects).

The source workbook currently covers **~2,935 objects** belonging to regional divisions (подразделения) of Belarusbank.

---

## 2. Business Context & Goals

### 2.1 Problem Statement

The Excel template is large (2,935 rows × up to 47 columns per sheet), manual to update, error-prone in formula propagation, and difficult to share or version. The device catalog is hardcoded as fixed columns — adding a new device type requires schema changes and formula updates across multiple sheets.

### 2.2 Goals

- Replace the multi-sheet Excel model with a centralized, browser-accessible application.
- Allow engineers and managers to input/update equipment quantities per facility.
- Automatically recalculate workload metrics on save.
- Support a **dynamic device catalog** — admins can add new device types and their normatives without code changes.
- Support import of existing data and export of results to XLSX/PDF.
- Provide a СВОД (summary) dashboard per division and per responsible engineer.
- Track individual engineer workload, capacity utilisation, and overload status.
- Surface coverage gaps — objects with no engineer assigned.
- Make normative time standards editable by administrators without formula changes or redeployment.

---

## 3. Glossary

| Term                         | Definition                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Объект (Object/Facility)     | A physical location (bank branch, archive, garage, infokiosk, etc.)                      |
| Подразделение                | Regional division (e.g., Брестское областное управление №100)                            |
| Филиал                       | Branch (sub-unit of a division; may equal the division)                                  |
| Ответственные ТО             | Responsible maintenance engineer(s) assigned to an object                                |
| ОС                           | Охранная сигнализация — security alarm system                                            |
| ПС                           | Пожарная сигнализация — fire alarm system                                                |
| Видео                        | Video surveillance system                                                                |
| Записи                       | Video archive records and administration tasks                                           |
| Ремонт                       | Repairs — replacement of equipment components                                            |
| Дорога                       | Travel — distance and time to reach a facility                                           |
| Тип системы (System Type)    | One of: ОС, ПС, Видео — the maintenance schedule context                                 |
| Тип устройства (Device Type) | A named device in the admin-managed catalog                                              |
| Контекст устройства          | A (device type + system type) pair that carries R1/R2 normatives                         |
| Р1                           | Minutes per unit for routine inspection — system-context-specific                        |
| Р2                           | Minutes per unit for full maintenance — system-context-specific                          |
| Физическое количество        | Physical quantity: how many units exist on site                                          |
| Обслуживаемое количество     | Maintained quantity: how many units are counted in a given system's calculation          |
| СВОД                         | Consolidated summary — aggregated totals per object or division                          |
| ИТОГО Числ                   | Final headcount coefficient: total monthly minutes converted to FTE                      |
| ПЗВ                          | Подготовительно-заключительное время — fixed prep/wrap-up time (20 min per visit)        |
| ТМЦ                          | Товарно-материальные ценности — inventory/material assets                                |
| Инженер (Engineer)           | A maintenance technician who is also a system user (login account)                       |
| Нагрузка на инженера         | Workload per engineer — sum of workload shares from all assigned objects                 |
| Доля объекта                 | An object's itogo_chislo_with_travel divided equally among its assigned engineers        |
| Мощность (Capacity)          | Maximum FTE capacity of an engineer (e.g. 1.0 full-time, 0.5 half-time)                  |
| Коэффициент загрузки         | Load ratio = engineer_total_load / capacity — measure of utilisation                     |
| Перегрузка (Overload)        | Load ratio ≥ 1.0 — engineer is assigned more work than their capacity                    |
| Покрытие (Coverage gap)      | An object that has no engineers assigned                                                 |
| Период (Planning period)     | A 6-month window to which repair counts and records tasks belong (e.g. H1 2025, H2 2025) |

---

## 4. Functional Requirements

### 4.1 Object Management (FR-01)

- CRUD operations for objects (facilities).
- Each object must have: `division`, `branch`, `name/address`.
- Responsible engineers are managed via a join relationship, not as a free-text field.
- Objects are organized in a two-level hierarchy: **Division → Branch → Objects**.
- Support bulk import from structured JSON / text lists.
- Deleted objects are **permanently removed** (hard delete) for PoC. Soft-archive / decommission status is a post-MVP consideration.

### 4.2 Device Catalog Management (FR-02)

The device catalog is the central, admin-managed registry of all equipment types. It is fully dynamic — adding a new device type requires no code changes.

#### 4.2.1 Device Types

A device type is a named piece of hardware. It carries **no normatives directly** — normatives are defined per (device type × system type) context.

Each device type record contains:

- `name` — display name (e.g., "Galaxy 512 (Galaxy Dimension GD-520)")
- `description` — optional free-text

Admins create device types and then define one or more **device-system contexts** for each.

#### 4.2.2 Device-System Contexts (Normatives)

A context defines that a device is valid within a specific system type and specifies the R1/R2 normative values:

| Field         | Description                                  |
| ------------- | -------------------------------------------- |
| `device_type` | Reference to the device type                 |
| `system_type` | ОС, ПС, or Видео                             |
| `r1_minutes`  | Minutes per unit for routine inspection (Р1) |
| `r2_minutes`  | Minutes per unit for full maintenance (Р2)   |

**Rules:**

- The (device_type, system_type) pair must be unique — one normative per device per system.
- A device can have contexts for one, two, or all three system types.
- A device with no context for a given system type **cannot be assigned** to that system at any object. This restriction must be enforced at all layers.
- R1 and R2 are set per context independently — the same device may have different normatives under different systems.
- Admin explicitly controls which systems a device is valid for. No implicit "allow all systems" default — a newly created device type has no valid systems until the admin adds at least one context.

**Seed data from source XLSX — ПС contexts:**

| Device                            | R1 (min) | R2 (min) |
| --------------------------------- | -------- | -------- |
| серий А6, Аларм                   | 5        | 12       |
| А16-512                           | 6        | 13       |
| СПИ УОО Молния                    | 2        | 3        |
| АМ200-Notifier                    | 5        | 10       |
| Шлейфы сигнализации               | 0.06     | 0.7      |
| Каналы считывания                 | 0.02     | 1.5      |
| Извещатели, оповещатели           | 0.3      | 4        |
| Таблички                          | 0.3      | 2        |
| Galaxy 512 (контроллер АСПС и СО) | 15       | 20       |
| Оракул                            | 3        | 15       |
| Танго ПУ/БП                       | 1        | 17       |
| Танго ПУ/ЗК                       | 1        | 19       |
| Расширитель                       | 0.03     | 3        |
| Адресный модуль                   | 0.03     | 1.8      |
| Адресный шлейфно-релейный модуль  | 0.03     | 3        |
| Усилитель линии УЛТ               | 0.03     | 1        |
| Адресные извещатели               | 0.2      | 2.3      |
| Колонки                           | 0.4      | 3        |

**Seed data — ОС contexts:**

| Device                               | R1 (min) | R2 (min) |
| ------------------------------------ | -------- | -------- |
| Galaxy 512 (Galaxy Dimension GD-520) | 7        | 20       |
| Maestro (ППК ОП Maestro-1600)        | 5        | 10       |
| серий А6, Аларм                      | 5        | 8        |
| А16-512                              | 5        | 10       |
| Выносная панель управления ВПУ–А-16  | 4.5      | 4.5      |
| Устройство доступа                   | 1        | 4        |
| Шлейфы сигнализации                  | 0.06     | 0.7      |
| Каналы считывания                    | 0.02     | 1.5      |
| Извещатели, оповещатели              | 0.7      | 3        |
| Galaxy 512 (контроллер АСПС и СО)    | 15       | 20       |
| Расширитель                          | 0.03     | 3        |
| Контроллер системы                   | 3        | 9.5      |
| Системный блок ПЦН                   | 10       | 40       |
| ББП-20, ББП-3/12 (БРП 2401)          | 0.03     | 3        |

**Seed data — Видео contexts:**

| Device                        | R1 (min) | R2 (min) |
| ----------------------------- | -------- | -------- |
| Видеокамеры                   | 1.5      | 1.5      |
| Микрофоны                     | 0.5      | 0.5      |
| Системный блок (видео сервер) | 10       | 40       |

> Note: "серий А6, Аларм", "А16-512", "Расширитель", "Galaxy 512 (контроллер АСПС и СО)" appear in both ОС and ПС. They are **one device type each** with **two context rows** (different R1/R2 per system where applicable).

### 4.3 Object Equipment Inventory (FR-03)

Each object's equipment is recorded in two layers:

#### Layer 1 — Physical Inventory

What hardware physically exists on site, independent of which system it serves:

- Device type (from catalog)
- `quantity_physical` — how many units are installed

#### Layer 2 — System Assignments

Which maintenance systems a device is counted under, and with what quantity:

- Device type
- System type (must match one of the device's allowed system types)
- `quantity_maintained` — units counted in this system's workload calculation

**Key rules:**

- `quantity_physical` is stored once per (object, device_type) pair — the hardware asset count.
- `quantity_maintained` is stored once per (object, device_type, system_type) triple — drives all workload calculations.
- A device can be assigned to multiple system types at the same object with independent `quantity_maintained`.
- `quantity_maintained` may legitimately equal `quantity_physical` even when assigned to multiple systems (e.g., 1 physical Galaxy 512 box maintained under both ОС and ПС — `quantity_maintained = 1` in each). This is intentional.
- `quantity_maintained` should not exceed `quantity_physical` per individual assignment, but the sum across assignments can. The UI shows a non-blocking warning when a single `quantity_maintained` > `quantity_physical`.
- Only device types with a valid context for the chosen system type may be assigned.
- A device must first appear in the Physical Inventory before it can be assigned to a system. Workflow: add to inventory → assign to systems.

### 4.4 Records & Administration Tasks (FR-04) — "Записи"

Quantities of service requests/tasks per object per 6-month planning period:

| Task                                                      | Unit      | Normative (min/unit) |
| --------------------------------------------------------- | --------- | -------------------- |
| Запросы в связи с отсутствием (нарушением) доступа        | requests  | 60                   |
| Запросы в связи с проведением мониторинга записей         | requests  | 180                  |
| Запросы по предоставлению записей системы видеонаблюдения | requests  | 180                  |
| Контроль процесса резервного копирования одной системы    | instances | 120                  |
| Администрирование систем безопасности филиала             | instances | 60                   |

Records normatives are fixed constants, not device-system contexts. They have no R2 and no system type.

Records tasks are **irregular events** — quantities are entered for a specific 6-month planning period. The monthly average `records_monthly = records_6months / planning_months` represents a smoothed load estimate.

### 4.5 Repair Type Catalog & Object Repairs (FR-05) — "Ремонт"

Repair types are admin-managed catalog entries. Each repair type has a fixed time in minutes per operation. Admins can add new repair types without schema changes.

Count of repair operations per object per 6-month planning period is recorded per repair type.

**К-во ремонтов** (total repair count) = Count of distinct repair types with at least one occurrence in the period — always computed, never user input. It counts **distinct repair types performed**, not the sum of quantities.

> **Example:** An object with "Замена аккумулятора ОС × 3" and "Замена извещателя × 5" has К-во ремонтов = **2**, not 8.

**Seed repair types from source XLSX:**

| Repair Type                                               | Time (min) |
| --------------------------------------------------------- | ---------- |
| Замена ПКП серии А6 ОС                                    | 150        |
| Замена ПКП серии А6 ПС                                    | 150        |
| Замена извещателя охранного оптико-электронного           | 15         |
| Замена извещателя пожарного дымового                      | 12         |
| Замена шунтирующих/оконечного резисторов шлейфа ОС        | 35         |
| Замена шунтирующих/оконечного резисторов шлейфа ПС        | 35         |
| Замена блока бесперебойного питания ОС                    | 30         |
| Замена блока бесперебойного питания ПС                    | 30         |
| Замена аккумулятора ОС                                    | 5          |
| Замена аккумулятора ПС                                    | 5          |
| Замена блока питания видеосервера                         | 20         |
| Замена винчестера видеосервера                            | 10         |
| Замена основных составных частей видеосервера в комплексе | 30         |
| Переустановка ПО на видеосервере                          | 90         |
| Восстановление сигнала IP камеры                          | 35         |
| Восстановление сигнала аналоговой камеры                  | 20         |
| Акт о выполненных работах ОС                              | 7          |
| Дефектный акт ОС                                          | 60         |
| Акт на списание ТМЦ из подотчета ОС                       | 20         |
| Акт о выполненных работах ПС                              | 7          |
| Дефектный акт ПС                                          | 60         |
| Акт на списание ТМЦ из подотчета ПС                       | 20         |
| Акт о выполненных работах Видео                           | 7          |
| Дефектный акт Видео                                       | 60         |
| Акт на списание ТМЦ из подотчета Видео                    | 20         |

### 4.6 Travel Data (FR-06) — "Дорога"

Per object:

- Transport type (dropdown: пешком / на машине / общественный транспорт)
- Distance, km (numeric, ≥ 0)
- One-way travel time, minutes (numeric, ≥ 0)
- Round-trip time — **auto-calculated** as `one_way_time × 2`, never user-editable

### 4.7 Consolidated Summary — СВОД (FR-07)

Per object, the СВОД shows:

- ПЗВ: fixed 20 min
- Travel: round-trip minutes
- Monthly average ТО time per system (ОС, ПС, Видео)
- Monthly average time for Записи
- Repair time without/with travel overhead (monthly)
- **ИТОГО Числ (без дороги)** and **ИТОГО Числ (с дорогой)** — headcount coefficients
- Р1 and Р2 per-visit totals across all systems

### 4.8 Export (FR-08)

- Export СВОД to XLSX (matching original template column structure).
- Export СВОД to PDF.
- Export individual object inventory data to XLSX.

### 4.9 Dashboard (FR-09)

- Total headcount (ИТОГО Числ) per division.
- Number of objects per engineer with their load ratio.
- Objects with no system assignments (data gaps).
- Objects with no engineer assigned (coverage gaps).
- Top 10 objects by workload.

### 4.10 Engineer Management (FR-10)

Engineers are system users with additional fields:

- `capacity_fte` — FTE capacity, decimal (e.g. `1.0` full-time, `0.5` half-time). Default: `1.0`.
- `home_division_id` — the division this engineer is primarily associated with, for display and filtering. Does **not** restrict which objects they can be assigned to.
- `employee_id` — optional internal HR identifier.

Admin operations:

- Create / edit / deactivate engineer accounts.
- Set or update `capacity_fte` at any time — triggers recalculation of that engineer's summary.
- View all engineers with their current load ratio and status.

### 4.11 Object-Engineer Assignments (FR-11)

An object can have zero, one, or many engineers assigned (joint responsibility without system-level split).

**Assignment rules:**

- Admins and editors (within their division) manage assignments.
- There is no system-type constraint on assignments — an engineer assigned to an object is responsible for all maintenance at that object.
- An engineer can be assigned to objects in any division (cross-division allowed).
- Removing an assignment immediately triggers recalculation of that engineer's workload summary.

**Workload split:** When multiple engineers share an object, the object's `itogo_chislo_with_travel` is divided **equally** among all assigned engineers. The split ratio is `1 / COUNT(assigned engineers at object)` and is recomputed dynamically.

**Coverage gap:** An object with zero assigned engineers is flagged as a coverage gap in division reports and the dashboard.

### 4.12 Planning Periods (FR-12)

Repair counts and records tasks are tied to a specific **6-month planning period**. A period covers either H1 (January–June) or H2 (July–December).

**Period fields:**

- `name` — display name, e.g. "H1 2025", "H2 2025"
- `start_date` / `end_date`
- `is_active` — exactly one period is active at any time

**Rules:**

- Only one period can be active at a time. Setting a new period active deactivates the previous one.
- All data entry for repairs and records defaults to the currently active period.
- Past periods are read-only.
- СВОД calculations use the **active period's** data by default. Users can select any past period for historical comparison.
- When no period is active, data entry for repairs and records is blocked with a warning.

---

## 5. Calculation Engine

All calculations are performed **server-side only**. When source data changes, the affected summary is marked stale and recalculated.

### 5.1 Pipeline Overview

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

Stage 5 — Records and repairs
  records_monthly = records_6months / config[PLANNING_PERIOD_MONTHS]
  For repairs: kvo, effective_trips → threshold formula

Stage 6 — СВОД aggregation and final headcount
```

### 5.2 Maintenance Visit Frequencies

| Config Key                 | Value | Meaning                            |
| -------------------------- | ----- | ---------------------------------- |
| `OS_R1_VISITS_PER_YEAR`    | 10    | ОС routine inspections/year        |
| `OS_R2_VISITS_PER_YEAR`    | 2     | ОС full maintenance visits/year    |
| `PS_R1_VISITS_PER_YEAR`    | 8     | ПС routine inspections/year        |
| `PS_R2_VISITS_PER_YEAR`    | 4     | ПС full maintenance visits/year    |
| `VIDEO_R1_VISITS_PER_YEAR` | 10    | Видео routine inspections/year     |
| `VIDEO_R2_VISITS_PER_YEAR` | 2     | Видео full maintenance visits/year |

### 5.3 Per-System Monthly Average

```
R1_per_visit[S] = SUM(quantity_maintained × r1_minutes) for all assignments for system S
R2_per_visit[S] = SUM(quantity_maintained × r2_minutes) for all assignments for system S

R1_annual[S]   = R1_per_visit[S] × config[S + '_R1_VISITS_PER_YEAR']
R2_annual[S]   = R2_per_visit[S] × config[S + '_R2_VISITS_PER_YEAR']
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

### 5.4 Records Monthly Average

```
records_6months = SUM(task_quantity[j] × records_normative[j])  for all j
records_monthly = records_6months / config[PLANNING_PERIOD_MONTHS]
```

### 5.5 Repair Monthly Averages

#### Step 1 — Work time

```
repair_work_6months = SUM(count × time_minutes) WHERE count > 0
```

#### Step 2 — К-во ремонтов (kvo)

```
kvo = COUNT(repair rows WHERE count > 0)
```

`kvo` counts **distinct repair types performed at least once** — not sum of quantities.

#### Step 3 — Threshold for effective trip count

```
effective_trips =
    kvo ≤ config[REPAIR_TRAVEL_ZERO_THRESHOLD]:  0
    kvo ≤ config[REPAIR_TRAVEL_CAP]:             kvo
    kvo >  config[REPAIR_TRAVEL_CAP]:             config[REPAIR_TRAVEL_CAP]
```

| Key                            | Default | Description                               |
| ------------------------------ | ------- | ----------------------------------------- |
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | 5       | kvo ≤ this → zero travel and PZV overhead |
| `REPAIR_TRAVEL_CAP`            | 10      | kvo above this → cap at this value        |

#### Step 4 — Travel and PZV overhead

```
round_trip_min        = one_way_time × 2
repair_travel_6months = effective_trips × round_trip_min
repair_pzv_6months    = effective_trips × config[PZV_MINUTES]
```

#### Step 5 — Monthly averages

```
repair_no_travel_monthly   = repair_work_6months / config[REPAIR_PRODUCTIVE_MONTHS]
repair_with_travel_monthly = (repair_work_6months + repair_travel_6months + repair_pzv_6months)
                             / config[REPAIR_PRODUCTIVE_MONTHS]
```

Divisor is `REPAIR_PRODUCTIVE_MONTHS = 5` (not 6).

### 5.6 СВОД Monthly Totals and Final Headcount

```
pzv = config[PZV_MINUTES]   -- 20

total_no_travel_min = pzv + round_trip_min
                    + os_monthly_avg + ps_monthly_avg + video_monthly_avg
                    + records_monthly + repair_no_travel_monthly

total_with_travel_min = pzv + round_trip_min
                      + os_monthly_avg + ps_monthly_avg + video_monthly_avg
                      + records_monthly + repair_with_travel_monthly

-- Zero guard: prevents phantom FTE on objects with no real work
itogo_chislo_with_travel =
    IF (os_monthly_avg + ps_monthly_avg + video_monthly_avg
        + records_monthly + repair_with_travel_monthly) = 0
    THEN 0
    ELSE total_with_travel_min / 60 / config[MONTHLY_HOURS_FUND]
         × config[ABSENCE_COEFFICIENT]

itogo_chislo_no_travel = (same zero-guard pattern with no_travel variant)
```

**Key constants:**
- `MONTHLY_HOURS_FUND` = 142.8
- `ABSENCE_COEFFICIENT` = 1.12
- `PZV_MINUTES` = 20

### 5.7 Application Configuration Constants

| Key                            | Default | Description                           |
| ------------------------------ | ------- | ------------------------------------- |
| `MONTHLY_HOURS_FUND`           | 142.8   | Monthly working hours per employee    |
| `ABSENCE_COEFFICIENT`          | 1.12    | Absence coefficient                   |
| `PZV_MINUTES`                  | 20      | Prep/wrap-up time per visit (minutes) |
| `OS_R1_VISITS_PER_YEAR`        | 10      | ОС routine visits/year                |
| `OS_R2_VISITS_PER_YEAR`        | 2       | ОС full maintenance visits/year       |
| `PS_R1_VISITS_PER_YEAR`        | 8       | ПС routine visits/year                |
| `PS_R2_VISITS_PER_YEAR`        | 4       | ПС full maintenance visits/year       |
| `VIDEO_R1_VISITS_PER_YEAR`     | 10      | Видео routine visits/year             |
| `VIDEO_R2_VISITS_PER_YEAR`     | 2       | Видео full maintenance visits/year    |
| `PLANNING_PERIOD_MONTHS`       | 6       | Planning horizon (months)             |
| `REPAIR_PRODUCTIVE_MONTHS`     | 5       | Divisor for repair monthly averaging  |
| `REPAIR_TRAVEL_ZERO_THRESHOLD` | 5       | kvo ≤ this → zero travel overhead     |
| `REPAIR_TRAVEL_CAP`            | 10      | kvo above this → cap effective_trips  |
| `ENGINEER_WARNING_THRESHOLD`   | 0.9     | Load ratio for "warning" status       |
| `RECORDS_ACCESS_MINUTES`       | 60      | Normative per access request          |
| `RECORDS_MONITORING_MINUTES`   | 180     | Normative per monitoring request      |
| `RECORDS_FOOTAGE_MINUTES`      | 180     | Normative per footage request         |
| `RECORDS_BACKUP_MINUTES`       | 120     | Normative per backup control          |
| `RECORDS_ADMIN_MINUTES`        | 60      | Normative per security admin instance |

#### Configuration Validation Rules

**Per-key constraints** (e.g., `MONTHLY_HOURS_FUND > 0`, `PZV_MINUTES >= 0`, visit frequencies `>= 1`, `ENGINEER_WARNING_THRESHOLD > 0 AND < 1.0`).

**Cross-key constraints:**
- `REPAIR_TRAVEL_ZERO_THRESHOLD < REPAIR_TRAVEL_CAP` — prevents inverted threshold logic
- `REPAIR_PRODUCTIVE_MONTHS <= PLANNING_PERIOD_MONTHS` — productive months cannot exceed planning horizon

All violations must be reported together (not fail-fast per key).

### 5.8 Engineer Workload Calculation

#### Object Share per Engineer

```
engineer_count[object]   = COUNT(engineers assigned to object)
object_share[engineer, object] = itogo_chislo_with_travel / engineer_count
```

Split is always equal.

#### System-Component Breakdown per Engineer

```
component_coefficient[object, X] = monthly_avg_X / 60
                                   / config[MONTHLY_HOURS_FUND]
                                   × config[ABSENCE_COEFFICIENT]

engineer_component_share[engineer, object, X]
    = component_coefficient[object, X] / engineer_count[object]
```

> Components sum to **less than** `itogo_chislo_with_travel` because PZV and travel are unattributed overhead. `itogo_chislo_with_travel` is always the authoritative total.

#### Engineer Total

```
engineer_total_load = SUM(object_share[engineer, object]) for all assigned objects
```

### 5.9 Capacity and Overload Status

```
load_ratio = engineer_total_load / capacity_fte

status:
  load_ratio < config[ENGINEER_WARNING_THRESHOLD]    → "normal"
  load_ratio >= config[ENGINEER_WARNING_THRESHOLD]
    AND load_ratio < 1.0                              → "warning"
  load_ratio >= 1.0                                   → "overloaded"
```

### 5.10 Cache Invalidation Rules

| Triggering Event               | Staleness Action                             |
| ------------------------------ | -------------------------------------------- |
| Equipment assignment changes   | Mark this object's summary stale             |
| Records/repairs changes        | Mark this object's summary stale             |
| Travel update                  | Mark this object's summary stale             |
| Normative (R1/R2) changes      | Mark ALL objects using this context stale    |
| Repair type time changes       | Mark ALL objects with this repair type stale |
| Configuration constant changes | Mark ALL summaries stale                     |
| Period switch                  | Mark ALL summaries stale                     |
| Object summary becomes stale   | Mark all assigned engineers' summaries stale |
| Engineer capacity change       | Mark that engineer's summary stale           |
| Warning threshold change       | Mark all engineer summaries stale            |

Recalculation is **on-demand** (triggered by admin), not automatic.

---

## 6. User Interface Requirements

### 6.1 Pages / Views

| Route              | View            | Description                                                               |
| ------------------ | --------------- | ------------------------------------------------------------------------- |
| `/`                | Dashboard       | Headcount cards by division; top objects by workload                      |
| `/divisions/:id`   | Division Detail | Objects with СВОД subtotals                                               |
| `/objects`         | Object List     | Searchable, filterable table                                              |
| `/objects/:id`     | Object Detail   | Tabbed detail view (Оборудование, Записи, Ремонт, Дорога, Инженеры, СВОД) |
| `/svod`            | СВОД            | Full summary table with period selector, filters, and export              |
| `/catalog/devices` | Device Catalog  | List / create / edit device types and contexts                            |
| `/catalog/repairs` | Repair Types    | List / create / edit repair type catalog                                  |
| `/admin/config`    | App Config      | View/edit all calculation constants (admin only)                          |
| `/engineers`       | Engineer List   | All engineers with load ratio and status                                  |
| `/engineers/:id`   | Engineer Detail | Workload dashboard for one engineer                                       |

### 6.2 Equipment Tab — Two-Layer UI

**Section A — Physical Inventory:** Table of devices with physical quantities. "Add device" opens a searchable dropdown.

**Section B — System Assignments:** Grouped view showing which systems each device is assigned to, with `quantity_maintained` editable inline. R1/R2 read-only (from catalog). System dropdown shows only valid system types.

**Warning rule:** When `quantity_maintained > quantity_physical`, display a non-blocking warning.

**Cascade on removal:** Removing a device from physical inventory cascades to remove all its system assignments (with confirmation dialog).

### 6.3 Engineers Tab (Object Detail)

Shows assigned engineers with their share of the object's workload and their overall load ratio. Supports assign/remove operations. Travel review prompt shown when engineer assignment changes.

### 6.4 Engineer List Page

Table with columns: Инженер, Подразделение, Объектов, Нагрузка, Мощность, Статус.

Status icons: ✅ normal · ⚠ warning · 🔴 overloaded.

Filters: by home division, by status, search by name.

### 6.5 Engineer Detail Page

Five sections: Summary cards, System breakdown (bar chart), Assigned objects table, Assign/remove controls, Stale indicator.

### 6.6 СВОД Table Columns

19 columns matching the original Excel structure, including division, branch, object name, responsible engineers, PZV, travel, per-system averages, repair metrics, and final headcount coefficients.

### 6.7 UI/UX Constraints

- All user-facing labels in **Russian**.
- СВОД table sortable by any column, filterable by division / branch / engineer.
- Repair tab is a dynamic list from repair types — never hardcoded.
- Zero values may display as blank (matching Excel behavior).
- СВОД editing not permitted inline.
- Engineer load ratio bars use colour coding: green / amber / red.
- **Engineers can enter Записи and Ремонт data for their assigned objects** in active period only. They cannot edit equipment, normatives, or travel.
- **Period lock:** Once deactivated, all repair/records data becomes read-only.

---

## 7. Roles & Permissions

| Permission                             | Admin | Editor      | Viewer | Engineer         |
| -------------------------------------- | ----- | ----------- | ------ | ---------------- |
| View all objects / СВОД                | ✅     | ✅           | ✅      | Own objects only |
| Edit object metadata                   | ✅     | ✅ (own div) | ❌      | ❌                |
| Edit equipment / assignments           | ✅     | ✅ (own div) | ❌      | ❌                |
| Edit records / repairs (active period) | ✅     | ✅ (own div) | ❌      | ✅ (own objects)  |
| Edit travel data                       | ✅     | ✅ (own div) | ❌      | ❌                |
| Create / delete objects                | ✅     | ❌           | ❌      | ❌                |
| Manage device/repair catalogs          | ✅     | ❌           | ❌      | ❌                |
| Edit app configuration                 | ✅     | ❌           | ❌      | ❌                |
| Import data                            | ✅     | ❌           | ❌      | ❌                |
| Export XLSX / PDF                      | ✅     | ✅           | ✅      | ✅ (own)          |
| Trigger recalculation                  | ✅     | ❌           | ❌      | ❌                |
| View audit log                         | ✅     | ❌           | ❌      | ❌                |
| Manage users / engineers               | ✅     | ❌           | ❌      | ❌                |
| Assign / remove engineers              | ✅     | ✅ (own div) | ❌      | ❌                |

**Editor scope:** `division_id` restricts all writes to objects in their assigned division.

**Engineer scope:** Can only view their own workload and assigned objects. Cannot view other engineers' data.

---

## 8. Aggregation Rules

### 8.1 Required FTE — Definition

```
required_fte = SUM(itogo_chislo_with_travel) for all objects in scope
```

The `itogo_chislo_with_travel` variant is used throughout. No capacity comparison at branch/division level — only at individual engineer level.

### 8.2 Aggregation Chain

```
object_load   = itogo_chislo_with_travel               (per object)
branch_load   = SUM(object_load) for all objects in branch
division_load = SUM(branch_load) for all branches in division
company_load  = SUM(division_load) for all divisions
```

### 8.3 Staffing Need

```
staffing_need = CEIL(load × 10) / 10    -- rounded up to nearest 0.1 FTE
```

### 8.4 Coverage Metrics

```
coverage_gap_count = COUNT(objects with zero engineers assigned)
uncovered_load     = SUM(itogo_chislo_with_travel) for objects with no engineer
```

### 8.5 Overload Summary

Engineers' overload status is attributed to their `home_division_id`, not where their objects are located.

---

## 9. Structural Clarifications & Business Rules

### C-01: Duplicate Normative Values for "Записи"
Use rows 73–77 as authoritative: 60/180/180/120/60 minutes.

### C-03: К-во ремонтов Is COUNT, Not SUM
Counts distinct repair types performed, not total operations.

### C-04: Round-Trip Is Computed
`round_trip_min = one_way_time × 2`. Never user-editable.

### C-06: Р1/R1 Naming
Internal: `r1_minutes` / `r2_minutes` (Latin). UI: "Р1" / "Р2" (Cyrillic).

### C-07: Headcount Formula Constants Confirmed
`monthly_avg / 60 / 142.8 × 1.12`. 142.8 = monthly hours fund; 1.12 = absence coefficient.

### C-09: Identical Division and Branch Names
Preserved as separate entities. No deduplication.

### C-10: Decimal Equipment Quantities
Decimal values (e.g., 2.2 шлейфа) are valid.

### C-11: Visit Frequencies Are Per-System Type
ОС: 10R1+2R2. ПС: 8R1+4R2. Видео: 10R1+2R2. Property of system type, not device.

### C-12: Repair Monthly Divisor Is 5, Not 6
Business rule — productive months, not planning months.

### C-13: Repair PZV Is Separate From Visit PZV
PZV appears twice: (1) per maintenance visit = 20 min fixed, (2) per repair trip using threshold formula. Both are additive and must not be collapsed.

### C-15: Same Device Name in Multiple Systems = One Device Type, Multiple Contexts

### C-16: Physical vs. Maintained Quantity Divergence Is Expected
They may differ over time. Non-blocking warning shown.

### C-17: Device Catalog System Restriction Is Explicit
No implicit "allow all systems" default.

### C-19: R1/R2 Are Never Overridden at Assignment Level
Only `quantity_maintained` is editable per assignment.

### C-20: System Types Are Fixed (ОС, ПС, Видео)
Adding a new system type requires developer involvement.

### C-22: No Free-Text `responsible_engineer` Field
Replaced entirely by engineer assignment join.

### C-23: Equal Split Means Headcount Totals Are Consistent
`SUM(all engineer loads) = SUM(all object loads)`.

### C-24: Deactivated Engineers Retain Historical Data
Their assignments and data are preserved.

### C-25: Engineer Summary Depends on Object Summary Freshness
Must not compute engineer summary from stale object data.

### C-26: R2 Is Counted Additively With R1
The application uses the additive model: `R1 × R1_visits + R2 × R2_visits`.

### C-27: Travel Time Is Per-Object
Reflects distance from primary engineer's home division. Manually entered. Reviewed when engineer changes.

### C-28: Recalculation Is On-Demand
Not automatic. Admin triggers explicitly.

### C-29: Planning Periods Lock Operational Data
Past-period data is read-only.

### C-30: Object Deletion Is Hard Delete for PoC

### C-31: Import Creates Placeholder Accounts for Unresolved Engineers

### C-34: Staffing Need Is Required FTE Only
No capacity comparison at branch/division level.

### C-38: Partial-Period Object Addition
Normatives define annual requirement; period counts reflect what was done. No pro-rata adjustment.

### C-39: PZV / Travel Overhead and Zero Guard
Zero guard prevents phantom FTE. Component breakdown sums to less than total (PZV + travel gap).

---

## 10. Acceptance Criteria

### AC-01: Data Completeness
Import produces exactly 2,935 object records.

### AC-02: Calculation Accuracy
All СВОД values match source XLSX within ±0.001.

### AC-03: Dynamic Normative Editability
Editing normatives → affected summaries marked stale and recalculated.

### AC-04: New Device Type Without Code Changes
Admin creates device type → assigns → СВОД recalculates correctly.

### AC-05: System Context Restriction Enforced
UI hides invalid systems; API rejects with HTTP 422.

### AC-06: Context Deletion Blocked When In Use

### AC-07: Computed Fields Are Read-Only

### AC-09: Export Fidelity
XLSX matches original template within ±0.001.

### AC-10: Performance
СВОД loads in <3 seconds; bulk recalculation in <60 seconds.

### AC-14: Engineer Workload = Sum of Object Shares (±0.000001)

### AC-15: Equal Split Consistency

### AC-16: Capacity and Status Logic
Verified: capacity 0.8, load 0.76 → ratio 0.95 → "warning".

### AC-17: Assignment Change Triggers All Co-Engineer Recalculation

### AC-18: Coverage Gap Reporting

### AC-19: Period Data Isolation

### AC-20: On-Demand Recalculation Only

### AC-22: Repair Threshold Formula — Three-Band Correctness
All three bands (zero/mid/cap) verified with reference values.

---

_End of Business Logic & Application Description_
