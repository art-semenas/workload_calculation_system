import { Box, LinearProgress, Typography, Stack, LinearProgressProps } from '@mui/material'
import type { EngineerSummary } from '../../types/engineer'

interface SystemBreakdownChartProps {
  summary: EngineerSummary | undefined
}

type ColorVariant = LinearProgressProps['color']

interface SystemRow {
  label: string
  load: number
  color: ColorVariant
}

export default function SystemBreakdownChart({ summary }: SystemBreakdownChartProps) {
  if (!summary || summary.totalLoad === 0) {
    return (
      <Typography color="textSecondary" sx={{ mb: 3 }}>
        No load data
      </Typography>
    )
  }

  const systems: SystemRow[] = [
    { label: 'Security', load: summary.osLoad, color: 'primary' },
    { label: 'Fire', load: summary.psLoad, color: 'warning' },
    { label: 'Video', load: summary.videoLoad, color: 'success' },
    { label: 'Records', load: summary.recordsLoad, color: 'secondary' },
    { label: 'Repairs', load: summary.repairLoad, color: 'error' },
  ]

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {systems.map((system) => {
        const percentage = (system.load / summary.totalLoad) * 100
        return (
          <Box key={system.label}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  width: 80,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {system.label}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <LinearProgress variant="determinate" value={percentage} color={system.color} />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  width: 150,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {system.load.toFixed(3)} FTE ({Math.round(percentage)}%)
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
