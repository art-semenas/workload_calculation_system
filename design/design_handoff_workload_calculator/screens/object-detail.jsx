/* global React, Sidebar, Topbar, Icons, Donut, CapBar, StatusChip */

const { useState } = React;

function ObjectDetailScreen() {
  const [tab, setTab] = useState("equipment");

  const physical = [
    { name: "Galaxy 512 (Galaxy Dimension GD-520)", qty: 1, systems: ["ОС"] },
    { name: "Шлейфы сигнализации", qty: 24, systems: ["ОС","ПС"] },
    { name: "Извещатели, оповещатели", qty: 42, systems: ["ОС","ПС"] },
    { name: "Видеокамеры", qty: 18, systems: ["Видео"] },
    { name: "Системный блок (видео сервер)", qty: 2, systems: ["Видео"] },
    { name: "Микрофоны", qty: 4, systems: ["Видео"] },
    { name: "ББП-20, ББП-3/12 (БРП 2401)", qty: 6, systems: ["ОС"] },
    { name: "Устройство доступа", qty: 3, systems: ["ОС"] },
  ];

  const assigned = [
    { name: "Galaxy 512 (Galaxy Dimension GD-520)", sys: "ОС", qtyM: 1, r1: 7, r2: 20 },
    { name: "Шлейфы сигнализации", sys: "ОС", qtyM: 14, r1: 0.06, r2: 0.7 },
    { name: "Шлейфы сигнализации", sys: "ПС", qtyM: 10, r1: 0.06, r2: 0.7 },
    { name: "Извещатели, оповещатели", sys: "ОС", qtyM: 24, r1: 0.7, r2: 3 },
    { name: "Извещатели, оповещатели", sys: "ПС", qtyM: 18, r1: 0.3, r2: 4 },
    { name: "Видеокамеры", sys: "Видео", qtyM: 18, r1: 1.5, r2: 1.5 },
  ];

  const sysIcon = { "ОС": <Icons.shield size={11}/>, "ПС": <Icons.flame size={11}/>, "Видео": <Icons.camera size={11}/> };
  const sysColor = { "ОС": "accent", "ПС": "warn", "Видео": "ok" };

  return (
    <div className="app">
      <Sidebar active="objects" />
      <div className="main">
        <Topbar crumbs={["Objects", "Брестское обл. упр. №100", "Филиал 100/1", "ЦОУ №100/1 Брест, пр-т Машерова 17"]} />
        <div className="content">
          {/* Header */}
          <div className="page-head">
            <div>
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:6}}>
                <span className="chip accent"><Icons.building size={11}/>Object</span>
                <span className="chip"><Icons.dot size={8}/>Active</span>
                <span className="tiny muted mono">ID · 7f3a-e921</span>
              </div>
              <h1 className="page-title">ЦОУ №100/1 Брест, пр-т Машерова 17</h1>
              <div className="page-sub">Брестское обл. упр. №100 · Филиал 100/1 · imported from row 142</div>
            </div>
            <div className="page-actions">
              <button className="btn"><Icons.download size={13}/>Export XLSX</button>
              <button className="btn"><Icons.edit size={13}/>Edit</button>
              <button className="btn" style={{color:"var(--danger)"}}><Icons.trash size={13}/>Delete</button>
            </div>
          </div>

          {/* 2-column: main + summary rail */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 320px", gap:20}}>
            <div>
              {/* Tabs */}
              <div className="tabs">
                <div className={`tab ${tab==="equipment"?"active":""}`} onClick={()=>setTab("equipment")}>
                  Equipment <span className="count">8 · 6</span>
                </div>
                <div className={`tab ${tab==="records"?"active":""}`} onClick={()=>setTab("records")}>Records</div>
                <div className={`tab ${tab==="repairs"?"active":""}`} onClick={()=>setTab("repairs")}>Repairs <span className="count">4</span></div>
                <div className={`tab ${tab==="travel"?"active":""}`} onClick={()=>setTab("travel")}>Travel</div>
                <div className={`tab ${tab==="engineers"?"active":""}`} onClick={()=>setTab("engineers")}>Engineers <span className="count">2</span></div>
              </div>

              {/* Section A - Physical */}
              <div className="card" style={{marginBottom:16}}>
                <div className="card-head">
                  <div>
                    <div className="card-title">A. Physical inventory</div>
                    <div className="card-sub">Hardware on site · independent of system</div>
                  </div>
                  <button className="btn sm primary"><Icons.plus size={12}/>Add device</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th style={{textAlign:"right", width:100}}>Qty physical</th>
                      <th>Assigned to systems</th>
                      <th style={{width:32}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {physical.map((d,i) => (
                      <tr key={i}>
                        <td style={{fontSize:13, fontWeight:450}}>{d.name}</td>
                        <td className="num-cell" style={{fontWeight:600}}>{d.qty}</td>
                        <td>
                          <div style={{display:"flex", gap:4}}>
                            {d.systems.map(s => (
                              <span key={s} className={`chip ${sysColor[s]}`}>{sysIcon[s]}{s}</span>
                            ))}
                          </div>
                        </td>
                        <td><Icons.more size={14} stroke="var(--ink-4)"/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section B - Maintained */}
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">B. System assignments</div>
                    <div className="card-sub">Maintained quantity per (device × system) · R1/R2 pulled from catalog context</div>
                  </div>
                  <button className="btn sm"><Icons.plus size={12}/>Assign</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>System</th>
                      <th style={{textAlign:"right"}}>Qty maintained</th>
                      <th style={{textAlign:"right"}}>R1 min</th>
                      <th style={{textAlign:"right"}}>R2 min</th>
                      <th style={{textAlign:"right"}}>Contribution / visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assigned.map((a,i) => (
                      <tr key={i}>
                        <td style={{fontSize:13, fontWeight:450}}>{a.name}</td>
                        <td><span className={`chip ${sysColor[a.sys]}`}>{sysIcon[a.sys]}{a.sys}</span></td>
                        <td className="num-cell" style={{fontWeight:600}}>{a.qtyM}</td>
                        <td className="num-cell muted">{a.r1}</td>
                        <td className="num-cell muted">{a.r2}</td>
                        <td className="num-cell">{(a.qtyM * (a.r1 + a.r2)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary rail */}
            <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <div className="card" style={{background:"var(--ink)", color:"#fff", borderColor:"var(--ink)"}}>
                <div style={{padding:"18px 20px 16px"}}>
                  <div style={{fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(255,255,255,0.55)"}}>
                    ИТОГО Числ · with travel
                  </div>
                  <div className="num" style={{fontSize:42, fontWeight:500, letterSpacing:"-0.02em", marginTop:6, lineHeight:1}}>
                    0.098442
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", marginTop:16, fontSize:11}}>
                    <div>
                      <div style={{color:"rgba(255,255,255,0.55)"}}>without travel</div>
                      <div className="num" style={{fontWeight:500, marginTop:2}}>0.087412</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:"rgba(255,255,255,0.55)"}}>vs H2 2025</div>
                      <div className="num" style={{fontWeight:500, marginTop:2, color:"#9ae6b4"}}>+4.2%</div>
                    </div>
                  </div>
                </div>
                <div style={{
                  borderTop:"1px solid rgba(255,255,255,0.1)", padding:"10px 20px",
                  fontSize:11, color:"rgba(255,255,255,0.55)"
                }}>
                  Recomputed 4 min ago · H1 2026
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Per-system monthly avg</div></div>
                <div style={{padding:"14px 20px"}}>
                  {[
                    { sys:"Security · ОС", v: 5.338812, color:"var(--accent)", share: 0.48 },
                    { sys:"Fire · ПС", v: 3.218547, color:"#a66600", share: 0.29 },
                    { sys:"Video", v: 1.947210, color:"var(--ok)", share: 0.17 },
                    { sys:"Records", v: 1.800000, color:"var(--ink-3)", share: 0.06 },
                  ].map((s,i) => (
                    <div key={i} style={{marginBottom: 12}}>
                      <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                        <span>{s.sys}</span>
                        <span className="num" style={{fontWeight:600}}>{s.v.toFixed(4)}</span>
                      </div>
                      <div style={{height:4, background:"var(--bg-sunken)", borderRadius:2, overflow:"hidden"}}>
                        <div style={{height:"100%", width: `${s.share*100}%`, background: s.color, borderRadius:2}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Per-visit breakdown</div></div>
                <div style={{padding:"14px 20px", display:"grid", gridTemplateColumns:"1fr 1fr", rowGap:10, columnGap:12, fontSize:12}}>
                  <div className="muted">R1 total</div>
                  <div className="num" style={{textAlign:"right", fontWeight:600}}>32.47</div>
                  <div className="muted">R2 total</div>
                  <div className="num" style={{textAlign:"right", fontWeight:600}}>58.91</div>
                  <div className="muted">PZV</div>
                  <div className="num" style={{textAlign:"right"}}>20.00</div>
                  <div className="muted">Round-trip</div>
                  <div className="num" style={{textAlign:"right"}}>40.00</div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Assigned engineers</div></div>
                <div style={{padding:"4px 0"}}>
                  {[{name:"С. Иванов", load:0.92, cap:1.0},{name:"М. Петров", load:0.78, cap:1.0}].map((e,i)=>(
                    <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"10px 20px",
                      borderBottom: i===0?"1px solid var(--line)":"none"}}>
                      <div className="avatar">{e.name.split(" ").map(s=>s[0]).join("")}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13, fontWeight:500}}>{e.name}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>Share: 0.049221 FTE</div>
                      </div>
                      <CapBar value={e.load} max={e.cap} width={50}/>
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

window.ObjectDetailScreen = ObjectDetailScreen;
