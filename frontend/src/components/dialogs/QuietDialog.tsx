import Dialog from '@mui/material/Dialog'
import { tokens } from '../../theme'
import type { ReactNode } from 'react'

interface QuietDialogProps {
  open: boolean
  onClose: () => void
  paperWidth?: number
  children: ReactNode
}

export function QuietDialog({ open, onClose, paperWidth = 480, children }: QuietDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDialog-paper': {
          width: paperWidth,
          maxWidth: paperWidth,
          borderRadius: 'var(--r-lg)',
          border: `1px solid ${tokens.lineStrong}`,
          boxShadow: 'none',
        },
      }}
    >
      {children}
    </Dialog>
  )
}
