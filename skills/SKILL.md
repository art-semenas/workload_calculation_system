# Workbook Sheet Analysis Skill

## Purpose

Use this skill to analyze any sheet from the workbook `Шаблон_нагрузки_з_v_4_00.xlsx` and produce a structured, implementation-ready description that can be used as context for a future web application.

This skill is optimized for the workbook pattern already observed in the file:

- raw object/register sheets
- paired `... Расчет` calculation sheets
- normative/reference sheet (`Нормативы`)
- transport/travel sheet (`Дорога`)
- consolidated output sheet (`СВОД`)
- helper/diagnostic sheets (`Лист1`, `Лист2`)

The main goal is not just to summarize a sheet, but to explain:

1. what the sheet stores,
2. how it relates to other sheets,
3. what formulas/business rules it implements,
4. what assumptions or hidden dependencies exist,
5. how its logic should be represented in a future web app.

---

## When to use this skill

Use this skill when the user asks to:

- analyze a workbook sheet such as `ПС`, `Видео`, `Записи`, `Ремонт`, `Дорога`, `СВОД`, or `Нормативы`
- create a `.md` description of a sheet's structure and logic
- explain how a `... Расчет` sheet derives values
- identify how one sheet depends on another
- prepare implementation context for a future system replacing or reproducing Excel logic
- compare raw sheets, calculation sheets, and consolidated sheets
- identify data quality problems, formula risks, or migration risks

---

## Expected workbook architecture

### 1) Raw/input sheets

These are object-level source registers. They usually have the same first five identity columns and then business-specific quantity fields.

Observed examples:

- `ОС`
- `ПС`
- `Видео`
- `Записи`
- `Ремонт`
- `Дорога`

### 2) Calculation sheets

These usually mirror the object rows of a source sheet and transform quantities into minutes, frequencies, totals, and workload/staffing indicators.

Observed examples:

- `ОС Расчет`
- `ПС Расчет`
- `Видео Расчет`
- `Записи Расчет`
- `Ремонт Расчет`

### 3) Reference/normative sheet

Observed example:

- `Нормативы`

This sheet stores normative coefficients used by calculation sheets. It contains both:

- block-style matrix sections used by Excel `HLOOKUP`
- a more normalized list-like section further down the sheet for documentation/reference

### 4) Consolidation sheets

Observed example:

- `СВОД`

This sheet aggregates outputs from multiple calculation sheets and derives combined monthly workload and staffing.

### 5) Helper/diagnostic sheets

Observed examples:

- `Лист1`
- `Лист2`

These may contain pivots, partial summaries, broken formulas, or temporary calculations. They should still be documented, but clearly marked as helper/diagnostic unless proven otherwise.

---

## Core analysis principles

### Preserve exact original names

Always keep exact Russian sheet names and exact column header text in the description.

Do not silently translate or normalize names when documenting workbook logic.

Reason:

- the current Excel workbook often depends on exact header text
- renaming a device/work item header may break `HLOOKUP`-based logic

### Separate current Excel behavior from future-system design

For every analyzed sheet, describe both:

1. **Current workbook behavior**  
   what Excel is doing now, including formulas, table references, row alignment assumptions, and constants

2. **Recommended web-app interpretation**  
   how the same logic should be modeled in a more robust system

### Treat cross-sheet logic as first-class

Do not analyze a calculation sheet in isolation.

For every `... Расчет` sheet, always inspect:

- its paired source sheet
- `Нормативы`
- `СВОД` if the result flows there

### Distinguish data, logic, and presentation

For each sheet, explicitly separate:

- **data fields**: stored inputs or imported values
- **derived fields**: calculated from formulas
- **presentation-only fields**: formatting, labels, helper totals, diagnostic outputs
- **business rules**: recurrence frequency, staffing conversion, thresholds, conditional zero logic, etc.

---

## Workbook-specific logic patterns to watch for

### Shared object identity columns

In this workbook, many sheets use the same first five columns:

1. `№`
2. `Подразделение`
3. `Филиал`
4. `Значение`
5. `Ответственные ТО`

These behave like a repeated object identity block.

However, the workbook often does **not** perform explicit joins by these columns. Instead, it appears to rely on:

