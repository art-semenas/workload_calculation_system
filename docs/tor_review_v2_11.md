# TOR v2.11 Review — Gaps and Contradictions

**Document:** [TOR_Workload_WebApp.md](file:///d:/Study/Java/IdeaProjects/workload_calculation_system/docs/TOR_Workload_WebApp.md) (3880 lines)
**Reviewed version:** 2.11 (2026-03-13)

---

## Summary

The TOR is remarkably thorough for a v2.11 iteration — most critical gaps were already resolved in prior versions. The remaining issues fall into three classes: **minor contradictions** between sections, **missing specifications** for edge cases, and **PoC-vs-Full-TOR inconsistencies** that could cause confusion during implementation.

---

## 🔴 Contradictions

### 1. PoC Docker Compose vs Production Docker Compose — Redis dependency

**§15.8** (PoC Docker Compose, line ~2696) correctly lists **4 containers** (backend, frontend, postgres, nginx) with no Redis. However, **§20.7** (Production Docker Compose, line ~3430) shows the production `docker-compose.yml` with `depends_on: redis: { condition: service_healthy }` on the backend service. This is correct for MVP/production, but there is no **PoC-specific Docker Compose** explicitly defined — §15.8 shows a skeleton of 4 services, while the full file in §20.7 always includes Redis. A developer setting up the PoC using the §20.7 file as a starting point would need Redis running.

> [!WARNING]
> **Recommendation:** Either provide a separate complete `docker-compose.poc.yml` reference, or add a comment to §20.7 that the Redis service should be omitted/optional for PoC.

---

### 2. `records_monthly` divisor — `REPAIR_PLANNING_MONTHS` used for both records and repairs naming confusion

**§6.5** (line ~975): `records_monthly = records_6months / config[REPAIR_PLANNING_MONTHS]`

The config key is named `REPAIR_PLANNING_MONTHS` but is used for **records** division too. The description in §6.11 (line ~1195) says: *"Planning horizon (months); used to convert 6-month totals (records **and** repairs) to monthly averages."*

This is **functionally correct** but the naming is misleading. A key called `REPAIR_PLANNING_MONTHS` being the divisor for `records_monthly` is counter-intuitive and could lead to a developer misunderstanding its scope.

> [!NOTE]
> **Recommendation:** Consider renaming to `PLANNING_PERIOD_MONTHS` or adding a clarification to the glossary. Low priority — the description in §6.11 already explains it, but the name is a stumbling block.

---

### 3. Migration milestone numbering — M-09 vs M-11 swap

**§15.7** (line ~2647):
- `M-09` = "Concurrency / optimistic locking" — labelled as resolving S-09
- `M-11` = "PDF export" — labelled as resolving S-08

But **S-09** says *"Reversed in: M-11 (MVP)"* (line ~2514), while the table says M-09 resolves S-09. Similarly, **S-08** says *"Reversed in: M-09 (post-MVP)"* (line ~2506).

| Simplification | Says "reversed in" | Migration table says |
|---|---|---|
| S-08 (No PDF export) | M-09 | M-11 |
| S-09 (No concurrency) | M-11 | M-09 |

These are **swapped**. The S-0x labels and the M-xx table are inconsistent.

> [!CAUTION]
> **Impact: Medium.** A developer relying on the simplifications section would plan concurrency for M-11, but the migration table assigns it to M-09. One of the two must be corrected.

---

### 4. `PUT /admin/config/:key` vs `PUT /admin/config` — single key vs batch save

**§10.2** (API Design, line ~1869):
```
PUT /admin/config/:key    — Update value (marks all summaries stale)
```

**§6.11.1** (Config Validation Rules, line ~1254):
```
PUT /admin/config must run the same validation before writing.
```

The API section defines a **per-key** endpoint (`/:key`), but §6.11.1 discusses `PUT /admin/config` (no key param) with batch validation returning **multiple** violations. These are different API contracts.

> [!WARNING]
> **Recommendation:** Clarify whether the admin config endpoint is per-key (`PUT /admin/config/:key`) or batch (`PUT /admin/config` with JSON body). The validation rules in §6.11.1 imply batch save ("All violations in a single save are reported together"), which conflicts with the per-key endpoint design in §10.

---

## 🟡 Gaps / Missing Specifications

### 5. No `object_engineers.assigned_by` in PoC schema

**§5.2** (full schema, line ~695) includes `assigned_by UUID FK → users.id NULL` on `object_engineers`.

**§15.4** (PoC schema, line ~2590) lists: `object_engineers (id, object_id, engineer_id, assigned_at, assigned_by UUID NULL)` — this is present.

**Status:** ✅ Not a gap — just confirming it's consistent.

---

### 6. No `app_config` table in PoC, but §6.10 references it for invalidation

**§6.10** (Cache Invalidation Rules, line ~1175): *"`app_config` UPDATE (any calculation key) → Mark ALL `summaries.is_stale = 'TRUE'`"*

In PoC, there is no `app_config` table (config is in `application.yml`, per S-03 / §15.4), and there is no `is_stale` column (per S-02). So this invalidation rule is entirely **MVP-scope**, which is fine — but the section doesn't mark it as such. A developer implementing PoC might try to implement this rule.

> [!NOTE]
> **Recommendation:** Add a "(MVP)" annotation to the `app_config` UPDATE row in §6.10 for clarity.

---

### 7. Delete semantics for `repair_types` — HIGH-7 still unresolved

**§10.2** (line ~1855) flags HIGH-7: *"The definition of 'active' `object_repairs` that block repair-type deletion needs clarification."*

This was noted but not resolved. Questions remain:
- Should rows with `count = 0` block deletion?
- Should rows in non-active (past) periods block deletion?
- What about rows in frozen periods (post-MVP)?

> [!IMPORTANT]
> **Recommendation:** Resolve for MVP at minimum. Suggested policy: rows with `count > 0` in any period block deletion; rows with `count = 0` do not block. Past-period rows with `count > 0` also block (data integrity for historical comparisons).

---

### 8. No explicit endpoint for object hard delete cascade behaviour

**§4.1** (line ~126) says objects are **hard deleted** for PoC. **§10.2** lists `DELETE /objects/:id`. But there is no specification of what cascade actions occur:

- Does deleting an object cascade-delete `object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `object_engineers`, `summaries`?
- Are these DB-level `ON DELETE CASCADE` or application-level?
- What about `engineer_summaries` — if an object is deleted and was the only object for an engineer, should the engineer summary be recomputed?

> [!WARNING]
> **Recommendation:** Add a cascade specification for object deletion. At minimum: all child records should be cascade-deleted at DB level, and all affected engineers' summaries should be marked stale.

---

### 9. Division and Branch CRUD — missing API and UI

The TOR specifies divisions and branches as first-class entities (§5.2) but:
- **No CRUD API** is defined in §10 for `divisions` or `branches`
- **No UI pages** for creating/editing divisions or branches exist in §7.1 routes (only `/divisions` list and `/divisions/:id` detail)
- Import creates divisions/branches from data (§11.1), but manual creation is not specified

For PoC with manual data entry, there must be a way to create divisions and branches before creating objects. This appears to be a gap.

> [!IMPORTANT]
> **Recommendation:** Either (a) add `POST /divisions`, `POST /branches` API endpoints and corresponding UI, or (b) explicitly state that divisions/branches are seed data created via migration and cannot be managed through the UI.

---

### 10. `POST /auth/refresh` listed in API but PoC doesn't implement refresh tokens

**§10.2** (line ~1938) lists `POST /auth/refresh` as an API endpoint. **§21.2** (line ~2566) explicitly says: *"PoC: Refresh tokens are not implemented."*

The API section doesn't annotate which endpoints are PoC vs MVP.

> [!NOTE]
> **Recommendation:** Add "(MVP)" annotation to `POST /auth/refresh` in §10.2 to match §21.2.

---

### 11. Engineer visibility — "own objects only" vs "own data only" inconsistency

**§12** (Roles & Permissions table, line ~2066):
- "View all objects / СВОД" → Engineer: **"Own objects only"**
- "View engineer list and load ratios" → Engineer: **"Own data only"**

**§21.5** (line ~3616): *"An engineer cannot see objects in other divisions that they are not assigned to."*

But §12 says engineers can view "Own objects only" for СВОД, while §7.5 shows the Engineer List page with **all** engineers. Can engineers see the Engineer List page at all? §12 says "View engineer list and load ratios" → "Own data only" — meaning they can only see themselves?

> [!NOTE]
> **Recommendation:** Clarify whether engineers can see the `/engineers` list page (just their own row) or if the page is hidden entirely. The current text implies they can access it but only see their own data.

---

### 12. `total_repairs` column — PoC vs MVP inconsistency in summaries

**§5.2** (full schema, line ~632): `total_repairs INTEGER` exists in `summaries`.

**§15.4** (PoC schema, line ~2552): notes that *"intermediate repair fields (... total_repairs) are computed in-memory during calculation but NOT persisted in PoC."*

**AC-07** (line ~2303): *"`total_repairs` is computed in-memory during PoC calculation and is **not** stored in the PoC `summaries` schema"*

This is **documented and consistent** — just noting it as a known PoC deviation. ✅

---

### 13. XLSX import mentioned in M-01 but §11 describes JSON import

**§15.7 M-01** (line ~2649): *"XLSX import (FR bulk)"*

**§11.1** (line ~1967): The import endpoint accepts **JSON**, not XLSX: *"The server never parses XLSX directly."*

The "XLSX import" label in M-01 is misleading. The actual design is "convert XLSX outside the app → upload JSON." The M-01 description should say "JSON data import" or "Bulk data import from converted XLSX."

> [!WARNING]
> **Recommendation:** Update M-01 label from "XLSX import" to "JSON bulk import" or add a note clarifying that XLSX is converted externally first.

---

### 14. Engineer `is_active = FALSE` created by import, but S-04 says no access enforcement

**§11.1** (line ~2026): Import creates placeholder accounts with `is_active = FALSE`.

**S-04** (line ~2474): *"No role-based access control is enforced."*

In PoC, `is_active = FALSE` engineers should be hidden from assignment dropdowns (per AD-13, line ~1777). But if there's no access enforcement (S-04), is the `is_active` filtering on dropdowns considered access control or just UI filtering?

> [!NOTE]
> **Recommendation:** Clarify that `is_active` filtering on dropdowns is a **data filtering** concern (always enforced), not an access control concern. This avoids confusion about what S-04 covers.

---

### 15. `records_tasks` — normative minutes not linked to `app_config` keys in calculation

**§6.5** (line ~974): `records_6months = SUM(task_quantity[j] × records_normative[j])  for all j`

**§6.11** (lines ~1200–1204) defines 5 records normative keys: `RECORDS_ACCESS_MINUTES`, `RECORDS_MONITORING_MINUTES`, etc.

But §6.5 doesn't explicitly show **how** the normatives are applied. It uses `records_normative[j]` without mapping `j` to the specific `app_config` keys. §4.4 (line ~247) has a table mapping tasks to normatives, but §6.5 should cross-reference it.

The formula should be:
```
records_6months = access_requests × config[RECORDS_ACCESS_MINUTES]
               + monitoring_requests × config[RECORDS_MONITORING_MINUTES]
               + footage_requests × config[RECORDS_FOOTAGE_MINUTES]
               + backup_control × config[RECORDS_BACKUP_MINUTES]
               + security_admin × config[RECORDS_ADMIN_MINUTES]
```

> [!NOTE]
> **Recommendation:** Expand §6.5 to explicitly map each `records_tasks` column to its corresponding `app_config` key. Currently the mapping requires reading §4.4 and §6.11 together, which is error-prone.

---

### 16. No specification for how PoC handles config values from `application.yml`

**S-03** (line ~2466) says normatives and config are loaded as seed data in PoC.
**§15.4** (line ~2600) specifies config constants are in `application.yml` via `@ConfigurationProperties`.

But there's no specification for the YAML key structure. For example:
- Is it `workload.config.MONTHLY_HOURS_FUND` → `142.8`?
- Is it `workload.config.os-r1-visits-per-year` (kebab-case, Spring Boot convention)?
- Is it a flat map or nested?

> [!NOTE]
> **Recommendation:** Add a sample `application.yml` snippet to §15.4 showing the exact property namespace and key format for all 19 config values.

---

### 17. Missing `records_6months` in PoC summaries schema

**§15.4** (PoC summaries, line ~2558) lists `records_monthly` but does **not** list `records_6months`.

**§5.2** (full schema, line ~628) includes both `records_6months` and `records_monthly`.

Per §15.4's own note (line ~2552): intermediate fields are "computed in-memory but NOT persisted." But `records_6months` is listed in the full schema, suggesting it's intended to be persisted for traceability. The PoC schema omits it — which is fine as a simplification, but it's not called out as one.

> [!NOTE]
> **Low priority.** Consider adding `records_6months` to the PoC summary note as an explicitly omitted intermediate field.

---

### 18. `object_engineers` — no `ON DELETE CASCADE` specified for object deletion

**§5.2** `object_engineers` (line ~688) doesn't specify `ON DELETE CASCADE` from `objects.id`. If objects are hard-deleted (C-30), the `object_engineers` rows must also be removed. Without explicit cascade, the FK would block deletion or leave orphan rows depending on the default.

> [!WARNING]
> **Recommendation:** Add `ON DELETE CASCADE` to the `object_engineers.object_id` FK definition, and similarly for all child tables of `objects` (`object_devices`, `object_system_assignments`, `records_tasks`, `object_repairs`, `travel`, `summaries`).

---

## 🟢 Minor Issues / Nits

### 19. Changelog v2.8 contains text duplicated from v2.7

**Line ~16** (v2.8 changelog): ends with *"repair formula corrections. Fixed 8 locations: (1) §5 summaries column comments; (2) §6.1 pipeline Stage 5 expanded..."* — this is copy-pasted from v2.7's content. The v2.8 entry should only contain its own changes.

---

### 20. AD numbering gap: AD-09 → AD-14

**§9.2**: Architectural decisions jump from AD-09 (line ~1749) to AD-14 (line ~1752), then continue with AD-10, AD-11, AD-12, AD-13 (lines ~1767–1777). The ordering is: AD-01…AD-09, AD-14, AD-15, AD-16, AD-17, AD-18, AD-10, AD-11, AD-12, AD-13.

> [!NOTE]
> AD-10 through AD-13 (engineer module decisions added in v2.2) appear after AD-14–AD-18 (added later). This is confusing but not functionally wrong. Consider reordering to sequential AD numbering.

---

### 21. C-20 placement is out of sequence

**C-20** (line ~2269) appears **after** C-40. The v2.11 changelog (item 9, line ~19) mentions reordering C-33–C-39 but C-20 remains at the end of the clarifications section, after C-40.

---

### 22. Stale indicator wording inconsistency

- **§7.2** (line ~1395): `"Пересчитывается..."` for СВОД tab stale indicator
- **§7.10** (line ~1595): `"Пересчитывается..."` for engineer summaries
- **§7.9** (line ~1583): `"Данные устарели — нажмите Пересчитать"` for СВОД table rows

These are different indicators for the same concept (stale data). The first two suggest the system is actively recalculating; the third prompts the user to trigger recalculation. In PoC (synchronous recalc), the first two shouldn't appear. In MVP (on-demand recalc), the third is correct.

> [!NOTE]
> **Recommendation:** Unify the wording. For on-demand recalculation (MVP), the correct prompt is "Данные устарели — нажмите Пересчитать." For PoC (synchronous), no stale indicator should ever appear.

---

## Assessment

| Category | Count |
|---|---|
| 🔴 Contradictions (require fix) | 4 |
| 🟡 Gaps (require specification) | 14 |
| 🟢 Minor issues / nits | 4 |
| **Total findings** | **22** |

The document has improved enormously through 11 versions of review. The most critical items to resolve before implementation are:

1. **M-09 / M-11 milestone swap** (#3) — blocks correct planning
2. **Object deletion cascade specification** (#8, #18) — blocks schema design
3. **Division/Branch CRUD** (#9) — blocks PoC manual data entry
4. **Config endpoint contract (per-key vs batch)** (#4) — blocks API implementation
