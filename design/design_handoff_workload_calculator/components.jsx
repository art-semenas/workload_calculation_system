/* global React */
// Shared UI primitives

const { useState, useMemo } = React;

// ---- Icons (stroke 1.5) ----
const Icon = ({ d, size = 16, fill = "none", stroke = "currentColor", sw = 1.5, children }) =>
  React.createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill,
      stroke,
      strokeWidth: sw,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    children || React.createElement("path", { d })
  );

const Icons = {
  dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></Icon>,
  building: (p) => <Icon {...p}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01"/></Icon>,
  users: (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>,
  branch: (p) => <Icon {...p}><circle cx="6" cy="3" r="2"/><circle cx="6" cy="21" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 5v14"/><path d="M6 12h10"/></Icon>,
  catalog: (p) => <Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></Icon>,
  settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>,
  bell: (p) => <Icon {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  filter: (p) => <Icon {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></Icon>,
  download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></Icon>,
  arrowUp: (p) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Icon>,
  arrowDown: (p) => <Icon {...p}><path d="M12 5v14M19 12l-7 7-7-7"/></Icon>,
  chevR: (p) => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>,
  alert: (p) => <Icon {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></Icon>,
  check: (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>,
  edit: (p) => <Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>,
  trash: (p) => <Icon {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Icon>,
  more: (p) => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>,
  shield: (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>,
  flame: (p) => <Icon {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></Icon>,
  camera: (p) => <Icon {...p}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></Icon>,
  wrench: (p) => <Icon {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Icon>,
  car: (p) => <Icon {...p}><path d="M5 17h14M7 17V9l2-4h6l2 4v8M6 13h12"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>,
  file: (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/></Icon>,
  dot: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor"/></Icon>,
  close: (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>,
};

// ---- Sparkline ----
function Sparkline({ data, w = 80, h = 28, color = "currentColor", fillOpacity = 0.12 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * (h - 2) - 1]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={area} fill={color} fillOpacity={fillOpacity} />
      <path d={line} stroke={color} strokeWidth="1.25" fill="none" />
    </svg>
  );
}

// ---- Donut ----
function Donut({ value, max = 1, size = 56, stroke = 6, color = "var(--accent)", track = "var(--bg-sunken)", label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const off = c * (1 - pct);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="round"/>
      </svg>
      {label && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--ink-2)"
        }}>{label}</div>
      )}
    </div>
  );
}

// ---- Capacity bar ----
function CapBar({ value, max = 1, width = 90 }) {
  const pct = Math.min(value / max, 1.2);
  const cls = value > max ? "danger" : value > max * 0.85 ? "warn" : "";
  return (
    <div className="cap-bar" style={{ width }}>
      <div className={`cap-fill ${cls}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
    </div>
  );
}

// ---- Status chip ----
function StatusChip({ kind = "ok", children }) {
  return <span className={`chip ${kind}`}><span className="dot"/>{children}</span>;
}

// ---- Sidebar ----
function Sidebar({ active = "dashboard" }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
    { id: "svod", label: "Summary · СВОД", icon: Icons.grid, badge: "2 935" },
    { id: "objects", label: "Objects", icon: Icons.building, badge: "2 935" },
    { id: "engineers", label: "Engineers", icon: Icons.users, badge: "148" },
    { id: "divisions", label: "Divisions", icon: Icons.branch },
  ];
  const admin = [
    { id: "catalog", label: "Device catalog", icon: Icons.catalog },
    { id: "repairs", label: "Repair types", icon: Icons.wrench },
    { id: "settings", label: "Settings", icon: Icons.settings },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">W</div>
        <div>
          <div className="brand-name">Workload
            <span className="brand-sub">Calculator · v2.24</span>
          </div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Workspace</div>
        {items.map(it => (
          <div key={it.id} className={`nav-item ${active === it.id ? "active" : ""}`}>
            <it.icon size={15} />
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Administration</div>
        {admin.map(it => (
          <div key={it.id} className={`nav-item ${active === it.id ? "active" : ""}`}>
            <it.icon size={15} />
            <span>{it.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">АП</div>
          <div>
            <div className="user-name">Алексей П.</div>
            <div className="user-role">Admin · Брестское</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---- Topbar ----
function Topbar({ crumbs = [], rightSlot }) {
  return (
    <div className="topbar">
      <div className="breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "curr" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="period-pill" style={{marginLeft: "auto"}}>
        <span className="period-dot" />
        Planning period <span className="mono" style={{color:"var(--ink)", fontWeight:500}}>H1 2026</span>
        <span style={{opacity:0.5}}>·</span>
        <span style={{color:"var(--ink-3)"}}>Jan – Jun</span>
      </div>
      {rightSlot}
      <button className="btn-icon" aria-label="search"><Icons.search size={15}/></button>
      <button className="btn-icon" aria-label="notifications" style={{position:"relative"}}>
        <Icons.bell size={15}/>
        <span style={{
          position:"absolute", top:6, right:7, width:6, height:6, borderRadius:"50%",
          background:"var(--danger)"
        }}/>
      </button>
    </div>
  );
}

Object.assign(window, { Icons, Icon, Sparkline, Donut, CapBar, StatusChip, Sidebar, Topbar });
