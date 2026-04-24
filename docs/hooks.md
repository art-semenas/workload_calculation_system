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

1. **Check what changed** — Compares your branch against `origin/main` to see if frontend or backend code changed
2. **Run relevant checks** — Only runs quality gates for parts of the codebase you modified
3. **Pass or fail** — If all checks pass, push proceeds. If any check fails, push is cancelled and you must fix the issues first.

### Example

```bash
$ git push origin feature/my-feature

🔍 Running quality gates before push...

📦 Frontend code changed. Running frontend quality gates...

  ✓ TypeScript type check...
  ✓ ESLint...
  ✓ Prettier (format check)...
  ✓ Vitest (unit tests)...

✅ All quality gates passed! Proceeding with push.
```

If a check fails:
```bash
✗ ESLint check failed!
❌ Quality gates failed. Fix the above issues before pushing.
```

Then fix the issue and push again.

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
