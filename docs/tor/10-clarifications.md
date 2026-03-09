## 13. Structural Clarifications & Corrections

### C-01: Duplicate Normative Values for "Записи"
`Нормативы` sheet has two sections for records tasks. Row 20 (60/180/20/3.15/60) is an older draft. **Use rows 73–77** as authoritative: 60/180/180/120/60 minutes.

### C-02: "Шлейфы сигнализации" R1 Discrepancy
Compact table (rows 3–4) shows R1=0.2 for ПС loops. Detailed table (rows 42, 65) shows R1=0.06 for both systems. **Use 0.06** as the seed value in `device_system_contexts`.

### C-03: "К-во ремонтов" Is Always Computed — Counts Distinct Types, Not Sum of Quantities
`К-во ремонтов` = `COUNT(object_repairs rows WHERE count > 0 AND period_id = current_period)`. It counts how many distinct repair types were performed at least once in the period — not the total number of individual repair operations and not the sum of `count` values. An object with "Замена аккумулятора × 3" and "Замена извещателя × 5" has `К-во ремонтов = 2`, not 8. This value is referred to as `kvo` in the calculation engine (§6.6) and is used as the threshold input for `effective_trips`. It is always computed server-side; never a user input; read-only in all UI views. See also C-36.

### C-04: Round-Trip Travel Time Is Computed
`round_trip_min = one_way_time_min × 2`. Never stored. Never user-editable.

### C-05: "Расчет" Sheets Are Fully Derived
All "Расчет" sheets contain only references and formulas. They are not imported. Their logic is implemented in the calculation engine (§6).

### C-06: Р1/R1 Naming
Internal field names use `r1_minutes` / `r2_minutes` (Latin). UI labels display "Р1" / "Р2" (Cyrillic).

### C-07: Headcount Formula Constants Confirmed
Formula: `monthly_avg / 60 / 142.8 × 1.12`. Verified against ОС Расчет col AN. **142.8** = monthly working hours fund; **1.12** = absence coefficient. Both in `app_config`. No "7,647 min/month" divisor anywhere in the implementation.

### C-08: Empty Лист1 and Лист2
Not imported. Dashboard (FR-09) fulfills the same purpose as Лист1.

### C-09: Identical Division and Branch Names
Preserved as separate entities. No deduplication. UI shows both fields; they may be equal.

### C-10: Decimal Equipment Quantities
All equipment quantities use `DECIMAL(10,2)`. Decimal values (e.g., 2.2 шлейфа) are valid and accepted.

### C-11: Visit Frequencies Are Per-System Type
ОС: 10R1+2R2. ПС: 8R1+4R2. Видео: 10R1+2R2. Visit frequency is a property of the system type, not the device. Stored in `app_config`.

### C-12: Repair Monthly Divisor Is 5, Not 6
Repairs planned over 6 months but divided by **5** (productive months). Confirmed business rule. Do not change to 6 without explicit business owner approval.

### C-13: Repair PZV Is Separate from Visit PZV, and Uses the Threshold Formula
PZV appears in two places in the calculation:
1. **Per maintenance visit** — `pzv = config[PZV_MINUTES]` (20 min), a fixed cost added once in the СВОД total regardless of equipment count.
2. **Per repair trip** — `repair_pzv_6months = effective_trips × config[PZV_MINUTES]`, where `effective_trips` is determined by the 3-tier threshold on `kvo` (§6.6 Step 3).

Both are additive in the final `total_with_travel_min` formula and must not be collapsed. The second PZV cost is zero when `kvo ≤ REPAIR_TRAVEL_ZERO_THRESHOLD` (≤ 5), meaning objects with few repair types pay no repair PZV overhead at all.

### C-14: "Расчет" Sheets Define Structure, Not Storage
These sheets document the calculation pipeline. Developers must understand them but must not replicate their column structure as database tables.

### C-15: Same Device Name in Multiple Systems = One Device Type, Multiple Contexts
"серий А6, Аларм" in both ОС (R2=8) and ПС (R2=12): one `device_types` row, two `device_system_contexts` rows. The import must not create duplicate device_types for the same column header name.

### C-16: Physical vs. Maintained Quantity Divergence Is Expected
After import: `quantity_physical = quantity_maintained` for all records. Over time they may diverge (e.g., a new box installed but not yet assigned, or one box assigned to two systems). The application displays both values without forcing equality. A non-blocking warning shows when a single assignment's `quantity_maintained > quantity_physical`.

