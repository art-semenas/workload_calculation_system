import { describe, it, expect } from 'vitest'
import { LoginRequestSchema } from '../types/auth'
import { DivisionCreateSchema } from '../types/division'
import { TravelUpdateSchema } from '../types/travel'

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
})
