# `Шаблон нагрузки_з_v_4_00.xlsx` — Data Extraction Specification

Source file: `docs/Шаблон нагрузки_з_v_4_00.xlsx` (6.6 MB, 15 sheets, last modified 2023-12-25)

This document catalogues **what data exists in the source workbook and how it maps into the
application**. It is an extraction spec, not a formula spec — the calculation contract lives in
`docs/TOR_Workload_WebApp.md` §4–§6. Where the workbook and the TOR disagree, §8 records the
difference; the workbook is the original artefact and is stated as-is.

All figures below were read directly from the file (formulas and cached values both).

---

## 1. Workbook shape

15 sheets, organised as 6 subsystems in **source → calculation** pairs plus one consolidation sheet
and one normative sheet.

| Sheet | Excel table | Range | Cols | Role |
|---|---|---|---|---|
| `ОС` | `ОС` | `A1:S2935` | 19 | Security alarm inventory (input) |
| `ОС Расчет` | `ОС_Расчет` | `A1:AN2935` | 40 | ОС workload (derived) |
| `ПС` | `ПС` | `A1:W2935` | 23 | Fire alarm inventory (input) |
| `ПС Расчет` | `ПС_Расчет` | `A1:AU2935` | 47 | ПС workload (derived) |
| `Видео` | `Видео` | `A1:H2935` | 8 | CCTV inventory (input) |
| `Видео Расчет` | `Видео_Расчет` | `A1:R2935` | 18 | CCTV workload (derived) |
| `Записи` | `Записи` | `A1:J2935` | 10 | Records/admin task counts (input) |
| `Записи Расчет` | `Записи_Расчет` | `A1:M2935` | 13 | Records workload (derived) |
| `Ремонт` | `Ремонт` | `A1:AE2935` | 31 | Repair counts (input) |
| `Ремонт Расчет` | `Ремонт_Расчет` | `A1:AI2935` | 35 | Repair workload (derived) |
| `Дорога` | `Дорога` | `A1:I2935` | 9 | Travel time per object (input) |
| `СВОД` | `СВОД` | `A1:S2936` | 19 | Consolidated per-object FTE (derived) |
| `Нормативы` | 5 tables + catalog | `A1:Y77` | 25 | All normative coefficients |
| `Лист1` | — | `A1:B62` | 2 | Stale pivot table (branch → FTE) |
| `Лист2` | — | `A1:A1` | 1 | Empty |

Every operational sheet has **2934 data rows**, row-aligned by position and by `№`. There are no
defined names; all cross-sheet references use structured table references, so row *position* is the
implicit join key. This is the single most important thing to replace with explicit object IDs.

---

## 2. Extraction map — summary

| # | Entity | Source | Volume | Confidence |
|---|---|---|---|---|
| 1 | Objects (registry) | `ОС!A:E` (mirrored in all sheets) | 2 934 | High |
| 2 | Divisions | `ОС!B` distinct | 6 valid (+1 corrupt) | High |
| 3 | Branches | `ОС!C` distinct | 135 | High |
| 4 | Engineers | `ОС!E` distinct | 123 (442 objects unassigned) | High |
| 5 | Device types + R1/R2 norms | `Нормативы_ОС`, `Нормативы_ПС`, `Нормативы_Видео` | 35 (system, device) pairs | High |
| 6 | Repair types + minutes | `Нормативы_Ремонт` | 25 | High |
| 7 | Records task types + minutes | `Нормативы_Админ` | 5 | Medium — conflicts, see §8.3 |
| 8 | Object → device quantities | `ОС!F:S`, `ПС!F:W`, `Видео!F:H` | 20 215 non-zero cells | High |
| 9 | Object → repair counts | `Ремонт!F:AD` | 4 238 non-zero cells | High |
| 10 | Object → records counts | `Записи!F:J` | 282 non-zero cells | High |
| 11 | Object travel | `Дорога!G:H` | 2 824 distances / 2 844 times | High |
| 12 | Calculation constants | formulas + `СВОД!F` | 14 values | High |
| 13 | Object status / lifecycle notes | text embedded in quantity cells | 138 objects affected | Medium — needs mapping |
| 14 | Expected results (golden fixtures) | all `* Расчет` + `СВОД` cached values | 2 780 complete rows | High |

**Total importable facts: ≈ 27 700 non-zero data points across 2 934 objects.**

---

## 3. Master / reference data

### 3.1 Object registry — 2 934 rows

Columns `A:E` are identical across all 12 operational sheets (this is the shared registry):

| Column | Field | Notes |
|---|---|---|
| `A` `№` | object number | 1…2934, unique, no gaps, no nulls |
| `B` `Подразделение` | division | 6 distinct + 1 corrupted value |
| `C` `Филиал` | branch | 135 distinct |
| `D` `Значение` | object name / address | 2 932 distinct — 2 duplicate names |
| `E` `Ответственные ТО` | responsible engineer | 124 distinct strings → **123 people**, 442 nulls |

Division distribution:

| Division | Objects | Branches |
|---|---:|---:|
| Головной офис | 1 040 | 37 |
| Брестское областное управление №100 | 521 | 16 |
| Гродненское областное управление №400 | 348 | 18 |
| Могилевское областное управление №700 | 345 | 21 |
| Гомельское областное управление №300 | 343 | 21 |
| Витебское областное управление №200 | 336 | 22 |
| `Го+B1830:D1830ловной офис` (corrupt) | 1 | 1 |

Notes for import:

- **Минское областное управление №500 is a branch, not a division** — it appears in `Филиал` (35
  objects) under `Головной офис`. Division count is 6, not 7.
- All 135 branch names are **globally unique** — no name spans two divisions. (An earlier read of
  this file suggested `Центр банковских услуг №623` appeared under two divisions; that was an
  artefact of the row-1830 corruption below being counted as a seventh division. Once repaired, the
  duplicate disappears.) Resolving branches by `(division, name)` is still the safer key, but it is
  a defensive choice, not a requirement of the data.
- The corrupt value in row 1830 (`Го+B1830:D1830ловной офис`) is a spreadsheet formula-paste
  accident. Row 1834 has the same corruption in `Значение`. Both are correct on the `Дорога` sheet —
  use `Дорога` as the repair source for those two cells.
