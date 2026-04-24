function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

export function extractErrorCode(err: unknown): string | undefined {
  if (!isObject(err) || !('response' in err)) return undefined
  const { response } = err
  if (!isObject(response) || !('data' in response)) return undefined
  const { data } = response
  if (!isObject(data) || !('error' in data)) return undefined
  const { error } = data
  if (!isObject(error) || !('code' in error)) return undefined
  const { code } = error
  return typeof code === 'string' ? code : undefined
}

export function mapEquipmentErrorCode(code: string | undefined): string {
  switch (code) {
    case 'DEVICE_NOT_IN_INVENTORY':
      return 'Device is not in inventory'
    case 'NO_CONTEXT_FOR_SYSTEM':
      return 'No norms configured for this system'
    default:
      return 'An unexpected error occurred.'
  }
}

export function mapSaveErrorCode(code: string | undefined): string {
  switch (code) {
    case 'OBJECT_NOT_FOUND':
      return 'Object no longer exists. Refresh the page.'
    case 'ROUND_TRIP_NOT_EDITABLE':
      return 'Round-trip time is calculated automatically and cannot be set directly.'
    default:
      return 'Failed to save. Please try again.'
  }
}
