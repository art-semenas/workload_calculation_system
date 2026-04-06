import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTravel, updateTravel } from '../api/travel'
import type { TravelUpdate } from '../types/travel'

export function useTravel(objectId: string | undefined) {
  return useQuery({
    queryKey: ['objects', objectId, 'travel'],
    queryFn: () => getTravel(objectId as string),
    enabled: !!objectId,
  })
}

export function useUpdateTravel(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TravelUpdate) => updateTravel(objectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'travel'] })
    },
  })
}
