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

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  show: (message, severity) =>
    set((state) => {
      // Query retries and parallel page queries report the same failure repeatedly.
      if (state.notifications.some((n) => n.message === message)) return state
      return {
        notifications: [...state.notifications, { id: crypto.randomUUID(), message, severity }],
      }
    }),
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))

// Convenience accessor for use outside React components (e.g., Axios interceptor)
export const showNotification = (message: string, severity: NotificationSeverity) =>
  useNotificationStore.getState().show(message, severity)
