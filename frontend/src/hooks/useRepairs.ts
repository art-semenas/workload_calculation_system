import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRepairs, updateRepair } from '../api/repairs'
import type { RepairUpdate } from '../types/repairs'
import { SUMMARY_QUERY_KEY } from './useSummary'
import { SVOD_QUERY_KEY } from './useSvod'

export function useRepairs(objectId: string | undefined) {
  return useQuery({
    queryKey: ['objects', objectId, 'repairs'],
    queryFn: () => getRepairs(objectId as string),
    enabled: !!objectId,
  })
}

export function useUpdateRepair(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repairTypeId, data }: { repairTypeId: string; data: RepairUpdate }) =>
      updateRepair(objectId, repairTypeId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'repairs'] })
      void queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, objectId] })
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
    },
  })
}
