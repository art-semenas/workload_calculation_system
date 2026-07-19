import { isAxiosError } from 'axios'
import { showNotification } from '../stores/notificationStore'

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

export interface ApiErrorInfo {
  code: number
  message: string
}

// True for unrecoverable 5xx responses — the case the full-page ErrorPage is meant for.
export function isServerError(error: unknown): boolean {
  return isAxiosError(error) && (error.response?.status ?? 0) >= 500
}

export function extractApiError(err: unknown): ApiErrorInfo | undefined {
  if (!isObject(err) || !('response' in err)) return undefined
  const { response } = err
  if (!isObject(response) || !('data' in response)) return undefined
  const { data } = response
  if (!isObject(data) || !('error' in data)) return undefined
  const { error } = data
  if (!isObject(error)) return undefined
  const { code, message } = error
  if (typeof code !== 'number' || typeof message !== 'string') return undefined
  return { code, message }
}

// Server messages are user-facing per the unified-error-handling epic — show them directly.
export function mapEquipmentError(info: ApiErrorInfo | undefined): string {
  return info?.message ?? 'An unexpected error occurred.'
}

export function mapSaveError(info: ApiErrorInfo | undefined): string {
  if (info?.code === 404) return 'Object no longer exists. Refresh the page.'
  return info?.message ?? 'Failed to save. Please try again.'
}

// Standard form-submission error handling (unified-error-handling epic):
// 422 → inline message below the form, 409 → warning toast, other 4xx → error toast.
// 401 redirect, 5xx toast, and network toast are handled by the Axios interceptor.
export function handleFormError(err: unknown, setInlineError?: (message: string) => void): void {
  const info = extractApiError(err)
  if (!info) return
  if (info.code === 409) {
    showNotification(info.message, 'warning')
  } else if (info.code === 422 && setInlineError) {
    setInlineError(info.message)
  } else if (info.code !== 401 && info.code < 500) {
    showNotification(info.message, 'error')
  }
}