### C-17: Device Catalog System Restriction Is Explicit, Never Implicit
A newly created device type is assigned to **no systems** by default. The admin must explicitly create `device_system_contexts` rows to make a device available for assignment. There is no "inherit all systems" or "allow all" shortcut. This prevents accidental assignments using wrong or missing normatives.

### C-18: Orphaned Assignment Prevention
The system must prevent `object_system_assignments` rows from existing without a corresponding `object_devices` row at the same (object, device_type). This is enforced at the application service layer on every assignment create/update. It is not enforced by a direct FK because physical inventory and assignment are separate tables. The import process creates both rows together for every non-zero equipment cell.

### C-19: R1/R2 Are Never Overridden at the Assignment Level
`quantity_maintained` is the only user-editable field on `object_system_assignments`. There is no per-assignment override of R1/R2. Normatives are always read from `device_system_contexts` at calculation time. This ensures global consistency — changing a normative cascades to all objects using that context.

### C-21: Engineer Identity Is Unified with User Account
An engineer's login account and their professional data (capacity, home division) are the same record in `users`. There is no separate `engineers` table. Admins create an engineer by creating a user with `role = 'engineer'`. This means email, password, and engineer metadata are managed in one place.

### C-22: `responsible_engineer` VARCHAR Field Is Removed
The original Excel had a free-text "Ответственные ТО" column per object. In the web application this is replaced entirely by the `object_engineers` join table. The import process maps the text value to a matching `users.name` record (or creates a placeholder engineer account flagged for review). The VARCHAR field does not exist in the `objects` table.

### C-23: Equal Split Means Headcount Totals Are Consistent
With equal split, the sum of all engineers' `total_load` values equals the sum of all objects' `itogo_chislo_with_travel`. No workload is lost or double-counted at the division or system level.  
Proof: `SUM(object_share per engineer) = SUM(itogo / n × n) = SUM(itogo)`.

### C-24: Deactivated Engineers Retain Historical Data
Setting `users.is_active = FALSE` hides the engineer from dropdowns and the active list, but does not remove `object_engineers` rows or `engineer_summaries`. Division workload totals still reflect their assigned objects until an admin explicitly removes the assignments. This is a deliberate choice — unassigned workload must be visible, not silently dropped.

### C-25: Engineer Summary Depends on Object Summary Freshness
`engineer_summaries` must only be computed when all dependent `summaries` rows are fresh (`is_stale = FALSE`). If an object summary is stale, the engineer summary must also remain stale until the object is resolved. The background worker enforces this ordering. A partially-fresh engineer summary (some objects fresh, some stale) must not be written.

### C-26: R2 Is Deeper Than R1 But Counted Additively in the Formula
R2 maintenance is a full inspection that covers the scope of R1 work. However, the Excel workbook treats R1 and R2 visit budgets as additive: `annual = R1_per_visit × R1_visits + R2_per_visit × R2_visits`. This is confirmed by analysis of the ОС Расчет sheet. The application must replicate this additive model exactly. Substituting R2 for R1 on shared visit days (i.e. `R1 × (R1_visits − R2_visits) + R2 × R2_visits`) gives a different and incorrect result.

### C-27: Travel Time Is Per-Object, Relative to Engineer's Home Division
The `Дорога` sheet stores one travel time per object. This time represents the distance from the responsible engineer's home division office to the object. It is entered manually — not computed from coordinates. When the responsible engineer changes (different home division), the travel time field must be reviewed and updated by an editor or admin. The system prompts for review but does not block saving.

### C-28: Recalculation Is On-Demand — Not Automatic
The system marks summaries stale immediately when data changes, but does not automatically trigger recalculation. Recalculation runs only when an admin explicitly presses "Пересчитать". This is intentional for PoC — it prevents background calculation load during bulk data entry sessions. Automatic triggering is a post-MVP enhancement.

### C-29: Planning Periods Lock Operational Data
Once a period is deactivated, its `object_repairs` and `records_tasks` rows become read-only for all roles. This ensures historical data integrity — past period calculations remain reproducible. Equipment, normatives, and travel data are not period-scoped in PoC; only repair counts and records tasks are.

### C-30: Object Deletion Is Hard Delete for PoC
Deleted objects are permanently removed. There is no soft-archive or decommission status in PoC. Post-MVP should introduce `is_active = FALSE` on objects to handle closed branches while preserving historical calculation data.

