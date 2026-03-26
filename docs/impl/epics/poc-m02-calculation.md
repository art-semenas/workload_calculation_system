# Epic: PoC M-02 — Calculation Engine & СВОД

**Milestone:** PoC M-02 (internal PoC milestone — precedes MVP M-01 in TOR §15.7)
**Phase:** PoC
**What it delivers:** FR-07 СВОД table (all 19 columns), §6 synchronous calculation pipeline (ОС, ПС, Видео, Записи, Ремонт, Дорога → ИТОГО Числ), `summaries` table writes, СВОД XLSX export, dashboard aggregations (FR-09).

## Functional Requirements Covered

- **FR-07 — Consolidated Summary — СВОД (§4.7):** Per object, СВОД shows ПЗВ, travel round-trip minutes, monthly average ТО time per system (ОС, ПС, Видео), monthly average for Записи, repair time without/with travel overhead (monthly), ИТОГО Числ (без дороги) and ИТОГО Числ (с дорогой), Р1 and Р2 per-visit totals across all systems. Paginated table matching all 19 source columns.
- **FR-08 — Export (§4.8) — partial:** СВОД to XLSX only (matching original template column structure). PDF export is post-MVP (S-08). Object inventory XLSX export is MVP M-12 (S-10).
- **FR-09 — Dashboard (§4.9):** Total headcount (ИТОГО Числ) per division, top 10 objects by workload, objects with no engineer assigned (coverage gaps), objects with no system assignments (data gaps).

## Acceptance Criteria In Scope

**AC-01:** Import of the reference dataset produces exactly 2,935 object records. All non-zero equipment values are represented as `object_system_assignments` rows with corresponding `object_devices` rows. _(Verification deferred to PoC demo with manually entered subset; full 2,935-row verification requires MVP M-01 import.)_

**AC-02:** All computed СВОД values match source XLSX "Расчет" sheet values within ±0.001. Verified fields: `os_monthly_avg`, `ps_monthly_avg`, `video_monthly_avg`, `records_monthly`, `repair_no_travel_monthly`, `repair_with_travel_monthly`, `total_no_travel_min`, `total_with_travel_min`, `itogo_chislo_no_travel`, `itogo_chislo_with_travel`, `r1_per_visit_total`, `r2_per_visit_total`.

**AC-07:** API ignores or rejects attempts to set `round_trip_min`, `is_stale`, or any `summaries` field directly. Returns HTTP 422 if attempted.

**AC-09:** XLSX export of СВОД matches original template column structure and values within ±0.001.

**AC-10:** СВОД page (first 100 rows, 2,935 objects imported) loads in under 3 seconds. _(PoC verifies with manually entered subset; full performance test at MVP after bulk import.)_

**AC-22:** All three threshold bands for the repair travel formula must be verified in the integration test suite (`CalculationServiceTest`):
- Band A (5 < kvo ≤ 10): For kvo=8, round_trip_min=20, PZV=20, repair_work_6months=361: `repair_with_travel_monthly = (361 + 160 + 160) / 5 = 136.2 ±0.001`
- Band B (kvo ≤ 5): effective_trips = 0, repair_travel_6months = 0, repair_pzv_6months = 0
- Band C (kvo > 10): For kvo=17, round_trip_min=20: effective_trips = 10 (capped), repair_travel_6months = 10 × 20 = 200

**AC-26:** `PUT /objects/:id/records` with quantities for all five task types persists the values. `GET /objects/:id/records` returns the saved quantities. The `records_monthly` value in the object summary equals `SUM(task_quantity × task_normative_minutes) / config[PLANNING_PERIOD_MONTHS]` within ±0.001.

**PAC-01:** For a manually entered object matching "Архив г.Брест, ул.Московская, 202Д" with the correct equipment quantities, `itogo_chislo_with_travel = 0.032327 ±0.000001`.

**PAC-03:** СВОД XLSX export, when opened in Excel, matches manually verified reference values within ±0.001.

**PAC-04:** Editing any equipment quantity in the UI and saving immediately updates the СВОД tab and the engineer's load ratio without page refresh.

**PAC-05:** СВОД table loads first 100 rows in under 3 seconds.

**PAC-08:** Division dashboard shows correct required FTE total = SUM of `itogo_chislo_with_travel` for all objects in that division.

**PAC-09:** Health endpoint `GET /actuator/health` returns HTTP 200 with `{"status": "UP"}` (Spring Boot Actuator default) and includes database connectivity check.

## Database Tables Required

From docs/impl/db-schema.md:

- `summaries` — computed cache, one row per object. **PoC columns only** (no MVP-only columns):
  - `id`, `object_id` (UNIQUE, ON DELETE CASCADE)
  - `os_r1_per_visit`, `os_r2_per_visit`, `ps_r1_per_visit`, `ps_r2_per_visit`, `video_r1_per_visit`, `video_r2_per_visit`
  - `r1_per_visit_total`, `r2_per_visit_total`
  - `os_monthly_avg`, `ps_monthly_avg`, `video_monthly_avg`
  - `records_monthly`
  - `repair_no_travel_monthly`, `repair_with_travel_monthly`
  - `round_trip_min`, `pzv_minutes`
  - `total_no_travel_min`, `itogo_chislo_no_travel`
  - `total_with_travel_min`, `itogo_chislo_with_travel`
  - `computed_at`
  - **NOT included in PoC v1.0.0 migration:** `is_stale`, `period_id`, `records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`
