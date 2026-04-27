import { Chip, ChipProps } from '@mui/material'

type StatusKind = 'ok' | 'warn' | 'danger' | 'accent' | 'default'

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  kind: StatusKind
}

const kindColorMap: Record<StatusKind, { bg: string; text: string; dot: string }> = {
  ok: {
    bg: 'var(--ok-soft)',
    text: 'var(--ok)',
    dot: 'var(--ok)',
  },
  warn: {
    bg: 'var(--warn-soft)',
    text: 'var(--warn)',
    dot: 'var(--warn)',
  },
  danger: {
    bg: 'var(--danger-soft)',
    text: 'var(--danger)',
    dot: 'var(--danger)',
  },
  accent: {
    bg: 'var(--accent-soft)',
    text: 'var(--accent)',
    dot: 'var(--accent)',
  },
  default: {
    bg: 'var(--bg-sunken)',
    text: 'var(--ink)',
    dot: 'var(--ink3)',
  },
}

export const StatusChip = ({ kind, label, ...props }: StatusChipProps) => {
  const colors = kindColorMap[kind]

  return (
    <Chip
      label={label}
      {...props}
      sx={{
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: '12px',
        height: '24px',
        paddingLeft: '6px',
        '& .MuiChip-icon': {
          width: '6px',
          height: '6px',
          marginLeft: '0px',
          marginRight: '8px',
          borderRadius: '50%',
          backgroundColor: colors.dot,
        },
        ...props.sx,
      }}
      icon={
        <div
          style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.dot }}
        />
      }
    />
  )
}
