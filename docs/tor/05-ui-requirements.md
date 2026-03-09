## 7. User Interface Requirements

### 7.1 Pages / Views

| Route | View | Description |
|---|---|---|
| `/` | Dashboard | Headcount cards by division; top objects by workload |
| `/divisions` | Division List | List/search divisions |
| `/divisions/:id` | Division Detail | Objects with СВОД subtotals |
| `/objects` | Object List | Searchable, filterable table |
| `/objects/new` | Object Create | Create new object |
| `/objects/:id` | Object Detail | Tabbed detail view |
| `/objects/:id/edit` | Object Edit | Edit object metadata |
| `/svod` | СВОД | Full summary table with period selector, filters, and export |
| `/catalog/devices` | Device Catalog | List / create / edit device types and contexts |
| `/catalog/devices/new` | New Device | Create device type and assign system contexts |
| `/catalog/devices/:id` | Device Detail | View/edit device and all system contexts |
| `/catalog/repairs` | Repair Types | List / create / edit repair type catalog |
| `/admin/config` | App Config | View/edit all calculation constants (admin only) |
| `/admin/periods` | Planning Periods | Create / activate / deactivate planning periods (admin only) |
| `/admin/users` | Users | User management (admin only) |
| `/import` | Import | XLSX import wizard |
| `/export` | Export | Export options |
| `/engineers` | Engineer List | All engineers with load ratio and status |
| `/engineers/:id` | Engineer Detail | Workload dashboard for one engineer |
| `/engineers/:id/edit` | Engineer Edit | Edit name, capacity, home division |

### 7.2 Object Detail Page — Tabs

1. **Оборудование** — Two-layer equipment view (physical inventory + system assignments)
2. **Записи** — Records/admin task counts *(scoped to active period)*
3. **Ремонт** — Repair operation counts *(scoped to active period)*
4. **Дорога** — Travel data
5. **Инженеры** — Assigned engineers list with their share of this object's workload
6. **СВОД** — Computed summary (read-only; shows stale indicator when `is_stale = TRUE`; period shown in header)

### 7.3 Equipment Tab — Two-Layer UI

**Section A — Physical Inventory**

A table of all device types at this object with their physical quantities:

| Device | Physical Qty | Actions |
|---|---|---|
| Galaxy 512 (контроллер АСПС и СО) | 1 | Edit / Remove |
| серий А6, Аларм | 2 | Edit / Remove |

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
- `quantity_maintained` is editable inline per assignment row. Saving any value triggers an asynchronous summary recalculation; the СВОД tab shows a "Пересчитывается..." indicator.
- **Warning rule:** When `quantity_maintained > quantity_physical` for a single assignment row, display a yellow ⚠ icon and tooltip: **"Обслуживаемое количество (N) превышает физическое (M)"**. This is informational — it does not block saving.
- **Cascade on removal:** Removing a device from Section A (physical inventory) cascades to remove all its system assignments at this object. A confirmation dialog lists all affected assignments (e.g., "Это удалит назначения: ОС × 1, ПС × 1. Продолжить?") before proceeding.
- **Preventing orphaned assignments:** The API enforces that an `object_system_assignments` row cannot exist without a corresponding `object_devices` row for the same (object_id, device_type_id). Enforced at the application layer (not FK, since they are separate tables).

### 7.4 Engineers Tab (Object Detail)

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

- "Доля объекта" = `itogo_chislo_with_travel / engineer_count` for this object.
- "Загрузка" = that engineer's total load ratio across ALL their objects (not just this one). Provides context — assigns may push an already-loaded engineer into overload.
- "+" button opens a searchable dropdown of all active engineers (not restricted by division).
- Removing an engineer triggers immediate recalculation of all remaining engineers at this object.
- **Travel review prompt:** When a new engineer is assigned to an object (or the last engineer is removed and a new one added), the UI displays a non-blocking banner: **"Проверьте данные о маршруте — время в пути может отличаться для нового инженера"**. Travel time is stored per object and reflects the distance from the assigned engineer's home division office. When the responsible engineer changes, travel data should be reviewed and updated manually.

### 7.5 Engineer List Page (`/engineers`)

A table of all engineers with sortable columns:

