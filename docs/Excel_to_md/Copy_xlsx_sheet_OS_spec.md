# Copy.xlsx — Sheet Specification: `ОС` and its calculation contract

## Purpose of this document

This document describes the structure, meaning, and workbook logic of the sheet **`ОС`** in `Copy.xlsx`, with explicit references to the downstream sheet **`ОС Расчет`**, the normative table **`Нормативы_ОС`**, and the aggregate sheet **`СВОД`**.

The goal is to capture the current Excel behavior in a form that can be used as context for a future web application. The document is intentionally written as a **specification**, not only as a descriptive summary.

This is the first sheet-level context document. Later documents for other sheets should follow the same style and should treat shared object metadata as part of a common workbook-wide object registry.

---

## 1. Workbook context

### 1.1 Position of `ОС` inside the workbook

Relevant workbook sheets:

- `ОС` — source/input sheet for security alarm system data
- `ОС Расчет` — calculated workload sheet derived from `ОС`
- `Нормативы` — contains normative coefficients used by calculation sheets
- `СВОД` — consolidated workload sheet across all systems
- Other sibling systems:
  - `ПС` / `ПС Расчет`
  - `Видео` / `Видео Расчет`
  - `Записи` / `Записи Расчет`
  - `Ремонт` / `Ремонт Расчет`
  - `Дорога`

### 1.2 Role of `ОС`

`ОС` is the **input inventory sheet** for the subsystem usually interpreted as **охранная сигнализация** (security alarm system).

Each row represents one object/site and stores:

- object identity and organizational placement
- responsible engineer
- quantities of ОС-related devices installed at that object

`ОС` itself does **not** calculate labor/workload. It is the source of quantities that are transformed in `ОС Расчет` into:

- R1 workload
- R2 workload
- total annual workload
- average monthly workload
- staffing norm (`Норматив числености, единиц`)

---

## 2. Physical structure of sheet `ОС`

### 2.1 Current table boundaries

Excel table name: **`ОС`**  
Current range: **`A1:S2935`**

This means:

- 1 header row
- 2934 data rows
- 19 columns total

### 2.2 Column layout

The sheet contains 5 metadata columns and 14 device quantity columns.

#### Metadata columns

1. `№`
2. `Подразделение`
3. `Филиал`
4. `Значение`
5. `Ответственные ТО`

#### Device quantity columns

6. `Galaxy 512 (Galaxy Dimension GD-520), ед`
7. `Maestro (ППК ОП Maestro-1600), ед`
8. `серий А6, Аларм, ед`
9. `А16-512, ед`
10. `Выносная панель управления ВПУ–А-16, ед`
11. `Устройство доступа, ед`
12. `Шлейфы сигнализации, ед`
13. `Каналы считывания, ед`
14. `Извещатели, оповещатели, ед`
15. `Galaxy 512 (контроллер АСПС и СО), ед`
16. `Расширитель, ед`
17. `Контроллер системы, ед`
18. `Системный блок ПЦН, ед`
19. `ББП-20, ББП-3/12 (БРП 2401), ед`

### 2.3 Row semantics

One row = one object/site.

The workbook uses the same object numbering scheme across all operational sheets:

- `№` is sequential and unique in `ОС`
- object numbering aligns with other source and calculation sheets
- row order is also aligned across workbook sheets in the current file

This means the workbook behaves like a **shared row-aligned object registry**, even though Excel stores each sheet independently.

---

## 3. Business meaning of each field group

### 3.1 Object identity / organizational metadata

#### `№`
Workbook-wide object identifier. In the current workbook it is unique and sequential from 1 to 2934.

#### `Подразделение`
Top-level organizational unit / regional administration.

Examples include:

- `Брестское областное управление №100`
- `Витебское областное управление №200`
- `Головной офис`
- `Гомельское областное управление №300`
- `Гродненское областное управление №400`
- `Могилевское областное управление №700`

#### `Филиал`
Branch or more specific operating unit inside the division.

This can repeat the division name for top-level records, or specify a child unit such as a CBU / branch / office.

