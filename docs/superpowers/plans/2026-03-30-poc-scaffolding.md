# PoC Scaffolding — Backend & Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a runnable Spring Boot + React skeleton with PostgreSQL migrations, all PoC dependencies wired, Docker Compose configured, and a passing context-load integration test — ready for PoC M-01 (Core CRUD) implementation.

**Architecture:** Spring Boot 3.x REST monolith (MVC, DTO layer via MapStruct), React 18 + TypeScript SPA. Backend and frontend are separate directories; Nginx reverse-proxies `/api/v1` to backend and serves frontend static files. Four-container Docker Compose (backend, frontend, postgres, nginx).

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.4.1, Maven, Spring Data JPA/Hibernate, Spring Security + JWT (jjwt 0.12.6), Spring Validation, Spring Actuator, Liquibase, MapStruct 1.6.3, Lombok 1.18.36, log4j2, Apache POI 5.3.0, Bucket4j 8.10.1, PostgreSQL 15
- Frontend: React 18, TypeScript 5, Vite 5, React Router 6, TanStack Query 5, Zustand 5, MUI 5, Axios 1, React Hook Form 7, Zod 3
- Testing: JUnit 5, Mockito, Testcontainers, RestAssured 5, Jacoco, Vitest
- Code quality: Spotless (Google Java Format), SpotBugs, ESLint (@typescript-eslint), Prettier

---

## File Structure

```
workload_calculation_system/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
│       ├── main/
│       │   ├── java/com/workload/
│       │   │   ├── WorkloadApplication.java
│       │   │   ├── config/
│       │   │   │   ├── WorkloadConfig.java        (19 @ConfigurationProperties keys)
│       │   │   │   ├── SecurityConfig.java         (JWT filter chain, permit /auth/**, /actuator/health)
│       │   │   │   └── RateLimitConfig.java        (Bucket4j — in-memory, per-IP, PoC)
│       │   │   ├── controller/                     (empty — filled in M-01)
│       │   │   ├── service/
│       │   │   │   └── calculation/               (empty — filled in M-02)
│       │   │   ├── repository/                     (empty — filled in M-01)
│       │   │   ├── entity/                         (empty — filled in M-01)
│       │   │   ├── dto/                            (empty — filled in M-01)
│       │   │   ├── mapper/                         (empty — filled in M-01)
│       │   │   └── exception/
│       │   │       └── GlobalExceptionHandler.java (empty — filled in M-01)
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── log4j2.xml
│       │       └── db/changelog/
│       │           ├── db.changelog-master.xml
│       │           └── changes/
│       │               ├── v1.0.0-initial-schema.xml   (all PoC tables + indexes)
│       │               └── v1.0.1-seed-data.xml        (device_types, device_system_contexts, repair_types)
│       └── test/
│           ├── java/com/workload/
│           │   ├── WorkloadApplicationTest.java    (Spring context loads)
│           │   └── config/
│           │       └── WorkloadConfigTest.java     (all 19 keys bind correctly)
│           └── resources/
│               └── application-test.yml
├── backend/spotbugs-exclude.xml            (suppress false positives in Spring/test code)
├── frontend/
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── .prettierignore
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── index.html
│   ├── Dockerfile
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   └── axios.ts                (Axios instance, JWT interceptor, 401 → /login)
│       ├── store/
│       │   └── authStore.ts            (Zustand: token, user, login(), logout())
│       ├── router/
│       │   └── index.tsx               (all PoC routes + ProtectedRoute wrapper)
│       ├── pages/
│       │   ├── LoginPage.tsx           (placeholder)
│       │   ├── DashboardPage.tsx       (placeholder)
│       │   ├── ObjectListPage.tsx      (placeholder)
│       │   ├── ObjectDetailPage.tsx    (placeholder)
│       │   ├── EngineerListPage.tsx    (placeholder)
│       │   ├── EngineerDetailPage.tsx  (placeholder)
│       │   ├── SvodPage.tsx            (placeholder)
│       │   ├── DivisionListPage.tsx    (placeholder)
│       │   ├── DivisionDetailPage.tsx  (placeholder)
│       │   └── BranchDetailPage.tsx    (placeholder)
│       ├── components/
│       │   └── layout/
│       │       └── AppLayout.tsx       (MUI sidebar nav + <Outlet />)
│       └── types/
│           └── api.ts                  (ApiResponse<T> envelope type from TOR §10)
├── nginx.poc.conf
├── docker-compose.poc.yml
└── .env.example
```

---

## Task 1: Backend — Maven project and pom.xml

**Files:**
- Create: `backend/pom.xml`

- [ ] **Step 1: Create the backend directory**

```bash
mkdir backend
```

- [ ] **Step 2: Write pom.xml**

