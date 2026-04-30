import { tokens } from '../../theme'

interface SparkProps {
  data: number[]
  width?: number
  height?: number
}

export function Spark({ data, width = 64, height = 18 }: SparkProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Find min and max values for scaling
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1 // Avoid division by zero

  // Calculate padding within the SVG
  const padding = 2

  // Scale data points to fit within SVG bounds
  const points = data.map((value, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      className="row-trend"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={tokens.ink3}
        strokeWidth="1.5"
      />
    </svg>
  )
}
