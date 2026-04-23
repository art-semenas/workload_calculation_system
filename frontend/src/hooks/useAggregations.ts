import { useQuery } from '@tanstack/react-query'
import {
  getCompanyAggregation,
  getDivisionsAggregation,
  getDivisionAggregation,
  getBranchesAggregation,
  getBranchAggregation,
  getCoverageGaps,
} from '../api/aggregations'

export const AGGREGATION_QUERY_KEY = 'aggregation'
export const COVERAGE_QUERY_KEY = 'coverage'

export function useCompanyAggregation() {
  return useQuery({
    queryKey: [AGGREGATION_QUERY_KEY, 'company'],
    queryFn: getCompanyAggregation,
  })
}

export function useDivisionsAggregation() {
  return useQuery({
    queryKey: [AGGREGATION_QUERY_KEY, 'divisions'],
    queryFn: getDivisionsAggregation,
  })
}

export function useDivisionAggregation(id: string) {
  return useQuery({
    queryKey: [AGGREGATION_QUERY_KEY, 'divisions', id],
    queryFn: () => getDivisionAggregation(id),
    enabled: !!id,
  })
}

export function useBranchesAggregation() {
  return useQuery({
    queryKey: [AGGREGATION_QUERY_KEY, 'branches'],
    queryFn: getBranchesAggregation,
  })
}

export function useBranchAggregation(id: string) {
  return useQuery({
    queryKey: [AGGREGATION_QUERY_KEY, 'branches', id],
    queryFn: () => getBranchAggregation(id),
    enabled: !!id,
  })
}

export function useCoverageGaps(divisionId?: string) {
  return useQuery({
    queryKey: [COVERAGE_QUERY_KEY, 'gaps', divisionId ?? null],
    queryFn: () => getCoverageGaps(divisionId),
  })
}
