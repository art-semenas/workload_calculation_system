import axios from 'axios'
import { useAuthStore } from '../store/authStore'

interface ApiRequestConfig {
  url?: string
  skipAuthRedirect?: boolean
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

function isResponseStatus(error: unknown, status: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === status
  )
}

function getErrorRequestUrl(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'config' in error &&
    typeof (error as { config?: ApiRequestConfig }).config?.url === 'string'
  ) {
    return (error as { config?: ApiRequestConfig }).config?.url
  }

  return undefined
}

function shouldSkipAuthRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'config' in error &&
    (error as { config?: ApiRequestConfig }).config?.skipAuthRedirect === true
  )
}

function isLoginRequest(url: string | undefined): boolean {
  return typeof url === 'string' && /\/auth\/login(?:\?|$)/.test(url)
}

export function shouldRedirectToLogin(error: unknown, currentPathname?: string): boolean {
  if (!isResponseStatus(error, 401)) {
    return false
  }

  if (useAuthStore.getState().token === null) {
    return false
  }

  if (shouldSkipAuthRedirect(error)) {
    return false
  }

  if (currentPathname === '/login') {
    return false
  }

  return !isLoginRequest(getErrorRequestUrl(error))
}

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 → clear auth and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (shouldRedirectToLogin(error, window.location.pathname)) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
