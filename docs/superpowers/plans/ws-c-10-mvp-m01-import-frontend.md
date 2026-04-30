# WS-C Step 10 — MVP M-01: JSON Bulk Import Frontend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add the JSON bulk import wizard at `/import`. Two-step flow: upload JSON and run dry-run (`POST /import/data`), review preview report (warnings, skipped, placeholder count), confirm execution (`POST /import/data/confirm`). Admin only. Quiet design.

**Branch:** `feature/mvp-m01-import-frontend`
**Depends on:** `feature/mvp-m01-import-backend` merged; `feature/design-quiet-step2-components` merged
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m01-import.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m01-import.md §"UI Screens Required"` — import wizard spec
2. `docs/TOR_Workload_WebApp.md §11.1` — two-step stateless flow
3. `design/design_handoff_workload_light/README.md` — Quiet design patterns
4. `CONTRIBUTING.md` — TDD required; ESLint, TypeScript, Vitest must pass

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m01-import-frontend
```

---

## Task 1: Import API hooks and types

**Files:**
- Create: `frontend/src/types/import.ts`
- Create: `frontend/src/hooks/useImport.ts`

- [ ] **Step 1: Create types**

```ts
export const ImportPreviewSchema = z.object({
  objectsValid: z.number().int(),
  warnings: z.array(z.string()),
  skipped: z.array(z.object({
    entry: z.string(),
    reason: z.string(),
  })),
  estimatedPlaceholders: z.number().int(),
})
export type ImportPreview = z.infer<typeof ImportPreviewSchema>

export const ImportResultSchema = z.object({
  objectsImported: z.number().int(),
  warnings: z.array(z.string()),
  skipped: z.array(z.object({ entry: z.string(), reason: z.string() })),
  placeholdersCreated: z.number().int(),
})
export type ImportResult = z.infer<typeof ImportResultSchema>
```

- [ ] **Step 2: Create import hooks**

```ts
export function useDryRunImport() {
  return useMutation({
    mutationFn: (payload: unknown) =>
      api.post('/import/data', payload).then(r => ImportPreviewSchema.parse(r.data.data))
  })
}

export function useConfirmImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) =>
      api.post('/import/data/confirm', payload).then(r => ImportResultSchema.parse(r.data.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] })
      queryClient.invalidateQueries({ queryKey: ['svod'] })
    }
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/import.ts frontend/src/hooks/useImport.ts
git commit -m "feat: add import types and API hooks for dry-run and confirm"
```

---

## Task 2: Import page — Step 1 (upload and dry-run)

**Files:**
- Create: `frontend/src/pages/ImportPage.tsx`
- Create: `frontend/src/test/ImportPage.test.tsx`
- Modify: `frontend/src/router.tsx`

**Target — Step 1 (Quiet design, admin only):**
- `<PageHead title="Bulk Import" subtitle="Import objects from JSON file" />`
- Two input methods (tabs or toggle):
  - "Upload JSON file" — file input that reads the file content
  - "Paste JSON" — `<textarea>` for direct paste
- "Validate" button → calls `POST /import/data` (dry-run)
- Loading state: button disabled, spinner shown

- [ ] **Step 1: Write failing tests**

```tsx
it('shows file upload and paste JSON tabs', () => {
  render(<ImportPage />)
  expect(screen.getByRole('tab', { name: /upload file/i })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /paste json/i })).toBeInTheDocument()
})

it('calls dry-run on Validate button click', async () => {
  const mockDryRun = vi.fn().mockResolvedValue({ objectsValid: 5, warnings: [], skipped: [], estimatedPlaceholders: 0 })
  // render, paste valid JSON, click Validate
  expect(mockDryRun).toHaveBeenCalled()
})

it('shows parse error when JSON is malformed', async () => {
  // paste invalid JSON, click Validate
  expect(await screen.findByText(/Invalid JSON/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement Step 1 of `ImportPage.tsx`**

```tsx
// State machine: 'input' | 'preview' | 'confirmed'
const [step, setStep] = useState<'input' | 'preview' | 'confirmed'>('input')
const [payload, setPayload] = useState<unknown>(null)
const [preview, setPreview] = useState<ImportPreview | null>(null)
```

- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Add route (admin only)**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ImportPage.tsx frontend/src/test/ImportPage.test.tsx frontend/src/router.tsx
git commit -m "feat: add ImportPage step 1 — JSON input and dry-run validation"
```

---

## Task 3: Import page — Step 2 (preview report)

**Files:**
- Modify: `frontend/src/pages/ImportPage.tsx`

**Target — Step 2 (preview shown after successful dry-run):**
- Summary bar: `{objectsValid} objects valid · {estimatedPlaceholders} placeholder accounts will be created · {skipped.length} entries skipped`
- If `warnings.length > 0`: collapsible `<SectionBlock label="Warnings ({N})">` with list
- If `skipped.length > 0`: collapsible `<SectionBlock label="Skipped entries ({N})">` with table (Entry / Reason)
- Footer: "Back" button (returns to Step 1) + "Confirm Import" button (primary)
- "Confirm Import" calls `POST /import/data/confirm` with the same payload

