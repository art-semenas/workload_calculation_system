import { useQuery } from '@tanstack/react-query'
import { getObjectSummary } from '../api/summaries'

export const SUMMARY_QUERY_KEY = 'object-summary'

// PoC (S-02): summaries are computed synchronously when an object's equipment/repairs change.
// A 404 from /summaries/{objectId} means "not yet computed" — retrying is pointless and only
// adds latency. Callers (ObjectDetailPage, BranchDetailPage) render an empty-state fallback
// when `data === undefined`, so a single-shot failure is graceful. Revisit if MVP M-06 moves
// recalc to a background worker where transient 5xx becomes a normal class of failure.
export function useObjectSummary(objectId: string) {
  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, objectId],
    queryFn: () => getObjectSummary(objectId),
    enabled: !!objectId,
    retry: false,
  })
}
