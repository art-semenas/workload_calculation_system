import { expect, test } from '@playwright/test'
import { fetchRouteSeed, loginAsAdmin } from './helpers/auth'

test.describe('PoC M-01 direct route smoke', () => {
  test('protected routes load after login', async ({ page, request }) => {
    const seed = await fetchRouteSeed(request)
    await loginAsAdmin(page)

    const routes = [
      { path: '/', heading: 'Dashboard' },
      { path: '/divisions', heading: 'Divisions' },
      { path: `/divisions/${seed.divisionId}`, text: /divisions/i },
      { path: `/branches/${seed.branchId}`, text: /divisions/i },
      { path: '/objects', heading: 'Objects' },
      { path: '/objects/new', heading: 'New Object' },
      { path: `/objects/${seed.objectId}`, heading: seed.objectName },
      { path: `/objects/${seed.objectId}/edit`, heading: 'Edit Object' },
    ]

    for (const route of routes) {
      await page.goto(route.path)

      if (route.heading) {
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
      }

      if (route.text) {
        await expect(page.getByText(route.text)).toBeVisible()
      }
    }
  })

  test('object detail shows placeholder tabs and delete confirmation text', async ({ page, request }) => {
    const seed = await fetchRouteSeed(request)
    await loginAsAdmin(page)
    await page.goto(`/objects/${seed.objectId}`)

    await expect(page.getByRole('tab', { name: 'Equipment' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Records' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Repairs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Travel' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Engineers' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible()

    await page.getByRole('tab', { name: 'Engineers' }).click()
    await expect(page.getByText('Available in M-03')).toBeVisible()

    await page.getByRole('tab', { name: 'Summary' }).click()
    await expect(page.getByText('Available in M-02')).toBeVisible()

    await page.getByRole('button', { name: 'Delete object' }).click()
    await expect(page.getByText(/will also delete all related equipment, records, repairs, and travel data/i)).toBeVisible()
  })
})