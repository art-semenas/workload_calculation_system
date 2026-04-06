import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Travel, TravelUpdate } from '../types/travel'

export async function getTravel(objectId: string): Promise<Travel | null> {
  const response = await api.get<ApiResponse<Travel>>(`/objects/${objectId}/travel`)
  return response.data.data
}

export async function updateTravel(objectId: string, data: TravelUpdate): Promise<Travel | null> {
  const response = await api.put<ApiResponse<Travel>>(`/objects/${objectId}/travel`, data)
  return response.data.data
}
