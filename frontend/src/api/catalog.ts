import api from './axios'
import type { ApiResponse } from '../types/api'
import { DeviceSystemContextSchema, DeviceTypeSchema, RepairTypeSchema } from '../types/catalog'

export async function getCatalogDevices() {
  const response = await api.get<ApiResponse<unknown>>('/catalog/devices')
  return DeviceTypeSchema.array().parse(response.data.data)
}

export async function getCatalogDevice(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/catalog/devices/${id}`)
  return DeviceTypeSchema.parse(response.data.data)
}

export async function getCatalogDeviceContexts(deviceTypeId: string) {
  const response = await api.get<ApiResponse<unknown>>(`/catalog/devices/${deviceTypeId}/contexts`)
  return DeviceSystemContextSchema.array().parse(response.data.data)
}

export async function getCatalogRepairs() {
  const response = await api.get<ApiResponse<unknown>>('/catalog/repairs')
  return RepairTypeSchema.array().parse(response.data.data)
}
