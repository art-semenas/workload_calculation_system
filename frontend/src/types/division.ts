import { z } from 'zod'

const BranchObjectsMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  size: z.number(),
})

export const BranchObjectRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  itogoChisloWithTravel: z.number().nullable(),
  engineerCount: z.number().int(),
})

export const BranchSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  divisionId: z.string().uuid(),
  divisionName: z.string().optional(),
  objectCount: z.number().int(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const DivisionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  branchCount: z.number().int(),
  objectCount: z.number().int(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const DivisionDetailSchema = DivisionSchema.extend({
  branches: z.array(BranchSchema),
})

export const BranchDetailSchema = BranchSchema.extend({
  objects: z.object({
    data: z.array(BranchObjectRowSchema),
    meta: BranchObjectsMetaSchema,
  }),
})

export const DivisionCreateSchema = z.object({
  name: z.string().min(1),
})

export const BranchCreateSchema = z.object({
  name: z.string().min(1),
})

export type Division = z.infer<typeof DivisionSchema>
export type DivisionDetail = z.infer<typeof DivisionDetailSchema>
export type Branch = z.infer<typeof BranchSchema>
export type BranchDetail = z.infer<typeof BranchDetailSchema>
export type BranchObjectRow = z.infer<typeof BranchObjectRowSchema>
export type DivisionCreate = z.infer<typeof DivisionCreateSchema>
export type BranchCreate = z.infer<typeof BranchCreateSchema>
