/* eslint-disable no-undef */
/* ============================================================
   Screens part 1 — Login (×2), Dashboard, СВОД
   ============================================================ */

const { useState: uS1 } = React;

// ============================================================
// 01. LOGIN — Split brand pane (Quiet)
// ============================================================
function LoginSplit() {
  return (
    <div className="artboard-screen">
      <div className="split-shell">
        <div className="split-brand">
          <div>
            <div className="brand-mark">W</div>
            <h1>Plan maintenance workload across 2 935 bank objects.</h1>
            <div className="lede">
              Engineering capacity, FTE allocation and travel norms — calculated from
              physical inventory and updated nightly.
            </div>
          </div>

          <div className="kpi-strip">
            <div className="cell">
              <div className="l">Objects</div>
              <div className="v">2 935</div>
            </div>
            <div className="cell">
              <div className="l">Required FTE</div>
              <div className="v">187.42</div>
            </div>
            <div className="cell">
              <div className="l">Engineers</div>
              <div className="v">204</div>
            </div>
          </div>
        </div>

        <div className="split-form">
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>Sign in</div>
          <h2 className="t-h1" style={{ margin: '0 0 32px 0' }}>Welcome back</h2>

          <div className="field">
            <label>Email</label>
            <input defaultValue="a.korzun@bank.by" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" defaultValue="••••••••••" />
          </div>

          <div className="row between" style={{ marginBottom: 28 }}>
            <div className="checkbox checked">
              <span className="box" />
              <span>Keep me signed in</span>
            </div>
            <a className="t-small" style={{ color: 'var(--ink-3)' }}>Forgot password?</a>
          </div>

          <button className="btn primary" style={{ height: 40, width: '100%', justifyContent: 'center', fontSize: 14 }}>
            Sign in
          </button>
          <button className="btn ghost" style={{ height: 40, width: '100%', justifyContent: 'center', fontSize: 14, marginTop: 8 }}>
            Continue with corporate SSO
          </button>

          <div className="t-meta" style={{ marginTop: 36, color: 'var(--ink-4)' }}>
            Trouble signing in? Contact IT helpdesk · ext. 4242
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 02. LOGIN — Minimal (Quiet)
// ============================================================
function LoginMinimal() {
  return (
    <div className="artboard-screen" style={{
      backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      backgroundPosition: 'center center',
      display: 'grid', placeItems: 'center'
    }}>
      <div style={{
        width: 380,
        background: 'var(--bg-elev)',
        padding: '40px 36px 32px 36px',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line)'
      }}>
        <div className="row" style={{ marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--ink)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>W</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Workload</div>
        </div>

        <h2 className="t-h1" style={{ margin: '0 0 6px 0', fontSize: 22 }}>Sign in</h2>
        <div className="t-meta" style={{ marginBottom: 28 }}>Continue to the workload calculation system.</div>

        <div className="field">
          <label>Email</label>
          <input defaultValue="a.korzun@bank.by" />
        </div>
        <div className="field" style={{ marginBottom: 24 }}>
          <label>Password</label>
          <input type="password" defaultValue="••••••••••" />
        </div>

        <button className="btn primary" style={{ height: 38, width: '100%', justifyContent: 'center' }}>
          Sign in
        </button>

        <div className="row" style={{ margin: '20px 0', alignItems: 'center' }}>
          <div className="divider" style={{ flex: 1 }} />
          <span className="t-meta">or</span>
          <div className="divider" style={{ flex: 1 }} />
        </div>

        <button className="btn" style={{ height: 38, width: '100%', justifyContent: 'center' }}>
          Continue with corporate SSO
        </button>

        <div className="t-meta" style={{ marginTop: 24, color: 'var(--ink-4)', textAlign: 'center' }}>
          IT helpdesk · ext. 4242
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 03. DASHBOARD — Quiet
// ============================================================
function DashboardScreen() {
  const [drawer, setDrawer] = uS1(false);

  const divisions = [
    { name: 'Брестское',   objs: 412, fte: 26.84, gap: 0.4,  trend: [4, 5, 5, 6, 6, 7, 7, 8] },
    { name: 'Витебское',   objs: 388, fte: 24.11, gap: 0.0,  trend: [6, 6, 6, 5, 6, 6, 6, 6] },
    { name: 'Гомельское',  objs: 461, fte: 30.22, gap: 1.2,  trend: [3, 4, 5, 5, 6, 6, 7, 7] },
    { name: 'Гродненское', objs: 354, fte: 22.07, gap: 0.0,  trend: [5, 5, 5, 5, 5, 5, 5, 5] },
    { name: 'Минское',     objs: 488, fte: 31.50, gap: 0.6,  trend: [4, 5, 5, 5, 6, 6, 6, 7] },
    { name: 'Могилёвское', objs: 322, fte: 19.44, gap: 0.0,  trend: [3, 4, 4, 5, 5, 5, 6, 6] },
    { name: 'Минск гор.',  objs: 510, fte: 33.24, gap: 2.1,  trend: [5, 6, 7, 7, 7, 8, 8, 9] },
  ];

  const topObjects = [
    { id: '08-114', name: 'Гомель — Центральный филиал', fte: 1.842 },
    { id: '03-021', name: 'Минск — Партизанский 6А', fte: 1.611 },
    { id: '08-097', name: 'Светлогорск — Объект ОС-21', fte: 1.504 },
    { id: '06-211', name: 'Гродно — Дзержинского 12', fte: 1.388 },
    { id: '03-088', name: 'Минск — пр. Независимости 56', fte: 1.327 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="dashboard" />
        <main className="page" style={{ position: 'relative' }}>
          <PageHead
            crumbs={['Workload', 'Overview']}
            title="Maintenance workload"
            subtitle="Calculated nightly from physical inventory and travel norms."
            primary="Recalculate"
            onDetails
          />

          <KPIRow items={[
            { label: 'Required FTE',         value: '187.42', delta: '+2.14 vs Q3', deltaTone: 'up' },
            { label: 'Objects',              value: '2 935',  delta: '+12 this month' },
            { label: 'Coverage gaps',        value: '4.3',    delta: '3 divisions', tone: 'warn' },
            { label: 'Overloaded engineers', value: '7',      delta: '> 110% capacity', tone: 'alert' },
          ]} />

          <div className="section-block">
            <div className="section-head">
              <div className="t-section">FTE by division</div>
              <div className="meta">7 divisions · sorted by required FTE</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col">Division</th>
                  <th className="num">Objects</th>
                  <th className="num">Required FTE</th>
                  <th className="num">Coverage gap</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {divisions.map(d => (
                  <tr key={d.name}>
                    <td className="first-col">{d.name}</td>
                    <td className="num">{d.objs}</td>
                    <td className="num">{d.fte.toFixed(2)}</td>
                    <td className="num">{d.gap > 0 ? d.gap.toFixed(1) : '—'}</td>
                    <td>
                      {d.gap > 1 ? <span className="chip danger"><span className="dot danger" /> Gap</span>
                        : d.gap > 0 ? <span className="chip warn"><span className="dot warn" /> Watch</span>
                        : <span className="chip ok"><span className="dot ok" /> OK</span>}
                    </td>
                    <td className="row-trend ink-3" style={{ textAlign: 'right' }}>
                      <Spark data={d.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <div className="section-head">
              <div className="t-section">Top objects by workload</div>
              <div className="meta">Sorted by ИТОГО Числ · top 5</div>
            </div>
            <table className="table">
              <tbody>
                {topObjects.map(o => (
                  <tr key={o.id}>
                    <td className="first-col mono ink-3" style={{ width: 80 }}>{o.id}</td>
                    <td>{o.name}</td>
                    <td className="num totalcol" style={{ textAlign: 'right' }}>{o.fte.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// 04. СВОД — Consolidated
// ============================================================
function SvodScreen() {
  const divisions = ['All', 'Брестское', 'Витебское', 'Гомельское', 'Гродненское', 'Минское', 'Могилёвское', 'Минск гор.'];

  const rows = [
    { n: 1,  obj: '03-021 · Минск — Партизанский 6А',          eng: 3, pzv: 0.0421, tr: 0.0188, ps: 0.0612, vd: 0.1104, os: 0.2814, rec: 0.0091, rep: 0.0224, r1: 0.0612, r2: 0.0033, no: 0.4255, total: 1.6116 },
    { n: 2,  obj: '08-114 · Гомель — Центральный',              eng: 4, pzv: 0.0518, tr: 0.0224, ps: 0.0801, vd: 0.1280, os: 0.3242, rec: 0.0102, rep: 0.0288, r1: 0.0801, r2: 0.0044, no: 0.5040, total: 1.8421 },
    { n: 3,  obj: '08-097 · Светлогорск — ОС-21',               eng: 2, pzv: 0.0388, tr: 0.0211, ps: 0.0512, vd: 0.0941, os: 0.2477, rec: 0.0080, rep: 0.0182, r1: 0.0512, r2: 0.0028, no: 0.4112, total: 1.5044 },
    { n: 4,  obj: '06-211 · Гродно — Дзержинского 12',          eng: 3, pzv: 0.0301, tr: 0.0144, ps: 0.0488, vd: 0.0822, os: 0.2188, rec: 0.0066, rep: 0.0177, r1: 0.0488, r2: 0.0024, no: 0.3804, total: 1.3884 },
    { n: 5,  obj: '03-088 · Минск — пр. Независимости 56',      eng: 2, pzv: 0.0290, tr: 0.0124, ps: 0.0481, vd: 0.0788, os: 0.2104, rec: 0.0058, rep: 0.0162, r1: 0.0481, r2: 0.0021, no: 0.3690, total: 1.3274 },
    { n: 6,  obj: '02-044 · Витебск — К. Маркса 8',             eng: 2, pzv: 0.0280, tr: 0.0118, ps: 0.0444, vd: 0.0721, os: 0.1922, rec: 0.0050, rep: 0.0148, r1: 0.0444, r2: 0.0019, no: 0.3411, total: 1.2118 },
    { n: 7,  obj: '01-201 · Брест — Машерова 17',               eng: 2, pzv: 0.0260, tr: 0.0102, ps: 0.0388, vd: 0.0680, os: 0.1804, rec: 0.0044, rep: 0.0140, r1: 0.0388, r2: 0.0017, no: 0.3201, total: 1.1414 },
    { n: 8,  obj: '07-122 · Могилёв — Первомайская 5',          eng: 2, pzv: 0.0244, tr: 0.0098, ps: 0.0352, vd: 0.0612, os: 0.1614, rec: 0.0040, rep: 0.0124, r1: 0.0352, r2: 0.0014, no: 0.2944, total: 1.0388 },
    { n: 9,  obj: '03-118 · Минск — Сурганова 28',              eng: 2, pzv: 0.0232, tr: 0.0088, ps: 0.0322, vd: 0.0588, os: 0.1488, rec: 0.0036, rep: 0.0118, r1: 0.0322, r2: 0.0012, no: 0.2768, total: 0.9744 },
    { n:10,  obj: '05-066 · Молодечно — Притыцкого 9',          eng: 2, pzv: 0.0218, tr: 0.0080, ps: 0.0301, vd: 0.0541, os: 0.1402, rec: 0.0032, rep: 0.0102, r1: 0.0301, r2: 0.0011, no: 0.2620, total: 0.9148 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="svod" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Consolidated summary']}
            title="СВОД"
            subtitle="Consolidated workload across all objects · 2 935 rows"
            primary="Export CSV"
            onDetails
          />

          <div className="row gap-m" style={{ flexWrap: 'wrap', marginBottom: 24 }}>
            <div className="seg">
              {divisions.map((d, i) => (
                <div key={d} className={cls('pill', i === 0 && 'active')}>{d}</div>
              ))}
            </div>
          </div>
          <div className="row gap-m" style={{ marginBottom: 8 }}>
            <div className="search">
              <span className="icon">⌕</span>
              <input placeholder="Search objects, IDs, addresses…" />
              <span className="kbd-hint">⌘K</span>
            </div>
            <button className="btn">Filter</button>
            <div className="spacer" />
            <span className="t-meta">Precision: <span className="mono ink-2">2 decimals</span> · <a style={{ color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-strong)', cursor: 'pointer' }}>show full</a></span>
          </div>

          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th className="first-col" style={{ width: 30 }}>#</th>
                <th>Object</th>
                <th className="num">Eng</th>
                <th className="num">PZV</th>
                <th className="num">Travel</th>
                <th className="num">ПС</th>
                <th className="num">Видео</th>
                <th className="num">ОС</th>
                <th className="num">Records</th>
                <th className="num">Repair</th>
                <th className="num">R1</th>
                <th className="num">R2</th>
                <th className="num">FTE no tr</th>
                <th className="num">ИТОГО Числ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.n}>
                  <td className="first-col ink-3 mono">{r.n}</td>
                  <td>{r.obj}</td>
                  <td className="num ink-3">{r.eng}</td>
                  <td className="num">{r.pzv.toFixed(2)}</td>
                  <td className="num">{r.tr.toFixed(2)}</td>
                  <td className="num">{r.ps.toFixed(2)}</td>
                  <td className="num">{r.vd.toFixed(2)}</td>
                  <td className="num">{r.os.toFixed(2)}</td>
                  <td className="num">{r.rec.toFixed(2)}</td>
                  <td className="num">{r.rep.toFixed(2)}</td>
                  <td className="num">{r.r1.toFixed(2)}</td>
                  <td className="num">{r.r2.toFixed(2)}</td>
                  <td className="num">{r.no.toFixed(2)}</td>
                  <td className="num totalcol">{r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row between" style={{ marginTop: 24, color: 'var(--ink-3)', fontSize: 12 }}>
            <div>Showing <span className="mono ink-2">1–10</span> of <span className="mono ink-2">2 935</span></div>
            <div className="row gap-l">
              <span>Avg <span className="mono ink-2">0.43</span></span>
              <span>Σ page <span className="mono ink-2">12.85</span></span>
              <span>Σ all <span className="mono ink-2">187.42</span></span>
            </div>
            <div className="row gap-s">
              <button className="btn sm">‹ Prev</button>
              <span className="mono" style={{ fontSize: 12 }}>1 / 294</span>
              <button className="btn sm">Next ›</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { LoginSplit, LoginMinimal, DashboardScreen, SvodScreen });
