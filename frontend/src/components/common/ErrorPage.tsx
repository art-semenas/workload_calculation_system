import { Box, Button, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { tokens } from '../../theme'

interface ErrorPageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorPage({ message, onRetry }: ErrorPageProps) {
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
