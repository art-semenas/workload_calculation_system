# design-sync notes — Workload Calculation System

Repo-specific facts for future syncs. Read before re-running.

## Shape & scope

- **No component-library build.** The DS is `frontend/src/components/common/*` (a plain Vite app, `frontend/package.json` is `type:module`, private, no `dist`). We run the **package shape in synth-entry mode**: the bundle entry is the barrel `frontend/src/components/common/index.ts` (passed as `--entry`), and the component list is pinned explicitly via `cfg.componentSrcMap` (8 components). `DrawerSection` is exported by the barrel but excluded as its own card (`componentSrcMap.DrawerSection: null`); it still ships in the bundle and is composed inside the QuietDrawer preview.
- Build/validate/capture commands (run from repo root):
  - `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./frontend/node_modules --entry ./frontend/src/components/common/index.ts --out ./ds-bundle`
  - `node .ds-sync/package-validate.mjs ./ds-bundle`
  - driver: `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./frontend/node_modules --entry ./frontend/src/components/common/index.ts --out ./ds-bundle` (add `--remote .design-sync/.cache/remote-sync.json` on re-sync).
- Install: `cd frontend && npm ci` (lockfile is npm). Node 24 worked.

## Gotchas that cost debugging cycles

- **MUI icon interop (critical).** `@mui/icons-material/<X>` resolves to the package's **CJS** file (no `exports` map redirects subpaths), and because `frontend/package.json` is `type:module`, esbuild uses node-mode default interop and binds `import Icon from '@mui/icons-material/X'` to the module *object* (`{default,__esModule}`) instead of the icon → `Element type is invalid: got object`, breaking QuietDrawer's close icon in the **bundle** (every design). Fix: `cfg.tsconfig` points at `.design-sync/tsconfig.ds.json`, which redirects `@mui/icons-material/*` → the package's clean **ESM** build via `compilerOptions.paths`. Side effect: much smaller bundle (~470 KB vs ~2.3 MB) because the CJS path blocked tree-shaking. **Keep `tsconfig.ds.json` free of `//`/`"//"` comment keys** — the converter's tsconfig comment-stripper corrupts them and silently drops all paths (plugin returns null, redirect stops working).
- **Preview providers.** `.design-sync/preview-providers.tsx` (wired via `cfg.extraEntries`) re-exports `MuiThemeProvider` + the app `theme` (`dsTheme`) + `MemoryRouter` (`PreviewRouter`) from the bundle so previews share the SAME @mui / react-router instances as the components. `cfg.provider` wraps every preview in `MuiThemeProvider(dsTheme) → PreviewRouter`. Without the theme, MUI Typography falls back to Roboto (off-brand); without the router, PageHead's `<Link>` throws.
- **Fonts are remote.** Inter + JetBrains Mono load from Google Fonts in the real app (`<link>` in `index.html`, no shipped `@font-face`). We ship `.design-sync/ds-fonts.css` (Google `css2` output, gstatic woff2 URLs) via `cfg.extraFonts`; `extractFonts` keeps remote `url()`s as-is, so `styles.css @imports fonts/fonts.css` with remote sources. See Re-sync risks.
- **QuietDrawer** is `position:fixed`. In the single-mode card its ancestor has `transform`, which makes fixed positioning resolve against that (zero-height) box → collapses. The preview wraps it in a `height:500` div so the drawer has room. Override: `{cardMode:single, viewport:"460x560"}`.
- **PageHead title** is a raw `<h1>` (no `fontFamily`); it only inherits its font from an ancestor. The app sets the body font via `CssBaseline`, which the preview harness lacks — so the preview wrapper sets `fontFamily:'Inter'` and the h1 inherits it. If a future title looks serif, that's the cause.
- **Spark** carries `.row-trend` (`opacity:0` until its table row is hovered). Its preview injects `.row-trend{opacity:1}` so the line is visible in the card.
- Wide components use `cardMode:column` (HeroCard, KPIRow, PageHead, SectionBlock, DistBar) — their stories are wider than a grid cell (`[GRID_OVERFLOW]`). CapBar/Spark/QuietDrawer are fine as grid/single.

## Known render warns

None outstanding. `[GRID_OVERFLOW]` was resolved with `cardMode:column`; render check is 8/8 clean, 0 thin, 0 variants-identical.

## Re-sync risks (what can silently go stale)

- **Remote fonts.** `.design-sync/ds-fonts.css` pins gstatic woff2 URLs (Inter v20 etc.). Google can rotate these; if designs render in a fallback font, re-fetch `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap` (with a desktop-Chrome UA so it serves woff2) into `ds-fonts.css`. If the design environment ever blocks external hosts, self-host the woff2 instead. Cyrillic subset matters (UI is Russian) — keep the full css2 output, don't strip subsets.
- **componentSrcMap is manual.** New components added to `frontend/src/components/common/` will NOT appear automatically — add them to `cfg.componentSrcMap` (synth mode has no `.d.ts` export list to discover from). The barrel `index.ts` is also the bundle entry, so a new export there is bundled but still needs a `componentSrcMap` entry to get a card.
- **Props come from source `.tsx` (synth mode), not shipped `.d.ts`** — weaker than a real build. If a component's props look wrong, consider `cfg.dtsPropsFor.<Name>`.
- **`dsTheme`/`MuiThemeProvider`/`PreviewRouter` are preview-harness exports** that also ended up in the public bundle (documented in conventions.md as theming helpers). They track `frontend/src/theme.ts` + react-router; a major MUI/react-router bump could shift them.
- The tsconfig icon redirect assumes `@mui/icons-material` keeps an `esm/` build. If a future MUI version drops it, revisit the redirect target.
