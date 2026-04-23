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
      data: { data: { content: [], total_elements: 0, total_pages: 0, page: 0, size: 100 } },
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
      data: { data: { content: [], total_elements: 0, total_pages: 0, page: 0, size: 100 } },
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
      data: { data: { total_fte: 45.0, total_objects: 100, division_count: 7 } },
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
          division_id: '550e8400-e29b-41d4-a716-446655440000',
          division_name: 'Test Division',
          total_fte: 10.5,
          object_count: 100,
          gap_count: 5,
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
          branch_id: '550e8400-e29b-41d4-a716-446655440001',
          branch_name: 'Test Branch',
          division_name: 'Test Division',
          total_fte: 5.25,
          object_count: 50,
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
          object_id: '550e8400-e29b-41d4-a716-446655440000',
          os_r1_per_visit: 0.1,
          os_r2_per_visit: 0.2,
          ps_r1_per_visit: 0.0,
          ps_r2_per_visit: 0.0,
          video_r1_per_visit: 0.0,
          video_r2_per_visit: 0.0,
          r1_per_visit_total: 0.1,
          r2_per_visit_total: 0.2,
          os_monthly_avg: 0.5,
          ps_monthly_avg: 0.0,
          video_monthly_avg: 0.0,
          records_monthly: 0.03,
          repair_no_travel_monthly: 0.01,
          repair_with_travel_monthly: 0.02,
          round_trip_min: 40.0,
          pzv_minutes: 20.0,
          total_no_travel_min: 1.0,
          itogo_chislo_no_travel: 0.02,
          total_with_travel_min: 2.0,
          itogo_chislo_with_travel: 0.03,
          computed_at: '2026-03-30T12:00:00Z',
        },
      },
    })

    await getObjectSummary('obj-123')
    expect(mockApi.get).toHaveBeenCalledWith('/objects/obj-123/summary')
  })
})
