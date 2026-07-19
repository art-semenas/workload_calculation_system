// CapBar — capacity/load bar. Tone is derived from pct: ok ≤ 0.9, warn ≤ 1.0,
// danger > 1.0. The variant axis is pct, so the stories sweep the three bands.
import { CapBar } from 'frontend'

function Row({ name, pct }: { name: string; pct: number }) {
  return (
    <div style={{ width: 320, marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--ink2)' }}>{name}</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 13,
            color: 'var(--ink3)',
          }}
        >
          {Math.round(pct * 100)}%
        </span>
      </div>
      <CapBar pct={pct} />
    </div>
  )
}

export const Default = () => (
  <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <Row name="Загрузка инженера" pct={0.62} />
  </div>
)

export const Thresholds = () => (
  <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <Row name="Петров А. — в норме" pct={0.62} />
    <Row name="Иванова М. — у предела" pct={0.94} />
    <Row name="Сидоров В. — перегрузка" pct={1.18} />
  </div>
)
