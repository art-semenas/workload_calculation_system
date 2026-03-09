# TOR — Workload Calculation System
**Version:** 2.8 | **Date:** 2026-02-23

Source: `docs/TOR_Workload_WebApp_2_9.md` (3 459 lines) split into purpose-driven files.

---

## Document Map

| File | Audience | Contents |
|---|---|---|
| [01-business-context.md](01-business-context.md) | Everyone | Project overview, problem statement, goals, full glossary |
| [02-functional-requirements.md](02-functional-requirements.md) | BA, PM, Dev | All functional requirements (FR-01 – FR-12) with UI and data rules |
| [03-data-model.md](03-data-model.md) | Dev, DBA | Full database schema, entity relationships, indexing strategy |
| [04-calculation-engine.md](04-calculation-engine.md) | Dev, BA | Per-object calculation pipeline (§6) + aggregation rules for branch/division/company (§16) |
| [05-ui-requirements.md](05-ui-requirements.md) | Frontend, UX | All screen specifications, component behaviour, form rules |
| [06-architecture-and-nfr.md](06-architecture-and-nfr.md) | Architect, Dev | Technology stack, architectural decisions (AD-01–AD-18), NFR (performance, security, scalability) |
| [07-api-design.md](07-api-design.md) | Backend, Frontend | All REST endpoints, request/response formats, error codes |
| [08-data-import-migrations.md](08-data-import-migrations.md) | Dev, DBA | XLSX import algorithm, validation rules, Liquibase migration structure |
| [09-roles-and-permissions.md](09-roles-and-permissions.md) | BA, Dev | Role matrix (Admin / Editor / Viewer / Engineer) with scope rules |
| [10-clarifications.md](10-clarifications.md) | Dev, BA | Structural clarifications C-01–C-38: resolved ambiguities and confirmed business rules |
| [11-acceptance-criteria.md](11-acceptance-criteria.md) | QA, BA | Acceptance criteria AC-01–AC-22 with exact expected values |
| [12-poc-scope.md](12-poc-scope.md) | PM, Dev, BA | PoC vs MVP scope, intentional simplifications, PoC data model, PoC AC, migration path |
| [13-operations.md](13-operations.md) | Dev, DevOps | Concurrency/locking, observability, testing strategy, CI/CD, security hardening, environments, backup |

---

## Where to Start

**Business Analyst:**
→ [01](01-business-context.md) → [02](02-functional-requirements.md) → [09](09-roles-and-permissions.md) → [04](04-calculation-engine.md) → [12](12-poc-scope.md)

**Backend Developer:**
→ [03](03-data-model.md) → [04](04-calculation-engine.md) → [07](07-api-design.md) → [06](06-architecture-and-nfr.md) → [08](08-data-import-migrations.md)

**Frontend Developer:**
→ [05](05-ui-requirements.md) → [07](07-api-design.md) → [09](09-roles-and-permissions.md)

**QA Engineer:**
→ [11](11-acceptance-criteria.md) → [04](04-calculation-engine.md) → [10](10-clarifications.md) → [13](13-operations.md)

**Starting PoC:**
→ [12](12-poc-scope.md) first — it defines exactly what is in/out of scope