#### `Значение`
Human-readable object description. In practice this is the object name and/or address string.

Typical values include:

- building names
- branch names
- kiosks / self-service points
- office addresses
- operational facilities

This field acts as the main descriptive label of the object.

#### `Ответственные ТО`
Responsible maintenance engineer / owner.

This appears to be a free-text engineer identifier, often in the form:

`Имя Фамилия/BELARUSBANK/BY`

### 3.2 Device quantity columns

Each device column stores the quantity of that device installed at the object.

Expected semantic type:

- integer quantity
- typically non-negative
- blank or zero means no device
- any non-numeric value is outside the implied quantitative contract

In the current workbook, however, some cells contain status text such as `закрыто` instead of numeric quantities. This is an important deviation and is described later in the data quality section.

---

## 4. Logical role of `ОС` in workbook processing

`ОС` is a **source-of-quantities** sheet.

Its data is used in three main ways:

1. As the source of installed device counts per object
2. As the header dictionary for coefficient lookup in `Нормативы_ОС`
3. As the basis for workload calculation in `ОС Расчет`

In other words:

- `ОС` answers **what equipment exists on each object**
- `ОС Расчет` answers **how much maintenance workload this implies**
- `СВОД` answers **how this workload contributes to overall staffing across systems**

---

## 5. Cross-sheet contract: `ОС` → `ОС Расчет`

## 5.1 Calculation sheet structure

Excel table name: **`ОС_Расчет`**  
Current range: **`A1:AN2935`**

`ОС Расчет` has 40 columns.

### 5.2 First 19 columns

Columns A:S in `ОС Расчет` mirror the structure of `ОС`:

- the same 5 metadata columns
- the same 14 device names

However, in the current workbook the first 5 metadata columns in `ОС Расчет` are stored as plain values, not live formulas. This means they are duplicated data, not guaranteed live references.

This creates a synchronization risk:
- if metadata is changed in `ОС`
- and the corresponding values in `ОС Расчет` are not refreshed
- then the sheets can diverge

This is not theoretical: the current workbook already contains several engineer mismatches between `ОС` and `ОС Расчет`.

### 5.3 Calculated columns in `ОС Расчет`

After the 19 mirrored columns, `ОС Расчет` adds the following calculated fields:

20. `Р1 за мес`
21. `Р1 за 10 раз в году`
22. `Galaxy 512 (Galaxy Dimension GD-520), ед2`
23. `Maestro (ППК ОП Maestro-1600), ед3`
24. `серий А6, Аларм, ед4`
25. `А16-512, ед5`
26. `Выносная панель управления ВПУ–А-16, ед6`
27. `Устройство доступа, ед7`
28. `Шлейфы сигнализации, ед8`
29. `Каналы считывания, ед9`
30. `Извещатели, оповещатели, ед10`
31. `Galaxy 512 (контроллер АСПС и СО), ед11`
32. `Расширитель, ед12`
33. `Контроллер системы, ед13`
34. `Системный блок ПЦН, ед14`
35. `ББП-20, ББП-3/12 (БРП 2401), ед15`
36. `Р2 за мес`
37. `Р2 за 2 раз в году`
38. `ИТОГО Р1+Р2, мин`
39. `ИТОГО Р1+Р2 среднее за месяц, мин`
40. `Норматив числености, единиц`

### 5.4 Important implementation detail: exact header matching

The formulas in `ОС Расчет` use **structured references and `HLOOKUP` by exact header text** against the table `Нормативы_ОС`.

This means the device display names in `ОС` are not only labels; they also behave as **lookup keys**.

Implication for a future application:

- device columns should have stable internal IDs
- display names should not be the only key
- otherwise renaming a column breaks calculation logic

In the current Excel workbook, renaming any device column header in `ОС` would break the matching logic unless `Нормативы_ОС` is updated identically.

---

## 6. Normative lookup contract: `Нормативы_ОС`

### 6.1 Table location

