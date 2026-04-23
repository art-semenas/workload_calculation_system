import api from './axios'
import type { ApiResponse } from '../types/api'
import {
  AggregationCompanySchema,
  AggregationDivisionSchema,
  AggregationBranchSchema,
  CoverageGapSchema,
} from '../types/m02'

export async function getCompanyAggregation() {
  const response = await api.get<ApiResponse<unknown>>('/aggregations/company')
  return AggregationCompanySchema.parse(response.data.data)
}

export async function getDivisionsAggregation() {
  const response = await api.get<ApiResponse<unknown>>('/aggregations/divisions')
  return AggregationDivisionSchema.array().parse(response.data.data)
}

export async function getDivisionAggregation(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/aggregations/divisions/${id}`)
  return AggregationDivisionSchema.parse(response.data.data)
}

export async function getBranchesAggregation() {
  const response = await api.get<ApiResponse<unknown>>('/aggregations/branches')
  return AggregationBranchSchema.array().parse(response.data.data)
}

export async function getBranchAggregation(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/aggregations/branches/${id}`)
  return AggregationBranchSchema.parse(response.data.data)
}

export async function getCoverageGaps(divisionId?: string) {
  const params: Record<string, string> = {}
  if (divisionId) {
    params.division_id = divisionId
  }
  const response = await api.get<ApiResponse<unknown>>('/coverage/gaps', {
    params,
  })
  return CoverageGapSchema.array().parse(response.data.data)
}
