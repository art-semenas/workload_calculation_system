import { describe, expect, it } from 'vitest'
import { extractErrorCode } from '../utils/errorMessages'

describe('extractErrorCode', () => {
  it('returns the error code from a structured Axios error', () => {
    const err = {
      response: { data: { error: { code: 'DEVICE_NOT_IN_INVENTORY' } } },
    }
    expect(extractErrorCode(err)).toBe('DEVICE_NOT_IN_INVENTORY')
  })

  it('returns undefined when response is missing', () => {
    expect(extractErrorCode(new Error('network error'))).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(extractErrorCode(null)).toBeUndefined()
  })

  it('returns undefined when error code is missing from response', () => {
    const err = { response: { data: {} } }
    expect(extractErrorCode(err)).toBeUndefined()
  })
})