Create `backend/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.1</version>
    <relativePath/>
  </parent>

  <groupId>com.workload</groupId>
  <artifactId>workload-backend</artifactId>
  <version>0.1.0-SNAPSHOT</version>
  <packaging>jar</packaging>

  <properties>
    <java.version>21</java.version>
    <mapstruct.version>1.6.3</mapstruct.version>
    <lombok.version>1.18.36</lombok.version>
    <jjwt.version>0.12.6</jjwt.version>
    <poi.version>5.3.0</poi.version>
    <bucket4j.version>8.10.1</bucket4j.version>
    <restassured.version>5.5.0</restassured.version>
    <!-- Code quality -->
    <spotless.version>2.43.0</spotless.version>
    <google-java-format.version>1.22.0</google-java-format.version>
    <spotbugs.plugin.version>4.8.6.4</spotbugs.plugin.version>
  </properties>

  <dependencies>
    <!-- Web -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <!-- Exclude default Logback — we use log4j2 -->
      <exclusions>
        <exclusion>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-starter-logging</artifactId>
        </exclusion>
      </exclusions>
    </dependency>

    <!-- log4j2 -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-log4j2</artifactId>
    </dependency>

    <!-- JPA / Hibernate -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Security -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- Bean Validation -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Actuator -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- PostgreSQL driver -->
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>

    <!-- Liquibase -->
    <dependency>
      <groupId>org.liquibase</groupId>
      <artifactId>liquibase-core</artifactId>
    </dependency>

    <!-- JWT -->
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-api</artifactId>
      <version>${jjwt.version}</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-impl</artifactId>
      <version>${jjwt.version}</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-jackson</artifactId>
      <version>${jjwt.version}</version>
      <scope>runtime</scope>
    </dependency>

    <!-- MapStruct -->
    <dependency>
      <groupId>org.mapstruct</groupId>
      <artifactId>mapstruct</artifactId>
      <version>${mapstruct.version}</version>
    </dependency>

    <!-- Lombok -->
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <version>${lombok.version}</version>
      <optional>true</optional>
    </dependency>

    <!-- Apache POI (XLSX export) -->
    <dependency>
      <groupId>org.apache.poi</groupId>
      <artifactId>poi-ooxml</artifactId>
      <version>${poi.version}</version>
    </dependency>

    <!-- Bucket4j rate limiting (in-memory, PoC — no Redis) -->
    <dependency>
      <groupId>com.bucket4j</groupId>
      <artifactId>bucket4j-core</artifactId>
      <version>${bucket4j.version}</version>
    </dependency>

    <!-- Test -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.security</groupId>
      <artifactId>spring-security-test</artifactId>
      <scope>test</scope>
    </dependency>

    <!-- Testcontainers -->
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>junit-jupiter</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>postgresql</artifactId>
      <scope>test</scope>
    </dependency>

    <!-- RestAssured -->
    <dependency>
      <groupId>io.rest-assured</groupId>
      <artifactId>rest-assured</artifactId>
      <version>${restassured.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>io.rest-assured</groupId>
      <artifactId>spring-mock-mvc</artifactId>
      <version>${restassured.version}</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes>
            <exclude>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </exclude>
          </excludes>
        </configuration>
      </plugin>

      <!-- Annotation processors: Lombok MUST come before MapStruct -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
          <source>21</source>
          <target>21</target>
          <annotationProcessorPaths>
            <path>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
              <version>${lombok.version}</version>
            </path>
            <path>
              <groupId>org.mapstruct</groupId>
              <artifactId>mapstruct-processor</artifactId>
              <version>${mapstruct.version}</version>
            </path>
          </annotationProcessorPaths>
        </configuration>
      </plugin>

      <!-- Jacoco coverage (thresholds from TOR §19.2) -->
      <plugin>
        <groupId>org.jacoco</groupId>
        <artifactId>jacoco-maven-plugin</artifactId>
        <executions>
          <execution>
            <id>prepare-agent</id>
            <goals><goal>prepare-agent</goal></goals>
          </execution>
          <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
          </execution>
          <execution>
            <id>check</id>
            <goals><goal>check</goal></goals>
            <configuration>
              <rules>
                <rule>
                  <element>PACKAGE</element>
                  <limits>
                    <limit>
                      <counter>LINE</counter>
                      <value>COVEREDRATIO</value>
                      <minimum>0.75</minimum>
                    </limit>
                  </limits>
                </rule>
              </rules>
            </configuration>
          </execution>
        </executions>
      </plugin>
      <!-- Spotless — auto-formatter using Google Java Format.
           mvn spotless:apply  → formats all sources in-place
           mvn spotless:check  → fails build if any file is not formatted (used in CI) -->
      <plugin>
        <groupId>com.diffplug.spotless</groupId>
        <artifactId>spotless-maven-plugin</artifactId>
        <version>${spotless.version}</version>
        <executions>
          <execution>
            <id>spotless-check</id>
            <phase>verify</phase>
            <goals><goal>check</goal></goals>
          </execution>
        </executions>
        <configuration>
          <java>
            <googleJavaFormat>
              <version>${google-java-format.version}</version>
              <style>GOOGLE</style>
              <reflowLongStrings>true</reflowLongStrings>
            </googleJavaFormat>
            <removeUnusedImports/>
            <trimTrailingWhitespace/>
            <endWithNewline/>
          </java>
        </configuration>
      </plugin>

      <!-- SpotBugs — static bug analysis.
           Fails build on HIGH-confidence bugs. Excludes: Spring config classes,
           test code, and known false positives (see spotbugs-exclude.xml).
           mvn spotbugs:gui  → opens interactive GUI to browse findings -->
      <plugin>
        <groupId>com.github.spotbugs</groupId>
        <artifactId>spotbugs-maven-plugin</artifactId>
        <version>${spotbugs.plugin.version}</version>
        <executions>
          <execution>
            <id>spotbugs-check</id>
            <phase>verify</phase>
            <goals><goal>check</goal></goals>
          </execution>
        </executions>
        <configuration>
          <effort>Max</effort>
          <threshold>High</threshold>
          <excludeFilterFile>spotbugs-exclude.xml</excludeFilterFile>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 3: Write spotbugs-exclude.xml**

Create `backend/spotbugs-exclude.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FindBugsFilter
    xmlns="https://github.com/spotbugs/filter/3.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="https://github.com/spotbugs/filter/3.0.0
      https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/findbugsfilter.xsd">

  <!-- Spring @Configuration classes use patterns SpotBugs flags incorrectly -->
  <Match>
    <Class name="~com\.workload\.config\..*"/>
    <Bug category="CORRECTNESS"/>
  </Match>

  <!-- Test classes: SpotBugs noise in @SpringBootTest / Testcontainers code -->
  <Match>
    <Class name="~.*Test"/>
  </Match>

  <!-- MapStruct-generated mapper implementations (target/ directory) -->
  <Match>
    <Class name="~com\.workload\.mapper\..*Impl"/>
  </Match>

</FindBugsFilter>
```

- [ ] **Step 5: Verify Maven can parse the POM**

```bash
cd backend && mvn validate
```

Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/spotbugs-exclude.xml
git commit -m "chore: add backend Maven project — dependencies, Jacoco, Spotless, SpotBugs"
```

---

## Task 2: Backend — directory structure and entry point

**Files:**
- Create: `backend/src/main/java/com/workload/WorkloadApplication.java`
- Create: empty package marker files for all packages

- [ ] **Step 1: Create package directories**

```bash
mkdir -p backend/src/main/java/com/workload/{config,controller,service/calculation,repository,entity,dto,mapper,exception}
mkdir -p backend/src/main/resources/db/changelog/changes
mkdir -p backend/src/test/java/com/workload/config
mkdir -p backend/src/test/resources
```

- [ ] **Step 2: Write WorkloadApplication.java**

Create `backend/src/main/java/com/workload/WorkloadApplication.java`:

```java
package com.workload;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.workload.config.WorkloadConfig;

@SpringBootApplication
@EnableConfigurationProperties(WorkloadConfig.class)
public class WorkloadApplication {
    public static void main(String[] args) {
        SpringApplication.run(WorkloadApplication.class, args);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/
git commit -m "chore: add Spring Boot entry point and package structure"
```

---

## Task 3: Backend — WorkloadConfig (19 config keys)

**Files:**
- Create: `backend/src/main/java/com/workload/config/WorkloadConfig.java`

The 19 keys from TOR §6.11. Spring binds `WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS` → `workload.config.planning-period-months`.

- [ ] **Step 1: Write the failing test first**

Create `backend/src/test/java/com/workload/config/WorkloadConfigTest.java`:

```java
package com.workload.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestPropertySource(properties = {
    "WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS=6",
    "WORKLOAD_CONFIG_REPAIR_PRODUCTIVE_MONTHS=5",
    "WORKLOAD_CONFIG_REPAIR_TRAVEL_ZERO_THRESHOLD=5",
    "WORKLOAD_CONFIG_REPAIR_TRAVEL_CAP=10",
    "WORKLOAD_CONFIG_PZV_MINUTES=20",
    "WORKLOAD_CONFIG_ENGINEER_WARNING_THRESHOLD=0.9",
    "WORKLOAD_CONFIG_OS_R1_VISITS_PER_YEAR=10",
    "WORKLOAD_CONFIG_OS_R2_VISITS_PER_YEAR=2",
    "WORKLOAD_CONFIG_PS_R1_VISITS_PER_YEAR=8",
    "WORKLOAD_CONFIG_PS_R2_VISITS_PER_YEAR=4",
    "WORKLOAD_CONFIG_VIDEO_R1_VISITS_PER_YEAR=10",
    "WORKLOAD_CONFIG_VIDEO_R2_VISITS_PER_YEAR=2",
    "WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES=60",
    "WORKLOAD_CONFIG_RECORDS_MONITORING_MINUTES=180",
    "WORKLOAD_CONFIG_RECORDS_FOOTAGE_MINUTES=180",
    "WORKLOAD_CONFIG_RECORDS_BACKUP_MINUTES=120",
    "WORKLOAD_CONFIG_RECORDS_ADMIN_MINUTES=60",
    "WORKLOAD_CONFIG_MINUTES_PER_MONTH=166",
    "WORKLOAD_CONFIG_ENGINEER_OVERLOAD_THRESHOLD=1.0"
})
class WorkloadConfigTest {

    @Autowired
    WorkloadConfig config;

    @Test
    void allKeysAreBound() {
        assertThat(config.getPlanningPeriodMonths()).isEqualTo(6);
        assertThat(config.getRepairProductiveMonths()).isEqualTo(5);
        assertThat(config.getRepairTravelZeroThreshold()).isEqualTo(5);
        assertThat(config.getRepairTravelCap()).isEqualTo(10);
        assertThat(config.getPzvMinutes()).isEqualTo(20);
        assertThat(config.getEngineerWarningThreshold())
            .isEqualByComparingTo(new BigDecimal("0.9"));
        assertThat(config.getOsR1VisitsPerYear()).isEqualTo(10);
        assertThat(config.getOsR2VisitsPerYear()).isEqualTo(2);
        assertThat(config.getPsR1VisitsPerYear()).isEqualTo(8);
        assertThat(config.getPsR2VisitsPerYear()).isEqualTo(4);
        assertThat(config.getVideoR1VisitsPerYear()).isEqualTo(10);
        assertThat(config.getVideoR2VisitsPerYear()).isEqualTo(2);
        assertThat(config.getRecordsAccessMinutes()).isEqualTo(60);
        assertThat(config.getRecordsMonitoringMinutes()).isEqualTo(180);
        assertThat(config.getRecordsFootageMinutes()).isEqualTo(180);
        assertThat(config.getRecordsBackupMinutes()).isEqualTo(120);
        assertThat(config.getRecordsAdminMinutes()).isEqualTo(60);
        assertThat(config.getMinutesPerMonth()).isEqualTo(166);
        assertThat(config.getEngineerOverloadThreshold())
            .isEqualByComparingTo(BigDecimal.ONE);
    }
}
```

