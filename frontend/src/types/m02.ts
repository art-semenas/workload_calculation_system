import { z } from 'zod'

// --- Summary row (matches GET /svod response, ui-spec.md §7.9 — all 19 columns) ---

export const SvodRowSchema = z.object({
  object_id: z.string().uuid(),
  object_name: z.string(),
  address: z.string().optional(),
  division_name: z.string(),
  branch_name: z.string(),
  import_seq_no: z.number().nullable().optional(),
  engineers: z.array(z.string()),           // column 5: comma-joined in UI
  os_monthly_avg: z.number(),               // column 10: Security
  ps_monthly_avg: z.number(),               // column 8: Fire Alarm
  video_monthly_avg: z.number(),            // column 9: Video
  records_monthly: z.number(),              // column 11: Records
  repair_no_travel_monthly: z.number(),     // column 12: Repair without Travel
  repair_with_travel_monthly: z.number(),   // column 15: Repair with Travel
  round_trip_min: z.number(),               // column 7: Travel
  pzv_minutes: z.number(),                  // column 6: PZV
  total_no_travel_min: z.number(),          // column 13
  itogo_chislo_no_travel: z.number(),       // column 14: TOTAL Staffing (without travel)
  total_with_travel_min: z.number(),        // column 16
  itogo_chislo_with_travel: z.number(),     // column 17: TOTAL Staffing (with travel)
  r1_per_visit_total: z.number(),           // column 18
  r2_per_visit_total: z.number(),           // column 19
  computed_at: z.string().nullable(),
})
export type SvodRow = z.infer<typeof SvodRowSchema>

// --- Paginated Summary response ---

export const SvodPageSchema = z.object({
  content: z.array(SvodRowSchema),
  total_elements: z.number(),
  total_pages: z.number(),
  page: z.number(),
  size: z.number(),
})
export type SvodPage = z.infer<typeof SvodPageSchema>

// --- Object summary (GET /objects/:id/summary) ---

export const ObjectSummarySchema = z.object({
  object_id: z.string().uuid(),
  os_r1_per_visit: z.number(),
  os_r2_per_visit: z.number(),
  ps_r1_per_visit: z.number(),
  ps_r2_per_visit: z.number(),
  video_r1_per_visit: z.number(),
  video_r2_per_visit: z.number(),
  r1_per_visit_total: z.number(),
  r2_per_visit_total: z.number(),
  os_monthly_avg: z.number(),
  ps_monthly_avg: z.number(),
  video_monthly_avg: z.number(),
  records_monthly: z.number(),
  repair_no_travel_monthly: z.number(),
  repair_with_travel_monthly: z.number(),
  round_trip_min: z.number(),
  pzv_minutes: z.number(),
  total_no_travel_min: z.number(),
  itogo_chislo_no_travel: z.number(),
  total_with_travel_min: z.number(),
  itogo_chislo_with_travel: z.number(),
  computed_at: z.string().nullable(),
})
export type ObjectSummary = z.infer<typeof ObjectSummarySchema>

// --- Aggregation: company level ---

export const AggregationCompanySchema = z.object({
  total_fte: z.number(),
  total_objects: z.number(),
  division_count: z.number(),
})
export type AggregationCompany = z.infer<typeof AggregationCompanySchema>

// --- Aggregation: division level ---

export const AggregationDivisionSchema = z.object({
  division_id: z.string().uuid(),
  division_name: z.string(),
  total_fte: z.number(),
  object_count: z.number(),
  gap_count: z.number(),
})
export type AggregationDivision = z.infer<typeof AggregationDivisionSchema>

// --- Aggregation: branch level ---

export const AggregationBranchSchema = z.object({
  branch_id: z.string().uuid(),
  branch_name: z.string(),
  division_name: z.string(),
  total_fte: z.number(),
  object_count: z.number(),
})
export type AggregationBranch = z.infer<typeof AggregationBranchSchema>

// --- Coverage gap — objects with no assigned engineer ---

export const CoverageGapSchema = z.object({
  object_id: z.string().uuid(),
  object_name: z.string(),
  division_name: z.string(),
  branch_name: z.string(),
  itogo_chislo_with_travel: z.number(),
})
export type CoverageGap = z.infer<typeof CoverageGapSchema>
