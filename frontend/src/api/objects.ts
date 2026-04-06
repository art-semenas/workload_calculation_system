import api from './axios'
import type { ApiResponse } from '../types/api'
import type { ObjectCreate, ObjectRecord, ObjectUpdate } from '../types/object'

export async function getObjects(params?: { divisionId?: string }): Promise<ObjectRecord[]> {
  const response = params?.divisionId
    ? await api.get<ApiResponse<ObjectRecord[]>>('/objects', {
        params: { division_id: params.divisionId },
      })
    : await api.get<ApiResponse<ObjectRecord[]>>('/objects')

  return response.data.data as ObjectRecord[]
}

export async function getObject(id: string): Promise<ObjectRecord> {
  const response = await api.get<ApiResponse<ObjectRecord>>(`/objects/${id}`)
  return response.data.data as ObjectRecord
}

export async function createObject(data: ObjectCreate): Promise<ObjectRecord> {
  const response = await api.post<ApiResponse<ObjectRecord>>('/objects', data)
  return response.data.data as ObjectRecord
}

export async function updateObject(id: string, data: ObjectUpdate): Promise<ObjectRecord> {
  const response = await api.put<ApiResponse<ObjectRecord>>(`/objects/${id}`, data)
  return response.data.data as ObjectRecord
}

export async function deleteObject(id: string): Promise<void> {
  await api.delete(`/objects/${id}`)
}