- Engineer strings are uniformly `Имя И Фамилия/BELARUSBANK/BY` — every one of the 124 distinct
  values has exactly 3 name tokens and the `/BELARUSBANK/BY` suffix, so a strict parser is safe.
  Split into `first/middle-initial/last` plus the org suffix. Three anomalies to handle:
  - `лександр Н Соловей` (1 object) is `Александр Н Соловей` (101 objects) with the leading `А`
    dropped — same person. Merge, giving **123 real engineers**.
  - `Сергей_Ца А Широков` (30 objects) contains an underscore artefact in the given name. Keep the
    display name verbatim; derive the login from the part before the underscore.
  - `Сергей Л Карпук` (1) and `Сергей А Карпук` (10) are two different people who collide on
    first+last. Disambiguate with the middle initial.

### 3.2 Cross-sheet drift

Columns `A:E` are stored as **values, not formulas**, on the derived sheets, and they have already
diverged:

| Sheet | Engineer mismatches vs `ОС` | Other |
|---|---:|---|
| `ОС Расчет`, `ПС Расчет`, `Видео Расчет`, `Записи Расчет`, `Ремонт Расчет`, `СВОД`, `Видео`, `Записи`, `Ремонт` | 4–5 each | 1–2 name/division |
| `Дорога` | 2 (opposite direction — `Дорога` disagrees with all others) | — |

Rows 11, 264, 267 assign the object to `Олег А Пахомов` on `ОС` and to `Александр Н Соловей`
everywhere else. Row 277 is inverted. **Pick `ОС` as canonical for the import and log the conflicts**
— they are genuine data errors requiring a business decision, not a merge rule.

**`СВОД!G` is overwritten on 5 rows.** The column should be `=Дорога[[#This Row],[Время в пути в
обе стороны в МИНУТАХ]]` throughout, but rows 824, 827, 828, 829 and 832 hold a hardcoded literal
`200` while `Дорога!I` is `0` for all five (one-way time is also `0`). That is 1 000 minutes of
travel that exists only in `СВОД`:

```
SUM(Дорога!I) = 283 601      SUM(СВОД!G) = 284 601      diff = 1 000
```

Import from `Дорога`, which is the source of truth for travel. The consequence is that the workbook's
own `СВОД!Q` total is 0.13 FTE higher than a faithful recomputation — see §8.1, where this fully
accounts for the control gap.

### 3.3 Device catalog — 35 (system, device) pairs

Source: `Нормативы!A13:N15` (ОС), `A2:R4` (ПС), `A8:C10` (Видео). Row 1 = name, row 2 = R1 minutes
per unit, row 3 = R2 minutes per unit. These are the values the workbook's formulas actually use.

**ОС — 14 devices**

| Device | R1 | R2 |
|---|---:|---:|
| Galaxy 512 (Galaxy Dimension GD-520) | 7 | 20 |
| Maestro (ППК ОП Maestro-1600) | 5 | 10 |
| серий А6, Аларм | 5 | 8 |
| А16-512 | 5 | 10 |
| Выносная панель управления ВПУ–А-16 | 2 | 4.5 |
| Устройство доступа | 1 | 4 |
| Шлейфы сигнализации | 0.2 | 0.7 |
| Каналы считывания | 0.02 | 1.5 |
| Извещатели, оповещатели | 0.7 | 3 |
| Galaxy 512 (контроллер АСПС и СО) | 15 | 20 |
| Расширитель | 0.3 | 3 |
| Контроллер системы | 3 | 9.5 |
| Системный блок ПЦН | 10 | 40 |
| ББП-20, ББП-3/12 (БРП 2401) | 0.03 | 3 |

**ПС — 18 devices**

| Device | R1 | R2 |
|---|---:|---:|
| серий А6, Аларм | 5 | 12 |
| А16-512 | 6 | 13 |
| СПИ УОО Молния | 2 | 3 |
| АМ200-Notifier | 5 | 10 |
| Шлейфы сигнализации | 0.2 | 0.7 |
| Каналы считывания | 0.02 | 1.5 |
| Извещатели, оповещатели | 0.3 | 4 |
| Таблички | 0.3 | 2 |
| Galaxy 512 (контроллер АСПС и СО) | 15 | 20 |
| Оракул | 3 | 15 |
| Танго ПУ/БП | 1 | 17 |
| Танго ПУ/ЗК | 1 | 19 |
| Расширитель | 0.3 | 3 |
| Адресный модуль | 0.3 | 1.8 |
| Адресный шлейфно-релейный модуль | 0.3 | 3 |
| Усилитель линии УЛТ | 0.03 | 1 |
| Адресные извещатели | 0.2 | 2.3 |
| Колонки | 0.4 | 3 |

**Видео — 3 devices**

| Device | R1 | R2 |
|---|---:|---:|
| Видеокамеры | 1.5 | 1.5 |
| Микрофоны | 0.5 | 0.5 |
| Системный блок (видео сервер) | 10 | 40 |

Five device names appear in **both ОС and ПС with different coefficients** (`серий А6, Аларм`,
`А16-512`, `Шлейфы сигнализации`, `Каналы считывания`, `Извещатели, оповещатели`,
`Galaxy 512 (контроллер АСПС и СО)`, `Расширитель`). The catalog key must therefore be
`(system, device_code)` — device name alone is not unique.

The workbook resolves norms by `HLOOKUP` on **exact header text**. Renaming any column silently
breaks the calculation. The application must key on a stable `device_code` and treat the Russian
label as display-only.

### 3.4 Repair type catalog — 25 types

Source: `Нормативы!A23:Y24`. Minutes per operation:

| # | Repair type | Min | Class |
|---:|---|---:|---|
| 1 | Замена приемно-контрольного прибора серии А6 ОС | 150 | work |
| 2 | Замена приемно-контрольного прибора серии А6 ПС | 150 | work |
| 3 | Замена извещателя охранного оптико-электронного | 15 | work |
| 4 | Замена извещателя пожарного дымового | 12 | work |
| 5 | Замена шунтирующих и оконечного резисторов шлейфа сигнализации ОС | 35 | work |
| 6 | Замена шунтирующих и оконечного резисторов шлейфа сигнализации ПС | 35 | work |
| 7 | Замена блока бесперебойного питания ОС | 30 | work |
| 8 | Замена блока бесперебойного питания ПС | 30 | work |
| 9 | Замена аккумулятора ОС | 5 | work |
| 10 | Замена аккумулятора ПС | 5 | work |
| 11 | Замена блока питания видеосервера | 20 | work |
| 12 | Замена винчестера видеосервера | 10 | work |
| 13 | Замена основных составных частей видеосервера в комплекте | 30 | work |
| 14 | Переустановка программного обеспечения на видеосервере | 90 | work |
| 15 | Восстановление сигнала IP камеры | 35 | work |
| 16 | Восстановление сигнала аналоговой камеры | 20 | work |
| 17 | Акт о выполненных работах ОС | 7 | act |
| 18 | Дефектный акт (с учетом установления причин неисправности) ОС | 60 | act |
| 19 | Акт на списание ТМЦ из подотчета ОС | 20 | act |
| 20 | Акт о выполненных работах ПС | 7 | act |
| 21 | Дефектный акт (с учетом установления причин неисправности) ПС | 60 | act |
| 22 | Акт на списание ТМЦ из подотчета ПС | 20 | act |
| 23 | Акт о выполненных работах Видео | 7 | act |
| 24 | Дефектный акт (с учетом установления причин неисправности) Видео | 60 | act |
| 25 | Акт на списание ТМЦ из подотчета Видео | 20 | act |

