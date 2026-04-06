import api from './axios'
import type { ApiResponse } from '../types/api'
import type { RecordsTask, RecordsUpdate } from '../types/records'

export async function getRecords(objectId: string): Promise<RecordsTask | null> {
  const response = await api.get<ApiResponse<RecordsTask>>(`/objects/${objectId}/records`)
  return response.data.data
}

export async function updateRecords(
  objectId: string,
  data: RecordsUpdate
): Promise<RecordsTask | null> {
  const response = await api.put<ApiResponse<RecordsTask>>(`/objects/${objectId}/records`, data)
  return response.data.data
}
