import { useQuery } from '@tanstack/react-query'
import {
  getCompanyAggregation,
  getDivisionsAggregation,
  getDivisionAggregation,
  getBranchesAggregation,
  getBranchAggregation,
  getCoverageGaps,
} from '../api/aggregations'

export function useCompanyAggregation() {
  return useQuery({
    queryKey: ['aggregation', 'company'],
    queryFn: getCompanyAggregation,
  })
}

export function useDivisionsAggregation() {
  return useQuery({
    queryKey: ['aggregation', 'divisions'],
    queryFn: getDivisionsAggregation,
  })
}

export function useDivisionAggregation(id: string) {
  return useQuery({
    queryKey: ['aggregation', 'divisions', id],
    queryFn: () => getDivisionAggregation(id),
    enabled: !!id,
  })
}

export function useBranchesAggregation() {
  return useQuery({
    queryKey: ['aggregation', 'branches'],
    queryFn: getBranchesAggregation,
  })
}

export function useBranchAggregation(id: string) {
  return useQuery({
    queryKey: ['aggregation', 'branches', id],
    queryFn: () => getBranchAggregation(id),
    enabled: !!id,
  })
}

export function useCoverageGaps(divisionId?: string) {
  return useQuery({
    queryKey: ['coverage', 'gaps', divisionId],
    queryFn: () => getCoverageGaps(divisionId),
  })
}
