# WS-C Step 6 — MVP M-06: Background Recalculation Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Surface staleness state in the UI: show "Данные устарели — нажмите Пересчитать" banners on СВОД, Object Detail, and Engineer Detail when `is_stale = 'TRUE'`, show "Пересчитывается..." when `is_stale = 'PROCESSING'`. Add "Пересчитать" admin button to СВОД page. Poll recalculation status. Suppress stale numeric values.

**Branch:** `feature/mvp-m06-background-frontend`
**Depends on:** `feature/mvp-m06-background-backend` merged; `feature/design-quiet-step3-existing-pages` merged
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m06-background.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m06-background.md §"UI Screens Required"` — exact banner strings (canonical)
2. `docs/TOR_Workload_WebApp.md §7.6, §7.9, §7.10` — stale indicator placement per screen
3. `design/design_handoff_workload_light/README.md` — Quiet design patterns
4. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass

**Canonical stale strings (must be exact):**
- Stale: `"Данные устарели — нажмите Пересчитать"`
- Processing: `"Пересчитывается..."`

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m06-background-frontend
```

---

## Task 1: Update API response types for `is_stale`

**Files:**
- Modify: `frontend/src/types/summary.ts`
- Modify: `frontend/src/types/engineerSummary.ts`
- Modify: `frontend/src/hooks/useSvod.ts` (or wherever СВОД is fetched)

- [ ] **Step 1: Add `isStale` field to schemas**

```ts
// In summary schema
isStale: z.enum(['FALSE', 'TRUE', 'PROCESSING']).default('FALSE'),
```

- [ ] **Step 2: Verify TypeScript types propagate correctly**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/
git commit -m "feat: add isStale field to summary and engineerSummary types"
```

---

## Task 2: `<StaleIndicator>` component

**Files:**
- Create: `frontend/src/components/common/StaleIndicator.tsx`
- Create: `frontend/src/test/StaleIndicator.test.tsx`

**Target:**
- Full-width yellow banner when `isStale = 'TRUE'`
- Full-width grey banner when `isStale = 'PROCESSING'`
- Renders nothing when `isStale = 'FALSE'`
- Exact strings used (see above)

```tsx
interface StaleIndicatorProps {
  isStale: 'FALSE' | 'TRUE' | 'PROCESSING'
  onRecalculate?: () => void  // shown only for admin
}
```

- [ ] **Step 1: Write tests**

```tsx
it('shows stale banner with correct text', () => {
  render(<StaleIndicator isStale="TRUE" />)
  expect(screen.getByText('Данные устарели — нажмите Пересчитать')).toBeInTheDocument()
})

it('shows processing banner', () => {
  render(<StaleIndicator isStale="PROCESSING" />)
  expect(screen.getByText('Пересчитывается...')).toBeInTheDocument()
})

