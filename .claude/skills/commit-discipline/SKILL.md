---
name: commit-discipline
description: Use when about to create a git commit — enforces one-logical-change rule, message format, and content restrictions from CONTRIBUTING.md. Apply before every commit.
---

# Commit Discipline

## Before Staging

Run `git status` and `git diff` to understand what actually changed. Verify that all staged changes belong to one logical unit of work.

**One logical change = one commit.** A completed TDD cycle (failing test → passing test → refactor) is one commit. A bug fix touching three files is one commit. Two unrelated fixes are two commits.

If staged changes span unrelated concerns, unstage the unrelated files and commit them separately.

---

## Message Format

```
type: short description
```

**Allowed types:**

| Type | When to use |
|---|---|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `test` | Adding or updating tests only |
| `refactor` | Code change with no behavior change |
| `chore` | Build, config, dependency, tooling |
| `docs` | Documentation only |

**Rules:**
- Lowercase type and description
- No period at the end
- Description states WHAT changed in plain technical terms
- 72 characters max on the first line
- If more context is needed, add a blank line then a body paragraph — still technical, no narrative

**Good examples:**
```
feat: add division CRUD endpoints
fix: correct BigDecimal rounding in R2 contribution
test: verify repair threshold band B (kvo=8)
refactor: extract travel calculation to RepairTravelService
chore: add spotless plugin to backend pom
```

---

## Forbidden Content

The message must contain **only** information relevant to the committed code change. Never include:

- AI model names: `Claude`, `Haiku`, `Opus`, `Sonnet`, `Gemini`, `GPT`, `Copilot`
- Generator signatures: `Co-Authored-By:`, `Generated with`, `noreply@anthropic`
- External links: any `https://` or `http://` URL
- Task/ticket references in the description line (put them in the body if truly needed)
- Phrases like "as requested", "per your instructions", "updated based on feedback"

---

## Pre-commit Checklist

Before running `git commit`:

- [ ] `git diff --cached` shows only the intended change — nothing extra staged
- [ ] No broken code: backend compiles (`mvn compile -q`), frontend type-checks (`npx tsc --noEmit`)
- [ ] Message type is one of: `feat / fix / test / refactor / chore / docs`
- [ ] Message contains no AI references, links, or generator signatures
- [ ] Branch is not `main` — all changes go through a PR

---

## Staging Rules

Stage files explicitly by name. Never use `git add .`, `git add -A`, or `git add --all` — these accidentally include unrelated changes, debug files, or env files.

```bash
# CORRECT
git add frontend/src/components/Foo.tsx backend/src/main/java/com/workload/service/FooService.java

# WRONG
git add .
git add -A
```
