import { useEffect } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { tokens } from '../../theme'

export interface QuietDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export interface DrawerSectionProps {
  label: string
  children: React.ReactNode
}

export function DrawerSection({ label, children }: DrawerSectionProps) {
  return (
    <Box sx={{ marginBottom: 'var(--gap-m)' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: tokens.ink3,
          marginBottom: 'var(--gap-s)',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

export function QuietDrawer({ open, onClose, title, children }: QuietDrawerProps) {
  // Handle Escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Scrim */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(20, 20, 18, 0.18)',
          pointerEvents: 'none',
        }}
      />

      {/* Drawer */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          backgroundColor: tokens.bgElev,
          borderLeft: `1px solid var(--line)`,
          overflowY: 'auto',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--gap-m)',
            borderBottom: `1px solid var(--line)`,
          }}
        >
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 600,
              color: tokens.ink,
            }}
          >
            {title}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="close"
            sx={{
              width: 24,
              height: 24,
              borderRadius: 'var(--r-sm)',
              '&:hover': {
                backgroundColor: tokens.bgSunken,
              },
            }}
          >
            <CloseIcon sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            padding: 'var(--gap-m)',
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  )
}
