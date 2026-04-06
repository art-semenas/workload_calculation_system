import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  AssignmentCreate,
  AssignmentUpdate,
  DeviceAdd,
  ObjectDevice,
  ObjectSystemAssignment,
} from '../types/equipment'

export async function getDevices(objectId: string): Promise<ObjectDevice[]> {
  const response = await api.get<ApiResponse<ObjectDevice[]>>(`/objects/${objectId}/devices`)
  return response.data.data as ObjectDevice[]
}

export async function addDevice(objectId: string, data: DeviceAdd): Promise<ObjectDevice> {
  const response = await api.post<ApiResponse<ObjectDevice>>(`/objects/${objectId}/devices`, data)
  return response.data.data as ObjectDevice
}

export async function updateDevice(
  objectId: string,
  deviceTypeId: string,
  data: DeviceAdd
): Promise<ObjectDevice> {
  const response = await api.put<ApiResponse<ObjectDevice>>(
    `/objects/${objectId}/devices/${deviceTypeId}`,
    data
  )
  return response.data.data as ObjectDevice
}

export async function removeDevice(objectId: string, deviceTypeId: string): Promise<void> {
  await api.delete(`/objects/${objectId}/devices/${deviceTypeId}`)
}

export async function getAssignments(objectId: string): Promise<ObjectSystemAssignment[]> {
  const response = await api.get<ApiResponse<ObjectSystemAssignment[]>>(
    `/objects/${objectId}/assignments`
  )
  return response.data.data as ObjectSystemAssignment[]
}

export async function addAssignment(
  objectId: string,
  data: AssignmentCreate
): Promise<ObjectSystemAssignment> {
  const response = await api.post<ApiResponse<ObjectSystemAssignment>>(
    `/objects/${objectId}/assignments`,
    data
  )
  return response.data.data as ObjectSystemAssignment
}

export async function updateAssignment(
  objectId: string,
  assignmentId: string,
  data: AssignmentUpdate
): Promise<ObjectSystemAssignment> {
  const response = await api.put<ApiResponse<ObjectSystemAssignment>>(
    `/objects/${objectId}/assignments/${assignmentId}`,
    data
  )
  return response.data.data as ObjectSystemAssignment
}

export async function removeAssignment(objectId: string, assignmentId: string): Promise<void> {
  await api.delete(`/objects/${objectId}/assignments/${assignmentId}`)
}
