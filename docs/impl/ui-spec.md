# UI Specification

> Extracted from TOR_Workload_WebApp.md §7 + §12. TOR is the source of truth.
> Last sync: TOR v2.26 (2026-03-26)

## Route List (§7.1)

| Route                  | View             | Description                                                                                                  |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`                    | Dashboard        | Headcount cards by division; top objects by workload                                                         |
| `/divisions`           | Division List    | List/search divisions + "Добавить подразделение" button (admin in MVP; any auth user in PoC)                 |
| `/divisions/:id`       | Division Detail  | СВОД subtotals + branch list + "Добавить филиал" button (admin in MVP; any auth user in PoC)                 |
| `/branches/:id`        | Branch Detail    | Object list with СВОД per object + "Добавить объект" button (admin/editor in MVP; any auth user in PoC)      |
| `/objects`             | Object List      | Searchable, filterable table                                                                                 |
| `/objects/new`         | Object Create    | Create new object                                                                                            |
| `/objects/:id`         | Object Detail    | Tabbed detail view                                                                                           |
| `/objects/:id/edit`    | Object Edit      | Edit object metadata                                                                                         |
| `/svod`                | СВОД             | Full summary table with filters and export; period selector is MVP only — requires M-07                      |
| `/catalog/devices`     | Device Catalog   | List / create / edit device types and contexts — **PoC: read-only seed data, no management UI (S-03, M-04)** |
| `/catalog/devices/new` | New Device       | Create device type and assign system contexts — **MVP only — requires M-04**                                 |
| `/catalog/devices/:id` | Device Detail    | View/edit device and all system contexts — **PoC: view-only; edit requires M-04**                            |
| `/catalog/repairs`     | Repair Types     | List / create / edit repair type catalog — **PoC: read-only seed data, no management UI (S-03, M-05)**       |
| `/admin/config`        | App Config       | MVP only — requires M-10; view/edit all calculation constants (admin only)                                   |
| `/admin/periods`       | Planning Periods | MVP only — requires M-07; create / activate / deactivate planning periods (admin only)                       |
| `/admin/users`         | Users            | User management (admin only) — **MVP only — requires M-02 (S-04)**                                          |
| `/import`              | Import           | JSON / text-list import wizard — **MVP only — requires M-01 (S-06)**                                        |
| `/export`              | Export           | Export options                                                                                               |
| `/engineers`           | Engineer List    | All engineers with load ratio and status (engineers see only themselves)                                     |
| `/engineers/:id`       | Engineer Detail  | Workload dashboard for one engineer                                                                          |
| `/engineers/:id/edit`  | Engineer Edit    | Edit name, capacity, home division                                                                           |

## Staleness Indicators — Canonical Wording

**CRITICAL — must be exact strings, not paraphrased:**

| `is_stale` value | Display text |
|-----------------|--------------|
| `'TRUE'`        | "Данные устарели — нажмите Пересчитать" |
| `'PROCESSING'`  | "Пересчитывается..." |

This wording applies to ALL three locations: §7.6 (engineer summary),
§7.9 (СВОД object row), §7.10 (object detail header).

**PoC:** No stale banners. PoC recalculates synchronously on save — `is_stale`
is never written. Stale UI is MVP-only (S-02).

## Screens

### Object Detail Page — Tabs (§7.2)

1. **Оборудование** — Two-layer equipment view (physical inventory + system assignments)
2. **Записи** — Records/admin task counts _(scoped to active period)_
3. **Ремонт** — Repair operation counts _(scoped to active period)_
4. **Дорога** — Travel data
5. **Инженеры** — Assigned engineers list with their share of this object's workload
6. **СВОД** — Computed summary (read-only; shows stale indicator when `is_stale = 'TRUE'`; period shown in header) _(PoC: stale indicator not shown — summary updates synchronously on save per S-02.)_

### Equipment Tab — Two-Layer UI (§7.3)

**Section A — Physical Inventory**

A table of all device types at this object with their physical quantities:

| Device                            | Physical Qty | Actions       |
| --------------------------------- | ------------ | ------------- |
| Galaxy 512 (контроллер АСПС и СО) | 1            | Edit / Remove |
| серий А6, Аларм                   | 2            | Edit / Remove |

"Add device" opens a searchable dropdown of all `device_types`. Adding a device here creates an `object_devices` row and makes it available for Section B.

**Section B — System Assignments**

A grouped view showing which systems each device is assigned to:

```
Galaxy 512 (контроллер АСПС и СО)  [Physical qty: 1]
  ├── ОС   qty_maintained: [1]   R1: 15 min  R2: 20 min   [Remove]
  └── ПС   qty_maintained: [1]   R1: 15 min  R2: 20 min   [Remove]
     [+ Assign to system ▾]  ← shows only Видео (if context exists) or empty

