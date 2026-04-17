# PoC M-02 Backend — Calculation Engine & Summary

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full calculation engine (§6 pipeline), `summaries` table writes (synchronous on every source-data mutation), Summary endpoints, aggregation endpoints, XLSX export. PAC-01 reference test passes.

**Branch:** `feature/poc-m02-backend`
**Epic:** `docs/impl/epics/poc-m02-calculation.md`
**Depends on:** `feature/poc-m01-backend` merged to `feature/implementation`

**PoC Simplifications Active:**

- **S-02:** Synchronous recalculation — no `is_stale`, no background worker
- **S-03:** Static normatives — seed data only, no admin UI for catalog
- **S-05:** No planning periods — no `period_id` FK on records or repairs

---

## Reference Documents

| File                                     | Purpose                                   |
| ---------------------------------------- | ----------------------------------------- |
| `docs/impl/epics/poc-m02-calculation.md` | M-02 scope, ACs, endpoint list            |
| `docs/impl/calculation-engine.md`        | Exact formulas (§6), config key reference |
| `docs/impl/api-spec.md`                  | Full API contract                         |
| `docs/impl/db-schema.md`                 | Full DB schema                            |
| `docs/impl/poc-scope.md`                 | PoC simplifications S-02 through S-10     |
| `docs/TOR_Workload_WebApp.md` §16        | Aggregation rules and response shapes     |

---

## File Structure (new files created by this plan)

```
backend/src/main/java/com/workload/
├── entity/
│   └── Summary.java
├── repository/
│   └── SummaryRepository.java
├── service/
│   └── calculation/
│       ├── CalculationService.java
│       ├── RepairCalculationHelper.java
│       └── RecordsCalculationHelper.java
├── service/
│   ├── SvodService.java
│   ├── AggregationService.java
│   └── XlsxExportService.java
├── controller/
│   ├── SvodController.java
│   ├── AggregationController.java
│   └── CoverageController.java
├── dto/
│   ├── SvodRowDto.java
│   ├── ObjectSummaryDto.java
│   ├── AggregationCompanyDto.java
│   ├── AggregationDivisionDto.java
│   ├── AggregationBranchDto.java
│   ├── ComponentBreakdownDto.java
│   └── CoverageGapDto.java
└── mapper/
    └── SummaryMapper.java

backend/src/test/java/com/workload/
├── service/calculation/
│   ├── CalculationServiceTest.java
│   ├── RepairCalculationTest.java
│   └── RecordsCalculationTest.java
├── service/
│   ├── SvodServiceTest.java
│   ├── AggregationServiceTest.java
│   └── XlsxExportServiceTest.java
├── controller/
│   ├── SvodControllerIT.java
│   └── AggregationControllerIT.java
└── repository/
    └── SummaryRepositoryTest.java
```

---

## Task 0: Create Feature Branch

- [ ] **Step 1: Create branch from feature/implementation**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/poc-m02-backend
```

---

## Task 1: Update WorkloadConfig — Add MONTHLY_HOURS_FUND & ABSENCE_COEFFICIENT

**Why:** The scaffolding created `minutesPerMonth` as a single config key, but the TOR §6.8 formula uses two separate constants: `MONTHLY_HOURS_FUND = 142.8` (hours) and `ABSENCE_COEFFICIENT = 1.12`. The PAC-01 reference value (`0.032327`) can only be produced with the two-constant formula: `total_min / 60 / 142.8 × 1.12`. This task replaces `minutesPerMonth` with the correct two keys.

**Files:**

- Edit: `backend/src/main/java/com/workload/config/WorkloadConfig.java`
- Edit: `backend/src/test/java/com/workload/config/WorkloadConfigTest.java`
- Edit: `backend/src/test/resources/application-test.yml`
- Edit: `backend/src/main/resources/application.yml`

- [x] **Step 1: Update the failing test first**

Edit `WorkloadConfigTest.java`:

- Remove the assertion for `minutesPerMonth`
- Add assertions for `monthlyHoursFund` (type `BigDecimal`, value `142.8`) and `absenceCoefficient` (type `BigDecimal`, value `1.12`)
- Update `@TestPropertySource` — remove `WORKLOAD_CONFIG_MINUTES_PER_MONTH`, add `WORKLOAD_CONFIG_MONTHLY_HOURS_FUND=142.8` and `WORKLOAD_CONFIG_ABSENCE_COEFFICIENT=1.12`
- Total key count remains 19 (replaced 1 with 2, removed `engineerOverloadThreshold` — TOR §6.13 says 1.0 overload boundary is a non-configurable constant)

OR — if `engineerOverloadThreshold` is useful to keep as a configurable key (some tests use it), keep it and have 20 keys. The plan preserves `engineerOverloadThreshold` for now since it's already tested and M-03 needs it.

Final key list (20 keys):

| #     | Java field                  | Type       | Test value        |
| ----- | --------------------------- | ---------- | ----------------- |
| 1     | `planningPeriodMonths`      | Integer    | 6                 |
| 2     | `repairProductiveMonths`    | Integer    | 5                 |
| 3     | `repairTravelZeroThreshold` | Integer    | 5                 |
| 4     | `repairTravelCap`           | Integer    | 10                |
| 5     | `pzvMinutes`                | Integer    | 20                |
| 6     | `engineerWarningThreshold`  | BigDecimal | 0.9               |
| 7     | `engineerOverloadThreshold` | BigDecimal | 1.0               |
| 8–13  | visit frequencies (6 keys)  | Integer    | 10/2/8/4/10/2     |
| 14–18 | records normatives (5 keys) | Integer    | 60/180/180/120/60 |
| 19    | `monthlyHoursFund`          | BigDecimal | 142.8             |
| 20    | `absenceCoefficient`        | BigDecimal | 1.12              |

- [x] **Step 2: Run test — expect FAIL** (field `minutesPerMonth` removed, new fields don't exist yet)

```bash
cd backend && mvn test -Dtest=WorkloadConfigTest -q
```

Expected: compilation error.

- [x] **Step 3: Update WorkloadConfig.java**

Replace `minutesPerMonth` field with:

```java
// FTE conversion constants (§6.8) — used in the TOTAL formula:
// itogo = total_min / 60 / monthlyHoursFund × absenceCoefficient
@NotNull
@DecimalMin("0.1")
private BigDecimal monthlyHoursFund;