- [ ] **Step 2: Run test — expect FAIL (class not found)**

```bash
cd backend && mvn test -pl . -Dtest=WorkloadConfigTest -q
```

Expected: compilation error — `WorkloadConfig` does not exist yet.

- [ ] **Step 3: Write WorkloadConfig.java**

Create `backend/src/main/java/com/workload/config/WorkloadConfig.java`:

```java
package com.workload.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

@ConfigurationProperties(prefix = "workload.config")
@Validated
@Getter
@Setter
public class WorkloadConfig {

    // §6.11 — Planning horizon
    @NotNull @Min(1)
    private Integer planningPeriodMonths;

    // Repair productive months (must be <= planningPeriodMonths — cross-key; MVP validation only)
    @NotNull @Min(1)
    private Integer repairProductiveMonths;

    // Repair travel threshold formula (§6.6)
    @NotNull @Min(0)
    private Integer repairTravelZeroThreshold;

    @NotNull @Min(1)
    private Integer repairTravelCap;

    // PZV (setup and wrap-up time) per trip, minutes
    @NotNull @Min(0)
    private Integer pzvMinutes;

    // Engineer status thresholds (§6.13)
    @NotNull @DecimalMin("0.0") @DecimalMax(value = "1.0", inclusive = false)
    private BigDecimal engineerWarningThreshold;

    @NotNull @DecimalMin("1.0")
    private BigDecimal engineerOverloadThreshold;

    // Visit frequencies per year by system type (§6.2)
    @NotNull @Min(1)
    private Integer osR1VisitsPerYear;

    @NotNull @Min(1)
    private Integer osR2VisitsPerYear;

    @NotNull @Min(1)
    private Integer psR1VisitsPerYear;

    @NotNull @Min(1)
    private Integer psR2VisitsPerYear;

    @NotNull @Min(1)
    private Integer videoR1VisitsPerYear;

    @NotNull @Min(1)
    private Integer videoR2VisitsPerYear;

    // Records task normatives, minutes (§6.5)
    @NotNull @Min(0)
    private Integer recordsAccessMinutes;

    @NotNull @Min(0)
    private Integer recordsMonitoringMinutes;

    @NotNull @Min(0)
    private Integer recordsFootageMinutes;

    @NotNull @Min(0)
    private Integer recordsBackupMinutes;

    @NotNull @Min(0)
    private Integer recordsAdminMinutes;

    // Working minutes per month — used for FTE conversion (§6.8)
    @NotNull @Min(1)
    private Integer minutesPerMonth;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=WorkloadConfigTest -q
```

Expected: `BUILD SUCCESS`, 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/config/WorkloadConfig.java \
        backend/src/test/java/com/workload/config/WorkloadConfigTest.java
git commit -m "feat: add WorkloadConfig with all 19 PoC config keys"
```

---

## Task 4: Backend — application.yml and log4j2.xml

**Files:**
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/log4j2.xml`
- Create: `backend/src/test/resources/application-test.yml`

- [ ] **Step 1: Write application.yml**

Create `backend/src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: workload-backend
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/workload}
    username: ${SPRING_DATASOURCE_USERNAME:postgres}
    password: ${SPRING_DATASOURCE_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.xml

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  endpoint:
    health:
      show-details: always

# JWT secret — must be set via env var in production
jwt:
  secret: ${JWT_SECRET}
  expiration-ms: 86400000  # 24h in PoC; no refresh tokens (TOR §21.2, S-04)

# 19 workload config keys — all required at startup (TOR §6.11)
# Spring maps WORKLOAD_CONFIG_<KEY> → workload.config.<key>
workload:
  config:
    planning-period-months: ${WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS}
    repair-productive-months: ${WORKLOAD_CONFIG_REPAIR_PRODUCTIVE_MONTHS}
    repair-travel-zero-threshold: ${WORKLOAD_CONFIG_REPAIR_TRAVEL_ZERO_THRESHOLD}
    repair-travel-cap: ${WORKLOAD_CONFIG_REPAIR_TRAVEL_CAP}
    pzv-minutes: ${WORKLOAD_CONFIG_PZV_MINUTES}
    engineer-warning-threshold: ${WORKLOAD_CONFIG_ENGINEER_WARNING_THRESHOLD}
    engineer-overload-threshold: ${WORKLOAD_CONFIG_ENGINEER_OVERLOAD_THRESHOLD}
    os-r1-visits-per-year: ${WORKLOAD_CONFIG_OS_R1_VISITS_PER_YEAR}
    os-r2-visits-per-year: ${WORKLOAD_CONFIG_OS_R2_VISITS_PER_YEAR}
    ps-r1-visits-per-year: ${WORKLOAD_CONFIG_PS_R1_VISITS_PER_YEAR}
    ps-r2-visits-per-year: ${WORKLOAD_CONFIG_PS_R2_VISITS_PER_YEAR}
    video-r1-visits-per-year: ${WORKLOAD_CONFIG_VIDEO_R1_VISITS_PER_YEAR}
    video-r2-visits-per-year: ${WORKLOAD_CONFIG_VIDEO_R2_VISITS_PER_YEAR}
    records-access-minutes: ${WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES}
    records-monitoring-minutes: ${WORKLOAD_CONFIG_RECORDS_MONITORING_MINUTES}
    records-footage-minutes: ${WORKLOAD_CONFIG_RECORDS_FOOTAGE_MINUTES}
    records-backup-minutes: ${WORKLOAD_CONFIG_RECORDS_BACKUP_MINUTES}
    records-admin-minutes: ${WORKLOAD_CONFIG_RECORDS_ADMIN_MINUTES}
    minutes-per-month: ${WORKLOAD_CONFIG_MINUTES_PER_MONTH}
```

- [ ] **Step 2: Write application-test.yml (provides all required env values for tests)**

Create `backend/src/test/resources/application-test.yml`:

