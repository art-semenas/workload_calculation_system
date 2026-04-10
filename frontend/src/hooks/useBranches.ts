import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getBranch, updateBranch } from '../api/branches'

export function useBranch(id: string | undefined) {
  return useQuery({
    queryKey: ['branches', id],
    queryFn: () => getBranch(id as string),
    enabled: !!id,
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) => updateBranch(id, data),
    onSuccess: (_branch, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['branches', variables.id] })
      void queryClient.invalidateQueries({ queryKey: ['divisions'] })
    },
  })
}
