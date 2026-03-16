# Comprehensive TOR v2.11 Task List for AI Agent

**Source documents:**  
- `docs/tor_gap_task_list_v2_11.md` (Detailed architectural gap analysis)
- `docs/tor_review_v2_11.md` (Line-by-line review findings)

**Target document for fixes:** `docs/TOR_Workload_WebApp.md`

**Purpose:** A unified, deduplicated, and comprehensive task list combining both high-level system gaps and specific line-item document fixes. This document provides explicit context, affected areas, concrete document changes, and done criteria for an AI or human agent to execute step-by-step.

---

## 🔴 Contradictions

### [x] C-01. Normalize Recalculation Semantics & Stale UI Indicators
*Merges: Task T-01 & Review Item 22*
- **Priority:** Critical
- **Problem:** The TOR currently mixes two incompatible models: on-demand recalculation only after admin action, and automatic/asynchronous recalculation immediately after save. This contradiction appears in functional requirements, UI copy, API descriptions, and acceptance criteria. Additionally, UI textual copy for stale states uses different phrasing: `"Пересчитывается..."` vs `"Данные устарели — нажмите Пересчитать"`.
- **Why this matters:** Worker design, stale indicator logic, API behaviour after writes, tests, and PoC/MVP scope boundaries depend on this decision.
- **Affected TOR areas:** Lines ~348, ~361, ~830, ~1164, ~1180, ~1357, ~1430, ~1454, ~1824, ~1842, ~2022, ~2287, ~2370. Sections §7.2, §7.9, §7.10.
- **Action / Required Resolution:** Choose one canonical rule for MVP (e.g., writes mark summaries stale synchronously, but recalculation is on-demand via `POST /svod/recalculate`). Unify all stale UI indicators to use `"Данные устарели — нажмите Пересчитать"`. State clearly that the PoC uses synchronous recalculation on save, while MVP uses stale tracking.
- **Concrete Document Changes:** 
  - Replace "triggers recalculation" with `marks stale` or `starts recalculation` consistently. 
  - Fix UI copy for stale states. 
  - Align API endpoint comments and acceptance criteria (AC-03 vs AC-20).
- **Done Criteria:** One consistent recalculation model is described across FR, UI, API, and architecture. PoC uses synchronous recalc; MVP uses stale tracking. Stale state and processing state have different, consistent UI wording.

### [x] C-02. Unify Admin Config API Contract
*Merges: Task T-03 & Review Item 4*
- **Priority:** High
- **Problem:** API section §10.2 defines `PUT /admin/config/:key` for updating single values, but §6.11.1 describes batch validation: "PUT /admin/config must run the same validation before writing... All violations in a single save are reported together."
- **Why this matters:** Backend API design, frontend form design, validation error format, and acceptance tests (assuming batch save) are blocked or will conflict.
- **Affected TOR areas:** Lines ~1212, ~1254, ~1267, ~1868, ~2406. Sections §10.2, §6.11.1.
- **Action / Required Resolution:** Unify the API shape. Recommended: Use `PUT /admin/config` for batch/patch-style saves, validate cross-key rules before write, and return all violations together.
- **Concrete Document Changes:** Update API endpoint list and Request/Response body shapes in §10.2. Ensure the validation section uses the exact same endpoint. Align AC-23.
- **Done Criteria:** One authoritative endpoint contract exists. Frontend can implement admin form without guessing request shape. AC and API sections reference the same endpoint name.

### [x] C-03. Fix PoC to MVP Milestone Mapping
*Merges: Task T-04 & Review Item 3*
- **Priority:** High
- **Problem:** Simplification sections S-08 (PDF export) and S-09 (concurrency/locking) disagree with the Migration Milestones table (§15.7). S-08 says "Reversed in: M-09" but table says M-11 is PDF export. S-09 says "Reversed in: M-11" but table says M-09 is Concurrency. 
- **Why this matters:** Milestone planning becomes unreliable. Implementation order and dependencies may be planned incorrectly.
- **Affected TOR areas:** Lines ~2502, ~2508, ~2647. Sections §15.7.
- **Action / Required Resolution:** Correct the mapping so S-08 and S-09 match the table. (M-09 = Concurrency for S-09; M-11 = PDF export for S-08).
- **Concrete Document Changes:** Fix `_Reversed in:_` references for S-08 and S-09 to point to the correct migration item.
- **Done Criteria:** Every S-item points to the correct migration item without contradiction. Milestone numbering is consistent.

