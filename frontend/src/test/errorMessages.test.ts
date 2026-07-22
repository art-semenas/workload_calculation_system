import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractApiError, handleFormError } from '../utils/errorMessages'
import { useNotificationStore } from '../stores/notificationStore'

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

describe('handleFormError', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] })
  })

  function toasts() {
    return useNotificationStore.getState().notifications
  }

  function apiError(code: number, message: string) {
    return { isAxiosError: true, response: { status: code, data: { error: { code, message } } } }
  }

  it('shows 422 inline and does not toast', () => {
    const setInlineError = vi.fn()
    handleFormError(apiError(422, 'Name too short'), setInlineError)

    expect(setInlineError).toHaveBeenCalledWith('Name too short')
    expect(toasts()).toHaveLength(0)
  })

  it('toasts 422 when the caller has no inline slot', () => {
    handleFormError(apiError(422, 'Name too short'))

    expect(toasts()).toEqual([expect.objectContaining({ message: 'Name too short' })])
  })

  it('shows 409 as a warning toast, never inline', () => {
    const setInlineError = vi.fn()
    handleFormError(apiError(409, 'Division name already exists'), setInlineError)

    expect(setInlineError).not.toHaveBeenCalled()
    expect(toasts()).toEqual([
      expect.objectContaining({ message: 'Division name already exists', severity: 'warning' }),
    ])
  })

  it('rewrites 404 to a refresh hint', () => {
    handleFormError(apiError(404, 'Object not found'))

    expect(toasts()).toEqual([
      expect.objectContaining({
        message: 'This item no longer exists. Refresh the page.',
        severity: 'error',
      }),
    ])
  })

  it('toasts other 4xx as errors', () => {
    handleFormError(apiError(400, 'Malformed request'))

    expect(toasts()).toEqual([
      expect.objectContaining({ message: 'Malformed request', severity: 'error' }),
    ])
  })

  it('stays silent for 401 — the interceptor redirects to /login', () => {
    handleFormError(apiError(401, 'Invalid or expired authentication token'))

    expect(toasts()).toHaveLength(0)
  })

  it('stays silent for 5xx and network errors already toasted by the interceptor', () => {
    handleFormError(apiError(500, 'Database unavailable'))
    handleFormError({ isAxiosError: true, request: {} })

    expect(toasts()).toHaveLength(0)
  })

  it('reports non-Axios errors instead of swallowing them', () => {
    const setInlineError = vi.fn()
    handleFormError(new Error('reading property of undefined'), setInlineError)

    expect(setInlineError).toHaveBeenCalledWith('Something went wrong. Please try again.')
  })

  it('toasts non-Axios errors when the caller has no inline slot', () => {
    handleFormError(new Error('reading property of undefined'))

    expect(toasts()).toEqual([
      expect.objectContaining({
        message: 'Something went wrong. Please try again.',
        severity: 'error',
      }),
    ])
  })
})
