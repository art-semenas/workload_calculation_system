import { z } from 'zod'

const NonNegativeIntSchema = z.preprocess(
  (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
  z
    .number({ required_error: 'Must be a whole number', invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(0, 'Must be ≥ 0')
)

export const RecordsTaskSchema = z.object({
  id: z.string().uuid().optional(),
  objectId: z.string().uuid(),
  accessRequests: z.number().int().min(0),
  monitoringRequests: z.number().int().min(0),
  footageRequests: z.number().int().min(0),
  backupControl: z.number().int().min(0),
  securityAdmin: z.number().int().min(0),
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
