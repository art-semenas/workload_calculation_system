import { useQuery } from '@tanstack/react-query'
import { getObjectSummary } from '../api/summaries'

export const SUMMARY_QUERY_KEY = 'object-summary'

export function useObjectSummary(objectId: string) {
  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, objectId],
    queryFn: () => getObjectSummary(objectId),
    enabled: !!objectId,
    retry: false,
  })
}
