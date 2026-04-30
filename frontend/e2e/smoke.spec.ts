import { expect, test } from '@playwright/test'
import { fetchAdminToken, loginAsAdmin } from './helpers/auth'
import { cleanupHierarchyByPrefix, createHierarchy, makeE2ePrefix } from './helpers/data'

// Shared fixture created once for all data-dependent smoke tests.
// The fresh CI database has no divisions/objects (catalog seed only),
// so we create a known hierarchy in beforeAll and clean it up in afterAll.
let smokePrefix: string
let smokeDivisionId: string
let smokeDivisionName: string
let smokeObjectId: string
let smokeObjectName: string

test.describe('PoC M-01 smoke', () => {
  test.beforeAll(async ({ request }) => {
    smokePrefix = makeE2ePrefix('smoke')
    const token = await fetchAdminToken(request)
    const hierarchy = await createHierarchy(request, smokePrefix, token)
    smokeDivisionId = hierarchy.division.id
    smokeDivisionName = hierarchy.division.name
    smokeObjectId = hierarchy.object.id
    smokeObjectName = hierarchy.object.name
  })

  test.afterAll(() => {
    cleanupHierarchyByPrefix(smokePrefix)
  })

  // 1.1
  test('login page loads directly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /workload calculation system/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  // 1.3
  test('invalid credentials keep the user on login with a visible error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@workload.local')
    await page.getByLabel(/password/i).fill('wrongpassword')

    const failedLoginResponse = page.waitForResponse(
      (response) => response.url().includes('/api/v1/auth/login') && response.status() === 401
    )

    await page.getByRole('button', { name: /sign in/i }).click()
    await failedLoginResponse

    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i)
    await expect(page).toHaveURL(/\/login$/)
  })

  // 1.4
  test('valid login reaches dashboard and shows core navigation', async ({ page }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Objects' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Divisions' })).toBeVisible()
    await expect(page.getByText('Engineers').first()).toBeVisible()
    await expect(page.getByText('Summary').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'FTE by Division' })).toBeVisible()
    // M-02 dashboard sections now implemented; M-03 placeholder is only on Engineers nav
    await expect(page.getByText('Data will be available after M-02')).not.toBeVisible()
  })

  // 1.5
  test('refresh after login keeps the app usable', async ({ page }) => {
    await loginAsAdmin(page)
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'FTE by Division' })).toBeVisible()
  })

  // 6.1, 6.2, 6.4, 6.5
  test('object list shows filter, total staffing placeholder, and grouped branch dialog', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/objects')

    await expect(page.getByRole('heading', { name: 'Objects' })).toBeVisible()
    // TOTAL Staffing column header is only rendered when objects exist (beforeAll creates one)
    await expect(page.getByText('TOTAL Staffing')).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()

    await page.getByRole('button', { name: 'Add object' }).click()
    await expect(page.getByRole('heading', { name: 'Add object' })).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()

    await page.getByTestId('dialog-branch-select-btn').click()
    await expect(page.getByText('Select branch')).toBeVisible()
  })

  // 1.2
  test('empty login form shows field validation errors', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Required').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  // 2.2
  test('navigation items are visible and enabled', async ({ page }) => {
    await loginAsAdmin(page)

    const engineersButton = page.getByRole('button', { name: 'Engineers' })
    const summaryButton = page.getByRole('button', { name: 'Summary' })
    await expect(engineersButton).toBeVisible()
    await expect(summaryButton).toBeVisible()

    // M-03 is now implemented — Engineers nav item is enabled and navigable
    await engineersButton.click()
    await expect(page).toHaveURL(/\/engineers$/)
  })

  // 2.3
  test('user name is displayed in app bar after login', async ({ page, request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: { email: 'admin@workload.local', password: 'password' },
    })
    const json = (await response.json()) as { data: { user: { name: string } } }
    const userName = json.data.user.name

    await loginAsAdmin(page)
    await expect(page.getByText(userName)).toBeVisible()
  })

  // 2.4
  test('logout returns user to login page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('button', { name: /logout/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  // 3.2 — dashboard division FTE table only renders when divisions exist (beforeAll creates one)
  test('dashboard division FTE table shows Division, TOTAL FTE, and Objects columns', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('columnheader', { name: /division/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /total fte/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /objects/i }).first()).toBeVisible()
  })

  // 3.3 — division detail page shows data after login
  test('division detail page loads after login', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`/divisions/${smokeDivisionId}`)
    await expect(page).toHaveURL(new RegExp(`/divisions/${smokeDivisionId}`))
    await expect(page.getByRole('heading', { name: smokeDivisionName })).toBeVisible()
  })

  // 6.3
  test('division filter on object list scopes results to selected division', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/objects')

    // Open the Division combobox and select the smoke division by name
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: smokeDivisionName }).click()

    // The smoke object belongs to this division and must still be visible after filtering
    await expect(page.getByText(smokeObjectName)).toBeVisible()
  })

  // 6.7
  test('clicking object row on object list navigates to object detail', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/objects')

    await page.getByRole('row', { name: new RegExp(smokeObjectName) }).click()
    await expect(page).toHaveURL(new RegExp(`/objects/${smokeObjectId}`))
    await expect(page.getByRole('heading', { name: smokeObjectName })).toBeVisible()
  })
})