```yaml
spring:
  datasource:
    url: jdbc:tc:postgresql:15:///workload  # Testcontainers JDBC URL (auto-starts container)
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
  jpa:
    hibernate:
      ddl-auto: none  # Liquibase manages schema
  liquibase:
    enabled: true

jwt:
  secret: test-secret-key-minimum-32-characters-long-for-hmac

workload:
  config:
    planning-period-months: 6
    repair-productive-months: 5
    repair-travel-zero-threshold: 5
    repair-travel-cap: 10
    pzv-minutes: 20
    engineer-warning-threshold: 0.9
    engineer-overload-threshold: 1.0
    os-r1-visits-per-year: 10
    os-r2-visits-per-year: 2
    ps-r1-visits-per-year: 8
    ps-r2-visits-per-year: 4
    video-r1-visits-per-year: 10
    video-r2-visits-per-year: 2
    records-access-minutes: 60
    records-monitoring-minutes: 180
    records-footage-minutes: 180
    records-backup-minutes: 120
    records-admin-minutes: 60
    minutes-per-month: 166
```

- [ ] **Step 3: Write log4j2.xml (JSON layout — required from day 1 per TOR §18)**

Create `backend/src/main/resources/log4j2.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
  <Appenders>
    <Console name="Console" target="SYSTEM_OUT">
      <JsonTemplateLayout eventTemplateUri="classpath:LogstashJsonEventLayoutV1.json"/>
    </Console>
  </Appenders>
  <Loggers>
    <Logger name="com.workload" level="INFO" additivity="false">
      <AppenderRef ref="Console"/>
    </Logger>
    <Root level="WARN">
      <AppenderRef ref="Console"/>
    </Root>
  </Loggers>
</Configuration>
```

> **Note:** `JsonTemplateLayout` is provided by `log4j-layout-template-json`, which is transitively included via `spring-boot-starter-log4j2`. The `LogstashJsonEventLayoutV1.json` template is bundled in that jar.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/ backend/src/test/resources/
git commit -m "chore: add application.yml, log4j2.xml, and test properties"
```

---

## Task 5: Backend — Liquibase schema migration (v1.0.0)

**Files:**
- Create: `backend/src/main/resources/db/changelog/db.changelog-master.xml`
- Create: `backend/src/main/resources/db/changelog/changes/v1.0.0-initial-schema.xml`

- [ ] **Step 1: Write db.changelog-master.xml**

Create `backend/src/main/resources/db/changelog/db.changelog-master.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
      https://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

  <include file="db/changelog/changes/v1.0.0-initial-schema.xml"/>
  <include file="db/changelog/changes/v1.0.1-seed-data.xml"/>
