import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEngineers,
  getEngineer,
  createEngineer,
  updateEngineer,
  deactivateEngineer,
  getEngineerSummary,
  getEngineerObjects,
  assignObjectToEngineer,
  removeObjectFromEngineer,
} from '../api/engineers'
import type { EngineerCreateRequest, EngineerUpdateRequest } from '../types/engineer'
import { SVOD_QUERY_KEY } from './useSvod'

export const ENGINEERS_QUERY_KEY = 'engineers'
export const ENGINEER_SUMMARY_QUERY_KEY = 'engineer-summary'
export const ENGINEER_OBJECTS_QUERY_KEY = 'engineer-objects'

export function useEngineers(status?: string, homeDivisionId?: string) {
  return useQuery({
    queryKey: [ENGINEERS_QUERY_KEY, { status, homeDivisionId }],
    queryFn: () => getEngineers({ status, homeDivisionId }),
  })
}

export function useEngineer(id: string) {
  return useQuery({
    queryKey: [ENGINEERS_QUERY_KEY, id],
    queryFn: () => getEngineer(id),
    enabled: !!id,
  })
}

export function useCreateEngineer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: EngineerCreateRequest) => createEngineer(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
    },
  })
}

export function useUpdateEngineer(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: EngineerUpdateRequest) => updateEngineer(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY, id],
      })
    },
  })
}

export function useDeactivateEngineer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateEngineer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
    },
  })
}

export function useEngineerSummary(id: string) {
  return useQuery({
    queryKey: [ENGINEER_SUMMARY_QUERY_KEY, id],
    queryFn: () => getEngineerSummary(id),
    enabled: !!id,
  })
}

export function useEngineerObjects(id: string) {
  return useQuery({
    queryKey: [ENGINEER_OBJECTS_QUERY_KEY, id],
    queryFn: () => getEngineerObjects(id),
    enabled: !!id,
  })
}

export function useAssignObjectToEngineer(engineerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (objectId: string) => assignObjectToEngineer(engineerId, objectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_OBJECTS_QUERY_KEY, engineerId],
      })
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY, engineerId],
      })
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
    },
  })
}

export function useRemoveObjectFromEngineer(engineerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (objectId: string) => removeObjectFromEngineer(engineerId, objectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_OBJECTS_QUERY_KEY, engineerId],
      })
      void queryClient.invalidateQueries({
        queryKey: [ENGINEER_SUMMARY_QUERY_KEY, engineerId],
      })
      void queryClient.invalidateQueries({ queryKey: [ENGINEERS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [SVOD_QUERY_KEY] })
    },
  })
}