@NotNull
@DecimalMin("0.01")
private BigDecimal absenceCoefficient;
```

- [x] **Step 4: Update application-test.yml**

Replace `minutes-per-month: 166` with:

```yaml
monthly-hours-fund: 142.8
absence-coefficient: 1.12
```

- [x] **Step 5: Update application.yml**

Replace the `minutes-per-month` env var binding with the two new keys:

```yaml
monthly-hours-fund: ${WORKLOAD_CONFIG_MONTHLY_HOURS_FUND:142.8}
absence-coefficient: ${WORKLOAD_CONFIG_ABSENCE_COEFFICIENT:1.12}
```

- [x] **Step 6: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=WorkloadConfigTest -q
```

Expected: `BUILD SUCCESS`, all assertions pass.

- [x] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/config/WorkloadConfig.java \
        backend/src/test/java/com/workload/config/WorkloadConfigTest.java \
        backend/src/test/resources/application-test.yml \
        backend/src/main/resources/application.yml
git commit -m "refactor: replace minutesPerMonth with monthlyHoursFund and absenceCoefficient"
```

---

## Task 2: Summary Entity and Repository

**Files:**

- Create: `backend/src/main/java/com/workload/entity/Summary.java`
- Create: `backend/src/main/java/com/workload/repository/SummaryRepository.java`
- Create: `backend/src/test/java/com/workload/repository/SummaryRepositoryTest.java`

- [ ] **Step 1: Write the failing test**

Create `SummaryRepositoryTest.java` — `@DataJpaTest` with Testcontainers:

```java
package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class SummaryRepositoryTest {

  @Autowired private TestEntityManager em;
  @Autowired private SummaryRepository summaryRepository;

  @Test
  void findByObjectId_returnsSummary() {
    // Given: an object with a summary
    // (requires Division → Branch → ObjectEntity → Summary chain via TestEntityManager)
    // Persist division, branch, object, then summary with known itogo value
    // Assert: summaryRepository.findByObjectId(object.getId()) returns the correct row
  }

  @Test
  void cascadeDeleteWhenObjectDeleted() {
    // Given: object with summary persisted
    // When: object is deleted
    // Then: summary row is also deleted (ON DELETE CASCADE verified via schema)
  }

  @Test
  void uniqueConstraintOnObjectId() {
    // Given: object with summary already persisted
    // When: attempt to persist second summary for same object
    // Then: DataIntegrityViolationException is thrown
  }
}
```

Write the test bodies using `TestEntityManager` to persist the entity chain. Each test method must be self-contained — persist required parent entities inline.

- [ ] **Step 2: Run test — expect FAIL** (Summary entity does not exist yet)

```bash
cd backend && mvn test -Dtest=SummaryRepositoryTest -q
```

- [ ] **Step 3: Create Summary.java entity**

`backend/src/main/java/com/workload/entity/Summary.java`

Entity requirements:

- `@Table(name = "summaries")`
- `@Id` UUID `id`, auto-generated
- `@OneToOne` with `ObjectEntity`: `@JoinColumn(name = "object_id", nullable = false, unique = true)`
- All 19 Summary columns as `BigDecimal` fields — match column names from the `v1.0.0-5` changeset exactly:

| Java field                | DB column                    | Type         |
| ------------------------- | ---------------------------- | ------------ |
| `osR1PerVisit`            | `os_r1_per_visit`            | `BigDecimal` |
| `osR2PerVisit`            | `os_r2_per_visit`            | `BigDecimal` |
| `psR1PerVisit`            | `ps_r1_per_visit`            | `BigDecimal` |
| `psR2PerVisit`            | `ps_r2_per_visit`            | `BigDecimal` |
| `videoR1PerVisit`         | `video_r1_per_visit`         | `BigDecimal` |
| `videoR2PerVisit`         | `video_r2_per_visit`         | `BigDecimal` |
| `r1PerVisitTotal`         | `r1_per_visit_total`         | `BigDecimal` |
| `r2PerVisitTotal`         | `r2_per_visit_total`         | `BigDecimal` |
| `osMonthlyAvg`            | `os_monthly_avg`             | `BigDecimal` |
| `psMonthlyAvg`            | `ps_monthly_avg`             | `BigDecimal` |
| `videoMonthlyAvg`         | `video_monthly_avg`          | `BigDecimal` |
| `recordsMonthly`          | `records_monthly`            | `BigDecimal` |
| `repairNoTravelMonthly`   | `repair_no_travel_monthly`   | `BigDecimal` |
| `repairWithTravelMonthly` | `repair_with_travel_monthly` | `BigDecimal` |
| `roundTripMin`            | `round_trip_min`             | `BigDecimal` |
| `pzvMinutes`              | `pzv_minutes`                | `BigDecimal` |
| `totalNoTravelMin`        | `total_no_travel_min`        | `BigDecimal` |
| `itogoChisloNoTravel`     | `itogo_chislo_no_travel`     | `BigDecimal` |
| `totalWithTravelMin`      | `total_with_travel_min`      | `BigDecimal` |
| `itogoChisloWithTravel`   | `itogo_chislo_with_travel`   | `BigDecimal` |
| `computedAt`              | `computed_at`                | `Instant`    |

- Lombok: `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`
- No MVP-only columns: no `is_stale`, no `period_id`, no intermediate fields (`records_6months`, etc.)

- [ ] **Step 4: Create SummaryRepository.java**

`backend/src/main/java/com/workload/repository/SummaryRepository.java`

```java
package com.workload.repository;

