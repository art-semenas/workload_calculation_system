import { z } from 'zod'

export const ObjectRepairSchema = z.object({
  id: z.string().uuid(),
  objectId: z.string().uuid(),
  repairTypeId: z.string().uuid(),
  repairTypeName: z.string(),
  count: z.number().int().min(0),
})

export const RepairUpdateSchema = z.object({
  count: z.number().int().min(0),
})

export type ObjectRepair = z.infer<typeof ObjectRepairSchema>
export type RepairUpdate = z.infer<typeof RepairUpdateSchema>
