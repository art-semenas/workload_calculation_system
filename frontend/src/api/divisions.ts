import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Branch, Division, DivisionDetail } from '../types/division'

export async function getDivisions(): Promise<Division[]> {
  const response = await api.get<ApiResponse<Division[]>>('/divisions')
  return response.data.data as Division[]
}

export async function getDivision(id: string): Promise<DivisionDetail> {
  const response = await api.get<ApiResponse<DivisionDetail>>(`/divisions/${id}`)
  return response.data.data as DivisionDetail
}

export async function createDivision(data: { name: string }): Promise<Division> {
  const response = await api.post<ApiResponse<Division>>('/divisions', data)
  return response.data.data as Division
}

export async function updateDivision(id: string, data: { name: string }): Promise<Division> {
  const response = await api.put<ApiResponse<Division>>(`/divisions/${id}`, data)
  return response.data.data as Division
}

export async function getDivisionBranches(id: string): Promise<Branch[]> {
  const response = await api.get<ApiResponse<Branch[]>>(`/divisions/${id}/branches`)
  return response.data.data as Branch[]
}

export async function createBranch(divisionId: string, data: { name: string }): Promise<Branch> {
  const response = await api.post<ApiResponse<Branch>>(`/divisions/${divisionId}/branches`, data)
  return response.data.data as Branch
}
