import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('PoC M-01 smoke', () => {
  test('login page loads directly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /workload calculation system/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test.fixme('invalid credentials keep the user on login with a visible error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@workload.local')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
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
})
