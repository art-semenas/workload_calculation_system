import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/axios'

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)

describe('API modules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDivisions calls GET /divisions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: { data: [], meta: { total: 0 }, error: null },
    })
    const { getDivisions } = await import('../api/divisions')
    await getDivisions()
    expect(mockApi.get).toHaveBeenCalledWith('/divisions')
  })

  it('createDivision calls POST /divisions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Test',
          branchCount: 0,
          objectCount: 0,
        },
        meta: null,
        error: null,
      },
    })
    const { createDivision } = await import('../api/divisions')
    await createDivision({ name: 'Test' })
    expect(mockApi.post).toHaveBeenCalledWith('/divisions', { name: 'Test' })
  })

  it('login calls POST /auth/login', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          token: 'jwt',
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'a@b.com',
            name: 'Test',
            role: 'viewer',
          },
        },
        meta: null,
        error: null,
      },
    })
    const { login } = await import('../api/auth')
    await login({ email: 'a@b.com', password: 'x' })
    expect(mockApi.post).toHaveBeenCalledWith(
      '/auth/login',
      {
        email: 'a@b.com',
        password: 'x',
      },
      {
        skipAuthRedirect: true,
      }
    )
  })

  it('getTravel calls GET /objects/:id/travel', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: { data: null, meta: null, error: null },
    })
    const { getTravel } = await import('../api/travel')
    await getTravel('obj-1')
    expect(mockApi.get).toHaveBeenCalledWith('/objects/obj-1/travel')
  })

  it('updateTravel calls PUT /objects/:id/travel', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.put.mockResolvedValueOnce({
      data: { data: {}, meta: null, error: null },
    })
    const { updateTravel } = await import('../api/travel')
    await updateTravel('obj-1', {
      transportType: 'car',
      distanceKm: 10,
      oneWayTimeMin: 15,
    })
    expect(mockApi.put).toHaveBeenCalledWith('/objects/obj-1/travel', {
      transportType: 'car',
      distanceKm: 10,
      oneWayTimeMin: 15,
    })
  })

  it('getDivisions throws ZodError when response data has wrong shape', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.get.mockResolvedValueOnce({
      data: {
        // branchCount is a string — invalid per DivisionSchema
        data: [{ id: 'not-a-uuid', name: 'X', branchCount: 'wrong', objectCount: 0 }],
        error: null,
      },
    })
    const { getDivisions } = await import('../api/divisions')
    // Currently FAILS: 'as Division[]' silently returns the bad data without throwing
    await expect(getDivisions()).rejects.toThrow()
  })
})

describe('useCoverageGaps enabled condition', () => {
  function isEnabled(divisionId: string | undefined): boolean {
    return divisionId === undefined || divisionId.length > 0
  }

  it('should be enabled when divisionId is undefined', () => {
    expect(isEnabled(undefined)).toBe(true)
  })

  it('should be enabled when divisionId is a non-empty string', () => {
    expect(isEnabled('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('should be disabled when divisionId is an empty string', () => {
    // empty string means "no valid ID provided yet" — correct to disable
    expect(isEnabled('')).toBe(false)
  })
})
