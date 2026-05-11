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

export const DivisionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  branchCount: z.number().int(),
  objectCount: z.number().int(),
  engineerCount: z.number().int().nullable().optional(),
  requiredFte: z.number().nullable().optional(),
  unassignedObjectCount: z.number().int().nullable().optional(),
  utilisation: z.number().nullable().optional(),
})

export const DivisionDetailSchema = DivisionSchema.extend({
  branches: z.array(BranchSchema).optional().default([]),
})

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
