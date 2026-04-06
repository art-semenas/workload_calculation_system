import { useQuery } from '@tanstack/react-query'
import {
  getCatalogDeviceContexts,
  getCatalogDevices,
  getCatalogRepairs,
} from '../api/catalog'

export function useCatalogDevices() {
  return useQuery({
    queryKey: ['catalog', 'devices'],
    queryFn: getCatalogDevices,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useCatalogDeviceContexts(deviceTypeId: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'devices', deviceTypeId, 'contexts'],
    queryFn: () => getCatalogDeviceContexts(deviceTypeId as string),
    enabled: !!deviceTypeId,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useCatalogRepairs() {
  return useQuery({
    queryKey: ['catalog', 'repairs'],
    queryFn: getCatalogRepairs,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
