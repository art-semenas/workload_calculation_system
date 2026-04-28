import { Card, CardContent, Grid, Skeleton, Typography } from '@mui/material'
import type { EngineerSummary } from '../../types/engineer'

interface EngineerSummaryCardsProps {
  summary: EngineerSummary | undefined
  isLoading: boolean
}

function getUtilizationColor(status?: string) {
  switch (status) {
    case 'NORMAL':
      return 'success.main'
    case 'WARNING':
      return 'warning.main'
    case 'OVERLOADED':
      return 'error.main'
    default:
      return 'text.primary'
  }
}

export default function EngineerSummaryCards({
  summary,
  isLoading,
}: EngineerSummaryCardsProps) {
  const cards = [
    {
      label: 'Load',
      value: isLoading ? (
        <Skeleton width="100%" />
      ) : (
        `${summary?.totalLoad.toFixed(3) ?? 0} FTE`
      ),
    },
    {
      label: 'Capacity',
      value: isLoading ? (
        <Skeleton width="100%" />
      ) : (
        `${summary?.capacityFte.toFixed(1) ?? 0} FTE`
      ),
    },
    {
      label: 'Utilization',
      value: isLoading ? (
        <Skeleton width="100%" />
      ) : (
        `${Math.round((summary?.loadRatio ?? 0) * 100)}%`
      ),
      color: getUtilizationColor(summary?.status),
    },
    {
      label: 'Objects',
      value: isLoading ? (
        <Skeleton width="100%" />
      ) : (
        summary?.objectCount ?? 0
      ),
    },
  ]

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, idx) => (
        <Grid item xs={12} sm={6} md={3} key={idx}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {card.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: card.color || 'text.primary' }}
              >
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
