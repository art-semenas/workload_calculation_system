import { Box, Typography } from '@mui/material'

export interface HeroStat {
  label: string
  value: string
}

interface HeroCardProps {
  title: string
  heroValue: string
  stats: HeroStat[]
}

export function HeroCard({ title, heroValue, stats }: HeroCardProps) {
  return (
    <Box
      sx={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        borderRadius: 'var(--r-md)',
        padding: 'var(--gap-m)',
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: 'var(--gap-s)',
        }}
      >
        {title}
      </Typography>

      {/* Hero Value */}
      <Typography
        sx={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 42,
          fontWeight: 500,
          letterSpacing: '-0.025em',
          color: 'white',
          marginBottom: stats.length > 0 ? 'var(--gap-m)' : 0,
        }}
      >
        {heroValue}
      </Typography>

      {/* Stats Grid */}
      {stats.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--gap-m)',
          }}
        >
          {stats.map((stat, idx) => (
            <Box key={idx}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: 'var(--gap-xs)',
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'white',
                }}
              >
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
