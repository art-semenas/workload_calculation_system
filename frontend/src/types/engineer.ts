import { z } from 'zod'

// --- Engineer status enum (matches backend EngineerSummary.status — uppercase from mapper) ---

export const EngineerStatusEnum = z.enum(['NORMAL', 'WARNING', 'OVERLOADED'])
export type EngineerStatus = z.infer<typeof EngineerStatusEnum>

// --- Engineer (list/detail response from GET /engineers, GET /engineers/:id) ---

export const EngineerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  homeDivisionId: z.string().uuid().nullable(),
  homeDivisionName: z.string().nullable().optional(),
  capacityFte: z.number(),
  isActive: z.boolean(),
  employeeId: z.string().nullable().optional(),
  objectCount: z.number().int().nullable().optional(),
  totalLoad: z.number().nullable().optional(),
  loadRatio: z.number().nullable().optional(),
  status: EngineerStatusEnum.nullable().optional(),
  createdAt: z.string().optional(),
})
export type Engineer = z.infer<typeof EngineerSchema>

// --- Engineer summary (GET /engineers/:id/summary) ---

export const EngineerSummarySchema = z.object({
  engineerId: z.string().uuid(),
  totalLoad: z.number(),
  objectCount: z.number().int(),
  osLoad: z.number(),
  psLoad: z.number(),
  videoLoad: z.number(),
  recordsLoad: z.number(),
  repairLoad: z.number(),
  capacityFte: z.number(),
  loadRatio: z.number(),
  status: EngineerStatusEnum,
  computedAt: z.string().nullable().optional(),
})
export type EngineerSummary = z.infer<typeof EngineerSummarySchema>

// --- Engineer share per object (GET /engineers/:id/objects) ---

export const EngineerShareSchema = z.object({
  objectId: z.string().uuid(),
  objectName: z.string(),
  divisionName: z.string().optional(),
  branchName: z.string().optional(),
  engineerShare: z.number(),
  itogoChisloWithTravel: z.number(),
  engineerCount: z.number().int(),
  assignedAt: z.string().optional(),
})
export type EngineerShare = z.infer<typeof EngineerShareSchema>

// --- Object engineer row (GET /objects/:id/engineers — engineer assigned to an object) ---

export const ObjectEngineerRowSchema = z.object({
  engineerId: z.string().uuid(),
  engineerName: z.string(),
  objectShare: z.number(),
  loadRatio: z.number(),
  totalLoad: z.number().optional(),
  capacityFte: z.number().optional(),
  assignedAt: z.string().optional(),
  status: EngineerStatusEnum,
})
export type ObjectEngineerRow = z.infer<typeof ObjectEngineerRowSchema>

// --- Create engineer form schema ---

export const EngineerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  capacityFte: z.number().positive('Capacity must be > 0'),
  homeDivisionId: z.string().uuid('Select a division'),
})
export type EngineerCreateRequest = z.infer<typeof EngineerCreateSchema>

// --- Update engineer form schema (partial — all optional) ---

export const EngineerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  capacityFte: z.number().positive().optional(),
  homeDivisionId: z.string().uuid().optional(),
})
export type EngineerUpdateRequest = z.infer<typeof EngineerUpdateSchema>
