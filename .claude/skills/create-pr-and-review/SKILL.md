---
name: create-pr-and-review
description: Use when a development branch is complete and CI/CD is green - creates a GitHub PR targeting feature/implementation, dispatches a code reviewer subagent to review the full branch diff, then produces a consolidated fix list and implementation plan
---

# Create PR and Review

## Overview

Create a GitHub PR against `feature/implementation`, review every change in the branch, then produce a prioritized fix list and an implementation plan.

**Assumes:** CI/CD is already green before invoking this skill.

## Step 1: Create PR

```bash
BASE_SHA=$(git merge-base HEAD origin/feature/implementation)
HEAD_SHA=$(git rev-parse HEAD)

gh pr create \
  --base feature/implementation \
  --title "<type>: <short description>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet>
- <bullet>

## Test Plan
- [ ] CI/CD green
- [ ] <feature-specific verification step>
EOF
)"
```

**Title prefix types:** `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

Keep the title under 70 characters.

## Step 2: Review Full Branch Diff

Dispatch a code reviewer subagent using the template at `requesting-code-review/code-reviewer.md`:

| Placeholder | Value |
|---|---|
| `{DESCRIPTION}` | What this branch implements |
| `{PLAN_OR_REQUIREMENTS}` | Relevant spec section, TOR reference, or feature description |
| `{BASE_SHA}` | From Step 1 |
| `{HEAD_SHA}` | From Step 1 |

## Step 3: Consolidate Fix List

Once the subagent returns, collect **all** findings into a single ordered list before doing anything else:

```
CRITICAL
- [ ] <file:line> — <issue>
- [ ] ...

IMPORTANT
- [ ] <file:line> — <issue>
- [ ] ...

MINOR
- [ ] <file:line> — <issue>
- [ ] ...
```

If a finding seems technically incorrect, verify against the codebase first.
Push back with reasoning if the reviewer is wrong — see `superpowers:receiving-code-review`.

If there are no findings, state that explicitly and stop here.

## Step 4: Write Implementation Plan

**REQUIRED SUB-SKILL:** Use `superpowers:writing-plans` to turn the fix list into a full implementation plan.

- One task per fix (or group tightly related fixes into one task)
- Order: Critical → Important → Minor
- Each task follows TDD: failing test → implement → green → commit
- Save to `docs/superpowers/plans/YYYY-MM-DD-<branch-name>-fixes.md`

After saving, offer execution choice per the `superpowers:writing-plans` handoff section.
