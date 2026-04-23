import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRecords, updateRecords } from '../api/records'
import type { RecordsUpdate } from '../types/records'
import { SUMMARY_QUERY_KEY } from './useSummary'
import { SVOD_QUERY_KEY } from './useSvod'

export function useRecords(objectId: string | undefined) {
  return useQuery({
    queryKey: ['objects', objectId, 'records'],
    queryFn: () => getRecords(objectId as string),
    enabled: !!objectId,
  })
}

export function useUpdateRecords(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecordsUpdate) => updateRecords(objectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'records'] })
      void queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, objectId] })
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
    },
  })
}