import com.workload.entity.Summary;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SummaryRepository extends JpaRepository<Summary, UUID> {
  Optional<Summary> findByObjectId(UUID objectId);

  void deleteByObjectId(UUID objectId);
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=SummaryRepositoryTest -q
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/entity/Summary.java \
        backend/src/main/java/com/workload/repository/SummaryRepository.java \
        backend/src/test/java/com/workload/repository/SummaryRepositoryTest.java
git commit -m "feat: add Summary entity and SummaryRepository with cascade tests"
```

---

## Task 3: Calculation Engine — Tests First (Strict TDD)

This is the highest-coverage package (`≥ 95% line, ≥ 90% branch`). **Write ALL tests before writing any implementation code.**

**Files:**

- Create: `backend/src/test/java/com/workload/service/calculation/CalculationServiceTest.java`
- Create: `backend/src/test/java/com/workload/service/calculation/RepairCalculationTest.java`
- Create: `backend/src/test/java/com/workload/service/calculation/RecordsCalculationTest.java`

### 3A: CalculationServiceTest

- [ ] **Step 1: Write CalculationServiceTest.java**

Unit test class using Mockito. Mock repositories: `ObjectSystemAssignmentRepository`, `RecordsTaskRepository`, `ObjectRepairRepository`, `TravelRepository`, `SummaryRepository`. Inject real `WorkloadConfig` instance (constructed manually with all 20 default values).

**Required test methods:**

| Test                                    | What it verifies                                           | Expected value                                                                 |
| --------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pac01_referenceObject_itogoWithTravel` | Full pipeline for "Brest Archive" with reference equipment | `itogo_chislo_with_travel = 0.032327 ±0.000001`                                |
| `pac01_referenceObject_itogoNoTravel`   | Same object, no-travel variant                             | `itogo_chislo_no_travel = 0.023961 ±0.000001`                                  |
| `pac01_referenceObject_osMonthlyAvg`    | Security system only                                       | `os_monthly_avg = 40.683 ±0.01`                                                |
| `pac01_referenceObject_psMonthlyAvg`    | Fire system only                                           | `ps_monthly_avg = 30.417 ±0.01`                                                |
| `zeroGuardTest_allComponentsZero`       | Object with no assignments, no records, no repairs         | `itogo_chislo_with_travel = 0` exactly (C-39)                                  |
| `zeroGuardTest_onlyPzvAndTravel`        | Object with PZV and travel but zero work components        | `itogo_chislo_with_travel = 0` (PZV+travel alone must NOT produce phantom FTE) |
| `recordsOnlyTest`                       | Object with only records (no equipment, no repairs)        | `records_monthly = SUM(count × normative) / 6`; `itogo_chislo > 0`             |
| `osSystemOnly_singleDevice`             | Single OS device, quantity_maintained=1                    | `r1_contrib = 1 × context.r1_minutes`                                          |
| `multiSystem_sameDeviceBothOsAndPs`     | Same device assigned to OS and PS                          | Both system contributions additive; R2 does not replace R1                     |
| `multiDevice_sameSystem`                | Two different devices both in Security                     | Per-visit subtotals = SUM of both contributions                                |

**PAC-01 test data setup** — mock the following for the reference object "Brest Archive, Moskovskaya St., 202D":

Security assignments (5 devices):

| Device                  | system_type | quantity_maintained | R1   | R2  |
| ----------------------- | ----------- | ------------------- | ---- | --- |
| Series A6, Alarm        | OS          | 2                   | 5    | 8   |
| Access Device           | OS          | 2                   | 1    | 4   |
| Alarm Loops             | OS          | 12                  | 0.06 | 0.7 |
| Reader Channels         | OS          | 2                   | 0.02 | 1.5 |
| Detectors, Notifiers    | OS          | 21                  | 0.7  | 3   |

Fire assignments (use actual seed values for the reference object — specific devices TBD from Excel, but the verified result is `R1_per_visit = 10.52, R2_per_visit = 73.0`).

Repair data: `kvo = 8` (8 distinct repair types with count > 0), `repair_work_6months = 361 min`, `round_trip_min = 20`.

Records data: all zeros for the reference object (records_monthly = 0).

Travel: `one_way_time_min = 10`, therefore `round_trip_min = 20`.

Config constants: use TOR defaults — `monthlyHoursFund = 142.8`, `absenceCoefficient = 1.12`, `pzvMinutes = 20`, visit frequencies: OS 10/2, PS 8/4, Video 10/2, `planningPeriodMonths = 6`, `repairProductiveMonths = 5`, `repairTravelZeroThreshold = 5`, `repairTravelCap = 10`.

Verified intermediate values for PAC-01:

```
Security: R1_per_visit=29.14, R2_per_visit=98.4 → monthly_avg=40.683
Fire: R1_per_visit=10.52, R2_per_visit=73.0 → monthly_avg=30.417
Video: monthly_avg=0 (no video devices)
Records: monthly=0
Repair: repair_no_travel=72.2, repair_with_travel=136.2
total_no_travel   = 20+20+40.683+30.417+0+0+72.2  = 183.3
total_with_travel = 20+20+40.683+30.417+0+0+136.2 = 247.3
itogo_no_travel   = 183.3/60/142.8×1.12 = 0.023961
itogo_with_travel = 247.3/60/142.8×1.12 = 0.032327
```

### 3B: RepairCalculationTest

- [ ] **Step 2: Write RepairCalculationTest.java**

Unit test for the repair threshold logic. Can be tested in isolation via a helper method or the `RepairCalculationHelper` class. Uses `WorkloadConfig` with default values.

**All 8 boundary cases (mandatory from CONTRIBUTING.md):**

| Test method                         | kvo | Expected effective_trips | Band                         |
| ----------------------------------- | --- | ------------------------ | ---------------------------- |
| `kvo0_zeroTrips`                    | 0   | 0                        | A: kvo ≤ 5                   |
| `kvo3_zeroTrips`                    | 3   | 0                        | A: kvo ≤ 5                   |
| `kvo5_exactlyAtThreshold_zeroTrips` | 5   | 0                        | A: kvo ≤ 5 (inclusive)       |
| `kvo6_entersBandB`                  | 6   | 6                        | B: 5 < kvo ≤ 10              |
| `kvo8_bandB`                        | 8   | 8                        | B: 5 < kvo ≤ 10              |
| `kvo10_exactlyAtCap`                | 10  | 10                       | B: kvo ≤ 10 (not capped yet) |
| `kvo11_cappedAtCap`                 | 11  | 10                       | C: kvo > 10 → cap            |
| `kvo17_cappedAtCap`                 | 17  | 10                       | C: kvo > 10 → cap            |

For each kvo value, also verify:

- `repair_travel_6months = effective_trips × round_trip_min` (use `round_trip_min = 20`)
- `repair_pzv_6months = effective_trips × pzv_minutes` (use `pzv_minutes = 20`)
- `repair_no_travel_monthly = repair_work_6months / repairProductiveMonths`
- `repair_with_travel_monthly = (repair_work_6months + repair_travel_6months + repair_pzv_6months) / repairProductiveMonths`

Also include:

- `kvoCountsDistinctTypes_notSumOfQuantities`: 3 repair types with counts [3, 5, 0] → kvo = 2, not 8

### 3C: RecordsCalculationTest

- [ ] **Step 3: Write RecordsCalculationTest.java**

Unit test for records formula in isolation:

| Test method            | Input                                                                    | Expected                                                                                             |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `allFiveTaskTypes`     | access=2, monitoring=1, footage=3, backup=1, admin=4                     | `records_6months = 2×60 + 1×180 + 3×180 + 1×120 + 4×60 = 1200`; `records_monthly = 1200 / 6 = 200.0` |
| `allZeros`             | all counts 0                                                             | `records_monthly = 0`                                                                                |
| `singleTaskType`       | access=5, rest=0                                                         | `records_6months = 300`; `records_monthly = 50.0`                                                    |
| `usesConfigNormatives` | Verify that changing `recordsAccessMinutes` in config changes the result |

- [ ] **Step 4: Run all three test files — expect FAIL (compilation errors)**

```bash
cd backend && mvn test -Dtest="CalculationServiceTest,RepairCalculationTest,RecordsCalculationTest" -q
```

Expected: compilation errors — `CalculationService`, `RepairCalculationHelper`, `RecordsCalculationHelper` do not exist yet.

- [ ] **Step 5: Commit test files**

```bash
git add backend/src/test/java/com/workload/service/calculation/
git commit -m "test: add calculation engine tests — PAC-01, 8 repair thresholds, records formula"
```

---

## Task 4: Calculation Engine — Implementation

**Files:**

- Create: `backend/src/main/java/com/workload/service/calculation/CalculationService.java`
- Create: `backend/src/main/java/com/workload/service/calculation/RepairCalculationHelper.java`
- Create: `backend/src/main/java/com/workload/service/calculation/RecordsCalculationHelper.java`

### Implementation Requirements

All arithmetic uses `BigDecimal`. **NEVER** use `double` or `float`. All constants from `WorkloadConfig` — **NEVER** hardcoded. Scale for division: `10` with `RoundingMode.HALF_UP` for intermediate values, `6` for final stored values.

#### RepairCalculationHelper

Package-private helper class, `@Component`.

**Method:** `RepairResult calculate(List<ObjectRepair> repairs, BigDecimal roundTripMin, WorkloadConfig config)`

Behavioral spec:

1. `kvo = COUNT(repairs where count > 0)` — distinct type count, **NOT** sum of quantities
2. `repairWork6months = SUM(repair.count × repairType.timeMinutes)` for all repairs with `count > 0`
3. `effectiveTrips = threshold(kvo)`:
   - `kvo <= config.getRepairTravelZeroThreshold()` → `0`
   - `kvo <= config.getRepairTravelCap()` → `kvo`
   - `kvo > config.getRepairTravelCap()` → `config.getRepairTravelCap()`
4. `repairTravel6months = effectiveTrips × roundTripMin`
5. `repairPzv6months = effectiveTrips × config.getPzvMinutes()`
6. `repairNoTravelMonthly = repairWork6months / config.getRepairProductiveMonths()`
7. `repairWithTravelMonthly = (repairWork6months + repairTravel6months + repairPzv6months) / config.getRepairProductiveMonths()`

Returns a record/DTO: `RepairResult(repairNoTravelMonthly, repairWithTravelMonthly)`.

#### RecordsCalculationHelper

Package-private helper class, `@Component`.

**Method:** `BigDecimal calculateMonthly(RecordsTask records, WorkloadConfig config)`

Behavioral spec:

1. If `records` is null → return `BigDecimal.ZERO`
2. `records6months = access × config.getRecordsAccessMinutes() + monitoring × config.getRecordsMonitoringMinutes() + footage × config.getRecordsFootageMinutes() + backup × config.getRecordsBackupMinutes() + admin × config.getRecordsAdminMinutes()`
3. `recordsMonthly = records6months / config.getPlanningPeriodMonths()`

All multiplication/division uses `BigDecimal` operations.

#### CalculationService

`@Service` class. Injected dependencies: `ObjectSystemAssignmentRepository`, `RecordsTaskRepository`, `ObjectRepairRepository`, `TravelRepository`, `SummaryRepository`, `WorkloadConfig`, `RepairCalculationHelper`, `RecordsCalculationHelper`.

**Method:** `Summary recalculate(UUID objectId)`

Pipeline follows `docs/impl/calculation-engine.md` §6.1 stages exactly:

**Stage 1 — Per-assignment contribution:**

```
For each ObjectSystemAssignment (osa) for this objectId:
  DeviceSystemContext ctx = osa.getContext()
  r1_contrib = osa.quantityMaintained × ctx.r1Minutes
  r2_contrib = osa.quantityMaintained × ctx.r2Minutes
```

**Stage 2 — Per-system per-visit subtotals:**

```
For each systemType S ∈ {OS, PS, VIDEO}:
  R1_per_visit[S] = SUM(r1_contrib) where assignment.systemType = S
  R2_per_visit[S] = SUM(r2_contrib) where assignment.systemType = S
```

**Stage 3 — Annual time (system-specific visit frequencies from config):**

```
R1_annual[S] = R1_per_visit[S] × config.get{S}R1VisitsPerYear()
R2_annual[S] = R2_per_visit[S] × config.get{S}R2VisitsPerYear()
```

**Stage 4 — Monthly average per system:**

```
monthly_avg[S] = (R1_annual[S] + R2_annual[S]) / 12
```

**Stage 5 — Records and repairs:**

```
recordsMonthly = recordsHelper.calculateMonthly(recordsTask, config)
repairResult = repairHelper.calculate(objectRepairs, roundTripMin, config)
```

**Stage 6 — Summary aggregation and TOTAL:**

```
pzv = config.getPzvMinutes()
roundTripMin = travel.oneWayTimeMin × 2  (or 0 if no travel row)

total_no_travel = pzv + roundTripMin + os_monthly + ps_monthly + video_monthly
                + recordsMonthly + repairNoTravelMonthly

total_with_travel = pzv + roundTripMin + os_monthly + ps_monthly + video_monthly
                  + recordsMonthly + repairWithTravelMonthly

// Zero guard (C-39):
workComponents = os_monthly + ps_monthly + video_monthly + recordsMonthly
               + repairWithTravelMonthly

if (workComponents == 0):
  itogo_with_travel = 0
  itogo_no_travel = 0
else:
  itogo_with_travel = total_with_travel / 60 / config.monthlyHoursFund × config.absenceCoefficient
  itogo_no_travel = total_no_travel / 60 / config.monthlyHoursFund × config.absenceCoefficient
```

**Note on zero guard:** Use `BigDecimal.compareTo(BigDecimal.ZERO) == 0` — **never** use `==` or `.equals()` for BigDecimal comparison.

Persist the computed `Summary` entity (upsert — find existing by objectId or create new). Set `computedAt = Instant.now()`.

- [ ] **Step 1: Implement RecordsCalculationHelper**

- [ ] **Step 2: Run RecordsCalculationTest — expect PASS**

```bash
cd backend && mvn test -Dtest=RecordsCalculationTest -q
```

- [ ] **Step 3: Implement RepairCalculationHelper**

- [ ] **Step 4: Run RepairCalculationTest — expect PASS**

```bash
cd backend && mvn test -Dtest=RepairCalculationTest -q
```

- [ ] **Step 5: Implement CalculationService**

- [ ] **Step 6: Run CalculationServiceTest — expect PASS**

```bash
cd backend && mvn test -Dtest=CalculationServiceTest -q
```

**Critical:** Verify PAC-01 assertion passes: `itogo_chislo_with_travel = 0.032327 ±0.000001`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/service/calculation/
git commit -m "feat: implement calculation engine — PAC-01 passes, all 8 repair thresholds green"
```

---

## Task 5: Wire Synchronous Recalculation into M-01 Write Endpoints (S-02)

**Files to edit** (all in `backend/src/main/java/com/workload/service/`):

- `EquipmentService.java` — methods: `addDevice`, `updateDevice`, `removeDevice`, `addAssignment`, `updateAssignment`, `removeAssignment`
- `RecordsService.java` — method: `update`
- `RepairService.java` — method: `update`
- `TravelService.java` — method: `update`

**Files to create:**

- `backend/src/test/java/com/workload/service/RecalculationWiringIT.java`

### Behavioral Requirements

For every write method in the above services that mutates source data:

1. Add `@Transactional` if not already present (the write + recalculation must be atomic)
2. After the mutation, call `calculationService.recalculate(objectId)` within the same transaction
3. Add comment to each method: `// PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.`

**Do NOT recalculate on:**

- `ObjectService.delete` — cascade-deletes via FK `ON DELETE CASCADE` handle the summary deletion. Engineer summary recalculation is wired in M-03.
- Any GET/read-only method

### Integration Test

- [ ] **Step 1: Write RecalculationWiringIT.java**

`@SpringBootTest` with Testcontainers. For each service method category, one test:

```java
@Test
void updateDeviceQuantity_triggersRecalculation() {
    // Given: object with one OS device assignment (known quantity)
    // And: summary exists with known itogo value
    // When: update device quantity via EquipmentService
    // Then: summaryRepository.findByObjectId() returns updated itogo value (changed)
}

@Test
void updateRecords_triggersRecalculation() {
    // Given: object with known equipment and zero records
    // When: update records via RecordsService
    // Then: summary.recordsMonthly > 0
}

@Test
void updateTravel_triggersRecalculation() {
    // Given: object with equipment and known travel time
    // When: update travel one_way_time_min
    // Then: summary.roundTripMin = new_one_way × 2
}

@Test
void updateRepair_triggersRecalculation() {
    // Given: object with equipment and zero repairs
    // When: add repair count
    // Then: summary.repairNoTravelMonthly > 0
}
```

- [ ] **Step 2: Run test — expect FAIL** (recalculation not wired yet)

```bash
cd backend && mvn test -Dtest=RecalculationWiringIT -q
```

- [ ] **Step 3: Wire recalculation calls into all write service methods**

Inject `CalculationService` into `EquipmentService`, `RecordsService`, `RepairService`, `TravelService`. Add the `calculationService.recalculate(objectId)` call after each mutation.

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=RecalculationWiringIT -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/ \
        backend/src/test/java/com/workload/service/RecalculationWiringIT.java
git commit -m "feat: wire synchronous recalculation on all source-data writes (S-02)"
```

---

## Task 6: Summary Endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/dto/SvodRowDto.java`
- Create: `backend/src/main/java/com/workload/dto/ObjectSummaryDto.java`
- Create: `backend/src/main/java/com/workload/mapper/SummaryMapper.java`
- Create: `backend/src/main/java/com/workload/service/SvodService.java`
- Create: `backend/src/main/java/com/workload/controller/SvodController.java`
- Create: `backend/src/test/java/com/workload/service/SvodServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/SvodControllerIT.java`

### DTOs

**SvodRowDto** — flat DTO for one Summary row:

| Field                     | Type       | Source                                 |
| ------------------------- | ---------- | -------------------------------------- |
| `objectId`                | UUID       | `objects.id`                           |
| `objectName`              | String     | `objects.name`                         |
| `address`                 | String     | `objects.address`                      |
| `divisionName`            | String     | `divisions.name` (via branch)          |
| `branchName`              | String     | `branches.name`                        |
| `osMonthlyAvg`            | BigDecimal | `summaries.os_monthly_avg`             |
| `psMonthlyAvg`            | BigDecimal | `summaries.ps_monthly_avg`             |
| `videoMonthlyAvg`         | BigDecimal | `summaries.video_monthly_avg`          |
| `recordsMonthly`          | BigDecimal | `summaries.records_monthly`            |
| `repairNoTravelMonthly`   | BigDecimal | `summaries.repair_no_travel_monthly`   |
| `repairWithTravelMonthly` | BigDecimal | `summaries.repair_with_travel_monthly` |
| `roundTripMin`            | BigDecimal | `summaries.round_trip_min`             |
| `pzvMinutes`              | BigDecimal | `summaries.pzv_minutes`                |
| `totalNoTravelMin`        | BigDecimal | `summaries.total_no_travel_min`        |
| `itogoChisloNoTravel`     | BigDecimal | `summaries.itogo_chislo_no_travel`     |
| `totalWithTravelMin`      | BigDecimal | `summaries.total_with_travel_min`      |
| `itogoChisloWithTravel`   | BigDecimal | `summaries.itogo_chislo_with_travel`   |
| `r1PerVisitTotal`         | BigDecimal | `summaries.r1_per_visit_total`         |
| `r2PerVisitTotal`         | BigDecimal | `summaries.r2_per_visit_total`         |
| `computedAt`              | Instant    | `summaries.computed_at`                |

**ObjectSummaryDto** — subset for `GET /objects/:id/summary`, same fields minus org-hierarchy columns (no divisionName, branchName).

### SummaryMapper

`@Mapper(componentModel = "spring")` — maps `Summary` entity → `ObjectSummaryDto`. `SvodRowDto` is built via a JPQL projection or manual assembly in the service layer (requires join across objects → branches → divisions).

### SvodService

**Methods:**

```java
Page<SvodRowDto> getSvod(Pageable pageable, Optional<UUID> divisionId)
```

- JPQL query joining `summaries s JOIN s.object o JOIN o.branch b JOIN b.division d`
- When `divisionId` is present: `WHERE d.id = :divisionId`
- Default sort: `s.itogoChisloWithTravel DESC`
- Page size default: 100

```java
ObjectSummaryDto getObjectSummary(UUID objectId)
```

- Finds summary by objectId or throws `EntityNotFoundException` with code `OBJECT_NOT_FOUND`

### SvodController

| Method | Path                           | Description                                                                  |
| ------ | ------------------------------ | ---------------------------------------------------------------------------- |
| `GET`  | `/api/v1/svod`                 | Paginated Summary table. Query params: `page`, `size`, `division_id` (optional) |
| `GET`  | `/api/v1/objects/{id}/summary` | Single object summary                                                        |

Both return `ApiResponse<T>` envelope.

### TDD Cycle

- [ ] **Step 1: Write SvodServiceTest.java** — unit test (Mockito):
  - `getSvod_returnsPaginatedResults`
  - `getSvod_filtersByDivision`
  - `getObjectSummary_notFound_throws`

- [ ] **Step 2: Write SvodControllerIT.java** — integration test (RestAssured + Testcontainers):
  - Insert test data (division → branch → object → device + assignment → trigger recalculation via service call → verify summary row exists)
  - `GET /api/v1/svod` returns 200, page metadata correct, columns populated
  - `GET /api/v1/svod?division_id=X` returns only objects in that division
  - `GET /api/v1/objects/{id}/summary` returns 200 with correct values
  - `GET /api/v1/objects/{nonexistent}/summary` returns 404 `OBJECT_NOT_FOUND`
  - **PAC-05**: `assertThat(responseTime).isLessThan(3000L)` for first 100 rows

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd backend && mvn test -Dtest="SvodServiceTest,SvodControllerIT" -q
```

- [ ] **Step 4: Implement DTOs, mapper, service, controller**

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && mvn test -Dtest="SvodServiceTest,SvodControllerIT" -q
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/dto/SvodRowDto.java \
        backend/src/main/java/com/workload/dto/ObjectSummaryDto.java \
        backend/src/main/java/com/workload/mapper/SummaryMapper.java \
        backend/src/main/java/com/workload/service/SvodService.java \
        backend/src/main/java/com/workload/controller/SvodController.java \
        backend/src/test/java/com/workload/service/SvodServiceTest.java \
        backend/src/test/java/com/workload/controller/SvodControllerIT.java
git commit -m "feat: add Summary endpoints — GET /svod (paginated) and GET /objects/:id/summary"
```

---

## Task 7: Aggregation Endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/dto/AggregationCompanyDto.java`
- Create: `backend/src/main/java/com/workload/dto/AggregationDivisionDto.java`
- Create: `backend/src/main/java/com/workload/dto/AggregationBranchDto.java`
- Create: `backend/src/main/java/com/workload/dto/ComponentBreakdownDto.java`
- Create: `backend/src/main/java/com/workload/dto/CoverageGapDto.java`
- Create: `backend/src/main/java/com/workload/service/AggregationService.java`
- Create: `backend/src/main/java/com/workload/controller/AggregationController.java`
- Create: `backend/src/main/java/com/workload/controller/CoverageController.java`
- Create: `backend/src/test/java/com/workload/service/AggregationServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/AggregationControllerIT.java`

### DTOs

**AggregationCompanyDto:**

```java
BigDecimal requiredFte;            // SUM(itogo_chislo_with_travel)
BigDecimal staffingNeed;           // CEIL(requiredFte × 10) / 10
int objectCount;
int divisionCount;
ComponentBreakdownDto breakdown;
```

**AggregationDivisionDto** — matches TOR §16.7 response shape:

```java
UUID divisionId;
String divisionName;
int objectCount;
BigDecimal requiredFte;            // SUM(itogo_chislo_with_travel) for division
BigDecimal staffingNeed;           // CEIL(requiredFte × 10) / 10
BigDecimal uncoveredLoad;          // SUM(itogo) for objects with zero engineers
int coverageGapCount;              // objects with zero engineers
int engineersTotal;                // COUNT(engineers with home_division = this)
int engineersOverloaded;           // COUNT WHERE status='overloaded'
int engineersWarning;              // COUNT WHERE status='warning'
ComponentBreakdownDto breakdown;   // os, ps, video, records, repair (informational)
```

**AggregationBranchDto:** Same pattern as division but per-branch. Engineer overload counts are division-level echoed (per §16.6 note).

**ComponentBreakdownDto:**

```java
BigDecimal os;
BigDecimal ps;
BigDecimal video;
BigDecimal records;
BigDecimal repair;
```

Component breakdown conversion: `component_fte = SUM(component_monthly_avg / 60 / monthlyHoursFund × absenceCoefficient)` across objects in scope. These intentionally sum to **less than** `requiredFte` (PZV + travel gap — see §16.3).

**CoverageGapDto:**

```java
UUID objectId;
String objectName;
String address;
String divisionName;
String branchName;
BigDecimal itogoChisloWithTravel;
```

### AggregationService

All queries run **on the fly** against `summaries` joined with org hierarchy. No caching, no stored aggregations.

**Methods:**

```java
AggregationCompanyDto getCompany()
```

- `SUM(itogo_chislo_with_travel)` for all objects
- Component breakdown across all objects
- `staffingNeed = CEIL(requiredFte × 10) / 10`

```java
List<AggregationDivisionDto> getDivisions()
```

- GROUP BY division, aggregate per-division metrics
- Include engineer counts via `users.home_division_id` join (PoC: engineer_summaries may not exist yet — handle gracefully: 0 engineers if M-03 not yet merged)

```java
AggregationDivisionDto getDivision(UUID divisionId)
```

- Single division detail
- Includes branch-level breakdown within the division

```java
List<AggregationBranchDto> getBranches()
```

```java
AggregationBranchDto getBranch(UUID branchId)
```

```java
List<CoverageGapDto> getCoverageGaps(Optional<UUID> divisionId)
```

- Objects with zero rows in `object_engineers`
- Optional filter by `divisionId`
- Note: until M-03 is merged, ALL objects will appear as coverage gaps (no `object_engineers` rows exist)

### AggregationController

| Method | Path                                  |
| ------ | ------------------------------------- |
| `GET`  | `/api/v1/aggregations/company`        |
| `GET`  | `/api/v1/aggregations/divisions`      |
| `GET`  | `/api/v1/aggregations/divisions/{id}` |
| `GET`  | `/api/v1/aggregations/branches`       |
| `GET`  | `/api/v1/aggregations/branches/{id}`  |

### CoverageController

| Method | Path                    |
| ------ | ----------------------- |
| `GET`  | `/api/v1/coverage/gaps` |

Query param: `division_id` (optional UUID).

### TDD Cycle

- [ ] **Step 1: Write AggregationServiceTest.java** — unit test (Mockito):
  - `companyLoad_equalsSumOfDivisionLoads` (PAC-08 chain consistency)
  - `divisionLoad_equalsSumOfObjectLoads`
  - `branchLoad_equalsSumOfObjectLoads`
  - `componentBreakdown_sumsToLessThanRequiredFte` (PZV+travel gap)
  - `staffingNeed_roundsUpToNearestTenth`
  - `coverageGaps_returnsObjectsWithNoEngineers`
  - `coverageGaps_filtersbyDivision`

- [ ] **Step 2: Write AggregationControllerIT.java** — integration test (RestAssured + Testcontainers):
  - Seed data: create 2 divisions, 2 branches each, 3 objects across them, trigger recalculations
  - `GET /api/v1/aggregations/company` — returns correct company-wide FTE
  - `GET /api/v1/aggregations/divisions` — returns list with per-division FTE
  - **PAC-08**: `assertThat(divisionFte).isCloseTo(sumOfObjectFtes, within(0.000001))` — division FTE = SUM(object FTEs)
  - `GET /api/v1/aggregations/divisions/{id}` — returns 200 with correct breakdown
  - `GET /api/v1/aggregations/divisions/{nonexistent}` — returns 404
  - `GET /api/v1/coverage/gaps` — returns all objects (no engineers assigned yet)
  - `GET /api/v1/coverage/gaps?division_id=X` — returns only objects in that division

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd backend && mvn test -Dtest="AggregationServiceTest,AggregationControllerIT" -q
```

- [ ] **Step 4: Implement DTOs, service, controllers**

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && mvn test -Dtest="AggregationServiceTest,AggregationControllerIT" -q
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/dto/Aggregation*.java \
        backend/src/main/java/com/workload/dto/ComponentBreakdownDto.java \
        backend/src/main/java/com/workload/dto/CoverageGapDto.java \
        backend/src/main/java/com/workload/service/AggregationService.java \
        backend/src/main/java/com/workload/controller/AggregationController.java \
        backend/src/main/java/com/workload/controller/CoverageController.java \
        backend/src/test/java/com/workload/service/AggregationServiceTest.java \
        backend/src/test/java/com/workload/controller/AggregationControllerIT.java
git commit -m "feat: add aggregation and coverage gap endpoints (§16)"
```

---

## Task 8: XLSX Export

**Files:**

- Create: `backend/src/main/java/com/workload/service/XlsxExportService.java`
- Create: `backend/src/test/java/com/workload/service/XlsxExportServiceTest.java`

### XlsxExportService

`@Service`. Uses Apache POI (`XSSFWorkbook`).

**Method:** `byte[] exportSvod(List<SvodRowDto> rows)`

Behavioral spec:

1. Create `XSSFWorkbook` with one sheet: "Summary"
2. Header row (row 0): column names in English matching the original template structure:
   - "Object Name", "Address", "Division", "Branch", "Security (monthly)", "Fire (monthly)", "Video (monthly)", "Records (monthly)", "Repair without Travel (monthly)", "Repair with Travel (monthly)", "Round Trip Time", "PZV", "Maintenance+Repair(no travel) min", "TOTAL Staffing (no travel)", "Maintenance+Repair(with travel) min", "TOTAL Staffing (with travel)", "R1 per Visit Total", "R2 per Visit Total", "Calculation Date"
3. Data rows: one per `SvodRowDto`
4. Numeric cells use `BigDecimal.setScale(6, HALF_UP)` for FTE fields, `2` for minute fields
5. Auto-size columns
6. Return `workbook` as `byte[]` via `ByteArrayOutputStream`
7. **Close the workbook** after writing (try-with-resources)

### SvodController Addition

Add endpoint to existing `SvodController`:

```java
@GetMapping("/svod/export/xlsx")
public ResponseEntity<byte[]> exportXlsx(
    @RequestParam(required = false) UUID divisionId) {
  // Fetch all rows (no pagination for export)
  List<SvodRowDto> rows = svodService.getAllForExport(divisionId);
  byte[] xlsx = xlsxExportService.exportSvod(rows);
  return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=svod.xlsx")
      .contentType(MediaType.parseMediaType(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
      .body(xlsx);
}
```

### TDD Cycle

- [ ] **Step 1: Write XlsxExportServiceTest.java**

```java
@Test
void exportSvod_producesValidWorkbook() {
    // Given: list of 3 SvodRowDto with known values
    // When: exportSvod(rows)
    // Then: open byte[] as XSSFWorkbook
    //   - sheet name = "Summary"
    //   - row count = 4 (1 header + 3 data)
    //   - header row(0) cell(0) = "Object Name"
    //   - data row(1) cell for itogoChisloWithTravel matches ±0.001 (AC-09, PAC-03)
}

@Test
void exportSvod_emptyList_producesHeaderOnly() {
    // Given: empty list
    // When: exportSvod([])
    // Then: workbook has 1 row (header only)
}

@Test
void exportSvod_numericPrecision() {
    // Given: row with itogo = 0.032327
    // When: exported and read back
    // Then: cell value matches 0.032327 ±0.000001
}
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && mvn test -Dtest=XlsxExportServiceTest -q
```

- [ ] **Step 3: Implement XlsxExportService and add export endpoint to SvodController**

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=XlsxExportServiceTest -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/XlsxExportService.java \
        backend/src/main/java/com/workload/controller/SvodController.java \
        backend/src/test/java/com/workload/service/XlsxExportServiceTest.java
git commit -m "feat: add XLSX export for Summary (AC-09, PAC-03)"
```

---

## Task 9: Run All Quality Gates

- [ ] **Step 1: Auto-format**

```bash
cd backend && mvn spotless:apply
```

- [ ] **Step 2: Full verify**

```bash
cd backend && mvn verify
```

Expected: `BUILD SUCCESS`. Check:

- All unit tests pass
- All integration tests pass (Testcontainers)
- Jacoco thresholds pass:
  - `*.service.calculation.*` ≥ 95% line, ≥ 90% branch
  - `*.service.*` (other) ≥ 80% line, ≥ 75% branch
  - Overall ≥ 75% line, ≥ 70% branch
- Spotless: clean (no formatting violations)
- SpotBugs: no HIGH findings

- [ ] **Step 3: Fix any failures**

If Jacoco thresholds fail, add missing test cases (most likely edge cases in aggregation or export).
If SpotBugs flags issues, fix or add to `spotbugs-exclude.xml` with a comment explaining why.

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "chore: fix quality gate issues"
git push -u origin feature/poc-m02-backend
```

---

## Acceptance Criteria Traceability

| AC             | Where verified                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| AC-02          | `CalculationServiceTest.pac01_*` — all Summary values match ±0.001                                            |
| AC-07          | M-01 already rejects direct `round_trip_min` writes; summaries are never directly writable (no PUT endpoint) |
| AC-09          | `XlsxExportServiceTest.exportSvod_numericPrecision`                                                          |
| AC-10 / PAC-05 | `SvodControllerIT` — response time assertion <3s                                                             |
| AC-22          | `RepairCalculationTest` — all 3 bands                                                                        |
| AC-26          | `RecalculationWiringIT.updateRecords_triggersRecalculation`                                                  |
| PAC-01         | `CalculationServiceTest.pac01_referenceObject_itogoWithTravel` — `0.032327 ±0.000001`                        |
| PAC-03         | `XlsxExportServiceTest.exportSvod_numericPrecision`                                                          |
| PAC-04         | `RecalculationWiringIT` — edit triggers immediate summary update                                             |
| PAC-08         | `AggregationControllerIT` — division FTE = SUM(object FTEs)                                                  |
| PAC-09         | Existing `WorkloadApplicationTest` — health endpoint verified                                                |
