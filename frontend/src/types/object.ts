import { z } from 'zod'

export const ObjectRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  branchId: z.string().uuid(),
  branchName: z.string().optional(),
  divisionName: z.string().optional(),
  address: z.string().optional(),
  importSeqNo: z.number().int().nullish(),
  itogoChisloWithTravel: z.number().nullable().optional(),
  engineerCount: z.number().int().nullable().optional(),
  divisionId: z.string().uuid().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const ObjectCreateSchema = z.object({
  name: z.string().min(1),
  branchId: z.string().uuid(),
  address: z.string().optional(),
})

export const ObjectUpdateSchema = z.object({
  name: z.string().min(1),
  branchId: z.string().uuid(),
  address: z.string().optional(),
})

export type ObjectRecord = z.infer<typeof ObjectRecordSchema>
export type ObjectCreate = z.infer<typeof ObjectCreateSchema>
export type ObjectUpdate = z.infer<typeof ObjectUpdateSchema>
