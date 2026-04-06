import { z } from 'zod'

const NonNegativeIntSchema = z.number().int().min(0)

export const RecordsTaskSchema = z.object({
  id: z.string().uuid().optional(),
  objectId: z.string().uuid(),
  accessRequests: NonNegativeIntSchema,
  monitoringRequests: NonNegativeIntSchema,
  footageRequests: NonNegativeIntSchema,
  backupControl: NonNegativeIntSchema,
  securityAdmin: NonNegativeIntSchema,
})

export const RecordsUpdateSchema = z.object({
  accessRequests: NonNegativeIntSchema,
  monitoringRequests: NonNegativeIntSchema,
  footageRequests: NonNegativeIntSchema,
  backupControl: NonNegativeIntSchema,
  securityAdmin: NonNegativeIntSchema,
})

export type RecordsTask = z.infer<typeof RecordsTaskSchema>
export type RecordsUpdate = z.infer<typeof RecordsUpdateSchema>
