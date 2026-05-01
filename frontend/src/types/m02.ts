import { z } from 'zod'

// --- Summary row (matches GET /svod response — SvodRowDto, 17 numeric columns) ---

export const SvodRowSchema = z.object({
  objectId: z.string().uuid(),
  objectName: z.string(),
  address: z.string().nullable().optional(),
  divisionName: z.string(),
  branchName: z.string(),
  // engineers and importSeqNo are not in SvodRowDto (engineers assigned in M-03)
  engineers: z.array(z.string()).optional().default([]),
  osMonthlyAvg: z.number(),
  psMonthlyAvg: z.number(),
  videoMonthlyAvg: z.number(),
  recordsMonthly: z.number(),
  repairNoTravelMonthly: z.number(),
  repairWithTravelMonthly: z.number(),
  roundTripMin: z.number(),
  pzvMinutes: z.number(),
  totalNoTravelMin: z.number(),
  itogoChisloNoTravel: z.number(),
  totalWithTravelMin: z.number(),
  itogoChisloWithTravel: z.number(),
  r1PerVisitTotal: z.number(),
  r2PerVisitTotal: z.number(),
  computedAt: z.string().nullable(),
})
export type SvodRow = z.infer<typeof SvodRowSchema>

// --- Paginated SVOD response (Spring Page<SvodRowDto> JSON shape) ---

export const SvodPageSchema = z.object({
  content: z.array(SvodRowSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number(), // Spring Page uses "number" for the current page index
  size: z.number(),
})
export type SvodPage = z.infer<typeof SvodPageSchema>

// --- Object summary (GET /objects/:id/summary — SummaryDto) ---

export const ObjectSummarySchema = z.object({
  objectId: z.string().uuid(),
  osR1PerVisit: z.number(),
  osR2PerVisit: z.number(),
  psR1PerVisit: z.number(),
  psR2PerVisit: z.number(),
  videoR1PerVisit: z.number(),
  videoR2PerVisit: z.number(),
  r1PerVisitTotal: z.number(),
  r2PerVisitTotal: z.number(),
  osMonthlyAvg: z.number(),
  psMonthlyAvg: z.number(),
  videoMonthlyAvg: z.number(),
  recordsMonthly: z.number(),
  repairNoTravelMonthly: z.number(),
  repairWithTravelMonthly: z.number(),
  roundTripMin: z.number(),
  pzvMinutes: z.number(),
  totalNoTravelMin: z.number(),
  itogoChisloNoTravel: z.number(),
  totalWithTravelMin: z.number(),
  itogoChisloWithTravel: z.number(),
  computedAt: z.string().nullable(),
})
export type ObjectSummary = z.infer<typeof ObjectSummarySchema>

// --- Component breakdown (ComponentBreakdownDto) ---

export const ComponentBreakdownSchema = z.object({
  os: z.number(),
  ps: z.number(),
  video: z.number(),
  records: z.number(),
  repair: z.number(),
})
export type ComponentBreakdown = z.infer<typeof ComponentBreakdownSchema>

// --- Aggregation: company level (AggregationCompanyDto) ---

export const AggregationCompanySchema = z.object({
  requiredFte: z.number(),
  staffingNeed: z.number(),
  objectCount: z.number(),
  divisionCount: z.number(),
  breakdown: ComponentBreakdownSchema,
})
export type AggregationCompany = z.infer<typeof AggregationCompanySchema>

// --- Aggregation: division level (AggregationDivisionDto) ---

export const AggregationDivisionSchema = z.object({
  divisionId: z.string().uuid(),
  divisionName: z.string(),
  objectCount: z.number(),
  requiredFte: z.number(),
  staffingNeed: z.number(),
  uncoveredLoad: z.number(),
  coverageGapCount: z.number(),
  engineersTotal: z.number(),
  engineersOverloaded: z.number(),
  engineersWarning: z.number(),
  breakdown: ComponentBreakdownSchema,
})
export type AggregationDivision = z.infer<typeof AggregationDivisionSchema>

// --- Aggregation: branch level (AggregationBranchDto) ---

export const AggregationBranchSchema = z.object({
  branchId: z.string().uuid(),
  branchName: z.string(),
  divisionId: z.string().uuid(),
  divisionName: z.string(),
  objectCount: z.number(),
  requiredFte: z.number(),
  staffingNeed: z.number(),
  engineersTotal: z.number(),
  engineersOverloaded: z.number(),
  engineersWarning: z.number(),
  breakdown: ComponentBreakdownSchema,
})
export type AggregationBranch = z.infer<typeof AggregationBranchSchema>

// --- Coverage gap — objects with no assigned engineer (CoverageGapDto) ---

export const CoverageGapSchema = z.object({
  objectId: z.string().uuid(),
  objectName: z.string(),
  address: z.string().nullable().optional(),
  divisionName: z.string(),
  branchName: z.string(),
  itogoChisloWithTravel: z.number(),
})
export type CoverageGap = z.infer<typeof CoverageGapSchema>
