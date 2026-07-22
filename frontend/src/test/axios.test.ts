import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import api, { notifyResponseError } from '../api/axios'
import { useNotificationStore } from '../stores/notificationStore'
import { useAuthStore } from '../stores/authStore'

describe('api instance', () => {
  // AC-FE-05: a hung backend must fail within 30s, not wait forever.
  it('times out requests after 30 seconds', () => {
    expect(api.defaults.timeout).toBe(30_000)
  })
})

// These drive a real request through the instance, so they fail if the response
// interceptor is ever unregistered — unlike calling notifyResponseError directly.
describe('response interceptor wiring', () => {
  const realAdapter = api.defaults.adapter

  // A custom adapter owns rejection: axios only calls settle() in its built-in ones.
  function respondWith(status: number, data: unknown) {
    api.defaults.adapter = ((config) =>
      Promise.reject(
        new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, {
          data,
          status,
          statusText: '',
          headers: {},
          config,
        } as AxiosResponse)
      )) as typeof api.defaults.adapter
  }

  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], suppressed: [] })
    useAuthStore.getState().logout()
  })

  afterEach(() => {
    api.defaults.adapter = realAdapter
  })

  it('toasts a 5xx that travels through the instance', async () => {
    respondWith(500, { data: null, meta: null, error: { code: 500, message: 'Database down' } })

    await expect(api.get('/objects')).rejects.toBeDefined()

    expect(useNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({ message: 'Database down', severity: 'error' }),
    ])
  })

  it('does not toast a 4xx that travels through the instance', async () => {
    respondWith(409, { data: null, meta: null, error: { code: 409, message: 'Already exists' } })

    await expect(api.post('/divisions', { name: 'Brest' })).rejects.toBeDefined()

    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('does not toast a 401 — the redirect handles it', async () => {
    useAuthStore.getState().login('token', {
      id: '1',
      email: 'admin@workload.local',
      name: 'Admin',
      role: 'admin',
    })
    respondWith(401, { data: null, meta: null, error: { code: 401, message: 'Token expired' } })

    await expect(api.get('/objects')).rejects.toBeDefined()

    expect(useNotificationStore.getState().notifications).toHaveLength(0)
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('notifyResponseError', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] })
  })

  it('shows a network error toast for a timed-out request', () => {
    notifyResponseError({ isAxiosError: true, code: 'ECONNABORTED', config: {}, request: {} })

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message).toBe(
      'Network error. Please check your connection and try again.'
    )
  })

  it('shows a network error toast when there is no response', () => {
    notifyResponseError({ isAxiosError: true, config: {}, request: {} })

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message).toBe(
      'Network error. Please check your connection and try again.'
    )
    expect(notifications[0].severity).toBe('error')
  })

  it('shows the server message as an error toast for 5xx', () => {
    notifyResponseError({
      isAxiosError: true,
      response: { status: 500, data: { error: { code: 500, message: 'Database unavailable' } } },
    })

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message).toBe('Database unavailable')
    expect(notifications[0].severity).toBe('error')
  })

  it('falls back to a generic message for 5xx without an error body', () => {
    notifyResponseError({ isAxiosError: true, response: { status: 502, data: null } })

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message).toBe('An unexpected error occurred.')
  })

  it('does not toast 4xx errors — callers handle them', () => {
    notifyResponseError({
      isAxiosError: true,
      response: { status: 409, data: { error: { code: 409, message: 'Already exists' } } },
    })
    notifyResponseError({
      isAxiosError: true,
      response: { status: 422, data: { error: { code: 422, message: 'Validation failed' } } },
    })
    notifyResponseError({ isAxiosError: true, response: { status: 404, data: null } })

    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('does not toast non-axios errors', () => {
    notifyResponseError(new Error('boom'))

    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })
})