- [ ] **Step 1: Write failing tests**

```tsx
it('shows preview summary after successful dry-run', async () => {
  mockDryRun.mockResolvedValue({
    objectsValid: 100,
    warnings: ['Unknown engineer: Иванов И.'],
    skipped: [],
    estimatedPlaceholders: 1
  })
  // run dry-run
  expect(await screen.findByText('100 objects valid')).toBeInTheDocument()
  expect(screen.getByText('1 placeholder accounts will be created')).toBeInTheDocument()
})

it('shows warnings section when warnings exist', async () => {
  // dry-run with warnings
  expect(await screen.findByText(/Warnings/i)).toBeInTheDocument()
})

it('shows confirm button in preview step', async () => {
  // after dry-run
  expect(screen.getByRole('button', { name: /confirm import/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement Step 2 preview in `ImportPage.tsx`**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ImportPage.tsx
git commit -m "feat: add ImportPage step 2 — preview report with warnings, skipped, and confirm button"
```

---

## Task 4: Import page — Step 3 (success state)

**Files:**
- Modify: `frontend/src/pages/ImportPage.tsx`

**Target — Step 3 (shown after successful confirm):**
- Success banner: `"{objectsImported} objects imported successfully"`
- If `placeholdersCreated > 0`: info box `"{N} placeholder accounts created. Go to Users page to set passwords."`
- If warnings: show warnings collapsible
- "Import another file" button (resets to Step 1)
- "Go to Objects" link → `/objects`

- [ ] **Step 1: Write failing tests**

```tsx
it('shows success state after confirm', async () => {
  mockConfirm.mockResolvedValue({ objectsImported: 2935, placeholdersCreated: 12, warnings: [], skipped: [] })
  // run dry-run then confirm
  expect(await screen.findByText('2935 objects imported successfully')).toBeInTheDocument()
})

it('shows placeholder count info when placeholders created', async () => {
  mockConfirm.mockResolvedValue({ objectsImported: 10, placeholdersCreated: 3, warnings: [], skipped: [] })
  // confirm
  expect(await screen.findByText(/12 placeholder accounts/i)).not.toBeInTheDocument()
  expect(await screen.findByText(/3 placeholder accounts/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement Step 3 in `ImportPage.tsx`**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ImportPage.tsx
git commit -m "feat: add ImportPage step 3 — success state with placeholder account info"
```

---

## Task 5: Error handling

**Files:**
- Modify: `frontend/src/pages/ImportPage.tsx`

**Error scenarios:**
- 422 from dry-run (no active period): show inline `<Alert severity="error">` with message `"No active planning period. Ask your administrator to activate a period."`. Validate button remains enabled to retry.
- 403 from either endpoint: should not occur (page is admin-only) — but handle gracefully with a toast
- Network error: Axios interceptor handles (toast notification)
- JSON parse error (client-side): show inline error before sending to API

- [ ] **Step 1: Write failing test**

```tsx
it('shows no active period error inline', async () => {
  mockDryRun.mockRejectedValue({
    response: { data: { error: { code: 422, message: 'No active planning period.' } } }
  })
  // click Validate
  expect(await screen.findByText('No active planning period.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /validate/i })).not.toBeDisabled()
})
```

- [ ] **Step 2: Implement error handling**
- [ ] **Step 3: Run test — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ImportPage.tsx
git commit -m "feat: add error handling to Import page (422 inline, JSON parse error)"
```

---

## Task 6: Add Import to admin navigation

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1:** Add `<NavItem to="/import" label="Import" />` in admin section (admin only)
- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "feat: add Import link to admin navigation"
```

---

## Task 7: Run quality gates and push

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
git push -u origin feature/mvp-m01-import-frontend
```

---

## Final Scope Checklist

- [ ] `ImportPreview` and `ImportResult` TypeScript types with Zod schemas
- [ ] `useDryRunImport` and `useConfirmImport` hooks
- [ ] Step 1: JSON file upload and paste textarea; "Validate" button calls dry-run
- [ ] Step 1: Client-side JSON parse error shown inline before API call
- [ ] Step 2: Preview report with object count, warnings collapsible, skipped collapsible, placeholder count
- [ ] Step 2: "Back" resets to Step 1; "Confirm Import" calls `/import/data/confirm` with same payload
- [ ] Step 3: Success state with imported count, placeholder info, "Import another" and "Go to Objects" actions
- [ ] 422 (no active period) shown inline on Step 1
- [ ] Import page and nav link visible only to admin
- [ ] All tests pass, lint clean, TypeScript 0 errors

## References

- `docs/impl/epics/mvp-m01-import.md`
- `docs/TOR_Workload_WebApp.md §11.1`
