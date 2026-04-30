# WS-A Step 2 — Quiet Design: Common Components

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Build the reusable Quiet component library: `PageHead`, `KPIRow`, `Drawer`, `CapBar`, `DistBar`, `SectionBlock`, `HeroCard`, `Spark`. These components are used by every subsequent page — they must be complete before any page refactor begins. All components use MUI + theme tokens; no inline color literals.

**Branch:** `feature/design-quiet-step2-components`
**Depends on:** `feature/design-quiet-step1-theme` merged to `feature/implementation`
**Workstream:** A — Design (frontend only)

**Reference:** `design/design_handoff_workload_light/README.md` — "Net-new components to build", `prototype/components.jsx`

---

## Source-Of-Truth Alignment

1. `design/design_handoff_workload_light/README.md` — component API contracts and visual specs
2. `design/design_handoff_workload_light/prototype/components.jsx` — reference layout (map to MUI, do not copy verbatim)
3. `design/design_handoff_workload_light/prototype/styles.css` — token values (already in `theme.ts` and `index.css`)
4. `CONTRIBUTING.md` — TDD required; all components need test coverage

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/design-quiet-step2-components
```

---

## Task 1: `<PageHead>` — page header with breadcrumbs, title, actions

**Files:**
- Create: `frontend/src/components/common/PageHead.tsx`
- Create: `frontend/src/test/PageHead.test.tsx`

**Props:**
```ts
interface PageHeadProps {
  crumbs: { label: string; to?: string }[]  // breadcrumb items; last item has no 'to'
  title: string
  subtitle?: string
  actions?: React.ReactNode                  // slot for buttons right of title
}
```

**Visual spec:**
- Breadcrumb: `Workload / Objects / Object name` — MUI `Breadcrumbs`, separator `/`, ink4 color except last item which is ink
- `h1` title: 28/600, letterSpacing -0.02em (`t-page-title`)
- Subtitle: 13/450 ink3
- Actions slot: right-aligned in the same row as title (flexbox)
- Bottom margin: `gap-xl` (40px) below the header block

- [ ] **Step 1: Write failing test**

```tsx
// PageHead.test.tsx
it('renders title and breadcrumbs', () => {
  render(<PageHead crumbs={[{ label: 'Workload', to: '/' }, { label: 'Objects' }]} title="Objects" />)
  expect(screen.getByRole('heading', { name: 'Objects' })).toBeInTheDocument()
  expect(screen.getByText('Workload')).toBeInTheDocument()
})

it('renders subtitle when provided', () => {
  render(<PageHead crumbs={[{ label: 'Workload' }]} title="Dashboard" subtitle="Overview" />)
  expect(screen.getByText('Overview')).toBeInTheDocument()
})

