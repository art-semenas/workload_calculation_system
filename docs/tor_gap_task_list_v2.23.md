# TOR v2.23 Gap Resolution Task List

Based on review of `docs/TOR_Workload_WebApp.md` version 2.23.

This file captures contradictions and specification gaps still present after the v2.23 sweep. Each task is written as an implementation-facing resolution item with linked evidence.

---

## Priority Summary

| ID   | Priority | Task                                                | Why it matters                                                                                         |
| ---- | -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| T-01 | High     | Re-scope app-config and audit endpoints to MVP only | §10.2 currently describes a PoC config API that contradicts the canonical env-var-only PoC model       |
| T-02 | Medium   | Mark planning-period UI/API surfaces as MVP only    | Shared UI/API sections still imply periods exist in PoC, but S-05 and the PoC route list say otherwise |
| T-03 | Medium   | Phase-split §8.4 data-integrity stale handling      | NFR text still assumes `is_stale` exists in PoC, contradicting the canonical delete/recalc flow        |
| T-04 | Medium   | Correct the PoC operational runbook                 | The current runbook points operators to non-PoC tools and even the wrong health endpoint               |

---

## T-01 — Re-Scope App-Config and Audit Endpoints to MVP Only

**Priority:** High

### Problem

The TOR currently says all of the following:

1. PoC configuration constants are injected from Docker environment variables at startup.
2. PoC has no HTTP config-save endpoint.
3. §10.2 still lists `GET /admin/config` and `PUT /admin/config` as normal endpoints.
4. The `PUT /admin/config` line explicitly says `synchronous recalc — PoC`, which implies the endpoint exists and is writable in PoC.
5. The same block exposes `GET /admin/audit` even though S-07 says PoC has no audit log.

These statements are not compatible.

### Why this matters

