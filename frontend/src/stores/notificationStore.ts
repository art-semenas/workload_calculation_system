import { create } from 'zustand'

export type NotificationSeverity = 'error' | 'warning' | 'info' | 'success'

export interface Notification {
  id: string
  message: string
  severity: NotificationSeverity
}

interface NotificationState {
  notifications: Notification[]
  show: (message: string, severity: NotificationSeverity) => void
  dismiss: (id: string) => void
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
  show: (message, severity) =>
    set((state) => {
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
}))

// Convenience accessor for use outside React components (e.g., Axios interceptor)
export const showNotification = (message: string, severity: NotificationSeverity) =>
  useNotificationStore.getState().show(message, severity)