- All source tables from M-01: `object_system_assignments`, `device_system_contexts`, `records_tasks`, `object_repairs`, `travel`, `objects`, `branches`, `divisions`

## API Endpoints Required

From docs/impl/api-spec.md:

- `GET /objects/:id/summary` — get computed summary for an object
- `GET /svod` — get all object summaries (paginated, filterable); all 19 СВОД columns
- `GET /svod/export/xlsx` — export СВОД to XLSX
- `GET /aggregations/company` — company-wide required FTE and breakdown (on-the-fly)
- `GET /aggregations/divisions` — all divisions summary list (on-the-fly)
- `GET /aggregations/divisions/:id` — single division detail (on-the-fly)
- `GET /aggregations/branches` — all branches summary list (on-the-fly)
- `GET /aggregations/branches/:id` — single branch detail (on-the-fly)
- `GET /coverage/gaps` — list objects with zero assigned engineers (optional `?division_id=`)

> **Stale-marking note (PoC S-02):** All write endpoints that change source data (`PUT /objects/:id/devices/:dtid`, `PUT /objects/:id/assignments/:aid`, `PUT /objects/:id/records`, `PUT /objects/:id/repairs/:rtid`, `PUT /objects/:id/travel`, `PUT /catalog/devices/:id/contexts/:cid`, `PUT /catalog/repairs/:id`) trigger synchronous recalculation of the affected object's summary in the same request thread. No `is_stale` column is written. `DELETE /objects/:id` cascade-deletes child rows then synchronously recalculates engineer summaries for affected engineers.

## UI Screens Required

From docs/impl/ui-spec.md (PoC routes from §15.5):

- `/svod` — Full СВОД table — paginated, filterable (19 columns per §7.9)
- `/svod/export` — Trigger XLSX export
- `/objects/:id/svod` — СВОД tab on object detail (computed summary, read-only). PoC: no stale indicator — summary updates synchronously on save (S-02).
- `/` — Dashboard — required FTE by division, top 10 objects by workload, coverage gaps (§4.9 / §7)
- `/divisions/:id` — Division detail — СВОД subtotals + "Непокрытые объекты" coverage gap section (§7.7)

## Calculation Pipeline (§6 Summary)

See docs/impl/calculation-engine.md for full formulas. Key stages:

1. Per-assignment contribution: `r1_contrib = quantity_maintained × context.r1_minutes`
2. Per-system per-visit subtotals (SUM over assignments per system_type)
3. Annual time via visit frequencies from config (e.g. OS_R1_VISITS_PER_YEAR=10)
4. Monthly average per system: `(R1_annual + R2_annual) / 12`
5. Records: `records_monthly = records_6months / config[PLANNING_PERIOD_MONTHS]`
6. Repairs: three-band threshold formula (kvo ≤ 5 → 0 trips, 5 < kvo ≤ 10 → kvo trips, kvo > 10 → 10 trips)
7. СВОД aggregation: `itogo_chislo = total_monthly_min / (config[MONTHLY_HOURS_FUND] × 60)`
8. Zero guard: itogo = 0 when all work components are zero (prevents phantom FTE from PZV/travel on empty objects)

Config constants are injected as Docker env vars in PoC (`WORKLOAD_CONFIG_*`). Application fails to start if any required var is missing or type-invalid.

Intermediate computed fields (`records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`) are computed in-memory only — **not persisted in PoC**. Only final monthly outputs are stored in `summaries`.

## PoC Simplifications Active in This Milestone

- **S-02:** Synchronous recalculation on save — no staleness tracking. Every write to source data triggers immediate synchronous recalculation (~5ms per object). No `is_stale` column, no background worker, no admin trigger button. Reversed in MVP M-06.
- **S-03:** Static normatives — normatives are seed data only. Config constants are Docker env vars. No `app_config` table.
- **S-05:** No planning periods — `records_tasks` and `object_repairs` have no period FK. Calculation uses all rows for each object.
- **S-08:** No PDF export — СВОД XLSX only.

## Out of Scope for This Milestone

- Background worker and staleness tracking (`is_stale` column, `POST /svod/recalculate`) — MVP M-06
- Engineer load calculation (`engineer_summaries` table) — PoC M-03 (engineer epic)
- Planning period selector on СВОД page — MVP M-07
- `GET /svod/export/pdf` — post-MVP M-11 (S-08)
- Admin-triggered bulk recalculation (`POST /svod/recalculate`) — MVP M-06
- `app_config` admin UI — MVP M-10
- MVP-only `summaries` columns: `is_stale`, `period_id`, `records_6months`, `repair_work_6months`, `repair_travel_6months`, `repair_pzv_6months`, `total_repairs`
