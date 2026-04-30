import { Box } from '@mui/material'
import { tokens } from '../../theme'

interface CapBarProps {
  pct: number
}

export function CapBar({ pct }: CapBarProps) {
  // Determine tone based on pct
  let tone: 'ok' | 'warn' | 'danger' = 'ok'
  if (pct > 1.0) {
    tone = 'danger'
  } else if (pct > 0.9) {
    tone = 'warn'
  }

  // Get color for tone
  const getToneColor = () => {
    switch (tone) {
      case 'ok':
        return tokens.ok
      case 'warn':
        return tokens.warn
      case 'danger':
        return tokens.danger
    }
  }

  // Calculate fill percentage, capped at 100%
  const fillPct = Math.min(pct * 100, 100)

  return (
    <Box
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={1}
      sx={{
        width: '100%',
        height: 8,
        backgroundColor: tokens.bgSunken,
        borderRadius: 'var(--r-sm)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: `${fillPct}%`,
          height: '100%',
          backgroundColor: getToneColor(),
          transition: 'width 0.3s ease',
        }}
      />
    </Box>
  )
}
