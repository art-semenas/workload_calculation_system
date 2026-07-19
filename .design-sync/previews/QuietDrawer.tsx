// QuietDrawer — right-side overlay drawer (open state) with a title, a close
// button, and a scrim. Content is organized with DrawerSection (labeled block).
// Rendered in a single fixed-size card (cfg.overrides.QuietDrawer) so the fixed
// positioning stays inside the frame.
import { QuietDrawer, DrawerSection } from 'frontend'

// The drawer is position:fixed. In the single-mode card its nearest ancestor
// carries `transform`, which makes fixed positioning resolve against that
// (otherwise zero-height) box — so give it in-flow height to render into.
export const ObjectDetail = () => (
  <div style={{ height: 500 }}>
    <QuietDrawer open onClose={() => {}} title="Объект — Архив г.Брест">
      <DrawerSection label="Основное">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}>
          ул. Московская, 202Д
          <br />
          Филиал: Брестский
          <br />
          Инженер: Петров А.И.
        </div>
      </DrawerSection>
      <DrawerSection label="Нагрузка">
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 24,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          0.032327
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
          ФО с учётом переездов
        </div>
      </DrawerSection>
    </QuietDrawer>
  </div>
)
