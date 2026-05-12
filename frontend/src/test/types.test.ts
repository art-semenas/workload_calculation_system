import { describe, it, expect } from 'vitest'
import { LoginRequestSchema } from '../types/auth'
import { DivisionCreateSchema, DivisionSchema } from '../types/division'
import { TravelUpdateSchema } from '../types/travel'
import { RepairUpdateSchema } from '../types/repairs'
import { RecordsUpdateSchema } from '../types/records'

describe('Zod schemas', () => {
  it('LoginRequestSchema rejects empty email', () => {
    const result = LoginRequestSchema.safeParse({ email: '', password: 'x' })
    expect(result.success).toBe(false)
  })

  it('LoginRequestSchema accepts valid input', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'admin@workload.local',
      password: 'secret',
    })
    expect(result.success).toBe(true)
  })

  it('DivisionSchema parses camelCase field names matching other API DTOs', () => {
    const result = DivisionSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Brest',
      branchCount: 3,
      objectCount: 5,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.branchCount).toBe(3)
      expect(result.data.objectCount).toBe(5)
    }
  })

  it('DivisionCreateSchema rejects empty name', () => {
    const result = DivisionCreateSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('TravelUpdateSchema rejects negative distance', () => {
    const result = TravelUpdateSchema.safeParse({
      transportType: 'car',
      distanceKm: -1,
      oneWayTimeMin: 10,
    })
    expect(result.success).toBe(false)
  })

  it('TravelUpdateSchema accepts valid input', () => {
    const result = TravelUpdateSchema.safeParse({
      transportType: 'car',
      distanceKm: 15.5,
      oneWayTimeMin: 20,
    })
    expect(result.success).toBe(true)
  })

  it("RepairUpdateSchema error is 'Must be a whole number' for NaN input", () => {
    const result = RepairUpdateSchema.safeParse({ count: NaN })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Must be a whole number')
  })

  it("RecordsUpdateSchema error is 'Must be a whole number' for NaN accessRequests", () => {
    const result = RecordsUpdateSchema.safeParse({
      accessRequests: NaN,
      monitoringRequests: 0,
      footageRequests: 0,
      backupControl: 0,
      securityAdmin: 0,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Must be a whole number')
  })

  it("TravelUpdateSchema error is 'Enter a valid number' for NaN distanceKm", () => {
    const result = TravelUpdateSchema.safeParse({
      transportType: 'car',
      distanceKm: NaN,
      oneWayTimeMin: 10,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Enter a valid number')
  })
})
