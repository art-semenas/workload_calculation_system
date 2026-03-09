## 8. Non-Functional Requirements

### 8.1 Performance
> See §5.3 for the indexing strategy that supports these targets.

- СВОД page (100 rows, paginated) loads in under 3 seconds.
- Single object summary recalculation completes in under 200ms.
- Bulk recalculation of all 2,935 objects completes within 60 seconds (background job).
- Device catalog assignment dropdown returns results in under 300ms for up to 1,000 device types.
- Engineer detail page loads in under 2 seconds for an engineer with up to 500 assigned objects.
- Engineer list page (all engineers, paginated 50/page) loads in under 2 seconds.

### 8.2 Scalability
- Support up to 10,000 objects and 500 device types without architectural changes.
- Support up to 500 engineers and 50 concurrent users.

### 8.3 Security
> Full security hardening requirements are defined in §21. This section lists the functional security constraints that affect API and UI design.

- Authentication required for all routes except `/login` and `/actuator/health`.
- HTTPS (TLS) only in production, enforced at Nginx reverse proxy level.
- JWT-based stateless authentication; tokens validated on every request by Spring Security filter chain.
- CSRF protection: not required for stateless JWT APIs (no session cookies). Ensure `SameSite=Strict` on any cookies used.
- Input validation via Spring Validation (Jakarta Bean Validation) on all DTOs; numeric fields validated for range and non-null.
- All changes to `device_system_contexts`, `device_types`, `repair_types`, `app_config`, `object_engineers`, and `users.capacity_fte` written to `audit_log`.
- **Rate limiting:** Bucket4j applied at the Spring filter level. Default limits: 100 requests/minute per IP for unauthenticated endpoints; 300 requests/minute per user-id for authenticated endpoints. Admin-configurable via environment variables. Exceeding limit returns HTTP 429 with `Retry-After` header.
- **Sensitive endpoint protection:** `/actuator/*` endpoints (except `/actuator/health`) are accessible only from internal network (Nginx blocks external access to `/actuator`).

### 8.4 Data Integrity
- `ON DELETE RESTRICT` on `object_system_assignments.context_id → device_system_contexts.id`.
- `ON DELETE RESTRICT` on `object_repairs.repair_type_id → repair_types.id`.
- Deleting a `device_type` that has `object_devices` rows is blocked (application-level guard + DB constraint).
- Deleting a `users` record with role `engineer` that has active `object_engineers` rows is blocked until all assignments are removed.
- `is_stale = TRUE` is set in the **same transaction** as the data change — for both `summaries` and `engineer_summaries`.
- All NULL quantities treated as 0 in calculations.
- `engineer_summaries` recalculation must wait for all dependent `summaries` to be current (worker ordering constraint).

### 8.5 Availability
- Uptime target: 99% during business hours (08:00–20:00 local time, Mon–Fri).

### 8.6 Browser Support
- Chrome, Firefox, Edge — latest two major versions.
- Minimum resolution: 1280×768.

---

## 9. Architecture Constraints

### 9.1 Technology Stack

#### Backend

| Component | Choice | Notes |
|---|---|---|
| Runtime | Java 21 (LTS) | Long-term support; virtual threads available for async if needed |
| Framework | Spring Boot 3.x | Auto-configuration, production-ready defaults |
| REST | Spring Web (MVC) | Standard REST controllers |
| Persistence | Spring Data JPA (Hibernate) | ORM over PostgreSQL; DECIMAL precision preserved via `BigDecimal` |
| Security | Spring Security + JWT | Stateless JWT auth; refresh tokens in MVP |
| Validation | Spring Validation (Jakarta) | Bean validation on DTOs; Zod mirrors on frontend |
| Metrics | Spring Boot Actuator | Exposes `/actuator/health`, `/actuator/metrics`, `/actuator/prometheus` |
| Build | Maven | Dependency management; multi-module layout for PoC→MVP |
| DTO mapping | MapStruct | Compile-time DTO↔entity mapping; no reflection overhead |
| Boilerplate | Lombok | `@Data`, `@Builder`, `@RequiredArgsConstructor` — optional per class |
| Logging | log4j2 | JSON layout for structured logging (see §18); SLF4J as facade |
| XLSX processing | Apache POI | Industry-standard Java XLSX read/write; replaces openpyxl |

