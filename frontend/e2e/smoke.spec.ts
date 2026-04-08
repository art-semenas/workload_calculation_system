import { expect, test } from '@playwright/test'
import { fetchRouteSeed, loginAsAdmin } from './helpers/auth'

test.describe('PoC M-01 smoke', () => {
  test('login page loads directly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /workload calculation system/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

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

  test('valid login reaches dashboard and shows core navigation', async ({ page }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Objects' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Divisions' })).toBeVisible()
    await expect(page.getByText('Engineers').first()).toBeVisible()
    await expect(page.getByText('Summary').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'FTE by Division' })).toBeVisible()
    await expect(page.getByText('Data will be available after M-02')).toBeVisible()
    await expect(page.getByText('Data will be available after M-03')).toBeVisible()
  })

  test('refresh after login keeps the app usable', async ({ page }) => {
    await loginAsAdmin(page)
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Divisions' })).toBeVisible()
  })

  test('object list shows filter, total staffing placeholder, and grouped branch dialog', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/objects')

    await expect(page.getByRole('heading', { name: 'Objects' })).toBeVisible()
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
  test('disabled navigation items are visible with tooltip', async ({ page }) => {
    await loginAsAdmin(page)

    const engineersButton = page.getByRole('button', { name: 'Engineers' })
    const summaryButton = page.getByRole('button', { name: 'Summary' })
    await expect(engineersButton).toBeVisible()
    await expect(summaryButton).toBeVisible()

    await engineersButton.hover({ force: true })
    await expect(page.getByText('Available in the next version')).toBeVisible()
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

  // 3.2
  test('dashboard division overview table shows Name, Branches, and Objects columns', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Branches' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Objects' })).toBeVisible()
  })

  // 3.3
  test('clicking division row on dashboard navigates to division detail', async ({ page }) => {
    await loginAsAdmin(page)

    // nth(0) is the header row; nth(1) is the first data row
    await page.getByRole('row').nth(1).click()
    await expect(page).toHaveURL(/\/divisions\/[0-9a-f-]+$/)
  })

  // 6.3
  test('division filter on object list scopes results to selected division', async ({
    page,
    request,
  }) => {
    const seed = await fetchRouteSeed(request)

    await loginAsAdmin(page)
    await page.goto('/objects')

    // Open the Division combobox and pick the first real division (not "All divisions")
    await page.getByRole('combobox').first().click()
    const firstDivisionOption = page.getByRole('option').filter({ hasNot: page.getByText('All divisions') }).first()
    await firstDivisionOption.click()

    // The seed object belongs to a division and must still be visible after filtering
    await expect(page.getByText(seed.objectName)).toBeVisible()
  })

  // 6.7
  test('clicking object row on object list navigates to object detail', async ({
    page,
    request,
  }) => {
    const seed = await fetchRouteSeed(request)

    await loginAsAdmin(page)
    await page.goto('/objects')

    await page.getByRole('row', { name: new RegExp(seed.objectName) }).click()
    await expect(page).toHaveURL(new RegExp(`/objects/${seed.objectId}`))
    await expect(page.getByRole('heading', { name: seed.objectName })).toBeVisible()
  })
})
