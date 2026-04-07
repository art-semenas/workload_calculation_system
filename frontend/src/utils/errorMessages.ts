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
