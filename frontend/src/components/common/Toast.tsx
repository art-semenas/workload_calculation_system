import { useEffect } from 'react'
import { Alert, Portal, Stack } from '@mui/material'
import { useNotificationStore, type Notification } from '../../stores/notificationStore'

const AUTO_DISMISS_MS = 5000

export function Toast() {
  const notifications = useNotificationStore((state) => state.notifications)
  const dismiss = useNotificationStore((state) => state.dismiss)

  if (notifications.length === 0) return null

  // Portalled to document.body: MUI's modal manager marks every other body child
  // aria-hidden while a dialog is open, which would hide toasts from screen readers.
  return (
    <Portal>
      <Stack
        spacing={1}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: (theme) => theme.zIndex.snackbar + 1,
        }}
      >
        {notifications.map((notification) => (
          <ToastItem key={notification.id} notification={notification} onDismiss={dismiss} />
        ))}
      </Stack>
    </Portal>
  )
}

function ToastItem({
  notification,
  onDismiss,
}: {
  notification: Notification
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [notification.id, onDismiss])

  return (
    <Alert
      severity={notification.severity}
      onClose={() => onDismiss(notification.id)}
      sx={{ width: '100%' }}
    >
      {notification.message}
    </Alert>
  )
}