```
┌──────────────────────────┬──────────────┬───────────┬───────────┬──────────────┬──────────┐
│ Инженер                  │ Подразделение│ Объектов  │ Нагрузка  │ Мощность     │ Статус   │
├──────────────────────────┼──────────────┼───────────┼───────────┼──────────────┼──────────┤
│ Иванов Петр              │ Брест №100   │ 47        │ 0.92 FTE  │ 1.0          │ ⚠ 92%    │
│ Сидорова Анна            │ Минск №200   │ 31        │ 1.08 FTE  │ 1.0          │ 🔴 108%  │
│ Козлов Дмитрий           │ Гродно №300  │ 12        │ 0.24 FTE  │ 0.5          │ ✅ 48%   │
└──────────────────────────┴──────────────┴───────────┴───────────┴──────────────┴──────────┘
```

Status icons: ✅ normal (< warning threshold) · ⚠ warning (≥ threshold, < 1.0) · 🔴 overloaded (≥ 1.0).

Filters: by home division, by status (normal / warning / overloaded), search by name.

### 7.6 Engineer Detail Page (`/engineers/:id`)

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

**Section 5 — Stale indicator**
If `engineer_summaries.is_stale = TRUE`: banner "Данные пересчитываются..." across the page.

### 7.7 Division Detail — Coverage Gaps

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

### 7.8 Device Catalog Page

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

### 7.9 СВОД Table Columns

| # | Column | Source |
|---|---|---|
| 1 | № | `object.import_seq_no` |
| 2 | Подразделение | `division.name` |
| 3 | Филиал | `branch.name` |
| 4 | Значение | `object.name` |
| 5 | Ответственные ТО | `object.responsible_engineer` |
| 6 | ПЗВ | `config[PZV_MINUTES]` |
| 7 | Дорога | `summaries.round_trip_min` |
| 8 | Пожарная сигнализация | `summaries.ps_monthly_avg` |
| 9 | Видео | `summaries.video_monthly_avg` |
| 10 | Охрана | `summaries.os_monthly_avg` |
| 11 | Записи | `summaries.records_monthly` |
| 12 | Ремонт без дороги | `summaries.repair_no_travel_monthly` |
| 13 | ТО+записи+ремонт(без дороги)+Дорога, мин | `summaries.total_no_travel_min` |
| 14 | ИТОГО Числ (без дороги) | `summaries.itogo_chislo_no_travel` |
| 15 | Ремонт с дорогой | `summaries.repair_with_travel_monthly` |
| 16 | ТО+записи+ремонт(с дорогой)+Дорога, мин | `summaries.total_with_travel_min` |
| 17 | ИТОГО Числ (с дорогой) | `summaries.itogo_chislo_with_travel` |
| 18 | Р1 на объекте всех систем | `summaries.r1_per_visit_total` |
| 19 | Р2 на объекте всех систем | `summaries.r2_per_visit_total` |

Stale rows (`is_stale = TRUE`) display a "Данные устарели — нажмите Пересчитать" indicator in place of numeric values.

**Period selector:** A dropdown above the СВОД table allows selecting which planning period's data to view. Defaults to the active period. When a non-active period is selected, the table shows historical data for that period (read-only). The "Пересчитать" button is disabled for past periods.

### 7.10 UI/UX Constraints
- All user-facing labels in **Russian**.
- СВОД table sortable by any column, filterable by division / branch / engineer.
- Repair tab is a dynamic list from `repair_types` — never hardcoded input fields.
- Zero values may display as blank (matching Excel behavior) but stored as 0.
- Inline СВОД editing not permitted.
- Engineer load ratio bars use colour coding matching status: green (normal) / amber (warning) / red (overloaded).
- Stale engineer summaries display "Пересчитывается..." placeholder values, never the last stale numbers.
- **Data entry by engineers:** Engineers can enter and edit Записи and Ремонт data for their assigned objects in the active period only. They cannot edit Оборудование, Нормативы, or Дорога. This matches their role as field operators who report what happened (repairs done, records requests handled) without modifying the equipment inventory or normatives.
- **Period lock:** Once a period is deactivated, all its Записи and Ремонт data becomes read-only for all roles including admin. Only a new period activation can unlock data entry.

---

