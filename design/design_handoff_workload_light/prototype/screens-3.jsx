/* eslint-disable no-undef */
/* ============================================================
   Screens part 3 — Divisions, Create Object dialog, Create Engineer dialog
   ============================================================ */

const { useState: uS3 } = React;

// ============================================================
// 08. DIVISIONS — list view (Quiet)
// ============================================================
function DivisionsScreen() {
  const divisions = [
    { code: 'BRE', name: 'Брестское',    head: 'Юрый Малахоўскі',     city: 'Брест',     objs: 412, eng: 28, fte: 26.84, gap: 0.4, util: 89 },
    { code: 'VTB', name: 'Витебское',    head: 'Аляксей Трацяк',      city: 'Витебск',   objs: 388, eng: 26, fte: 24.11, gap: 0.0, util: 84 },
    { code: 'GMV', name: 'Гомельское',   head: 'Виктор Прышчэп',      city: 'Гомель',    objs: 461, eng: 31, fte: 30.22, gap: 1.2, util: 96 },
    { code: 'GRD', name: 'Гродненское',  head: 'Дзяніс Хадасок',      city: 'Гродно',    objs: 354, eng: 24, fte: 22.07, gap: 0.0, util: 81 },
    { code: 'MNS', name: 'Минское',      head: 'Павел Чарняўскі',     city: 'Минск',     objs: 488, eng: 32, fte: 31.50, gap: 0.6, util: 92 },
    { code: 'MGV', name: 'Могилёвское',  head: 'Раман Лазоўскі',      city: 'Могилёв',   objs: 322, eng: 22, fte: 19.44, gap: 0.0, util: 78 },
    { code: 'MNG', name: 'Минск гор.',   head: 'Анна Корзун',         city: 'Минск',     objs: 510, eng: 41, fte: 33.24, gap: 2.1, util: 104 },
  ];

  return (
    <div className="artboard-screen" style={{ overflow: 'auto' }}>
      <div className="app-shell">
        <Sidebar active="divisions" />
        <main className="page" style={{ maxWidth: 'none' }}>
          <PageHead
            crumbs={['Workload', 'Reference', 'Divisions']}
            title="Divisions"
            subtitle="7 regional divisions · 2 935 objects · 204 engineers"
            primary="Create division"
          />

          <KPIRow items={[
            { label: 'Divisions',         value: '7' },
            { label: 'Total objects',     value: '2 935' },
            { label: 'Total engineers',   value: '204' },
            { label: 'Avg utilisation',   value: '89%', delta: '1 division > 100%', tone: 'warn' },
          ]} />

          <div className="section-block">
            <div className="section-head">
              <div className="t-section">All divisions</div>
              <div className="meta">Sorted by required FTE</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="first-col" style={{ width: 60 }}>Code</th>
                  <th>Division</th>
                  <th>Head engineer</th>
                  <th>Region</th>
                  <th className="num">Objects</th>
                  <th className="num">Engineers</th>
                  <th className="num">FTE req.</th>
                  <th className="num">Gap</th>
                  <th>Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map(d => (
                  <tr key={d.code}>
                    <td className="first-col mono ink-3">{d.code}</td>
                    <td>{d.name}</td>
                    <td className="ink-3">{d.head}</td>
                    <td className="ink-3">{d.city}</td>
                    <td className="num">{d.objs}</td>
                    <td className="num">{d.eng}</td>
                    <td className="num totalcol">{d.fte.toFixed(2)}</td>
                    <td className="num">{d.gap > 0 ? <span style={{ color: d.gap > 1 ? 'var(--danger)' : 'var(--warn)' }}>{d.gap.toFixed(1)}</span> : '—'}</td>
                    <td><CapBar pct={d.util} /></td>
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
// 09. CREATE OBJECT — modal dialog (Quiet)
// ============================================================
function CreateObjectDialog() {
  return (
    <div className="artboard-screen" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Page behind, dimmed */}
      <div style={{ filter: 'blur(0px)', opacity: 0.55 }}>
        <div className="app-shell">
          <Sidebar active="objects" />
          <main className="page" style={{ maxWidth: 'none' }}>
            <PageHead
              crumbs={['Workload', 'Objects']}
              title="Objects"
              subtitle="2 935 objects across 7 divisions"
              primary="Create object"
            />
            <div style={{ height: 400 }} />
          </main>
        </div>
      </div>

      {/* Scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,18,0.32)' }} />

      {/* Modal — borders kept here per Quiet rules */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 560, background: 'var(--bg-elev)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line-strong)',
        padding: '28px 32px 24px 32px',
      }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div>
            <div className="t-eyebrow">New object</div>
            <h2 className="t-h1" style={{ margin: '4px 0 0 0', fontSize: 22 }}>Create object</h2>
          </div>
          <div className="close" style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>×</div>
        </div>
        <div className="t-meta" style={{ marginBottom: 24 }}>Workload will be calculated after equipment is added.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
          <div className="field" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
            <label>Object name</label>
            <input defaultValue="Минск — Партизанский 6А" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Object ID</label>
            <input defaultValue="03-021" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Tier</label>
            <select className="input lg" style={{ width: '100%', height: 38 }}>
              <option>Tier-1 branch</option>
              <option>Tier-2 office</option>
              <option>ATM</option>
              <option>Currency exchange</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Division</label>
            <select className="input lg" style={{ width: '100%', height: 38 }}>
              <option>Минск гор.</option>
              <option>Брестское</option>
              <option>Витебское</option>
              <option>Гомельское</option>
              <option>Гродненское</option>
              <option>Минское</option>
              <option>Могилёвское</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Branch №</label>
            <input defaultValue="217" />
          </div>
          <div className="field" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
            <label>Address</label>
            <input defaultValue="г. Минск, ул. Партизанский 6А" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Travel norm (h)</label>
            <input className="mono" defaultValue="0.45" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Visits / year</label>
            <input className="mono" defaultValue="24" />
          </div>
        </div>

        <div className="row between" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <span className="t-meta">Equipment & assignments are added after creation.</span>
          <div className="row gap-s">
            <button className="btn">Cancel</button>
            <button className="btn primary">Create object</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 10. CREATE ENGINEER — modal dialog (Quiet)
// ============================================================
function CreateEngineerDialog() {
  return (
    <div className="artboard-screen" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: 0.55 }}>
        <div className="app-shell">
          <Sidebar active="engineers" />
          <main className="page" style={{ maxWidth: 'none' }}>
            <PageHead
              crumbs={['Workload', 'Engineers']}
              title="Engineers"
              subtitle="204 engineers · capacity FTE 1.90 default"
              primary="Create engineer"
            />
            <div style={{ height: 400 }} />
          </main>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,18,0.32)' }} />

      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 520, background: 'var(--bg-elev)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line-strong)',
        padding: '28px 32px 24px 32px',
      }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div>
            <div className="t-eyebrow">New engineer</div>
            <h2 className="t-h1" style={{ margin: '4px 0 0 0', fontSize: 22 }}>Create engineer</h2>
          </div>
          <div style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>×</div>
        </div>
        <div className="t-meta" style={{ marginBottom: 24 }}>Account credentials will be sent by email.</div>

        <div className="field">
          <label>Full name</label>
          <input defaultValue="Андрей Кузьмич" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" defaultValue="a.kuzmich@bank.by" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="field">
            <label>Capacity FTE</label>
            <input className="mono" defaultValue="1.90" />
          </div>
          <div className="field">
            <label>Home division</label>
            <select className="input lg" style={{ width: '100%', height: 38 }}>
              <option>Минск гор.</option>
              <option>Брестское</option>
              <option>Витебское</option>
              <option>Гомельское</option>
              <option>Гродненское</option>
              <option>Минское</option>
              <option>Могилёвское</option>
            </select>
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Initial password</label>
          <input type="password" defaultValue="••••••••••" />
          <div className="t-meta" style={{ marginTop: 6, color: 'var(--ink-4)' }}>Minimum 8 characters · engineer must change on first sign-in</div>
        </div>

        <div className="row between" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <label className="checkbox checked" style={{ cursor: 'pointer' }}>
            <span className="box" />
            <span>Send welcome email</span>
          </label>
          <div className="row gap-s">
            <button className="btn">Cancel</button>
            <button className="btn primary">Create engineer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DivisionsScreen, CreateObjectDialog, CreateEngineerDialog });
