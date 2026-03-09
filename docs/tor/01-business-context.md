# Technical Specification (TOR)
# Web Application: Security Systems Maintenance Workload Calculator
**Version:** 2.8  
**Based on:** Шаблон_нагрузки_з_v_4_00.xlsx  
**Date:** 2026-02-23  
**Changelog v2.0:** Replaced hardcoded equipment tables with dynamic device catalog architecture (§4.2, §4.3, §4.5, §5, §6.3, §6.4, §7, §9, §10, §13).  
**Changelog v2.1:** Incorporated three architectural decisions: (1) Option C two-layer quantity model (physical + maintained); (2) System type restriction enforced at UI/API/DB levels; (3) Normatives managed per (device, system) pair. Updated §4.2, §4.3, §6.4, §7.3, §7.4, added C-17–C-20, added AC-11–AC-13.  
**Changelog v2.2:** Added Engineers Module — engineers as first-class entities, object-engineer assignments with equal workload split, engineer capacity tracking, overload detection, engineer dashboard, and coverage gap reporting. Updated §2, §3, §4 (FR-10, FR-11), §5, §6 (§6.12–6.14), §7, §9, §10, §12, §13 (C-21–C-25), §14 (AC-14–AC-18).  
**Changelog v2.3:** Resolved 22 open questions. Key changes: (1) R2-includes-R1 clarification; (2) planning periods; (3) on-demand recalculation; (4) home division = travel reference; (5) placeholder accounts on import; (6) engineer data entry rights; (7) hard delete for PoC; (8) СВОД export scope. Updated §4 (FR-12), §5, §7, §9, §10, §11, §12, §13 (C-26–C-32), §14 (AC-19–AC-21).  
**Changelog v2.4:** Resolved 22 open questions. Key changes: (1) R2-includes-R1 clarification — Excel uses additive model, TOR calculation confirmed correct; (2) planning periods as tracked entities for repairs and records; (3) recalculation is on-demand only; (4) home division = travel reference point for engineer; (5) import creates placeholder accounts; (6) engineers can edit own objects; (7) object deletion is soft-archive for PoC; (8) СВОД export scope clarified. Updated §4 (FR-12 Periods), §5, §7, §9, §10, §11, §12, §13 (C-26–C-32), §14 (AC-19–AC-21).  
**Changelog v2.5:** Technology stack finalised. Updated §9.1 (Java/Spring Boot), §15.8 (PoC stack), §18 (Datadog/log4j2/Actuator). Added §19 Testing Strategy, §20 CI/CD Pipeline. Introduced Redis scope (AD-17), DTO layer constraint (AD-18), rate limiting (§8.3), Liquibase migration structure (§11.3), Jacoco coverage thresholds.  
**Changelog v2.6:** Corrected repair calculation engine. К-во ремонтов = COUNT of distinct repair types with non-zero counts (not SUM of quantities). repair_travel and repair_pzv use 3-tier threshold formula (≤5→0, ≤10→kvo×rate, >10→10×rate). Verified against all non-zero repair rows in source XLSX: zero mismatches. Updated §4.5, §6.6, §6.11 (new config keys), §13 (C-36, C-37), §14 (AC-22).  
**Changelog v2.7:** Dependency sweep after v2.6 repair formula corrections. Fixed 8 locations: (1) §5 summaries column comments; (2) §6.1 pipeline Stage 5; (3) §6.10 DELETE trigger; (4) C-03 rewrite; (5) C-13 rewrite; (6) AC-07 clarification; (7) AC-22 moved into §14; (8) §19.2 RepairCalculationTest.  
**Changelog v2.8:** Structural gap closure. Added: §5.3 Indexing Strategy (PoC); §21 Security Hardening (password policy, JWT, lockout, encryption); §22 Multi-Environment Definition; §23 Normative Versioning Policy; §24 Calculation Snapshot & Freeze (Post-MVP); §25 Backup & Disaster Recovery. Updated: §5.1 isolation level; §6 partial-period policy (C-38); §8.3 security hardening refs; TOC. repair formula corrections. Fixed 8 locations: (1) §5 summaries column comments; (2) §6.1 pipeline Stage 5 expanded with kvo and effective_trips; (3) §6.10 — DELETE added to object_repairs invalidation trigger; (4) C-03 rewritten — was wrong SUM definition, now correct COUNT definition with cross-ref to C-36; (5) C-13 rewritten — old flat formula replaced with threshold-aware description; (6) AC-07 — total_repairs definition clarified; (7) AC-22 moved from orphaned position after §20 into §14 with 3-band structure; (8) §19.2 — RepairCalculationTest added with 8 boundary cases covering all threshold bands.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Business Context & Goals](#2-business-context--goals)
3. [Glossary](#3-glossary)
4. [Functional Requirements](#4-functional-requirements)
5. [Data Model](#5-data-model)
6. [Calculation Engine](#6-calculation-engine)
7. [User Interface Requirements](#7-user-interface-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Architecture Constraints](#9-architecture-constraints)
10. [API Design](#10-api-design)
11. [Migrations & Data Import](#11-migrations--data-import)
12. [Roles & Permissions](#12-roles--permissions)
13. [Structural Clarifications & Corrections](#13-structural-clarifications--corrections)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [PoC Scope](#15-poc-scope)
16. [Aggregation Rules](#16-aggregation-rules)
17. [Concurrency & Locking](#17-concurrency--locking)
18. [Observability & Monitoring](#18-observability--monitoring)
19. [Testing Strategy](#19-testing-strategy)
20. [CI/CD Pipeline](#20-cicd-pipeline)
21. [Security Hardening](#21-security-hardening)
22. [Multi-Environment Definition](#22-multi-environment-definition)
23. [Normative Versioning Policy](#23-normative-versioning-policy)
24. [Calculation Snapshot & Freeze](#24-calculation-snapshot--freeze)
25. [Backup & Disaster Recovery](#25-backup--disaster-recovery)

---

## 1. Project Overview

The system is a web-based replacement for the Excel workbook `Шаблон_нагрузки_з_v_4_00.xlsx`. It automates the calculation of **required maintenance staffing headcount** (нагрузка / численность) for technical maintenance (ТО) engineers responsible for servicing security and fire protection systems at bank branch facilities (objects).

The source workbook currently covers **~2,935 objects** belonging to regional divisions (подразделения) of Belarusbank.

---

## 2. Business Context & Goals

### 2.1 Problem Statement
The Excel template is large (2,935 rows × up to 47 columns per sheet), manual to update, error-prone in formula propagation, and difficult to share or version. The device catalog is hardcoded as fixed columns — adding a new device type requires schema changes and formula updates across multiple sheets.

### 2.2 Goals
- Replace the multi-sheet Excel model with a centralized, browser-accessible application.
- Allow engineers and managers to input/update equipment quantities per facility.
- Automatically recalculate workload metrics on save.
- Support a **dynamic device catalog** — admins can add new device types and their normatives without code changes.
- Support import of existing XLSX data and export of results to XLSX/PDF.
- Provide a СВОД (summary) dashboard per division and per responsible engineer.
- Track individual engineer workload, capacity utilisation, and overload status.
- Surface coverage gaps — objects with no engineer assigned.
- Make normative time standards editable by administrators without formula changes or redeployment.

---

## 3. Glossary

| Term | Definition |
|---|---|
| Объект (Object/Facility) | A physical location (bank branch, archive, garage, infokiosk, etc.) |
| Подразделение | Regional division (e.g., Брестское областное управление №100) |
| Филиал | Branch (sub-unit of a division; may equal the division) |
| Ответственные ТО | Responsible maintenance engineer(s) assigned to an object |
| ОС | Охранная сигнализация — security alarm system |
| ПС | Пожарная сигнализация — fire alarm system |
| Видео | Video surveillance system |
| Записи | Video archive records and administration tasks |
| Ремонт | Repairs — replacement of equipment components |
| Дорога | Travel — distance and time to reach a facility |
| Тип системы (System Type) | One of: ОС, ПС, Видео — the maintenance schedule context |
| Тип устройства (Device Type) | A named device in the admin-managed catalog |
| Контекст устройства | A (device type + system type) pair that carries R1/R2 normatives |
| Р1 | Minutes per unit for routine inspection — system-context-specific |
| Р2 | Minutes per unit for full maintenance — system-context-specific |
| Физическое количество | Physical quantity: how many units exist on site |
| Обслуживаемое количество | Maintained quantity: how many units are counted in a given system's calculation |
| СВОД | Consolidated summary — aggregated totals per object or division |
| ИТОГО Числ | Final headcount coefficient: total monthly minutes converted to FTE |
| ПЗВ | Подготовительно-заключительное время — fixed prep/wrap-up time (20 min per visit) |
| ТМЦ | Товарно-материальные ценности — inventory/material assets |
| Инженер (Engineer) | A maintenance technician who is also a system user (login account) |
| Нагрузка на инженера | Workload per engineer — sum of workload shares from all assigned objects |
| Доля объекта | An object's itogo_chislo_with_travel divided equally among its assigned engineers |
| Мощность (Capacity) | Maximum FTE capacity of an engineer, set by admin (e.g. 1.0 full-time, 0.5 half-time) |
| Коэффициент загрузки | Load ratio = engineer_total_load / capacity — measure of utilisation |
| Перегрузка (Overload) | Load ratio ≥ 1.0 — engineer is assigned more work than their capacity |
| Покрытие (Coverage gap) | An object that has no engineers assigned |
| Период (Planning period) | A 6-month window to which repair counts and records tasks belong (e.g. H1 2025, H2 2025) |

---

