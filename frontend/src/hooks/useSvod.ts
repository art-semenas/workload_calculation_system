import { useQuery } from '@tanstack/react-query'
import { getSvod } from '../api/svod'

export const SVOD_QUERY_KEY = 'svod'

export function useSvod(page: number, size: number, divisionId?: string) {
  return useQuery({
    queryKey: [SVOD_QUERY_KEY, page, size, divisionId],
    queryFn: () => getSvod({ page, size, divisionId }),
  })
}