Sheet: `Нормативы`  
Table name: **`Нормативы_ОС`**  
Range: **`A13:N15`**

### 6.2 Structure of `Нормативы_ОС`

Row 13 contains the 14 device names, matching the headers of `ОС`.

Row 14 contains the coefficient set used for the first workload block (R1):

| Device | R1 coefficient |
|---|---:|
| Galaxy 512 (Galaxy Dimension GD-520), ед | 7 |
| Maestro (ППК ОП Maestro-1600), ед | 5 |
| серий А6, Аларм, ед | 5 |
| А16-512, ед | 5 |
| Выносная панель управления ВПУ–А-16, ед | 2 |
| Устройство доступа, ед | 1 |
| Шлейфы сигнализации, ед | 0.2 |
| Каналы считывания, ед | 0.02 |
| Извещатели, оповещатели, ед | 0.7 |
| Galaxy 512 (контроллер АСПС и СО), ед | 15 |
| Расширитель, ед | 0.3 |
| Контроллер системы, ед | 3 |
| Системный блок ПЦН, ед | 10 |
| ББП-20, ББП-3/12 (БРП 2401), ед | 0.03 |

Row 15 contains the coefficient set used for the second workload block (R2):

| Device | R2 coefficient |
|---|---:|
| Galaxy 512 (Galaxy Dimension GD-520), ед | 20 |
| Maestro (ППК ОП Maestro-1600), ед | 10 |
| серий А6, Аларм, ед | 8 |
| А16-512, ед | 10 |
| Выносная панель управления ВПУ–А-16, ед | 4.5 |
| Устройство доступа, ед | 4 |
| Шлейфы сигнализации, ед | 0.7 |
| Каналы считывания, ед | 1.5 |
| Извещатели, оповещатели, ед | 3 |
| Galaxy 512 (контроллер АСПС и СО), ед | 20 |
| Расширитель, ед | 3 |
| Контроллер системы, ед | 9.5 |
| Системный блок ПЦН, ед | 40 |
| ББП-20, ББП-3/12 (БРП 2401), ед | 3 |

### 6.3 Business interpretation

Excel does not explicitly define the business meaning of R1 and R2, but the structure strongly suggests:

- R1 = one class of maintenance labor norm
- R2 = another class of maintenance labor norm
- annual frequency assumptions are then applied:
  - R1 × 10 times per year
  - R2 × 2 times per year

The final staffing norm is derived from the resulting average monthly minutes.

Because the workbook labels use phrases such as `за мес`, but also immediately multiply by annual frequency factors, the naming should be treated as **workbook-native labels**, not as perfectly precise domain terminology.

A future application should define the business meaning of R1 and R2 explicitly in domain language.

---

## 7. Calculation logic in `ОС Расчет`

## 7.1 Device-level R1 contribution

For each device column, `ОС Расчет` computes:

`R1_device_minutes = quantity_from_ОС * R1_coefficient_from_Нормативы_ОС`

In Excel this is implemented as:

- exact header lookup in `Нормативы_ОС` row 14
- multiplied by the current row quantity from `ОС`

### 7.2 Object-level R1

`Р1 за мес` is the sum of all device-level R1 contributions for the object.

Conceptually:

`R1_total = Σ(quantity_device_i × R1_norm_device_i)`

### 7.3 Annualization of R1

`Р1 за 10 раз в году = Р1 за мес × 10`

This means the workbook assumes the R1 workload is performed **10 times per year**.

### 7.4 Device-level R2 contribution

For the second workload block, the same device quantities are multiplied by row 15 of `Нормативы_ОС`.

Conceptually:

`R2_device_minutes = quantity_from_ОС * R2_coefficient_from_Нормативы_ОС`

### 7.5 Object-level R2

`Р2 за мес` is the sum of all device-level R2 contributions for the object.

### 7.6 Annualization of R2

`Р2 за 2 раз в году = Р2 за мес × 2`

This means the workbook assumes the R2 workload is performed **2 times per year**.

### 7.7 Total annual workload

