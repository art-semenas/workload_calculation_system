import { Box } from '@mui/material'

interface NumProps {
  value: number
  digits?: number
}

export const Num = ({ value, digits = 6 }: NumProps) => {
  const displayValue = value === 0 ? '—' : value.toFixed(digits)

  return (
    <Box
      component="span"
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontFeatureSettings: '"tnum"',
        fontSize: 'inherit',
      }}
    >
      {displayValue}
    </Box>
  )
}
