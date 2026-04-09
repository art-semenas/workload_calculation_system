export function extractErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return undefined
  }
  const response = (err as { response?: { data?: { error?: { code?: string } } } }).response
  return response?.data?.error?.code
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
