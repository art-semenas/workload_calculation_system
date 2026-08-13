# Contributing to Workload Calculation System

This document is the **single source of truth** for development standards.
All AI assistant config files (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursorrules`) derive from it.

---

## Tech Stack at a Glance

**Backend:** Java 21 · Spring Boot 3.4.1 · Maven · Spring Data JPA · Spring Security + JWT · Liquibase · MapStruct · Lombok · log4j2 · Apache POI · Bucket4j · PostgreSQL 15

**Frontend:** React 18 · TypeScript 5 (strict) · Vite · React Router 6 · TanStack Query 5 · Zustand · MUI 5 · Axios · React Hook Form · Zod

**Quality:** Jacoco · Spotless (Google Java Format) · SpotBugs · ESLint (@typescript-eslint) · Prettier

**Spec:** `docs/TOR_Workload_WebApp.md` is the source of truth for all business rules. When code and TOR conflict, fix the code.

---

## Development Workflow

### TDD — mandatory for all service and calculation code

Follow red → green → refactor → commit strictly:

1. Write a failing test that describes the expected behaviour
2. Run it — verify it fails for the right reason
3. Write the minimum code to make it pass
4. Run it — verify it passes
5. Refactor if needed, keeping tests green
6. Commit

Skipping the failing-test step is not allowed. Tests written after implementation do not count as TDD.

### Commit discipline

- One logical change per commit. A passing TDD cycle is one commit.
- Format: `type: short description` — types are `feat`, `fix`, `test`, `refactor`, `chore`, `docs`
- Examples: `feat: add division CRUD endpoints`, `test: verify repair threshold band B (kvo=8)`
- Never commit broken code to any branch
- No direct commits to `main` — all changes go through a PR

### Quality gates — must all pass before opening a PR

**Backend:**
```bash
cd backend
mvn spotless:apply        # auto-format (run this first)
mvn verify                # compiles + unit tests + integration tests + Jacoco + SpotBugs + Spotless check
```

**Frontend:**
```bash
cd frontend
npm run format            # auto-format with Prettier
npm run lint              # ESLint — must exit 0
npx tsc --noEmit          # TypeScript type check — must exit 0
npm test                  # Vitest — all tests must pass
```

If any gate fails, fix it before pushing. Do not add `// eslint-disable`, `@SuppressWarnings`, or Spotless `spotless:off` markers without a comment explaining why.

---

## Backend Standards

### Numeric precision — non-negotiable

**Always use `BigDecimal` for every calculation value.** Never use `double` or `float` for anything touched by the calculation engine (workload minutes, FTE coefficients, normatives, ratios).

```java
// CORRECT
BigDecimal r1Contrib = quantityMaintained.multiply(context.getR1Minutes());

// WRONG — floating-point rounding will cause PAC-01 to fail
double r1Contrib = quantityMaintained * context.getR1Minutes();
```

`BigDecimal` arithmetic: always use `.multiply()`, `.add()`, `.divide(divisor, scale, RoundingMode.HALF_UP)`. Never use `==` for comparison — use `.compareTo()`.

### Configuration constants

Every calculation constant comes from `WorkloadConfig`. Never hardcode normative values in service or calculation code.

```java
// CORRECT
config.getPlanningPeriodMonths()

// WRONG
int months = 6;
```

This applies to visit frequencies, PZV minutes, records normatives, repair thresholds — all 19 keys in `WorkloadConfig`.

### DTO layer — mandatory

Controllers and API responses never expose JPA entities directly (TOR AD-14). Every endpoint input and output uses a DTO. MapStruct handles entity ↔ DTO conversion.

```java
// CORRECT — controller uses DTO
public ResponseEntity<ApiResponse<DivisionDto>> getDivision(@PathVariable UUID id) { ... }

// WRONG — entity leaks into API
public ResponseEntity<Division> getDivision(@PathVariable UUID id) { ... }
```

### Calculations are server-side only

The frontend never computes workload values (TOR AD-07). The frontend reads only from `summaries` and `engineer_summaries`. Never add calculation logic to TypeScript code.

### Package structure

```
com.workload.controller      REST controllers — thin, delegate to services
com.workload.service         Business logic
com.workload.service.calculation  Calculation engine (§6) — highest test coverage
com.workload.repository      Spring Data JPA repositories
com.workload.entity          JPA entities — no business logic
com.workload.dto             Request/response DTOs
com.workload.mapper          MapStruct interfaces
com.workload.config          Spring configuration classes
com.workload.exception       Exception types + GlobalExceptionHandler
```

### Test coverage requirements (TOR §19.2, enforced by Jacoco)

| Package | Line | Branch |
|---|---|---|
| `*.service.calculation.*` | ≥ 95% | ≥ 90% |
| `*.service.*` (other) | ≥ 80% | ≥ 75% |
| `*.mapper.*` | ≥ 80% | — |
| Overall | ≥ 75% | ≥ 70% |

### Key unit test cases (mandatory — from TOR §19.2)

The following tests must exist and pass before the calculation epic is complete:

- `CalculationServiceTest`: PAC-01 reference value — `itogo_chislo_with_travel = 0.032448 ±0.000001` for the reference object
- `RepairCalculationTest`: all 8 threshold boundary cases for kvo (0, 3, 5, 6, 8, 10, 11, 17)
- `EngineerWorkloadServiceTest`: workload split for 1, 2, and 3 co-engineers; load_ratio and status transitions
- `AggregationServiceTest`: `branch_load = SUM(object_loads)` for a test dataset

### Error responses

All API errors use the standard envelope (TOR §10):
```json
{ "data": null, "meta": null, "error": { "code": 422, "message": "Device not found in inventory for this object" } }
```

Use `GlobalExceptionHandler` to map exceptions to codes. `error.code` is always the numeric HTTP status mirroring the response status line (see `docs/impl/epics/unified-error-handling.md`) — never a semantic string; messages are user-facing, no stack traces or internals.

### Logging

Use SLF4J (`LoggerFactory.getLogger`). Never use `System.out.println`. Log at `INFO` for significant state changes, `DEBUG` for calculation steps, `ERROR` for unexpected failures. The output is JSON (log4j2 configured) — do not format log messages with newlines or tab-separated fields.

---

## Frontend Standards

### No `any`

`@typescript-eslint/no-explicit-any` is set to `error`. Use `unknown` and narrow with type guards, or define a proper type. If a third-party type is genuinely unavailable, use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a comment explaining why.

### API calls

All HTTP calls go through the Axios instance at `src/api/axios.ts`. Never use `fetch` or create a second Axios instance. The instance handles JWT injection and 401 → `/login` redirect automatically.

### Forms

All forms use React Hook Form + Zod. Never manage form state with raw `useState`. Zod schemas live in `src/types/` alongside the types they validate.

```tsx
// CORRECT
const schema = z.object({ name: z.string().min(1) })
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })

// WRONG
const [name, setName] = useState('')
```

### Server state

All server data (API responses) is managed by TanStack Query. Never store API response data in Zustand or component state. Zustand is for client-only state (auth token, UI preferences).

### Component rules

- No business logic in components — extract to custom hooks (`src/hooks/`) or services
- No inline styles — use MUI `sx` prop or theme
- Page components (in `src/pages/`) are thin: fetch data via TanStack Query hooks, render layout, delegate to feature components
- Placeholder pages are acceptable during scaffolding but must be replaced before a feature is considered done

---

## Database and Migrations

- **Never alter the database schema manually.** All schema changes go through a Liquibase changeset in `backend/src/main/resources/db/changelog/changes/`.
- Changeset IDs follow the pattern `v{major}.{minor}.{patch}-{sequence}` (e.g. `v1.0.0-1`).
- FK references in seed data use `valueComputed="(SELECT id FROM table WHERE name = '...')"` — never hardcoded UUIDs.
- PoC changesets (`v1.0.x`) must not include MVP-only columns. See `docs/impl/poc-scope.md` for the explicit exclusion list (`failed_login_count`, `locked_until`, `is_stale`, `period_id`).
- Every changeset that modifies data in production must have a `<rollback>` block.

---

## PoC vs MVP Boundaries

The codebase is built in phases. Respect the phase boundaries:

- Do not implement MVP features in PoC milestones
- When PoC code will change in MVP (e.g. synchronous recalculation → background worker), add a comment:
  ```java
  // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
  ```
- Simplifications are documented in `docs/impl/poc-scope.md`. Know them. Don't accidentally "fix" a PoC simplification — that is MVP scope.

Active PoC simplifications to be aware of:

| Code | What it means |
|---|---|
| S-02 | Synchronous recalculation — no `is_stale`, no background worker |
| S-03 | Seed-only catalog — no admin UI for device types or repair types |
| S-04 | Roles stored but not enforced — all authenticated users can read/write |
| S-05 | No planning periods — no `period_id` FK on repairs or records |

---

## Calculation Domain Rules

These are the most business-critical rules. A mistake here produces wrong FTE numbers.

- **R1 and R2 are additive** per the Excel model — both contribute to monthly workload. R2 does not replace R1.
- **`kvo` (К-во ремонтов)** = COUNT of distinct repair types with `count > 0` — never the sum of quantities. See TOR §4.5.
- **Repair travel formula** uses a 3-band threshold: `kvo ≤ ZERO_THRESHOLD → 0`, `kvo ≤ CAP → kvo`, `kvo > CAP → CAP`. Both boundaries are inclusive-lower / inclusive-upper: at exactly `ZERO_THRESHOLD`, result is 0; at exactly `CAP`, result is `CAP` (not capped yet).
- **Zero guard on ИТОГО**: if all work components are zero, `itogo_chislo = 0` (matches Excel IF-guard). PZV and travel alone do not generate a phantom FTE. See TOR C-39.
- **`round_trip_min`** is always `one_way_time × 2`, computed server-side, never user-editable. The API rejects any attempt to set it directly (HTTP 422).
- **All calculation constants** are read from `WorkloadConfig` at call time, not cached at startup. This ensures a config change in MVP takes effect immediately.
- **Reference test value**: object "Архив г.Брест, ул.Московская, 202Д" with correct equipment must produce `itogo_chislo_with_travel = 0.032448 ±0.000001` (PAC-01). Use this to verify the calculation engine end-to-end. The source workbook shows `0.032327` for this object because `ПС Расчет!AT` drops R1 — do **not** calibrate to the spreadsheet. See `docs/Excel_to_md/Шаблон_нагрузки_v4_data_extraction_spec.md` §8.4.