`ИТОГО Р1+Р2, мин = (Р1 × 10) + (Р2 × 2)`

### 7.8 Average monthly workload

`ИТОГО Р1+Р2 среднее за месяц, мин = ИТОГО Р1+Р2 / 12`

### 7.9 Staffing norm

`Норматив числености, единиц = (AverageMonthlyMinutes / 60 / 142.8) × 1.12`

Equivalent expression:

`StaffingUnits = MonthlyMinutes / 60 / 142.8 × 1.12`

Interpretation of constants:

- `/ 60` converts minutes to hours
- `/ 142.8` appears to be the base monthly work-hour capacity per employee
- `× 1.12` appears to be an uplift/allowance factor

The workbook does not document these constants in-place, but they are used consistently in the calculation formulas.

---

## 8. Downstream usage in `СВОД`

`СВОД` consumes the outputs of `ОС Расчет`.

### 8.1 Main ОС contribution to summary

In `СВОД`, column `Охрана` is populated from:

`ОС_Расчет[ИТОГО Р1+Р2 среднее за месяц, мин]`

So the monthly average workload of ОС becomes the security-system contribution in the consolidated summary.

### 8.2 R1 and R2 cross-system totals

`СВОД` also sums `Р1 за мес` and `Р2 за мес` across:

- `ОС_Расчет`
- `ПС_Расчет`
- `Видео_Расчет`

This means the workbook treats ОС as one of several system contributors feeding a shared workload model.

### 8.3 Practical implication

For a future application, `ОС` cannot be designed in isolation. It should be modeled as one system-specific module that plugs into a common object-centered workload engine.

---

## 9. Current data profile of sheet `ОС`

### 9.1 Basic cardinality

Current `ОС` profile:

- 2934 object rows
- 19 columns
- 14 device quantity columns
- 125 distinct values in `Ответственные ТО`
- 7 distinct values in `Подразделение`
- 135 distinct values in `Филиал`

### 9.2 Object coverage pattern

The sheet mixes:

- large office / operational sites with dense equipment sets
- many small sites with small standard configurations
- rows with zero quantities
- rows with textual status markers instead of numeric quantities

This confirms that `ОС` is not a clean normalized asset table. It is a mixed operational worksheet.

---

## 10. Data quality and design issues discovered

## 10.1 Non-numeric values inside quantitative device columns

This is the most important issue.

The device columns are logically numeric, but the current workbook stores text markers in some rows, including values such as:

- `закрыто`
- `закрыт`
- `ДО`
- `Закрыто`
- `«закрыт»`
- `в составе ОС отделения`
- `демонтирована`
- relocation/rename notes

### Impact

- 137 rows contain text in at least one device column
- 1 additional row contains a blank-space string in a device cell
- therefore 138 rows currently produce `#VALUE!` in `ОС Расчет`

This happens because the calculation formulas multiply quantities by numeric coefficients. If a quantity cell contains text, the result becomes an Excel error.

### Practical interpretation

The sheet currently mixes at least two concepts in one place:

1. quantitative inventory data
2. object lifecycle / status / exception notes

These should be separated in an application data model.

## 10.2 Zero-only rows

811 rows have all numeric device quantities equal to zero.

Possible meanings:

- object exists but has no ОС equipment
- object is inactive
- data is incomplete
- row is reserved for workbook-wide alignment
- workload should effectively be zero

The workbook keeps such rows to preserve the shared object grid. A future application must decide whether zero-only rows remain visible as objects even when subsystem-specific data is empty.

## 10.3 Whitespace as data

At least one row contains a blank string (`" "`) in a device quantity field. In Excel this behaves as text, not as empty numeric zero, and it produces a calculation error.

This is a good example of why UI and import validation must trim whitespace.

## 10.4 Metadata duplication across sheets

The first five columns are duplicated into `ОС Расчет` and then again reflected into `СВОД`.

Because these are stored as values rather than formula references, inconsistencies already exist.

Observed example: several rows have different `Ответственные ТО` values between `ОС` and `ОС Расчет`.

