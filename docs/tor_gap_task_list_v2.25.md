# TOR v2.25 Gap Resolution Task List

## Priority Summary

| ID   | Priority | Task                                                                                 | Why it matters                                                                                      |
|------|----------|--------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| T-01 | High     | Fix §15.8 continuity table — remove `period_id` from `engineer_summaries` M-06 row  | Developer implementing M-06 will add a column to `engineer_summaries` that §5 does not define      |
| T-02 | Medium   | Add Post-MVP scope annotation to `GET /svod/export/pdf` in §10.2                    | PoC developer sees both export endpoints without realising PDF is post-MVP; may implement it early  |
| T-03 | Medium   | Add "MVP only — requires M-01" annotation to `/import` route in §7.1                | Same annotation gap pattern as catalog routes fixed in v2.24 T-02; inconsistent scoping in §7.1    |
| T-04 | Medium   | Add `WORKLOAD_CONFIG_*` comment to PoC Docker Compose in §15.8                      | Developer copying the compose example will get a Spring startup failure with no obvious cause       |

---

## T-01 — Fix §15.8 continuity table: `period_id` incorrectly attributed to `engineer_summaries`

**Priority:** High

### Problem

The "Schema continuity guarantee" table in §15.8 contains the following row:

| Column                  | Table                               | Added in                  |
|-------------------------|-------------------------------------|---------------------------|
| `is_stale`, `period_id` | `summaries`, `engineer_summaries`   | M-06 (staleness tracking) |

This row claims that **both** `is_stale` and `period_id` are added to **both** `summaries` and `engineer_summaries` in M-06.

However, the full §5.2 schema for `engineer_summaries` is:

```sql
id, engineer_id, total_load, object_count,
os_load, ps_load, video_load, records_load, repair_load,
capacity_fte, load_ratio, status,
is_stale VARCHAR(20), computed_at
```

There is **no `period_id`** in `engineer_summaries`. The `period_id` column on `summaries` tracks "which period was used for this computation" — a concept that applies to object-level summaries (which aggregate period-scoped repairs and records) but not to engineer-level summaries (which aggregate across all objects at their current state).

The §5.2 `summaries` table has both `is_stale` and `period_id`. The §5.2 `engineer_summaries` table has `is_stale` only.

### Why this matters

A developer implementing M-06 will consult §15.8 to learn exactly which columns to add. The current row tells them to add `period_id` to `engineer_summaries`. They will write a Liquibase migration adding this column to `engineer_summaries` that contradicts the canonical §5 schema. This creates a schema divergence from the spec that requires a follow-up correction migration.

### Affected TOR areas

