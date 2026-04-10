import api from './axios'
import type { ApiResponse } from '../types/api'
import { BranchDetailSchema, BranchSchema } from '../types/division'

export async function getBranch(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/branches/${id}`)
  return BranchDetailSchema.parse(response.data.data)
}

export async function updateBranch(id: string, data: { name: string }) {
  const response = await api.put<ApiResponse<unknown>>(`/branches/${id}`, data)
  return BranchSchema.parse(response.data.data)
}
