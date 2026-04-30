# Direction A "Quiet" — Comparison vs prior hi-fi

5 specific before/after diffs the new direction makes:

1. **Topbar removed.** Before: separate topbar with breadcrumbs + period pill above the page title. After: breadcrumbs fold into the page header as an 11px muted line above the H1; the period pill moves into the actions row on the right. Recovers ~56px of vertical space and removes one horizontal divider.

2. **KPI tiles → KPI row.** Before: 4 bordered cards with rounded corners, internal padding, hover lift. After: a single 4-column row separated only by 1px hairline verticals (top + bottom border on the row). Same numbers, ~75% less chrome. Status tone is communicated by the *value color* (warn/danger), not by a colored card border.

3. **Tables: borders out, breath in.** Before: ~44px rows, vertical dashed dividers around the "system" group, sunken-bg cell on the ИТОГО column. After: 52px rows (more breathing room replaces the divider lines), no vertical rules, ИТОГО stays bold but plain. Sparklines and trend columns are hidden by default and fade in on row hover only — the Engineers 8-week trend column is gone entirely.

4. **Right rails → Drawer.** Before: Object Detail had a permanent 320px right rail (hero card + per-system bars + assigned engineers). Dashboard had a right column for "Top objects" + "Overloaded engineers". After: single-column main content. The hero ИТОГО card and supporting detail open in a slide-in **Drawer** triggered by a "FTE breakdown ›" / "Details ›" button in the page actions row.

5. **Color discipline.** Before: system-type chips (ОС indigo / ПС amber / Видео green) appeared on every data row of СВОД and Engineers. After: in row data, system shows as plain muted text. Color is reserved for (a) the hero ИТОГО Числ value in the dark hero card, (b) overload/gap state chips, and (c) the catalog *detail* page where color genuinely helps disambiguate per-system norms. Engineers row avatars are dropped — names render as plain text; avatars stay only on the Engineer profile and in the user menu.

Bonus moves:
- **Sidebar:** text-only, no icons, no badges. Uppercase 10px section labels (`Overview`, `Operations`, `Reference`) above 13px regular nav items. Active state is ink text + 2px left border, no filled background.
- **Precision rounding:** FTE shows 2 decimals in tables; full 6-decimal precision is reserved for the hero ИТОГО Числ in drawers/detail. A "show full" toggle sits in the table toolbar.
- **Tabs:** 2px ink underline on active, no pill background. Counts render as muted mono next to the label.
