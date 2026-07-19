// HeroCard — dark summary card: a title, one large JetBrains Mono hero value,
// and an optional 2-column stats grid. Used for the headline metric of a
// branch / engineer / svod view.
import { HeroCard } from 'frontend'

export const BranchTotal = () => (
  <div style={{ width: 420 }}>
    <HeroCard
      title="Суммарная нагрузка филиала"
      heroValue="0.032327"
      stats={[
        { label: 'Объектов', value: '48' },
        { label: 'Инженеров', value: '6' },
        { label: 'Ремонтов за период', value: '312' },
        { label: 'Средняя загрузка', value: '0.71' },
      ]}
    />
  </div>
)

export const EngineerFTE = () => (
  <div style={{ width: 420 }}>
    <HeroCard
      title="ФО инженера — Петров А.И."
      heroValue="0.84"
      stats={[
        { label: 'Закреплено объектов', value: '9' },
        { label: 'Статус', value: 'В норме' },
      ]}
    />
  </div>
)

export const ValueOnly = () => (
  <div style={{ width: 300 }}>
    <HeroCard title="Итого по своду" heroValue="12.4" stats={[]} />
  </div>
)