серий А6, Аларм  [Physical qty: 2]
  └── ОС   qty_maintained: [2]   R1: 5 min   R2: 8 min    [Remove]
     [+ Assign to system ▾]  ← shows ПС (context exists), Видео (no context → hidden)
```

**UX rules:**

- **Workflow order:** A device must be added to Section A (Physical Inventory) before it can appear in Section B (System Assignments). The "Assign to system" button in Section B is only available for devices already in the physical inventory.
- **R1/R2 are read-only in this view.** Values shown per assignment are pulled from `device_system_contexts` and cannot be edited here. A "Edit normatives →" link navigates to the Device Catalog page for that device.
- **System type dropdown** in "Assign to system" shows **only** system types for which a `device_system_contexts` row exists for that device. System types with no context are hidden entirely — not grayed out.
- `quantityMaintained` is editable inline per assignment row. Saving any value marks the object summary stale. The СВОД tab shows a "Данные устарели — нажмите Пересчитать" indicator until the admin triggers recalculation via `POST /svod/recalculate`. _(PoC: saving any value immediately triggers synchronous recalculation — S-02. The СВОД tab shows updated values directly, with no stale indicator.)_
- **Warning rule:** When `quantityMaintained > quantityPhysical` for a single assignment row, display a yellow ⚠ icon and tooltip: **"Обслуживаемое количество (N) превышает физическое (M)"**. This is informational — it does not block saving.
- **Cascade on removal:** Removing a device from Section A (physical inventory) cascades to remove all its system assignments at this object. A confirmation dialog lists all affected assignments (e.g., "Это удалит назначения: ОС × 1, ПС × 1. Продолжить?") before proceeding.
- **Preventing orphaned assignments:** The API enforces that an `object_system_assignments` row cannot exist without a corresponding `object_devices` row for the same (objectId, deviceTypeId). Enforced at the application layer (not FK, since they are separate tables).

### Engineers Tab — Object Detail (§7.4)

Shows all engineers assigned to this object and their workload share:

```
Назначенные инженеры                              [+ Назначить инженера]

┌──────────────────────────┬──────────────┬───────────┬──────────┐
│ Инженер                  │ Доля объекта │ Загрузка  │          │
├──────────────────────────┼──────────────┼───────────┼──────────┤
│ Иванов Петр Сергеевич    │ 0.0161 FTE   │ ████░ 82% │ Снять    │
│ Сидорова Анна Николаевна │ 0.0161 FTE   │ ██░░░ 45% │ Снять    │
└──────────────────────────┴──────────────┴───────────┴──────────┘
  Split: 2 engineers → each gets 50% of object load (0.0323 / 2)
