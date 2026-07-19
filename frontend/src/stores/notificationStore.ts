import { create } from 'zustand'

export interface Notification {
  id: string
  message: string
  severity: 'error' | 'warning' | 'info' | 'success'
}

interface NotificationState {
  notifications: Notification[]
  show: (message: string, severity: 'error' | 'warning') => void
  dismiss: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  show: (message, severity) =>
    set((state) => ({
      notifications: [...state.notifications, { id: crypto.randomUUID(), message, severity }],
    })),
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))

// Convenience accessor for use outside React components (e.g., Axios interceptor)
export const showNotification = (message: string, severity: 'error' | 'warning') =>
  useNotificationStore.getState().show(message, severity)
