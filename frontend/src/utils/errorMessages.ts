function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

export interface ApiErrorInfo {
  code: number
  message: string
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
