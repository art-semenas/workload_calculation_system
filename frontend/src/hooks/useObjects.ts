import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createObject, deleteObject, getObject, getObjects, updateObject } from '../api/objects'
import type { ObjectCreate, ObjectUpdate } from '../types/object'

export function useObjects(divisionId?: string) {
  return useQuery({
    queryKey: ['objects', { divisionId }],
    queryFn: () => getObjects({ divisionId }),
  })
}

export function useObject(id: string | undefined) {
  return useQuery({
    queryKey: ['objects', id],
    queryFn: () => getObject(id as string),
    enabled: !!id,
  })
}

export function useCreateObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ObjectCreate) => createObject(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
      // Also invalidate the branch query so BranchDetailPage refreshes its embedded object list
      void queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export function useUpdateObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ObjectUpdate }) => updateObject(id, data),
    onSuccess: (_object, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
      void queryClient.invalidateQueries({ queryKey: ['objects', variables.id] })
    },
  })
}

export function useDeleteObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteObject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}