**The work/act split is load-bearing and is not marked anywhere in the workbook** — it is encoded
only in two different formula ranges:

- `Ремонт!AE` (`К-во ремонтов`) covers **columns F:U — the 16 work types only**.
- `Ремонт Расчет!AE` (`Все работы за 6 мес.`) covers **columns F:AD — all 25 types**.

So acts contribute minutes but never drive the travel/PZV threshold. The catalog needs an
`is_document`/`class` flag to reproduce this. `Нормативы_Ремонт` also lists types in a different
order than the `Ремонт` sheet (ОС/ПС pairs swapped in positions 5–10) — harmless, because lookup is
by name, but it means column order carries no meaning and must not be relied on.

### 3.5 Records/admin task catalog — 5 types

Source: `Нормативы!A19:E20` (`Нормативы_Админ`) — the values the formulas actually use:

| Task | Min (live table) | Objects with data | Max qty |
|---|---:|---:|---:|
| Запросы в связи с отсутствием (нарушением) доступа к самостоятельному просмотру записей | 60 | 54 | 2 375 |
| Запросы в связи с проведением мониторинга записей | 180 | 149 | 512 |
| Запросы по предоставлению записей без выезда на объекты банка | 20 | 62 | 21 |
| Контроль процесса резервного копирования одной СХД | `=0.15*21` → **3.15** | 3 | 2 645 |
| Администрирование систем безопасности филиала | 60 | 14 | 163 |

Note the fourth value is a live formula `0.15 × 21` (0.15 min/day × 21 working days), not a literal.
See §8.3 — the application currently uses different numbers for two of these five.

### 3.6 Stale reference catalog (`Таблица3`, `Нормативы!A37:D77`)

A 40-row table `(наименование оборудования, тип оборудования, время за ед р1, время за ед р2)`.
It looks like a normalised device catalog and is tempting as an import source, **but no formula
references it** and it disagrees with the live lookup tables in 7 places:

| System | Device | Live (used) R1 | `Таблица3` R1 |
|---|---|---:|---:|
| ОС | Выносная панель управления ВПУ–А-16 | 2 | 4.5 |
| ОС | Шлейфы сигнализации | 0.2 | 0.06 |
| ОС | Расширитель | 0.3 | 0.03 |
| ПС | Шлейфы сигнализации | 0.2 | 0.06 |
| ПС | Расширитель | 0.3 | 0.03 |
| ПС | Адресный модуль | 0.3 | 0.03 |
| ПС | Адресный шлейфно-релейный модуль | 0.3 | 0.03 |

It also omits all three Видео devices and renames `Адресные извещатели` → `Извещатели`.

**Do not import `Таблица3`.** Import `Нормативы_ОС` / `_ПС` / `_Видео` / `_Ремонт` / `_Админ`.
Verified: the reference object's cached R1 of 2.4 min for 12 shleyfs confirms 0.2 is the live value
(12 × 0.2 = 2.4; 12 × 0.06 would be 0.72).

---

## 4. Transactional data

### 4.1 Device quantities per object

| Sheet | Columns | Devices | Non-zero cells | Objects with equipment | All-zero objects |
|---|---|---:|---:|---:|---:|
| `ОС` | `F:S` | 14 | 10 889 | 1 992 | 811 |
| `ПС` | `F:W` | 18 | 5 309 | 1 025 | 1 809 |
| `Видео` | `F:H` | 3 | 4 017 | 1 435 | 1 409 |

All quantities are non-negative integers where numeric. Zero-only rows are retained purely to keep
the row grid aligned across sheets — in the application they simply mean "object has no equipment in
this system" and need no special handling.

### 4.2 Repair counts per object

`Ремонт!F:AD` — 25 columns × 2 934 rows, 4 238 non-zero cells, 1 118 objects with activity
(1 753 all-zero). Counts cover one 6-month planning period.

`К-во ремонтов` distribution (from cached `Ремонт!AE`): 1 831 objects at 0, max 105, sum 6 761.
Band split under the workbook's own threshold: 2 567 objects ≤ 5, 212 in (5, 10], 155 > 10.

### 4.3 Records/admin counts per object

`Записи!F:J` — 5 columns, 282 non-zero cells, 245 objects with activity (2 644 all-zero). Highly
sparse: this is the smallest dataset in the workbook but produces the largest single per-object
workload (max 34 630 min/month, from `Контроль резервного копирования × 2 645`).

### 4.4 Travel data

`Дорога` sheet:

| Column | Field | Coverage | Range |
|---|---|---|---|
| `F` `Транспорт` | transport mode | **empty** — 2 922 nulls, 12 `закрыто` | — |
| `G` `Расстояние (км.)` | distance | 2 824 numeric, 6 null, 104 text | 0 – 186 km, 303 distinct |
| `H` `Время в пути (мин.)` | one-way time | 2 844 numeric, 6 null, 84 text | 0 – 900 min |
| `I` `Время в пути в обе стороны` | round trip | formula `= H × 2` | 0 – 1 800 min |

`Транспорт` carries no data at all — drop it or treat as a future field. Round-trip is a pure
derived column (verified: 0 rows where `I ≠ 2 × H`), which matches the TOR rule that
`round_trip_min` is server-computed and never user-editable.

One text value is worth noting: `130 (260)` appears 4 times in the one-way column — someone typed
the one-way and round-trip together. These become `#VALUE!` downstream.

---

## 5. Calculation constants to extract into `WorkloadConfig`

All of these are hardcoded inside formulas or as a literal column; none live in a settings table.

