import api from './axios'
import type { ApiResponse } from '../types/api'
import type { ObjectRepair, RepairUpdate } from '../types/repairs'

export async function getRepairs(objectId: string): Promise<ObjectRepair[]> {
  const response = await api.get<ApiResponse<ObjectRepair[]>>(`/objects/${objectId}/repairs`)
  return response.data.data as ObjectRepair[]
}

export async function updateRepair(
  objectId: string,
  repairTypeId: string,
  data: RepairUpdate
): Promise<ObjectRepair> {
  const response = await api.put<ApiResponse<ObjectRepair>>(
    `/objects/${objectId}/repairs/${repairTypeId}`,
    data
  )
  return response.data.data as ObjectRepair
}
