import { z } from 'zod'
import { SystemTypeSchema } from './equipment'

export const DeviceTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
})

export const DeviceSystemContextSchema = z.object({
  id: z.string().uuid(),
  deviceTypeId: z.string().uuid(),
  systemType: SystemTypeSchema,
  r1Minutes: z.number(),
  r2Minutes: z.number(),
})

export const RepairTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  timeMinutes: z.number(),
})

export type DeviceType = z.infer<typeof DeviceTypeSchema>
export type DeviceSystemContext = z.infer<typeof DeviceSystemContextSchema>
export type RepairType = z.infer<typeof RepairTypeSchema>