</databaseChangeLog>
```

- [ ] **Step 2: Write v1.0.0-initial-schema.xml**

Create `backend/src/main/resources/db/changelog/changes/v1.0.0-initial-schema.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
      https://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

  <changeSet id="v1.0.0-1" author="workload">
    <comment>PoC initial schema — divisions, branches, objects (TOR §15.4)</comment>

    <createTable tableName="divisions">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="name" type="varchar(255)"><constraints nullable="false"/></column>
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>

    <createTable tableName="branches">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="division_id" type="uuid"><constraints nullable="false"/></column>
      <column name="name" type="varchar(255)"><constraints nullable="false"/></column>
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="branches" baseColumnNames="division_id"
        constraintName="fk_branches_division"
        referencedTableName="divisions" referencedColumnNames="id"
        onDelete="RESTRICT"/>

    <createTable tableName="objects">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="branch_id" type="uuid"><constraints nullable="false"/></column>
      <column name="name" type="varchar(500)"><constraints nullable="false"/></column>
      <column name="import_seq_no" type="integer"/>
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="objects" baseColumnNames="branch_id"
        constraintName="fk_objects_branch"
        referencedTableName="branches" referencedColumnNames="id"
        onDelete="RESTRICT"/>
  </changeSet>

  <changeSet id="v1.0.0-2" author="workload">
    <comment>Device catalog — seed-only in PoC (S-03)</comment>

    <createTable tableName="device_types">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="name" type="varchar(255)"><constraints nullable="false" unique="true"/></column>
      <column name="description" type="text"/>
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>

    <createTable tableName="device_system_contexts">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="device_type_id" type="uuid"><constraints nullable="false"/></column>
      <!-- system_type: 'OS' | 'PS' | 'VIDEO' -->
      <column name="system_type" type="varchar(10)"><constraints nullable="false"/></column>
      <column name="r1_minutes" type="decimal(10,4)"><constraints nullable="false"/></column>
      <column name="r2_minutes" type="decimal(10,4)"><constraints nullable="false"/></column>
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="device_system_contexts" baseColumnNames="device_type_id"
        constraintName="fk_dsc_device_type"
        referencedTableName="device_types" referencedColumnNames="id"
        onDelete="RESTRICT"/>
    <addUniqueConstraint
        tableName="device_system_contexts"
        columnNames="device_type_id,system_type"
        constraintName="uq_dsc_device_system"/>
  </changeSet>

  <changeSet id="v1.0.0-3" author="workload">
    <comment>Equipment — two-layer model (S-01 removed in TOR v2.9)</comment>

    <createTable tableName="object_devices">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="device_type_id" type="uuid"><constraints nullable="false"/></column>
      <column name="quantity_physical" type="decimal(10,2)"><constraints nullable="false"/></column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="object_devices" baseColumnNames="object_id"
        constraintName="fk_od_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addForeignKeyConstraint
        baseTableName="object_devices" baseColumnNames="device_type_id"
        constraintName="fk_od_device_type"
        referencedTableName="device_types" referencedColumnNames="id"
        onDelete="RESTRICT"/>
    <addUniqueConstraint
        tableName="object_devices"
        columnNames="object_id,device_type_id"
        constraintName="uq_od_object_device"/>

    <createTable tableName="object_system_assignments">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="device_type_id" type="uuid"><constraints nullable="false"/></column>
      <column name="system_type" type="varchar(10)"><constraints nullable="false"/></column>
      <column name="quantity_maintained" type="decimal(10,2)"><constraints nullable="false"/></column>
      <column name="context_id" type="uuid"><constraints nullable="false"/></column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="object_system_assignments" baseColumnNames="object_id"
        constraintName="fk_osa_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addForeignKeyConstraint
        baseTableName="object_system_assignments" baseColumnNames="context_id"
        constraintName="fk_osa_context"
        referencedTableName="device_system_contexts" referencedColumnNames="id"
        onDelete="RESTRICT"/>
    <addUniqueConstraint
        tableName="object_system_assignments"
        columnNames="object_id,device_type_id,system_type"
        constraintName="uq_osa_object_device_system"/>
  </changeSet>

  <changeSet id="v1.0.0-4" author="workload">
    <comment>Repair catalog and operational data (no period FK — S-05)</comment>

    <createTable tableName="repair_types">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="name" type="varchar(255)"><constraints nullable="false" unique="true"/></column>
      <column name="time_minutes" type="decimal(10,4)"><constraints nullable="false"/></column>
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>

    <createTable tableName="object_repairs">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="repair_type_id" type="uuid"><constraints nullable="false"/></column>
      <column name="count" type="integer" defaultValueNumeric="0">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="object_repairs" baseColumnNames="object_id"
        constraintName="fk_or_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addForeignKeyConstraint
        baseTableName="object_repairs" baseColumnNames="repair_type_id"
        constraintName="fk_or_repair_type"
        referencedTableName="repair_types" referencedColumnNames="id"
        onDelete="RESTRICT"/>
    <addUniqueConstraint
        tableName="object_repairs"
        columnNames="object_id,repair_type_id"
        constraintName="uq_or_object_repair"/>

    <createTable tableName="records_tasks">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="access_requests" type="integer" defaultValueNumeric="0">
        <constraints nullable="false"/>
      </column>
      <column name="monitoring_requests" type="integer" defaultValueNumeric="0">
        <constraints nullable="false"/>
      </column>
      <column name="footage_requests" type="integer" defaultValueNumeric="0">
        <constraints nullable="false"/>
      </column>
      <column name="backup_control" type="integer" defaultValueNumeric="0">
        <constraints nullable="false"/>
      </column>
      <column name="security_admin" type="integer" defaultValueNumeric="0">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="records_tasks" baseColumnNames="object_id"
        constraintName="fk_rt_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addUniqueConstraint
        tableName="records_tasks" columnNames="object_id"
        constraintName="uq_rt_object"/>

    <createTable tableName="travel">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="transport_type" type="varchar(50)"/>
      <column name="distance_km" type="decimal(10,2)"/>
      <column name="one_way_time_min" type="decimal(10,2)"/>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="travel" baseColumnNames="object_id"
        constraintName="fk_travel_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addUniqueConstraint
        tableName="travel" columnNames="object_id"
        constraintName="uq_travel_object"/>
  </changeSet>

  <changeSet id="v1.0.0-5" author="workload">
    <comment>Computed cache — summaries (synchronous PoC, no is_stale — S-02)</comment>

    <createTable tableName="summaries">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="os_r1_per_visit" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="os_r2_per_visit" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="ps_r1_per_visit" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="ps_r2_per_visit" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="video_r1_per_visit" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="video_r2_per_visit" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="r1_per_visit_total" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="r2_per_visit_total" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="os_monthly_avg" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="ps_monthly_avg" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="video_monthly_avg" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="records_monthly" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="repair_no_travel_monthly" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="repair_with_travel_monthly" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="round_trip_min" type="decimal(10,2)" defaultValueNumeric="0"/>
      <column name="pzv_minutes" type="decimal(10,2)" defaultValueNumeric="0"/>
      <column name="total_no_travel_min" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="itogo_chislo_no_travel" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="total_with_travel_min" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="itogo_chislo_with_travel" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="computed_at" type="timestamptz"/>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="summaries" baseColumnNames="object_id"
        constraintName="fk_summaries_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addUniqueConstraint
        tableName="summaries" columnNames="object_id"
        constraintName="uq_summaries_object"/>
  </changeSet>

  <changeSet id="v1.0.0-6" author="workload">
    <comment>Users and engineer module (roles exist, no RBAC enforcement — S-04)</comment>

    <createTable tableName="users">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="email" type="varchar(255)">
        <constraints nullable="false" unique="true"/>
      </column>
      <column name="name" type="varchar(255)"><constraints nullable="false"/></column>
      <column name="password_hash" type="varchar(255)"><constraints nullable="false"/></column>
      <!-- 'admin' | 'editor' | 'viewer' | 'engineer' — stored but not enforced in PoC -->
      <column name="role" type="varchar(20)" defaultValue="viewer">
        <constraints nullable="false"/>
      </column>
      <!-- division_id: access scope for editors; NULL = all divisions -->
      <column name="division_id" type="uuid"/>
      <!-- home_division_id: display + travel reference for engineers -->
      <column name="home_division_id" type="uuid"/>
      <column name="capacity_fte" type="decimal(4,2)" defaultValueNumeric="1.0">
        <constraints nullable="false"/>
      </column>
      <column name="employee_id" type="varchar(100)"/>
      <column name="is_active" type="boolean" defaultValueBoolean="true">
        <constraints nullable="false"/>
      </column>
      <column name="requires_activation" type="boolean" defaultValueBoolean="false">
        <constraints nullable="false"/>
      </column>
      <!-- NOTE: failed_login_count and locked_until are MVP-only (M-02, §21.3) -->
      <!-- DO NOT add them here — see poc-scope.md MVP-only columns table -->
      <column name="created_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="updated_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="users" baseColumnNames="division_id"
        constraintName="fk_users_division"
        referencedTableName="divisions" referencedColumnNames="id"
        onDelete="SET NULL"/>
    <addForeignKeyConstraint
        baseTableName="users" baseColumnNames="home_division_id"
        constraintName="fk_users_home_division"
        referencedTableName="divisions" referencedColumnNames="id"
        onDelete="SET NULL"/>

    <createTable tableName="object_engineers">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="object_id" type="uuid"><constraints nullable="false"/></column>
      <column name="engineer_id" type="uuid"><constraints nullable="false"/></column>
      <column name="assigned_at" type="timestamptz" defaultValueComputed="now()">
        <constraints nullable="false"/>
      </column>
      <column name="assigned_by" type="uuid"/>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="object_engineers" baseColumnNames="object_id"
        constraintName="fk_oe_object"
        referencedTableName="objects" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addForeignKeyConstraint
        baseTableName="object_engineers" baseColumnNames="engineer_id"
        constraintName="fk_oe_engineer"
        referencedTableName="users" referencedColumnNames="id"
        onDelete="RESTRICT"/>
    <addUniqueConstraint
        tableName="object_engineers"
        columnNames="object_id,engineer_id"
        constraintName="uq_oe_object_engineer"/>

    <createTable tableName="engineer_summaries">
      <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
        <constraints primaryKey="true" nullable="false"/>
      </column>
      <column name="engineer_id" type="uuid"><constraints nullable="false"/></column>
      <column name="total_load" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="object_count" type="integer" defaultValueNumeric="0"/>
      <column name="os_load" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="ps_load" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="video_load" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="records_load" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="repair_load" type="decimal(18,6)" defaultValueNumeric="0"/>
      <column name="capacity_fte" type="decimal(4,2)" defaultValueNumeric="1.0"/>
      <column name="load_ratio" type="decimal(10,6)" defaultValueNumeric="0"/>
      <!-- status: 'normal' | 'warning' | 'overloaded' -->
      <column name="status" type="varchar(20)" defaultValue="normal"/>
      <column name="computed_at" type="timestamptz"/>
    </createTable>
    <addForeignKeyConstraint
        baseTableName="engineer_summaries" baseColumnNames="engineer_id"
        constraintName="fk_es_engineer"
        referencedTableName="users" referencedColumnNames="id"
        onDelete="CASCADE"/>
    <addUniqueConstraint
        tableName="engineer_summaries" columnNames="engineer_id"
        constraintName="uq_es_engineer"/>
  </changeSet>

  <changeSet id="v1.0.0-7" author="workload">
    <comment>Indexes — PoC set (TOR §5.3)</comment>

    <createIndex tableName="branches" indexName="idx_branches_division_id">
      <column name="division_id"/>
    </createIndex>
    <createIndex tableName="objects" indexName="idx_objects_branch_id">
      <column name="branch_id"/>
    </createIndex>
    <createIndex tableName="object_devices" indexName="idx_od_object_id">
      <column name="object_id"/>
    </createIndex>
    <createIndex tableName="object_system_assignments" indexName="idx_osa_object_id">
      <column name="object_id"/>
    </createIndex>
    <createIndex tableName="object_repairs" indexName="idx_or_object_id">
      <column name="object_id"/>
    </createIndex>
    <createIndex tableName="object_engineers" indexName="idx_oe_engineer_id">
      <column name="engineer_id"/>
    </createIndex>
    <createIndex tableName="object_engineers" indexName="idx_oe_object_id">
      <column name="object_id"/>
    </createIndex>
  </changeSet>

