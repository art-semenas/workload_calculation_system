## 4. Functional Requirements

### 4.1 Object Management (FR-01)
- CRUD operations for objects (facilities).
- Each object must have: `division`, `branch`, `name/address`.
- Responsible engineers are managed via the `object_engineers` join table (§4.10), not as a free-text field on the object.
- Objects are organized in a two-level hierarchy: **Division → Branch → Objects**.
- Support bulk import from XLSX (see §11).
- Deleted objects are **permanently removed** (hard delete) for PoC. Soft-archive / decommission status is a post-MVP consideration (see §13 C-30).

### 4.2 Device Catalog Management (FR-02)

The device catalog is the central, admin-managed registry of all equipment types. It is fully dynamic — adding a new device type requires no code changes or schema migrations.

#### 4.2.1 Device Types
A device type is a named piece of hardware. It carries **no normatives directly** — normatives are defined per (device type × system type) context.

Each device type record contains:
- `name` — display name (e.g., "Galaxy 512 (Galaxy Dimension GD-520)")
- `description` — optional free-text

Admins create device types and then define one or more **device-system contexts** for each.

#### 4.2.2 Device-System Contexts (Normatives)
A context record defines that a device is valid within a specific system type and specifies the R1/R2 normative values for that combination:

| Field | Description |
|---|---|
| `device_type` | Reference to the device type |
| `system_type` | ОС, ПС, or Видео |
| `r1_minutes` | Minutes per unit for routine inspection (Р1) |
| `r2_minutes` | Minutes per unit for full maintenance (Р2) |

**Rules:**
- The (device_type, system_type) pair must be unique — one normative row per device per system.
- A device can have contexts for one, two, or all three system types, independently configured.
- A device with no context for a given system type **cannot be assigned** to that system at any object. This restriction is enforced at three levels: (1) the UI hides invalid system types in the assignment dropdown, (2) the API rejects the request with HTTP 422 code `NO_CONTEXT_FOR_SYSTEM`, (3) the `object_system_assignments.context_id` FK prevents it at the database level.
- R1 and R2 are set per context independently — the same device may have different normatives under different systems.
- Admin explicitly controls which systems a device is valid for by creating or omitting context rows. There is no implicit "allow all systems" default — a newly created device type has no valid systems until the admin adds at least one context.

**Seed data from source XLSX — ПС contexts:**

| Device | R1 (min) | R2 (min) |
|---|---|---|
| серий А6, Аларм | 5 | 12 |
| А16-512 | 6 | 13 |
| СПИ УОО Молния | 2 | 3 |
| АМ200-Notifier | 5 | 10 |
| Шлейфы сигнализации | 0.06 | 0.7 |
| Каналы считывания | 0.02 | 1.5 |
| Извещатели, оповещатели | 0.3 | 4 |
| Таблички | 0.3 | 2 |
| Galaxy 512 (контроллер АСПС и СО) | 15 | 20 |
| Оракул | 3 | 15 |
| Танго ПУ/БП | 1 | 17 |
| Танго ПУ/ЗК | 1 | 19 |
| Расширитель | 0.03 | 3 |
| Адресный модуль | 0.03 | 1.8 |
| Адресный шлейфно-релейный модуль | 0.03 | 3 |
| Усилитель линии УЛТ | 0.03 | 1 |
| Адресные извещатели | 0.2 | 2.3 |
| Колонки | 0.4 | 3 |

**Seed data — ОС contexts:**