```

- "Доля объекта" = `itogoChisloWithTravel / engineerCount` for this object.
- "Загрузка" = that engineer's total load ratio across ALL their objects (not just this one). Provides context — assigns may push an already-loaded engineer into overload.
- "+" button opens a searchable dropdown of all active engineers (not restricted by division).
- Removing an engineer immediately marks all remaining engineers at this object as stale.
- **Travel review prompt:** When a new engineer is assigned to an object (or the last engineer is removed and a new one added), the UI displays a non-blocking banner: **"Проверьте данные о маршруте — время в пути может отличаться для нового инженера"**. Travel time is stored per object and reflects the distance from the assigned engineer's home division office. When the responsible engineer changes, travel data should be reviewed and updated manually.

### Engineer List Page — `/engineers` (§7.5)

**Role visibility:** Admin, Editor, and Viewer see the full list. An Engineer role accesses this route but the API returns only their own row — effectively a redirect to their personal dashboard data. The frontend renders the same table component; for engineers it displays a single row.

A table of all engineers with sortable columns:

```
┌──────────────────────────┬──────────────┬───────────┬───────────┬──────────────┬──────────┐
│ Инженер                  │ Подразделение│ Объектов  │ Нагрузка  │ Мощность     │ Статус   │
├──────────────────────────┼──────────────┼───────────┼───────────┼──────────────┼──────────┤
│ Иванов Петр              │ Брест №100   │ 47        │ 0.92 FTE  │ 1.0          │ ⚠ 92%    │
│ Сидорова Анна            │ Минск №200   │ 31        │ 1.08 FTE  │ 1.0          │ 🔴 108%  │
│ Козлов Дмитрий           │ Гродно №300  │ 12        │ 0.24 FTE  │ 0.5          │ ✅ 48%   │
└──────────────────────────┴──────────────┴───────────┴──────────────┴──────────┘
```

Status icons: ✅ normal (< warning threshold) · ⚠ warning (≥ threshold, < 1.0) · 🔴 overloaded (≥ 1.0).

Filters: by home division, by status (normal / warning / overloaded), search by name.

### Engineer Detail Page — `/engineers/:id` (§7.6)

A personal workload dashboard with five sections:

**Section 1 — Summary cards**

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Нагрузка        │ Мощность        │ Загрузка        │ Объектов        │
│ 0.921 FTE       │ 1.0 FTE         │ 92.1%  ⚠        │ 47              │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Section 2 — Breakdown by system type** (horizontal bar or pie)

```
ОС      ████████████░░░ 0.41 FTE  (45%)
ПС      ██████░░░░░░░░░ 0.27 FTE  (29%)
Видео   ██░░░░░░░░░░░░░ 0.09 FTE  (10%)
Записи  █░░░░░░░░░░░░░░ 0.05 FTE  (5%)
Ремонт  ██░░░░░░░░░░░░░ 0.10 FTE  (11%)
```

**Section 3 — Assigned objects** (table, sorted by this engineer's share descending)

```
┌──────────────────────────────────────┬──────────────┬────────────────┬──────────────┐
│ Объект                               │ Доля инженера│ Всего на объект│ Кол-во инж.  │
├──────────────────────────────────────┼──────────────┼────────────────┼──────────────┤
│ ЦБУ г.Брест, ул.Ленина, 10           │ 0.032 FTE    │ 0.064 FTE      │ 2            │
│ Архив г.Брест, ул.Московская, 202Д   │ 0.024 FTE    │ 0.024 FTE      │ 1            │
│ ...                                  │ ...          │ ...            │ ...          │
└──────────────────────────────────────┴──────────────┴────────────────┴──────────────┘
```

**Section 4 — Assign / remove objects** (admin and editor only)
Button to assign additional objects; remove button per row.

**Section 5 — Stale indicator (MVP only)**

- `is_stale = 'TRUE'` (stale, no job running): banner **"Данные устарели — нажмите Пересчитать"** across the page.
- `is_stale = 'PROCESSING'` (background job actively running): banner **"Пересчитывается..."** across the page.

_PoC: No stale indicator is shown — engineer summaries recalculate synchronously on save (S-02)._

### Division Detail — Coverage Gaps (§7.7)

On the Division Detail page (`/divisions/:id`), add a "Непокрытые объекты" section below the main СВОД table:

```
⚠ 12 объектов без назначенного инженера

┌─────────────────────────────────────────────────┬──────────────┐
│ Объект                                          │ Нагрузка     │
├─────────────────────────────────────────────────┼──────────────┤
│ Инфокиоск INF 00635 г.Брест ТЦ "Варшавский"     │ 0.008 FTE    │
│ ...                                             │ ...          │
└─────────────────────────────────────────────────┴──────────────┘
[Назначить инженеров →]  button linking to bulk-assign workflow
```

### Device Catalog Page (§7.8)

**Device list:** searchable table of all device types, with columns showing valid systems (ОС ✓ / ПС ✓ / Видео —).

**Device detail / edit view:**

```
Device name:  [Galaxy 512 (контроллер АСПС и СО)         ]
Description:  [Combined fire and security controller      ]