</databaseChangeLog>
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/changelog/
git commit -m "feat: add Liquibase v1.0.0 PoC schema migration (all tables + indexes)"
```

---

## Task 6: Backend — Seed data migration (v1.0.1)

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/v1.0.1-seed-data.xml`

All values are sourced from TOR §4.2 (device types + R1/R2 normatives) and §4.5 (repair types). No XLSX extraction needed.

**Totals:** 28 device types, 35 device-system contexts (14 OS + 18 PS + 3 Video), 25 repair types.

- [ ] **Step 1: Copy the pre-built seed data file**

The complete `v1.0.1-seed-data.xml` with all values is at `docs/superpowers/plans/seed-data/v1.0.1-seed-data.xml`.

```bash
cp docs/superpowers/plans/seed-data/v1.0.1-seed-data.xml \
   backend/src/main/resources/db/changelog/changes/v1.0.1-seed-data.xml
```

Key facts encoded in the file:
- Device types with shared names across systems (e.g. "Series A6, Alarm") get **one** `device_types` row with **two** context rows — one per system, with different R1/R2 values where applicable (e.g. "Detectors, Notifiers": OS R1=0.7, PS R1=0.3).
- `system_type` values are `'OS'`, `'PS'`, `'VIDEO'` (uppercase) — must match exactly what the application code uses in enums/queries.
- UUIDs are deterministic (prefix `10…` for device types, `20…` for contexts, `30…` for repair types) so migrations are idempotent.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/resources/db/changelog/changes/v1.0.1-seed-data.xml
git commit -m "feat: add seed data migration — 28 device types, 35 contexts, 25 repair types (TOR §4.2, §4.5)"
```

---

## Task 7: Backend — context loads integration test

**Files:**
- Create: `backend/src/test/java/com/workload/WorkloadApplicationTest.java`

This test validates: Spring context starts, Liquibase migrations run on a real PostgreSQL container, all beans wire correctly.

- [ ] **Step 1: Write the test**

Create `backend/src/test/java/com/workload/WorkloadApplicationTest.java`:

```java
package com.workload;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WorkloadApplicationTest {

    @Test
    void contextLoads() {
        // Passes if Spring context starts successfully.
        // Testcontainers JDBC URL in application-test.yml spins up a real PostgreSQL 15
        // container and runs all Liquibase migrations automatically.
        // Failure here means: bad bean wiring, missing config key, or broken migration.
    }
}
```

- [ ] **Step 2: Run the test (requires Docker)**

```bash
cd backend && mvn test -Dtest=WorkloadApplicationTest
```

Expected with seed data placeholders: Liquibase changeset `v1.0.1-*` may succeed (inserts run) but context should load. If seed data is malformed, fix the XML and re-run.

Expected output: `BUILD SUCCESS`, 1 test passed.

> If seed data placeholders fail the migration, comment out `<include file=".../v1.0.1-seed-data.xml"/>` in `db.changelog-master.xml` temporarily to verify the schema migration alone passes, then restore it after filling seed data.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/workload/WorkloadApplicationTest.java
git commit -m "test: add context-load integration test (Testcontainers + Liquibase)"
```

---

## Task 8: Backend — Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
# Stage 1: build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apk add --no-cache maven && mvn package -DskipTests -q

# Stage 2: runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/workload-backend-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore: add backend Dockerfile (multi-stage, JRE runtime)"
```

---

## Task 9: Frontend — Vite + React + TypeScript scaffold

**Files:**
- Create: `frontend/` (via Vite CLI)

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

- [ ] **Step 2: Install all PoC dependencies**

```bash
npm install \
  react-router-dom@6 \
  @tanstack/react-query@5 \
  zustand@5 \
  @mui/material@5 @mui/x-data-grid@6 @emotion/react @emotion/styled \
  @mui/icons-material@5 \
  axios@1 \
  react-hook-form@7 \
  zod@3 @hookform/resolvers@3
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev \
  vitest@1 \
  @testing-library/react@14 \
  @testing-library/jest-dom@6 \
  @testing-library/user-event@14 \
  jsdom@24
```

- [ ] **Step 4: Update vite.config.ts to add test config**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `frontend/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Install ESLint + Prettier**

```bash
npm install --save-dev \
  eslint@8 \
  @typescript-eslint/parser@6 \
  @typescript-eslint/eslint-plugin@6 \
  eslint-plugin-react-hooks@4 \
  eslint-plugin-react-refresh@0.4 \
  prettier@3 \
  eslint-config-prettier@9 \
  eslint-plugin-prettier@5
```

- [ ] **Step 7: Write .eslintrc.cjs**

Create `frontend/.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.app.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',  // must be last — disables ESLint rules that conflict with Prettier
  ],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-explicit-any': 'error',       // no `any` — use `unknown` or a proper type
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',  // too noisy for React components
    'prettier/prettier': 'error',
  },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
}
```

- [ ] **Step 8: Write .prettierrc**

Create `frontend/.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 9: Write .prettierignore**

Create `frontend/.prettierignore`:

```
dist
node_modules
```

- [ ] **Step 10: Add lint/format scripts to package.json**

In `frontend/package.json`, add to the `"scripts"` block:

```json
"lint":           "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
"lint:fix":       "eslint src --ext ts,tsx --fix",
"format":         "prettier --write src",
"format:check":   "prettier --check src"
```

- [ ] **Step 11: Verify ESLint passes on scaffold code**

```bash
npm run lint
```

Expected: no errors. Fix any reported issues before continuing.

- [ ] **Step 12: Verify Prettier passes**

```bash
npm run format:check
```

Expected: `All matched files use Prettier formatting!`
If files are unformatted, run `npm run format` first, then re-check.

- [ ] **Step 13: Commit**

```bash
cd ..
git add frontend/
git commit -m "chore: scaffold React 18 + TypeScript frontend with ESLint, Prettier, and test setup"
```

---

## Task 10: Frontend — API types, Axios instance, auth store

**Files:**
- Create: `frontend/src/types/api.ts`
- Create: `frontend/src/api/axios.ts`
- Create: `frontend/src/store/authStore.ts`

- [ ] **Step 1: Write the Zod schema test first**

Create `frontend/src/test/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ApiResponseSchema } from '../types/api'

