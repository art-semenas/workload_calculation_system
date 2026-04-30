import { Box, Typography } from '@mui/material'
import { tokens } from '../../theme'

export interface DistBarSegment {
  tone: 'ok' | 'warn' | 'danger'
  count: number
  label: string
}

interface DistBarProps {
  segments: DistBarSegment[]
  height?: number
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

export function DistBar({ segments, height = 8 }: DistBarProps) {
  const total = segments.reduce((sum, seg) => sum + seg.count, 0)

  return (
    <Box>
      {/* Stacked bar */}
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height,
          borderRadius: 'var(--r-sm)',
          overflow: 'hidden',
          marginBottom: 'var(--gap-m)',
        }}
      >
        {segments.map((segment, idx) => {
          const percentage = (segment.count / total) * 100
          return (
            <Box
              key={idx}
              sx={{
                flex: `${percentage}%`,
                backgroundColor: getToneColor(segment.tone),
              }}
            />
          )
        })}
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--gap-m)',
        }}
      >
        {segments.map((segment, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--gap-xs)',
            }}
          >
            {/* Color dot */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getToneColor(segment.tone),
              }}
            />
            {/* Label + count */}
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 400,
                color: tokens.ink3,
              }}
            >
              {segment.label} {segment.count}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
