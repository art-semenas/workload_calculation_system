import { z } from 'zod'

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

// Internal schema matching the actual backend snake_case JSON keys from DivisionDto
const DivisionRawSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  branch_count: z.number().int(),
  object_count: z.number().int(),
})

export const DivisionSchema = DivisionRawSchema.transform((d) => ({
  id: d.id,
  name: d.name,
  branchCount: d.branch_count,
  objectCount: d.object_count,
}))

export const DivisionDetailSchema = DivisionRawSchema.extend({
  branches: z.array(BranchSchema).optional().default([]),
}).transform((d) => ({
  id: d.id,
  name: d.name,
  branchCount: d.branch_count,
  objectCount: d.object_count,
  branches: d.branches,
}))

// BranchDetailSchema matches the actual BranchDto response (no embedded objects)
export const BranchDetailSchema = BranchSchema

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
