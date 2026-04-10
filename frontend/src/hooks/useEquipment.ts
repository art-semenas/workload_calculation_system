import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addAssignment,
  addDevice,
  getAssignments,
  getDevices,
  removeAssignment,
  removeDevice,
  updateAssignment,
  updateDevice,
} from '../api/equipment'
import type { AssignmentCreate, AssignmentUpdate, DeviceAdd } from '../types/equipment'

export function useDevices(objectId: string | undefined) {
  return useQuery({
    queryKey: ['objects', objectId, 'devices'],
    queryFn: () => getDevices(objectId as string),
    enabled: !!objectId,
  })
}

export function useAddDevice(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DeviceAdd) => addDevice(objectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'devices'] })
    },
  })
}

export function useUpdateDevice(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ deviceTypeId, data }: { deviceTypeId: string; data: DeviceAdd }) =>
      updateDevice(objectId, deviceTypeId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'devices'] })
    },
  })
}

export function useRemoveDevice(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (deviceTypeId: string) => removeDevice(objectId, deviceTypeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'devices'] })
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'assignments'] })
    },
  })
}

export function useAssignments(objectId: string | undefined) {
  return useQuery({
    queryKey: ['objects', objectId, 'assignments'],
    queryFn: () => getAssignments(objectId as string),
    enabled: !!objectId,
  })
}

export function useAddAssignment(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AssignmentCreate) => addAssignment(objectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'assignments'] })
    },
  })
}

export function useUpdateAssignment(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: AssignmentUpdate }) =>
      updateAssignment(objectId, assignmentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'assignments'] })
    },
  })
}

export function useRemoveAssignment(objectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) => removeAssignment(objectId, assignmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects', objectId, 'assignments'] })
    },
  })
}