### Implication

For a future application, metadata should be stored once and referenced everywhere else, not duplicated.

## 10.5 Malformed organizational value

At least one malformed `Подразделение` value exists in the current dataset, indicating spreadsheet corruption or accidental formula/text contamination.

### Implication

Reference data should be normalized and constrained to valid enumerations or master-data records.

## 10.6 Column header fragility

The Excel logic depends on exact column labels.

This is fragile because:

- device names are long
- device names include punctuation and unit suffixes
- calculations depend on exact text equality with `Нормативы_ОС`

In an application, a device catalog should use internal keys such as:

- `device_code`
- `device_name`
- `unit`
- `norm_r1`
- `norm_r2`

and the UI label should be decoupled from the calculation key.

---

## 11. Recommended conceptual model for a web application

## 11.1 Core principle

Do not model `ОС` as a spreadsheet clone only. Model it as:

- a shared object registry
- a subsystem-specific equipment inventory
- a calculation engine driven by a device normative catalog

## 11.2 Suggested entities

### `Object`
Represents the workbook-wide object/site.

Suggested fields:

- `object_id` (maps to `№`)
- `division_id` / `division_name`
- `branch_id` / `branch_name`
- `object_name` (maps to `Значение`)
- `responsible_engineer_id` or `responsible_engineer_name`
- `status`
- `notes`

### `Subsystem`
Examples:
- ОС
- ПС
- Видео
- Записи
- Ремонт
- Дорога

### `DeviceCatalog`
One row per device type.

Suggested fields:

- `device_code`
- `subsystem_code`
- `display_name`
- `unit`
- `r1_norm`
- `r2_norm`
- `is_active`

### `ObjectDeviceQuantity`
Join table between object and device.

Suggested fields:

- `object_id`
- `device_code`
- `quantity`

### `ObjectSubsystemStatus`
Needed because the current workbook stores status text inside quantity cells.

Suggested fields:

- `object_id`
- `subsystem_code`
- `status_code`
- `status_comment`

Examples of status:
- active
- closed
- demounted
- included_in_other_system
- moved
- renamed
- pending_clarification

### `WorkloadCalculation`
Derived object-level result.

Suggested fields:

- `object_id`
- `subsystem_code`
- `r1_base_minutes`
- `r1_frequency_per_year`
- `r1_annual_minutes`
- `r2_base_minutes`
- `r2_frequency_per_year`
- `r2_annual_minutes`
- `annual_total_minutes`
- `monthly_average_minutes`
- `staffing_units`

## 11.3 Why this model fits the workbook

It separates three concerns that are currently mixed together in Excel:

1. object identity
2. inventory quantities
3. status/exceptions
4. derived calculations

This will make later sheets (`ОС Расчет`, `СВОД`) much easier to reproduce reliably.

---

## 12. Recommended calculation contract for implementation

The future application should calculate ОС workload as follows.

### Inputs

Per object:

- device quantities from the ОС subsystem inventory
- normative catalog for ОС devices:
  - `r1_norm`
  - `r2_norm`

Global coefficients currently inferred from workbook:

- `r1_frequency_per_year = 10`
- `r2_frequency_per_year = 2`
- `minutes_to_hours_divisor = 60`
- `monthly_capacity_hours = 142.8`
- `uplift_factor = 1.12`

### Formula set

For each object and each ОС device:

`r1_device = quantity × r1_norm`  
`r2_device = quantity × r2_norm`

Per object:

`r1_base = sum(r1_device)`  
`r1_annual = r1_base × 10`

`r2_base = sum(r2_device)`  
`r2_annual = r2_base × 2`

`annual_total_minutes = r1_annual + r2_annual`  
`monthly_average_minutes = annual_total_minutes / 12`

`staffing_units = monthly_average_minutes / 60 / 142.8 × 1.12`

### Recommended improvement

Instead of relying on header text matching, calculations should join by `device_code`.

---

## 13. Validation rules recommended for import/UI

### 13.1 Object-level validation

