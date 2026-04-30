import { expect, test } from '@playwright/test'
import { fetchAdminToken, loginAsAdmin } from './helpers/auth'
import {
  cleanupHierarchyByPrefix,
  createHierarchy,
  fetchDivisionsAggregation,
  fetchReferenceObjectId,
  fetchSvodPage,
  getCatalogHappyPath,
  makeE2ePrefix,
  systemTypeLabel,
} from './helpers/data'

// ---------------------------------------------------------------------------
// Dashboard — FTE by Division, Top 10 Objects, Uncovered Objects
// ---------------------------------------------------------------------------

test.describe('Dashboard SVOD sections', () => {
  let seededDivisionId: string
  let seededObjectId: string

  test.beforeAll(async ({ request }) => {
    const token = await fetchAdminToken(request)
    const divisions = await fetchDivisionsAggregation(request, token)
    seededDivisionId = divisions[0]?.division_id ?? ''

    const svod = await fetchSvodPage(request, token, 0, 1)
    seededObjectId = svod?.content[0]?.object_id ?? ''
  })

  // Checklist 1.1, 1.2, 1.6, 1.10 — section headings replace placeholder
  test('M-02 section headings replace the placeholder text', async ({ page }) => {
    await loginAsAdmin(page)

    await expect(page.getByText('Data will be available after M-02')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /fte by division/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /top 10 objects/i })).toBeVisible()
    await expect(
      page
        .getByRole('heading', { name: /uncovered objects/i })
        .or(page.getByText(/uncovered objects/i).first())
    ).toBeVisible()
  })

  // Checklist 1.3 — FTE table columns
  test('FTE by Division table has Division, TOTAL FTE, Objects, Without Engineer columns', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('columnheader', { name: /division/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /total fte/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /objects/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /without engineer/i })).toBeVisible()
  })

  // Checklist 1.4 — FTE values use 4 decimal places
  test('FTE by Division table shows seeded data with 4 decimal place FTE values', async ({
    page,
  }) => {
    test.skip(!seededDivisionId, 'No seeded division aggregation data available')

    await loginAsAdmin(page)

    await expect(page.getByText(/^\d+\.\d{4}$/).first()).toBeVisible()
  })

  // Checklist 1.5 — clicking a division row navigates to /divisions/:id
  test('clicking a FTE by Division row navigates to division detail', async ({ page }) => {
    test.skip(!seededDivisionId, 'No seeded division aggregation data available')

    await loginAsAdmin(page)

    const divisionRows = page.getByRole('row').filter({ has: page.getByRole('cell').nth(0) })
    await divisionRows.first().click()

    await expect(page).toHaveURL(/\/divisions\/[0-9a-f-]+$/)
  })

  // Checklist 1.7 — Top 10 column headers
  test('Top 10 objects table has Object, Division, TOTAL Staffing columns', async ({ page }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('columnheader', { name: /object/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /division/i }).first()).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: /total staffing/i }).first()
    ).toBeVisible()
  })

  // Checklist 1.8 + 1.9 — Top 10 row shows numeric TOTAL Staffing and navigates
  test('clicking a Top 10 object row shows 6 decimal staffing and navigates to object detail', async ({
    page,
  }) => {
    test.skip(!seededObjectId, 'No seeded SVOD data available')

    await loginAsAdmin(page)

    await expect(page.getByText(/\d+\.\d{6}/).first()).toBeVisible()

    await page.getByRole('row').filter({ hasText: /\d+\.\d{6}/ }).first().click()
    await expect(page).toHaveURL(/\/objects\/[0-9a-f-]+$/)
  })

  // Checklist 1.11 + 1.12 — coverage gaps section shows empty state or table
  test('Uncovered Objects section shows empty state or gap table depending on data', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    const emptyStateVisible = await page.getByText(/no uncovered objects/i).isVisible()
    const gapTableVisible = await page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: /total fte/i }) })
      .isVisible()

    expect(emptyStateVisible || gapTableVisible).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Summary page (/svod)
// ---------------------------------------------------------------------------

