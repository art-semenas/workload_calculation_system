import { beforeEach, describe, it, expect } from 'vitest'
import { z } from 'zod'
import { shouldRedirectToLogin } from '../api/axios'
import { useAuthStore } from '../store/authStore'
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

describe('shouldRedirectToLogin', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('does not redirect for login 401 responses', () => {
    useAuthStore.getState().login('token', {
      id: '1',
      email: 'admin@workload.local',
      name: 'Admin',
      role: 'admin',
    })

    const error = {
      response: { status: 401 },
      config: { url: '/auth/login' },
    }

    expect(shouldRedirectToLogin(error)).toBe(false)
  })

  it('redirects for other 401 responses', () => {
    useAuthStore.getState().login('token', {
      id: '1',
      email: 'admin@workload.local',
      name: 'Admin',
      role: 'admin',
    })

    const error = {
      response: { status: 401 },
      config: { url: '/objects' },
    }

    expect(shouldRedirectToLogin(error)).toBe(true)
  })

  it('does not redirect for non-401 responses', () => {
    useAuthStore.getState().login('token', {
      id: '1',
      email: 'admin@workload.local',
      name: 'Admin',
      role: 'admin',
    })

    const error = {
      response: { status: 500 },
      config: { url: '/objects' },
    }

    expect(shouldRedirectToLogin(error)).toBe(false)
  })

  it('does not redirect when already on the login page', () => {
    useAuthStore.getState().login('token', {
      id: '1',
      email: 'admin@workload.local',
      name: 'Admin',
      role: 'admin',
    })

    const error = {
      response: { status: 401 },
      config: { url: '/objects' },
    }

    expect(shouldRedirectToLogin(error, '/login')).toBe(false)
  })

  it('does not redirect without an authenticated session', () => {
    const error = {
      response: { status: 401 },
      config: { url: '/objects' },
    }

    expect(shouldRedirectToLogin(error)).toBe(false)
  })
})
