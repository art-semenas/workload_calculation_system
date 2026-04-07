import api from './axios'
import type { ApiResponse } from '../types/api'
import type { DeviceSystemContext, DeviceType, RepairType } from '../types/catalog'

export async function getCatalogDevices(): Promise<DeviceType[]> {
  const response = await api.get<ApiResponse<DeviceType[]>>('/catalog/devices')
  return response.data.data as DeviceType[]
}

export async function getCatalogDevice(id: string): Promise<DeviceType> {
  const response = await api.get<ApiResponse<DeviceType>>(`/catalog/devices/${id}`)
  return response.data.data as DeviceType
}

export async function getCatalogDeviceContexts(
  deviceTypeId: string
): Promise<DeviceSystemContext[]> {
  const response = await api.get<ApiResponse<DeviceSystemContext[]>>(
    `/catalog/devices/${deviceTypeId}/contexts`
  )
  return response.data.data as DeviceSystemContext[]
}

export async function getCatalogRepairs(): Promise<RepairType[]> {
  const response = await api.get<ApiResponse<RepairType[]>>('/catalog/repairs')
  return response.data.data as RepairType[]
}
