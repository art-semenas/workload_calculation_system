import { expect, test } from '@playwright/test'
import { fetchAdminToken, loginAsAdmin } from './helpers/auth'
import { cleanupHierarchyByPrefix, createHierarchy, makeE2ePrefix } from './helpers/data'

let routePrefix: string
let routeObjectId: string
let routeObjectName: string
let routeBranchId: string
let routeDivisionId: string

test.describe('PoC M-01 direct route smoke', () => {
  test.beforeAll(async ({ request }) => {
    routePrefix = makeE2ePrefix('route-smoke')
    const token = await fetchAdminToken(request)
    const hierarchy = await createHierarchy(request, routePrefix, token)
    routeDivisionId = hierarchy.division.id
    routeBranchId = hierarchy.branch.id
    routeObjectId = hierarchy.object.id
    routeObjectName = hierarchy.object.name
  })

  test.afterAll(() => {
    cleanupHierarchyByPrefix(routePrefix)
  })

  test('protected routes load after login', async ({ page }) => {
    await loginAsAdmin(page)

    const routes = [
      { path: '/', heading: 'Maintenance workload' },
      { path: '/divisions', heading: 'Divisions' },
      { path: `/divisions/${routeDivisionId}`, text: /divisions/i },
      { path: `/branches/${routeBranchId}`, text: /divisions/i },
      { path: '/objects', heading: 'Objects' },
      { path: '/objects/new', heading: 'New Object' },
      { path: `/objects/${routeObjectId}`, heading: routeObjectName },
      { path: `/objects/${routeObjectId}/edit`, heading: 'Edit Object' },
    ]

    for (const route of routes) {
      await page.goto(route.path)

      if (route.heading) {
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
      }

      if (route.text) {
        await expect(page.getByText(route.text).first()).toBeVisible()
      }
    }
  })

  test('object detail shows all tabs and delete confirmation text', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`/objects/${routeObjectId}`)

    await expect(page.getByRole('tab', { name: 'Equipment' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Records' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Repairs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Travel' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Engineers' })).toBeVisible()

    // M-03 is now implemented — Engineers tab shows real content
    await page.getByRole('tab', { name: 'Engineers' }).click()
    await expect(page.getByText('Assigned engineers')).toBeVisible()

    await page.getByRole('button', { name: 'Delete object' }).click()
    await expect(page.getByText(/will also delete all related equipment, records, repairs, and travel data/i)).toBeVisible()
  })
})