System Contexts:
┌─────────────┬──────────────┬──────────────┬──────────┐
│ System Type │ R1 (min/unit)│ R2 (min/unit)│ Actions  │
├─────────────┼──────────────┼──────────────┼──────────┤
│ ОС          │ 15           │ 20           │ Edit  Del │
│ ПС          │ 15           │ 20           │ Edit  Del │
└─────────────┴──────────────┴──────────────┴──────────┘
[+ Add system context ▾]  ← shows only Видео (ОС and ПС already exist)
```

Deleting a context that has active `object_system_assignments` is **blocked** at two levels:

- **Application level:** Before deletion, the API queries for active assignments and returns HTTP 409 with a payload listing the count of affected objects and a sample list of up to 10 object names.
- **Database level:** `ON DELETE RESTRICT` FK on `object_system_assignments.context_id` prevents deletion even if the application-level check is bypassed.

The UI pre-checks on click and shows: **"Нельзя удалить: 42 объекта используют этот контекст. Сначала снимите назначения."**

## СВОД Table Columns (§7.9)

| #   | Column                                   | Source                                                             |
| --- | ---------------------------------------- | ------------------------------------------------------------------ |
| 1   | №                                        | `object.importSeqNo`                                             |
| 2   | Подразделение                            | `division.name`                                                    |
| 3   | Филиал                                   | `branch.name`                                                      |
| 4   | Значение                                 | `object.name`                                                      |
| 5   | Ответственные ТО                         | `JOIN object_engineers → users.name` (comma-separated if multiple) |
| 6   | ПЗВ                                      | `config[PZV_MINUTES]`                                              |
| 7   | Дорога                                   | `summaries.roundTripMin`                                         |
| 8   | Пожарная сигнализация                    | `summaries.ps_monthly_avg`                                         |
| 9   | Видео                                    | `summaries.video_monthly_avg`                                      |
| 10  | Охрана                                   | `summaries.os_monthly_avg`                                         |
| 11  | Записи                                   | `summaries.records_monthly`                                        |
| 12  | Ремонт без дороги                        | `summaries.repair_no_travel_monthly`                               |
| 13  | ТО+записи+ремонт(без дороги)+Дорога, мин | `summaries.total_no_travel_min`                                    |
| 14  | ИТОГО Числ (без дороги)                  | `summaries.itogo_chislo_no_travel`                                 |
| 15  | Ремонт с дорогой                         | `summaries.repair_with_travel_monthly`                             |
| 16  | ТО+записи+ремонт(с дорогой)+Дорога, мин  | `summaries.total_with_travel_min`                                  |
| 17  | ИТОГО Числ (с дорогой)                   | `summaries.itogoChisloWithTravel`                               |
| 18  | Р1 на объекте всех систем                | `summaries.r1_per_visit_total`                                     |
| 19  | Р2 на объекте всех систем                | `summaries.r2_per_visit_total`                                     |

**Column 5 source:** engineer names via `object_engineers → users.name` JOIN
(NOT a responsible_engineer field on the objects table — that field does not exist)

Stale rows display state-specific indicators in place of numeric values (MVP only):

- `is_stale = 'TRUE'` (stale, no job running): **"Данные устарели — нажмите Пересчитать"**
- `is_stale = 'PROCESSING'` (background job actively running): **"Пересчитывается..."**

_PoC: No stale rows — summaries recalculate synchronously on save (S-02)._

**Period selector (MVP only — requires M-07):** A dropdown above the СВОД table allows selecting which planning period's data to view. Defaults to the active period. When a non-active period is selected, the table shows historical data for that period (read-only). The "Пересчитать" button is disabled for past periods. _PoC: selector absent because planning periods do not exist yet (S-05); СВОД shows only the current PoC dataset._

## UI/UX Constraints (§7.10)

- All user-facing labels in **Russian**.
- СВОД table sortable by any column, filterable by division / branch / engineer.
- Repair tab is a dynamic list from `repair_types` — never hardcoded input fields.
- Zero values may display as blank (matching Excel behavior) but stored as 0.
- Inline СВОД editing not permitted.
- Engineer load ratio bars use colour coding matching status: green (normal) / amber (warning) / red (overloaded).
- Stale summaries display state-specific text in place of numeric values — never the last stale numbers (MVP only):
  - `is_stale = 'TRUE'` (stale, no job running): **"Данные устарели — нажмите Пересчитать"**
  - `is_stale = 'PROCESSING'` (background job actively running): **"Пересчитывается..."**
  - _PoC: Stale banners do not appear — summaries recalculate synchronously on save (S-02). Stale banners are available from MVP onward._
- **Data entry by engineers:** Engineers can enter and edit Записи and Ремонт data for their assigned objects in the active period only. They cannot edit Оборудование, Нормативы, or Дорога. This matches their role as field operators who report what happened (repairs done, records requests handled) without modifying the equipment inventory or normatives.
- **Period lock:** Once a period is deactivated, all its Записи and Ремонт data becomes read-only for all roles including admin. Only a new period activation can unlock data entry.

## Roles & Permissions (§12)

> **PoC (S-04):** The permission matrix below describes **MVP behavior**. In PoC, all authenticated users can read and write all data regardless of role — no division scoping, no role-based restrictions. The `role` column exists on `users` and is set correctly, but access control is not enforced. See §15.3 S-04.

| Permission                             | Admin | Editor                             | Viewer | Engineer           |
| -------------------------------------- | ----- | ---------------------------------- | ------ | ------------------ |
| View all objects / СВОД                | ✅    | ✅                                 | ✅     | Own objects only   |
| Edit object metadata                   | ✅    | ✅ (own div)                       | ❌     | ❌                 |
| Edit equipment / assignments           | ✅    | ✅ (own div)                       | ❌     | ❌                 |
| Edit records / repairs (active period) | ✅    | ✅ (own div)                       | ❌     | ✅ (own objects)   |
| Edit travel data                       | ✅    | ✅ (own div)                       | ❌     | ❌                 |
| Create / delete objects                | ✅    | ❌                                 | ❌     | ❌                 |
| Manage device catalog                  | ✅    | ❌                                 | ❌     | ❌                 |
| Manage repair type catalog             | ✅    | ❌                                 | ❌     | ❌                 |
| Edit app configuration constants       | ✅    | ❌                                 | ❌     | ❌                 |
| Import data (JSON / text)              | ✅    | ❌                                 | ❌     | ❌                 |
| Export XLSX / PDF                      | ✅    | ✅                                 | ✅     | ✅ (own objects)   |
| Trigger bulk recalculation             | ✅    | ❌                                 | ❌     | ❌                 |
| View audit log                         | ✅    | ❌                                 | ❌     | ❌                 |
| Manage users / engineers               | ✅    | ❌                                 | ❌     | ❌                 |
| View own workload dashboard            | ✅    | ✅                                 | ✅     | ✅                 |
| Assign / remove engineers to objects   | ✅    | ✅ (own div objects, any engineer) | ❌     | ❌                 |
| View engineer list and load ratios     | ✅    | ✅ (all engineers)                 | ✅     | ✅ (own data only) |

### Role Definitions

| Role     | Scope           | Key Permissions                                                                     |
|----------|-----------------|-------------------------------------------------------------------------------------|
| admin    | global          | Full access: all objects, all catalogs, config, import, bulk recalculation, users   |
| editor   | own division    | Edit objects/equipment/travel in own division; assign any active engineer; no catalog mgmt |
| viewer   | read-only       | View all objects and СВОД; export; view engineer list; no write access              |
| engineer | own objects     | Edit records/repairs for assigned objects in active period; view own workload only  |

### Editor Division Scoping (§4.11 / §12)

Editors may assign **any active engineer** to objects in the editor's own division.
The engineer picker is NOT filtered by the engineer's `home_divisionId`.
The editor's `divisionId` scopes which **objects** the editor can see, not which
engineers they can assign.

**Editor scope (verbatim from §12):** `divisionId` restricts write operations to **objects** in their assigned division. Editors can view and assign **any active engineer** to those objects (cross-division assignment is allowed). Enforced at the API level.

**Engineer scope (verbatim from §12):** Engineers access the `/engineers` route, but `GET /engineers` returns only their own row (API-level filtering by `user_id`). They can view their own `engineer_summaries` and the objects they are assigned to. They cannot view other engineers' rows, dashboards, or unassigned objects.

**Period lock:** Записи and Ремонт data is read-only for all roles once a period is deactivated. Only admin can create and activate a new period to enable data entry again.