- `object_id` must be unique
- `division` must come from master data
- `branch` should belong to a valid division
- `object_name` should not be blank

### 13.2 Engineer validation

- normalize engineer names
- avoid free-text duplicates caused by formatting
- allow null only if business process permits it

### 13.3 Device quantity validation

For quantity fields:

- trim whitespace
- empty = null or zero by explicit rule
- accept only numeric non-negative values
- reject status text in quantity fields

### 13.4 Status handling

If import encounters values like `закрыто`, `демонтирована`, or note text in quantity columns:

- do not force them into numeric fields
- convert them into subsystem status / note records
- optionally set the device quantity set to zero or null by explicit import rule

### 13.5 Header management

- never use UI labels as the only calculation key
- preserve mapping from legacy Excel header to stable device code

---

## 14. Known migration and reproduction risks

### 14.1 Excel row alignment is acting as an implicit key

The current workbook works partly because all sheets are aligned by row number and shared object numbering.

This is fragile. In an application, all relations should be explicit by object ID.

### 14.2 Errors propagate downstream

When `ОС` contains text in numeric fields:

- `ОС Расчет` gets `#VALUE!`
- `СВОД` inherits those errors in the `Охрана` contribution

The future application should replace this with validated states, not spreadsheet error propagation.

### 14.3 Metadata can diverge

Because metadata is duplicated into derived sheets as values, not references, a manual change can desynchronize sheets.

The application should treat object metadata as canonical in one place only.

### 14.4 Business semantics of R1/R2 need formalization

The formulas are clear, but the exact operational meaning of:

- `Р1`
- `Р2`
- `10 раз в году`
- `2 раз в году`

should be formally confirmed with domain owners and documented outside Excel.

---

## 15. Practical interpretation of sheet `ОС`

From an application-design perspective, `ОС` should be understood as:

- a subsystem-specific equipment inventory by object
- attached to a workbook-wide object registry
- feeding a normative workload calculation engine
- currently contaminated by operational status notes embedded in quantity cells

That last point is crucial: this is **not only an inventory table**. It is an operational worksheet where asset counts, object status, and human notes have been mixed together for convenience.

A successful web application should preserve the useful business meaning while separating these concerns into clean data structures.

---

## 16. Short implementation summary

If this workbook logic is reimplemented in software, the closest faithful model is:

1. Keep one canonical `Object` registry shared by all subsystems.
2. Store ОС device quantities in structured rows keyed by object and device.
3. Store statuses/comments separately from quantities.
4. Store normative coefficients in a device catalog.
5. Compute:
   - R1 base
   - R1 annual
   - R2 base
   - R2 annual
   - annual total minutes
   - monthly average minutes
   - staffing units
6. Feed the monthly ОС total into the consolidated summary as the `Охрана` component.
7. Avoid all dependencies on display labels and row position.

---

## 17. Appendix: current workbook facts captured from the file

- `ОС` table range: `A1:S2935`
- `ОС_Расчет` table range: `A1:AN2935`
- `Нормативы_ОС` table range: `A13:N15`
- `ОС` data rows: 2934
- Device columns in `ОС`: 14
- Rows with text in device columns: 137
- Additional row with whitespace-caused calculation error: 1
- Total rows producing `#VALUE!` in `ОС Расчет`: 138
- Rows with all numeric ОС quantities equal to zero: 811
- Missing `Ответственные ТО`: 442
- Known metadata mismatches between `ОС` and `ОС Расчет`: present

---

## 18. Recommended follow-up documents

The next sheet document should describe **`ОС Расчет`** explicitly as a derived calculation sheet, even though much of its logic is already captured here.

After that, the ideal order is:

1. `ПС`
2. `ПС Расчет`
3. `Видео`
4. `Видео Расчет`
5. `Записи`
6. `Записи Расчет`
7. `Ремонт`
8. `Ремонт Расчет`
9. `Дорога`
10. `СВОД`
11. `Нормативы`

This order mirrors the dependency flow from source sheets to calculation sheets to final consolidation.
