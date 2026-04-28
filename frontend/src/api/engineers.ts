import api from './axios'
import type { ApiResponse } from '../types/api'
import {
  EngineerSchema,
  EngineerSummarySchema,
  EngineerShareSchema,
  type Engineer,
  type EngineerSummary,
  type EngineerShare,
  type EngineerCreateRequest,
  type EngineerUpdateRequest,
} from '../types/engineer'

interface EngineerFilters {
  status?: string
  homeDivisionId?: string
}

export async function getEngineers(filters?: EngineerFilters): Promise<Engineer[]> {
  const params: Record<string, string> = {}
  if (filters?.status) params.status = filters.status
  if (filters?.homeDivisionId) params.homeDivisionId = filters.homeDivisionId
  const response = await api.get<ApiResponse<unknown>>('/engineers', { params })
  return EngineerSchema.array().parse(response.data.data)
}

export async function getEngineer(id: string): Promise<Engineer> {
  const response = await api.get<ApiResponse<unknown>>(`/engineers/${id}`)
  return EngineerSchema.parse(response.data.data)
}

export async function createEngineer(data: EngineerCreateRequest): Promise<Engineer> {
  const response = await api.post<ApiResponse<unknown>>('/engineers', data)
  return EngineerSchema.parse(response.data.data)
}

export async function updateEngineer(id: string, data: EngineerUpdateRequest): Promise<Engineer> {
  const response = await api.put<ApiResponse<unknown>>(`/engineers/${id}`, data)
  return EngineerSchema.parse(response.data.data)
}

export async function deactivateEngineer(id: string): Promise<void> {
  await api.delete(`/engineers/${id}`)
}

export async function getEngineerSummary(id: string): Promise<EngineerSummary> {
  const response = await api.get<ApiResponse<unknown>>(`/engineers/${id}/summary`)
  return EngineerSummarySchema.parse(response.data.data)
}

export async function getEngineerObjects(id: string): Promise<EngineerShare[]> {
  const response = await api.get<ApiResponse<unknown>>(`/engineers/${id}/objects`)
  return EngineerShareSchema.array().parse(response.data.data)
}

export async function assignObjectToEngineer(engineerId: string, objectId: string): Promise<void> {
  await api.post(`/engineers/${engineerId}/objects`, { objectId })
}

export async function removeObjectFromEngineer(
  engineerId: string,
  objectId: string
): Promise<void> {
  await api.delete(`/engineers/${engineerId}/objects/${objectId}`)
}