- identical row ordering across parallel sheets
- structured Excel table references using `[#This Row]`

This is a major implementation risk.

### Row-position alignment assumption

A very important rule in this workbook:

- raw sheets and their paired calculation sheets are aligned row-for-row
- `СВОД` also references other sheets by the current row context
- there is little or no visible relational join logic in formulas

When documenting, always state whether logic depends on:

- row position alignment
- exact table order
- identical object list across sheets

### Exact-header lookup dependency

Many calculation sheets use patterns like:

- `HLOOKUP(<source sheet header>, <norm table>, row_index, 0) * <source quantity>`

That means the workbook depends on exact header text matches between:

- the source sheet headers
- the relevant block in `Нормативы`

This is fragile and must be called out explicitly.

### Staffing conversion constant

Several calculation sheets and `СВОД` convert monthly minutes into staffing/load values using a pattern like:

`minutes / 60 / 142.8 * 1.12`

Document this as a workbook-level business rule, not just a formula.

Interpret it as:

- convert minutes to hours
- divide by monthly productive hours norm (`142.8`)
- apply uplift coefficient (`1.12`)

Do not assume these constants are universal truth; document them as workbook-configured parameters.

### Conditional zero logic

Some totals only include preparation/travel or final staffing calculations if the operational workload is non-zero.

Document any formula logic that effectively says:

- if all source workloads are zero, total should also be zero
- otherwise include preparation/travel/other overheads

### Embedded text statuses in quantity columns

Some raw sheets may contain text markers inside numeric columns, such as:

- `закрыто`
- `закрыт`
- notes about decommissioning, relocation, duplication, repair, etc.

This means the source sheet is not a clean typed table. Always document:

- which columns are expected numeric
- whether text comments/statuses appear inside them
- whether this should become a separate status/comment field in the future system

### Broken or helper sheets may exist

Some helper sheets may already contain formula errors such as `#VALUE!`.

Do not ignore them. Document:

- whether the sheet is core or helper
- whether current formulas appear broken
- whether the sheet should be excluded from first-phase migration

---

## Required workflow for each sheet analysis

## Step 1. Identify the sheet role

Classify the target sheet as one of:

- source/input register
- calculation sheet
- normative/reference sheet
- consolidated summary sheet
- helper/diagnostic sheet

If the role is mixed, say so clearly.

## Step 2. Capture physical structure

Describe:

- sheet name
- approximate row count
- approximate column count
- whether it is object-level, aggregated, or mixed
- header structure
- whether the sheet is a flat table or has section blocks

For source-style sheets, list:

- shared identity columns
- business columns after the identity block

For calculation sheets, split columns into:

- copied identity block
- per-item calculated columns
- intermediate totals
- periodicity/frequency columns
- monthly totals
- staffing/load columns

## Step 3. Explain the semantic meaning of columns

For each important column group, explain:

- what the field represents in business terms
- expected data type
- whether it is input or derived
- whether it is direct quantity, time, frequency, annual total, monthly average, or staffing indicator

Avoid only repeating header text. Interpret the meaning.

## Step 4. Trace dependencies

Always identify:

- upstream sheets used by this sheet
- downstream sheets that consume this sheet
- any normative/configuration source used in formulas
- any workbook-wide constants or assumptions

Describe dependencies in plain language and, when helpful, in pseudocode.

Example style:

- `ОС Расчет` takes each equipment quantity from `ОС`
- it finds R1 and R2 coefficients from the `ОС` section in `Нормативы`
- it multiplies quantity by coefficient
- it sums R1 and R2 components
- it converts annual/periodic maintenance into average monthly minutes
- the result flows into `СВОД`

## Step 5. Reconstruct the business logic

Translate formulas into human-readable rules.

Prefer logic like this:

- `per_device_R1_minutes = quantity * norm_R1`
- `per_device_R2_minutes = quantity * norm_R2`
- `R1_periodic_total = monthly_R1 * frequency`
- `average_monthly_minutes = annual_total / 12`
- `load = average_monthly_minutes / 60 / 142.8 * 1.12`

When formulas use sheet/table references, explain the business meaning rather than only quoting Excel syntax.

## Step 6. Identify data quality and modeling risks

Always look for:

