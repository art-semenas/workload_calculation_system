/* eslint-disable no-undef */
/* ============================================================
   Screens part 5 — Object detail sub-tabs (Records, Repairs, Travel, Engineers)
                  + Create Division dialog + Create Branch dialog
   ============================================================ */

const { useState: uS5 } = React;

function _ObjectDetailShell({ tabId, children }) {
  const tabs = [
    { id: 'equipment', name: 'Equipment', count: '8 · 6' },
    { id: 'records',   name: 'Records',   count: '24 / yr' },
    { id: 'repairs',   name: 'Repairs',   count: '7' },
    { id: 'travel',    name: 'Travel' },
    { id: 'engineers', name: 'Engineers', count: '3' },
  ];
  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="objects" />
        <main className="page" style={{ maxWidth: 'none' }}>
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
            <button className="btn">FTE breakdown ›</button>
          </div>
          <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--line)', marginBottom: 32 }}>
            {tabs.map(t => (
              <div key={t.id} style={{
                paddingBottom: 12, marginBottom: -1,
                borderBottom: tabId === t.id ? '2px solid var(--ink)' : '2px solid transparent',
                color: tabId === t.id ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: tabId === t.id ? 500 : 400, fontSize: 13,
              }}>
                {t.name}
                {t.count && <span className="mono ink-4" style={{ marginLeft: 8, fontSize: 11 }}>{t.count}</span>}
              </div>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// 15. OBJECT DETAIL — Records tab
// ============================================================
function ObjectRecordsTab() {
  const rows = [
    { date: '2026-04-12', type: 'ТО-1',     eng: 'Андрей Кузьмич',  hrs: 1.50, note: 'Плановое техническое обслуживание' },
    { date: '2026-03-14', type: 'ТО-2',     eng: 'Сергей Лагун',    hrs: 2.25, note: 'Замена ИК-датчика #4' },
    { date: '2026-02-18', type: 'ТО-1',     eng: 'Андрей Кузьмич',  hrs: 1.40, note: '—' },
    { date: '2026-01-21', type: 'ТО-1',     eng: 'Олег Шевчук',     hrs: 1.55, note: '—' },
    { date: '2025-12-09', type: 'Inspection', eng: 'Андрей Кузьмич', hrs: 0.75, note: 'Annual audit' },
    { date: '2025-11-12', type: 'ТО-1',     eng: 'Сергей Лагун',    hrs: 1.45, note: '—' },
  ];
  return (
    <_ObjectDetailShell tabId="records">
      <div className="section-block" style={{ marginTop: 0 }}>
        <div className="section-head">
          <div className="t-section">Maintenance records</div>
          <div className="meta">24 records / year · showing 6 most recent</div>
        </div>
        <table className="table">
          <thead><tr>
            <th className="first-col" style={{ width: 120 }}>Date</th>
            <th>Type</th><th>Engineer</th>
            <th className="num">Hours</th>
            <th>Note</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="first-col mono ink-2">{r.date}</td>
                <td>{r.type}</td>
                <td className="ink-3">{r.eng}</td>
                <td className="num">{r.hrs.toFixed(2)}</td>
                <td className="ink-3">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </_ObjectDetailShell>
  );
}

// ============================================================
// 16. OBJECT DETAIL — Repairs tab
// ============================================================
function ObjectRepairsTab() {
  const rows = [
    { date: '2026-03-22', sys: 'ОС',    desc: 'Замена ИК-датчика "Астра-5" #4',    eng: 'Сергей Лагун',   hrs: 1.20, status: 'closed' },
    { date: '2026-02-04', sys: 'Видео', desc: 'Калибровка IP-камеры зала 2',        eng: 'Андрей Кузьмич', hrs: 0.85, status: 'closed' },
    { date: '2026-01-30', sys: 'ПС',    desc: 'Заменён извещатель ДИП-3СУ #7',     eng: 'Олег Шевчук',    hrs: 1.10, status: 'closed' },
    { date: '2025-12-18', sys: 'ОС',    desc: 'Восстановление шлейфа охраны',      eng: 'Сергей Лагун',   hrs: 2.40, status: 'closed' },
    { date: '2025-11-05', sys: 'Видео', desc: 'Замена жёсткого диска NVR-32',       eng: 'Андрей Кузьмич', hrs: 1.65, status: 'closed' },
  ];
  return (
    <_ObjectDetailShell tabId="repairs">
      <div className="section-block" style={{ marginTop: 0 }}>
        <div className="section-head">
          <div className="t-section">Repair history</div>
          <div className="meta">7 entries · last 12 months</div>
        </div>
        <table className="table">
          <thead><tr>
            <th className="first-col" style={{ width: 110 }}>Date</th>
            <th>System</th>
            <th>Description</th>
            <th>Engineer</th>
            <th className="num">Hours</th>
            <th>Status</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="first-col mono ink-2">{r.date}</td>
                <td className="ink-3">{r.sys}</td>
                <td>{r.desc}</td>
                <td className="ink-3">{r.eng}</td>
                <td className="num">{r.hrs.toFixed(2)}</td>
                <td><span className="chip ok"><span className="dot ok" /> closed</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </_ObjectDetailShell>
  );
}

// ============================================================
// 17. OBJECT DETAIL — Travel tab
// ============================================================
function ObjectTravelTab() {
  return (
    <_ObjectDetailShell tabId="travel">
      <div className="section-block" style={{ marginTop: 0 }}>
        <div className="section-head">
          <div className="t-section">Travel norms</div>
          <div className="meta">computed from origin branch + transport mode</div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
        }}>
          {[
            { l: 'One-way distance',   v: '12.4',  u: 'km' },
            { l: 'One-way duration',   v: '0.45',  u: 'h' },
            { l: 'Visits / year',      v: '24' },
            { l: 'Annual travel FTE',  v: '0.0188', tone: 'totals' },
          ].map((k, i) => (
            <div key={k.l} style={{ padding: '20px 0 20px 24px', borderLeft: i === 0 ? 'none' : '1px solid var(--line)', paddingLeft: i === 0 ? 0 : 24 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>{k.l}</div>
              <div>
                <span className="mono" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>{k.v}</span>
                {k.u && <span className="ink-3" style={{ fontSize: 12, marginLeft: 6 }}>{k.u}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <div className="t-section">Origin & route</div>
          <div className="meta">transport mode: company vehicle</div>
        </div>
        <table className="table">
          <tbody>
            <tr><td className="first-col ink-3" style={{ width: 200 }}>Origin branch</td><td>Минск гор. · ф-217 · Партизанский</td></tr>
            <tr><td className="first-col ink-3">Transport mode</td><td>Company vehicle</td></tr>
            <tr><td className="first-col ink-3">Distance method</td><td className="ink-3">Manual override (was: Yandex Maps · 11.8km)</td></tr>
            <tr><td className="first-col ink-3">Last verified</td><td className="mono">2025-09-14 · A. Korzun</td></tr>
          </tbody>
        </table>
      </div>
    </_ObjectDetailShell>
  );
}

// ============================================================
// 18. OBJECT DETAIL — Engineers tab
// ============================================================
function ObjectEngineersTab() {
  const rows = [
    { name: 'Андрей Кузьмич', email: 'a.kuzmich@bank.by', share: 0.62, pct: 38, util: 102, status: 'lead' },
    { name: 'Сергей Лагун',   email: 's.lagun@bank.by',   share: 0.58, pct: 36, util: 88,  status: 'co' },
    { name: 'Олег Шевчук',    email: 'o.shevchuk@bank.by', share: 0.41, pct: 26, util: 71,  status: 'co' },
  ];
  return (
    <_ObjectDetailShell tabId="engineers">
      <div className="section-block" style={{ marginTop: 0 }}>
        <div className="section-head">
          <div className="t-section">Assigned engineers</div>
          <div className="meta">3 engineers · sum FTE 1.61</div>
          <button className="btn sm" style={{ marginLeft: 16 }}>+ Assign engineer</button>
        </div>
        <table className="table">
          <thead><tr>
            <th className="first-col">Engineer</th>
            <th>Role</th>
            <th className="num">FTE share</th>
            <th className="num">% of object</th>
            <th>Their utilisation</th>
            <th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.email}>
                <td className="first-col">
                  <div>{r.name}</div>
                  <div className="t-meta" style={{ color: 'var(--ink-4)', fontSize: 11 }}>{r.email}</div>
                </td>
                <td>
                  {r.status === 'lead'
                    ? <span className="chip accent">Lead</span>
                    : <span className="chip ghost ink-3">Co-engineer</span>}
                </td>
                <td className="num totalcol">{r.share.toFixed(2)}</td>
                <td className="num ink-3">{r.pct}%</td>
                <td><CapBar pct={r.util} /></td>
                <td className="ink-4" style={{ textAlign: 'right' }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </_ObjectDetailShell>
  );
}

// ============================================================
// 19. CREATE DIVISION dialog
// ============================================================
function CreateDivisionDialog() {
  return (
    <div className="artboard-screen" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: 0.55 }}>
        <div className="app-shell">
          <Sidebar active="divisions" />
          <main className="page" style={{ maxWidth: 'none' }}>
            <PageHead crumbs={['Workload', 'Reference', 'Divisions']} title="Divisions" subtitle="7 regional divisions" primary="Create division" />
            <div style={{ height: 320 }} />
          </main>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,18,0.32)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: 'var(--bg-elev)',
        borderRadius: 'var(--r-lg)', border: '1px solid var(--line-strong)',
        padding: '28px 32px 24px 32px',
      }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div>
            <div className="t-eyebrow">New division</div>
            <h2 className="t-h1" style={{ margin: '4px 0 0 0', fontSize: 22 }}>Create division</h2>
          </div>
          <div style={{ width: 24, height: 24, color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</div>
        </div>
        <div className="t-meta" style={{ marginBottom: 24 }}>Branches and objects can be added after creation.</div>

        <div className="field">
          <label>Division name</label>
          <input defaultValue="Минск гор." />
        </div>

        <div className="row between" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <span className="t-meta">Code is auto-derived from name</span>
          <div className="row gap-s">
            <button className="btn">Cancel</button>
            <button className="btn primary">Create division</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 20. CREATE BRANCH dialog
// ============================================================
function CreateBranchDialog() {
  return (
    <div className="artboard-screen" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: 0.55 }}>
        <div className="app-shell">
          <Sidebar active="divisions" />
          <main className="page" style={{ maxWidth: 'none' }}>
            <PageHead crumbs={['Workload', 'Reference', 'Divisions', 'Минск гор.']} title="Минск гор." subtitle="MNG · 5 branches" primary="Create branch" />
            <div style={{ height: 320 }} />
          </main>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,18,0.32)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: 'var(--bg-elev)',
        borderRadius: 'var(--r-lg)', border: '1px solid var(--line-strong)',
        padding: '28px 32px 24px 32px',
      }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div>
            <div className="t-eyebrow">New branch</div>
            <h2 className="t-h1" style={{ margin: '4px 0 0 0', fontSize: 22 }}>Create branch</h2>
          </div>
          <div style={{ width: 24, height: 24, color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</div>
        </div>
        <div className="t-meta" style={{ marginBottom: 24 }}>Branch will be added to the current division.</div>

        <div className="field">
          <label>Branch name</label>
          <input defaultValue="Минск — Партизанский" />
        </div>
        <div className="field">
          <label>Division</label>
          <select className="input lg" style={{ width: '100%', height: 38 }}>
            <option>Минск гор.</option>
            <option>Брестское</option>
            <option>Витебское</option>
          </select>
        </div>

        <div className="row between" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <span className="t-meta">Branch №/ID is auto-assigned</span>
          <div className="row gap-s">
            <button className="btn">Cancel</button>
            <button className="btn primary">Create branch</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ObjectRecordsTab, ObjectRepairsTab, ObjectTravelTab, ObjectEngineersTab,
  CreateDivisionDialog, CreateBranchDialog,
});