it('renders nothing when not stale', () => {
  const { container } = render(<StaleIndicator isStale="FALSE" />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Implement `StaleIndicator.tsx`**

Use MUI `Alert`: `severity="warning"` for TRUE (yellow), `severity="info"` for PROCESSING (grey). For TRUE with admin role and `onRecalculate`: show inline "Пересчитать" button within the alert.

- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/StaleIndicator.tsx frontend/src/test/StaleIndicator.test.tsx
git commit -m "feat: add StaleIndicator component with canonical stale/processing strings"
```

---

## Task 3: СВОД page — stale rows and recalculate button

**Files:**
- Modify: `frontend/src/pages/SvodPage.tsx`
- Modify: `frontend/src/hooks/useRecalculate.ts` (create if not exists)

**Changes:**
- Add `<StaleIndicator>` at the top of СВОД page if any row has `isStale = 'TRUE'`
- Per-row stale display: when `isStale = 'TRUE'`, replace numeric FTE columns with `"Данные устарели — нажмите Пересчитать"` text (never show stale numbers per TOR §7.9)
- Add "Пересчитать" button to `<PageHead>` actions (admin only; disabled for historical periods)
- On click: `POST /svod/recalculate` → start polling `GET /svod/recalculate/status`
- While `processed < totalStale`: show `<StaleIndicator isStale="PROCESSING" />` at page top
- When `remaining === 0`: invalidate СВОД query to refresh data

```ts
// useRecalculate.ts
export function useRecalculate() {
  const queryClient = useQueryClient()
  const [isRunning, setIsRunning] = useState(false)

  const trigger = useMutation({
    mutationFn: () => api.post('/svod/recalculate'),
    onSuccess: () => setIsRunning(true)
  })

  // Poll status every 2s while running
  const status = useQuery({
    queryKey: ['recalculate-status'],
    queryFn: () => api.get('/svod/recalculate/status').then(r => r.data.data),
    enabled: isRunning,
    refetchInterval: isRunning ? 2000 : false,
  })

  useEffect(() => {
    if (status.data?.remaining === 0 && isRunning) {
      setIsRunning(false)
      queryClient.invalidateQueries({ queryKey: ['svod'] })
    }
  }, [status.data])

  return { trigger, status, isRunning }
}
```

- [ ] **Step 1: Write failing tests**

```tsx
it('replaces FTE value with stale text for stale rows', async () => {
  mockUseSvod.mockReturnValue({
    data: [{ objectId: 'o1', itogoChisloWithTravel: 1.5, isStale: 'TRUE' }]
  })
  render(<SvodPage />)
  expect(await screen.findByText('Данные устарели — нажмите Пересчитать')).toBeInTheDocument()
  expect(screen.queryByText('1.5')).not.toBeInTheDocument()
})

it('shows Пересчитать button for admin', () => {
  mockAuthStore({ role: 'admin' })
  render(<SvodPage />)
  expect(screen.getByRole('button', { name: /Пересчитать/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement changes**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SvodPage.tsx frontend/src/hooks/useRecalculate.ts
git commit -m "feat: add stale row display and Пересчитать button to СВОД page"
```

---

## Task 4: Object Detail page — stale indicator

**Files:**
- Modify: `frontend/src/pages/ObjectDetailPage.tsx`

**Target (TOR §7.10):**
- Show `<StaleIndicator isStale={summary.isStale} />` below the page header
- When stale: show indicator; numeric values still display but with warning context
- When processing: show processing indicator

- [ ] **Step 1: Write failing test**

```tsx
it('shows stale banner on ObjectDetailPage when summary is stale', async () => {
  mockUseObjectSummary.mockReturnValue({ data: { isStale: 'TRUE', itogoChisloWithTravel: 2.1 } })
  render(<ObjectDetailPage />)
  expect(await screen.findByText('Данные устарели — нажмите Пересчитать')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement**
- [ ] **Step 3: Run test — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ObjectDetailPage.tsx
git commit -m "feat: add stale indicator to Object Detail page header area"
```

---

## Task 5: Engineer Detail page — stale indicator

**Files:**
- Modify: `frontend/src/pages/EngineerDetailPage.tsx`

**Target (TOR §7.6 Section 5):**
- Show `<StaleIndicator isStale={engineerSummary.isStale} />` as a full-page-width banner

- [ ] **Step 1: Write failing test**

```tsx
it('shows stale banner on EngineerDetailPage', async () => {
  mockUseEngineerSummary.mockReturnValue({ data: { isStale: 'TRUE' } })
  render(<EngineerDetailPage />)
  expect(await screen.findByText('Данные устарели — нажмите Пересчитать')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement**
- [ ] **Step 3: Run test — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EngineerDetailPage.tsx
git commit -m "feat: add stale indicator to Engineer Detail page"
```

---

## Task 6: Run quality gates and push

- [ ] **Step 1:**

```bash
cd frontend
npm run format
npm run lint
npx tsc --noEmit
npm test
```

Expected: all pass.

- [ ] **Step 2: Push**

```bash
git push -u origin feature/mvp-m06-background-frontend
```

---

## Final Scope Checklist

- [ ] `isStale` field present in summary and engineerSummary TypeScript types
- [ ] `<StaleIndicator>` renders correct banner text for TRUE and PROCESSING states; renders nothing for FALSE
- [ ] СВОД: stale rows suppress numeric FTE values, show stale text instead
- [ ] СВОД: "Пересчитать" button visible for admin only
- [ ] СВОД: polling `GET /svod/recalculate/status` every 2s during recalculation; invalidates query on completion
- [ ] Object Detail: stale banner shown below page header
- [ ] Engineer Detail: stale banner shown as full-width strip
- [ ] Canonical string used in all locations (exact match)
- [ ] AC-03: UI shows stale indicator after normative update, before recalculation
- [ ] All tests pass, lint clean, TypeScript 0 errors

## References

- `docs/impl/epics/mvp-m06-background.md §"UI Screens Required"`
- `docs/TOR_Workload_WebApp.md §7.6, §7.9, §7.10`
