/* global React, Sidebar, Topbar, Icons, CapBar, StatusChip, Sparkline */

function EngineersScreen() {
  const engineers = [
    { name:"Сергей Иванов", email:"s.ivanov@bank.by", div:"Брестское", objects:18, load:1.24, cap:1.0, fte:1.24, trend:[0.9,0.95,1.0,1.05,1.12,1.18,1.24] },
    { name:"Николай Волков", email:"n.volkov@bank.by", div:"Гомельское", objects:16, load:1.18, cap:1.0, fte:1.18, trend:[1.0,1.05,1.08,1.1,1.14,1.17,1.18] },
    { name:"Анна Коваль", email:"a.koval@bank.by", div:"Витебское", objects:14, load:1.08, cap:1.0, fte:1.08, trend:[0.88,0.92,0.98,1.02,1.05,1.07,1.08] },
    { name:"Максим Петров", email:"m.petrov@bank.by", div:"Брестское", objects:12, load:0.94, cap:1.0, fte:0.94, trend:[0.7,0.75,0.8,0.85,0.9,0.92,0.94] },
    { name:"Дмитрий Сидоров", email:"d.sidorov@bank.by", div:"Гомельское", objects:11, load:0.88, cap:1.0, fte:0.88, trend:[0.78,0.8,0.82,0.84,0.86,0.87,0.88] },
    { name:"Константин Рыбак", email:"k.rybak@bank.by", div:"Минск гор.", objects:14, load:0.82, cap:1.0, fte:0.82, trend:[0.7,0.72,0.74,0.77,0.79,0.81,0.82] },
    { name:"Юлия Ясень", email:"y.yasen@bank.by", div:"Минское", objects:9, load:0.71, cap:1.0, fte:0.71, trend:[0.58,0.6,0.63,0.66,0.68,0.70,0.71] },
    { name:"Павел Лис", email:"p.lis@bank.by", div:"Гомельское", objects:6, load:0.48, cap:0.5, fte:0.48, trend:[0.3,0.34,0.38,0.42,0.45,0.47,0.48] },
    { name:"Дарья Тур", email:"d.tur@bank.by", div:"Витебское", objects:8, load:0.42, cap:1.0, fte:0.42, trend:[0.38,0.39,0.4,0.41,0.41,0.42,0.42] },
  ];

  const loadKind = (e) => e.load >= 1.0 ? "danger" : e.load >= 0.85 ? "warn" : "ok";

  return (
    <div className="app">
      <Sidebar active="engineers" />
      <div className="main">
        <Topbar crumbs={["Workspace", "Engineers"]} />
        <div className="content">
          <div className="page-head">
            <div>
              <h1 className="page-title">Engineers</h1>
              <div className="page-sub">148 active · workload split equally across assigned objects</div>
            </div>
            <div className="page-actions">
              <button className="btn"><Icons.download size={13}/>Export</button>
              <button className="btn primary"><Icons.plus size={13}/>Add engineer</button>
            </div>
          </div>

          {/* Capacity overview bar */}
          <div className="card" style={{marginBottom:16}}>
            <div style={{padding:"18px 20px"}}>
              <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:12}}>
                <div className="card-title">Capacity distribution</div>
                <div style={{fontSize:12, color:"var(--ink-3)"}}>
                  Total capacity <span className="mono" style={{color:"var(--ink)", fontWeight:600}}>142.5</span>
                  <span style={{margin:"0 8px", opacity:0.5}}>·</span>
                  Required <span className="mono" style={{color:"var(--ink)", fontWeight:600}}>138.2</span>
                  <span style={{margin:"0 8px", opacity:0.5}}>·</span>
                  Utilisation <span className="mono" style={{color:"var(--ok)", fontWeight:600}}>96.9%</span>
                </div>
              </div>
              <div style={{display:"flex", height:10, borderRadius:5, overflow:"hidden", background:"var(--bg-sunken)"}}>
                <div style={{width:"3%", background:"var(--danger)"}} title="Overloaded · 3"/>
                <div style={{width:"8%", background:"var(--warn)"}} title="Near capacity · 12"/>
                <div style={{width:"76%", background:"var(--ok)"}} title="Healthy · 112"/>
                <div style={{width:"13%", background:"var(--ink-4)"}} title="Under-utilised · 21"/>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", marginTop:10, fontSize:11}}>
                <div><span className="chip danger"><span className="dot"/>Overloaded</span> <span className="mono">3</span></div>
                <div><span className="chip warn"><span className="dot"/>Near capacity</span> <span className="mono">12</span></div>
                <div><span className="chip ok"><span className="dot"/>Healthy</span> <span className="mono">112</span></div>
                <div><span className="chip"><span className="dot"/>Under-utilised</span> <span className="mono">21</span></div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{display:"flex", gap:8, marginBottom:12, alignItems:"center"}}>
            <div style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"6px 10px", border:"1px solid var(--line)",
              borderRadius:6, fontSize:12, color:"var(--ink-3)", background:"var(--bg-elev)",
              width:280
            }}>
              <Icons.search size={13}/>
              Search engineers...
            </div>
            <button className="btn sm">All divisions</button>
            <button className="btn sm">All statuses</button>
            <div style={{marginLeft:"auto", fontSize:12, color:"var(--ink-3)"}}>
              Sorted by <b style={{color:"var(--ink)"}}>Load ratio ↓</b>
            </div>
          </div>

          {/* Engineers table */}
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Engineer</th>
                  <th>Division</th>
                  <th style={{textAlign:"right"}}>Objects</th>
                  <th style={{textAlign:"right"}}>FTE load</th>
                  <th style={{textAlign:"right"}}>Capacity</th>
                  <th>Utilisation</th>
                  <th>8-week trend</th>
                  <th>Status</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {engineers.map((e,i) => {
                  const kind = loadKind(e);
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{display:"flex", alignItems:"center", gap:10}}>
                          <div className="avatar" style={
                            kind==="danger" ? {background:"var(--danger-soft)", color:"var(--danger)"}
                            : kind==="warn" ? {background:"var(--warn-soft)", color:"var(--warn)"}
                            : undefined
                          }>{e.name.split(" ").map(s=>s[0]).join("")}</div>
                          <div>
                            <div style={{fontSize:13, fontWeight:500}}>{e.name}</div>
                            <div style={{fontSize:11, color:"var(--ink-3)"}}>{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{fontSize:13}}>{e.div}</td>
                      <td className="num-cell">{e.objects}</td>
                      <td className="num-cell" style={{fontWeight:600,
                        color: kind==="danger"?"var(--danger)":kind==="warn"?"var(--warn)":"var(--ink)"
                      }}>{e.fte.toFixed(4)}</td>
                      <td className="num-cell muted">{e.cap.toFixed(2)}</td>
                      <td>
                        <div style={{display:"flex", alignItems:"center", gap:8}}>
                          <CapBar value={e.load} max={e.cap} width={80}/>
                          <span className="num" style={{fontSize:12, fontWeight:600, minWidth:48,
                            color: kind==="danger"?"var(--danger)":kind==="warn"?"var(--warn)":"var(--ink-2)"
                          }}>{Math.round(e.load/e.cap*100)}%</span>
                        </div>
                      </td>
                      <td>
                        <Sparkline data={e.trend} w={70} h={22}
                          color={kind==="danger"?"var(--danger)":kind==="warn"?"var(--warn)":"var(--ok)"}/>
                      </td>
                      <td>
                        {kind==="danger" ? <StatusChip kind="danger">Overloaded</StatusChip>
                          : kind==="warn" ? <StatusChip kind="warn">Near cap</StatusChip>
                          : <StatusChip kind="ok">Healthy</StatusChip>}
                      </td>
                      <td><Icons.chevR size={14} stroke="var(--ink-4)"/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

window.EngineersScreen = EngineersScreen;
