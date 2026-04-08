import { z } from 'zod'

export const ObjectRepairSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  repairTypeId: z.string().uuid(),
  repairTypeName: z.string(),
  count: z.number().int().min(0),
})

export const RepairUpdateSchema = z.object({
  count: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v) ? undefined : v),
    z
      .number({ required_error: 'Must be a whole number', invalid_type_error: 'Enter a number' })
      .int('Must be a whole number')
      .min(0, 'Must be ≥ 0')
  ),
})

export type ObjectRepair = z.infer<typeof ObjectRepairSchema>
export type RepairUpdate = z.infer<typeof RepairUpdateSchema>
