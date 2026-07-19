// SectionBlock — frames a page section: an uppercase label with optional meta
// and actions, then arbitrary children below. Shown wrapping a small table and
// an empty-state.
import { SectionBlock } from 'frontend'

export const WithTable = () => (
  <div style={{ width: 620, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <SectionBlock label="Оборудование" meta="12 единиц">
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
        {[
          ['Сервер СХД', 'ok', '0.012'],
          ['ИБП APC', 'ok', '0.004'],
          ['Климат-система', 'warn', '0.009'],
        ].map(([name, tone, val], i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '11px 14px',
              borderTop: i ? '1px solid var(--line)' : 'none',
              fontSize: 13,
              color: 'var(--ink2)',
            }}
          >
            <span>{name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: tone === 'warn' ? 'var(--warn)' : 'var(--ink3)' }}>
              {val}
            </span>
          </div>
        ))}
      </div>
    </SectionBlock>
  </div>
)

export const EmptyState = () => (
  <div style={{ width: 620, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <SectionBlock label="Переезды" meta="нет данных">
      <div style={{ fontSize: 13, color: 'var(--ink4)' }}>Переезды не заданы для этого объекта.</div>
    </SectionBlock>
  </div>
)