#### Database & Migrations

| Component | Choice | Notes |
|---|---|---|
| Database | PostgreSQL | FK constraints, `DECIMAL` precision, `JSONB` audit column |
| Migrations | Liquibase | Versioned changelogs in `src/main/resources/db/changelog`; runs on startup |

#### Caching & Async Processing

| Component | Choice | Notes |
|---|---|---|
| Cache + Queue | Redis | Dual use: (1) background job queue for recalculation; (2) optional response cache. See AD-17 for scope. |
| Job integration | Spring Data Redis / Redisson | Redis-backed queue; Spring `@Async` or Redisson `RQueue` for job dispatch |

#### Frontend

| Component | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Strict mode; functional components only |
| Build | Vite | Fast HMR; production build with tree-shaking |
| Routing | React Router v6 | File-based route structure |
| Server state | TanStack Query | Caching, background refetch, stale-while-revalidate |
| Client state | Zustand (preferred) or Redux Toolkit | Zustand for PoC (lighter); Redux Toolkit if state complexity grows in MVP |
| UI components | Material UI (MUI) v5+ | Consistent design system; MUI DataGrid for СВОД table |
| HTTP | Axios | Interceptors for JWT injection and 401 handling |
| Forms | React Hook Form + Zod | Client-side schema validation mirrors server-side Bean Validation |

#### Testing

| Tool | Scope |
|---|---|
| JUnit 5 | Unit tests — services, calculation engine, mappers |
| Mockito | Mock dependencies in unit tests |
| Testcontainers (PostgreSQL) | Integration tests — repository layer against real DB |
| RestAssured | API integration tests — full HTTP round-trip |
| WireMock | External API mocking (future integrations) |
| Jacoco | Code coverage reports; minimum threshold defined in §19 |

#### Infrastructure

| Component | Choice | Notes |
|---|---|---|
| Containerisation | Docker | One image per service |
| Local orchestration | Docker Compose | 5 containers: backend, frontend, PostgreSQL, Redis, Nginx |
| Reverse proxy | Nginx | TLS termination, static frontend serving, API proxy |
| CI/CD | GitHub Actions | See §20 |
| APM / Monitoring | Datadog | See §18 |
| Rate limiting | Bucket4j | Token-bucket algorithm; applied per-IP and per-user-id at API gateway layer |

### 9.2 Architectural Decisions

**AD-01: Equipment schema is fully dynamic.**
No `equipment_os`, `equipment_ps`, `equipment_video` tables exist. All equipment data lives in `object_devices` and `object_system_assignments`. Adding a new device type requires only inserting into `device_types` and `device_system_contexts` — zero migrations, zero code changes.

**AD-02: Normatives live on (device, system_type) context pairs, not on devices.**
`device_system_contexts` is the normatives store. R1/R2 values are meaningless without specifying both device and system context. There is no flat "normatives" table.

**AD-03: System type determines visit frequency, not device type.**
Visit frequency (R1/R2 visits per year) is read from `app_config` keyed by system type. Device properties have no influence on visit frequency.

**AD-04: Physical and maintained quantities are independent.**
`quantity_physical` tracks hardware assets. `quantity_maintained` drives calculations. The application must never auto-derive one from the other after import. They can and will legitimately differ.

**AD-05: Context deletion with active assignments is hard-blocked.**
`ON DELETE RESTRICT` FK from `object_system_assignments.context_id → device_system_contexts.id` prevents deletion at the database level. The API additionally returns a 409 with a list of affected objects before the user attempts deletion.

**AD-06: Repair types are a catalog, not hardcoded columns.**
`repair_types` + `object_repairs` replace the 25-column fixed repairs table. New repair operations are added via admin UI, no schema changes needed.

