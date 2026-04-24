import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../api/axios'
import { getSvod, exportSvodXlsx } from '../api/svod'
import {
  getCompanyAggregation,
  getDivisionsAggregation,
  getDivisionAggregation,
  getBranchesAggregation,
  getBranchAggregation,
  getCoverageGaps,
} from '../api/aggregations'
import { getObjectSummary } from '../api/summaries'

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('svod API', () => {
  it('getSvod calls GET /svod with page and division_id params', async () => {
    const mockData = {
      data: { data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 } },
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce(mockData)

    await getSvod({ page: 0, size: 100, divisionId: 'abc-123' })
    expect(mockApi.get).toHaveBeenCalledWith('/svod', {
      params: { page: 0, size: 100, division_id: 'abc-123' },
    })
  })

  it('getSvod omits division_id when not provided', async () => {
    const mockData = {
      data: { data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 } },
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce(mockData)

    await getSvod({ page: 0, size: 100 })
    expect(mockApi.get).toHaveBeenCalledWith('/svod', {
      params: { page: 0, size: 100 },
    })
  })

  it('exportSvodXlsx calls GET /svod/export/xlsx with blob responseType', async () => {
    const mockBlob = new Blob(['test'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({ data: mockBlob })

    await exportSvodXlsx()
    expect(mockApi.get).toHaveBeenCalledWith('/svod/export/xlsx', {
      responseType: 'blob',
    })
  })
})

describe('aggregations API', () => {
  it('getCompanyAggregation calls GET /aggregations/company', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: { data: { requiredFte: 45.0, objectCount: 100, divisionCount: 7 } },
    })

    await getCompanyAggregation()
    expect(mockApi.get).toHaveBeenCalledWith('/aggregations/company')
  })

  it('getDivisionsAggregation calls GET /aggregations/divisions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })

    await getDivisionsAggregation()
    expect(mockApi.get).toHaveBeenCalledWith('/aggregations/divisions')
  })

  it('getDivisionAggregation calls GET /aggregations/divisions/:id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: {
          divisionId: '550e8400-e29b-41d4-a716-446655440000',
          divisionName: 'Test Division',
          objectCount: 100,
          requiredFte: 10.5,
          coverageGapCount: 5,
        },
      },
    })

    await getDivisionAggregation('div-123')
    expect(mockApi.get).toHaveBeenCalledWith('/aggregations/divisions/div-123')
  })

  it('getBranchesAggregation calls GET /aggregations/branches', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })

    await getBranchesAggregation()
    expect(mockApi.get).toHaveBeenCalledWith('/aggregations/branches')
  })

  it('getBranchAggregation calls GET /aggregations/branches/:id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: {
          branchId: '550e8400-e29b-41d4-a716-446655440001',
          branchName: 'Test Branch',
          divisionId: '550e8400-e29b-41d4-a716-446655440000',
          divisionName: 'Test Division',
          requiredFte: 5.25,
          objectCount: 50,
        },
      },
    })

    await getBranchAggregation('br-123')
    expect(mockApi.get).toHaveBeenCalledWith('/aggregations/branches/br-123')
  })

  it('getCoverageGaps calls GET /coverage/gaps with optional division_id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })

    await getCoverageGaps('div-123')
    expect(mockApi.get).toHaveBeenCalledWith('/coverage/gaps', {
      params: { division_id: 'div-123' },
    })
  })

  it('getCoverageGaps omits division_id when not provided', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })

    await getCoverageGaps()
    expect(mockApi.get).toHaveBeenCalledWith('/coverage/gaps', { params: {} })
  })
})

describe('summaries API', () => {
  it('getObjectSummary calls GET /objects/:id/summary', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: {
          objectId: '550e8400-e29b-41d4-a716-446655440000',
          osR1PerVisit: 0.1,
          osR2PerVisit: 0.2,
          psR1PerVisit: 0.0,
          psR2PerVisit: 0.0,
          videoR1PerVisit: 0.0,
          videoR2PerVisit: 0.0,
          r1PerVisitTotal: 0.1,
          r2PerVisitTotal: 0.2,
          osMonthlyAvg: 0.5,
          psMonthlyAvg: 0.0,
          videoMonthlyAvg: 0.0,
          recordsMonthly: 0.03,
          repairNoTravelMonthly: 0.01,
          repairWithTravelMonthly: 0.02,
          roundTripMin: 40.0,
          pzvMinutes: 20.0,
          totalNoTravelMin: 1.0,
          itogoChisloNoTravel: 0.02,
          totalWithTravelMin: 2.0,
          itogoChisloWithTravel: 0.03,
          computedAt: '2026-03-30T12:00:00Z',
        },
      },
    })

    await getObjectSummary('obj-123')
    expect(mockApi.get).toHaveBeenCalledWith('/objects/obj-123/summary')
  })
})
