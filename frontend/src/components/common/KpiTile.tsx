import { Box, Card } from '@mui/material'
import { Num } from './Num'
import { StatusChip } from './StatusChip'
import { Sparkline } from './Sparkline'

type DeltaKind = 'ok' | 'warn' | 'danger' | 'accent' | 'default'

interface KpiTileProps {
  label: string
  value: number
  unit?: string
  delta?: number
  deltaKind?: DeltaKind
  spark?: number[]
}

export const KpiTile = ({
  label,
  value,
  unit,
  delta,
  deltaKind = 'default',
  spark,
}: KpiTileProps) => {
  const deltaLabel = delta !== undefined ? (delta >= 0 ? `+${delta}` : `${delta}`) : undefined

  return (
    <Card
      sx={{
        backgroundColor: 'var(--bg-elev)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <Box
        sx={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--ink3)',
        }}
      >
        {label}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <Box
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '30px',
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          <Num value={value} digits={0} />
        </Box>
        {unit && <Box sx={{ fontSize: '14px', color: 'var(--ink3)' }}>{unit}</Box>}
        {deltaLabel && <StatusChip kind={deltaKind} label={deltaLabel} size="small" />}
      </Box>

      {spark && spark.length > 0 && (
        <Box sx={{ marginTop: '4px' }}>
          <Sparkline data={spark} width="100%" height={32} />
        </Box>
      )}
    </Card>
  )
}
