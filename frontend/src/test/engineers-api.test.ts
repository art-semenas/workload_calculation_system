import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import api from '../api/axios'

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApi = api as unknown as {
  get: Mock
  post: Mock
  put: Mock
  delete: Mock
}

beforeEach(() => {
  vi.clearAllMocks()
})

const mockEngineerId = '550e8400-e29b-41d4-a716-446655440000'
const mockDivisionId = '660e8400-e29b-41d4-a716-446655440000'

const mockEngineer = {
  id: mockEngineerId,
  name: 'Test Engineer',
  email: 'test@test.com',
  role: 'engineer',
  homeDivisionId: mockDivisionId,
  homeDivisionName: 'Test Division',
  capacityFte: 1.0,
  isActive: true,
  objectCount: 5,
  totalLoad: 0.5,
  loadRatio: 0.5,
  status: 'NORMAL' as const,
}

const mockEngineerSummary = {
  engineerId: mockEngineerId,
  totalLoad: 0.5,
  objectCount: 5,
  osLoad: 0.2,
  psLoad: 0.15,
  videoLoad: 0.1,
  recordsLoad: 0.05,
  repairLoad: 0,
  capacityFte: 1.0,
  loadRatio: 0.5,
  status: 'NORMAL' as const,
}

describe('engineers API', () => {
  it('getEngineers calls GET /engineers with optional filters', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [mockEngineer] } })
    const { getEngineers } = await import('../api/engineers')
    await getEngineers({ status: 'WARNING', homeDivisionId: 'div-1' })
    expect(mockApi.get).toHaveBeenCalledWith('/engineers', {
      params: { status: 'WARNING', homeDivisionId: 'div-1' },
    })
  })

  it('getEngineers omits undefined filters', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [mockEngineer] } })
    const { getEngineers } = await import('../api/engineers')
    await getEngineers()
    expect(mockApi.get).toHaveBeenCalledWith('/engineers', { params: {} })
  })

  it('getEngineer calls GET /engineers/:id', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: mockEngineer } })
    const { getEngineer } = await import('../api/engineers')
    await getEngineer('eng-1')
    expect(mockApi.get).toHaveBeenCalledWith('/engineers/eng-1')
  })

  it('createEngineer calls POST /engineers', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: mockEngineer } })
    const { createEngineer } = await import('../api/engineers')
    const payload = {
      name: 'Test',
      email: 'test@test.com',
      capacityFte: 1.0,
      homeDivisionId: 'div-1',
    }
    await createEngineer(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/engineers', payload)
  })

  it('updateEngineer calls PUT /engineers/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ data: { data: mockEngineer } })
    const { updateEngineer } = await import('../api/engineers')
    await updateEngineer('eng-1', { capacityFte: 0.5 })
    expect(mockApi.put).toHaveBeenCalledWith('/engineers/eng-1', {
      capacityFte: 0.5,
    })
  })

  it('deactivateEngineer calls DELETE /engineers/:id', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { data: null } })
    const { deactivateEngineer } = await import('../api/engineers')
    await deactivateEngineer('eng-1')
    expect(mockApi.delete).toHaveBeenCalledWith('/engineers/eng-1')
  })

  it('getEngineerSummary calls GET /engineers/:id/summary', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: mockEngineerSummary } })
    const { getEngineerSummary } = await import('../api/engineers')
    await getEngineerSummary('eng-1')
    expect(mockApi.get).toHaveBeenCalledWith('/engineers/eng-1/summary')
  })

  it('getEngineerObjects calls GET /engineers/:id/objects', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    const { getEngineerObjects } = await import('../api/engineers')
    await getEngineerObjects('eng-1')
    expect(mockApi.get).toHaveBeenCalledWith('/engineers/eng-1/objects')
  })

  it('assignObjectToEngineer calls POST /engineers/:id/objects', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    const { assignObjectToEngineer } = await import('../api/engineers')
    await assignObjectToEngineer('eng-1', 'obj-1')
    expect(mockApi.post).toHaveBeenCalledWith('/engineers/eng-1/objects', {
      objectId: 'obj-1',
    })
  })

  it('removeObjectFromEngineer calls DELETE /engineers/:id/objects/:oid', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { data: null } })
    const { removeObjectFromEngineer } = await import('../api/engineers')
    await removeObjectFromEngineer('eng-1', 'obj-1')
    expect(mockApi.delete).toHaveBeenCalledWith('/engineers/eng-1/objects/obj-1')
  })
})

describe('objectEngineers API', () => {
  it('getObjectEngineers calls GET /objects/:id/engineers', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    const { getObjectEngineers } = await import('../api/objectEngineers')
    await getObjectEngineers('obj-1')
    expect(mockApi.get).toHaveBeenCalledWith('/objects/obj-1/engineers')
  })

  it('assignEngineerToObject calls POST /objects/:id/engineers', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    const { assignEngineerToObject } = await import('../api/objectEngineers')
    await assignEngineerToObject('obj-1', 'eng-1')
    expect(mockApi.post).toHaveBeenCalledWith('/objects/obj-1/engineers', {
      engineerId: 'eng-1',
    })
  })

  it('removeEngineerFromObject calls DELETE /objects/:id/engineers/:eid', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { data: null } })
    const { removeEngineerFromObject } = await import('../api/objectEngineers')
    await removeEngineerFromObject('obj-1', 'eng-1')
    expect(mockApi.delete).toHaveBeenCalledWith('/objects/obj-1/engineers/eng-1')
  })
})
