import { describe, it, expect } from 'vitest'
import {
  SvodRowSchema,
  ObjectSummarySchema,
  AggregationDivisionSchema,
  AggregationCompanySchema,
  AggregationBranchSchema,
  CoverageGapSchema,
} from '../types/m02'

describe('Svod and aggregation Zod schemas', () => {
  it('SvodRowSchema parses a valid SVOD row', () => {
    const raw = {
      objectId: '550e8400-e29b-41d4-a716-446655440000',
      objectName: 'Brest Archive',
      address: 'Moskovskaya St., 202D',
      divisionName: 'Brest',
      branchName: 'Branch 1',
      osMonthlyAvg: 0.123456,
      psMonthlyAvg: 0.0,
      videoMonthlyAvg: 0.0,
      recordsMonthly: 0.05,
      repairNoTravelMonthly: 0.01,
      repairWithTravelMonthly: 0.02,
      roundTripMin: 40.0,
      pzvMinutes: 20.0,
      totalNoTravelMin: 1.5,
      itogoChisloNoTravel: 0.03,
      totalWithTravelMin: 2.0,
      itogoChisloWithTravel: 0.032327,
      r1PerVisitTotal: 0.5,
      r2PerVisitTotal: 0.3,
      computedAt: '2026-03-30T12:00:00Z',
    }
    const result = SvodRowSchema.parse(raw)
    expect(result.itogoChisloWithTravel).toBeCloseTo(0.032327, 6)
    expect(result.engineers).toHaveLength(0) // default empty array when absent
  })

  it('ObjectSummarySchema parses all summary fields', () => {
    const raw = {
      objectId: '550e8400-e29b-41d4-a716-446655440000',
      osR1PerVisit: 0.1,
      osR2PerVisit: 0.2,
      psR1PerVisit: 0.0,
      psR2PerVisit: 0.0,
      videoR1PerVisit: 0.0,
      videoR2PerVisit: 0.0,
      r1PerVisitTotal: 0.1,
      r2PerVisitTotal: 0.2,
      osMonthlyAvg: 0.5,
      psMonthlyAvg: 0.0,
      videoMonthlyAvg: 0.0,
      recordsMonthly: 0.03,
      repairNoTravelMonthly: 0.01,
      repairWithTravelMonthly: 0.02,
      roundTripMin: 40.0,
      pzvMinutes: 20.0,
      totalNoTravelMin: 1.0,
      itogoChisloNoTravel: 0.02,
      totalWithTravelMin: 2.0,
      itogoChisloWithTravel: 0.03,
      computedAt: '2026-03-30T12:00:00Z',
    }
    const result = ObjectSummarySchema.parse(raw)
    expect(result.osMonthlyAvg).toBe(0.5)
  })

  it('AggregationCompanySchema parses company-wide totals', () => {
    const raw = {
      requiredFte: 45.123,
      staffingNeed: 2.5,
      objectCount: 2935,
      divisionCount: 7,
      breakdown: { os: 10.1, ps: 5.2, video: 3.3, records: 1.1, repair: 0.9 },
    }
    expect(AggregationCompanySchema.parse(raw).requiredFte).toBeCloseTo(45.123)
  })

  it('AggregationDivisionSchema parses a division summary', () => {
    const raw = {
      divisionId: '550e8400-e29b-41d4-a716-446655440000',
      divisionName: 'Brest',
      objectCount: 245,
      requiredFte: 12.5,
      staffingNeed: 1.0,
      uncoveredLoad: 0.5,
      coverageGapCount: 12,
      engineersTotal: 8,
      engineersOverloaded: 2,
      engineersWarning: 1,
      breakdown: { os: 5.0, ps: 2.5, video: 1.5, records: 0.5, repair: 0.3 },
    }
    const result = AggregationDivisionSchema.parse(raw)
    expect(result.coverageGapCount).toBe(12)
  })

  it('CoverageGapSchema parses an uncovered object', () => {
    const raw = {
      objectId: '550e8400-e29b-41d4-a716-446655440000',
      objectName: 'Infokiosk',
      divisionName: 'Brest',
      branchName: 'Branch 1',
      itogoChisloWithTravel: 0.008,
    }
    const result = CoverageGapSchema.parse(raw)
    expect(result.itogoChisloWithTravel).toBeCloseTo(0.008)
  })

  it('AggregationBranchSchema parses a branch aggregation row', () => {
    const raw = {
      branchId: '550e8400-e29b-41d4-a716-446655440000',
      branchName: 'Branch 1',
      divisionId: '660e8400-e29b-41d4-a716-446655440000',
      divisionName: 'Brest',
      requiredFte: 3.75,
      staffingNeed: 0.25,
      objectCount: 42,
      engineersTotal: 5,
      engineersOverloaded: 1,
      engineersWarning: 2,
      breakdown: { os: 2.0, ps: 1.0, video: 0.5, records: 0.1, repair: 0.05 },
    }
    const result = AggregationBranchSchema.parse(raw)
    expect(result.objectCount).toBe(42)
    expect(result.engineersTotal).toBe(5)
  })
})