| Constant | Value | Where found | Existing config key |
|---|---:|---|---|
| ОС R1 visits/year | 10 | `ОС Расчет!U` `= T × 10` | `os-r1-visits-per-year` |
| ОС R2 visits/year | 2 | `ОС Расчет!AK` `= AJ × 2` | `os-r2-visits-per-year` |
| ПС R1 visits/year | 8 | `ПС Расчет!Y` `= X × 8` | `ps-r1-visits-per-year` |
| ПС R2 visits/year | 4 | `ПС Расчет!AS` `= AR × 4` | `ps-r2-visits-per-year` |
| Видео R1 visits/year | 10 | `Видео Расчет!J` | `video-r1-visits-per-year` |
| Видео R2 visits/year | 2 | `Видео Расчет!O` | `video-r2-visits-per-year` |
| Months per year | 12 | `… ИТОГО / 12` | (implicit) |
| Repair productive months | **5** | `Ремонт Расчет!AF = AE / 5` | `repair-productive-months` |
| Records divisor | **5** | `Записи Расчет!L = K / 5` | see §8.2 |
| Repair travel zero threshold | 5 | `IF(kvo <= 5, 0, …)` | `repair-travel-zero-threshold` |
| Repair travel cap | 10 | `IF(kvo <= 10, kvo, 10)` | `repair-travel-cap` |
| PZV minutes | 20 | `СВОД!F` — literal 20 in all 2 934 rows | `pzv-minutes` |
| Monthly hours fund | 142.8 | `/60/142.8*1.12` | `monthly-hours-fund` |
| Absence coefficient | 1.12 | `/60/142.8*1.12` | `absence-coefficient` |

`СВОД!F` is a constant column, never varying — so PZV is genuinely global config, not per-object
data. Good news for the data model.

The header on `Ремонт Расчет!AG` claims *"макс кол-во выездов за 6 мес равно 12"* while the formula
caps at **10**. The formula is authoritative; the header text is stale.

---

## 6. Derived data — use as test fixtures, not as import

Do not import the `* Расчет` and `СВОД` columns as data; the engine must reproduce them. They are,
however, an excellent regression corpus: **2 780 objects have a complete error-free calculation
chain** end to end.

Recommended fixtures:

| Fixture | Source | Value |
|---|---|---|
| Reference object, workbook value | `СВОД!Q2` — Архив г. Брест, ул. Московская, 202Д | `0.032326797385620915` |
| Same object, no-travel variant | `СВОД!N2` | `0.023960784313725492` |
| ОС subsystem FTE | `ОС Расчет!AN2` | `0.0053180827886710235` |
| Grand total FTE (with travel) | `SUM(СВОД!Q)` over clean rows | `101.974896` |
| Grand total FTE (no travel) | `SUM(СВОД!N)` | `90.765066` |
| ОС total monthly minutes | `SUM(ОС Расчет!AM)` | `103 368.066667` |
| ПС total monthly minutes | `SUM(ПС Расчет!AU)` | `80 229.083333` |
| Видео total monthly minutes | `SUM(Видео Расчет!Q)` | `42 949.5` |
| Записи total monthly minutes | `SUM(Записи Расчет!L)` | `102 228.87` |
| Ремонт total monthly (no travel) | `SUM(Ремонт Расчет!AF)` | `53 017.6` |

> **These are the workbook's values, not the engine's expected output.** After the §8 decisions the
> engine deliberately diverges: ПС gains R1 (§8.4), records use the /5 divisor and the corrected
> normatives (§8.2, §8.3), and repair bands follow the SUM reading (§8.1). The reference object's
> expected `итого` is **0.032448**, not the `0.032327` in this table. Use these figures to
> *understand* the source, not as assertions.

`СВОД!Q2936` contains a stray `2.3879422657952074` inside the table range with no other cell on
that row — junk, not a total. Ignore it. `Лист1` is a stale pivot whose total (105.93) no longer
matches the live `СВОД` sum (101.97); ignore it too.

The zero-guard behaviour (TOR C-39) is visible in `СВОД!M` and `!P`:
`IF(SUM(subsystem columns) = 0, 0, SUM(including PZV and travel))` — PZV and travel alone never
create a phantom FTE. 154 objects hit this guard path in the source data.

---

## 7. Data quality — what the importer must handle

### 7.1 Status text inside numeric columns

The single biggest issue. Quantity columns contain lifecycle notes, which cascade into `#VALUE!`:

| Sheet | Text cells | Rows affected |
|---|---:|---:|
| `ОС` | 1 410 | 138 |
| `ПС` | 1 411 | 101 |
| `Видео` | 238 | 94 |
| `Записи` | 209 | 45 |
| `Ремонт` | 1 244 | 64 |
| `Дорога` | 188 | ~104 |

Downstream damage in `СВОД`: 154 of 2 934 objects (5.2%) produce `#VALUE!` in the final headcount
columns. The entire error volume traces back to text in source quantity cells.

Distinct markers, normalised into proposed status codes:

| Raw values | Count | Proposed `status_code` |
|---|---:|---|
| `закрыто`, `закрыт`, `Закрыто`, `Закрыт`, `ЗАКРЫТ`, `«закрыт»`, `закрыты`, `закрыта`, ` закрыто`, `зпакрыто`, `закрыто0`, `зарыт` | ~3 400 cells | `CLOSED` |
| `«закрыт на ремонт»` | 32 | `CLOSED_FOR_REPAIR` |
| `приостановлено` | 3 | `SUSPENDED` |
| `демонтирована` | 2 | `DECOMMISSIONED` |
| `ДО`, ` ДО МВД РБ` | 123 | `TRANSFERRED_EXTERNAL` |
| `в составе ОС отделения` | 6 | `MERGED_INTO_PARENT` |
| `дубль 127/1227`, `дубль Пост охраны`, `указано дважды`, `убрать, указано дважды` | ~30 | `DUPLICATE` |
| `перемещен на …` (3 distinct addresses) | 3 | `RELOCATED` + note |
| `вместо "отделение 413/4083" указать "ЦБУ № 413"`, `Переименовать в здание ЦБУ № 413` | 2 | `RENAME_PENDING` + note |
| `на месте` (Дорога only) | 7 | travel = 0, not a status |
| `4 (включая контрол центр и подменный видеосервер)`, `закрыто / 7`, `130 (260)` | 7 | manual review — value + comment |
| `" "` (single space) | 1 | whitespace, trim to null |

Import rule: **never coerce these into quantities.** Parse to `(object_id, system, status_code,
comment)` and set the quantity to 0 or null by explicit policy. Note that `на месте` in `Дорога`
means "on site, no travel" — that is a legitimate 0, not a status.

