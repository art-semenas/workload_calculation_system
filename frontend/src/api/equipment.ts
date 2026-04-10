import api from './axios'
import type { ApiResponse } from '../types/api'
import { ObjectDeviceSchema, ObjectSystemAssignmentSchema } from '../types/equipment'
import type { AssignmentCreate, AssignmentUpdate, DeviceAdd } from '../types/equipment'

export async function getDevices(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/devices`)
  return ObjectDeviceSchema.array().parse(response.data.data)
}

export async function addDevice(objectId: string, data: DeviceAdd) {
  const response = await api.post<ApiResponse<unknown>>(`/objects/${objectId}/devices`, data)
  return ObjectDeviceSchema.parse(response.data.data)
}

export async function updateDevice(objectId: string, deviceTypeId: string, data: DeviceAdd) {
  const response = await api.put<ApiResponse<unknown>>(
    `/objects/${objectId}/devices/${deviceTypeId}`,
    data
  )
  return ObjectDeviceSchema.parse(response.data.data)
}

export async function removeDevice(objectId: string, deviceTypeId: string): Promise<void> {
  await api.delete(`/objects/${objectId}/devices/${deviceTypeId}`)
}

export async function getAssignments(objectId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/objects/${objectId}/assignments`)
  return ObjectSystemAssignmentSchema.array().parse(response.data.data)
}

export async function addAssignment(objectId: string, data: AssignmentCreate) {
  const response = await api.post<ApiResponse<unknown>>(`/objects/${objectId}/assignments`, data)
  return ObjectSystemAssignmentSchema.parse(response.data.data)
}

export async function updateAssignment(
  objectId: string,
  assignmentId: string,
  data: AssignmentUpdate
) {
  const response = await api.put<ApiResponse<unknown>>(
    `/objects/${objectId}/assignments/${assignmentId}`,
    data
  )
  return ObjectSystemAssignmentSchema.parse(response.data.data)
}

export async function removeAssignment(objectId: string, assignmentId: string): Promise<void> {
  await api.delete(`/objects/${objectId}/assignments/${assignmentId}`)
}
