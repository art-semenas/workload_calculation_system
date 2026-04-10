import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectRepairSchema } from '../types/repairs'
import type { RepairUpdate } from '../types/repairs'

export async function getRepairs(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/repairs`)
  return ObjectRepairSchema.array().parse(response.data.data)
}

export async function updateRepair(objectId: string, repairTypeId: string, data: RepairUpdate) {
  const response = await api.put<ApiResponse<unknown>>(
    `/objects/${objectId}/repairs/${repairTypeId}`,
    data
  )
  return ObjectRepairSchema.parse(response.data.data)
}
