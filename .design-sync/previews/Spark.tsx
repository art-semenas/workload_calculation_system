// Spark — inline sparkline (SVG polyline), sized by props. In the app it carries
// the `.row-trend` class which is opacity:0 until its table row is hovered; the
// preview forces it visible so the card shows the line (i.e. the hover state).
import { Spark } from 'frontend'

const ShowTrend = () => <style>{`.row-trend{opacity:1 !important}`}</style>

export const InRows = () => (
  <div style={{ width: 320, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <ShowTrend />
    {[
      ['Петров А.', [0.6, 0.62, 0.65, 0.63, 0.7, 0.71]],
      ['Иванова М.', [0.5, 0.55, 0.7, 0.82, 0.9, 0.94]],
      ['Сидоров В.', [0.8, 0.9, 1.0, 1.1, 1.15, 1.18]],
    ].map(([name, data], i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 0',
          borderTop: i ? '1px solid var(--line)' : 'none',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--ink2)' }}>{name as string}</span>
        <Spark data={data as number[]} />
      </div>
    ))}
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '8px 0' }}>
    <ShowTrend />
    <Spark data={[3, 5, 4, 6, 5, 8, 7]} />
    <Spark data={[3, 5, 4, 6, 5, 8, 7]} width={120} height={32} />
    <Spark data={[8, 6, 7, 5, 6, 3, 2]} width={160} height={40} />
  </div>
)
