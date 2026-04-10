import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectRecordSchema } from '../types/object'
import type { ObjectCreate, ObjectUpdate } from '../types/object'

export async function getObjects(params?: { divisionId?: string }) {
  const response = params?.divisionId
    ? await api.get<ApiResponse<unknown>>('/objects', {
        params: { division_id: params.divisionId },
      })
    : await api.get<ApiResponse<unknown>>('/objects')
  return ObjectRecordSchema.array().parse(response.data.data)
}

export async function getObject(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${id}`)
  return ObjectRecordSchema.parse(response.data.data)
}

export async function createObject(data: ObjectCreate) {
  const response = await api.post<ApiResponse<unknown>>('/objects', data)
  return ObjectRecordSchema.parse(response.data.data)
}

export async function updateObject(id: string, data: ObjectUpdate) {
  const response = await api.put<ApiResponse<unknown>>(`/objects/${id}`, data)
  return ObjectRecordSchema.parse(response.data.data)
}

export async function deleteObject(id: string): Promise<void> {
  await api.delete(`/objects/${id}`)
}