### [x] C-04. Docker Compose Redis Dependency
*Source: Review Item 1*
- **Priority:** Medium
- **Problem:** §15.8 lists 4 containers for PoC (`backend`, `frontend`, `postgres`, `nginx`) with no Redis. But §20.7 shows the production `docker-compose.yml` with a Redis healthcheck dependency on the backend.
- **Affected TOR areas:** §15.8 (line ~2696), §20.7 (line ~3430).
- **Action / Required Resolution:** In §20.7, add a clear note (e.g., `> [!NOTE]`) that the Redis service and its `depends_on` block should be omitted/optional when running the PoC, OR explicitly provide a `docker-compose.poc.yml` outline in §15.8.
- **Done Criteria:** A developer building the PoC knows exactly how to handle the Redis compose dependency.

### [x] C-05. `records_monthly` Divisor Naming
*Source: Review Item 2*
- **Priority:** Medium
- **Problem:** §6.5 calculates `records_monthly = records_6months / config[REPAIR_PLANNING_MONTHS]`. However, §6.11 clarifies this setting is used for both records and repairs calculations. The key name `REPAIR_PLANNING_MONTHS` is misleading when used to divide records.
- **Affected TOR areas:** §6.5 (line ~975), §6.11 (line ~1195).
- **Action / Required Resolution:** Rename the configuration key `REPAIR_PLANNING_MONTHS` to `PLANNING_PERIOD_MONTHS` throughout the entire document, or add a glossary term explaining its dual use.
- **Done Criteria:** Config key name sensibly applies to both repairs and records calculations.

---

## 🟡 Gaps / Missing Specifications

### [x] G-01. Define Object Hard-Delete Cascade Contract
*Merges: Task T-02, Review Item 8, Review Item 18*
- **Priority:** Critical
- **Problem:** The TOR maps deletion to `DELETE /objects/:id` but lacks definitions for child records and dependent caches. Schema foreign keys for `object_engineers` and other tables lack `ON DELETE CASCADE`.
- **Why this matters:** API behaviour on delete is ambiguous. Schema design cannot be finalized. Engineer summaries might become stale or incorrectly calculated if child tables are left dangling.
- **Affected TOR areas:** Lines ~126, ~490, ~501, ~519, ~548, ~563, ~610, ~688, ~692, ~1168, ~1798, ~2212. Sections §4.1, §5.2, §10.2.
- **Action / Required Resolution:** In §5.2, explicitly add `ON DELETE CASCADE` to foreign keys linking `objects(id)` for all child tables (`object_engineers`, `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`). In §10.2 API, specify that affected engineers' summaries must be marked stale immediately upon object deletion.
- **Concrete Document Changes:** Update FKs in schema sections. Add object deletion behavior to cache invalidation rules and API specifications.
- **Done Criteria:** Complete deletion behavior is explicitly documented for all DB child tables and caches.

### [x] G-02. Normalize Import System-Type Contract
*Source: Task T-05*
- **Priority:** High
- **Problem:** The JSON import payload examples use field name `system` with string values like `OS` and `PS`. But the canonical database model uses `system_type` with localized values `ОС`, `ПС`, `Видео`.
- **Why this matters:** Import payload producers don't know the exact valid values. Backend validation behavior is undefined for aliases.
- **Affected TOR areas:** Lines ~95, ~150, ~474, ~503, ~1974, ~1991, ~2030.
- **Action / Required Resolution:** Standardize on `system_type` in payload examples. Explicitly list accepted values or document aliasing/normalization rules (e.g., mapping `OS` to `ОС`).
- **Concrete Document Changes:** Rewrite JSON examples to match canonical names. Add validation rules for system-type normalization/rejection upon import.
- **Done Criteria:** Payload examples, validation rules, and the core data model align perfectly on field name and value constraints.

