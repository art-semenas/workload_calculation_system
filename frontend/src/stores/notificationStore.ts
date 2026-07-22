import { create } from 'zustand'

export type NotificationSeverity = 'error' | 'warning' | 'info' | 'success'

export interface Notification {
  id: string
  message: string
  severity: NotificationSeverity
}

interface NotificationState {
  notifications: Notification[]
  /** Messages owned by a full-page error; they must not also appear as a toast. */
  suppressed: string[]
  show: (message: string, severity: NotificationSeverity) => void
  dismiss: (id: string) => void
  suppress: (message: string) => void
  unsuppress: (message: string) => void
}

let fallbackIdCounter = 0

// crypto.randomUUID is undefined outside a secure context (plain http on a
// hostname or IP). This runs inside the Axios rejection handler, where throwing
// would replace the original error and hide the server's message.
function nextId(): string {
  return crypto.randomUUID?.() ?? `n-${Date.now()}-${fallbackIdCounter++}`
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  suppressed: [],
  show: (message, severity) =>
    set((state) => {
      if (state.suppressed.includes(message)) return state
      // Query retries and parallel page queries report the same failure repeatedly.
      // A repeat replaces the existing entry rather than stacking, which also gives
      // it a fresh id so the auto-dismiss countdown starts over.
      const existing = state.notifications.find((n) => n.message === message)
      const entry = { id: nextId(), message, severity }
      if (existing) {
        return {
          notifications: state.notifications.map((n) => (n === existing ? entry : n)),
        }
      }
      return { notifications: [...state.notifications, entry] }
    }),
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  suppress: (message) =>
    set((state) => ({
      suppressed: [...state.suppressed, message],
      notifications: state.notifications.filter((n) => n.message !== message),
    })),
  unsuppress: (message) =>
    set((state) => {
      // Remove one registration — nested pages may suppress the same message.
      const index = state.suppressed.indexOf(message)
      if (index === -1) return state
      const suppressed = [...state.suppressed]
      suppressed.splice(index, 1)
      return { suppressed }
    }),
}))

// Convenience accessor for use outside React components (e.g., Axios interceptor)
export const showNotification = (message: string, severity: NotificationSeverity) =>
  useNotificationStore.getState().show(message, severity)
