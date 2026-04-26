/* global React, Sidebar, Topbar, Icons, Sparkline, Donut, CapBar, StatusChip */

function DashboardScreen() {
  const divisions = [
    { name: "Брестское обл. упр. №100", fte: 28.4216, objects: 412, gaps: 6, spark: [22,23,25,24,26,27,28.4] },
    { name: "Витебское обл. упр. №200", fte: 24.8712, objects: 386, gaps: 2, spark: [26,25,25,24,24,24.5,24.8] },
    { name: "Гомельское обл. упр. №300", fte: 31.1089, objects: 448, gaps: 11, spark: [28,29,29,30,30,30.5,31.1] },
    { name: "Гродненское обл. упр. №400", fte: 22.5347, objects: 338, gaps: 3, spark: [23,22.8,22.5,22.6,22.5,22.4,22.5] },
    { name: "Минское обл. упр. №500", fte: 35.7210, objects: 512, gaps: 14, spark: [32,33,33,34,35,35.5,35.7] },
    { name: "Могилёвское обл. упр. №600", fte: 19.9044, objects: 292, gaps: 4, spark: [19,19.2,19.4,19.6,19.7,19.8,19.9] },
    { name: "Минск город. упр. №700", fte: 42.3881, objects: 547, gaps: 8, spark: [38,39,40,41,41.5,42,42.4] },
  ];
  const topObjects = [
    { name: "ЦОУ №100/8 Брест, ул. Советская 12", div: "Брест", eng: ["С.Иванов","М.Петров"], fte: 0.198442 },
    { name: "Отделение №200/14 Витебск, пр-т Фрунзе", div: "Витебск", eng: ["А.Коваль"], fte: 0.171108, warn: true },
    { name: "Архив №300/3 Гомель, ул. Ленина 45", div: "Гомель", eng: ["Д.Сидоров","Н.Волков","П.Лис"], fte: 0.164902 },
    { name: "Инфокиоск-узел №500/42 Минск, Немига", div: "Минск", eng: [], fte: 0.158211, gap: true },
    { name: "Гараж №700/5 Минск, Сухая 12", div: "Минск гор.", eng: ["К.Рыбак"], fte: 0.149983 },
  ];

  const overloadedEng = [
    { name: "С. Иванов", load: 1.24, cap: 1.0, objects: 18, div: "Брестское" },
    { name: "Н. Волков", load: 1.18, cap: 1.0, objects: 16, div: "Гомельское" },
    { name: "А. Коваль", load: 1.08, cap: 1.0, objects: 14, div: "Витебское" },
  ];

  const totalFte = divisions.reduce((a,b)=>a+b.fte,0);
  const totalObj = divisions.reduce((a,b)=>a+b.objects,0);
  const totalGaps = divisions.reduce((a,b)=>a+b.gaps,0);

  return (
    <div className="app">
      <Sidebar active="dashboard" />
      <div className="main">
        <Topbar crumbs={["Workspace", "Dashboard"]} />
        <div className="content">
          <div className="page-head">
            <div>
              <h1 className="page-title">Maintenance workload</h1>
              <div className="page-sub">Live view across 7 divisions · last recalc 12 min ago</div>
            </div>
            <div className="page-actions">
              <button className="btn"><Icons.download size={14}/>Export XLSX</button>
              <button className="btn primary"><Icons.clock size={14}/>Recalculate</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Required FTE · total</div>
              <div className="kpi-value">{totalFte.toFixed(2)}<span className="unit">ставок</span></div>
              <div className="kpi-delta up"><Icons.arrowUp size={11}/>+1.84 vs H2 2025</div>
              <div className="kpi-spark"><Sparkline data={[180,182,184,188,195,200,205]} w={100} h={34} color="var(--accent)"/></div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Objects under maintenance</div>
              <div className="kpi-value">{totalObj.toLocaleString("ru")}</div>
              <div className="kpi-delta neutral"><Icons.dot size={11}/>+12 this period</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Coverage gaps</div>
              <div className="kpi-value" style={{color:"var(--danger)"}}>{totalGaps}</div>
              <div className="kpi-delta warn"><Icons.alert size={11}/>objects without engineer</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Engineers overloaded</div>
              <div className="kpi-value">3 <span className="unit">of 148</span></div>
              <div className="kpi-delta warn"><Icons.arrowUp size={11}/>load ≥ 1.0</div>
            </div>
          </div>

          {/* Divisions table + right column */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">FTE by division</div>
                  <div className="card-sub">Sorted by required headcount · click to drill into branches</div>
                </div>
                <button className="btn sm ghost"><Icons.filter size={12}/>Filter</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Division</th>
                    <th style={{textAlign:"right"}}>FTE</th>
                    <th style={{textAlign:"right"}}>Objects</th>
                    <th style={{textAlign:"right"}}>Gaps</th>
                    <th>Trend</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {divisions.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{display:"flex", alignItems:"center", gap:10}}>
                          <div style={{
                            width:28, height:28, borderRadius:6,
                            background:"var(--bg-sunken)", display:"grid", placeItems:"center",
                            fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-2)", fontWeight:600
                          }}>{d.name.match(/№(\d+)/)?.[1] ?? "—"}</div>
                          <div style={{fontSize:13, fontWeight:500}}>{d.name}</div>
                        </div>
                      </td>
                      <td className="num-cell" style={{fontWeight:600}}>{d.fte.toFixed(4)}</td>
                      <td className="num-cell">{d.objects}</td>
                      <td className="num-cell">
                        {d.gaps === 0
                          ? <span className="muted">—</span>
                          : <StatusChip kind={d.gaps > 8 ? "danger" : "warn"}>{d.gaps}</StatusChip>}
                      </td>
                      <td><Sparkline data={d.spark} w={80} h={22} color="var(--ink-3)"/></td>
                      <td><Icons.chevR size={14} stroke="var(--ink-4)"/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:16}}>
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">Top objects by workload</div>
                    <div className="card-sub">Highest ИТОГО Числ (with travel)</div>
                  </div>
                </div>
                <div style={{padding:"4px 0"}}>
                  {topObjects.map((o,i) => (
                    <div key={i} style={{
                      display:"grid", gridTemplateColumns:"1fr auto",
                      gap: 12, padding:"12px 20px",
                      borderBottom: i < topObjects.length-1 ? "1px solid var(--line)" : "none"
                    }}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{o.name}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:3, display:"flex", alignItems:"center", gap:6}}>
                          {o.div}
                          <span style={{opacity:0.5}}>·</span>
                          {o.gap ? <span style={{color:"var(--danger)"}}>No engineer</span>
                            : o.eng.length === 1 ? o.eng[0]
                            : `${o.eng[0]} +${o.eng.length-1}`}
                        </div>
                      </div>
                      <div className="num" style={{fontSize:13, fontWeight:600, alignSelf:"center"}}>
                        {o.fte.toFixed(6)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{borderColor:"var(--danger-soft)", background:"#fffbfa"}}>
                <div className="card-head" style={{borderBottomColor:"var(--danger-soft)"}}>
                  <div>
                    <div className="card-title" style={{display:"flex", alignItems:"center", gap:8}}>
                      <Icons.alert size={14} stroke="var(--danger)"/>Overloaded engineers
                    </div>
                    <div className="card-sub">Load ratio exceeds capacity</div>
                  </div>
                </div>
                <div style={{padding:"4px 0"}}>
                  {overloadedEng.map((e,i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"12px 20px",
                      borderBottom: i < overloadedEng.length-1 ? "1px solid var(--danger-soft)" : "none"
                    }}>
                      <div className="avatar" style={{background:"var(--danger-soft)", color:"var(--danger)"}}>
                        {e.name.split(" ").map(s=>s[0]).join("")}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:500}}>{e.name}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)"}}>{e.div} · {e.objects} objects</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div className="num" style={{fontSize:13, fontWeight:600, color:"var(--danger)"}}>
                          ×{e.load.toFixed(2)}
                        </div>
                        <CapBar value={e.load} max={e.cap} width={70}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
