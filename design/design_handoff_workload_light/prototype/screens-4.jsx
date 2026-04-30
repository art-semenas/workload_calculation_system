/* eslint-disable no-undef */
/* ============================================================
   Screens part 4 — Object list, Engineer detail, Division detail,
                    Branch detail, Object-detail sub-tabs
   ============================================================ */

const { useState: uS4 } = React;

// ============================================================
// 11. OBJECT LIST
// ============================================================
function ObjectListScreen() {
  const objects = [
    { id: '03-021', name: 'Минск — Партизанский 6А',         div: 'Минск гор.', branch: 'ф-217', tier: 'Tier-2 office',     fte: 1.61, eng: 3 },
    { id: '08-114', name: 'Гомель — Центральный филиал',     div: 'Гомельское', branch: 'ф-101', tier: 'Tier-1 branch',     fte: 1.84, eng: 4 },
    { id: '08-097', name: 'Светлогорск — Объект ОС-21',      div: 'Гомельское', branch: 'ф-104', tier: 'Tier-2 office',     fte: 1.50, eng: 2 },
    { id: '06-211', name: 'Гродно — Дзержинского 12',        div: 'Гродненское', branch: 'ф-061', tier: 'Tier-2 office',    fte: 1.39, eng: 3 },
    { id: '03-088', name: 'Минск — пр. Независимости 56',    div: 'Минск гор.', branch: 'ф-218', tier: 'Tier-1 branch',     fte: 1.33, eng: 2 },
    { id: '02-044', name: 'Витебск — К. Маркса 8',           div: 'Витебское', branch: 'ф-021', tier: 'Tier-2 office',      fte: 1.21, eng: 2 },
    { id: '03-021-A', name: 'Минск — Банкомат пр. Победителей', div: 'Минск гор.', branch: 'ф-217', tier: 'ATM',           fte: 0.18, eng: 1 },
    { id: '01-201', name: 'Брест — Машерова 17',             div: 'Брестское',  branch: 'ф-011', tier: 'Tier-1 branch',     fte: 1.14, eng: 2 },
    { id: '07-122', name: 'Могилёв — Первомайская 5',        div: 'Могилёвское', branch: 'ф-071', tier: 'Tier-2 office',    fte: 1.04, eng: 2 },
    { id: '03-118', name: 'Минск — Сурганова 28',            div: 'Минск гор.',  branch: 'ф-219', tier: 'Currency exchange', fte: 0.97, eng: 2 },
  ];

  const tierChip = (t) => {
    if (t === 'Tier-1 branch')     return <span className="chip">{t}</span>;
    if (t === 'Tier-2 office')     return <span className="chip ghost ink-3">{t}</span>;
    if (t === 'ATM')               return <span className="chip ghost ink-3">{t}</span>;
    return <span className="chip ghost ink-3">{t}</span>;
  };

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="objects" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Operations', 'Objects']}
            title="Objects"
            subtitle="2 935 objects across 7 divisions"
            primary="Create object"
          />

          <div className="row gap-m" style={{ marginBottom: 24 }}>
            <div className="search">
              <span className="icon">⌕</span>
              <input placeholder="Search by name, ID, address…" />
              <span className="kbd-hint">⌘K</span>
            </div>
            <select className="input" style={{ minWidth: 180 }}>
              <option>All divisions</option>
            </select>
            <select className="input" style={{ minWidth: 160 }}>
              <option>All tiers</option>
              <option>Tier-1 branch</option>
              <option>Tier-2 office</option>
              <option>ATM</option>
              <option>Currency exchange</option>
            </select>
            <select className="input" style={{ minWidth: 160 }}>
              <option>All branches</option>
            </select>
            <div className="spacer" />
            <span className="t-meta">Showing <span className="mono ink-2">10</span> of <span className="mono ink-2">2 935</span></span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th className="first-col" style={{ width: 100 }}>ID</th>
                <th>Object</th>
                <th>Division</th>
                <th>Branch</th>
                <th>Tier</th>
                <th className="num">FTE</th>
                <th className="num">Engineers</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {objects.map(o => (
                <tr key={o.id}>
                  <td className="first-col mono ink-3">{o.id}</td>
                  <td>{o.name}</td>
                  <td className="ink-3">{o.div}</td>
                  <td className="ink-3 mono">{o.branch}</td>
                  <td>{tierChip(o.tier)}</td>
                  <td className="num totalcol">{o.fte.toFixed(2)}</td>
                  <td className="num">{o.eng}</td>
                  <td className="ink-4" style={{ textAlign: 'right' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row between" style={{ marginTop: 24, color: 'var(--ink-3)', fontSize: 12 }}>
            <div>Showing <span className="mono ink-2">1–10</span> of <span className="mono ink-2">2 935</span></div>
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

// ============================================================
// 12. ENGINEER DETAIL
// ============================================================
function EngineerDetailScreen() {
  const objs = [
    { id: '03-021', name: 'Минск — Партизанский 6А',     fte: 0.42, share: 26 },
    { id: '03-088', name: 'Минск — пр. Независимости 56', fte: 0.38, share: 24 },
    { id: '03-118', name: 'Минск — Сурганова 28',        fte: 0.31, share: 19 },
    { id: '03-021-A', name: 'Банкомат пр. Победителей',  fte: 0.18, share: 11 },
    { id: '03-201', name: 'Минск — пер. Калинина 4',     fte: 0.14, share: 9 },
    { id: '03-301', name: 'Минск — Революционная 7',     fte: 0.11, share: 7 },
    { id: '03-411', name: 'Минск — ул. Энгельса 31',     fte: 0.07, share: 4 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="engineers" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Engineers', 'Минск гор.', 'Андрей Кузьмич']}
            title="Андрей Кузьмич"
            subtitle="a.kuzmich@bank.by · Минск гор. · since 2018"
            primary="Edit engineer"
          />

          <div className="row" style={{ marginTop: -8, marginBottom: 28, gap: 12, alignItems: 'center' }}>
            <Initials name="Андрей Кузьмич" lg />
            <span className="chip danger"><span className="dot danger" /> 102%</span>
            <span className="t-meta">Overloaded · 7 objects exceed sustainable load</span>
            <div className="spacer" />
            <button className="btn">Reassign objects</button>
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
            marginBottom: 36,
          }}>
            {[
              { l: 'FTE load',    v: '1.94', tone: 'alert' },
              { l: 'Capacity',    v: '1.90' },
              { l: 'Utilisation', v: '102%', tone: 'alert' },
              { l: 'Objects',     v: '14' },
              { l: 'Divisions',   v: '1' },
            ].map((k, i) => (
              <div key={k.l} style={{ padding: '20px 24px', borderLeft: i === 0 ? 'none' : '1px solid var(--line)', paddingLeft: i === 0 ? 0 : 24 }}>
                <div className="t-eyebrow" style={{ marginBottom: 10 }}>{k.l}</div>
                <div className="mono" style={{
                  fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em',
                  color: k.tone === 'alert' ? 'var(--danger)' : 'var(--ink)',
                }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* By system breakdown */}
          <div className="section-block" style={{ marginTop: 0 }}>
            <div className="section-head">
              <div className="t-section">FTE by system</div>
              <div className="meta">monthly average</div>
            </div>
            {[
              { name: 'ОС',    val: 1.04, pct: 54 },
              { name: 'ПС',    val: 0.46, pct: 24 },
              { name: 'Видео', val: 0.44, pct: 22 },
            ].map(s => (
              <div key={s.name} style={{ marginBottom: 14 }}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span className="t-small">{s.name}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{s.val.toFixed(2)} · {s.pct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--ink)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Assigned objects */}
          <div className="section-block">
            <div className="section-head">
              <div className="t-section">Assigned objects</div>
              <div className="meta">14 objects · sorted by FTE share</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col" style={{ width: 100 }}>ID</th>
                  <th>Object</th>
                  <th className="num">FTE share</th>
                  <th className="num">% of total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {objs.map(o => (
                  <tr key={o.id}>
                    <td className="first-col mono ink-3">{o.id}</td>
                    <td>{o.name}</td>
                    <td className="num totalcol">{o.fte.toFixed(2)}</td>
                    <td className="num ink-3">{o.share}%</td>
                    <td className="ink-4" style={{ textAlign: 'right' }}>›</td>
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
// 13. DIVISION DETAIL
// ============================================================
function DivisionDetailScreen() {
  const branches = [
    { code: 'ф-217', name: 'Минск — Партизанский',        objs: 144, eng: 12, fte: 9.42 },
    { code: 'ф-218', name: 'Минск — Независимости',        objs: 112, eng: 8,  fte: 7.10 },
    { code: 'ф-219', name: 'Минск — Сурганова',            objs: 98,  eng: 7,  fte: 6.18 },
    { code: 'ф-220', name: 'Минск — Калинина',             objs: 81,  eng: 6,  fte: 4.84 },
    { code: 'ф-221', name: 'Минск — Энгельса',             objs: 75,  eng: 8,  fte: 5.70 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="divisions" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Reference', 'Divisions', 'Минск гор.']}
            title="Минск гор."
            subtitle="MNG · Headed by Anna Korzun · since 2010"
            primary="Edit division"
          />

          <KPIRow items={[
            { label: 'Objects',      value: '510' },
            { label: 'Engineers',    value: '41' },
            { label: 'Required FTE', value: '33.24' },
            { label: 'Utilisation',  value: '104%', tone: 'alert', delta: 'over capacity' },
          ]} />

          <div className="section-block">
            <div className="section-head">
              <div className="t-section">Branches</div>
              <div className="meta">5 branches · sorted by required FTE</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col" style={{ width: 80 }}>Code</th>
                  <th>Branch</th>
                  <th className="num">Objects</th>
                  <th className="num">Engineers</th>
                  <th className="num">FTE req.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.code}>
                    <td className="first-col mono ink-3">{b.code}</td>
                    <td>{b.name}</td>
                    <td className="num">{b.objs}</td>
                    <td className="num">{b.eng}</td>
                    <td className="num totalcol">{b.fte.toFixed(2)}</td>
                    <td className="ink-4" style={{ textAlign: 'right' }}>›</td>
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
// 14. BRANCH DETAIL
// ============================================================
function BranchDetailScreen() {
  const objs = [
    { id: '03-021', name: 'Минск — Партизанский 6А',         tier: 'Tier-2 office', fte: 1.61 },
    { id: '03-022', name: 'Минск — Партизанский 14',         tier: 'Tier-2 office', fte: 1.42 },
    { id: '03-023', name: 'Минск — Партизанский 22',         tier: 'ATM',           fte: 0.18 },
    { id: '03-024', name: 'Минск — Партизанский 31',         tier: 'Tier-2 office', fte: 1.10 },
    { id: '03-025', name: 'Минск — Партизанский 44',         tier: 'Currency exchange', fte: 0.97 },
    { id: '03-026', name: 'Минск — Партизанский 60',         tier: 'Tier-2 office', fte: 1.05 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="divisions" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Reference', 'Divisions', 'Минск гор.', 'ф-217']}
            title="Минск — Партизанский"
            subtitle="ф-217 · Минск гор. · 144 objects"
            primary="Edit branch"
          />

          <KPIRow items={[
            { label: 'Objects',      value: '144' },
            { label: 'Engineers',    value: '12' },
            { label: 'Required FTE', value: '9.42' },
            { label: 'Avg per obj',  value: '0.07' },
          ]} />

          <div className="section-block">
            <div className="section-head">
              <div className="t-section">Objects in this branch</div>
              <div className="meta">showing 6 of 144</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col" style={{ width: 100 }}>ID</th>
                  <th>Object</th>
                  <th>Tier</th>
                  <th className="num">FTE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {objs.map(o => (
                  <tr key={o.id}>
                    <td className="first-col mono ink-3">{o.id}</td>
                    <td>{o.name}</td>
                    <td className="ink-3">{o.tier}</td>
                    <td className="num totalcol">{o.fte.toFixed(2)}</td>
                    <td className="ink-4" style={{ textAlign: 'right' }}>›</td>
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

Object.assign(window, { ObjectListScreen, EngineerDetailScreen, DivisionDetailScreen, BranchDetailScreen });
