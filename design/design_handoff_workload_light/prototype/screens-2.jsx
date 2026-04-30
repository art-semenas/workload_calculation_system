/* eslint-disable no-undef */
/* ============================================================
   Screens part 2 — Object Detail, Engineers, Catalog
   ============================================================ */

const { useState: uS2 } = React;

// ============================================================
// 05. OBJECT DETAIL — Quiet (right rail collapsed into Drawer)
// ============================================================
function ObjectDetailScreen() {
  const [drawerOpen, setDrawerOpen] = uS2(false);
  const [tab, setTab] = uS2('equipment');

  const tabs = [
    { id: 'equipment', name: 'Equipment', count: '8 · 6' },
    { id: 'records',   name: 'Records' },
    { id: 'repairs',   name: 'Repairs' },
    { id: 'travel',    name: 'Travel' },
    { id: 'engineers', name: 'Engineers' },
  ];

  const inventory = [
    { d: 'ИК-датчик "Астра-5"',         qty: 24, sys: ['ОС'] },
    { d: 'Магнитоконтактный СМК-1',     qty: 38, sys: ['ОС'] },
    { d: 'Извещатель ДИП-3СУ',          qty: 16, sys: ['ПС'] },
    { d: 'Оповещатель "Маяк-12-КП"',    qty: 4,  sys: ['ПС'] },
    { d: 'IP-камера Hikvision DS-2CD',   qty: 12, sys: ['Видео'] },
    { d: 'Видеорегистратор NVR-32',      qty: 1,  sys: ['Видео'] },
    { d: 'Прибор приёмно-контрольный',   qty: 1,  sys: ['ОС', 'ПС'] },
    { d: 'Кнопка тревожной сигнализации', qty: 6, sys: ['ОС'] },
  ];

  const assignments = [
    { d: 'ИК-датчик "Астра-5"',         sys: 'ОС',    qty: 24, r1: 0.0044, r2: 0.0008, contrib: 0.114 },
    { d: 'Магнитоконтактный СМК-1',     sys: 'ОС',    qty: 38, r1: 0.0028, r2: 0.0004, contrib: 0.124 },
    { d: 'Извещатель ДИП-3СУ',          sys: 'ПС',    qty: 16, r1: 0.0061, r2: 0.0011, contrib: 0.108 },
    { d: 'Оповещатель "Маяк-12-КП"',    sys: 'ПС',    qty: 4,  r1: 0.0044, r2: 0.0007, contrib: 0.020 },
    { d: 'IP-камера Hikvision',          sys: 'Видео', qty: 12, r1: 0.0080, r2: 0.0014, contrib: 0.110 },
    { d: 'Видеорегистратор NVR-32',      sys: 'Видео', qty: 1,  r1: 0.0260, r2: 0.0040, contrib: 0.030 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="objects" />
        <main className="page" style={{ position: 'relative', maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Objects', 'Минск гор.', '03-021']}
            title="Минск — Партизанский 6А"
            subtitle="Отделение №217 · Минск гор. · обслуживается с 2014"
            primary="Edit object"
          />

          <div className="row" style={{ marginTop: -16, marginBottom: 28, gap: 8 }}>
            <span className="chip">Tier-2 office</span>
            <span className="mono ink-3" style={{ fontSize: 12 }}>03-021</span>
            <div className="spacer" />
            <button className="btn" onClick={() => setDrawerOpen(true)}>FTE breakdown ›</button>
          </div>

          {/* Inline summary strip — replaces the right rail's KPI feel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr',
            borderTop: '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
            marginBottom: 36,
          }}>
            <div style={{ padding: '20px 24px 20px 0' }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>ИТОГО Числ</div>
              <div className="mono" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1 }}>1.611624</div>
              <div className="t-meta" style={{ marginTop: 8, color: 'var(--ink-4)' }}>full precision</div>
            </div>
            {[
              { l: 'FTE no travel', v: '0.43' },
              { l: 'Travel',        v: '0.02' },
              { l: 'Engineers',     v: '3' },
              { l: 'Visits / yr',   v: '24' },
            ].map(k => (
              <div key={k.l} style={{ padding: '20px 0 20px 24px', borderLeft: '1px solid var(--line)' }}>
                <div className="t-eyebrow" style={{ marginBottom: 10 }}>{k.l}</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--line)', marginBottom: 32 }}>
            {tabs.map(t => (
              <div key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  paddingBottom: 12,
                  marginBottom: -1,
                  cursor: 'pointer',
                  borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
                  color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: tab === t.id ? 500 : 400,
                  fontSize: 13,
                }}>
                {t.name}
                {t.count && <span className="mono ink-4" style={{ marginLeft: 8, fontSize: 11 }}>{t.count}</span>}
              </div>
            ))}
          </div>

          {/* Equipment — section A */}
          <div className="section-block" style={{ marginTop: 0 }}>
            <div className="section-head">
              <div className="t-section">A · Physical inventory</div>
              <div className="meta">8 device types · 102 units total</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col">Device</th>
                  <th className="num">Qty physical</th>
                  <th>Assigned to systems</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((r, i) => (
                  <tr key={i}>
                    <td className="first-col">{r.d}</td>
                    <td className="num">{r.qty}</td>
                    <td className="ink-3">{r.sys.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section B */}
          <div className="section-block">
            <div className="section-head">
              <div className="t-section">B · System assignments</div>
              <div className="meta">6 entries · per-visit contribution</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col">Device</th>
                  <th>System</th>
                  <th className="num">Qty maintained</th>
                  <th className="num">R1</th>
                  <th className="num">R2</th>
                  <th className="num">Contribution / visit</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((r, i) => (
                  <tr key={i}>
                    <td className="first-col">{r.d}</td>
                    <td className="ink-3">{r.sys}</td>
                    <td className="num">{r.qty}</td>
                    <td className="num">{r.r1.toFixed(4)}</td>
                    <td className="num">{r.r2.toFixed(4)}</td>
                    <td className="num totalcol">{r.contrib.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Drawer open={drawerOpen} title="FTE breakdown" onClose={() => setDrawerOpen(false)}>
            <div className="hero-card">
              <div className="label">ИТОГО Числ</div>
              <div className="hero-num">1.611624</div>
              <div className="sub">
                <div>
                  <div className="k">FTE no travel</div>
                  <div className="v">0.4255</div>
                </div>
                <div>
                  <div className="k">Travel</div>
                  <div className="v">0.0188</div>
                </div>
                <div>
                  <div className="k">PZV</div>
                  <div className="v">0.0421</div>
                </div>
                <div>
                  <div className="k">R1 / R2</div>
                  <div className="v">0.06 / 0.00</div>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <div className="t-section" style={{ marginBottom: 16 }}>By system · monthly avg</div>
              {[
                { name: 'ОС',    val: 0.281, pct: 60 },
                { name: 'ПС',    val: 0.061, pct: 14 },
                { name: 'Видео', val: 0.110, pct: 25 },
              ].map(s => (
                <div key={s.name} style={{ marginBottom: 14 }}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span className="t-small">{s.name}</span>
                    <span className="mono" style={{ fontSize: 12 }}>{s.val.toFixed(3)}</span>
                  </div>
                  <div className="track" style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--ink)' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="drawer-section">
              <div className="t-section" style={{ marginBottom: 16 }}>Per-visit breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                <div>
                  <div className="t-meta">PZV</div>
                  <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>0.0421</div>
                </div>
                <div>
                  <div className="t-meta">Travel</div>
                  <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>0.0188</div>
                </div>
                <div>
                  <div className="t-meta">Records</div>
                  <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>0.0091</div>
                </div>
                <div>
                  <div className="t-meta">Repair</div>
                  <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>0.0224</div>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <div className="t-section" style={{ marginBottom: 12 }}>Assigned engineers</div>
              {[
                { n: 'Сергей Лагун',    pct: 88 },
                { n: 'Андрей Кузьмич',  pct: 102 },
                { n: 'Олег Шевчук',     pct: 71 },
              ].map(e => (
                <div key={e.n} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className="t-small">{e.n}</span>
                  <CapBar pct={e.pct} />
                </div>
              ))}
            </div>
          </Drawer>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// 06. ENGINEERS — Quiet (refactored from user's MUI implementation)
// ============================================================
function EngineersScreen() {
  const dist = [
    { tone: 'ok',     w: 64, label: 'Normal',     count: 142 },
    { tone: 'warn',   w: 22, label: 'Watch',      count: 48  },
    { tone: 'danger', w: 8,  label: 'Overloaded', count: 14 },
  ];

  const engineers = [
    { name: 'Андрей Кузьмич',  email: 'a.kuzmich@bank.by',   div: 'Минск гор.',  objs: 14, fte: 1.94, cap: 1.90, util: 102, status: 'OVERLOADED' },
    { name: 'Сергей Лагун',    email: 's.lagun@bank.by',     div: 'Минск гор.',  objs: 12, fte: 1.68, cap: 1.90, util: 88,  status: 'NORMAL' },
    { name: 'Олег Шевчук',     email: 'o.shevchuk@bank.by',  div: 'Минск гор.',  objs: 10, fte: 1.34, cap: 1.90, util: 71,  status: 'NORMAL' },
    { name: 'Виктор Прышчэп',  email: 'v.pryshchep@bank.by', div: 'Гомельское',  objs: 13, fte: 1.81, cap: 1.90, util: 95,  status: 'WARNING' },
    { name: 'Алесь Сасноўскі', email: 'a.sasnouski@bank.by', div: 'Брестское',   objs: 11, fte: 1.42, cap: 1.90, util: 75,  status: 'NORMAL' },
    { name: 'Юрый Малахоўскі', email: 'y.malahousky@bank.by', div: 'Витебское',  objs: 12, fte: 1.55, cap: 1.90, util: 82,  status: 'NORMAL' },
    { name: 'Дзяніс Хадасок',  email: 'd.hadasok@bank.by',   div: 'Гродненское', objs: 14, fte: 1.84, cap: 1.90, util: 97,  status: 'WARNING' },
    { name: 'Павел Чарняўскі', email: 'p.charniausky@bank.by', div: 'Минское',   objs: 11, fte: 1.39, cap: 1.90, util: 73,  status: 'NORMAL' },
    { name: 'Аляксей Трацяк',  email: 'a.tratsiak@bank.by',  div: 'Могилёвское', objs: 9,  fte: 1.21, cap: 1.90, util: 64,  status: 'NORMAL' },
    { name: 'Раман Лазоўскі',  email: 'r.lazousky@bank.by',  div: 'Минск гор.',  objs: 16, fte: 2.10, cap: 1.90, util: 110, status: 'OVERLOADED' },
  ];

  const statusChip = (s, util) => {
    if (s === 'OVERLOADED') return <span className="chip danger"><span className="dot danger" /> {util}%</span>;
    if (s === 'WARNING')    return <span className="chip warn"><span className="dot warn" /> {util}%</span>;
    return <span className="chip ok"><span className="dot ok" /> {util}%</span>;
  };

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="engineers" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Engineers']}
            title="Engineers"
            subtitle="204 engineers · capacity FTE 1.90 default"
            primary="Create engineer"
          />

          {/* Distribution */}
          <div className="section-block" style={{ marginTop: 0 }}>
            <div className="section-head">
              <div className="t-section">Capacity distribution</div>
              <div className="meta">204 engineers</div>
            </div>
            <div className="dist-bar">
              {dist.map(d => (
                <div key={d.label} className="seg-dist" style={{
                  width: `${d.w}%`,
                  background: d.tone === 'ok' ? 'var(--ok)' : d.tone === 'warn' ? 'var(--warn)' : 'var(--danger)',
                }} />
              ))}
            </div>
            <div className="row gap-l" style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>
              {dist.map(d => (
                <div key={d.label} className="row gap-s">
                  <span className={`dot ${d.tone}`} />
                  <span>{d.label}</span>
                  <span className="mono ink-2">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter row */}
          <div className="row gap-m" style={{ marginTop: 32, marginBottom: 8 }}>
            <div className="search">
              <span className="icon">⌕</span>
              <input placeholder="Search by name…" />
            </div>
            <select className="input" style={{ minWidth: 180 }}>
              <option>All divisions</option>
              <option>Минск гор.</option>
              <option>Брестское</option>
            </select>
            <select className="input" style={{ minWidth: 160 }}>
              <option>All statuses</option>
              <option>Normal</option>
              <option>Watch</option>
              <option>Overloaded</option>
            </select>
            <div className="spacer" />
            <span className="t-meta">Showing <span className="mono ink-2">10</span> of <span className="mono ink-2">204</span></span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th className="first-col">Engineer</th>
                <th>Division</th>
                <th className="num">Objects</th>
                <th className="num">FTE load</th>
                <th className="num">Capacity</th>
                <th>Utilisation</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {engineers.map(e => (
                <tr key={e.email}>
                  <td className="first-col">
                    <div style={{ color: 'var(--ink)' }}>{e.name}</div>
                    <div className="t-meta" style={{ color: 'var(--ink-4)', fontSize: 11 }}>{e.email}</div>
                  </td>
                  <td className="ink-3">{e.div}</td>
                  <td className="num">{e.objs}</td>
                  <td className="num">{e.fte.toFixed(2)}</td>
                  <td className="num ink-3">{e.cap.toFixed(2)}</td>
                  <td><CapBar pct={e.util} /></td>
                  <td>{statusChip(e.status, e.util)}</td>
                  <td className="ink-4" style={{ textAlign: 'right' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// 07. DEVICE CATALOG — Quiet (master/detail kept; colors retained in detail)
// ============================================================
function CatalogScreen() {
  const [sel, setSel] = uS2(2);

  const devices = [
    { d: 'ИК-датчик "Астра-5"',          sys: ['ОС'],         uses: 1842 },
    { d: 'Магнитоконтактный СМК-1',      sys: ['ОС'],         uses: 2104 },
    { d: 'Извещатель ДИП-3СУ',           sys: ['ПС'],         uses: 1241 },
    { d: 'Оповещатель "Маяк-12-КП"',     sys: ['ПС'],         uses: 922 },
    { d: 'IP-камера Hikvision DS-2CD',    sys: ['Видео'],      uses: 1644 },
    { d: 'Видеорегистратор NVR-32',       sys: ['Видео'],      uses: 487 },
    { d: 'Прибор приёмно-контрольный',    sys: ['ОС', 'ПС'],  uses: 612 },
    { d: 'Кнопка тревожной сигнализации', sys: ['ОС'],         uses: 1188 },
    { d: 'Дымовой извещатель ИП-212',     sys: ['ПС'],         uses: 1577 },
    { d: 'Оптический датчик OD-44',       sys: ['Видео'],      uses: 312 },
  ];

  const current = devices[sel];

  const sysColor = (s) =>
    s === 'ОС' ? 'accent' : s === 'ПС' ? 'warn' : s === 'Видео' ? 'ok' : '';

  const history = [
    { date: '2025-09', r1: 0.0061, r2: 0.0011, by: 'A. Korzun', note: 'Updated per Минск region audit' },
    { date: '2024-04', r1: 0.0058, r2: 0.0010, by: 'D. Marozaŭ', note: 'Annual revision' },
    { date: '2023-02', r1: 0.0055, r2: 0.0009, by: 'D. Marozaŭ', note: 'Initial value' },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'hidden' }}>
      <div className="app-shell" style={{ height: '100%' }}>
        <Sidebar active="catalog" />
        <main style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: '100%', overflow: 'hidden' }}>
          {/* Master list */}
          <div style={{ borderRight: '1px solid var(--line)', overflow: 'auto', padding: '32px 0 32px 0' }}>
            <div style={{ padding: '0 28px 20px 28px' }}>
              <div className="t-section" style={{ marginBottom: 8 }}>Device catalog</div>
              <div className="search" style={{ width: '100%' }}>
                <span className="icon">⌕</span>
                <input placeholder="Search devices…" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              {devices.map((d, i) => (
                <div key={i}
                  onClick={() => setSel(i)}
                  style={{
                    padding: '14px 28px',
                    cursor: 'pointer',
                    borderLeft: sel === i ? '2px solid var(--ink)' : '2px solid transparent',
                    background: sel === i ? 'var(--bg-elev)' : 'transparent',
                  }}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <div style={{ color: sel === i ? 'var(--ink)' : 'var(--ink-2)', fontSize: 13, fontWeight: sel === i ? 500 : 400 }}>{d.d}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{d.uses}</div>
                  </div>
                  <div className="row gap-s">
                    {d.sys.map(s => (
                      <span key={s} className="t-meta" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div style={{ overflow: 'auto', padding: '36px 48px 80px 48px' }}>
            <div className="breadcrumb">Catalog <span className="sep">/</span> {current.sys[0]}</div>
            <div className="row gap-s" style={{ marginTop: 4, marginBottom: 6 }}>
              {current.sys.map(s => (
                <span key={s} className={`chip ${sysColor(s)}`}>{s}</span>
              ))}
            </div>
            <h1 style={{ margin: '6px 0 6px 0', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {current.d}
            </h1>
            <div className="t-meta">Used on <span className="mono ink-2">{current.uses}</span> objects</div>

            <div className="section-block">
              <div className="t-section" style={{ marginBottom: 16 }}>Per-system norms</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
                {current.sys.map(s => (
                  <div key={s}>
                    <div className="row gap-s" style={{ marginBottom: 12 }}>
                      <span className={`chip ${sysColor(s)}`}>{s}</span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="t-meta">R1 (per device · year)</div>
                      <div className="mono" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 2 }}>0.0061</div>
                    </div>
                    <div>
                      <div className="t-meta">R2 (per visit)</div>
                      <div className="mono" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 2 }}>0.0011</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-block">
              <div className="section-head">
                <div className="t-section">Normative history</div>
                <div className="meta">3 revisions</div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th className="first-col">Effective</th>
                    <th className="num">R1</th>
                    <th className="num">R2</th>
                    <th>Updated by</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td className="first-col mono">{h.date}</td>
                      <td className="num">{h.r1.toFixed(4)}</td>
                      <td className="num">{h.r2.toFixed(4)}</td>
                      <td className="ink-3">{h.by}</td>
                      <td className="ink-3">{h.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { ObjectDetailScreen, EngineersScreen, CatalogScreen });
