import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectSummarySchema } from '../types/m02'

export async function getObjectSummary(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/summary`)
  return ObjectSummarySchema.parse(response.data.data)
}
