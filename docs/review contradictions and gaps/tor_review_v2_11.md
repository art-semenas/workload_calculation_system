# TOR v2.11 Fixes Task List (Agent Execution Guide)

This checklist provides detailed context and instructions based on [tor_review_v2_11.md](file:///d:/Study/Java/IdeaProjects/workload_calculation_system/docs/tor_review_v2_11.md) to resolve gaps and contradictions in `TOR_Workload_WebApp.md`.

---

## 🔴 Contradictions

- [ ] **1. Docker Compose Redis dependency**
  - **Context:** §15.8 (line ~2696) lists 4 containers for PoC (`backend`, `frontend`, `postgres`, `nginx`) with no Redis. However, §20.7 (line ~3430) shows the production `docker-compose.yml` with a Redis healthcheck dependency on the backend.
  - **Action:** In §20.7, add a clear comment note (e.g., `> [!NOTE]`) that the Redis service and its corresponding `depends_on` block should be omitted/optional when running the PoC, or explicitly provide a `docker-compose.poc.yml` outline in §15.8.

- [ ] **2. `records_monthly` divisor naming**
  - **Context:** §6.5 (line ~975) calculates `records_monthly = records_6months / config[REPAIR_PLANNING_MONTHS]`. However, §6.11 (line ~1195) clarifies this setting is used for both records and repairs. The name `REPAIR_PLANNING_MONTHS` is misleading when used to divide records.
  - **Action:** Rename the configuration key `REPAIR_PLANNING_MONTHS` to `PLANNING_PERIOD_MONTHS` throughout the entire document (check §6.5, §6.11, and any seed/config sections). Alternatively, add a glossary term explaining why `REPAIR_PLANNING_MONTHS` is used for records.

- [ ] **3. Migration milestone numbering swap (M-09 vs M-11)**
  - **Context:** S-08 (line ~2506) says "Reversed in: M-09". S-09 (line ~2514) says "Reversed in: M-11". However, §15.7 Migration Milestones table (line ~2647) says M-09 is "Concurrency" (resolving S-09) and M-11 is "PDF export" (resolving S-08). They are swapped.
  - **Action:** Align them. In §15.7, swap the definitions so M-09 is PDF Export (resolving S-08) and M-11 is Concurrency (resolving S-09), OR update S-08 and S-09 to match the table.

- [ ] **4. Admin config API contract conflict**
  - **Context:** §10.2 (line ~1869) defines `PUT /admin/config/:key` for updating single values. §6.11.1 (line ~1254) describes batch validation: "PUT /admin/config must run the same validation before writing... All violations in a single save are reported together."
  - **Action:** Resolve the conflict. Change §10.2 to support batch updates (`PUT /admin/config` with a JSON body of key-value pairs) to align with §6.11.1, OR change §6.11.1 to describe per-key validation for the `PUT /admin/config/:key` endpoint.

---

## 🟡 Gaps / Missing Specifications

- [ ] **5. `object_engineers.assigned_by` in PoC schema**
  - **Context:** Confirmed consistent between full schema and PoC schema. No action needed.

- [ ] **6. `app_config` invalidation rule for PoC**
  - **Context:** §6.10 (line ~1175) rule specifies *"app_config UPDATE ... Mark ALL summaries.is_stale = 'TRUE'"*.  The PoC has no `app_config` table (S-03) and no `is_stale` column (S-02).
  - **Action:** In §6.10, append an `(MVP)` annotation to the `app_config` UPDATE trigger row so developers understand this rule is not implemented in the PoC.

- [ ] **7. Delete semantics for `repair_types` (HIGH-7)**
  - **Context:** §10.2 (line ~1855) notes a pending decision on whether inactive `object_repairs` should block `repair_types` deletion.
  - **Action:** Define the MVP policy in §10.2: "Object repair rows with `count > 0` (in any period, past or active) block deletion of a repair type. Rows with `count = 0` do not block deletion."

- [ ] **8. Object hard delete cascade behaviour**
  - **Context:** §4.1 (line ~126) and §10.2 list `DELETE /objects/:id`. But there is no specification of DB cascade actions.
  - **Action:** Add a behavior note in §10.2 or §4.1 stating: "Object deletion must cascade-delete all child records at the DB level (`object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `object_engineers`, `summaries`). Additionally, the affected engineers' summaries must be marked stale (MVP)."

- [ ] **9. Division and Branch CRUD APIs/UI**
  - **Context:** §5.2 specifies divisions and branches, but there's no CRUD API in §10 and no UI form in §7.1. For manual PoC testing, they must be created.
  - **Action:** Add a specification (e.g., in §10 and/or §11.1) that divisions and branches are treated as read-only seed data generated via the data import feature and cannot be manually created or managed through the UI. Or alternatively, add basic CRUD endpoint specs.

- [ ] **10. `POST /auth/refresh` API definition**
  - **Context:** §10.2 (line ~1938) lists `POST /auth/refresh`. §21.2 (line ~2566) says PoC does not implement refresh tokens.
  - **Action:** In §10.2, add an `(MVP)` annotation next to `POST /auth/refresh`.

- [ ] **11. Engineer visibility inconsistency**
  - **Context:** §12 (line ~2066) says Engineers can "View all objects / СВОД" -> "Own objects only", and "View engineer list..." -> "Own data only". Yet §21.5 (line ~3616) mentions visibility constraints.
  - **Action:** Clarify in §12. Update the roles table to state whether an Engineer can access the `/engineers` list view at all, and specify that they only see their own row on that view (or state the page is completely hidden from the Engineer role).

- [x] **12. `total_repairs` PoC vs MVP inconsistency**
  - **Context:** Documented as an intentional in-memory computation for PoC. No action needed.

- [ ] **13. XLSX import vs JSON import wording**
  - **Context:** §15.7 M-01 (line ~2649) labels the epic "XLSX import". §11.1 (line ~1967) clearly says the server accepts JSON, and XLSX is converted externally.
  - **Action:** Update the M-01 label in §15.7 from "XLSX import (FR bulk)" to "JSON bulk import (FR bulk)" to avoid confusion.

- [ ] **14. Engineer `is_active = FALSE` vs S-04 rule**
  - **Context:** §11.1 (line ~2026) creates inactive accounts. S-04 (line ~2474) says no access control is enforced in PoC. AD-13 filters inactive accounts from dropdowns.
  - **Action:** In S-04 (line ~2474), add a sentence clarifying that filtering out `is_active = FALSE` engineers on UI assignment dropdowns is considered a UI data filtering concern, not an RBAC feature, and must still be implemented in the PoC.

- [ ] **15. `records_tasks` normatives mapping**
  - **Context:** §6.5 (line ~974) formula `records_6months = SUM(...)` doesn't explicitly link the 5 columns to the 5 keys in `app_config` defined in §6.11.
  - **Action:** Expand the formula in §6.5 to explicitly map the `records_tasks` column names to the configuration keys:
    `records_6months = access_requests * config[RECORDS_ACCESS_MINUTES] + monitoring_requests * config[RECORDS_MONITORING_MINUTES] ...`

- [ ] **16. PoC handling of `application.yml` config**
  - **Context:** S-03 (line ~2466) and §15.4 (line ~2600) specify that config values are loaded from `application.yml` in PoC, but don't specify the YAML format.
  - **Action:** Add a YAML code snippet to §15.4 demonstrating the expected property namespace and casing for the configuration constants (e.g., `workload.config.RECORDS_ACCESS_MINUTES: 15`).

- [ ] **17. `records_6months` in PoC summaries schema**
  - **Context:** §15.4 (line ~2558) misses `records_6months` that was present in §5.2 full schema, since it is computed in-memory.
  - **Action:** In §15.4, add `records_6months` to the note (line ~2552) listing the intermediate summary fields that are merely computed in-memory and not persisted in PoC.

- [ ] **18. Missing `ON DELETE CASCADE` for object children**
  - **Context:** §5.2 `object_engineers` (line ~688) doesn't specify `ON DELETE CASCADE` from `objects.id`.
  - **Action:** In §5.2, explicitly add `ON DELETE CASCADE` to the foreign key definitions linking back to `objects(id)` for all child tables (`object_engineers`, `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`).

---

## 🟢 Minor Issues / Nits

- [ ] **19. Changelog v2.8 text duplication**
  - **Context:** Line ~16 in the v2.8 changelog duplicated a sentence from the v2.7 changelog.
  - **Action:** Remove the trailing phrase *"repair formula corrections. Fixed 8 locations: (1) §5 summaries column comments; (2) §6.1 pipeline Stage 5 expanded..."* from the v2.8 changelog entry.

- [ ] **20. AD numbering gap**
  - **Context:** §9.2 jumps from AD-09 (line ~1749) to AD-14, followed by AD-10 through AD-13 below.
  - **Action:** Reorder Architectural Decisions in §9.2 so they are numbered sequentially (AD-09, AD-10, AD-11... AD-18).

- [ ] **21. C-20 placement out of sequence**
  - **Context:** Clarification C-20 (line ~2269) appears after C-40.
  - **Action:** Move the C-20 block in the document so it is ordered sequentially between C-19 and C-21.

- [ ] **22. Stale indicator wording inconsistency**
  - **Context:** §7.2 (`"Пересчитывается..."`), §7.10 (`"Пересчитывается..."`), and §7.9 (`"Данные устарели — нажмите Пересчитать"`) use different phrases for stale UI indicators.
  - **Action:** Unify phrasing across §7.2, §7.9, and §7.10 to strictly use `"Данные устарели — нажмите Пересчитать"` for the MVP (on-demand calc). Add a note that for PoC (synchronous calc), the stale indicator should never be displayed.