| Device | R1 (min) | R2 (min) |
|---|---|---|
| Galaxy 512 (Galaxy Dimension GD-520) | 7 | 20 |
| Maestro (ППК ОП Maestro-1600) | 5 | 10 |
| серий А6, Аларм | 5 | 8 |
| А16-512 | 5 | 10 |
| Выносная панель управления ВПУ–А-16 | 4.5 | 4.5 |
| Устройство доступа | 1 | 4 |
| Шлейфы сигнализации | 0.06 | 0.7 |
| Каналы считывания | 0.02 | 1.5 |
| Извещатели, оповещатели | 0.7 | 3 |
| Galaxy 512 (контроллер АСПС и СО) | 15 | 20 |
| Расширитель | 0.03 | 3 |
| Контроллер системы | 3 | 9.5 |
| Системный блок ПЦН | 10 | 40 |
| ББП-20, ББП-3/12 (БРП 2401) | 0.03 | 3 |

**Seed data — Видео contexts:**

| Device | R1 (min) | R2 (min) |
|---|---|---|
| Видеокамеры | 1.5 | 1.5 |
| Микрофоны | 0.5 | 0.5 |
| Системный блок (видео сервер) | 10 | 40 |

> Note: "серий А6, Аларм", "А16-512", "Расширитель", "Galaxy 512 (контроллер АСПС и СО)" appear in both ОС and ПС. They are **one device_type record each** with **two context rows** (different R1/R2 per system where applicable).

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
- `quantity_physical` is stored once per (object, device_type) pair. It represents the hardware asset count — how many units are physically on site.
- `quantity_maintained` is stored once per (object, device_type, system_type) triple. It drives all workload calculations.
- A device can be assigned to multiple system types at the same object. Each assignment uses `quantity_maintained` independently with its own R1/R2 normatives and visit frequency. The physical quantity is not divided — it is reused across all system assignments.
- `quantity_maintained` may legitimately equal `quantity_physical` even when assigned to multiple systems (e.g., 1 physical Galaxy 512 box maintained under both ОС and ПС — `quantity_maintained = 1` in the ОС assignment AND `quantity_maintained = 1` in the ПС assignment). This reflects that the same hardware requires maintenance time counted separately under each system's schedule. This is intentional and not an error.
- `quantity_maintained` cannot exceed `quantity_physical` per individual assignment, but the sum of all `quantity_maintained` values across assignments for the same device at the same object can exceed `quantity_physical`. The UI shows a non-blocking informational warning when a single `quantity_maintained` value exceeds `quantity_physical` for that device at that object.
- Only device types with a valid `device_system_contexts` row for the chosen system type may be assigned to that system. This is enforced at UI, API, and DB levels.
- A device must first appear in the Physical Inventory (Section A of the Equipment tab) before it can be assigned to a system (Section B). The workflow is always: add to inventory → assign to systems.

### 4.4 Records & Administration Tasks (FR-04) — "Записи"
Quantities of service requests/tasks per object per 6-month planning period:

| Task | Unit | Normative (min/unit) |
|---|---|---|
| Запросы в связи с отсутствием (нарушением) доступа | requests | 60 |
| Запросы в связи с проведением мониторинга записей | requests | 180 |
| Запросы по предоставлению записей системы видеонаблюдения | requests | 180 |
| Контроль процесса резервного копирования одной системы | instances | 120 |
| Администрирование систем безопасности филиала | instances | 60 |

Records normatives are fixed constants, not device-system contexts. They have no R2 and no system type.

Records tasks are **irregular events** — they do not occur on a fixed schedule. Quantities are entered for a specific 6-month planning period (see FR-12). The monthly average `records_monthly = records_6months / 6` represents a smoothed load estimate, not a guaranteed monthly occurrence.

### 4.5 Repair Type Catalog & Object Repairs (FR-05) — "Ремонт"

Repair types are also admin-managed catalog entries (same extensibility principle as devices). Each repair type has a fixed time in minutes per operation. Admins can add new repair types without schema changes.

Count of repair operations per object per 6-month planning period is recorded per repair type.

**К-во ремонтов** (total repair count) = `COUNT(object_repairs rows WHERE count > 0 AND period_id = current_period)` for the object — always computed, never a user input. It counts **distinct repair types that were performed at least once**, not the sum of quantities.