An implementer following §10.2 can reasonably build a PoC-only admin config screen or API flow that does not belong in the PoC architecture. That would also force a fake persistence layer for config and create confusion around startup validation, auditability, and recalculation behavior.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §6.11 PoC config source](docs/TOR_Workload_WebApp.md#L1250)
- [docs/TOR_Workload_WebApp.md — §6.11.1 scope note](docs/TOR_Workload_WebApp.md#L1254)
- [docs/TOR_Workload_WebApp.md — §7.1 route table (`/admin/config`)](docs/TOR_Workload_WebApp.md#L1430)
- [docs/TOR_Workload_WebApp.md — §10.2 App Configuration](docs/TOR_Workload_WebApp.md#L2133)
- [docs/TOR_Workload_WebApp.md — §15.3 S-03](docs/TOR_Workload_WebApp.md#L2853)
- [docs/TOR_Workload_WebApp.md — §15.3 S-07](docs/TOR_Workload_WebApp.md#L2889)

### Required resolution

Adopt one canonical rule everywhere:

- `GET /admin/config`, `PUT /admin/config`, and `GET /admin/audit` are **MVP-only** surfaces.
- In PoC, config remains startup-only via environment variables; no HTTP config-management endpoint exists.

Apply that rule in both §7.1 and §10.2. Remove the phrase `synchronous recalc — PoC` from `PUT /admin/config`; replace it with an MVP-only annotation that points back to §6.11 / M-10.

---

## T-02 — Mark Planning-Period UI/API Surfaces as MVP Only

**Priority:** Medium

### Problem

S-05 clearly removes planning periods from PoC, and M-07 explicitly introduces them later. The PoC route list also has no periods page. Despite that, shared UI/API sections still describe planning-period functionality without phase scoping:

- `/admin/periods` appears in the shared route table with no MVP note.
- `/svod` is described as having a period selector in the shared UI table.
- §7.10 describes a period selector as if it were always present.
- §10.2 exposes planning-period endpoints without saying they are unavailable in PoC.

This is currently an annotation gap rather than a formula conflict, but it still leaks MVP behavior into shared sections.

### Why this matters

These are the exact sections a frontend or API implementer will scan first when deciding what the PoC surface must contain. Unscoped planning-period text can cause unnecessary PoC work and an inconsistent route map.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §7.1 `/svod` period selector text](docs/TOR_Workload_WebApp.md#L1425)
- [docs/TOR_Workload_WebApp.md — §7.1 `/admin/periods`](docs/TOR_Workload_WebApp.md#L1431)
- [docs/TOR_Workload_WebApp.md — §7.10 period selector](docs/TOR_Workload_WebApp.md#L1647)
- [docs/TOR_Workload_WebApp.md — §10.2 Planning Periods](docs/TOR_Workload_WebApp.md#L2197)
- [docs/TOR_Workload_WebApp.md — §15.3 S-05](docs/TOR_Workload_WebApp.md#L2873)
- [docs/TOR_Workload_WebApp.md — §15.5 PoC UI routes](docs/TOR_Workload_WebApp.md#L3008)
- [docs/TOR_Workload_WebApp.md — §15.7 M-07](docs/TOR_Workload_WebApp.md#L3055)

### Required resolution

Make the shared UI/API sections phase-aware:

- Mark `/admin/periods` and the planning-period endpoints as **MVP only — requires M-07**.
- Add a PoC note to the shared `/svod` description and §7.10 period-selector text stating that the selector is absent in PoC because periods do not exist yet.
- Keep §15.5 as the authoritative PoC route set.

---

## T-03 — Phase-Split §8.4 Data-Integrity Stale Handling

**Priority:** Medium

### Problem

The canonical delete/recalculation model is already correct in §6.10 and the object DELETE API note:

- PoC: synchronous recalculation; no `is_stale`
- MVP: stale marking + later recalculation

But §8.4 still says:

- object hard-delete must mark `engineer_summaries.is_stale = 'TRUE'`
- `is_stale = 'TRUE'` is set in the same transaction as the data change for both summaries tables

Those statements cannot apply to PoC because the PoC schema has no `is_stale` columns.

### Why this matters

`§8.4` is normative implementation guidance. If left uncorrected, it can override the correct phase split elsewhere and push a developer toward adding fake or premature staleness handling into PoC delete flows.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §8.4 object-delete integrity rule](docs/TOR_Workload_WebApp.md#L1701)
- [docs/TOR_Workload_WebApp.md — §8.4 same-transaction `is_stale` rule](docs/TOR_Workload_WebApp.md#L1704)
- [docs/TOR_Workload_WebApp.md — §6.10 PoC/MVP invalidation model](docs/TOR_Workload_WebApp.md#L1203)
- [docs/TOR_Workload_WebApp.md — §6.10 object DELETE rule](docs/TOR_Workload_WebApp.md#L1218)
- [docs/TOR_Workload_WebApp.md — §10.2 object hard-delete behaviour](docs/TOR_Workload_WebApp.md#L2061)
- [docs/TOR_Workload_WebApp.md — §15.3 S-02](docs/TOR_Workload_WebApp.md#L2845)

### Required resolution

Rewrite §8.4 so it mirrors the canonical phase split already used in §6.10 and §10.2:

- **PoC:** object delete triggers synchronous recalculation of affected engineer summaries in the same request flow; no `is_stale` writes exist.
- **MVP:** object delete marks affected engineer summaries stale in the same transaction.

Also scope the general `is_stale` transaction rule to MVP only.

---

## T-04 — Correct the PoC Operational Runbook

**Priority:** Medium

### Problem

The PoC runbook currently points operators to tools and endpoints that do not match the documented PoC environment:

- It says to check `/health`, but the canonical endpoint is `/actuator/health`.
- It says to check seed normative data via `/admin/config`, but PoC config is env-var based and has no config-management API.
- It says to inspect Datadog logs for XLSX export failures, but the PoC stack and compose file explicitly omit the Datadog agent.

### Why this matters

Runbook drift is operationally dangerous because it gives the wrong recovery instructions during a failure. In this case the instructions are not just suboptimal; two of them point to PoC surfaces that do not exist.

### Affected TOR areas

- [docs/TOR_Workload_WebApp.md — §18.3 PoC runbook](docs/TOR_Workload_WebApp.md#L3652)
- [docs/TOR_Workload_WebApp.md — §18.1 PoC logging model](docs/TOR_Workload_WebApp.md#L3480)
- [docs/TOR_Workload_WebApp.md — §18.1 health endpoint](docs/TOR_Workload_WebApp.md#L3518)
- [docs/TOR_Workload_WebApp.md — §6.11 PoC config source](docs/TOR_Workload_WebApp.md#L1250)
- [docs/TOR_Workload_WebApp.md — §15.2 Basic observability](docs/TOR_Workload_WebApp.md#L2831)
- [docs/TOR_Workload_WebApp.md — §15.8 PoC stack / no Datadog agent](docs/TOR_Workload_WebApp.md#L3077)
- [docs/TOR_Workload_WebApp.md — §15.8 PoC compose note](docs/TOR_Workload_WebApp.md#L3101)

### Required resolution

Update the PoC runbook to use the canonical PoC operational model:

- `Application not responding` → check `/actuator/health`
- `Calculation produces wrong values` → check environment-variable config, seed data migration, and local JSON logs
- `XLSX export fails` → inspect container stdout via `docker compose logs`, not Datadog

If Datadog guidance is still useful, move it to an explicitly MVP-only runbook subsection.
