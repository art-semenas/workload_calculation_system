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
  quantityPhysical: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
    z
      .number({ required_error: 'Must be a whole number', invalid_type_error: 'Enter a number' })
      .int('Must be a whole number')
      .min(1, 'Must be ≥ 1')
  ),
})

export const AssignmentCreateSchema = z.object({
  deviceTypeId: z.string().uuid(),
  systemType: SystemTypeSchema,
  quantityMaintained: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
    z
      .number({ required_error: 'Must be a whole number', invalid_type_error: 'Enter a number' })
      .int('Must be a whole number')
      .min(0, 'Must be ≥ 0')
  ),
})

export const AssignmentUpdateSchema = z.object({
  quantityMaintained: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
    z
      .number({ required_error: 'Must be a whole number', invalid_type_error: 'Enter a number' })
      .int('Must be a whole number')
      .min(0, 'Must be ≥ 0')
  ),
})

export type SystemType = z.infer<typeof SystemTypeSchema>
export type ObjectDevice = z.infer<typeof ObjectDeviceSchema>
export type ObjectSystemAssignment = z.infer<typeof ObjectSystemAssignmentSchema>
export type DeviceAdd = z.infer<typeof DeviceAddSchema>
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>
export type AssignmentUpdate = z.infer<typeof AssignmentUpdateSchema>