describe('ApiResponseSchema', () => {
  it('parses a success envelope', () => {
    const raw = { data: { id: '123' }, meta: null, error: null }
    const result = ApiResponseSchema(z.object({ id: z.string() })).parse(raw)
    expect(result.data.id).toBe('123')
  })

  it('parses an error envelope', () => {
    const raw = { data: null, meta: null, error: { code: 'NOT_FOUND', message: 'not found' } }
    const result = ApiResponseSchema(z.null()).parse(raw)
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/test/api.test.ts
```

Expected: import error for `ApiResponseSchema`.

- [ ] **Step 3: Write api.ts**

Create `frontend/src/types/api.ts`:

```typescript
import { z } from 'zod'

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export const MetaSchema = z.object({
  page: z.number().optional(),
  total: z.number().optional(),
  per_page: z.number().optional(),
}).nullable()

// Factory: ApiResponseSchema(z.object({...})) produces a typed response schema.
// Matches TOR §10 response envelope: { data, meta, error }
export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    meta: MetaSchema,
    error: ErrorSchema.nullable(),
  })
}

export type ApiError = z.infer<typeof ErrorSchema>
export type ApiMeta = z.infer<typeof MetaSchema>
export type ApiResponse<T> = {
  data: T | null
  meta: ApiMeta
  error: ApiError | null
}
```

- [ ] **Step 4: Fix the test import and run — expect PASS**

Update `frontend/src/test/api.test.ts` to add the missing `z` import:

```typescript
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { ApiResponseSchema } from '../types/api'
```

```bash
npx vitest run src/test/api.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Write Axios instance**

Create `frontend/src/api/axios.ts`:

```typescript
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 → clear auth and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 6: Write auth store**

Create `frontend/src/store/authStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer' | 'engineer'
}

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => get().token !== null,
    }),
    { name: 'auth' }  // persists to localStorage under key 'auth'
  )
)
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/src/types/ frontend/src/api/ frontend/src/store/ frontend/src/test/
git commit -m "feat: add frontend API types, Axios JWT interceptor, and auth store"
```

---

## Task 11: Frontend — router with all PoC routes

**Files:**
- Create: `frontend/src/router/index.tsx`
- Create: `frontend/src/pages/*.tsx` (placeholder pages)
- Create: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Write placeholder pages**

For each file below, create with the same pattern (replace `PageName` with the name):

`frontend/src/pages/LoginPage.tsx`:
```tsx
export default function LoginPage() {
  return <div>Login — TODO</div>
}
```

Create the same placeholder for each of:
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/ObjectListPage.tsx`
- `frontend/src/pages/ObjectDetailPage.tsx`
- `frontend/src/pages/EngineerListPage.tsx`
- `frontend/src/pages/EngineerDetailPage.tsx`
- `frontend/src/pages/SvodPage.tsx`
- `frontend/src/pages/DivisionListPage.tsx`
- `frontend/src/pages/DivisionDetailPage.tsx`
- `frontend/src/pages/BranchDetailPage.tsx`

- [ ] **Step 2: Write AppLayout**

Create `frontend/src/components/layout/AppLayout.tsx`:

```tsx
import { Outlet, useNavigate } from 'react-router-dom'
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from '@mui/material'
import { useAuthStore } from '../../store/authStore'

const NAV_WIDTH = 220

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Objects', path: '/objects' },
  { label: 'Engineers', path: '/engineers' },
  { label: 'Summary', path: '/svod' },
  { label: 'Divisions', path: '/divisions' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Workload Calculator</Typography>
          <ListItemButton onClick={() => { logout(); navigate('/login') }} sx={{ width: 'auto', color: 'white' }}>
            Sign Out
          </ListItemButton>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: NAV_WIDTH, '& .MuiDrawer-paper': { width: NAV_WIDTH, boxSizing: 'border-box' } }}>
        <Toolbar />
        <List>
          {navItems.map((item) => (
            <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${NAV_WIDTH}px` }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
```

- [ ] **Step 3: Write router**

Create `frontend/src/router/index.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import ObjectListPage from '../pages/ObjectListPage'
import ObjectDetailPage from '../pages/ObjectDetailPage'
import EngineerListPage from '../pages/EngineerListPage'
import EngineerDetailPage from '../pages/EngineerDetailPage'
import SvodPage from '../pages/SvodPage'
import DivisionListPage from '../pages/DivisionListPage'
import DivisionDetailPage from '../pages/DivisionDetailPage'
import BranchDetailPage from '../pages/BranchDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/objects', element: <ObjectListPage /> },
      { path: '/objects/new', element: <ObjectDetailPage /> },
      { path: '/objects/:id', element: <ObjectDetailPage /> },
      { path: '/objects/:id/edit', element: <ObjectDetailPage /> },
      { path: '/engineers', element: <EngineerListPage /> },
      { path: '/engineers/:id', element: <EngineerDetailPage /> },
      { path: '/engineers/:id/edit', element: <EngineerDetailPage /> },
      { path: '/svod', element: <SvodPage /> },
      { path: '/svod/export', element: <SvodPage /> },
      { path: '/divisions', element: <DivisionListPage /> },
      { path: '/divisions/:id', element: <DivisionDetailPage /> },
      { path: '/branches/:id', element: <BranchDetailPage /> },
    ],
  },
])
```

- [ ] **Step 4: Update App.tsx and main.tsx**

Replace `frontend/src/App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

const theme = createTheme()

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

Replace `frontend/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` is accessible, navigating to `/` redirects to `/login`.

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add all PoC routes, AppLayout, placeholder pages, QueryClient + MUI theme"
```

---

## Task 12: Frontend — Dockerfile

**Files:**
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

Create `frontend/Dockerfile`:

```dockerfile
# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Nginx serves static files
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx config is provided via docker-compose volume mount (nginx.poc.conf)
EXPOSE 80
```

- [ ] **Step 2: Commit**

```bash
git add frontend/Dockerfile
git commit -m "chore: add frontend Dockerfile (Vite build + Nginx static serving)"
```

---

## Task 13: Nginx config + Docker Compose

**Files:**
- Create: `nginx.poc.conf`
- Create: `docker-compose.poc.yml`
- Create: `.env.example`

- [ ] **Step 1: Write nginx.poc.conf**

Create `nginx.poc.conf` at repo root:

```nginx
events { worker_connections 1024; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;

  upstream backend {
    server backend:8080;
  }

  server {
    listen 80;
    server_name _;

    # Redirect HTTP → HTTPS (uncomment when self-signed cert is ready)
    # return 301 https://$host$request_uri;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API calls to Spring Boot
    location /api/ {
      proxy_pass http://backend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Actuator health (exposed for Docker healthcheck)
    location /actuator/health {
      proxy_pass http://backend;
    }

    # React SPA — all other routes serve index.html
    location / {
      try_files $uri $uri/ /index.html;
    }
  }
}
```

- [ ] **Step 2: Write docker-compose.poc.yml**

Create `docker-compose.poc.yml` at repo root (structure from TOR §15.8):

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/workload
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      # 19 required workload config keys (TOR §6.11)
      WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS: ${WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS:-6}
      WORKLOAD_CONFIG_REPAIR_PRODUCTIVE_MONTHS: ${WORKLOAD_CONFIG_REPAIR_PRODUCTIVE_MONTHS:-5}
      WORKLOAD_CONFIG_REPAIR_TRAVEL_ZERO_THRESHOLD: ${WORKLOAD_CONFIG_REPAIR_TRAVEL_ZERO_THRESHOLD:-5}
      WORKLOAD_CONFIG_REPAIR_TRAVEL_CAP: ${WORKLOAD_CONFIG_REPAIR_TRAVEL_CAP:-10}
      WORKLOAD_CONFIG_PZV_MINUTES: ${WORKLOAD_CONFIG_PZV_MINUTES:-20}
      WORKLOAD_CONFIG_ENGINEER_WARNING_THRESHOLD: ${WORKLOAD_CONFIG_ENGINEER_WARNING_THRESHOLD:-0.9}
      WORKLOAD_CONFIG_ENGINEER_OVERLOAD_THRESHOLD: ${WORKLOAD_CONFIG_ENGINEER_OVERLOAD_THRESHOLD:-1.0}
      WORKLOAD_CONFIG_OS_R1_VISITS_PER_YEAR: ${WORKLOAD_CONFIG_OS_R1_VISITS_PER_YEAR:-10}
      WORKLOAD_CONFIG_OS_R2_VISITS_PER_YEAR: ${WORKLOAD_CONFIG_OS_R2_VISITS_PER_YEAR:-2}
      WORKLOAD_CONFIG_PS_R1_VISITS_PER_YEAR: ${WORKLOAD_CONFIG_PS_R1_VISITS_PER_YEAR:-8}
      WORKLOAD_CONFIG_PS_R2_VISITS_PER_YEAR: ${WORKLOAD_CONFIG_PS_R2_VISITS_PER_YEAR:-4}
      WORKLOAD_CONFIG_VIDEO_R1_VISITS_PER_YEAR: ${WORKLOAD_CONFIG_VIDEO_R1_VISITS_PER_YEAR:-10}
      WORKLOAD_CONFIG_VIDEO_R2_VISITS_PER_YEAR: ${WORKLOAD_CONFIG_VIDEO_R2_VISITS_PER_YEAR:-2}
      WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES: ${WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES:-60}
      WORKLOAD_CONFIG_RECORDS_MONITORING_MINUTES: ${WORKLOAD_CONFIG_RECORDS_MONITORING_MINUTES:-180}
      WORKLOAD_CONFIG_RECORDS_FOOTAGE_MINUTES: ${WORKLOAD_CONFIG_RECORDS_FOOTAGE_MINUTES:-180}
      WORKLOAD_CONFIG_RECORDS_BACKUP_MINUTES: ${WORKLOAD_CONFIG_RECORDS_BACKUP_MINUTES:-120}
      WORKLOAD_CONFIG_RECORDS_ADMIN_MINUTES: ${WORKLOAD_CONFIG_RECORDS_ADMIN_MINUTES:-60}
      WORKLOAD_CONFIG_MINUTES_PER_MONTH: ${WORKLOAD_CONFIG_MINUTES_PER_MONTH:-166}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend
    depends_on:
      - backend

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: workload
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 3s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.poc.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend

  # redis — OMITTED in PoC. Add in MVP (M-06). See TOR §20.7.
  # datadog-agent — OMITTED in PoC. Add in MVP. See TOR §20.7.

volumes:
  pgdata:
```

- [ ] **Step 3: Write .env.example**

Create `.env.example` at repo root:

```bash
# Copy to .env and fill in values before running docker-compose.poc.yml

# Required — no defaults
POSTGRES_PASSWORD=changeme
JWT_SECRET=change-this-to-a-random-256-bit-secret-minimum-32-chars

# Workload config — defaults are set in docker-compose.poc.yml
# Override here only if you need non-default values
# WORKLOAD_CONFIG_PLANNING_PERIOD_MONTHS=6
# WORKLOAD_CONFIG_REPAIR_PRODUCTIVE_MONTHS=5
# WORKLOAD_CONFIG_REPAIR_TRAVEL_ZERO_THRESHOLD=5
# WORKLOAD_CONFIG_REPAIR_TRAVEL_CAP=10
# WORKLOAD_CONFIG_PZV_MINUTES=20
# WORKLOAD_CONFIG_ENGINEER_WARNING_THRESHOLD=0.9
# WORKLOAD_CONFIG_ENGINEER_OVERLOAD_THRESHOLD=1.0
# WORKLOAD_CONFIG_OS_R1_VISITS_PER_YEAR=10
# WORKLOAD_CONFIG_OS_R2_VISITS_PER_YEAR=2
# WORKLOAD_CONFIG_PS_R1_VISITS_PER_YEAR=8
# WORKLOAD_CONFIG_PS_R2_VISITS_PER_YEAR=4
# WORKLOAD_CONFIG_VIDEO_R1_VISITS_PER_YEAR=10
# WORKLOAD_CONFIG_VIDEO_R2_VISITS_PER_YEAR=2
# WORKLOAD_CONFIG_RECORDS_ACCESS_MINUTES=60
# WORKLOAD_CONFIG_RECORDS_MONITORING_MINUTES=180
# WORKLOAD_CONFIG_RECORDS_FOOTAGE_MINUTES=180
# WORKLOAD_CONFIG_RECORDS_BACKUP_MINUTES=120
# WORKLOAD_CONFIG_RECORDS_ADMIN_MINUTES=60
# WORKLOAD_CONFIG_MINUTES_PER_MONTH=166
```

- [ ] **Step 4: Add .env to .gitignore**

```bash
echo ".env" >> .gitignore
git add .gitignore nginx.poc.conf docker-compose.poc.yml .env.example
git commit -m "chore: add Nginx config, docker-compose.poc.yml, and .env.example"
```

---

## Task 14: Smoke test — full stack starts

- [ ] **Step 1: Copy .env.example → .env and fill in required secrets**

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and JWT_SECRET
```

- [ ] **Step 2: Build and start all containers**

```bash
docker compose -f docker-compose.poc.yml up --build
```

Expected: all 4 containers start. `postgres` reaches `healthy`, then `backend` starts and Liquibase runs migrations, then `nginx` is up.

- [ ] **Step 3: Verify health endpoint**

```bash
curl http://localhost/actuator/health
```

Expected:
```json
{"status":"UP","components":{"db":{"status":"UP"}}}
```

- [ ] **Step 4: Verify frontend loads**

Open `http://localhost` in browser. Expected: redirects to `/login`, shows "Login — TODO" placeholder.

- [ ] **Step 5: Commit if all is green**

```bash
git add .
git commit -m "chore: scaffolding complete — backend + frontend + docker-compose smoke-tested"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered |
|---|---|
| Java 21, Spring Boot 3.x, Maven (TOR §9.1) | ✅ Task 1 pom.xml |
| All 19 config keys bound at startup (TOR §6.11) | ✅ Task 3 |
| Fail-fast on missing/invalid config (TOR §6.11) | ✅ @Validated + @NotNull in WorkloadConfig |
| Liquibase changelogs in `db/changelog/changes/` (TOR §11.3) | ✅ Task 5 |
| All PoC tables per §15.4 schema | ✅ Task 5 (v1.0.0) |
| MVP-only columns NOT in v1.0.0 (failed_login_count, locked_until, is_stale, period_id) | ✅ Excluded, noted in schema comments |
| Seed data as Liquibase changeset (TOR §15.8) | ✅ Task 6 (placeholder — needs XLSX values) |
| log4j2 JSON from day one (TOR §18) | ✅ Task 4 |
| Docker Compose 4 containers, no Redis (TOR §15.8) | ✅ Task 13 |
| Frontend: React 18, Vite, TypeScript strict (TOR §9.1) | ✅ Task 9 |
| All PoC routes wired (TOR §15.5) | ✅ Task 11 |
| ApiResponse envelope type (TOR §10) | ✅ Task 10 |
| JWT interceptor, 401 → /login (TOR §9.1) | ✅ Task 10 |
| Testcontainers integration test | ✅ Task 7 |
| Jacoco thresholds configured (TOR §19.2) | ✅ Task 1 pom.xml |
| Spotless (Google Java Format) auto-formatter | ✅ Task 1 pom.xml |
| SpotBugs static analysis (HIGH threshold) | ✅ Task 1 pom.xml + spotbugs-exclude.xml |
| ESLint (@typescript-eslint strict) | ✅ Task 9 .eslintrc.cjs |
| Prettier formatter + CI check | ✅ Task 9 .prettierrc + format:check script |

**No unresolved gaps.** All seed data values are sourced directly from TOR §4.2 and §4.5 — no external XLSX extraction required.

---

## Next Plans

After this scaffolding is complete and smoke-tested:

1. **`poc-m01-backend.md`** — Spring Security + JWT login, all CRUD endpoints, JPA entities, MapStruct DTOs, Bucket4j rate limiting. Covers epic [poc-m01-core-crud.md](../../impl/epics/poc-m01-core-crud.md).
2. **`poc-m01-frontend.md`** — Object/Division/Branch CRUD pages, Equipment tab (two-layer UI), Repairs/Records/Travel tabs. Covers UI spec from [ui-spec.md](../../impl/ui-spec.md).
3. **`poc-m02-backend.md`** — Calculation service, summaries writes, Summary endpoint, XLSX export. Covers epic [poc-m02-calculation.md](../../impl/epics/poc-m02-calculation.md).
