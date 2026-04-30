import { Box, Typography } from '@mui/material'
import { tokens } from '../../theme'

export interface KPIItem {
  label: string
  value: string | number
  delta?: string
  deltaTone?: 'ok' | 'warn' | 'danger'
  tone?: 'ok' | 'warn' | 'danger'
}

interface KPIRowProps {
  items: KPIItem[]
}

const getToneColor = (tone: 'ok' | 'warn' | 'danger') => {
  switch (tone) {
    case 'ok':
      return tokens.ok
    case 'warn':
      return tokens.warn
    case 'danger':
      return tokens.danger
  }
}

export function KPIRow({ items }: KPIRowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        width: '100%',
      }}
    >
      {items.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            paddingRight: idx < items.length - 1 ? 'var(--gap-m)' : 0,
            marginRight: idx < items.length - 1 ? 'var(--gap-m)' : 0,
            borderRight:
              idx < items.length - 1 ? `1px solid var(--line)` : 'none',
          }}
        >
          {/* Label */}
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 400,
              color: tokens.ink3,
              marginBottom: 'var(--gap-xs)',
            }}
          >
            {item.label}
          </Typography>

          {/* Value */}
          <Typography
            sx={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: item.tone ? getToneColor(item.tone) : tokens.ink,
              marginBottom: item.delta ? 'var(--gap-xs)' : 0,
            }}
          >
            {item.value}
          </Typography>

          {/* Delta */}
          {item.delta && (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 400,
                color: item.deltaTone ? getToneColor(item.deltaTone) : tokens.ink3,
              }}
            >
              {item.delta}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  )
}
