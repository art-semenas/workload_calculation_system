interface DonutMiniProps {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  track?: string
}

export const DonutMini = ({
  value,
  max,
  size = 40,
  stroke = 2,
  color = 'var(--accent)',
  track = 'var(--line)',
}: DonutMiniProps) => {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = max > 0 ? Math.min(value / max, 1) : 0
  const strokeDashoffset = circumference * (1 - percentage)

  const cx = size / 2
  const cy = size / 2

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s ease-in-out' }}
      />
    </svg>
  )
}
