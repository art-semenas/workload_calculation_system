**Write the following implementation plans ** Do NOT execute any plan. Do NOT write any application code. Plans only.

### Plan format

Follow the format in `docs/superpowers/plans/2026-03-30-poc-scaffolding.md` exactly:

- TDD: write failing test → run → implement → run → commit
- Exact file paths, complete code in every step, exact commands with expected output
- No placeholders, no "TBD", no "similar to above"
- Save to `docs/superpowers/plans/YYYY-MM-DD-<name>.md`

### Branch strategy

Each plan is implemented on its own branch, checked out from `feature/implementation`. Include these exact git commands at the **start** of every plan (before Task 1), as a **Task 0: Create feature branch**:

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/<branch-name>
```

Branch names:
| Plan | Branch |
|---|---|
| poc-m01-backend | `feature/poc-m01-backend` |
| poc-m01-frontend | `feature/poc-m01-frontend` |
| poc-m02-backend | `feature/poc-m02-backend` |
| poc-m02-frontend | `feature/poc-m02-frontend` |
| poc-m03-backend | `feature/poc-m03-backend` |
| poc-m03-frontend | `feature/poc-m03-frontend` |

And at the **end** of every plan, as a final step in the last task:

```bash
git push -u origin feature/<branch-name>
```

Do not implement anything. The plans will be executed in a later session in this order:

1. scaffolding (already implemented on `feature/implementation`)
2. `feature/poc-m01-backend` — merge to `feature/implementation` when done
3. `feature/poc-m01-frontend` — merge to `feature/implementation` when done
4. `feature/poc-m02-backend` — merge to `feature/implementation` when done
5. `feature/poc-m02-frontend` — merge to `feature/implementation` when done
6. `feature/poc-m03-backend` — merge to `feature/implementation` when done
7. `feature/poc-m03-frontend` — merge to `feature/implementation` when done

---

## Reference documents

Before writing any plan, read these files in full. They are the source of truth for all scope decisions:

| File                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `docs/impl/epics/poc-m01-core-crud.md`   | M-01 scope, ACs, endpoint list, table list                            |
| `docs/impl/epics/poc-m02-calculation.md` | M-02 scope, ACs, endpoint list, calculation pipeline                  |
| `docs/impl/api-spec.md`                  | Full API contract — request/response shapes, error codes, HTTP status |
| `docs/impl/db-schema.md`                 | Full DB schema — column types, constraints, indexes                   |
| `docs/impl/ui-spec.md`                   | Full UI specification — per-page layout, columns, filters, RBAC       |
| `docs/impl/calculation-engine.md`        | Exact calculation formulas (§6)                                       |
| `docs/impl/poc-scope.md`                 | PoC simplifications S-02 through S-10                                 |
| `docs/impl/testcontainers-setup.md`      | Testcontainers/RestAssured boilerplate for integration tests          |
| `docs/TOR_Workload_WebApp.md`            | Source of truth for all business rules                                |

---

## Plan 1: `poc-m01-backend.md`

**File:** `docs/superpowers/plans/2026-03-30-poc-m01-backend.md`
**Branch:** `feature/poc-m01-backend`
**Epic:** `docs/impl/epics/poc-m01-core-crud.md`
**Goal:** All backend code for PoC M-01 — JPA entities, Liquibase migration for `users` table, repositories, MapStruct mappers, DTOs, service layer, REST controllers, Spring Security + JWT, Bucket4j, GlobalExceptionHandler. All 35 endpoints from the epic. All unit + integration tests.

### Tasks

**Task 0: Create feature branch** (git commands as specified above)

**Task 1: JPA entities**

Write failing test first (`EntityStructureTest` — verifies schema via `@DataJpaTest` against Testcontainers). Then create:

- `entity/Division.java` — `id UUID`, `name VARCHAR(255) NOT NULL UNIQUE`, `created_at`, `updated_at`
- `entity/Branch.java` — `id UUID`, `name`, `division` (ManyToOne), `created_at`, `updated_at`
- `entity/ObjectEntity.java` — `id UUID`, `name`, `branch` (ManyToOne), `import_seq_no INTEGER`, `created_at`, `updated_at`
- `entity/DeviceType.java` — `id UUID`, `name`, `description TEXT`, `created_at`, `updated_at` (read-only seed; no write UI in PoC but API endpoints exist per api-spec.md)
- `entity/DeviceSystemContext.java` — `id UUID`, `deviceType` (ManyToOne), `systemType` (enum: OS/PS/VIDEO), `r1Minutes DECIMAL(10,4)`, `r2Minutes DECIMAL(10,4)`
- `entity/ObjectDevice.java` — `id UUID`, `object` (ManyToOne), `deviceType` (ManyToOne), `quantityPhysical DECIMAL(10,2)`; UNIQUE(object_id, device_type_id)
- `entity/ObjectSystemAssignment.java` — `id UUID`, `object` (ManyToOne), `deviceType` (ManyToOne), `context` (ManyToOne → DeviceSystemContext), `systemType` (enum), `quantityMaintained DECIMAL(10,2)`; UNIQUE(object_id, device_type_id, system_type)
- `entity/RepairType.java` — `id UUID`, `name`, `timeMinutes DECIMAL(10,4)` (read-only seed)
- `entity/ObjectRepair.java` — `id UUID`, `object` (ManyToOne), `repairType` (ManyToOne), `count INT`; UNIQUE(object_id, repair_type_id)
- `entity/RecordsTask.java` — `id UUID`, `object` (ManyToOne UNIQUE), `accessRequests`, `monitoringRequests`, `footageRequests`, `backupControl`, `securityAdmin` (all DECIMAL(10,2) — matches db-schema.md column names)
- `entity/Travel.java` — `id UUID`, `object` (ManyToOne UNIQUE), `transportType VARCHAR(100)`, `distanceKm DECIMAL(8,2)`, `oneWayTimeMin DECIMAL(8,2)` — `round_trip_min` is never stored (derived as `one_way_time_min × 2` in the DTO/mapper)
- `entity/User.java` — `id UUID`, `email VARCHAR(255) UNIQUE`, `name`, `passwordHash`, `role` (enum with lowercase persistence via JPA `@Converter`: admin/editor/engineer/viewer), `divisionId UUID`, `homeDivisionId UUID`, `capacityFte DECIMAL(4,2)`, `employeeId`, `isActive BOOLEAN`, `requiresActivation BOOLEAN`, `createdAt`, `updatedAt` (NO `failed_login_count`, NO `locked_until` — PoC exclusions from poc-scope.md)

Each entity uses `@Table`, `@Column(nullable=false)` constraints that match `db-schema.md` exactly. All use Lombok `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`.

**Task 2: Seed PoC admin user (`v1.0.2`)**

The `v1.0.0` schema already created ALL PoC tables including `users`, `object_engineers`, and `engineer_summaries`. No additional schema migration is needed. This task only adds a seed admin user.

Write `v1.0.2-seed-admin.xml`: one admin user with bcrypt-hashed password, role `'admin'` (lowercase — matches db-schema.md and `v1.0.0` default `'viewer'`), `is_active=TRUE`, `requires_activation=FALSE`. Include rollback block.

TDD: Update `WorkloadApplicationTest` to verify the seed admin row is present (assert `role = 'admin'`).

**Task 3: Repositories**

One interface per entity extending `JpaRepository<Entity, UUID>`. Add custom query methods where needed:

- `DivisionRepository` — `findByName(String)`
- `BranchRepository` — `findAllByDivisionId(UUID)`
- `ObjectRepository` — `findAllByBranchId(UUID)`, `findAllByBranchDivisionId(UUID)`
- `ObjectDeviceRepository` — `findByObjectIdAndDeviceTypeId(UUID, UUID)`, `deleteByObjectIdAndDeviceTypeId(UUID, UUID)`
- `ObjectSystemAssignmentRepository` — `findAllByObjectId(UUID)`, `findByObjectIdAndDeviceTypeIdAndSystemType(UUID, UUID, SystemType)`
- `ObjectRepairRepository` — `findAllByObjectId(UUID)`, `findByObjectIdAndRepairTypeId(UUID, UUID)`
- `RecordsTaskRepository` — `findByObjectId(UUID)`
- `TravelRepository` — `findByObjectId(UUID)`
- `UserRepository` — `findByEmail(String)`, `findAllByRoleAndIsActive(Role, boolean)`

TDD: write `@DataJpaTest` for each repository with Testcontainers, verify CRUD + constraints (unique violations throw `DataIntegrityViolationException`).

**Task 4: DTOs and MapStruct mappers**

DTOs for every request and response — no entity exposure in API (AD-14). Naming: `DivisionDto`, `DivisionCreateRequest`, `BranchDto`, `ObjectDto`, `ObjectCreateRequest`, `ObjectUpdateRequest` (no `branchId` — objects are not moved between branches), `ObjectDeviceDto`, `ObjectDeviceUpsertRequest`, `AssignmentDto`, `AssignmentCreateRequest`, `RepairDto`, `RepairUpdateRequest`, `RecordsDto`, `RecordsUpdateRequest`, `TravelDto`, `TravelUpdateRequest`, `DeviceTypeDto`, `DeviceSystemContextDto`, `RepairTypeDto`, `SummaryDto`, `UserDto`, `LoginRequest`, `LoginResponse`, `ApiResponse<T>` (envelope with `data`, `meta`, `error` — null fields always present, never omitted), `ApiMeta` (with `per_page` field using `@JsonProperty`), `ApiError` (with `affected_count` using `@JsonProperty`).

MapStruct mappers: one per entity group. All `@Mapper(componentModel = "spring")`. Mappings verified with `@MappingTest` (unit tests — no Spring context).

**Task 5: Spring Security + JWT**

Write failing integration test for `/auth/login` first (`AuthControllerTest`).

Implement:

- `JwtTokenProvider` — signs/validates JWTs using `jjwt 0.12.6`; secret from env `JWT_SECRET`; 8h expiry for PoC
- `JwtAuthenticationFilter` — extends `OncePerRequestFilter`; reads `Authorization: Bearer <token>`; sets `SecurityContextHolder`
- `SecurityConfig` — permit `/auth/**`, `/actuator/health`; require JWT for everything else; stateless session; no CSRF
- `AuthController` — `POST /auth/login` → validates email/password, returns `LoginResponse { token, user }`. `POST /auth/logout` → 204 (stateless — client discards token). `GET /auth/me` → returns `UserDto` from security context.
- `UserDetailsServiceImpl` — loads user by email for Spring Security
- Password encoding: `BCryptPasswordEncoder` bean

Tests: `AuthControllerTest` — login with valid credentials returns 200 + JWT; wrong password returns 401 `INVALID_CREDENTIALS`; missing user returns 401; protected endpoint without token returns 401; protected endpoint with valid token returns 200.

**Task 6: Bucket4j rate limiting**

`RateLimitFilter` — per-IP bucket, 100 req/min (matches existing `RateLimitConfig`). Applied to all `/api/**` routes. Returns HTTP 429 with error code `RATE_LIMIT_EXCEEDED` when exceeded. In-memory `ConcurrentHashMap<String, Bucket>` — no Redis (PoC).

TDD: `RateLimitFilterTest` — mock filter chain, verify 429 after limit exceeded, 200 within limit.

**Task 7: GlobalExceptionHandler**

`@RestControllerAdvice` mapping every exception to `ApiResponse<Void>` with TOR error codes:

- `EntityNotFoundException` → 404 (codes: `OBJECT_NOT_FOUND`, `DIVISION_NOT_FOUND`, `BRANCH_NOT_FOUND`, `ENGINEER_NOT_FOUND`, etc.)
- `DataIntegrityViolationException` (constraint violation) → 409 `CONSTRAINT_VIOLATION`
- `DeviceNotInInventoryException` → 422 `DEVICE_NOT_IN_INVENTORY`
- `NoContextForSystemException` → 422 `NO_CONTEXT_FOR_SYSTEM`
- `RoundTripNotEditableException` → 422 `ROUND_TRIP_NOT_EDITABLE`
- `MethodArgumentNotValidException` → 422 `VALIDATION_ERROR`
- `AccessDeniedException` → 403 `ACCESS_DENIED`
- `AuthenticationException` → 401 `UNAUTHENTICATED`
- Unhandled → 500 `INTERNAL_ERROR`

TDD: `GlobalExceptionHandlerTest` — one test per exception type.

**Task 8: Division and Branch controllers + services**

TDD cycle for each endpoint:

`DivisionService`:

- `findAll()` → `List<DivisionDto>`
- `findById(UUID)` → `DivisionDto` or throw `EntityNotFoundException`
- `create(DivisionCreateRequest)` → `DivisionDto`
- `update(UUID, DivisionUpdateRequest)` → `DivisionDto`
- `findBranches(UUID)` → `List<BranchDto>`
- `createBranch(UUID divisionId, BranchCreateRequest)` → `BranchDto`

`BranchService`:

- `findById(UUID)` → `BranchDto`
- `update(UUID, BranchUpdateRequest)` → `BranchDto`

`DivisionController` — `GET /divisions`, `POST /divisions`, `GET /divisions/{id}`, `PUT /divisions/{id}`, `GET /divisions/{id}/branches`, `POST /divisions/{id}/branches`
`BranchController` — `GET /branches/{id}`, `PUT /branches/{id}`

Unit tests: `DivisionServiceTest` (Mockito), `BranchServiceTest` (Mockito).
Integration tests: `DivisionControllerIT` (RestAssured + Testcontainers) — all endpoints, validation errors, 404 cases.

**Task 9: Object controller + service**

`ObjectService`:

- `findAll(Optional<UUID> divisionId)` → `List<ObjectDto>` (filter by division via branch join when provided)
- `findById(UUID)` → `ObjectDto`
- `create(ObjectCreateRequest)` → `ObjectDto` — validates `branch_id` exists; returns 422 if not
- `update(UUID, ObjectUpdateRequest)` → `ObjectDto`
- `delete(UUID)` — cascade-deletes all child rows (devices, assignments, records, repairs, travel, summaries when M-02 is merged)

`ObjectController` — `GET /objects`, `POST /objects`, `GET /objects/{id}`, `PUT /objects/{id}`, `DELETE /objects/{id}`, `GET /objects/{id}/summary` (stub — returns 404 `SUMMARY_NOT_FOUND` when no `summaries` row exists; meaningful results after M-02)

TDD: unit tests (`ObjectServiceTest`) + integration tests (`ObjectControllerIT`) covering AC-24, AC-25.

**Task 10: Equipment endpoints (devices + assignments)**

`EquipmentService`:

- `getDevices(UUID objectId)` → `List<ObjectDeviceDto>`
- `addDevice(UUID objectId, ObjectDeviceUpsertRequest)` → `ObjectDeviceDto`
- `updateDevice(UUID objectId, UUID deviceTypeId, ObjectDeviceUpsertRequest)` → `ObjectDeviceDto`
- `removeDevice(UUID objectId, UUID deviceTypeId)` — blocks if any assignments exist for this device at this object (409 `DEVICE_HAS_ASSIGNMENTS`)
- `getAssignments(UUID objectId)` → `List<AssignmentDto>`
- `addAssignment(UUID objectId, AssignmentCreateRequest)` — validates: device must be in `object_devices` (AC-11 → 422 `DEVICE_NOT_IN_INVENTORY`); `(device_type_id, system_type)` must have a `device_system_contexts` row (AC-05 → 422 `NO_CONTEXT_FOR_SYSTEM`)
- `updateAssignment(UUID objectId, UUID assignmentId, AssignmentUpdateRequest)` → `AssignmentDto`
- `removeAssignment(UUID objectId, UUID assignmentId)`

Endpoints: `GET /objects/{id}/devices`, `POST /objects/{id}/devices`, `PUT /objects/{id}/devices/{dtid}`, `DELETE /objects/{id}/devices/{dtid}`, `GET /objects/{id}/assignments`, `POST /objects/{id}/assignments`, `PUT /objects/{id}/assignments/{aid}`, `DELETE /objects/{id}/assignments/{aid}`

TDD: `EquipmentServiceTest` (Mockito) + `EquipmentControllerIT` — covers AC-05, AC-06, AC-11, AC-12, AC-13.

**Task 11: Records, Repairs, and Travel endpoints**

`RecordsService`: `get(UUID objectId)` → `RecordsDto`, `update(UUID objectId, RecordsUpdateRequest)` → `RecordsDto` (upsert)
`RepairService`: `getAll(UUID objectId)` → `List<RepairDto>`, `update(UUID objectId, UUID repairTypeId, RepairUpdateRequest)` → `RepairDto` (upsert; count ≥ 0)
`TravelService`: `get(UUID objectId)` → `TravelDto`, `update(UUID objectId, TravelUpdateRequest)` → `TravelDto` (upsert; `round_trip_min` is computed in the DTO mapper as `one_way_time_min × 2` — never stored in the database; rejects any attempt to set `round_trip_min` directly → 422 `ROUND_TRIP_NOT_EDITABLE`)

Endpoints: `GET /objects/{id}/records`, `PUT /objects/{id}/records`, `GET /objects/{id}/repairs`, `PUT /objects/{id}/repairs/{rtid}`, `GET /objects/{id}/travel`, `PUT /objects/{id}/travel`

TDD: service unit tests + `TravelControllerIT` covering AC-27; `RecordsControllerIT`; `RepairControllerIT`.

**Task 12: Catalog endpoints (read + write)**

`CatalogService` + `CatalogController`:

- `GET /catalog/devices` → `List<DeviceTypeDto>` (all device types with their contexts)
- `POST /catalog/devices` → `DeviceTypeDto` (HTTP 201)
- `GET /catalog/devices/{id}` → `DeviceTypeDto`
- `PUT /catalog/devices/{id}` → `DeviceTypeDto`
- `DELETE /catalog/devices/{id}` → HTTP 204; blocked 409 `DEVICE_IN_USE` if referenced
- `GET /catalog/devices/{id}/contexts` → `List<DeviceSystemContextDto>`
- `POST /catalog/devices/{id}/contexts` → `DeviceSystemContextDto` (HTTP 201)
- `PUT /catalog/devices/{id}/contexts/{cid}` → `DeviceSystemContextDto`
- `DELETE /catalog/devices/{id}/contexts/{cid}` → HTTP 204; blocked 409 `CONTEXT_IN_USE` if referenced (AC-06)
- `GET /catalog/repairs` → `List<RepairTypeDto>`
- `POST /catalog/repairs` → `RepairTypeDto` (HTTP 201)
- `PUT /catalog/repairs/{id}` → `RepairTypeDto`
- `DELETE /catalog/repairs/{id}` → HTTP 204; blocked 409 `REPAIR_TYPE_IN_USE` if referenced with count > 0

Write endpoints are callable by any authenticated user in PoC (S-04) but no management UI page exists (S-03).

TDD: `CatalogControllerIT` — reads from seed data, creates new entries, verifies 409 blocked delete.

**Task 13: Run all quality gates**

```bash
cd backend
mvn spotless:apply
mvn verify
```

Expected: `BUILD SUCCESS`. All Jacoco thresholds pass. Spotless clean. SpotBugs no HIGH findings. All integration tests pass (Testcontainers).

Fix any failures. Then push branch.

---

## Plan 2: `poc-m01-frontend.md`

**File:** `docs/superpowers/plans/2026-03-30-poc-m01-frontend.md`
**Branch:** `feature/poc-m01-frontend`
**Epic:** `docs/impl/epics/poc-m01-core-crud.md` (UI Screens section)
**Depends on:** `feature/poc-m01-backend` merged to `feature/implementation`
**Goal:** Replace all placeholder pages with real UI. Implement login flow, Division/Branch/Object CRUD, Equipment tab (two-layer), Records/Repairs/Travel tabs. All TanStack Query hooks, Zod schemas, React Hook Form forms. All PoC routes fully functional.

### Tasks

**Task 0: Create feature branch** (git commands as specified)

**Task 1: API types and query hooks**

Add to `src/types/api.ts`: full TypeScript types for all M-01 entities — `Division`, `Branch`, `ObjectRecord`, `DeviceType`, `DeviceSystemContext`, `ObjectDevice`, `ObjectSystemAssignment`, `RepairType`, `ObjectRepair`, `RecordsTask`, `Travel`, `User`, `LoginRequest`, `LoginResponse`. All typed strictly (no `any`). Zod schemas for form validation in `src/types/`.

Create `src/api/` modules:

- `divisions.ts` — `getDivisions()`, `getDivision(id)`, `createDivision()`, `updateDivision()`, `getDivisionBranches(id)`, `createBranch(divisionId)`
- `branches.ts` — `getBranch(id)`, `updateBranch(id)`
- `objects.ts` — `getObjects(divisionId?)`, `getObject(id)`, `createObject()`, `updateObject()`, `deleteObject()`
- `equipment.ts` — `getDevices(objectId)`, `addDevice()`, `updateDevice()`, `removeDevice()`, `getAssignments(objectId)`, `addAssignment()`, `updateAssignment()`, `removeAssignment()`
- `records.ts` — `getRecords(objectId)`, `updateRecords()`
- `repairs.ts` — `getRepairs(objectId)`, `updateRepair()`
- `travel.ts` — `getTravel(objectId)`, `updateTravel()`
- `catalog.ts` — `getCatalogDevices()`, `getCatalogRepairs()`
- `auth.ts` — `login()`, `logout()`, `getMe()`

TanStack Query hooks in `src/hooks/` — one file per domain. All mutations invalidate relevant query keys.

Vitest unit tests for each hook (mock Axios, verify correct URL and method called).

**Task 2: Login page**

Replace `LoginPage.tsx` placeholder. Form: email + password fields using React Hook Form + Zod (`z.object({ email: z.string().email(), password: z.string().min(1) })`). On submit: `POST /auth/login`, store token in Zustand (`authStore`), redirect to `/`. Error: show "Неверный email или пароль" on 401.

Vitest tests: renders form, shows error on 401, redirects on 200.

**Task 3: AppLayout and ProtectedRoute**

`ProtectedRoute` — reads token from `authStore`, redirects to `/login` if absent.
`AppLayout` — MUI `Drawer` sidebar nav with links to: Dashboard, Objects (`/objects`), Divisions (`/divisions`), Engineers (`/engineers` — disabled link in M-01, enabled in M-03), СВОД (`/svod` — disabled in M-01, enabled in M-02). `<Outlet />` for content.

**Task 4: Division list and detail pages**

`DivisionListPage.tsx` — MUI `DataGrid` (or table) listing all divisions. Columns: Name, branch count, object count. "Create Division" button → modal with name field. Row click → navigate to `/divisions/:id`.

`DivisionDetailPage.tsx` — division name heading + "Edit" inline. Branch list table: name, object count. "Create Branch" button → modal. Branch row click → `/branches/:id`.

Vitest tests: renders division list, create modal opens, create calls mutation.

**Task 5: Branch detail page**

`BranchDetailPage.tsx` — branch name + division breadcrumb. Object list table: name, address, ИТОГО Числ (from `summaries.itogo_chislo_with_travel` — shows "-" until M-02). "Create Object" button → opens create form.

**Task 6: Object list page**

`ObjectListPage.tsx` — searchable, filterable by division. Columns: name, address, division, branch, ИТОГО Числ (shows "-" until M-02). "Create Object" button → form. Row click → `/objects/:id`.

**Task 7: Object detail page — 6-tab layout**

`ObjectDetailPage.tsx` — MUI `Tabs` with 6 tabs: Оборудование, Записи, Ремонт, Дорога, Инженеры (placeholder until M-03), СВОД (placeholder until M-02).

**Task 8: Equipment tab (Оборудование) — two-layer UI**

Two sections:

1. **Physical inventory** — table of `object_devices`: device type name, `quantity_physical`. "+ Add device" button → dropdown of `GET /catalog/devices` (only devices not yet in inventory for this object). Edit `quantity_physical` inline. Delete button (disabled if assignments exist, tooltip explains why). Columns: Device Name, Physical Count, Actions. (`quantity_maintained` is on `object_system_assignments` in Section B, not on `object_devices`.)
2. **System assignments** — table of `object_system_assignments`: device type name, system type (ОС/ПС/Видео), `quantity_maintained`. "+ Assign to system" button → two-field form: device dropdown (only from physical inventory of this object), system type dropdown (only systems with a valid context for that device — filters `GET /catalog/devices/{id}/contexts`). Edit quantity inline. Delete assignment.

Error handling: show "Устройство не в инвентаре" on 422 `DEVICE_NOT_IN_INVENTORY`; show "Нет нормативов для этой системы" on 422 `NO_CONTEXT_FOR_SYSTEM`.

Vitest tests: assignment dropdown shows only valid systems per AC-13; 422 errors display correct message.

**Task 9: Records tab (Записи)**

Single form with 5 numeric fields: `access_requests`, `monitoring_requests`, `footage_requests`, `backup_control`, `security_admin` (field names match db-schema.md `records_tasks` columns). React Hook Form + Zod (all ≥ 0 integers). Auto-save on blur or explicit Save button. Shows current values from `GET /objects/{id}/records`.

**Task 10: Repairs tab (Ремонт)**

Table of all repair types from `GET /catalog/repairs`. Each row: repair type name, count input field (≥ 0 integer). Save button per row (or batch). Uses `PUT /objects/{id}/repairs/{rtid}`.

**Task 11: Travel tab (Дорога)**

Form: transport type (text), distance km (decimal), one_way_time_min (decimal). Save button. Shows `round_trip_min` as read-only computed field: "Время в оба конца: X мин (авторасчёт)". `round_trip_min` is NEVER shown as an editable field.

**Task 12: Run all quality gates**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass, 0 errors.

---

## Plan 3: `poc-m02-backend.md`

**File:** `docs/superpowers/plans/2026-03-30-poc-m02-backend.md`
**Branch:** `feature/poc-m02-backend`
**Epic:** `docs/impl/epics/poc-m02-calculation.md`
**Depends on:** `feature/poc-m01-backend` merged to `feature/implementation`
**Goal:** Full calculation engine (§6 pipeline), `summaries` table writes (synchronous on every source-data mutation), СВОД endpoints, aggregation endpoints, XLSX export. PAC-01 reference test passes.

### Tasks

**Task 0: Create feature branch**

**Task 1: `summaries` JPA entity and repository**

`Summaries` entity — all PoC-scope columns from `docs/impl/db-schema.md`. Fields (all `BigDecimal`): `osR1PerVisit`, `osR2PerVisit`, `psR1PerVisit`, `psR2PerVisit`, `videoR1PerVisit`, `videoR2PerVisit`, `r1PerVisitTotal`, `r2PerVisitTotal`, `osMonthlyAvg`, `psMonthlyAvg`, `videoMonthlyAvg`, `recordsMonthly`, `repairNoTravelMonthly`, `repairWithTravelMonthly`, `roundTripMin`, `pzvMinutes`, `totalNoTravelMin`, `itogoChisloNoTravel`, `totalWithTravelMin`, `itogoChisloWithTravel`, `computedAt`. One-to-one with `ObjectEntity` (`ON DELETE CASCADE`).

`SummaryRepository` — `findByObjectId(UUID)`, `save()`.

TDD: `@DataJpaTest` verifying entity persists, cascade delete works.

**Task 2: Calculation engine — `CalculationService`**

This is the highest-coverage package. Write ALL tests before writing any implementation code (strict TDD).

**Write `CalculationServiceTest` first:**

- `PAC-01`: reference object "Архив г.Брест, ул.Московская, 202Д" — `itogo_chislo_with_travel = 0.032448 ±0.000001`
- `zeroGuardTest`: object with no assignments + no records + no repairs → `itogo_chislo_with_travel = 0` (not phantom FTE from PZV/travel alone; C-39)
- `recordsOnlyTest`: verifies `records_monthly = SUM(count × normative_minutes) / planning_period_months`
- `osSystemTest`: single OS device, `r1_contrib = quantity_maintained × r1_minutes`
- `multiSystemTest`: same device assigned to both OS and PS — contributions are additive (R1 and R2 both contribute, R2 does not replace R1)

**Write `RepairCalculationTest` next (all 8 boundary cases for `kvo`):**

- `kvo=0` → `effective_trips=0` (band A: kvo ≤ ZERO_THRESHOLD=5)
- `kvo=3` → `effective_trips=0`
- `kvo=5` → `effective_trips=0` (exactly at ZERO_THRESHOLD — result is 0, inclusive)
- `kvo=6` → `effective_trips=6` (enters band B: kvo ≤ CAP=10)
- `kvo=8` → `effective_trips=8`
- `kvo=10` → `effective_trips=10` (exactly at CAP — result is CAP, not capped)
- `kvo=11` → `effective_trips=10` (band C: kvo > CAP → capped at 10)
- `kvo=17` → `effective_trips=10`

**Then implement `CalculationService`:**

```java
// Pipeline follows docs/impl/calculation-engine.md §6.1 exactly
// All arithmetic uses BigDecimal — never double or float
// All constants from WorkloadConfig — never hardcoded
```

Stage 1: per-assignment `r1_contrib = quantity_maintained × context.r1_minutes` (BigDecimal.multiply)
Stage 2: per-system R1/R2 per-visit sums
Stage 3: annual time via config visit frequencies
Stage 4: `monthly_avg[S] = (R1_annual + R2_annual) / 12` (divide scale 10 HALF_UP)
Stage 5: records (`records_6months = SUM(count × normative)`), repairs (3-band kvo formula), travel
Stage 6: `itogo_chislo = total_monthly_min / (minutesPerMonth)` with zero guard (if all work components are zero, return 0)
Persist result to `summaries` table.

Inject `WorkloadConfig` at call time — not cached at startup.

**Task 3: Wire synchronous recalculation into existing write endpoints (S-02)**

For every write endpoint that mutates source data, call `calculationService.recalculate(objectId)` after the mutation, within the same transaction:

- `EquipmentService.addDevice`, `updateDevice`, `removeDevice`
- `EquipmentService.addAssignment`, `updateAssignment`, `removeAssignment`
- `RecordsService.update`
- `RepairService.update`
- `TravelService.update`
- `ObjectService.delete` — cascade deletes summaries (via FK ON DELETE CASCADE)

Add `@Transactional` to all service write methods if not already present.

Add comment to each method: `// PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.`

TDD: `EquipmentServiceIntegrationTest` — update a device quantity, verify `summaries.itogo_chislo_with_travel` changes immediately.

**Task 4: СВОД endpoint**

`SvodController`:

- `GET /svod` — paginated (default 100/page), filterable by `division_id`. Returns all 19 СВОД columns per object from `summaries` JOIN `objects` JOIN `branches` JOIN `divisions`. Sorts by `itogo_chislo_with_travel DESC` by default.
- `GET /objects/{id}/summary` — single object summary (from `summaries`)

`SvodService.getSvod(Pageable, Optional<UUID> divisionId)` → `Page<SvodRowDto>`

`SvodRowDto` contains: `objectId`, `objectName`, `address`, `divisionName`, `branchName`, plus all 19 summaries columns.

TDD: `SvodControllerIT` — insert test data, call endpoint, verify page size and column values. PAC-05: ≤3s for first 100 rows (assert in test with `assertThat(duration).isLessThan(3000)`).

**Task 5: Aggregation endpoints**

`AggregationService`:

- `getCompany()` — `SUM(itogo_chislo_with_travel)` across all objects
- `getDivisions()` — `SUM(itogo_chislo_with_travel) GROUP BY division`, + object count, gap count (objects with zero engineers)
- `getDivision(UUID)` — division detail: division-level FTE total, branch-level breakdown
- `getBranches()` — all branches with FTE total
- `getBranch(UUID)` — branch detail
- `getCoverageGaps(Optional<UUID> divisionId)` — objects where no `object_engineers` row exists

`AggregationController`:

- `GET /aggregations/company`
- `GET /aggregations/divisions`
- `GET /aggregations/divisions/{id}`
- `GET /aggregations/branches`
- `GET /aggregations/branches/{id}`
- `GET /coverage/gaps`

TDD: `AggregationServiceTest` (unit, Mockito) + `AggregationControllerIT` (RestAssured + Testcontainers) — PAC-08: division FTE = SUM(object FTEs).

**Task 6: XLSX export**

`XlsxExportService.exportSvod(List<SvodRowDto>)` → `byte[]` — uses Apache POI. Columns match original template column structure (19 columns). Cell values use `BigDecimal.setScale(6, HALF_UP)` for numeric fields.

`SvodController` — `GET /svod/export/xlsx` → streams response as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

TDD: `XlsxExportServiceTest` — calls service, opens workbook with POI, verifies row count and cell values ±0.001 (AC-09, PAC-03).

**Task 7: Run all quality gates**

```bash
cd backend
mvn spotless:apply
mvn verify
```

Verify Jacoco: `*.service.calculation.*` ≥ 95% line, ≥ 90% branch. All tests pass. Fix any failures.

---

## Plan 4: `poc-m02-frontend.md`

**File:** `docs/superpowers/plans/2026-03-30-poc-m02-frontend.md`
**Branch:** `feature/poc-m02-frontend`
**Epic:** `docs/impl/epics/poc-m02-calculation.md` (UI Screens section)
**Depends on:** `feature/poc-m02-backend` merged to `feature/implementation`
**Goal:** СВОД table page, XLSX export button, Dashboard with aggregation data, СВОД tab on Object Detail, Division detail with FTE subtotals. Replace all M-02 placeholder sections.

### Tasks

**Task 0: Create feature branch**

**Task 1: API types and query hooks for M-02**

Add types to `src/types/api.ts`: `SvodRow` (19 columns), `SvodPage`, `AggregationCompany`, `AggregationDivision`, `AggregationBranch`, `CoverageGap`, `ObjectSummary`.

Add `src/api/svod.ts` — `getSvod(page, divisionId?)`, `exportSvod()`.
Add `src/api/aggregations.ts` — `getCompany()`, `getDivisions()`, `getDivision(id)`, `getBranches()`, `getBranch(id)`, `getCoverageGaps(divisionId?)`.
Add `src/api/summaries.ts` — `getObjectSummary(objectId)`.

TanStack Query hooks in `src/hooks/` for each.

**Task 2: СВОД page (`/svod`)**

`SvodPage.tsx` — MUI DataGrid with server-side pagination (pageSize=100). All 19 СВОД columns:
`object_name`, `address`, `division_name`, `branch_name`, `os_monthly_avg`, `ps_monthly_avg`, `video_monthly_avg`, `records_monthly`, `repair_no_travel_monthly`, `repair_with_travel_monthly`, `round_trip_min`, `pzv_minutes`, `total_no_travel_min`, `itogo_chislo_no_travel`, `total_with_travel_min`, `itogo_chislo_with_travel`, `r1_per_visit_total`, `r2_per_visit_total`, `computed_at`.

Filter control: division dropdown. Numeric columns right-aligned, 6 decimal places.

"Export XLSX" button → calls `GET /svod/export/xlsx`, triggers browser download (`Content-Disposition: attachment`).

PAC-05: first page must render in <3s (show loading spinner while fetching).

Vitest: renders, filter changes query params, export button triggers correct API call.

**Task 3: СВОД tab on Object Detail**

Replace placeholder СВОД tab in `ObjectDetailPage.tsx`. Shows all 19 summary fields in a read-only two-column layout (label + value). Values formatted to 6 decimal places for FTE fields, 2 for minute fields. Shows "Нет данных" if `summaries` row does not exist yet. Re-fetches automatically when source data tabs save (TanStack Query `invalidateQueries` on same `objectId`).

PAC-04: after editing any equipment quantity and saving, СВОД tab values update without page refresh (verified by invalidateQueries chain).

**Task 4: Dashboard (`/`)**

`DashboardPage.tsx` — three sections:

1. **FTE by Division** — table: division name, total FTE (`itogo_chislo_with_travel` sum), object count. Data from `GET /aggregations/divisions`.
2. **Top 10 objects by workload** — table: object name, division, FTE. Data from `GET /aggregations/company` or СВОД sorted DESC.
3. **Coverage gaps** — table: objects with no assigned engineer. Data from `GET /coverage/gaps`. Columns: object name, division, branch, FTE. "Нет покрытых объектов" when empty.

PAC-08: division FTE column must match the СВОД total (no separate calculation in frontend — purely from API data).

**Task 5: Division detail — FTE subtotals**

Update `DivisionDetailPage.tsx`. Add FTE summary card at top: total FTE for this division (from `GET /aggregations/divisions/{id}`). Branch table gains "FTE" column. Coverage gaps section (objects in this division with no engineer) sourced from `GET /coverage/gaps?division_id={id}`.

**Task 6: Enable СВОД nav link**

Remove disabled state from СВОД link in `AppLayout.tsx` sidebar.

**Task 7: Run all quality gates**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

---

## Plan 5: `poc-m03-backend.md`

**File:** `docs/superpowers/plans/2026-03-30-poc-m03-backend.md`
**Branch:** `feature/poc-m03-backend`
**Depends on:** `feature/poc-m02-backend` merged to `feature/implementation`
**Goal:** Engineer CRUD, object-engineer assignments, `engineer_summaries` calculation (each engineer's FTE share per assigned object, load_ratio, status), synchronous recalculation on all assignment changes. 14 endpoints from the engineer module.

### Tasks

**Task 0: Create feature branch**

**Task 1: `object_engineers` and `engineer_summaries` JPA entities and repositories**

> **Note:** Both `object_engineers` and `engineer_summaries` tables already exist in
> `v1.0.0-initial-schema.xml` (changeset `v1.0.0-6`). No new Liquibase migration is needed.
> This task only creates the JPA entities and repositories.

`ObjectEngineer` — `id UUID`, `object` (ManyToOne), `engineer` (ManyToOne → User), `assignedAt`, `assignedBy UUID nullable`. UNIQUE(object_id, engineer_id).

`EngineerSummary` — one-to-one with User. Fields (BigDecimal): `totalLoad`, `objectCount INT`, `osLoad`, `psLoad`, `videoLoad`, `recordsLoad`, `repairLoad`, `capacityFte`, `loadRatio`, `status VARCHAR(20)` (enum: NORMAL/WARNING/OVERLOADED). No `is_stale` in PoC (S-02).

`ObjectEngineerRepository` — `findAllByObjectId(UUID)`, `findAllByEngineerId(UUID)`, `findByObjectIdAndEngineerId(UUID, UUID)`, `countByObjectId(UUID)`.
`EngineerSummaryRepository` — `findByEngineerId(UUID)`.

TDD: `@DataJpaTest` — persist assignment, verify unique constraint, cascade delete from object.

**Task 2: Engineer CRUD service and controller**

`EngineerService`:

- `findAll(Optional<String> status, Optional<UUID> homeDivision)` → `List<EngineerDto>`
- `findById(UUID)` → `EngineerDto` (with summary if exists)
- `create(EngineerCreateRequest)` — creates User with `role='engineer'` (lowercase), `capacity_fte`, `home_division_id`
- `update(UUID, EngineerUpdateRequest)` — if `capacity_fte` changes, triggers `engineerSummaryService.recalculate(engineerId)`
- `deactivate(UUID)` — soft delete (`is_active=false`); blocks with 409 `ENGINEER_HAS_ACTIVE_ASSIGNMENTS` if any `object_engineers` rows exist

`EngineerController`: `GET /engineers`, `POST /engineers`, `GET /engineers/{id}`, `PUT /engineers/{id}`, `DELETE /engineers/{id}`

TDD: `EngineerServiceTest` (Mockito) — deactivation blocked, capacity change triggers recalc; `EngineerControllerIT` (RestAssured).

**Task 3: Engineer summary calculation service**

`EngineerSummaryService.recalculate(UUID engineerId)`:

1. Load all `object_engineers` rows for this engineer
2. For each assigned object, load `summaries.itogo_chislo_with_travel` and `engineer_count = countByObjectId(objectId)`
3. `engineer_share_per_object = itogo_chislo_with_travel / engineer_count` (BigDecimal divide scale 10 HALF_UP)
4. `total_load = SUM(engineer_share_per_object)` across all objects
5. Load per-component breakdowns from `summaries` (os_monthly_avg etc.) and divide by engineer_count for each object; sum across objects for engineer's component loads
6. `load_ratio = total_load / capacity_fte`
7. `status`: load_ratio < WARNING_THRESHOLD → NORMAL; load_ratio < OVERLOAD_THRESHOLD → WARNING; else OVERLOADED
8. Persist to `engineer_summaries`

`EngineerSummaryService.recalculateAllForObject(UUID objectId)`:

- Load all engineer IDs for this object, call `recalculate(engineerId)` for each
- Called after any `CalculationService.recalculate(objectId)` that affects the object

**Write `EngineerWorkloadServiceTest` (mandatory test from CONTRIBUTING.md):**

- workload split for 1, 2, and 3 co-engineers (each engineer's share = object FTE / engineer_count)
- `load_ratio` transitions: normal → warning at threshold, warning → overloaded at 1.0
- status enum transitions

**Task 4: Object-engineer assignment endpoints**

`ObjectEngineerService`:

- `getEngineers(UUID objectId)` → `List<EngineerShareDto>` (per-engineer share for this object)
- `assignEngineer(UUID objectId, UUID engineerId)` — validates `user.role == ENGINEER` and `user.is_active == TRUE`; creates `object_engineers` row; calls `recalculateAllForObject(objectId)` (S-02)
- `removeEngineer(UUID objectId, UUID engineerId)` — deletes row; calls `recalculateAllForObject(objectId)`

`GET /objects/{id}/engineers`, `POST /objects/{id}/engineers`, `DELETE /objects/{id}/engineers/{eid}`

Mirror endpoints from engineer perspective:

- `GET /engineers/{id}/objects` → list of objects with per-object shares
- `POST /engineers/{id}/objects` — assigns object to engineer (calls `assignEngineer`)
- `DELETE /engineers/{id}/objects/{oid}`

`GET /engineers/{id}/summary` → `EngineerSummaryDto`

TDD: `ObjectEngineerServiceTest` + `ObjectEngineerControllerIT` — assign engineer, verify `engineer_summaries.total_load` updated; remove engineer, verify share redistributed.

**Task 5: Wire engineer recalculation into existing object pipeline**

Update `CalculationService.recalculate(objectId)` to call `engineerSummaryService.recalculateAllForObject(objectId)` after computing `summaries`. This ensures that when equipment, records, repairs, or travel changes, engineer summaries automatically update (S-02).

Add comment: `// PoC (S-02): calls engineer summary recalculation synchronously after object summary update.`

TDD: full integration test — update device quantity → verify `summaries.itogo_chislo_with_travel` updated AND `engineer_summaries.total_load` updated.

**Task 6: Run all quality gates**

```bash
cd backend
mvn spotless:apply
mvn verify
```

---

## Plan 6: `poc-m03-frontend.md`

**File:** `docs/superpowers/plans/2026-03-30-poc-m03-frontend.md`
**Branch:** `feature/poc-m03-frontend`
**Depends on:** `feature/poc-m03-backend` merged to `feature/implementation`
**Goal:** Engineer list and detail pages (fully functional), Engineers tab on Object Detail (assign/remove engineers, see per-engineer share), enable Engineers nav link. All PoC routes complete.

### Tasks

**Task 0: Create feature branch**

**Task 1: API types and query hooks for M-03**

Add to `src/types/api.ts`: `Engineer`, `EngineerSummary`, `EngineerCreateRequest`, `EngineerUpdateRequest`, `ObjectEngineerAssignment`, `EngineerShare`.

Add `src/api/engineers.ts` — `getEngineers(status?, homeDivision?)`, `getEngineer(id)`, `createEngineer()`, `updateEngineer()`, `deactivateEngineer()`, `getEngineerSummary(id)`, `getEngineerObjects(id)`, `assignObjectToEngineer(engineerId, objectId)`, `removeObjectFromEngineer(engineerId, objectId)`.

Add `src/api/objectEngineers.ts` — `getObjectEngineers(objectId)`, `assignEngineerToObject(objectId, engineerId)`, `removeEngineerFromObject(objectId, engineerId)`.

TanStack Query hooks in `src/hooks/useEngineers.ts`, `src/hooks/useObjectEngineers.ts`.

**Task 2: Engineer list page (`/engineers`)**

`EngineerListPage.tsx` — MUI DataGrid. Columns: Инженер (name), Подразделение (home division name), Объектов (object_count), Нагрузка FTE (total_load, 4 decimal places), Мощность (capacity_fte), Статус (colored chip: green NORMAL / yellow WARNING / red OVERLOADED). Filter bar: division dropdown, status dropdown, name search. "Создать инженера" button → opens create modal (name, email, capacity_fte, home_division_id fields). Row click → `/engineers/:id`.

Vitest: renders list, filter changes query, create modal opens.

**Task 3: Engineer detail page (`/engineers/:id`)**

`EngineerDetailPage.tsx` — four sections:

1. **Summary cards:** Нагрузка (total_load FTE), Мощность (capacity_fte), Загрузка (load_ratio as %, colored), Объектов (object_count).
2. **System breakdown bar chart** (MUI `LinearProgress` or simple bars): ОС / ПС / Видео / Записи / Ремонт — each as FTE + % of total.
3. **Assigned objects table** — columns: Объект (name), Доля инженера (engineer_share per this object), Всего на объект (itogo_chislo_with_travel), Кол-во инж. (engineer_count). Sorted by engineer's share DESC. "Снять" (remove) button per row.
4. **"+ Назначить объект"** button → searchable dropdown of all objects. On confirm: calls `POST /engineers/{id}/objects`.

"Редактировать" button → inline edit form for name, capacity_fte, home_division_id (no password change in PoC).

Vitest: summary cards render, remove object calls mutation, add object dropdown appears.

**Task 4: Engineers tab on Object Detail**

Replace placeholder Engineers tab in `ObjectDetailPage.tsx`.

Table columns: Инженер (name), Доля объекта (itogo_chislo_with_travel / engineer_count for this engineer at this object), Загрузка (engineer's total load_ratio — %, colored chip), Действия ("Снять" button).

"+ Назначить инженера" button → searchable dropdown of all active engineers (from `GET /engineers?is_active=true&role=ENGINEER`). Shows engineer name + current load_ratio in dropdown option to help user avoid overloading. On confirm: calls `POST /objects/{id}/engineers`.

Travel review banner on assignment: MUI `Alert` — "Проверьте данные о маршруте — время в пути может отличаться для нового инженера". Dismissable.

Vitest: table renders, assign calls mutation, banner appears after assignment, remove calls mutation.

**Task 5: Enable Engineers nav link**

Remove disabled state from Engineers link in `AppLayout.tsx`.

**Task 6: End-to-end smoke check**

After M-03 frontend is complete, the full PoC flow is functional. Perform manual smoke check:

1. Login → Dashboard shows division FTE totals
2. Create Division → Create Branch → Create Object
3. Add equipment (device + assignment) → СВОД tab updates
4. Assign engineer → Engineer detail shows correct load_ratio
5. СВОД page shows object with FTE value

Document any deviations in a comment block at the bottom of the plan file.

**Task 7: Run all quality gates**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

---

## Execution instructions for the planning agent

When writing each plan, the agent MUST:

1. Read all reference documents listed above before writing a single line of the plan
2. Follow the exact format of `docs/superpowers/plans/2026-03-30-poc-scaffolding.md`:
   - Each step has exact file path, complete code block, exact bash command, expected output
   - TDD is strict: failing test step first, run command, implement, run command
   - Every task ends with a commit step (`git add <specific files>; git commit -m "type: description"`)
3. Use `BigDecimal` for all calculation values — never `double` or `float`
4. Use exact TOR error codes from `docs/impl/api-spec.md` — never invent new ones
5. Follow PoC simplification boundaries from `docs/impl/poc-scope.md` — never implement MVP features
6. Include `// PoC (S-XX):` comments on every synchronous recalculation call
7. Use `WorkloadConfig` for all constants — never hardcode normatives
8. Never expose JPA entities directly in API responses — always use DTOs via MapStruct
