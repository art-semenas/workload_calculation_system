# Workload Calculation System — design system

A compact React + MUI 5 admin design system for an FTE / workload-planning app (Russian-language UI). Every component is exported on **`window.WorkloadDS`**. The look is quiet and data-dense: near-black ink text on warm off-white surfaces, one indigo accent, and monospace numerals.

## Setup

Designs automatically receive **`styles.css`**, which defines every design token as a CSS custom property and loads the two brand fonts (**Inter**, **JetBrains Mono**). Nothing else is needed for tokens or fonts.

The library components self-style (they read tokens directly), so they render on-brand with no provider. Two things still help:

- **Set the root font to Inter** — `font-family: 'Inter', -apple-system, sans-serif` on your page container. Plain HTML headings/text you add inherit it (the library sets fonts on its own nodes, but not on the document body).
- **For MUI controls you add yourself** (Button, TextField, …), wrap in the DS theme: `<MuiThemeProvider theme={dsTheme}>…</MuiThemeProvider>` — both are exported on `window.WorkloadDS`. This applies the ink palette, Inter typography, and the component overrides (flat buttons, 6px radius, compact inputs).

## Styling idiom — CSS variables, not utility classes

Style your own layout/glue with the DS's CSS variables (all defined in `styles.css`):

| Group | Variables |
|---|---|
| Ink (text) | `--ink` primary · `--ink2` · `--ink3` secondary · `--ink4` faint |
| Surfaces | `--bg` page · `--bg-elev` card · `--bg-sunken` |
| Lines | `--line` · `--line-strong` |
| Accent | `--accent` (#3a4fcf) · `--accent-soft` |
| Status tone | `--ok` green · `--warn` amber · `--danger` red (+ `--ok-soft` / `--warn-soft` / `--danger-soft`) |
| Spacing | `--gap-xs` 8 · `--gap-s` 12 · `--gap-m` 20 · `--gap-l` 32 · `--gap-xl` 40 · `--gap-xxl` 56 |
| Radius | `--r-sm` 6 · `--r-md` 10 · `--r-lg` 14 · `--r-pill` |

**Numerals are monospace.** Every metric, count, ratio, or FTE value uses `font-family: 'JetBrains Mono', ui-monospace, monospace` with `font-variant-numeric: tabular-nums`; labels and prose use Inter. Status is carried by the tone colors above — components that show status take a `tone: 'ok' | 'warn' | 'danger'` prop.

## Components (`window.WorkloadDS`)

Read each component's `.d.ts` (props) and `.prompt.md` (usage + examples) before composing.

- **PageHead** — page header: `crumbs` (a crumb with `to` renders a react-router `<Link>`; the last is plain text), `title`, `subtitle?`, `actions?`. Needs a Router in context when crumbs link — `PreviewRouter` (an in-memory router) is exported for that, or omit `to`.
- **HeroCard** — dark headline-metric card: `title`, `heroValue` (large mono value), `stats[]` (2-col grid of `{ label, value }`).
- **KPIRow** — full-width band of KPI cells: `items[]` of `{ label, value, delta?, tone?, deltaTone? }`.
- **CapBar** — capacity/load bar: `pct`; tone auto-derives (ok ≤ 0.9, warn ≤ 1.0, danger > 1.0).
- **DistBar** — stacked proportion bar + legend: `segments[]` of `{ tone, count, label }`, `height?`.
- **SectionBlock** — labeled section wrapper: `label`, `meta?`, `actions?`, children.
- **QuietDrawer** + **DrawerSection** — right-side overlay drawer (`open`, `onClose`, `title`) holding labeled `DrawerSection`s.
- **Spark** — inline sparkline: `data: number[]`, `width?`, `height?`. Carries the `.row-trend` class (opacity 0 until its table row is hovered) — add `.row-trend{opacity:1}` if you show it outside a hover.

## Example

```tsx
const { PageHead, KPIRow, MuiThemeProvider, dsTheme, PreviewRouter } = window.WorkloadDS
<MuiThemeProvider theme={dsTheme}><PreviewRouter>
  <div style={{ fontFamily: "'Inter', sans-serif", background: 'var(--bg)', padding: 'var(--gap-xl)' }}>
    <PageHead
      crumbs={[{ label: 'Филиалы', to: '/b' }, { label: 'Брестский' }]}
      title="Сводная нагрузка"
    />
    <KPIRow items={[
      { label: 'Объектов', value: 48 },
      { label: 'Средняя загрузка', value: '0.71', tone: 'warn', delta: '+0.04' },
    ]} />
  </div>
</PreviewRouter></MuiThemeProvider>
```