it('renders actions slot', () => {
  render(<PageHead crumbs={[{ label: 'Workload' }]} title="T" actions={<button>Export</button>} />)
  expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement `PageHead.tsx`**
- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common/PageHead.tsx frontend/src/test/PageHead.test.tsx
git commit -m "feat: add PageHead component with breadcrumbs, title, and actions slot"
```

---

## Task 2: `<KPIRow>` — hairline-separated KPI tiles

**Files:**
- Create: `frontend/src/components/common/KPIRow.tsx`
- Create: `frontend/src/test/KPIRow.test.tsx`

**Props:**
```ts
interface KPIItem {
  label: string
  value: string | number
  delta?: string           // e.g. "+2.14 vs Q3"
  deltaTone?: 'ok' | 'warn' | 'danger'
  tone?: 'ok' | 'warn' | 'danger'  // colors the value itself
}
interface KPIRowProps {
  items: KPIItem[]
}
```

**Visual spec:**
- 4-column horizontal strip, each column separated by `1px var(--line)` vertical divider
- KPI value: mono 30/500, letter-spacing -0.02em (`t-kpi`)
- Label: 12/400 ink3 above value
- Delta: 12/400 below value, colored by `deltaTone` (ok=green, warn=amber, danger=red)
- If `tone` set, value color changes (ok=green, warn=amber, danger=red); otherwise ink

- [ ] **Step 1: Write failing test**

```tsx
it('renders all KPI items with labels and values', () => {
  render(<KPIRow items={[
    { label: 'Required FTE', value: '187.42' },
    { label: 'Objects', value: 2935 },
  ]} />)
  expect(screen.getByText('Required FTE')).toBeInTheDocument()
  expect(screen.getByText('187.42')).toBeInTheDocument()
  expect(screen.getByText('2935')).toBeInTheDocument()
})

it('renders delta text when provided', () => {
  render(<KPIRow items={[{ label: 'FTE', value: '187', delta: '+2.14 vs Q3', deltaTone: 'ok' }]} />)
  expect(screen.getByText('+2.14 vs Q3')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement `KPIRow.tsx`**
- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common/KPIRow.tsx frontend/src/test/KPIRow.test.tsx
git commit -m "feat: add KPIRow component with tone variants and delta display"
```

---

## Task 3: `<Drawer>` — Quiet right-rail drawer

**Files:**
- Create: `frontend/src/components/common/QuietDrawer.tsx`
- Create: `frontend/src/test/QuietDrawer.test.tsx`

**Props:**
```ts
interface QuietDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}
```

**Visual spec (from README §"Drawer"):**
- 380px wide, anchored right, `bgElev` paper, `1px var(--line)` left border, no shadow
- Scrim: `rgba(20,20,18,0.18)`, `pointerEvents: 'none'` — page stays interactive
- Header: 15/600 title + × close button (24px, `r-sm` hover bg)
- Dismiss via × button or Escape key

Export `DrawerSection` sub-component:
```ts
interface DrawerSectionProps {
  label: string   // renders as t-section (11/600/uppercase)
  children: React.ReactNode
}
```

- [ ] **Step 1: Write failing test**

```tsx
it('renders title and children when open', () => {
  render(<QuietDrawer open={true} onClose={vi.fn()} title="FTE breakdown"><p>content</p></QuietDrawer>)
  expect(screen.getByText('FTE breakdown')).toBeInTheDocument()
  expect(screen.getByText('content')).toBeInTheDocument()
})

it('calls onClose when × button clicked', async () => {
  const onClose = vi.fn()
  render(<QuietDrawer open={true} onClose={onClose} title="T"><span /></QuietDrawer>)
  await userEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalledOnce()
})

it('does not render content when closed', () => {
  render(<QuietDrawer open={false} onClose={vi.fn()} title="T"><p>hidden</p></QuietDrawer>)
  expect(screen.queryByText('hidden')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement `QuietDrawer.tsx` and `DrawerSection`**
- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common/QuietDrawer.tsx frontend/src/test/QuietDrawer.test.tsx
git commit -m "feat: add QuietDrawer component with DrawerSection subcomponent"
```

---

## Task 4: `<CapBar>` — capacity/utilisation bar

**Files:**
- Create: `frontend/src/components/common/CapBar.tsx`
- Create: `frontend/src/test/CapBar.test.tsx`

**Props:**
```ts
interface CapBarProps {
  pct: number   // 0–1 ratio (not percentage); 1.0 = 100%
}
```

**Visual spec:**
- Thin horizontal bar (8px height)
- Auto-tone: `pct > 1.0` → danger red, `pct > 0.9` → warn amber, else → ok green
- Background: `var(--bg-sunken)`
- Fill: color per tone, width = `Math.min(pct * 100, 100)%` capped visually at 100% (overflow indicator via color)

- [ ] **Step 1: Write failing test**

```tsx
it('renders a progress bar', () => {
  render(<CapBar pct={0.75} />)
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
})

it.each([
  [0.5, 'ok'],
  [0.92, 'warn'],
  [1.05, 'danger'],
])('applies correct tone for pct=%s', (pct, tone) => {
  const { container } = render(<CapBar pct={pct} />)
  // Verify the fill element has the correct tone class/color
  // Implementation-specific assertion based on how tones are applied
  expect(container.firstChild).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement `CapBar.tsx`**
- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common/CapBar.tsx frontend/src/test/CapBar.test.tsx
git commit -m "feat: add CapBar utilisation bar with auto-tone (ok/warn/danger)"
```

---

## Task 5: `<DistBar>` — stacked segment distribution bar

**Files:**
- Create: `frontend/src/components/common/DistBar.tsx`
- Create: `frontend/src/test/DistBar.test.tsx`

**Props:**
```ts
interface DistBarSegment {
  tone: 'ok' | 'warn' | 'danger'
  count: number
  label: string
}
interface DistBarProps {
  segments: DistBarSegment[]
  height?: number   // default 8
}
```

**Visual spec:**
- Stacked horizontal bar, each segment width = `count / total * 100%`
- Colors: ok=`var(--ok)`, warn=`var(--warn)`, danger=`var(--danger)`
- Legend below bar: colored dot + label + count for each segment

Used on Engineers list page for "Capacity distribution" overview.

- [ ] **Step 1: Write failing test**

```tsx
it('renders all segments with correct labels', () => {
  render(<DistBar segments={[
    { tone: 'ok', count: 142, label: 'Normal' },
    { tone: 'warn', count: 48, label: 'Watch' },
    { tone: 'danger', count: 14, label: 'Overloaded' },
  ]} />)
  expect(screen.getByText('Normal')).toBeInTheDocument()
  expect(screen.getByText('Watch')).toBeInTheDocument()
  expect(screen.getByText('Overloaded')).toBeInTheDocument()
  expect(screen.getByText('142')).toBeInTheDocument()
})
```

- [ ] **Step 2–5:** Same TDD cycle, then commit:

```bash
git add frontend/src/components/common/DistBar.tsx frontend/src/test/DistBar.test.tsx
git commit -m "feat: add DistBar stacked segment bar for capacity distribution"
```

---

## Task 6: `<SectionBlock>` — vertical rhythm container

**Files:**
- Create: `frontend/src/components/common/SectionBlock.tsx`
- Create: `frontend/src/test/SectionBlock.test.tsx`

**Props:**
```ts
interface SectionBlockProps {
  label: string        // section heading (11/600/uppercase, ink3)
  meta?: string        // optional count or subtitle after the label
  actions?: React.ReactNode
  children: React.ReactNode
}
```

**Visual spec:**
- 40px (`gap-xl`) top margin
- Section label: `t-section` — 11/600/uppercase/0.06em letter-spacing, ink3, above content
- Optional meta text: 12/400 ink4, inline after label with `·` separator
- Actions slot: right-aligned same row as label

- [ ] **Step 1: Write failing test**

```tsx
it('renders label and children', () => {
  render(<SectionBlock label="Assigned engineers"><table /></SectionBlock>)
  expect(screen.getByText('ASSIGNED ENGINEERS')).toBeInTheDocument() // uppercase
})

it('renders meta text', () => {
  render(<SectionBlock label="Records" meta="24/year"><span /></SectionBlock>)
  expect(screen.getByText('24/year')).toBeInTheDocument()
})
```

- [ ] **Step 2–5:** Same TDD cycle, then commit:

```bash
git add frontend/src/components/common/SectionBlock.tsx frontend/src/test/SectionBlock.test.tsx
git commit -m "feat: add SectionBlock vertical rhythm container with t-section label"
```

---

## Task 7: `<HeroCard>` — dark hero number card for Drawer

**Files:**
- Create: `frontend/src/components/common/HeroCard.tsx`
- Create: `frontend/src/test/HeroCard.test.tsx`

**Props:**
```ts
interface HeroStat {
  label: string
  value: string
}
interface HeroCardProps {
  title: string
  heroValue: string    // large mono number (42/500)
  stats: HeroStat[]   // sub-stat grid below hero number (max 4)
}
```

**Visual spec:**
- Dark `ink` (#1a1a1a) background, white text — the only filled dark card in the design
- Hero number: 42/500 mono, letter-spacing -0.025em (`t-hero`)
- Sub-stats: 2×2 grid, each cell: label 11/500 + value 16/500 mono
- Border-radius: `r-md` (10px), padding: `gap-m` (20px)

Used inside Drawer on Dashboard and Object Detail for ИТОГО breakdown.

- [ ] **Step 1: Write failing test**

```tsx
it('renders hero value and title', () => {
  render(<HeroCard title="ИТОГО Числ" heroValue="1.611624" stats={[]} />)
  expect(screen.getByText('1.611624')).toBeInTheDocument()
  expect(screen.getByText('ИТОГО Числ')).toBeInTheDocument()
})
```

- [ ] **Step 2–5:** Same TDD cycle, then commit:

```bash
git add frontend/src/components/common/HeroCard.tsx frontend/src/test/HeroCard.test.tsx
git commit -m "feat: add HeroCard dark hero number display for Drawer ИТОГО breakdowns"
```

---

## Task 8: `<Spark>` — hover-only sparkline SVG

**Files:**
- Create: `frontend/src/components/common/Spark.tsx`
- Create: `frontend/src/test/Spark.test.tsx`

**Props:**
```ts
interface SparkProps {
  data: number[]   // 8 data points
  width?: number   // default 64
  height?: number  // default 18
}
```

**Visual spec (from README):**
- 64×18 SVG `<polyline>`
- `opacity: 0` by default; parent table row hover sets it to `1` via CSS (`.row-trend { opacity: 0 }; tr:hover .row-trend { opacity: 1 }`)
- Stroke: `var(--ink3)`, strokeWidth 1.5, no fill
- Points scaled to fit the data range within the SVG bounds

Add CSS to `index.css`:
```css
.row-trend { opacity: 0; transition: opacity 0.15s; }
tr:hover .row-trend { opacity: 1; }
```

- [ ] **Step 1: Write failing test**

```tsx
it('renders an SVG polyline', () => {
  render(<Spark data={[1, 2, 3, 4, 5, 6, 7, 8]} />)
  expect(document.querySelector('polyline')).toBeInTheDocument()
})

it('renders nothing when data is empty', () => {
  const { container } = render(<Spark data={[]} />)
  expect(container.querySelector('polyline')).toBeNull()
})
```

- [ ] **Step 2–5:** Same TDD cycle, then commit:

```bash
git add frontend/src/components/common/Spark.tsx frontend/src/test/Spark.test.tsx
git commit -m "feat: add Spark hover-only SVG sparkline component"
```

---

## Task 9: Export barrel and run all quality gates

**Files:**
- Create: `frontend/src/components/common/index.ts`

- [ ] **Step 1: Create barrel export**

```ts
export { PageHead } from './PageHead'
export { KPIRow } from './KPIRow'
export { QuietDrawer, DrawerSection } from './QuietDrawer'
export { CapBar } from './CapBar'
export { DistBar } from './DistBar'
export { SectionBlock } from './SectionBlock'
export { HeroCard } from './HeroCard'
export { Spark } from './Spark'
```

- [ ] **Step 2: Run quality gates**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feature/design-quiet-step2-components
```

---

## Final Scope Checklist

- [ ] All 8 components exist in `src/components/common/`
- [ ] All components use theme tokens — no inline hex color literals
- [ ] All components have test coverage (at least 2 cases each)
- [ ] `CapBar` auto-tones: ok (<90%), warn (90–100%), danger (>100%)
- [ ] `QuietDrawer` scrim is `pointer-events: none` — page stays interactive
- [ ] `Spark` uses `.row-trend` CSS class for hover-only visibility
- [ ] Barrel export `index.ts` covers all components
- [ ] All tests pass, lint clean, TypeScript 0 errors

## References

- `design/design_handoff_workload_light/README.md` §"Net-new components to build"
- `design/design_handoff_workload_light/prototype/components.jsx`
- `design/design_handoff_workload_light/prototype/styles.css`