- text in numeric columns
- empty responsible engineer values
- corrupted labels
- duplicate semantics under different names
- hidden soft hyphens, non-breaking spaces, or special characters in long headers
- formula dependence on exact text
- dependence on manual row order
- helper sheets with broken formulas
- mixed granularities inside the same sheet

For each risk, explain why it matters for the future application.

## Step 7. Provide future web-app interpretation

For every analyzed sheet, propose a normalized interpretation:

- what entity/table it should become
- what fields are true inputs
- what fields should be computed, not stored
- what reference dictionaries are needed
- what lookup keys should replace fragile text matching
- what process should replace cross-sheet row-position coupling

This part is essential.

---

## Output format to use

When the user asks for a structured/comprehensive analysis, use this format.

# [Sheet Name] — structure and logic

## 1. Role in workbook

Explain what the sheet is for.

## 2. Physical structure

Describe rows, columns, table pattern, and key column groups.

## 3. Field semantics

Describe each important column or column group.

## 4. Cross-sheet dependencies

List upstream and downstream relationships.

## 5. Calculation/business logic

Explain formulas as business rules or pseudocode.

## 6. Data quality and implementation risks

List workbook weaknesses and migration risks.

## 7. Recommended web-app model

Explain how this sheet should be represented in a future system.

## 8. Key takeaways

Give 3–8 concise conclusions.

---

## Special guidance by sheet type

## A. If the target is a raw/input register sheet

Examples: `ОС`, `ПС`, `Видео`, `Записи`, `Ремонт`, `Дорога`

You should focus on:

- identity columns and business columns
- what one row represents
- which columns are quantities and which are statuses/notes
- whether the sheet is a source of truth or partial input
- whether data is sparse, skewed, or noisy
- how this sheet feeds a calculation or summary sheet

For these sheets, add:

- major data distributions if relevant
- common patterns or object profiles if relevant
- whether zero-only rows or status-only rows exist

## B. If the target is a `... Расчет` sheet

Examples: `ОС Расчет`, `ПС Расчет`, `Видео Расчет`, `Записи Расчет`, `Ремонт Расчет`

You should always:

- compare with the paired source sheet
- identify the matching normative section in `Нормативы`
- explain each calculation stage
- clarify periodicity and averaging logic
- identify whether columns are R1, R2, totals, monthly averages, or staffing indicators
- note exact-header matching and row-order dependency

For these sheets, the analysis is incomplete unless it includes:

- source sheet relationship
- normative lookup mechanism
- downstream use in `СВОД` if applicable

## C. If the target is `Нормативы`

You should describe both structures:

1. **block/matrix sections** used for current Excel lookups  
   such as sections for `ПС`, `Видео`, `ОС`, `Администрирование`, and repairs

2. **normalized lookup list** further down the sheet  
   with columns such as equipment/work name, type, and R1/R2 values

Clarify:

- which part drives formulas today
- which part is more suitable for system migration
- where names are inconsistent between blocks and normalized rows

## D. If the target is `СВОД`

You should explain:

- which sheets feed which columns
- which columns are direct imports versus calculated
- how travel, preparation, maintenance, records, and repairs are combined
- how staffing is calculated
- whether zero-work rows suppress overheads
- whether this is the workbook's main final output

## E. If the target is a helper sheet like `Лист1` or `Лист2`

You should determine whether it is:

- a pivot-like report
- temporary analysis
- broken experiment
- shadow output not safe to use

Clearly mark uncertainty and do not overstate importance.

---

## Workbook-specific mapping hints

These patterns have already been observed and should guide future analysis:

- `ОС` feeds `ОС Расчет`
- `ПС` feeds `ПС Расчет`
- `Видео` feeds `Видео Расчет`
- `Записи` feeds `Записи Расчет`
- `Ремонт` feeds `Ремонт Расчет`
- `Дорога` feeds `СВОД`
- all major `... Расчет` outputs feed `СВОД`
- `Нормативы` supplies coefficients to multiple calculation sheets

The workbook appears to represent per-object monthly workload assembled from:

- technical maintenance of security systems
- technical maintenance of fire systems
- video system maintenance
- video archive / records handling
- repair work
- travel time
- preparation/finalization time

---

## Preferred implementation recommendations to include
