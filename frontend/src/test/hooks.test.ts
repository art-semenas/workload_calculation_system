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
      data: { data: { id: '1', name: 'Test' }, meta: null, error: null },
    })
    const { createDivision } = await import('../api/divisions')
    await createDivision({ name: 'Test' })
    expect(mockApi.post).toHaveBeenCalledWith('/divisions', { name: 'Test' })
  })

  it('login calls POST /auth/login', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.post.mockResolvedValueOnce({
      data: { data: { token: 'jwt', user: {} }, meta: null, error: null },
    })
    const { login } = await import('../api/auth')
    await login({ email: 'a@b.com', password: 'x' })
    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'x',
    })
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
})
