import { useEffect } from 'react'
import { Box, Button, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useNotificationStore } from '../../stores/notificationStore'
import { tokens } from '../../theme'

interface ErrorPageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorPage({ message, onRetry }: ErrorPageProps) {
  const suppress = useNotificationStore((state) => state.suppress)
  const unsuppress = useNotificationStore((state) => state.unsuppress)

  // This page already shows the failure; the interceptor must not toast it too,
  // including on the retries React Query fires behind us.
  useEffect(() => {
    if (!message) return
    suppress(message)
    return () => unsuppress(message)
  }, [message, suppress, unsuppress])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 10,
        textAlign: 'center',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 48, color: tokens.ink3 }} />
      <Typography sx={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</Typography>
      {message && <Typography sx={{ color: tokens.ink3, maxWidth: 480 }}>{message}</Typography>}
      {onRetry && (
        <Button variant="contained" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Box>
  )
}
