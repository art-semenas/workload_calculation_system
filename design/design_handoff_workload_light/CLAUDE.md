# CLAUDE.md — Implementation prompt for Claude Code

You are picking up a design handoff for an internal bank workload-calculation app. The full spec is in `README.md` (in this folder). Read it before writing any code.

## How to work

1. **Open the prototype first.** `prototype/Workload - Quiet.html` — open in a browser. The 10 artboards are arranged on a pannable canvas; each is labelled (e.g. "03 · Dashboard"). When the README references "screen 5", that's the artboard labelled "05 · Object detail".

2. **Inspect the prototype source for any spec questions.** `prototype/styles.css` is the canonical token reference. `prototype/components.jsx` shows how `Sidebar`, `PageHead`, `KPIRow`, `Drawer`, `CapBar` are composed. `prototype/screens-*.jsx` shows full layouts. The prototype uses inline JSX with hand-rolled CSS classes — your job is to map these to **MUI v5 + the existing project patterns**, not copy the JSX verbatim.

3. **Follow the migration plan in README §"Migration plan".** Steps 1 → 6, in order. Don't skip step 1 (theme + CSS vars) — every later step depends on tokens being centralized.

4. **Respect existing schemas.** `EngineerCreateSchema`, `ObjectCreateSchema`, `DivisionCreateSchema`, `DivisionSchema` already exist in `src/types/`. **Do not invent new shapes** to match the prototype's richer Create-object dialog. The README §"Form schemas" explains how to handle the gap (disable extra fields, mark as future scope).

5. **Run tests after each step.** The project has comprehensive `*.test.tsx` coverage for every page (`src/test/`). Update tests as you change UI; do not let them fall behind.

## Decisions to confirm with the human first

These were left ambiguous in the prototype and need a quick human call before you implement:

1. **Divisions list — backend extension or client-side composition?** README §"Per-screen state" → "Divisions" lists two options. Option (a) requires a backend change; option (b) builds a composite hook. Default to (b) if no backend team is available, but ask first.

2. **Object Create — narrow or wide dialog?** Prototype shows Tier / Travel norm / Visits-per-year fields that aren't in the current `ObjectCreateSchema`. Default: ship the narrow dialog (name + branch + address) and file a follow-up ticket for the richer schema. Confirm.

3. **Sparkline data source.** The hover-only sparklines on Dashboard ("FTE by division") and any retained spark elsewhere need 8-week historical FTE data. The current `useAggregations` hook may not expose this. Default: hide the sparkline column entirely if the data isn't there. Confirm.

## What "done" looks like

- All 10 prototype screens recreated as React + MUI pages, wired to existing TanStack Query hooks.
- A `theme.ts` that any future screen automatically inherits Quiet styling from — no per-screen color/spacing literals.
- All existing tests pass; new pages (Divisions list refactor, Create dialogs) have test coverage parity with the existing pages they mirror.
- One `<Drawer>` component reused on Dashboard + Object Detail — no duplicate "right rail" implementation.
- The 5 Quiet rules are visibly enforced: no system-color chips in row data; no avatars in Engineer list rows; no sunken bg on ИТОГО column; row height 52px; sparklines hover-only.

## Do not

- Do not "improve" copy or naming in the domain glossary (СВОД, ИТОГО Числ, ОС/ПС/Видео, R1/R2). These are bank-domain terms.
- Do not introduce new dependencies (icon libraries, motion libraries, charting libraries) without asking. The prototype draws bars and sparks with plain CSS + SVG; that approach should carry into prod.
- Do not ship inline `sx` prop styles for tokens that belong in the theme. If you find yourself writing `sx={{ color: '#1a1a1a' }}`, you've drifted — pull it into `theme.palette.text.primary` instead.
- Do not delete or rewrite working pages (`EngineerListPage`, `EngineerDetailPage`, `ObjectListPage`, etc.) — refactor them in place so the test suite stays green.