### C-31: Import Creates Placeholder Accounts for Unresolved Engineers
When an engineer name from the `Ответственные ТО` column does not match any existing `users.name`, the import creates a placeholder account (`role = 'engineer'`, `is_active = FALSE`, `requires_activation = TRUE`). The object is assigned to this placeholder. The post-import report lists all placeholder accounts. Admins activate them by setting a password. This prevents coverage gaps from appearing due to import name mismatches.

### C-32: `responsible_engineer` VARCHAR Field Does Not Exist in the Schema
The original Excel free-text field is replaced by `object_engineers` join rows. After import, the text is resolved to user accounts (or placeholders). No VARCHAR field is retained on the `objects` table. The СВОД export populates the "Ответственные ТО" column by joining `users.name` through `object_engineers`.

### C-36: К-во ремонтов Is COUNT of Distinct Repair Types, Not SUM of Quantities
`К-во ремонтов` (total repair count) = `COUNT(object_repairs rows WHERE count > 0)` for the current period. It counts how many distinct repair types were performed at least once — not the total number of individual repair operations. An object with "Замена аккумулятора × 3" and "Замена извещателя × 5" has `kvo = 2`, not 8. This is the value used in the repair travel/PZV threshold formula. The field is always computed; it is never user-entered. Verified against the Ремонт Расчет sheet: object "Архив г.Брест" has 8 distinct repair types → `kvo = 8`.

### C-37: Repair Travel and PZV Use a 3-Tier Threshold on kvo
Both `repair_travel_6months` and `repair_pzv_6months` apply the same threshold logic:
- `kvo ≤ 5` → zero overhead (too few repairs to justify extra trips)
- `5 < kvo ≤ 10` → overhead = `kvo × rate` (one trip/PZV per repair type)
- `kvo > 10` → overhead capped at `10 × rate`

The two formulas differ only in the rate used: travel uses `round_trip_min`, PZV uses `config[PZV_MINUTES]`. Neither uses the raw sum of repair quantities. The threshold values (5 and 10) are stored in `app_config` as `REPAIR_TRAVEL_ZERO_THRESHOLD` and `REPAIR_TRAVEL_CAP`. Verified across all non-zero repair rows in source XLSX: zero mismatches.

### C-33: Aggregations Are Never Cached in the Database
Branch, division, and company-wide required FTE values are computed by live SQL aggregation over `summaries` at query time. No `branch_summaries`, `division_summaries`, or `company_summary` tables exist. With ~2,935 objects, a SUM over `summaries.itogo_chislo_with_travel` grouped by `division_id` completes in milliseconds with a proper index. Caching these aggregations would add invalidation complexity with no meaningful performance benefit.

### C-34: Staffing Need Is Required FTE Only — No Capacity Comparison at Branch/Division Level
`branch_load` and `division_load` express how many full-time engineers are theoretically required to cover all objects. They do not compare against available engineer capacity. Capacity comparison (load ratio, overload status) is defined only at the individual engineer level (§6.13). Division managers see required FTE and must use their own knowledge of assigned headcount to assess adequacy.

### C-35: Import Is the Highest-Priority MVP Item
The PoC requires manual data entry. With 2,935 objects, manual entry is a demo-only shortcut — not a viable production workflow. XLSX import (M-01) must be the first item delivered in MVP, before any other MVP feature, as it is the precondition for real users adopting the system.

### C-38: Partial-Period / Mid-Year Object Addition Policy
If a new object is added mid-period (e.g., a new branch opens in April during the H1 January–June period), its repair counts and records tasks for that period are entered based on what **actually occurred** from the activation date to the period end. No pro-rata adjustment is applied to the normative calculation itself — `itogo_chislo_with_travel` represents the full 6-month expected workload for the object regardless of when it was added. The logic is: normatives define the *annual maintenance requirement* for a fully operational object; the period's actual counts (Записи/Ремонт) reflect what was done; the combination produces the correct load estimate. If an object was non-operational for part of the period, editors enter zero counts for the inactive portion — the system does not track activation dates or apply temporal weighting. This decision keeps the calculation engine stateless with respect to object lifecycle.

### C-20: New System Types Cannot Be Added Without Developer Involvement
The set of system types (ОС, ПС, Видео) is currently fixed. Visit frequency config keys, СВОД column structure, and calculation stages are all keyed to these three types. Adding a 4th system type (e.g., "СКУД" — access control) would require new `app_config` keys, a new СВОД column, and a new calculation stage. This is a developer task, not an admin task, and is out of scope for v1.

---

