import { describe, expect, it, vi, beforeEach } from 'vitest'
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

describe('useCreateObject invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createObject calls POST /objects with the provided data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vi.mocked result, no safe generic available
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'New Object',
          branchId: '00000000-0000-0000-0000-000000000002',
        },
        error: null,
      },
    })
    const { createObject } = await import('../api/objects')
    const result = await createObject({
      name: 'New Object',
      branchId: '00000000-0000-0000-0000-000000000002',
    })
    expect(mockApi.post).toHaveBeenCalledWith('/objects', {
      name: 'New Object',
      branchId: '00000000-0000-0000-0000-000000000002',
    })
    expect(result.branchId).toBe('00000000-0000-0000-0000-000000000002')
  })
})
