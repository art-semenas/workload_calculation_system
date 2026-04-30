/* eslint-disable no-undef */
/* ============================================================
   Components — Quiet direction
   ============================================================
   Sidebar, KPIRow, PageHead, Drawer, Table, CapBar, etc.
   Exported to window for cross-script access.
   ============================================================ */

const { useState } = React;

// ---------- helpers ----------
const cls = (...xs) => xs.filter(Boolean).join(' ');

function Initials({ name, lg }) {
  const i = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return <span className={cls('avatar', lg && 'lg')}>{i}</span>;
}

// ---------- Sidebar (text-only, no icons, no badges) ----------
function Sidebar({ active }) {
  const sections = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'svod', name: 'Consolidated' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'objects', name: 'Objects' },
        { id: 'engineers', name: 'Engineers' },
        { id: 'catalog', name: 'Device catalog' },
      ],
    },
    {
      label: 'Reference',
      items: [
        { id: 'divisions', name: 'Divisions' },
        { id: 'norms', name: 'Norms & rates' },
        { id: 'audit', name: 'Audit log' },
      ],
    },
  ];

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="brand">
        <div className="mark">W</div>
        <div className="name">Workload</div>
      </div>

      {sections.map(s => (
        <div className="nav-section" key={s.label}>
          <div className="nav-label">{s.label}</div>
          {s.items.map(it => (
            <div key={it.id} className={cls('nav-item', active === it.id && 'active')}>
              {it.name}
            </div>
          ))}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div className="user-chip">
        <Initials name="Anna Korzun" />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Anna Korzun</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Минск гор.</div>
        </div>
      </div>
    </aside>
  );
}

// ---------- Page head (breadcrumb folded in, period in actions) ----------
function PageHead({ crumbs, title, subtitle, period, onDetails, primary }) {
  return (
    <div className="page-head">
      {crumbs && crumbs.length > 0 && (
        <div className="breadcrumb">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              <span>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="title-row">
        <div>
          <h1>{title}</h1>
          {subtitle && <div className="subtitle">{subtitle}</div>}
        </div>
        <div className="actions">
          {period && (
            <div className="seg" style={{ background: 'transparent', padding: 0, border: '1px solid var(--line)', borderRadius: 'var(--r-pill)' }}>
              <div className="pill">FY25</div>
              <div className="pill active">FY26</div>
              <div className="pill">Q-by-Q</div>
            </div>
          )}
          {onDetails && (
            <button className="btn">Details ›</button>
          )}
          {primary && (
            <button className="btn primary">{primary}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- KPI row (hairline-separated, no boxes) ----------
function KPIRow({ items }) {
  return (
    <div className="kpi-row">
      {items.map((it, i) => (
        <div key={i} className={cls('kpi-cell', it.tone)}>
          <div className="label">{it.label}</div>
          <div className="value">{it.value}</div>
          {it.delta && <div className={cls('delta', it.deltaTone)}>{it.delta}</div>}
        </div>
      ))}
    </div>
  );
}

// ---------- CapBar ----------
function CapBar({ pct, tone }) {
  const safe = Math.min(pct, 130);
  const cls2 = pct > 100 ? 'danger' : pct > 90 ? 'warn' : '';
  return (
    <div className="capbar">
      <div className="track">
        <div className={cls('fill', tone || cls2)} style={{ width: `${Math.min(safe, 100)}%` }} />
      </div>
      <div className="pct">{pct}%</div>
    </div>
  );
}

// ---------- Drawer ----------
function Drawer({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-scrim" />
      <div className="drawer">
        <div className="drawer-head">
          <h3>{title}</h3>
          <div className="close" onClick={onClose}>×</div>
        </div>
        {children}
      </div>
    </>
  );
}

// ---------- Sparkline ----------
function Spark({ data }) {
  const w = 64, h = 18;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

Object.assign(window, { Sidebar, PageHead, KPIRow, CapBar, Drawer, Spark, Initials, cls });
