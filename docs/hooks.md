# Git Hooks

This project uses Git hooks to enforce code quality standards before pushing code.

## Pre-Push Hook

The pre-push hook (stored in `docs/hooks/pre-push` and installed to `.git/hooks/pre-push`) runs all quality gates defined in `CONTRIBUTING.md` before allowing a push to the remote repository.

### What it checks

**Frontend** (if `frontend/` files changed):
- `tsc --noEmit` — TypeScript type checking
- `npm run lint` — ESLint linting
- `npm run format:check` — Prettier format compliance
- `npm test -- --run` — Vitest unit tests

**Backend** (if `backend/` files changed):
- `mvn verify` — Maven verify (compile, unit/integration tests, Spotless format check, SpotBugs analysis)

### Installation

After cloning the repository, install the hooks:

```bash
./install-hooks.sh
```

This copies the hook scripts from `docs/hooks/` into `.git/hooks/` and makes them executable.

**One-time setup** — run once after cloning, then the hook will run automatically on every `git push`.

### Bypassing the hook

If you need to push without running the hooks (not recommended):
```bash
git push --no-verify
```

Only use `--no-verify` in emergencies. The hook exists to catch issues before they reach CI.

### How it works

1. **Check what changed** — Compares your branch against the base branch to see if frontend or backend code changed
2. **Run relevant checks** — Only runs quality gates for parts of the codebase you modified; all gates always run even if one fails
3. **Summary** — After all gates finish, a clear block lists every failed gate and the exact command to fix it; push is blocked only if at least one gate failed

### Example

All gates pass:
```bash
$ git push origin feature/my-feature

🔍 Running quality gates before push...

📦 Frontend code changed. Running frontend quality gates...

  ▸ TypeScript type check...
  ✓ TypeScript passed

  ▸ ESLint...
  ✓ ESLint passed

  ▸ Prettier format check...
  ✓ Prettier passed

  ▸ Vitest unit tests...
  ✓ Vitest passed

✅ All quality gates passed! Proceeding with push.
```

If checks fail, every failure is listed at the end:
```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Push blocked — 2 quality gate(s) failed:

  ✗ frontend · Prettier      → fix: cd frontend && npm run format
  ✗ backend  · Maven verify  → fix: cd backend && mvn spotless:apply && mvn verify

Fix the above, commit if needed, then push again.
To bypass (NOT RECOMMENDED): git push --no-verify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Performance

- **Frontend checks only** (~2–3 minutes): format check, linting, TypeScript, unit tests
- **Backend checks only** (~3–5 minutes): compile, tests, static analysis
- **Both changed** (~5–8 minutes): all checks run sequentially

The hook is smart — it only runs checks for code you actually changed, so pushing changes to only the frontend won't wait for backend tests.

### Troubleshooting

**Hook didn't run:**
- Verify it's executable: `ls -l .git/hooks/pre-push`
- Make sure you're using `git push` (not GitHub Desktop or other tools, which may not respect hooks)

**Hook fails but I know the code is good:**
- Run the failing command manually to see the error
- Some failures are legitimate (e.g., old Prettier rules); fix them or use `--no-verify` as a last resort

**Hook runs too slowly:**
- Consider running checks asynchronously during development, then let the hook validate before push
- Or skip the hook and rely on CI to catch issues (riskier)
