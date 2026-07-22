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

const GENERIC_ERROR = 'Something went wrong. Please try again.'
const GONE_ERROR = 'This item no longer exists. Refresh the page.'

// Inline when the caller has somewhere to put it, toast otherwise.
function report(message: string, setInlineError?: (message: string) => void): void {
  if (setInlineError) {
    setInlineError(message)
  } else {
    showNotification(message, 'error')
  }
}

// Standard form-submission error handling (unified-error-handling epic).
// Server messages are user-facing by design, so they are shown directly.
// 401 redirect, 5xx toast, and network toast belong to the Axios interceptor —
// this function stays silent for those so the user is not told twice.
export function handleFormError(err: unknown, setInlineError?: (message: string) => void): void {
  const info = extractApiError(err)

  if (!info) {
    // The interceptor already surfaced 5xx and, when there is no response at all,
    // network errors and timeouts. Everything else — a client-side bug, or a 4xx
    // from a proxy that never produced our envelope — reaches no other handler,
    // so report it rather than freeze the form silently.
    const handledByInterceptor = isAxiosError(err) && (!err.response || err.response.status >= 500)
    if (!handledByInterceptor) report(GENERIC_ERROR, setInlineError)
    return
  }

  if (info.code === 422) {
    report(info.message, setInlineError)
  } else if (info.code === 409) {
    showNotification(info.message, 'warning')
  } else if (info.code === 404) {
    showNotification(GONE_ERROR, 'error')
  } else if (info.code !== 401 && info.code < 500) {
    showNotification(info.message, 'error')
  }
}
