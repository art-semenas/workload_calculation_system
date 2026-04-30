import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, type APIRequestContext } from '@playwright/test'
import { fetchAdminToken } from './auth'

interface ApiEnvelope<T> {
  data: T | null
  meta: unknown
  error: {
    code: string
    message: string
  } | null
}

interface DivisionRecord {
  id: string
  name: string
}

interface BranchRecord {
  id: string
  name: string
  divisionId: string
}

interface ObjectRecord {
  id: string
  name: string
  branchId: string
}

interface RecordsTask {
  accessRequests: number
  monitoringRequests: number
  footageRequests: number
  backupControl: number
  securityAdmin: number
}

interface ObjectRepair {
  repairTypeId: string
  count: number
}

interface TravelRecord {
  transportType: string | null
  distanceKm: number | null
  oneWayTimeMin: number | null
  roundTripMin: number | null
}

interface DeviceType {
  id: string
  name: string
}

interface DeviceSystemContext {
  id: string
  deviceTypeId: string
  systemType: 'OS' | 'PS' | 'VIDEO'
}

interface RepairType {
  id: string
  name: string
}

interface ObjectDevice {
  deviceTypeId: string
  deviceTypeName: string
  quantityPhysical: number
}

interface ObjectSystemAssignment {
  id: string
  deviceTypeId: string
  systemType: 'OS' | 'PS' | 'VIDEO'
  quantityMaintained: number
}

export interface HierarchyFixture {
  division: DivisionRecord
  branch: BranchRecord
  object: ObjectRecord
}

export interface CatalogHappyPathFixture {
  device: DeviceType
  context: DeviceSystemContext
  repair: RepairType
}

const composeFilePath = fileURLToPath(new URL('../../../docker-compose.poc.yml', import.meta.url))
const postgresPassword = process.env.PLAYWRIGHT_POSTGRES_PASSWORD ?? 'poc_secure_pass_2026'
const postgresDatabase = process.env.PLAYWRIGHT_POSTGRES_DB ?? 'workload'

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

async function readEnvelopeData<T>(response: Awaited<ReturnType<APIRequestContext['get']>>) {
  expect(response.ok()).toBeTruthy()
  const json = (await response.json()) as ApiEnvelope<T>
  expect(json.error).toBeNull()
  return json.data
}

async function getWithAuth<T>(request: APIRequestContext, token: string, url: string) {
  const response = await request.get(url, {
    headers: authHeaders(token),
  })

  return readEnvelopeData<T>(response)
}

async function postWithAuth<T>(
  request: APIRequestContext,
  token: string,
  url: string,
  data: unknown
) {
  const response = await request.post(url, {
    headers: authHeaders(token),
    data,
  })

  return readEnvelopeData<T>(response)
}

export function makeE2ePrefix(scope: string): string {
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  return `e2e-${scope}-${Date.now()}-${randomSuffix}`
}

export function buildHierarchyNames(prefix: string) {
  return {
    divisionName: `${prefix} Division`,
    branchName: `${prefix} Branch`,
    objectName: `${prefix} Object`,
  }
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function systemTypeLabel(systemType: 'OS' | 'PS' | 'VIDEO'): string {
  if (systemType === 'OS') {
    return 'Security'
  }

  if (systemType === 'PS') {
    return 'Fire'
  }

  return 'Video'
}

export async function createHierarchy(
  request: APIRequestContext,
  prefix: string,
  token?: string
): Promise<HierarchyFixture> {
  const adminToken = token ?? (await fetchAdminToken(request))
  const names = buildHierarchyNames(prefix)

  const division = await postWithAuth<DivisionRecord>(request, adminToken, '/api/v1/divisions', {
    name: names.divisionName,
  })
  expect(division).toBeTruthy()

  const branch = await postWithAuth<BranchRecord>(
    request,
    adminToken,
    `/api/v1/divisions/${division!.id}/branches`,
    {
      name: names.branchName,
    }
  )
  expect(branch).toBeTruthy()

  const object = await postWithAuth<ObjectRecord>(request, adminToken, '/api/v1/objects', {
    name: names.objectName,
    branchId: branch!.id,
  })
  expect(object).toBeTruthy()

  return {
    division: division!,
    branch: branch!,
    object: object!,
  }
}

export function cleanupHierarchyByPrefix(prefix: string) {
  const likePattern = `${escapeSqlLiteral(prefix)}%`
  const sql = [
    'BEGIN;',
    `DELETE FROM objects WHERE branch_id IN (SELECT b.id FROM branches b JOIN divisions d ON d.id = b.division_id WHERE d.name LIKE '${likePattern}');`,
    `DELETE FROM branches WHERE division_id IN (SELECT id FROM divisions WHERE name LIKE '${likePattern}');`,
    `DELETE FROM divisions WHERE name LIKE '${likePattern}';`,
    'COMMIT;',
  ].join(' ')

  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      composeFilePath,
      'exec',
      '-T',
      '-e',
      `PGPASSWORD=${postgresPassword}`,
      'postgres',
      'psql',
      '-U',
      'postgres',
      '-d',
      postgresDatabase,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    {
      stdio: 'pipe',
    }
  )
}

