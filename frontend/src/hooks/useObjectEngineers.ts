import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getObjectEngineers,
  assignEngineerToObject,
  removeEngineerFromObject,
} from '../api/objectEngineers'
import { ENGINEERS_QUERY_KEY, ENGINEER_SUMMARY_QUERY_KEY } from './useEngineers'
import { SUMMARY_QUERY_KEY } from './useSummary'
import { SVOD_QUERY_KEY } from './useSvod'
import { COVERAGE_QUERY_KEY, AGGREGATION_QUERY_KEY } from './useAggregations'

export const OBJECT_ENGINEERS_QUERY_KEY = 'object-engineers'

export function useObjectEngineers(objectId: string) {
  return useQuery({
    queryKey: [OBJECT_ENGINEERS_QUERY_KEY, objectId],
    queryFn: () => getObjectEngineers(objectId),
    enabled: !!objectId,
  })
}

export function useAssignEngineerToObject(objectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (engineerId: string) => assignEngineerToObject(objectId, engineerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [OBJECT_ENGINEERS_QUERY_KEY, objectId],
      })
      void queryClient.invalidateQueries({
        queryKey: [SUMMARY_QUERY_KEY, objectId],
      })
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
      // Invalidate all engineer summaries — assignment changes affect shares
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY],
      })
      void queryClient.invalidateQueries({ queryKey: [COVERAGE_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [AGGREGATION_QUERY_KEY] })
    },
  })
}

export function useRemoveEngineerFromObject(objectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (engineerId: string) => removeEngineerFromObject(objectId, engineerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [OBJECT_ENGINEERS_QUERY_KEY, objectId],
      })
      void queryClient.invalidateQueries({
        queryKey: [SUMMARY_QUERY_KEY, objectId],
      })
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY],
      })
      void queryClient.invalidateQueries({ queryKey: [COVERAGE_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [AGGREGATION_QUERY_KEY] })
    },
  })
}