Note the counts above are *cell* counts; a single closed object typically carries the marker in
every one of its device columns, which is why 138 ОС objects produce 1 410 text cells.

### 7.2 Other issues

- **Corrupt cells**: 2 (`ОС!B1830`, `ОС!D1834`) — formula-range text pasted into data. Repairable
  from `Дорога`.
- **Duplicate object names**: 2 (`14033 г.Барановичи ул.Войкова 7 Магазин "Полет"`,
  `Отделение №511/325 г.Минск пр. ПАРТИЗАНСКИЙ, 26 `). Name is not a natural key.
- **Trailing whitespace** in object names is common (`… ПАРТИЗАНСКИЙ, 26 `). Trim on import.
- **Unassigned objects**: 442 of 2 934 (15%) have no engineer. The import needs an explicit policy —
  the TOR's placeholder-account rule (C-31) covers this.
- **Non-breaking soft hyphens** (`U+00AD`) are embedded in the `Записи` and `Нормативы_Админ`
  headers (`наруше­нием`, `монито­ринга`). Since Excel matches these by exact text, any hand-typed
  replacement will silently fail the lookup. Strip them when deriving codes.

---

## 8. Where the workbook disagrees with the current implementation

Four differences found between this file and `docs/TOR_Workload_WebApp.md` / the backend config.
Listed most to least material. All are stated factually — deciding which side is right is a
business call, not a code call.

### 8.1 `К-во ремонтов` is a SUM in the workbook, a COUNT in the TOR — **RESOLVED: SUM**

> **Decision (2026-08-13): the workbook is authoritative. `kvo` = SUM of quantities over work types.**
> Implemented in TOR v2.25 — `repair_types.is_document` added (changeset `v1.0.7`),
> `RepairCalculationHelper` switched to SUM over non-document types, `CONTRIBUTING.md` and
> `docs/impl/calculation-engine.md` updated, `RepairCalculationTest` extended with a
> reference-object case anchored to the workbook's own `Ремонт Расчет!AF = 72.2` / `!AI = 136.2`.
> The 8 threshold-band cases were unaffected — they use `count = 1` per type, where SUM and COUNT
> coincide. Rationale and impact below.

`Ремонт!AE` is literally:

```
=SUM(Ремонт[[#This Row],[Замена приемно-контрольного прибора серии А6 ОС]:[Восстановление сигнала аналоговой камеры]])
```

Tested all four candidate readings against the 2 934 cached values:

| Reading | Matches |
|---|---|
| `SUM(quantities over the 16 work types F:U)` | **2 934 / 2 934 (100%)** |
| `SUM(quantities over all 25 types F:AD)` | 2 497 (85.1%) |
| `COUNT(work types with qty > 0)` | 2 322 (79.1%) |
| `COUNT(all 25 types with qty > 0)` | 2 228 (75.9%) |

TOR §4.5 / §6.6 and `CONTRIBUTING.md` both specify COUNT ("never the sum of quantities"), and TOR
v2.6's changelog claims *"Verified against all non-zero repair rows in source XLSX: zero
mismatches."*

That verification passed on a coincidence. For the reference object (row 2):

```
work types:   извещатель дымовой ×1, резисторы ОС ×3, резисторы ПС ×3, аккумулятор ОС ×1
acts:         акт ОС ×1, дефектный акт ОС ×1, акт ПС ×1, дефектный акт ПС ×1

SUM(works)        = 8    ← what the cell contains
COUNT(works)      = 4
COUNT(all 25)     = 8    ← what the TOR's worked example counts
```

Both routes give 8 for this one object, which is exactly the object the TOR used to verify. Across
the full dataset the two readings diverge on 612 rows, and **317 objects (10.8%) land in a different
travel band**, changing `repair_travel`, `repair_pzv`, and the final FTE. Examples: row 3
(`SUM=17 → 10 trips` vs `COUNT=5 → 0 trips`), row 39 (`SUM=4 → 0 trips` vs `COUNT=6 → 6 trips`).

PAC-01 cannot detect this — it is the one object where both agree.

**FTE impact.** Every object's final headcount recomputed from the workbook's own cached inputs,
varying only the `kvo` reading (2 783 objects with a fully numeric input chain):

| Reading | Total FTE | Δ vs SUM | Effective trips per 6 mo |
|---|---:|---:|---:|
| `SUM(works F:U)` | **102.0520** | — | 3 101 |
| `COUNT(all F:AD)` | 98.0210 | −3.95% | 1 967 |
| `COUNT(works F:U)` | 94.4142 | −7.48% | 954 |

Control: the same model reproduces the workbook's cached `SUM(СВОД!Q)` to within 0.13 FTE, and that
residual is fully explained by the 5 hardcoded `СВОД!G` cells documented in §3.2. Of the 314 objects
that change band, COUNT gives *less* travel on 257 and *more* on 57 — it is not a uniform shift.

**Why SUM.** Three independent reasons:

1. It is what the source computes — 100% of 2 934 cached values, against 75.9% for the TOR reading.
2. `К-во ремонтов` means "number of repairs". Ten resistor replacements are ten repair operations.
3. The travel column header reads *"Дорога на ремонты… (макс кол-во выездов за 6 мес равно 12)"* —
   the value is a **trip** estimate, and the formula caps it at 10. A cap only makes sense against a
   quantity that can grow large; under COUNT the value can never exceed 25, and in practice 954
   trips across the whole estate is implausibly low for 1 118 objects with repair activity.

The one thing COUNT gets right is that acts should not drive trips — and the workbook agrees, which
is why `Ремонт!AE` spans `F:U` and stops before the act columns. That distinction is preserved via
`repair_types.is_document` rather than by switching to a count.

### 8.2 Records monthly divisor: workbook uses 5, implementation uses 6 — **RESOLVED: 5**

> **Decision (2026-08-13): the workbook is authoritative. Records divide by productive months (5).**
> Implemented in TOR v2.26 — `RecordsCalculationHelper` switched to `config.getProductiveMonths()`.
> The config key was renamed `REPAIR_PRODUCTIVE_MONTHS` → `PRODUCTIVE_MONTHS`
> (env `WORKLOAD_CONFIG_PRODUCTIVE_MONTHS`) because it now governs records as well as repairs;
> `PLANNING_PERIOD_MONTHS` stays at 6 as the period length and is no longer a divisor anywhere.
> **This is a breaking config change** for any deployment that sets the old variable.
> `RecordsCalculationTest` and `CalculationServiceTest.recordsOnlyTest` were updated to the /5 basis.

