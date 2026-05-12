import { expect, type APIRequestContext, type Page } from '@playwright/test'

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@workload.local'
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'password'

interface ApiEnvelope<T> {
  data: T | null
  meta: unknown
  error: {
    code: string
    message: string
  } | null
}

interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'editor' | 'viewer' | 'engineer'
  }
}

interface ObjectRecord {
  id: string
  name: string
  branchId: string
  branchName?: string
  divisionName?: string
}

interface BranchDetail {
  id: string
  name: string
  divisionId: string
  divisionName?: string
}

export interface RouteSeed {
  objectId: string
  objectName: string
  branchId: string
  divisionId: string
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(adminEmail)
  await page.getByLabel(/password/i).fill(adminPassword)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for navigation after login or check for error
  try {
    await expect(page).toHaveURL(/\/$/, { timeout: 8000 })
  } catch {
    // Check if there's an error message displayed
    const errorMessage = await page.getByRole('alert').textContent()
    if (errorMessage) {
      throw new Error(`Login failed: ${errorMessage}`)
    }
    // Check if still on /login
    const url = page.url()
    throw new Error(`Login did not redirect to /. Current URL: ${url}`)
  }

  await expect(page.getByRole('heading', { name: 'Maintenance workload' })).toBeVisible()
}

export async function fetchAdminToken(request: APIRequestContext): Promise<string> {
  const response = await request.post('/api/v1/auth/login', {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  })

  expect(response.ok()).toBeTruthy()
  const json = (await response.json()) as ApiEnvelope<LoginResponse>
  expect(json.data?.token).toBeTruthy()
  return json.data!.token
}

export async function fetchFirstObject(request: APIRequestContext): Promise<ObjectRecord> {
  const token = await fetchAdminToken(request)
  const response = await request.get('/api/v1/objects', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  expect(response.ok()).toBeTruthy()
  const json = (await response.json()) as ApiEnvelope<ObjectRecord[]>
  const firstObject = json.data?.[0]
  expect(firstObject).toBeTruthy()
  return firstObject!
}

export async function fetchRouteSeed(request: APIRequestContext): Promise<RouteSeed> {
  const token = await fetchAdminToken(request)
  const firstObject = await fetchFirstObject(request)
  const branchResponse = await request.get(`/api/v1/branches/${firstObject.branchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  expect(branchResponse.ok()).toBeTruthy()
  const branchJson = (await branchResponse.json()) as ApiEnvelope<BranchDetail>
  expect(branchJson.data).toBeTruthy()

  return {
    objectId: firstObject.id,
    objectName: firstObject.name,
    branchId: firstObject.branchId,
    divisionId: branchJson.data!.divisionId,
  }
}
