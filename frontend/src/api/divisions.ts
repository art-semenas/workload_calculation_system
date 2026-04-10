import api from './axios'
import type { ApiResponse } from '../types/api'
import { BranchSchema, DivisionDetailSchema, DivisionSchema } from '../types/division'

export async function getDivisions() {
  const response = await api.get<ApiResponse<unknown>>('/divisions')
  return DivisionSchema.array().parse(response.data.data)
}

export async function getDivision(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/divisions/${id}`)
  return DivisionDetailSchema.parse(response.data.data)
}

export async function createDivision(data: { name: string }) {
  const response = await api.post<ApiResponse<unknown>>('/divisions', data)
  return DivisionSchema.parse(response.data.data)
}

export async function updateDivision(id: string, data: { name: string }) {
  const response = await api.put<ApiResponse<unknown>>(`/divisions/${id}`, data)
  return DivisionSchema.parse(response.data.data)
}

export async function getDivisionBranches(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/divisions/${id}/branches`)
  return BranchSchema.array().parse(response.data.data)
}

export async function createBranch(divisionId: string, data: { name: string }) {
  const response = await api.post<ApiResponse<unknown>>(`/divisions/${divisionId}/branches`, data)
  return BranchSchema.parse(response.data.data)
}