```
Записи Расчет!L  =  [Итого записей за 6 мес, мин] / 5      ← verified on all 245 non-zero rows
```

`RecordsCalculationHelper.java:39` divides by `config.getPlanningPeriodMonths()` (configured to 6 in
`docker-compose.poc.yml`), per TOR §6.5. The repair path already uses 5 via
`repair-productive-months`, matching `Ремонт Расчет!AF = AE / 5`.

The workbook applies the same "5 productive months out of 6" reasoning to both records and repairs.
As configured, records monthly minutes come out ~16.7% below the workbook. The reference object has
zero records, so again PAC-01 does not catch it.

Records contribute 102 229 min/month across the estate — comparable to ОС (103 368) and larger than
ПС (80 229) — so a 16.7% shortfall on that component is material, not a rounding concern.

The distinction the rename makes explicit: `PLANNING_PERIOD_MONTHS` (6) is **how long a period is** —
it defines which 6 months a repair or records quantity belongs to. `PRODUCTIVE_MONTHS` (5) is **how
many months of engineer time that quantity is spread over**. They are different quantities that
happened to be conflated for records only.

### 8.3 Two records normatives taken from the stale catalog — **RESOLVED: use the live table**

> **Decision (2026-08-13): `Нормативы_Админ` is authoritative.** Implemented in TOR v2.27 —
> `RECORDS_FOOTAGE_MINUTES` 180 → 20, `RECORDS_BACKUP_MINUTES` 120 → 3.15, and
> `recordsBackupMinutes` widened `Integer` → `BigDecimal` because 3.15 is fractional.
> Config defaults updated in `docker-compose.poc.yml`, `.env`, `.env.example`,
> `application-test.yml`.

| Task | `Нормативы_Админ` (live, used by formulas) | `Таблица3` (unused) | App config |
|---|---:|---:|---:|
| Запросы по предоставлению записей без выезда | **20** | 180 | `RECORDS_FOOTAGE_MINUTES=180` |
| Контроль процесса резервного копирования | **3.15** (`=0.15*21`) | 120 | `RECORDS_BACKUP_MINUTES=120` |

The other three (60 / 180 / 60) agree. The two mismatched values were taken from `Таблица3` — the
catalog no formula reads (§3.6). The backup task in particular is off by a factor of ~38, and one
object has a count of 2 645 for it.

**Proof by control.** Recomputing all 2 887 numeric `Записи` rows:

| Task | Total qty | Live minutes | Catalog minutes |
|---|---:|---:|---:|
| доступ | 2 501 | 150 060 | 150 060 |
| мониторинг | 1 841 | 331 380 | 331 380 |
| предоставление | 336 | 6 720 | 60 480 |
| резервное копирование | 2 649 | 8 344.35 | 317 880 |
| администрирование | 226 | 13 560 | 13 560 |
| **Total** | | **510 064.35** | 873 360.00 |

The workbook's cached `SUM(Записи Расчет!K)` is **510 064.35** — the live normatives reproduce it to
`0.0000`, the catalog values overshoot by 363 296 min/period ≈ **9.50 FTE**.

**Semantics of the backup normative.** Its header alone carries the suffix `(за 21 рабочий день)`,
and the value is the live formula `=0.15*21`. So it is 0.15 min/day of backup monitoring over a
21-working-day month — a **per storage system per month** rate, not per request like the other four.
That is why 3.15 and 120 are not comparable as "the same number measured differently".

**Data-quality flag, not resolved here.** Only 3 objects have backup counts: two at `2`, and row 1378
(Минское ОУ, Операционная служба) at **2 645**. Given the other two, 2 645 looks like a data-entry
error rather than 2 645 storage systems. Under the live normative it costs 8 332 min/period; under
the catalog value it would have been 317 400 min ≈ 6 full-time engineers for one object. Worth
confirming with the data owner when the `Записи` seed is loaded (import step 9).

### 8.4 `ПС Расчет!AT` omits R1 entirely — **RESOLVED: engine is correct, workbook is defective**

> **Decision (2026-08-13): the engine stays additive; the workbook is recorded as defective.**
> No calculation change. A regression test `CalculationServiceTest.psMonthlyAvg_includesR1_notJustR2`
> now pins ПС to `(Р1×8 + Р2×4)/12` and asserts the result is strictly greater than the workbook's
> `Р2×5/12`, so any future "fix" toward the spreadsheet fails loudly.
>
> **Consequence — PAC-01's reference value changed.** The old value `0.032327` was calibrated to
> the defective ПС total. See the sub-section below.

```
ПС Расчет!AT  =  SUM(ПС_Расчет[[#This Row],[Р2 за мес]:[Р2 за 4 раз в году]])
```

That range is `AR:AS` = `Р2 за мес + Р2 за 4 раз в году` = `Р2 × 5`. The R1 columns (`X`, `Y`) are
computed and then **never used**. Compare the correct ОС form:

```
ОС Расчет!AL  =  [Р2 за 2 раз в году] + [Р1 за 10 раз в году]
```

Confirmed on all 2 833 numeric rows: `AT = Р2м + Р2×4` in every one; `AT ≠ Р1×8 + Р2×4` in 1 024
rows (the rest have zero R1). The reference object shows it plainly: `Р1×8 = 84.16`,
`Р2×4 = 292`, `ИТОГО = 365 = 73 + 292`.

So the workbook's fire-alarm figure both drops R1 *and* double-counts one R2 cycle. In effect it
substitutes one extra R2 cycle for the whole R1 annual contribution, so the error is
`Р1×8 − Р2 за мес` and **its sign varies by object**:

| | Objects |
|---|---:|
| Engine higher than workbook (`8×Р1 > Р2`) | 581 |
| Engine **lower** than workbook (`8×Р1 < Р2`) | 443 |
| Identical (no ПС equipment) | 1 809 |

In aggregate the workbook **overstates** ПС: it adds `Σ Р2 за мес = 192 550` where the correct
formula adds `Σ Р1×8 = 173 666`, a net overstatement of **18 884 min/year** across the estate.
Because R2 minutes per device are far larger than R1 minutes, equipment-heavy objects are the ones
where the workbook runs high. The extreme case is `Здание ГО г. Минск пр-т Дзержинского, 18`
(seq 91): `Р1×8 = 7 247.76` against `Р2 за мес = 10 212.4`, so the workbook overstates by
247.05 min/month and its `ИТОГО` reads 1.012046 where the engine correctly gives 0.979751.
`CONTRIBUTING.md`'s "R1 and R2 are additive — R2 does not replace R1" is the correct domain rule, so
the implementation is right and the workbook has a formula bug. Worth stating explicitly in the TOR
so nobody later "fixes" the code to match the spreadsheet.

