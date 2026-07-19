// KPIRow — a row of KPI cells (label, large JetBrains Mono value, optional
// delta), separated by rules. Value and delta carry a tone (ok/warn/danger).
// Full-width band, so rendered one story per row (cfg.overrides.KPIRow column).
import { KPIRow } from 'frontend'

export const BranchKPIs = () => (
  <div style={{ width: 760 }}>
    <KPIRow
      items={[
        { label: 'Объектов', value: 48 },
        { label: 'Инженеров', value: 6 },
        { label: 'Средняя загрузка', value: '0.71', delta: '+0.04 за месяц', deltaTone: 'warn' },
        { label: 'Перегружено', value: 2, tone: 'danger', delta: 'требует внимания', deltaTone: 'danger' },
      ]}
    />
  </div>
)

export const EngineerKPIs = () => (
  <div style={{ width: 760 }}>
    <KPIRow
      items={[
        { label: 'ФО', value: '0.84', tone: 'ok' },
        { label: 'Закреплено объектов', value: 9 },
        { label: 'Ремонтов за период', value: 27 },
        { label: 'Статус', value: 'В норме', tone: 'ok' },
      ]}
    />
  </div>
)
