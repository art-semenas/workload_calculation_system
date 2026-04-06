import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Branch, BranchDetail } from '../types/division'

export async function getBranch(id: string): Promise<BranchDetail> {
  const response = await api.get<ApiResponse<BranchDetail>>(`/branches/${id}`)
  return response.data.data as BranchDetail
}

export async function updateBranch(id: string, data: { name: string }): Promise<Branch> {
  const response = await api.put<ApiResponse<Branch>>(`/branches/${id}`, data)
  return response.data.data as Branch
}
