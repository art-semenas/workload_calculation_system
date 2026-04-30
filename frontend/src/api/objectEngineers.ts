import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectEngineerRowSchema, type ObjectEngineerRow } from '../types/engineer'

export async function getObjectEngineers(objectId: string): Promise<ObjectEngineerRow[]> {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/engineers`)
  return ObjectEngineerRowSchema.array().parse(response.data.data)
}

export async function assignEngineerToObject(objectId: string, engineerId: string): Promise<void> {
  await api.post(`/objects/${objectId}/engineers`, { engineerId })
}

export async function removeEngineerFromObject(
  objectId: string,
  engineerId: string
): Promise<void> {
  await api.delete(`/objects/${objectId}/engineers/${engineerId}`)
}