export async function getCatalogHappyPath(
  request: APIRequestContext,
  token?: string
): Promise<CatalogHappyPathFixture> {
  const adminToken = token ?? (await fetchAdminToken(request))
  const devices =
    (await getWithAuth<DeviceType[]>(request, adminToken, '/api/v1/catalog/devices')) ?? []
  const repairs =
    (await getWithAuth<RepairType[]>(request, adminToken, '/api/v1/catalog/repairs')) ?? []
  const repair = repairs[0]

  expect(repair).toBeTruthy()

  for (const device of devices) {
    const contexts =
      (await getWithAuth<DeviceSystemContext[]>(
        request,
        adminToken,
        `/api/v1/catalog/devices/${device.id}/contexts`
      )) ?? []

    if (contexts.length > 0) {
      return {
        device,
        context: contexts[0],
        repair,
      }
    }
  }

  throw new Error('No device with at least one system context is available for E2E tests.')
}

export async function getRecordsSnapshot(
  request: APIRequestContext,
  objectId: string,
  token?: string
) {
  const adminToken = token ?? (await fetchAdminToken(request))
  return getWithAuth<RecordsTask>(request, adminToken, `/api/v1/objects/${objectId}/records`)
}

export async function getRepairsSnapshot(
  request: APIRequestContext,
  objectId: string,
  token?: string
) {
  const adminToken = token ?? (await fetchAdminToken(request))
  return (
    (await getWithAuth<ObjectRepair[]>(request, adminToken, `/api/v1/objects/${objectId}/repairs`)) ?? []
  )
}

export async function getTravelSnapshot(
  request: APIRequestContext,
  objectId: string,
  token?: string
) {
  const adminToken = token ?? (await fetchAdminToken(request))
  return getWithAuth<TravelRecord>(request, adminToken, `/api/v1/objects/${objectId}/travel`)
}

export async function getDevicesSnapshot(
  request: APIRequestContext,
  objectId: string,
  token?: string
) {
  const adminToken = token ?? (await fetchAdminToken(request))
  return (
    (await getWithAuth<ObjectDevice[]>(request, adminToken, `/api/v1/objects/${objectId}/devices`)) ?? []
  )
}

export async function getAssignmentsSnapshot(
  request: APIRequestContext,
  objectId: string,
  token?: string
) {
  const adminToken = token ?? (await fetchAdminToken(request))
  return (
    (await getWithAuth<ObjectSystemAssignment[]>(
      request,
      adminToken,
      `/api/v1/objects/${objectId}/assignments`
    )) ?? []
  )
}

// ---- M-02 types and helpers ----

export interface SvodRow {
  objectId: string
  objectName: string
  divisionName: string
  branchName: string
  itogoChisloWithTravel: number
  computedAt: string | null
}

export interface SvodPage {
  content: SvodRow[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface DivisionAggregation {
  divisionId: string
  divisionName: string
  requiredFte: number
  objectCount: number
  coverageGapCount: number
}

export async function fetchDivisionsAggregation(
  request: APIRequestContext,
  token?: string
): Promise<DivisionAggregation[]> {
  const adminToken = token ?? (await fetchAdminToken(request))
  return (await getWithAuth<DivisionAggregation[]>(request, adminToken, '/api/v1/aggregations/divisions')) ?? []
}

export async function fetchSvodPage(
  request: APIRequestContext,
  token?: string,
  page = 0,
  size = 100
): Promise<SvodPage | null> {
  const adminToken = token ?? (await fetchAdminToken(request))
  const response = await request.get('/api/v1/svod', {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { page, size },
  })
  const json = (await response.json()) as ApiEnvelope<SvodPage>
  return json.data
}

/** Returns the object_id for the PAC-01 reference object (itogo ≈ 0.032327 or name contains "Архив"). */
export async function fetchReferenceObjectId(
  request: APIRequestContext,
  token?: string
): Promise<string | null> {
  const adminToken = token ?? (await fetchAdminToken(request))
  const data = await fetchSvodPage(request, adminToken)
  if (!data) return null

  const byName = data.content.find(
    (row) =>
      row.objectName.includes('Архив') ||
      row.objectName.includes('Московская') ||
      row.objectName.toLowerCase().includes('202д')
  )
  if (byName) return byName.objectId

  const byValue = data.content.find(
    (row) => Math.abs(row.itogoChisloWithTravel - 0.032327) < 0.000001
  )
  return byValue?.objectId ?? null
}