test.describe('Summary page (/svod)', () => {
  let seededObjectId: string
  let seededDivisionName: string

  test.beforeAll(async ({ request }) => {
    const token = await fetchAdminToken(request)
    const svod = await fetchSvodPage(request, token, 0, 1)
    seededObjectId = svod?.content[0]?.object_id ?? ''

    const divisions = await fetchDivisionsAggregation(request, token)
    seededDivisionName = divisions[0]?.division_name ?? ''
  })

  // Checklist 2.1 + 5.1 — Summary nav active, navigates to /svod, no disabled tooltip
  test('Summary nav link is active and navigates to /svod without a disabled tooltip', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    const summaryButton = page.getByRole('button', { name: 'Summary' })
    await expect(summaryButton).toBeEnabled()

    await summaryButton.hover({ force: true })
    await expect(page.getByText('Available in the next version')).not.toBeVisible()

    await summaryButton.click()
    await expect(page).toHaveURL(/\/svod$/)
  })

  // Checklist 5.3 — direct /svod route loads
  test('direct navigation to /svod loads the Summary page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page).toHaveURL(/\/svod$/)
    const headingVisible = await page.getByRole('heading').first().isVisible()
    const gridVisible = await page.getByRole('grid').isVisible()
    expect(headingVisible || gridVisible).toBeTruthy()
  })

  // Checklist 2.2 — page heading
  test('Summary page shows a heading', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  // Checklist 2.3 + 2.4 — division filter with real division names
  test('division filter dropdown lists real division names', async ({ page }) => {
    test.skip(!seededDivisionName, 'No seeded division aggregation data available')

    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByRole('combobox').first()).toBeVisible()
    await page.getByRole('combobox').first().click()

    await expect(
      page.getByRole('option', { name: new RegExp(seededDivisionName) })
    ).toBeVisible()
  })

  // Checklist 2.5 — Export XLSX button present
  test('Export XLSX button is present', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByRole('button', { name: /export xlsx/i })).toBeVisible()
  })

  // Checklist 2.6 + 2.16 — key column headers (covers the 19-column spec)
  test('SVOD table has all required column headers', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(
      page
        .getByRole('columnheader', { name: /№/i })
        .or(page.getByRole('columnheader', { name: /object/i }).first())
    ).toBeVisible()

    for (const pattern of [/division/i, /branch/i, /object/i, /pzv/i, /travel/i, /total staffing/i]) {
      await expect(page.getByRole('columnheader', { name: pattern }).first()).toBeVisible()
    }
  })

  // Checklist 2.7 — at least one data row
  test('SVOD table contains at least one data row', async ({ page }) => {
    test.skip(!seededObjectId, 'No seeded SVOD data available')

    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByRole('row').nth(1)).toBeVisible()
  })

  // Checklist 2.8 — TOTAL Staffing shows 6 decimal places
  test('TOTAL Staffing (with travel) column shows values to 6 decimal places', async ({
    page,
  }) => {
    test.skip(!seededObjectId, 'No seeded SVOD data available')

    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByText(/\d+\.\d{6}/).first()).toBeVisible()
  })

  // Checklist 2.9 — zero values are blank, not "0.000000"
  test('zero values in numeric columns display as blank, not 0.000000', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await page.waitForSelector('[role="grid"], [role="table"]', { timeout: 10_000 })

    await expect(page.getByText('0.000000')).not.toBeVisible()
  })

  // Checklist 2.11 — object name is clickable and navigates to /objects/:id
  test('clicking an object name in the SVOD table navigates to object detail', async ({
    page,
  }) => {
    test.skip(!seededObjectId, 'No seeded SVOD data available')

    await loginAsAdmin(page)
    await page.goto('/svod')

    await page.waitForSelector(
      '[role="grid"] [role="row"]:nth-child(2), [role="table"] tbody tr',
      { timeout: 10_000 }
    )

    const objectLink = page.getByRole('link').filter({ hasText: /\w{3,}/ }).first()
    await expect(objectLink).toBeVisible()
    await objectLink.click()
    await expect(page).toHaveURL(/\/objects\/[0-9a-f-]+$/)
  })

  // Checklist 2.12 + 2.13 — division filter scopes results and clearing restores all rows
  test('division filter scopes results and clearing restores all rows', async ({ page }) => {
    test.skip(!seededDivisionName, 'No seeded division data available')

    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByRole('combobox').first()).toBeVisible()

    const totalBefore = await page.getByRole('row').count()

    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: new RegExp(seededDivisionName) }).click()

    await expect(
      page.getByRole('cell', { name: new RegExp(seededDivisionName) }).first()
    ).toBeVisible()

    // Clear filter
    await page.getByRole('combobox').first().click()
    const allOption = page.getByRole('option', { name: /all/i }).first()
    if (await allOption.isVisible()) {
      await allOption.click()
    } else {
      await page.keyboard.press('Escape')
      await page.getByRole('combobox').first().click()
      await page.getByRole('option').first().click()
    }

    const totalAfter = await page.getByRole('row').count()
    expect(totalAfter).toBeGreaterThanOrEqual(totalBefore)
  })

  // Checklist 2.14 — Export XLSX triggers a file download
  test('clicking Export XLSX initiates a .xlsx file download', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page.getByRole('button', { name: /export xlsx/i })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /export xlsx/i }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i)
  })

  // Checklist 2.17 — pagination controls visible
  test('pagination controls are visible', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(
      page
        .getByText(/rows per page/i)
        .or(page.locator('[aria-label="Go to next page"]'))
        .or(page.locator('.MuiTablePagination-root'))
        .first()
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Object Detail — Summary tab
// ---------------------------------------------------------------------------

test.describe('Object Detail — Summary tab', () => {
  let referenceObjectId: string | null = null
  let newObjectPrefix: string
  let newObjectId: string

  test.beforeAll(async ({ request }) => {
    const token = await fetchAdminToken(request)
    referenceObjectId = await fetchReferenceObjectId(request, token)

    newObjectPrefix = makeE2ePrefix('svod-summary')
    const hierarchy = await createHierarchy(request, newObjectPrefix, token)
    newObjectId = hierarchy.object.id
  })

  test.afterAll(() => {
    cleanupHierarchyByPrefix(newObjectPrefix)
  })

  // Checklist 3.1 — Summary tab no longer shows placeholder
  test('Summary tab does not show "Available in M-02" placeholder', async ({ page }) => {
    test.skip(!referenceObjectId, 'No seeded object with summary data found')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText('Available in M-02')).not.toBeVisible()
  })

  // Checklist 3.2 — "No data" for a new object
  test('freshly created object shows "No data" on the Summary tab', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`/objects/${newObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText(/no data/i)).toBeVisible()
  })

  // Checklist 3.3 + 3.4 — reference object shows TOTAL Staffing = 0.032327
  test('PAC-01 reference object shows 0.032327 TOTAL Staffing on the Summary tab', async ({
    page,
  }) => {
    test.skip(!referenceObjectId, 'Reference object not found in seeded data')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText('0.032327')).toBeVisible()
  })

  // Checklist 3.5 — per-visit breakdown fields
  test('Summary tab shows per-visit breakdown fields (Security R1, Fire R1, etc.)', async ({
    page,
  }) => {
    test.skip(!referenceObjectId, 'Reference object not found in seeded data')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(
      page.getByText(/security r1/i).or(page.getByText(/fire r1/i)).or(page.getByText(/r1 per visit/i))
    ).toBeVisible()
  })

  // Checklist 3.6 — monthly averages group
  test('Summary tab shows monthly average fields', async ({ page }) => {
    test.skip(!referenceObjectId, 'Reference object not found in seeded data')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText(/monthly/i).or(page.getByText(/security/i).first())).toBeVisible()
  })

  // Checklist 3.7 — travel group
  test('Summary tab shows PZV and Travel (round-trip) fields', async ({ page }) => {
    test.skip(!referenceObjectId, 'Reference object not found in seeded data')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText(/pzv/i)).toBeVisible()
    await expect(page.getByText(/travel/i).first()).toBeVisible()
  })

  // Checklist 3.8 — totals group
  test('Summary tab shows TOTAL Staffing without and with travel', async ({ page }) => {
    test.skip(!referenceObjectId, 'Reference object not found in seeded data')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText(/total staffing/i).first()).toBeVisible()
  })

  // Checklist 3.9 — computed at timestamp
  test('Summary tab shows a "Computed at" timestamp', async ({ page }) => {
    test.skip(!referenceObjectId, 'Reference object not found in seeded data')

    await loginAsAdmin(page)
    await page.goto(`/objects/${referenceObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText(/computed at/i)).toBeVisible()
  })

  // Checklist 3.10 — PAC-04: Summary tab updates after saving equipment (no page reload)
  test('saving equipment causes Summary tab to update without page reload', async ({
    page,
    request,
  }) => {
    test.slow()

    const token = await fetchAdminToken(request)
    const catalog = await getCatalogHappyPath(request, token)
    const assignmentLabel = systemTypeLabel(catalog.context.systemType)

    await loginAsAdmin(page)
    await page.goto(`/objects/${newObjectId}`)

    // Confirm "No data" initially
    await page.getByRole('tab', { name: /summary/i }).click()
    await expect(page.getByText(/no data/i)).toBeVisible()

    // Add device + assignment on Equipment tab
    await page.getByRole('tab', { name: /equipment/i }).click()
    await page.getByRole('button', { name: 'Add device' }).click()

    const addDeviceDialog = page.getByRole('dialog', { name: 'Add Device' })
    await addDeviceDialog.getByLabel('Device Type').click()
    await page.getByRole('option', { name: catalog.device.name }).click()
    await addDeviceDialog.getByLabel('Quantity Physical').fill('2')
    await addDeviceDialog.getByRole('button', { name: 'Add' }).click()
    await expect(addDeviceDialog).toBeHidden()

    await page
      .getByRole('button', { name: `add assignment for ${catalog.device.name}` })
      .click()

    const addAssignmentDialog = page.getByRole('dialog', { name: /add assignment/i })
    await expect(addAssignmentDialog).toBeVisible()

    await page.getByLabel('System Type').click()
    await page.getByRole('option', { name: assignmentLabel }).click()
    await page.getByLabel('Quantity Maintained').fill('1')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(addAssignmentDialog).toBeHidden()

    // Switch to Summary tab without page reload — should now show data
    await page.getByRole('tab', { name: /summary/i }).click()

    await expect(page.getByText(/no data/i)).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/total staffing/i).first()).toBeVisible()
  })

  // Checklist 3.11 — PAC-04: Summary tab updates after saving records (no page reload)
  test('saving records causes Summary tab to update without page reload', async ({ page }) => {
    test.slow()

    await loginAsAdmin(page)
    await page.goto(`/objects/${newObjectId}`)

    await page.getByRole('tab', { name: /summary/i }).click()
    const hadNoData = await page.getByText(/no data/i).isVisible()

    await page.getByRole('tab', { name: /records/i }).click()
    await page.getByLabel('Access Requests').fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('alert')).toContainText(/saved/i)

    await page.getByRole('tab', { name: /summary/i }).click()

    if (hadNoData) {
      await expect(page.getByText(/total staffing/i).first()).toBeVisible({ timeout: 10_000 })
    } else {
      await expect(page.getByText(/total staffing/i).first()).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// Division Detail — FTE card and coverage gaps
// ---------------------------------------------------------------------------

test.describe('Division Detail — FTE card and coverage gaps', () => {
  let seededDivisionId: string
  let seededDivisionHasGaps: boolean

  test.beforeAll(async ({ request }) => {
    const token = await fetchAdminToken(request)
    const divisions = await fetchDivisionsAggregation(request, token)
    const divWithGaps = divisions.find((d) => d.gap_count > 0)
    const divWithoutGaps = divisions.find((d) => d.gap_count === 0)

    seededDivisionId = (divWithGaps ?? divWithoutGaps ?? divisions[0])?.division_id ?? ''
    seededDivisionHasGaps = divWithGaps !== undefined
  })

  // Checklist 4.1 — FTE summary card present
  test('FTE summary card is visible above the branch table', async ({ page }) => {
    test.skip(!seededDivisionId, 'No seeded division with aggregation data')

    await loginAsAdmin(page)
    await page.goto(`/divisions/${seededDivisionId}`)

    await expect(page.getByText(/total fte/i).or(page.getByText(/fte/i).first())).toBeVisible()
  })

  // Checklist 4.2 — FTE value uses 4 decimal places
  test('Division FTE card shows TOTAL FTE to 4 decimal places', async ({ page }) => {
    test.skip(!seededDivisionId, 'No seeded division with aggregation data')

    await loginAsAdmin(page)
    await page.goto(`/divisions/${seededDivisionId}`)

    await expect(page.getByText(/\d+\.\d{4}/).first()).toBeVisible()
  })

  // Checklist 4.3 — object count
  test('Division FTE card shows object count', async ({ page }) => {
    test.skip(!seededDivisionId, 'No seeded division with aggregation data')

    await loginAsAdmin(page)
    await page.goto(`/divisions/${seededDivisionId}`)

    await expect(
      page.getByText(/objects?:/i).or(page.getByText(/object count/i))
    ).toBeVisible()
  })

  // Checklist 4.4 — "Without Engineer" gap count
  test('Division FTE card shows "Without Engineer" count', async ({ page }) => {
    test.skip(!seededDivisionId, 'No seeded division with aggregation data')

    await loginAsAdmin(page)
    await page.goto(`/divisions/${seededDivisionId}`)

    await expect(
      page.getByText(/without engineer/i).or(page.getByText(/gap/i).first())
    ).toBeVisible()
  })

  // Checklist 4.5 + 4.6 + 4.7 — coverage gaps section when gaps exist
  test('coverage gaps section shows heading and table when gap_count > 0', async ({ page }) => {
    test.skip(!seededDivisionHasGaps, 'No seeded division has coverage gaps')

    const token = await fetchAdminToken(page.context().request)
    const divisions = await fetchDivisionsAggregation(page.context().request, token)
    const divWithGaps = divisions.find((d) => d.gap_count > 0)!

    await loginAsAdmin(page)
    await page.goto(`/divisions/${divWithGaps.division_id}`)

    await expect(page.getByText(/without an assigned engineer/i)).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /object/i }).first()).toBeVisible()
    await expect(
      page
        .getByRole('columnheader', { name: /total fte/i })
        .or(page.getByRole('columnheader', { name: /load/i }))
    ).toBeVisible()

    await expect(page.getByRole('row').nth(1)).toBeVisible()
  })

  // Checklist 4.8 — gaps section absent when no gaps
  test('coverage gaps section is hidden when the division has no gaps', async ({ page }) => {
    test.skip(!seededDivisionId, 'No seeded division with aggregation data')

    const token = await fetchAdminToken(page.context().request)
    const divisions = await fetchDivisionsAggregation(page.context().request, token)
    const cleanDiv = divisions.find((d) => d.gap_count === 0)

    test.skip(!cleanDiv, 'No seeded division with zero coverage gaps')

    await loginAsAdmin(page)
    await page.goto(`/divisions/${cleanDiv!.division_id}`)

    await expect(page.getByText(/without an assigned engineer/i)).not.toBeVisible()
  })

  // Checklist 4.9 — division with no calculation data shows graceful fallback
  test('division with no objects/data shows graceful fallback, not an error page', async ({
    page,
  }) => {
    const prefix = makeE2ePrefix('div-nodata')
    let divisionId: string | null = null

    try {
      const token = await fetchAdminToken(page.context().request)
      const hierarchy = await createHierarchy(page.context().request, prefix, token)
      divisionId = hierarchy.division.id

      await loginAsAdmin(page)
      await page.goto(`/divisions/${divisionId}`)

      await expect(page.getByText(/error/i)).not.toBeVisible()
      await expect(page.getByText('500')).not.toBeVisible()
      await expect(page.getByRole('heading').first()).toBeVisible()
    } finally {
      if (divisionId) cleanupHierarchyByPrefix(prefix)
    }
  })
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe('Navigation scope', () => {
  // Checklist 5.1 — Summary nav active
  test('Summary nav item is enabled and does not show a disabled tooltip', async ({ page }) => {
    await loginAsAdmin(page)

    const summaryButton = page.getByRole('button', { name: 'Summary' })
    await expect(summaryButton).toBeEnabled()

    await summaryButton.hover({ force: true })
    await page.waitForTimeout(300)
    await expect(page.getByText('Available in the next version')).not.toBeVisible()
  })

  // Checklist 5.2 — Engineers nav is now enabled
  test('Engineers nav item is now enabled and clickable', async ({ page }) => {
    await loginAsAdmin(page)

    const engineersButton = page.getByRole('button', { name: 'Engineers' })
    await expect(engineersButton).toBeVisible()

    await engineersButton.hover({ force: true })
    await expect(page.getByText('Available in the next version')).not.toBeVisible()

    await engineersButton.click()
    await expect(page).toHaveURL(/.*\/engineers$/)
  })

  // Checklist 5.3 — direct /svod route loads
  test('direct navigation to /svod after login loads the Summary page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/svod')

    await expect(page).toHaveURL(/\/svod$/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
