import { z } from 'zod'

export const SystemTypeSchema = z.enum(['OS', 'PS', 'VIDEO'])

export const ObjectDeviceSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  deviceTypeId: z.string().uuid(),
  deviceTypeName: z.string(),
  quantityPhysical: z.number().int(),
})

export const ObjectSystemAssignmentSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  deviceTypeId: z.string().uuid(),
  deviceTypeName: z.string(),
  systemType: SystemTypeSchema,
  quantityMaintained: z.number().int(),
  r1Minutes: z.number(),
  r2Minutes: z.number(),
})

export const DeviceAddSchema = z.object({
  deviceTypeId: z.string().uuid(),
  quantityPhysical: z.number().int().min(1),
})

export const AssignmentCreateSchema = z.object({
  deviceTypeId: z.string().uuid(),
  systemType: SystemTypeSchema,
  quantityMaintained: z.number().int().min(0),
})

export const AssignmentUpdateSchema = z.object({
  quantityMaintained: z.number().int().min(0),
})

export type SystemType = z.infer<typeof SystemTypeSchema>
export type ObjectDevice = z.infer<typeof ObjectDeviceSchema>
export type ObjectSystemAssignment = z.infer<typeof ObjectSystemAssignmentSchema>
export type DeviceAdd = z.infer<typeof DeviceAddSchema>
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>
export type AssignmentUpdate = z.infer<typeof AssignmentUpdateSchema>