- [§15.8 continuity table](TOR_Workload_WebApp.md#L3161) — the `is_stale`, `period_id` row
- [§5.2 `engineer_summaries` schema](TOR_Workload_WebApp.md#L718) — confirms no `period_id`
- [§5.2 `summaries` schema](TOR_Workload_WebApp.md#L618) — confirms `period_id` present here only

### Required resolution

Split the single row into two rows:

```markdown
| `is_stale`              | `summaries`, `engineer_summaries`   | M-06 (staleness tracking)       |
| `period_id`             | `summaries`                         | M-06 (active-period traceability) |
```

Add a brief inline note: `period_id` on `summaries` records the period used for the latest computation (for traceability). `engineer_summaries` has no period concept — engineer workload aggregates the current state of all assigned objects.

---

## T-02 — Add Post-MVP scope annotation to `GET /svod/export/pdf` in §10.2

**Priority:** Medium

### Problem

§10.2 lists the СВОД & Summary endpoints as:

```
GET    /svod                           All summaries (paginated, filterable)
GET    /svod/export/xlsx               Export to XLSX (active period by default; ?period_id= for historical)
GET    /svod/export/pdf                Export to PDF (active period by default; ?period_id= for historical)
```

There is no scope annotation on either export endpoint. A developer reading §10.2 to build the PoC API layer will see both `/xlsx` and `/pdf` endpoints and has no signal that PDF export is Post-MVP.

Contrast with how other MVP/Post-MVP endpoint groups in §10.2 are annotated:

```
#### App Configuration _(MVP only — requires M-10)_
#### Planning Periods _(MVP only — requires M-07)_
#### Recalculation (on-demand) _(MVP only — not available in PoC)_
```

The canonical rules are:
- S-08: PoC exports СВОД to **XLSX only**; PDF export is out of scope
- M-11: PDF export (Post-MVP)
- AC-28: `GET /svod/export/pdf` — `_(MVP — requires M-11)_`

The XLSX endpoint is in scope for PoC (§15.5 PoC routes include `/svod/export`). The PDF endpoint is not.

### Why this matters

A PoC developer reading §10.2 sees two export endpoints with identical descriptions and no scope markers. They may implement `GET /svod/export/pdf` (using Apache POI or a PDF library) as part of the PoC, adding implementation effort for a feature that is explicitly out of PoC scope.

### Affected TOR areas

- [§10.2 СВОД & Summary endpoints](TOR_Workload_WebApp.md#L2126) — lines 2128–2132
- [§15.3 S-08](TOR_Workload_WebApp.md#L2905) — PoC XLSX-only rule
- [§15.7 M-11](TOR_Workload_WebApp.md#L3067) — PDF export is Post-MVP
- [§14 AC-28](TOR_Workload_WebApp.md#L2793) — already carries `_(MVP — requires M-11)_` annotation

### Required resolution

Add an inline scope annotation to the PDF endpoint:

```
GET    /svod/export/xlsx               Export to XLSX (active period by default; ?period_id= for historical)
GET    /svod/export/pdf                Export to PDF (active period by default; ?period_id= for historical) — **Post-MVP — requires M-11 (S-08)**
```

Alternatively, add a sub-section header and note matching the style of other scoped groups:

```
#### СВОД Export

> **PoC:** Only `GET /svod/export/xlsx` is available. `GET /svod/export/pdf` is Post-MVP (S-08, M-11) and is not implemented in PoC.
```

---

## T-03 — Add "MVP only — requires M-01" annotation to `/import` route in §7.1

**Priority:** Medium

### Problem

The §7.1 route table contains:

| Route     | View   | Description                        |
|-----------|--------|------------------------------------|
| `/import` | Import | JSON / text-list import wizard     |

There is no scope annotation on this row.

The canonical rules are:
- S-06: "JSON bulk import is manual — import via UI is MVP" (reversed in M-01)
- §15.5 PoC UI routes: `/import` is **absent** from the PoC route list
- §11.1 header: `_(MVP — requires M-01)_` — annotated correctly
- §10.2 `POST /import/data`: no explicit MVP annotation, but §11.1 scope preamble covers it

Compare with the catalog routes in §7.1 that were annotated in v2.24 T-02:

| Route              | Description                                                                                      |
|--------------------|--------------------------------------------------------------------------------------------------|
| `/catalog/devices` | List / create / edit device types and contexts — **PoC: read-only seed data, no management UI (S-03, M-04)** |

The same pattern should apply to `/import`.

### Why this matters

A developer building the PoC UI using §7.1 as the primary route reference will see `/import` listed as a route without qualification. Per §15.1, the PoC goal is a focused demonstration of the calculation engine using ~20–50 manually entered objects — the import wizard is not needed. Implementing it adds unnecessary complexity to the PoC.

### Affected TOR areas

- [§7.1 route table](TOR_Workload_WebApp.md#L1434) — `/import` row
- [§15.3 S-06](TOR_Workload_WebApp.md#L2889) — import via UI is MVP
- [§15.5 PoC UI routes](TOR_Workload_WebApp.md#L3012) — `/import` absent

### Required resolution

Add a scope annotation to the `/import` row in §7.1:

```markdown
| `/import` | Import | JSON / text-list import wizard — **MVP only — requires M-01 (S-06)** |
```

The canonical description pattern should match existing MVP-labelled rows: `Route description — MVP only — requires M-xx`.

---

## T-04 — Add `WORKLOAD_CONFIG_*` comment to PoC Docker Compose in §15.8

**Priority:** Medium

### Problem

The PoC Docker Compose example in §15.8 shows the backend service environment block as:

```yaml
  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/workload
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      # SPRING_REDIS_HOST is NOT set — Redis disabled in PoC
```

There is no mention of the 19 `WORKLOAD_CONFIG_*` environment variables that bind calculation constants for the PoC (S-03 / AD-09).

§15.4 PoC schema includes a comment documenting this requirement:

```sql
-- Config constants — injected as Docker environment variables for PoC (S-03)
-- Spring maps WORKLOAD_CONFIG_<KEY> → @ConfigurationProperties(prefix="workload.config")
-- Naming convention: WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES=15 (see §6.11 for full key list)
-- Application fails to start (Spring binding exception) if any required env var is missing or type-invalid
```

But a developer following §15.8 to set up the PoC Docker environment will not see this requirement in the compose file itself.

§6.11 lists all 19 required keys with their defaults. If any key is missing, Spring's `@ConfigurationProperties` binding fails at startup with a binding exception — the application refuses to start with no HTTP endpoints exposed.

### Why this matters

A developer copying the §15.8 compose file verbatim will get a Spring startup failure when they first run `docker compose -f docker-compose.poc.yml up`. The error message (a Spring binding exception) is not obvious about the root cause. Adding a comment pointing to §6.11 makes the requirement discoverable without reading the entire TOR.

### Affected TOR areas

- [§15.8 PoC Docker Compose environment block](TOR_Workload_WebApp.md#L3113) — backend service environment
- [§6.11 app_config table — full key list](TOR_Workload_WebApp.md#L1227)
- [§15.3 S-03](TOR_Workload_WebApp.md#L2855) — constants injected via Docker env vars in PoC
- [§15.4 PoC schema comment](TOR_Workload_WebApp.md#L3003) — documents the requirement

### Required resolution

Add a comment block to the backend `environment:` section in the compose example:

```yaml
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/workload
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      # SPRING_REDIS_HOST is NOT set — Redis disabled in PoC
      # WORKLOAD_CONFIG_* env vars are REQUIRED for startup (S-03, AD-09).
      # All 19 keys must be set — see §6.11 for the full list and default values.
      # Example: WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS=6
      # Missing or type-invalid vars cause a Spring binding exception (startup failure).
```
