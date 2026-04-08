import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { buildHierarchyNames, cleanupHierarchyByPrefix, makeE2ePrefix } from './helpers/data'

test.describe('PoC M-01 deterministic CRUD', () => {
  test('division, branch, and object flows stay isolated and clean up', async ({ page }) => {
    test.slow()

    const prefix = makeE2ePrefix('crud')
    const names = buildHierarchyNames(prefix)
    const updatedDivisionName = `${prefix} Division Updated`
    const updatedBranchName = `${prefix} Branch Updated`
    const updatedObjectName = `${prefix} Object Updated`

    try {
      await loginAsAdmin(page)
      await page.goto('/divisions')

      await page.getByRole('button', { name: 'Add division' }).click()
      const addDivisionDialog = page.getByRole('dialog', { name: 'Add division' })
      await addDivisionDialog.getByLabel('Name').fill(names.divisionName)
      await addDivisionDialog.getByRole('button', { name: 'Create' }).click()
      await expect(addDivisionDialog).toBeHidden()

      const divisionCell = page.getByRole('cell', { name: names.divisionName })
      await expect(divisionCell).toBeVisible()
      await divisionCell.click()

      await expect(page).toHaveURL(/\/divisions\/[0-9a-f-]+$/)
      await expect(page.getByRole('heading', { name: names.divisionName })).toBeVisible()

      await page.getByRole('button', { name: 'Edit' }).click()
      await page.getByRole('textbox').fill(updatedDivisionName)
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('heading', { name: updatedDivisionName })).toBeVisible()

      await page.getByRole('button', { name: 'Add branch' }).click()
      const addBranchDialog = page.getByRole('dialog', { name: 'Add branch' })
      await addBranchDialog.getByLabel('Name').fill(names.branchName)
      await addBranchDialog.getByRole('button', { name: 'Create' }).click()
      await expect(addBranchDialog).toBeHidden()

      const branchCell = page.getByRole('cell', { name: names.branchName })
      await expect(branchCell).toBeVisible()
      await branchCell.click()

      await expect(page).toHaveURL(/\/branches\/[0-9a-f-]+$/)
      await expect(page.getByRole('heading', { name: names.branchName })).toBeVisible()

      await page.getByRole('heading', { name: names.branchName }).locator('xpath=..').getByRole('button').click()
      await page.getByRole('textbox').fill(updatedBranchName)
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('heading', { name: updatedBranchName })).toBeVisible()

      await page.getByRole('button', { name: 'Add object' }).click()
      const addObjectDialog = page.getByRole('dialog', { name: 'Add object' })
      await addObjectDialog.getByLabel('Name').fill(names.objectName)
      await addObjectDialog.getByRole('button', { name: 'Create' }).click()
      await expect(addObjectDialog).toBeHidden()

      const objectCell = page.getByRole('cell', { name: names.objectName })
      await expect(objectCell).toBeVisible()
      await objectCell.click()

      await expect(page).toHaveURL(/\/objects\/[0-9a-f-]+$/)
      await expect(page.getByRole('heading', { name: names.objectName })).toBeVisible()

      await page.getByRole('button', { name: 'Edit name' }).click()
      await page.getByRole('textbox').fill(updatedObjectName)
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('heading', { name: updatedObjectName })).toBeVisible()

      await page.getByRole('button', { name: 'Delete object' }).click()
      const deleteDialog = page.getByRole('dialog', { name: 'Delete object?' })
      await deleteDialog.getByRole('button', { name: 'Delete' }).click()

      await expect(page).toHaveURL(/\/objects$/)
      await expect(page.getByText(updatedObjectName)).toHaveCount(0)
    } finally {
      cleanupHierarchyByPrefix(prefix)
    }
  })
})