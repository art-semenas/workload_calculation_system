import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  SvodRowSchema,
  ObjectSummarySchema,
  AggregationDivisionSchema,
  AggregationCompanySchema,
  CoverageGapSchema,
} from '../types/m02'

describe('M-02 Zod schemas', () => {
  it('SvodRowSchema parses a valid SVOD row', () => {
    const raw = {
      object_id: '550e8400-e29b-41d4-a716-446655440000',
      object_name: 'Brest Archive',
      address: 'Moskovskaya St., 202D',
      division_name: 'Brest',
      branch_name: 'Branch 1',
      import_seq_no: 1,
      engineers: ['Ivanov P.S.'],
      os_monthly_avg: 0.123456,
      ps_monthly_avg: 0.0,
      video_monthly_avg: 0.0,
      records_monthly: 0.05,
      repair_no_travel_monthly: 0.01,
      repair_with_travel_monthly: 0.02,
      round_trip_min: 40.0,
      pzv_minutes: 20.0,
      total_no_travel_min: 1.5,
      itogo_chislo_no_travel: 0.03,
      total_with_travel_min: 2.0,
      itogo_chislo_with_travel: 0.032327,
      r1_per_visit_total: 0.5,
      r2_per_visit_total: 0.3,
      computed_at: '2026-03-30T12:00:00Z',
    }
    const result = SvodRowSchema.parse(raw)
    expect(result.itogo_chislo_with_travel).toBeCloseTo(0.032327, 6)
    expect(result.engineers).toHaveLength(1)
  })

  it('ObjectSummarySchema parses all 19 summary fields', () => {
    const raw = {
      object_id: '550e8400-e29b-41d4-a716-446655440000',
      os_r1_per_visit: 0.1,
      os_r2_per_visit: 0.2,
      ps_r1_per_visit: 0.0,
      ps_r2_per_visit: 0.0,
      video_r1_per_visit: 0.0,
      video_r2_per_visit: 0.0,
      r1_per_visit_total: 0.1,
      r2_per_visit_total: 0.2,
      os_monthly_avg: 0.5,
      ps_monthly_avg: 0.0,
      video_monthly_avg: 0.0,
      records_monthly: 0.03,
      repair_no_travel_monthly: 0.01,
      repair_with_travel_monthly: 0.02,
      round_trip_min: 40.0,
      pzv_minutes: 20.0,
      total_no_travel_min: 1.0,
      itogo_chislo_no_travel: 0.02,
      total_with_travel_min: 2.0,
      itogo_chislo_with_travel: 0.03,
      computed_at: '2026-03-30T12:00:00Z',
    }
    const result = ObjectSummarySchema.parse(raw)
    expect(result.os_monthly_avg).toBe(0.5)
  })

  it('AggregationCompanySchema parses company-wide totals', () => {
    const raw = {
      total_fte: 45.123,
      total_objects: 2935,
      division_count: 7,
    }
    expect(AggregationCompanySchema.parse(raw).total_fte).toBeCloseTo(45.123)
  })

  it('AggregationDivisionSchema parses a division summary', () => {
    const raw = {
      division_id: '550e8400-e29b-41d4-a716-446655440000',
      division_name: 'Brest',
      total_fte: 12.5,
      object_count: 245,
      gap_count: 12,
    }
    const result = AggregationDivisionSchema.parse(raw)
    expect(result.gap_count).toBe(12)
  })

  it('CoverageGapSchema parses an uncovered object', () => {
    const raw = {
      object_id: '550e8400-e29b-41d4-a716-446655440000',
      object_name: 'Infokiosk',
      division_name: 'Brest',
      branch_name: 'Branch 1',
      itogo_chislo_with_travel: 0.008,
    }
    const result = CoverageGapSchema.parse(raw)
    expect(result.itogo_chislo_with_travel).toBeCloseTo(0.008)
  })
})
