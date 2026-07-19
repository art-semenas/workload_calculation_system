// PageHead — page header: react-router breadcrumbs (a crumb with `to` links,
// the last is plain text), a title, an optional subtitle, and an actions slot.
// The Router is supplied by the preview harness (cfg.provider). Full-width, so
// one story per row (cfg.overrides.PageHead column).
import { PageHead } from 'frontend'

const InkButton = ({ children }: { children: React.ReactNode }) => (
  <button
    style={{
      height: 32,
      padding: '0 12px',
      background: '#1a1a1a',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      fontFamily: "'Inter', -apple-system, sans-serif",
      fontSize: 13,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
)

export const ObjectPage = () => (
  <div style={{ width: 760, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <PageHead
      crumbs={[
        { label: 'Филиалы', to: '/branches' },
        { label: 'Брестский', to: '/branches/brest' },
        { label: 'Архив г.Брест' },
      ]}
      title="Архив г.Брест, ул.Московская, 202Д"
      subtitle="Объект · 12 единиц оборудования · инженер Петров А.И."
      actions={<InkButton>Пересчитать</InkButton>}
    />
  </div>
)

export const ListPage = () => (
  <div style={{ width: 760, fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <PageHead
      crumbs={[{ label: 'Свод', to: '/svod' }, { label: 'По филиалам' }]}
      title="Сводная нагрузка"
    />
  </div>
)
