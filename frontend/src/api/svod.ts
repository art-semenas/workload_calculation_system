import api from './axios'
import type { ApiResponse } from '../types/api'
import { SvodPageSchema } from '../types/m02'

interface SvodParams {
  page: number
  size: number
  divisionId?: string
}

export async function getSvod({ page, size, divisionId }: SvodParams) {
  const params: Record<string, unknown> = { page, size }
  if (divisionId !== undefined) {
    params.division_id = divisionId
  }
  const response = await api.get<ApiResponse<unknown>>('/svod', { params })
  return SvodPageSchema.parse(response.data.data)
}

export async function exportSvodXlsx(): Promise<Blob> {
  const response = await api.get<Blob>('/svod/export/xlsx', {
    responseType: 'blob',
  })
  return response.data
}