`ПС Расчет` also has no `Норматив числености` column, unlike `ОС Расчет!AN` and `Видео Расчет!R` —
consistent with it being the least-maintained sheet.

#### 8.4.1 PAC-01's reference value inherited the defect

The published PAC-01 value `0.032327` came from `СВОД!Q2`, which consumes the defective ПС total.
The `CalculationServiceTest` fixture reproduced it by giving ПС a synthetic device with
`R1 = 45.6255, R2 = 0` — so `(45.6255×8 + 0×4)/12 = 30.4167`, the workbook's number, reached by
zeroing R2 rather than by the object's real equipment.

The reference object's actual ПС inventory is `серий А6 ×1, шлейфы ×5, каналы ×1, извещатели ×13,
таблички ×2` → `R1_per_visit = 10.52`, `R2_per_visit = 73.0`:

| ПС monthly | ИТОГО Числ (с дорогой) | ИТОГО Числ (без дороги) |
|---|---|---|
| Workbook `(73 + 73×4)/12` = 30.4167 | 0.032327 | 0.023961 |
| **Correct** `(10.52×8 + 73×4)/12` = 31.3467 | **0.032448** | **0.024082** |

So a correct engine fed the real equipment cannot produce `0.032327`. PAC-01 is now **0.032448**,
PAC-02 **0.032448**, PAC-07 **0.016224**. Both PAC-01 fixtures were rebuilt from the real inventory
(ОС `R1 = 29.14, R2 = 98.4`; ПС `R1 = 10.52, R2 = 73.0`), so the reference test exercises the
additive rule instead of sidestepping it with `R2 = 0`. ОС was already consistent — its workbook
formula is correct — so its expected value is unchanged at 40.6833.

Updated: `CONTRIBUTING.md`, `.github/copilot-instructions.md`,
`.claude/skills/calculation-domain-review/SKILL.md`, TOR §6.8/§14/§19, `docs/impl/poc-scope.md`,
`docs/impl/calculation-engine.md`, both epic files, `frontend/e2e/helpers/data.ts`.

**Two places deliberately left alone**, because they depend on what data actually exists rather than
on the rule:

- `frontend/e2e/svod.spec.ts` asserts the literal string `0.032327` is visible for the reference
  object. It should become `0.032448` **at the same time** the reference object is seeded with its
  real equipment (import steps 6–9); changing it before then would break a currently-passing suite.
- `EngineerWorkloadServiceTest.componentBreakdown_singleObject` uses `0.032327` and `ps=30.417` as
  **stubbed** summary values — the numbers are never computed there, so the test is unaffected. Its
  comment was relabelled so it no longer claims to be the reference object.

Other occurrences of `0.032327` across frontend unit tests and design-system previews are arbitrary
display fixtures, not assertions about the reference object, and were left as-is.

---

## 9. Recommended import order

1. `Нормативы` → config constants, device catalog, repair catalog, records catalog (§3.3–§3.5, §5)
2. `ОС!B` → divisions (fix row 1830)
3. `ОС!C` + division → branches (composite key)
4. `ОС!E` → engineers (parse `Имя И Фамилия/BELARUSBANK/BY`)
5. `ОС!A:E` → objects (fix row 1834; trim names; log the 4 cross-sheet conflicts)
6. `Дорога!G:H` → object travel (`round_trip` derived, never imported)
7. `ОС!F:S`, `ПС!F:W`, `Видео!F:H` → object device quantities, text → status records
8. `Ремонт!F:AD` → object repair counts
9. `Записи!F:J` → object records counts
10. Recalculate; diff against the cached `СВОД` values for the 2 780 clean objects

Step 10 is the real acceptance test. Expect the four §8 differences to show up as systematic deltas —
that is the point of running it.

---

## 10. Delivered seed — steps 2 to 5

`backend/src/main/resources/db/changelog/changes/v1.0.6-seed-org-data.sql` implements steps 2–5 of
the order above (the org hierarchy). It is Liquibase formatted SQL, registered in
`db.changelog-master.xml`, and covers:

| Changeset | Table | Rows |
|---|---|---:|
| `v1.0.6-1` | `divisions` | 6 |
| `v1.0.6-2` | `branches` | 135 |
| `v1.0.6-3` | `users` (role `engineer`) | 123 |
| `v1.0.6-4` | `objects` | 2 934 |
| `v1.0.6-5` | `object_engineers` | 2 492 |

Design decisions:

- **FKs resolve by name**, via `INSERT … SELECT … FROM (VALUES …) JOIN`. No UUIDs are hardcoded, so
  the file is stable across environments and re-runs.
- **`import_seq_no` carries the workbook `№`**, making every seeded row traceable to its source row
  and giving steps 6–9 (equipment, repairs, records, travel) a join key that needs no name matching.
- **`objects.name` keeps the source string verbatim**; `address` is the derived geographic substring
  (2 929 of 2 934 rows). The workbook packs facility code, label and address into one free-text cell
  with no consistent separator, so any split that shortens the name discards either the internal
  facility code (1 332 rows lead with one) or the descriptor. Keeping the name whole loses nothing;
  the address is additive.
- **Engineers are placeholder accounts per TOR C-31**: `is_active = TRUE` so they appear in
  assignment dropdowns and receive summaries, `requires_activation = TRUE`, and `password_hash = '!'`
  — not a valid bcrypt hash, so it can never match a login attempt. Activate via
  `PUT /admin/users/:id/activate`.
- **Logins are `firstname.lastname@workload.local`**, transliterated, matching the existing
  `admin@workload.local` convention. The domain is non-routable — no real address is fabricated for
  a real person. `employee_id` retains the original `Имя И Фамилия/BELARUSBANK/BY` string as the link
  back to the source system.
- **`home_division_id`** is the division where the engineer services the most objects.
- The two corrupted cells (§3.1) are repaired from the `Дорога` sheet during generation; the
  `лександр Н Соловей` typo is merged (§3.1).

Verified against PostgreSQL 15: all 19 changesets apply from an empty database, 0 orphan rows,
442 objects correctly left unassigned, and `rollbackCount 5` reverses all five cleanly while leaving
the seeded admin user intact.

---

## 11. Delivered seed — steps 6 to 9

`backend/src/main/resources/db/changelog/changes/v1.0.9-seed-operational-data.sql` (2.4 MB)
implements the remaining import steps, generated by `docs/Excel_to_md/generate_operational_seed.py`:

| Changeset | Table | Rows |
|---|---|---:|
| `v1.0.9-1` | `travel` | 2 851 |
| `v1.0.9-2` | `object_devices` | 16 895 |
| `v1.0.9-3` | `object_system_assignments` | 20 215 |
| `v1.0.9-4` | `object_repairs` | 4 238 |
| `v1.0.9-5` | `records_tasks` | 245 |

Both seed files (`v1.0.6` and `v1.0.9`) carry the Liquibase context **`demo-data`**, and
`application-test.yml` sets `spring.liquibase.contexts: '!demo-data'`. Dev, the PoC stack and any
run without a context filter get the full dataset; the test suite gets schema and catalogues only.

Without this, every `@SpringBootTest` boot would run the startup recalculation over all 2 934 seeded
objects — measured at roughly one object per second, so about 90 minutes per boot. Verified both
ways: filtered runs apply 17 changesets and 122 rows with 0 objects but the v1.0.8 norm fix present;
unfiltered runs apply 27 changesets and 50 266 rows.

Objects join through `import_seq_no`; catalogues join by name. `object_devices` collapses the
20 215 per-system assignments into 16 895 physical counts, keeping the first occurrence where one
device serves two systems (TOR §11.1). The 4 512 status-text cells (§7.1) are skipped, never coerced
to a number. **Zero rows were lost to name mismatches** — every count matches the figure in §2.

### 11.1 A prerequisite fix — device normatives (`v1.0.8`)

The catalogue seeded in `v1.0.1` had taken **7 R1 values from `Таблица3`**, the unreferenced table
§3.6 warns about — the same mistake as the records normatives in §8.3, found only when the equipment
seed made it observable:

| System | Device | Was | Corrected |
|---|---|---:|---:|
| ОС | Выносная панель управления ВПУ–А-16 | 4.5 | 2 |
| ОС | Шлейфы сигнализации | 0.06 | 0.2 |
| ОС | Расширитель | 0.03 | 0.3 |
| ПС | Шлейфы сигнализации | 0.06 | 0.2 |
| ПС | Расширитель | 0.03 | 0.3 |
| ПС | Адресный модуль | 0.03 | 0.3 |
| ПС | Адресный шлейфно-релейный модуль | 0.03 | 0.3 |

Without this, the reference object's ОС `R1_per_visit` came out 27.46 instead of the workbook's
cached 29.14, and PAC-01 would have been unreachable from real equipment. The TOR's own §6.3 worked
example was internally inconsistent here — it listed `12×0.06=0.72` while totalling `29.14`, which
requires `0.2`. Corrected.

### 11.2 An engine bug the seed exposed

`travel.one_way_time_min` is nullable and 3 objects record a distance with no time.
`CalculationService` called `getOneWayTimeMin().multiply(…)` unguarded and threw
`NullPointerException`, so those objects got no summary at all. This was reachable through the API
too — any travel record saved with only a distance would break recalculation. Fixed with a null
guard treating absent time as zero travel, covered by
`CalculationServiceTest.travelWithNullOneWayTime_treatedAsZero`.

---

## 12. Step 10 — acceptance diff against the workbook

All 2 934 objects were recalculated and compared with the workbook's cached `СВОД` values.
2 784 objects have a complete error-free chain on the workbook side and are comparable.

| Component | Objects matching the workbook |
|---|---|
| ОС monthly | **2 784 / 2 784** |
| Видео monthly | **2 784 / 2 784** |
| Записи monthly | **2 784 / 2 784** |
| Ремонт без дороги | **2 784 / 2 784** |
| Ремонт с дорогой | **2 784 / 2 784** |
| Дорога (round trip) | **2 784 / 2 784** |
| ПС monthly | 1 774 / 2 784 |
| `ИТОГО Числ` (с дорогой) | 1 770 / 2 784 |

Every component reproduces the workbook exactly except ПС — the one formula the workbook gets wrong
(§8.4). This is the strongest available evidence that the §8.1–§8.3 decisions were right: had any of
them been wrong, records or repairs would not match at all.

**Every deviation is accounted for.** Decomposing each object's `ИТОГО` delta into its ПС and travel
components leaves a residual above 1.5e-6 on only 5 objects — seq 823, 826, 827, 828, 831 — and that
residual is exactly `200 / 7650 = 0.026144`, the phantom travel from the five hardcoded `СВОД!G`
cells in §3.2. Nothing else is unexplained.

**Method.** The engine processes roughly one object per second once engineer summaries accumulate,
so a full 2 934-object run is impractical to sit through. The diff was therefore computed with a SQL
model of `CalculationService`, first validated against the engine's own output on the 1 366 objects
it had completed: **0 mismatches across every component** at the 6-decimal precision `summaries`
stores. The SQL model is a faithful proxy, not an independent reimplementation of the rules.

### 12.1 Recalculation performance — fixed

The first full run exposed a quadratic cascade. `CalculationService.recalculate` refreshed every
assigned engineer's summary, and `EngineerSummaryService.recalculate` re-aggregated that engineer's
whole portfolio with **two queries per assignment** (`countByObjectId` + `findByObjectId`). So a full
pass cost `2 × Σ(portfolio²)` — measured against the seeded data:

| | Queries |
|---|---:|
| Per-object cascade with the N+1 | **313 644** |
| Each engineer once, still N+1 | 4 984 |
| Each engineer once, single aggregate query | **123** |

Белоусов alone holds 251 objects (251² = 63 001), and the top 5 engineers accounted for 62% of the
total. Startup also degraded from ~2.6 to ~0.5 objects/s as summaries filled in, because
`findByObjectId` went from returning empty Optionals to hydrating entities.

Two changes:

- `CalculationService.recalculate(objectId, cascadeEngineerSummaries)` — the startup listener now
  runs objects first, then each engineer exactly once. The single-argument form still cascades, so
  the normal edit path is unchanged.
- `ObjectEngineerRepository.findObjectLoadsByEngineerId` returns an `EngineerObjectLoad` projection
  carrying the summary components and the shared-engineer count in one query, replacing the N+1.
  This also fixes the **runtime** path: editing one of Белоусов's objects previously fired ~502
  queries to refresh his summary.

Measured end to end on the full seeded dataset: **2 934 objects and 123 engineers in 131.7 s**
(22.3 objects/s), against roughly 90 minutes before. Results verified unchanged — all 2 934
summaries agree with the validated SQL model on every component, and PAC-01 remains `0.032448`.