### [x] G-03. Clarify Engineer Visibility Rules
*Merges: Task T-06 & Review Item 11*
- **Priority:** Medium
- **Problem:** RBAC model dictates engineers can only see their own data, but UI section outlines a general `/engineers` list page showing all engineers and their comparative load ratios.
- **Why this matters:** Frontend routing, backend list filtering, and role-based test scenarios cannot be implemented securely.
- **Affected TOR areas:** Lines ~1384, ~1457, ~2066, ~2082, ~2085, ~3613, ~3616. Sections §12, §21.5.
- **Action / Required Resolution:** Define explicit visibility. Recommended: Engineers have access to the `/engineers` route, but the API filters the returned list to exactly one row (themselves). Alternatively, hide the view entirely from engineers.
- **Concrete Document Changes:** Update roles matrix in §12, define `GET /engineers` filtering by role, clarify route visibility in UI role constraints.
- **Done Criteria:** Route access and API filtering match clearly for the engineer role.

### [x] G-04. Define Manual Division and Branch Creation Path
*Merges: Task T-07 & Review Item 9*
- **Priority:** Medium
- **Problem:** UI allows manual object creation, which requires a `division` and `branch`. However, there are no endpoints, CRUD UI forms, or instructions detailing how divisions and branches are seeded or created natively.
- **Why this matters:** Both API developers and UI designers are blocked on object creation workflows (dropdowns vs text inputs vs separate creation pages).
- **Affected TOR areas:** Lines ~122, ~1368, ~1371, ~1795, ~2012. Sections §5.2, §7.1, §10.
- **Action / Required Resolution:** Specify whether divisions and branches are read-only seed data (generated via external API import) and simply selected in a UI dropdown during manual object creation, or if UI components needs to create them on the fly. Recommended: Seed-data only.
- **Concrete Document Changes:** Add missing endpoints mapping (e.g. `GET /divisions`) to fetch list nodes for UI select dropdowns. Append notes restricting creating them manually.
- **Done Criteria:** Manual object creation workflow is unambiguous. Frontend knows division/branch are selection-only arrays.

### [x] G-05. Delete Semantics for `repair_types`
*Source: Review Item 7*
- **Priority:** Medium
- **Problem:** §10.2 API table notes a pending, unresolved decision regarding whether inactive `object_repairs` should block the deletion of `repair_types`.
- **Affected TOR areas:** §10.2 (line ~1855).
- **Action / Required Resolution:** Remove the pending language and define a concrete MVP policy: "Object repair rows with `count > 0` (in any period, past or active) block deletion of a repair type. Rows with `count = 0` do not block deletion."
- **Done Criteria:** Ambiguity note is replaced with a hard business rule.

### [x] G-06. `app_config` Invalidation Rule for PoC
*Source: Review Item 6*
- **Priority:** Low
- **Problem:** §6.10 caching rules specify summary invalidation triggers on `app_config` UPDATE. However, the PoC explicitly excludes an `app_config` table (S-03) and `is_stale` column (S-02).
- **Affected TOR areas:** §6.10 (line ~1175).
- **Action / Required Resolution:** Append an `(MVP)` annotation to the `app_config` UPDATE trigger row so developers understand this invalidation rule is skipped during PoC implementation.
- **Done Criteria:** Table row safely flags it is out of PoC scope.

### [x] G-07. `POST /auth/refresh` API Definition
*Source: Review Item 10*
- **Priority:** Low
- **Problem:** §10.2 lists `POST /auth/refresh` in the API table, but §21.2 confirms the PoC does not implement refresh token flows.
- **Affected TOR areas:** §10.2 (line ~1938), §21.2 (line ~2566).
- **Action / Required Resolution:** In §10.2 API table, add an `(MVP)` annotation next to `POST /auth/refresh`.
- **Done Criteria:** Endpoint is visibly scoped out of the PoC.

### [x] G-08. XLSX Import vs JSON Import Wording
*Source: Review Item 13*
- **Priority:** Low
- **Problem:** Epic M-01 in the Migration Milestones table is labeled "XLSX import", but section §11.1 confirms the server itself only accepts JSON, expecting an external conversion tool to handle XLSX.
- **Affected TOR areas:** §15.7 (line ~2649), §11.1 (line ~1967).
- **Action / Required Resolution:** Update the M-01 label in §15.7 from "XLSX import (FR bulk)" to "JSON bulk import (FR bulk)".
- **Done Criteria:** Epic labels accurately reflect payload structure logic constraints.

