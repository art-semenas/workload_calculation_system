import axios, { isAxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { showNotification } from '../stores/notificationStore'

interface ApiRequestConfig {
  url?: string
  skipAuthRedirect?: boolean
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // AC-FE-05: without this a hung backend never rejects and the UI spins forever.
  timeout: 30_000,
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

function getServerErrorMessage(data: unknown): string | undefined {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error?: { message?: unknown } }).error?.message === 'string'
  ) {
    return (data as { error: { message: string } }).error.message
  }

  return undefined
}

// Network errors and 5xx get a global toast; 4xx re-throw for callers to handle.
export function notifyResponseError(error: unknown): void {
  if (!isAxiosError(error)) {
    return
  }

  if (!error.response) {
    showNotification('Network error. Please check your connection and try again.', 'error')
    return
  }

  if (error.response.status >= 500) {
    showNotification(
      getServerErrorMessage(error.response.data) ?? 'An unexpected error occurred.',
      'error'
    )
  }
}

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 → clear auth and redirect to /login; network/5xx → global toast
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (shouldRedirectToLogin(error, window.location.pathname)) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    notifyResponseError(error)
    return Promise.reject(error)
  }
)

export default api
