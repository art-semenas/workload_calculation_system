import { Box, Typography } from '@mui/material'
import { tokens } from '../../theme'

interface SectionBlockProps {
  label: string
  meta?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function SectionBlock({ label, meta, actions, children }: SectionBlockProps) {
  return (
    <Box sx={{ marginTop: 'var(--gap-xl)' }}>
      {/* Header row with label, meta, and actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--gap-m)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 'var(--gap-s)' }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: tokens.ink3,
            }}
          >
            {label}
          </Typography>
          {meta && (
            <>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: tokens.ink4,
                }}
              >
                ·
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: tokens.ink4,
                }}
              >
                {meta}
              </Typography>
            </>
          )}
        </Box>
        {actions && <Box>{actions}</Box>}
      </Box>

      {/* Content */}
      {children}
    </Box>
  )
}
