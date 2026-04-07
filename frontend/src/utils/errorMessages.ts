export function mapEquipmentErrorCode(code: string | undefined): string {
  switch (code) {
    case 'DEVICE_NOT_IN_INVENTORY':
      return 'Device is not in the physical inventory.'
    case 'NO_CONTEXT_FOR_SYSTEM':
      return 'No catalog context exists for this device and system type.'
    default:
      return 'An unexpected error occurred.'
  }
}
