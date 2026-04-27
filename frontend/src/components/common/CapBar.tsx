import { Box } from '@mui/material'

interface CapBarProps {
  value: number
  max: number
  width?: number
}

export const CapBar = ({ value, max, width = 80 }: CapBarProps) => {
  const percentage = max > 0 ? (value / max) * 100 : 0
  const clampedPercentage = Math.min(percentage, 100)

  let trackColor = 'var(--ok)'
  if (percentage >= 100) {
    trackColor = 'var(--danger)'
  } else if (percentage >= 85) {
    trackColor = 'var(--warn)'
  }

  return (
    <Box
      sx={{
        width: `${width}px`,
        height: '6px',
        backgroundColor: 'var(--bg-sunken)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: `${clampedPercentage}%`,
          backgroundColor: trackColor,
          borderRadius: '3px',
          transition: 'width 0.2s ease-in-out',
        }}
      />
    </Box>
  )
}
