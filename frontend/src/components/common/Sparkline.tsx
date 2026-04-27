interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export const Sparkline = ({
  data,
  width = 100,
  height = 24,
  color = 'var(--accent)',
}: SparklineProps) => {
  if (data.length === 0) {
    return <svg width={width} height={height} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return { x, y }
  })

  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    return `${acc} L ${point.x} ${point.y}`
  }, '')

  const areaPath = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Fill */}
      <path d={areaPath} fill={color} fillOpacity={0.12} />
      {/* Stroke */}
      <path
        d={pathD}
        stroke={color}
        strokeWidth={1.25}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
