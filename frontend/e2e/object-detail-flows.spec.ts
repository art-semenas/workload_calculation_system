import { expect, test } from '@playwright/test'
import { fetchAdminToken, loginAsAdmin } from './helpers/auth'
import {
  cleanupHierarchyByPrefix,
  createHierarchy,
  escapeRegExp,
  getAssignmentsSnapshot,
  getCatalogHappyPath,
  getDevicesSnapshot,
  getRecordsSnapshot,
  getRepairsSnapshot,
  getTravelSnapshot,
  makeE2ePrefix,
  systemTypeLabel,
} from './helpers/data'

test.describe('PoC M-01 object detail flows', () => {
  test('records, repairs, and travel save deterministic data', async ({ page, request }) => {
    test.slow()

    const prefix = makeE2ePrefix('detail-tabs')

    try {
      const token = await fetchAdminToken(request)
      const hierarchy = await createHierarchy(request, prefix, token)
      const catalog = await getCatalogHappyPath(request, token)

      await loginAsAdmin(page)
      await page.goto(`/objects/${hierarchy.object.id}`)

      await page.getByRole('tab', { name: 'Records' }).click()
      await page.getByLabel('Access Requests').fill('4')
      await page.getByLabel('Monitoring Requests').fill('3')
      await page.getByLabel('Footage Requests').fill('2')
      await page.getByLabel('Backup Control').fill('1')
      await page.getByLabel('Security Admin').fill('5')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('alert')).toContainText('Records saved successfully.')

      await expect
        .poll(async () => {
          const records = await getRecordsSnapshot(request, hierarchy.object.id, token)
          return records?.accessRequests ?? -1
        })
        .toBe(4)

      await page.getByRole('tab', { name: 'Repairs' }).click()
      const repairRow = page.getByRole('row', {
        name: new RegExp(escapeRegExp(catalog.repair.name)),
      })
      await repairRow.getByRole('spinbutton', { name: `count-${catalog.repair.name}` }).fill('3')
      await repairRow.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('alert')).toContainText('Repairs saved successfully.')

      await expect
        .poll(async () => {
          const repairs = await getRepairsSnapshot(request, hierarchy.object.id, token)
          return repairs.find((repair) => repair.repairTypeId === catalog.repair.id)?.count ?? -1
        })
        .toBe(3)

      await page.getByRole('tab', { name: 'Travel' }).click()
      await page.getByLabel('Transport Type').fill('Company car')
      await page.getByLabel('Distance (km)').fill('42')
      await page.getByLabel('One-Way Time (min)').fill('35')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('alert')).toContainText('Travel saved successfully.')
      await expect(page.getByText(/70 min \(auto-calculated\)/i)).toBeVisible()

      await expect
        .poll(async () => {
          const travel = await getTravelSnapshot(request, hierarchy.object.id, token)
          return travel?.roundTripMin ?? -1
        })
        .toBe(70)
    } finally {
      cleanupHierarchyByPrefix(prefix)
    }
  })

  test('physical inventory and assignments support a stable non-error flow', async ({
    page,
    request,
  }) => {
    test.slow()

    const prefix = makeE2ePrefix('detail-equipment')

    try {
      const token = await fetchAdminToken(request)
      const hierarchy = await createHierarchy(request, prefix, token)
      const catalog = await getCatalogHappyPath(request, token)
      const assignmentLabel = systemTypeLabel(catalog.context.systemType)

      await loginAsAdmin(page)
      await page.goto(`/objects/${hierarchy.object.id}`)

      await expect(page.getByText('A · Physical inventory')).toBeVisible()
      await page.getByRole('button', { name: 'Add device' }).click()

      const addDeviceDialog = page.getByRole('dialog', { name: 'Add Device' })
      await addDeviceDialog.getByLabel('Device Type').click()
      await page.getByRole('option', { name: catalog.device.name }).click()
      await addDeviceDialog.getByLabel('Qty physical').fill('2')
      await addDeviceDialog.getByRole('button', { name: 'Add' }).click()
      await expect(addDeviceDialog).toBeHidden()

      const inventoryTable = page.getByRole('table', { name: 'physical inventory table' })
      const deviceRow = inventoryTable.getByRole('row', {
        name: new RegExp(escapeRegExp(catalog.device.name)),
      })
      await expect(deviceRow).toContainText('2')

      await expect
        .poll(async () => {
          const devices = await getDevicesSnapshot(request, hierarchy.object.id, token)
          return devices.find((device) => device.deviceTypeId === catalog.device.id)?.quantityPhysical ?? -1
        })
        .toBe(2)

      await deviceRow.getByRole('button', { name: `edit ${catalog.device.name}` }).click()
      const editDeviceDialog = page.getByRole('dialog', {
        name: new RegExp(`Edit — ${escapeRegExp(catalog.device.name)}`),
      })
      await editDeviceDialog.getByLabel('Qty physical').fill('3')
      await editDeviceDialog.getByRole('button', { name: 'Save' }).click()
      await expect(editDeviceDialog).toBeHidden()

      await expect
        .poll(async () => {
          const devices = await getDevicesSnapshot(request, hierarchy.object.id, token)
          return devices.find((device) => device.deviceTypeId === catalog.device.id)?.quantityPhysical ?? -1
        })
        .toBe(3)

      await page.getByRole('button', { name: 'Add assignment' }).click()

      const addAssignmentDialog = page.getByRole('dialog', { name: 'Add assignment' })
      await addAssignmentDialog.getByLabel('Device').click()
      await page.getByRole('option', { name: catalog.device.name }).click()
      await expect(page.getByRole('option', { name: catalog.device.name })).toBeHidden()
      await page.locator('[aria-label="System Type"]').click()
      await page.getByRole('option', { name: assignmentLabel }).click()
      await addAssignmentDialog.getByLabel('Qty maintained').fill('2')
      await addAssignmentDialog.getByRole('button', { name: 'Add' }).click()
      await expect(addAssignmentDialog).toBeHidden()

      const assignmentTable = page.getByRole('table', { name: 'system assignments table' })
      const assignmentRow = assignmentTable.getByRole('row', { name: new RegExp(escapeRegExp(assignmentLabel)) })
      await expect(assignmentRow).toContainText('2')

      await expect
        .poll(async () => {
          const assignments = await getAssignmentsSnapshot(request, hierarchy.object.id, token)
          return (
            assignments.find(
              (assignment) =>
                assignment.deviceTypeId === catalog.device.id &&
                assignment.systemType === catalog.context.systemType
            )?.quantityMaintained ?? -1
          )
        })
        .toBe(2)

      await assignmentRow.getByRole('button', { name: `edit ${catalog.device.name} / ${assignmentLabel}` }).click()
      const editAssignmentDialog = page.getByRole('dialog', {
        name: new RegExp(`Edit — .+${escapeRegExp(assignmentLabel)}`),
      })
      await editAssignmentDialog.getByLabel('Qty maintained').fill('1')
      await editAssignmentDialog.getByRole('button', { name: 'Save' }).click()
      await expect(editAssignmentDialog).toBeHidden()

      await expect
        .poll(async () => {
          const assignments = await getAssignmentsSnapshot(request, hierarchy.object.id, token)
          return (
            assignments.find(
              (assignment) =>
                assignment.deviceTypeId === catalog.device.id &&
                assignment.systemType === catalog.context.systemType
            )?.quantityMaintained ?? -1
          )
        })
        .toBe(1)

      await assignmentRow.getByRole('button', { name: `unassign ${catalog.device.name} / ${assignmentLabel}` }).click()
      const removeAssignmentDialog = page.getByRole('dialog', { name: 'Remove assignment?' })
      await removeAssignmentDialog.getByRole('button', { name: 'Remove' }).click()

      await expect
        .poll(async () => {
          const assignments = await getAssignmentsSnapshot(request, hierarchy.object.id, token)
          return assignments.some(
            (assignment) =>
              assignment.deviceTypeId === catalog.device.id &&
              assignment.systemType === catalog.context.systemType
          )
        })
        .toBe(false)

      await deviceRow.getByRole('button', { name: `remove ${catalog.device.name}` }).click()
      const removeDeviceDialog = page.getByRole('dialog', { name: 'Remove Device?' })
      await removeDeviceDialog.getByRole('button', { name: 'Remove' }).click()

      await expect(page.getByText('No devices in inventory.')).toBeVisible()
      await expect
        .poll(async () => {
          const devices = await getDevicesSnapshot(request, hierarchy.object.id, token)
          return devices.some((device) => device.deviceTypeId === catalog.device.id)
        })
        .toBe(false)
    } finally {
      cleanupHierarchyByPrefix(prefix)
    }
  })
})