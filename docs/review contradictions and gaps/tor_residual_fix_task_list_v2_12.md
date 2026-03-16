# Residual TOR Fix Task List for AI Agent

**Source verification date:** 2026-03-16  
**Target document:** `docs/TOR_Workload_WebApp.md`  
**Purpose:** Capture the remaining contradictions and wording drift discovered after verifying the previously completed task list. This document is intended as a precise handoff for a future AI agent so it can apply the remaining TOR fixes without repeating the full review.

---

## How to use this list

- Treat this as a **documentation alignment task**, not an implementation task.
- Update all referenced TOR sections together; do not patch only one occurrence.
- Prefer one canonical rule over partial exceptions.
- Preserve the existing document structure unless a renumbering or section merge is required.
- If one fix changes scope wording, propagate it to architecture, UI, API, PoC, and acceptance criteria sections.

---

## Priority Summary

| ID   | Priority | Task                                           | Why it matters                                                          |
| ---- | -------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| R-01 | Critical | Resolve PoC recalculation model contradiction  | The TOR still defines two incompatible PoC calculation behaviours       |
| R-02 | ~~High~~ | ~~Unify stale vs processing UI wording~~       | ✅ Resolved in v2.14 — canonical two-state rule applied to §7.6, §7.9, §7.10; PoC scope notes added |
| R-03 | High     | Align Redis scope with PoC recalculation model | Architecture and PoC deployment sections still disagree                 |
| R-04 | Medium   | Finish JSON import terminology cleanup         | MVP import is still described as both JSON and XLSX in different places |

---

## R-01 Resolve PoC Recalculation Model Contradiction

**Priority:** Critical

### Problem

The TOR still contains **two incompatible descriptions** of PoC recalculation behaviour:

- **Model A:** PoC follows the same on-demand recalculation pattern as MVP: writes mark data stale and admin triggers recalculation manually.
- **Model B:** PoC recalculates synchronously on every save, has no staleness tracking, and has no admin trigger.

Both models are currently present in the document.

### Why this matters

- PoC architecture cannot be implemented consistently.
- UI behaviour for stale indicators and recalc buttons depends on this decision.
- Redis/job-queue scope depends on this decision.
- Acceptance criteria and PoC simplifications become internally contradictory.

### Conflicting TOR locations

**PoC described as on-demand / stale-tracking model:**

- §9.2 AD-10: recalculation is on-demand and this is stated as the correct model for PoC.
- §13 C-28: recalculation is on-demand and explicitly called intentional for PoC.

**PoC described as synchronous on-save model:**

- §15.3 S-02: synchronous recalculation on save; no `is_stale`; no admin trigger.
- §15.8 PoC compose notes: Redis not used in PoC because recalculation is synchronous.

### Required resolution

Pick **one canonical PoC rule** and update all dependent sections to match.

Recommended direction, because it already appears in S-02 and the PoC deployment notes:

- **PoC:** synchronous recalculation on save, no stale tracking, no background worker, no Redis.
- **MVP:** stale tracking + admin-triggered recalculation via `POST /svod/recalculate`.

If that direction is chosen, then AD-10 and C-28 must explicitly scope the on-demand model to MVP, not PoC.

If the team instead wants on-demand recalculation already in PoC, then S-02, PoC compose notes, and Redis scope must be rewritten accordingly.

### Concrete document changes

- Rewrite §9.2 AD-10 so it no longer claims the on-demand model is correct for PoC if S-02 remains authoritative.
- Rewrite §13 C-28 to match the chosen phase split.
- Align §15.3 S-02 with the canonical model and reference the exact replacement milestone if needed.
- Update any mentions of stale indicators, background worker presence, Redis usage, or recalc button availability in PoC.

### Done criteria

- The TOR describes exactly one PoC recalculation model.
- Architecture, PoC scope, UI, and deployment sections all describe the same PoC behaviour.
- Redis/job-queue assumptions no longer conflict with the recalculation model.

---

## R-02 Unify Stale vs Processing UI Wording

**Priority:** High

### Problem

The TOR still mixes **stale** and **actively processing** states in UI copy, especially for engineer summaries.

One section says stale engineer summaries show **"Данные пересчитываются..."**, while another section says that phrase must be used only while a background job is actively processing and that stale data must show **"Данные устарели — нажмите Пересчитать"**.

### Why this matters

- Frontend cannot implement a stable state machine for summary banners.
- Test cases for stale state vs processing state remain ambiguous.
- The contradiction leaks back into the recalculation semantics issue.

### Affected TOR areas

- §7.6 Engineer Detail Page, stale indicator description.
- §7.9 СВОД stale-row wording.
- §7.10 UI/UX Constraints, stale vs processing wording.

