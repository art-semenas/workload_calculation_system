// DistBar — stacked proportion bar with a legend. Each segment carries a tone
// (ok/warn/danger), a count, and a label; widths are proportional to counts.
import { DistBar } from 'frontend'

export const LoadDistribution = () => (
  <div style={{ width: 440, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <DistBar
      segments={[
        { tone: 'ok', count: 34, label: 'В норме' },
        { tone: 'warn', count: 9, label: 'У предела' },
        { tone: 'danger', count: 5, label: 'Перегрузка' },
      ]}
    />
  </div>
)

export const RepairsStatus = () => (
  <div style={{ width: 440, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <DistBar
      height={14}
      segments={[
        { tone: 'ok', count: 21, label: 'Закрыто' },
        { tone: 'warn', count: 6, label: 'В работе' },
        { tone: 'danger', count: 3, label: 'Просрочено' },
      ]}
    />
  </div>
)
