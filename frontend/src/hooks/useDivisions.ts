import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBranch,
  createDivision,
  getDivision,
  getDivisions,
  updateDivision,
} from '../api/divisions'

export function useDivisions() {
  return useQuery({
    queryKey: ['divisions'],
    queryFn: getDivisions,
  })
}

export function useDivision(id: string | undefined) {
  return useQuery({
    queryKey: ['divisions', id],
    queryFn: () => getDivision(id as string),
    enabled: !!id,
  })
}

export function useCreateDivision() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDivision,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['divisions'] })
    },
  })
}

export function useUpdateDivision() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) => updateDivision(id, data),
    onSuccess: (_division, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['divisions'] })
      void queryClient.invalidateQueries({ queryKey: ['divisions', variables.id] })
    },
  })
}

export function useCreateBranch(divisionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string }) => createBranch(divisionId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['divisions'] })
      void queryClient.invalidateQueries({ queryKey: ['divisions', divisionId] })
    },
  })
}