### Required resolution

Define one canonical wording model:

- **Stale, no job running:** `"Данные устарели — нажмите Пересчитать"`
- **Job actively running:** `"Пересчитывается..."`

Then apply it consistently to both object summaries and engineer summaries.

If the canonical PoC model becomes synchronous recalculation with no stale tracking, then explicitly state that stale banners do **not** appear in PoC and only apply from MVP onward.

### Concrete document changes

- Rewrite the engineer dashboard stale banner text in §7.6.
- Ensure §7.9 and §7.10 use the same terms.
- If needed, add a short note clarifying that `is_stale = 'TRUE'` and `is_stale = 'PROCESSING'` are distinct states with distinct UI copy.

### Done criteria

- No section uses processing text for plain stale state.
- Engineer and object summary views follow the same state wording rules.
- PoC/MVP scope note is explicit if stale banners are not available in PoC.

---

## R-03 Align Redis Scope with the PoC Model

**Priority:** High

### Problem

The TOR still disagrees on whether Redis exists in PoC:

- §9.2 AD-13 says Redis is used in PoC for the recalculation job queue.
- §15.8 PoC notes say Redis is **not** used in PoC because recalculation is synchronous.

This is no longer just a compose-file note issue; it is now an architectural contradiction.

### Why this matters

- Infrastructure planning is ambiguous.
- PoC deployment instructions and architecture constraints disagree.
- Health checks, observability, and failure-mode descriptions become unreliable.

### Affected TOR areas

- §9.2 AD-13 Redis scope.
- §15.8 PoC deployment / compose notes.
- Any PoC observability or health text that assumes Redis exists in PoC.

### Required resolution

Make Redis scope strictly follow the chosen recalculation model from R-01.

Recommended direction if S-02 remains authoritative:

- **PoC:** Redis absent.
- **MVP:** Redis introduced with staleness tracking and background recalculation.

### Concrete document changes

- Rewrite AD-13 so the phase split is explicit and no longer claims PoC job-queue usage.
- Re-check surrounding observability/health wording for PoC references to Redis.
- Keep the production compose example intact, but make sure it is clearly MVP/production-only.

### Done criteria

- Redis usage is described consistently across architecture and deployment sections.
- A PoC developer can tell unambiguously whether Redis is required.
- Failure-mode text does not mention PoC Redis if PoC does not use Redis.

---

## R-04 Finish JSON Import Terminology Cleanup

**Priority:** Medium

### Problem

The milestone table was corrected to say **JSON bulk import**, but other TOR sections still call the same MVP capability **XLSX import** or **bulk XLSX import**.

This leaves the import contract partially fixed instead of fully normalized.

### Why this matters

- Future agents or developers may reintroduce the old assumption that the server imports XLSX directly.
- Concurrency and transaction sections may be implemented against the wrong payload model.
- The milestone wording and feature wording still disagree.

### Affected TOR areas

- §13 C-35 import priority wording.
- §15.3 S-06 simplification title and body.
- §17 Concurrency examples referencing bulk XLSX import.
- Any transaction/locking section that still names the server-side operation as XLSX import.

### Required resolution

Normalize the wording around the server-side feature:

- Server-side capability = **JSON bulk import**.
- If XLSX is mentioned, it must be described only as the **source workbook** handled by an external conversion step.

### Concrete document changes

- Replace remaining uses of `XLSX import` with `JSON bulk import` where the server endpoint is meant.
- Where business context still needs the workbook source mentioned, use wording like: `import of data converted from the source XLSX workbook`.
- Align concurrency and transaction examples with the JSON-import contract.

### Done criteria

- The milestone table, PoC simplifications, clarifications, and technical sections all describe the same import contract.
- No section implies that the backend directly parses XLSX unless that capability is intentionally reintroduced.

---

## Suggested Execution Order

1. Resolve R-01 first because it drives the correct outcome for R-02 and R-03.
2. Resolve R-03 immediately after R-01 because Redis scope is a direct dependency.
3. Resolve R-02 once the final stale/processing state model is known.
4. Resolve R-04 last because it is terminology cleanup, not an architectural blocker.

---

## Verification Checklist for the Next Agent

- Search the TOR for `PoC`, `recalculation`, `stale`, `Пересчитывается`, `Данные устарели`, `Redis`, `XLSX import`, and `JSON bulk import` after edits.
- Confirm there is only one PoC recalculation model left in the document.
- Confirm stale and processing UI text are used for different states only.
- Confirm Redis is either fully in PoC or fully out of PoC, with no mixed wording.
- Confirm import wording consistently describes server-side JSON ingestion.
