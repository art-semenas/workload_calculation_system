import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { ApiResponseSchema } from '../types/api'

describe('ApiResponseSchema', () => {
  it('parses a success envelope', () => {
    const raw = { data: { id: '123' }, meta: null, error: null }
    const result = ApiResponseSchema(z.object({ id: z.string() })).parse(raw)
    expect(result.data?.id).toBe('123')
  })

  it('parses an error envelope', () => {
    const raw = { data: null, meta: null, error: { code: 'NOT_FOUND', message: 'not found' } }
    const result = ApiResponseSchema(z.null()).parse(raw)
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
