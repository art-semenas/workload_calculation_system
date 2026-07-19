import { describe, expect, it } from 'vitest'
import { extractApiError, mapEquipmentError, mapSaveError } from '../utils/errorMessages'

describe('extractApiError', () => {
  it('extracts numeric code and message', () => {
    const err = {
      response: {
        data: { error: { code: 422, message: 'Device not found in inventory for this object' } },
      },
    }
    expect(extractApiError(err)).toEqual({
      code: 422,
      message: 'Device not found in inventory for this object',
    })
  })

  it('returns undefined for non-API errors', () => {
    expect(extractApiError(new Error('network'))).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(extractApiError(null)).toBeUndefined()
  })

  it('returns undefined when the error body is missing', () => {
    expect(extractApiError({ response: { data: {} } })).toBeUndefined()
  })

  it('returns undefined for the old string-code contract', () => {
    const err = {
      response: { data: { error: { code: 'DEVICE_NOT_IN_INVENTORY', message: 'msg' } } },
    }
    expect(extractApiError(err)).toBeUndefined()
  })
})

describe('mapEquipmentError', () => {
  it('shows the server message directly', () => {
    expect(
      mapEquipmentError({ code: 422, message: 'Device not found in inventory for this object' })
    ).toBe('Device not found in inventory for this object')
  })

  it('falls back to a generic message', () => {
    expect(mapEquipmentError(undefined)).toBe('An unexpected error occurred.')
  })
})

describe('mapSaveError', () => {
  it('prefers the server message when present', () => {
    expect(
      mapSaveError({
        code: 422,
        message: 'Round trip time is auto-calculated and cannot be edited directly',
      })
    ).toBe('Round trip time is auto-calculated and cannot be edited directly')
  })

  it('maps 404 to a refresh hint', () => {
    expect(mapSaveError({ code: 404, message: 'Object not found' })).toBe(
      'Object no longer exists. Refresh the page.'
    )
  })

  it('falls back to a generic message', () => {
    expect(mapSaveError(undefined)).toBe('Failed to save. Please try again.')
  })
})
