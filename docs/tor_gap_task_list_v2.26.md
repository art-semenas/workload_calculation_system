# TOR v2.26 Gap Resolution Task List

## Priority Summary

| ID   | Priority | Task                                                                                    | Why it matters                                                                                            |
| ---- | -------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| T-01 | High     | Fix §18.3 runbook service name from `api` to `backend`                                  | Operators following the runbook will run commands against a non-existent Compose service during an outage |
| T-02 | High     | Add a canonical API contract for object inventory XLSX export                           | FR-08 and AC-29 define a feature that has no endpoint in §10.2, blocking implementation and testing       |
| T-03 | Medium   | Anchor object inventory XLSX export to an explicit PoC simplification and MVP milestone | The feature is out of PoC in practice, but §15 never says when it arrives                                 |
| T-04 | High     | Specify user-management APIs backing `/admin/users` and role administration             | The UI route and RBAC model exist, but admin user-management operations are not contractually defined     |

---

## T-01 — Fix §18.3 runbook service name

**Priority:** High

### Problem

The PoC runbook in §18.3 instructs operators to run:

```text
docker compose logs api
docker compose restart api
```

But both Compose examples use the service name `backend`, not `api`:

- §15.8 PoC Docker Compose defines `backend:`
- §20.7 production Docker Compose defines `backend:`

No Compose service named `api` exists anywhere in the TOR.

### Why this matters

This is an operational contradiction, not a wording preference. During incident response, the documented commands fail immediately because they target a non-existent service. That slows diagnosis precisely in the scenario where the runbook is supposed to save time.

### Affected TOR areas

- [§18.3 PoC runbook](TOR_Workload_WebApp.md#L3769)
- [§15.8 PoC Docker Compose](TOR_Workload_WebApp.md#L3129)
- [§20.7 production Docker Compose](TOR_Workload_WebApp.md#L3896)

### Required resolution

Replace `api` with `backend` in all runbook command examples:

```text
docker compose logs backend
docker compose restart backend
```

If `api` is intended as an alias, define that alias explicitly in both Compose examples. Right now the document does not do that, so `backend` is the canonical name.

---

## T-02 — Add a canonical API contract for object inventory XLSX export

**Priority:** High

### Problem

FR-08 requires:

- Export СВОД to XLSX
- Export СВОД to PDF
- Export individual object inventory data to XLSX

AC-29 further states:

```text
GET /objects/:id/export/xlsx (or equivalent endpoint)
```

But §10.2 defines only:

```text
GET /svod/export/xlsx
GET /svod/export/pdf
```

There is no object-level export endpoint, request shape, response semantics, or RBAC note in the API section.

### Why this matters

This leaves implementers with no contract to build against and testers with no endpoint to verify. The phrase `or equivalent endpoint` is an explicit sign that the contract has not been decided, which is too vague for a technical specification.

### Affected TOR areas

- [§4.8 Export (FR-08)](TOR_Workload_WebApp.md#L337)
- [§10.2 export endpoints](TOR_Workload_WebApp.md#L2128)
- [§14 AC-29](TOR_Workload_WebApp.md#L2797)

### Required resolution

Choose one canonical endpoint and define it in §10.2. For example:

```text
GET /objects/:id/export/xlsx    Export object inventory, records, repairs, and travel to XLSX
```

Then add:

- RBAC by phase note
- MVP/PoC scope note
- Expected file contents and filename convention
- Error cases such as `404 OBJECT_NOT_FOUND` and authorization failures

Finally, update AC-29 to reference the exact endpoint instead of `or equivalent endpoint`.

---

## T-03 — Anchor object inventory XLSX export to an explicit PoC simplification and MVP milestone

**Priority:** Medium

### Problem

The TOR clearly scopes PDF export out of PoC:

- S-08: No PDF export
- M-11: PDF export
- AC-28: `_(MVP — requires M-11)_`

But object inventory XLSX export has no equivalent scope anchor:

- FR-08 includes it
- AC-29 marks it as `MVP`
- §15.2 PoC scope lists only СВОД XLSX export
- §15.3 has no simplification excluding object inventory XLSX export
- §15.7 has no milestone that introduces it

### Why this matters

Developers cannot tell whether object inventory XLSX export should ship with M-01, M-11, or some other milestone. The current TOR only communicates that it is "not PoC" indirectly by omission.

### Affected TOR areas

- [§15.2 PoC scope](TOR_Workload_WebApp.md#L2821)
- [§15.3 PoC simplifications](TOR_Workload_WebApp.md#L2851)
- [§15.7 migration path](TOR_Workload_WebApp.md#L3055)
- [§14 AC-29](TOR_Workload_WebApp.md#L2797)

### Required resolution

Adopt one of these two patterns and apply it consistently:

1. Extend S-08 to cover both PDF export and object inventory XLSX export, then add a milestone such as `M-11` or a new `M-12`.
2. Add a new simplification entry, for example `S-10: No object inventory XLSX export`, with a matching reversal milestone.

After choosing the milestone, update:

- §15.3 simplifications
- §15.7 migration path
- §14 AC-29 annotation
- §10.2 endpoint scope note from T-02

---

## T-04 — Specify user-management APIs backing `/admin/users`

**Priority:** High

### Problem

The TOR exposes a user-management surface in multiple places:

- `/admin/users` appears in the route table
- §12 says admins manage users / engineers
- RBAC roles (`admin`, `editor`, `viewer`, `engineer`) are part of MVP scope

But §10.2 defines only engineer-specific endpoints:

```text
GET/POST/PUT/DELETE /engineers
```

There is no API contract for:

- creating editors or viewers
- changing a user's role
- activating/deactivating non-engineer users
- listing all users for the `/admin/users` screen
- resetting passwords or activation workflow hooks for placeholder accounts

### Why this matters

M-02 RBAC is not fully implementable from the current spec. Admins cannot manage the role-bearing `users` entity if the API only models engineers. That leaves `/admin/users` as a UI shell with no backing contract.

### Affected TOR areas

- [§7.1 `/admin/users` route](TOR_Workload_WebApp.md#L1433)
- [§12 permissions matrix](TOR_Workload_WebApp.md#L2436)
- [§10.2 Engineers endpoints](TOR_Workload_WebApp.md#L2234)
- [§4.10 Engineer Management](TOR_Workload_WebApp.md#L351)

### Required resolution

Pick one canonical approach and document it in §10.2:

1. Generic user administration endpoints, for example:

```text
GET    /admin/users
POST   /admin/users
GET    /admin/users/:id
PUT    /admin/users/:id
PUT    /admin/users/:id/role
PUT    /admin/users/:id/activate
```

2. Or explicitly state that `/admin/users` is only a frontend wrapper over `/engineers` plus separate future admin/editor/viewer endpoints, then define those missing endpoints.

Also clarify how placeholder engineer activation from §11.1 is performed through this surface.
