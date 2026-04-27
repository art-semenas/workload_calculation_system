import { Box } from '@mui/material'
import { StatusChip } from './StatusChip'

type SystemType = 'OS' | 'PS' | 'Video'

interface SystemChipProps {
  system: SystemType
}

const systemConfig: Record<SystemType, { label: string; kind: 'accent' | 'warn' | 'ok' }> = {
  OS: { label: 'ОС', kind: 'accent' },
  PS: { label: 'ПС', kind: 'warn' },
  Video: { label: 'Видео', kind: 'ok' },
}

export const SystemChip = ({ system }: SystemChipProps) => {
  const config = systemConfig[system]

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <StatusChip kind={config.kind} label={config.label} size="small" />
    </Box>
  )
}