### [x] G-09. Engineer `is_active = FALSE` vs S-04 Rule
*Source: Review Item 14*
- **Priority:** Low
- **Problem:** Simplification S-04 states no access control is enforced in PoC. Yet, AD-13 specifies filtering inactive accounts (`is_active = FALSE`) from assignment dropdowns. Need to classify this filtering boundary clearly.
- **Affected TOR areas:** §11.1 (line ~2026), S-04 (line ~2474).
- **Action / Required Resolution:** In S-04, add an explanatory sentence clarifying that filtering out `is_active = FALSE` engineers on UI assignment dropdowns is considered a "UI data filtering concern", not an RBAC feature, and must still be implemented in the PoC.
- **Done Criteria:** PoC scope properly delineates soft UI filtering vs hard RBAC validation.

### [x] G-10. `records_tasks` Normatives Mapping
*Source: Review Item 15*
- **Priority:** Low
- **Problem:** The formula calculation in §6.5 for `records_6months` does not explicitly link the 5 task columns stored in `records_tasks` to the corresponding 5 `app_config` keys mapped in §6.11.
- **Affected TOR areas:** §6.5 (line ~974), §6.11.
- **Action / Required Resolution:** Expand the summation formula in §6.5 to explicitly map variable names to `app_config` constants (e.g., `records_6months = access_requests * config[RECORDS_ACCESS_MINUTES] ...`).
- **Done Criteria:** Logic formula explicitly charts variables, ending any guesswork.

### [ ] G-11. PoC Handling of `application.yml` Config
*Source: Review Item 16*
- **Priority:** Low
- **Problem:** S-03 and §15.4 state variables are loaded internally from `application.yml` for the PoC, but no format structure is provided.
- **Affected TOR areas:** S-03 (line ~2466), §15.4 (line ~2600).
- **Action / Required Resolution:** Add a short YAML code snippet to §15.4 showing the expected property namespace and constant casing (e.g., `workload.config.RECORDS_ACCESS_MINUTES: 15`).
- **Done Criteria:** Developer can reliably copy/paste the example yaml blocks.

### [ ] G-12. `records_6months` in PoC Summaries Schema
*Source: Review Item 17*
- **Priority:** Low
- **Problem:** §15.4 lists various intermediate metrics missing from the PoC `summaries` schema due to in-memory processing. It forgot to list `records_6months`.
- **Affected TOR areas:** §15.4 (line ~2552, ~2558).
- **Action / Required Resolution:** Add `records_6months` to the computed in-memory fields note list.
- **Done Criteria:** Note accurately identifies all bypassed persistent metrics for PoC.

---

## 🟢 Minor Issues / Nits

### [ ] M-01. Changelog v2.8 Text Duplication
*Source: Review Item 19*
- **Problem:** Changelog entry for v2.8 mistakenly duplicated a closing line from the v2.7 changelog.
- **Action / Required Resolution:** Remove the trailing phrase *"repair formula corrections. Fixed 8 locations: (1) §5 summaries column comments; (2) §6.1 pipeline Stage 5 expanded..."* from the v2.8 section.

### [ ] M-02. AD Numbering Gap
*Source: Review Item 20*
- **Problem:** Architectural Decisions jump sporadically from AD-09 to AD-14, followed by 10, 11, etc.
- **Action / Required Resolution:** Renumber all ADs sequentially in §9.2.

### [ ] M-03. C-20 Placement Out of Sequence
*Source: Review Item 21*
- **Problem:** Clarification C-20 appears errantly after C-40.
- **Action / Required Resolution:** Relocate C-20 block cleanly between C-19 and C-21.

---

## ✅ Verified Items (No Action Needed)

- [x] **`object_engineers.assigned_by` in PoC schema:** Verified consistent between full schema and PoC schema. *(Review Item 5)*
- [x] **`total_repairs` PoC vs MVP inconsistency:** Intentionally omitted from persistent schema, correctly documented as an in-memory computation for PoC. *(Review Item 12)*