> **Example:** An object with "Замена аккумулятора ОС × 3" and "Замена извещателя × 5" has К-во ремонтов = **2** (two distinct repair types performed), not 8 (sum of quantities). This is the value used in the travel/PZV threshold formula.

Repair counts belong to a specific 6-month planning period (see FR-12). The system tracks which period each set of repair counts belongs to, enabling comparison across periods.

**Seed repair types from source XLSX:**

| Repair Type | Time (min) |
|---|---|
| Замена ПКП серии А6 ОС | 150 |
| Замена ПКП серии А6 ПС | 150 |
| Замена извещателя охранного оптико-электронного | 15 |
| Замена извещателя пожарного дымового | 12 |
| Замена шунтирующих/оконечного резисторов шлейфа ОС | 35 |
| Замена шунтирующих/оконечного резисторов шлейфа ПС | 35 |
| Замена блока бесперебойного питания ОС | 30 |
| Замена блока бесперебойного питания ПС | 30 |
| Замена аккумулятора ОС | 5 |
| Замена аккумулятора ПС | 5 |
| Замена блока питания видеосервера | 20 |
| Замена винчестера видеосервера | 10 |
| Замена основных составных частей видеосервера в комплексе | 30 |
| Переустановка ПО на видеосервере | 90 |
| Восстановление сигнала IP камеры | 35 |
| Восстановление сигнала аналоговой камеры | 20 |
| Акт о выполненных работах ОС | 7 |
| Дефектный акт ОС | 60 |
| Акт на списание ТМЦ из подотчета ОС | 20 |
| Акт о выполненных работах ПС | 7 |
| Дефектный акт ПС | 60 |
| Акт на списание ТМЦ из подотчета ПС | 20 |
| Акт о выполненных работах Видео | 7 |
| Дефектный акт Видео | 60 |
| Акт на списание ТМЦ из подотчета Видео | 20 |

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
- Repair time without travel overhead (monthly)
- Repair time with travel overhead (monthly)
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

Admins manage engineers through the User Management interface. An engineer is a `users` record with `role = 'engineer'` plus the following additional fields:

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
- Admins and editors (within their division) manage assignments via the Object Detail page or the Engineer Detail page.
- There is no system-type constraint on assignments — an engineer assigned to an object is responsible for all maintenance at that object.
- Assignments record `assigned_at` timestamp for audit purposes.
- An engineer can be assigned to objects in any division (cross-division allowed).
- Removing an assignment immediately triggers recalculation of that engineer's workload summary.

**Workload split:** When multiple engineers share an object, the object's `itogo_chislo_with_travel` is divided **equally** among all assigned engineers. The split ratio is `1 / COUNT(assigned engineers at object)` and is recomputed dynamically — not stored.

**Coverage gap:** An object with zero assigned engineers is flagged as a coverage gap in division reports and the dashboard.

### 4.12 Planning Periods (FR-12)

Repair counts and records tasks are tied to a specific **6-month planning period**. A period covers either H1 (January–June) or H2 (July–December) of a calendar year.

**Period entity fields:**
- `name` — display name, e.g. "H1 2025", "H2 2025"
- `start_date` / `end_date` — ISO dates
- `is_active` — boolean; exactly one period is active at any time (the "current" period)
- `created_at`

**Rules:**
- Only one period can be `is_active = TRUE` at a time. Setting a new period active automatically deactivates the previous one.
- All data entry for repairs and records (via the UI or API) defaults to the currently active period.
- Admins can create future periods in advance and switch the active period when ready.
- Past periods are read-only — their repair counts and records data cannot be edited once the period is no longer active.
- СВОД calculations use the **active period's** data by default. Users can select any past period for historical comparison.
- When no period is active (e.g. gap between periods), data entry for repairs and records is blocked with a warning.

**Data model impact:** `object_repairs` and `records_tasks` both gain a `period_id` FK → `periods.id`. See §5.

---