**AD-07: All calculations are server-side only.**
The frontend never computes workload values. It reads exclusively from `summaries`. This prevents calculation drift from UI bugs and ensures all users see consistent values.

**AD-08: Summaries use explicit staleness tracking.**
`is_stale` is set synchronously on write, cleared on successful recalculation. Background worker recalculates asynchronously. The UI reads `is_stale` and shows an indicator. This prevents serving stale data silently while maintaining write performance.

**AD-09: All calculation constants are read from `app_config` at compute time.**
The calculation service must reload config values for each recalculation batch, not cache them for the process lifetime. This ensures admin changes to constants take effect immediately in the next triggered recalculation.

**AD-14: Recalculation is on-demand, not event-driven.**
The system marks summaries stale automatically on data change, but does not auto-trigger recalculation. Recalculation runs only when an admin explicitly triggers it. This is the correct model for PoC — it avoids cascading background load during bulk data entry and gives operators control over when they see updated numbers. Post-MVP may move to automatic triggers.

**AD-15: Period is the unit of data versioning for operational data.**
`object_repairs` and `records_tasks` are period-scoped. All other data (equipment, travel, assignments) is current-state only — no period versioning. This means СВОД can be computed for any historical period by using that period's repair/records rows with current equipment and normatives. Historical equipment states are not tracked in PoC.

**AD-16: Travel time is per-object, set by whoever enters data.**
Travel data reflects the distance from the responsible engineer's home division base to the object. It is a manually entered field — the system does not compute it. When engineer assignment changes, the travel field must be manually reviewed. The home division of the engineer is the reference, but no automatic distance calculation is implemented.

**AD-17: Redis scope is job queue first, cache second.**
Redis serves two purposes. Primary: the recalculation job queue — stale summary IDs are pushed to a Redis list; the background worker pops and processes them. Secondary (MVP only): response caching for aggregation endpoints (§16.7) if query latency becomes measurable under load. For PoC, Redis is used for the job queue only. Aggregation queries run live against PostgreSQL (on-the-fly per §16 decision). No business data is stored in Redis — it is a transient layer only. If Redis is unavailable, the system degrades gracefully: recalculation is blocked but all read/write operations against PostgreSQL continue.

**AD-18: All API responses go through DTOs — never raw JPA entities.**
MapStruct compile-time mappers translate between JPA entities and DTOs for all request/response cycles. JPA entities are never serialised directly to JSON. This prevents accidental exposure of lazy-loaded relations, internal fields (`password_hash`, `is_stale` internals), and database-level annotations leaking into the API contract. The DTO layer is the API contract. Changing internal entity structure does not break the API as long as mappers are updated.

**AD-10: Engineers are users, not a separate entity.**
An engineer is a `users` row with `role = 'engineer'`. There is no separate `engineers` table. `capacity_fte`, `home_division_id`, and `employee_id` are columns on `users`. This keeps authentication, role management, and engineer data in one place. The distinction between `division_id` (editor access scope) and `home_division_id` (engineer display home) must be explicitly maintained — they serve different purposes.

**AD-11: Engineer workload split ratio is always computed, never stored.**
`engineer_count` per object is a live COUNT query. Storing it would require updating it on every assignment change. Because the split is equal and the count is cheap to compute from `object_engineers`, it is calculated at summary computation time and not persisted.

**AD-12: Engineer summaries have a strict computation dependency on object summaries.**
The background worker must process stale object summaries before processing stale engineer summaries. An engineer summary computed from a stale object summary would silently propagate incorrect values. The worker queue must enforce this ordering — either via separate queues with priority, or by checking `summaries.is_stale = FALSE` for all assigned objects before computing an engineer summary.

**AD-13: Soft delete for engineers.**
Deactivated engineers (e.g., left the organisation) must not be hard-deleted if they have historical `object_engineers` assignments. Add `is_active BOOLEAN DEFAULT TRUE` to `users`. Inactive engineers are hidden from assignment dropdowns but their historical data is preserved. Their load still counts in division totals unless explicitly reassigned.

---

