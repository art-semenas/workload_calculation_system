/* global React, Sidebar, Topbar, Icons */

const { useState: useS2 } = React;

function CatalogScreen() {
  const [selected, setSelected] = useS2(0);

  const devices = [
    { name: "Galaxy 512 (Galaxy Dimension GD-520)", ctx:[{s:"ОС",r1:7,r2:20}], usage: 412 },
    { name: "Galaxy 512 (контроллер АСПС и СО)", ctx:[{s:"ОС",r1:15,r2:20},{s:"ПС",r1:15,r2:20}], usage: 308 },
    { name: "серий А6, Аларм", ctx:[{s:"ОС",r1:5,r2:8},{s:"ПС",r1:5,r2:12}], usage: 1104 },
    { name: "А16-512", ctx:[{s:"ОС",r1:5,r2:10},{s:"ПС",r1:6,r2:13}], usage: 488 },
    { name: "Maestro (ППК ОП Maestro-1600)", ctx:[{s:"ОС",r1:5,r2:10}], usage: 142 },
    { name: "Шлейфы сигнализации", ctx:[{s:"ОС",r1:0.06,r2:0.7},{s:"ПС",r1:0.06,r2:0.7}], usage: 2812 },
    { name: "Извещатели, оповещатели", ctx:[{s:"ОС",r1:0.7,r2:3},{s:"ПС",r1:0.3,r2:4}], usage: 2901 },
    { name: "Видеокамеры", ctx:[{s:"Видео",r1:1.5,r2:1.5}], usage: 2488 },
    { name: "Микрофоны", ctx:[{s:"Видео",r1:0.5,r2:0.5}], usage: 1412 },
    { name: "Системный блок (видео сервер)", ctx:[{s:"Видео",r1:10,r2:40}], usage: 2412 },
    { name: "Каналы считывания", ctx:[{s:"ОС",r1:0.02,r2:1.5},{s:"ПС",r1:0.02,r2:1.5}], usage: 988 },
    { name: "ББП-20, ББП-3/12 (БРП 2401)", ctx:[{s:"ОС",r1:0.03,r2:3}], usage: 1802 },
  ];

  const sysColor = { "ОС": "accent", "ПС": "warn", "Видео": "ok" };
  const d = devices[selected];

  return (
    <div className="app">
      <Sidebar active="catalog" />
      <div className="main">
        <Topbar crumbs={["Administration", "Device catalog"]} />
        <div className="content" style={{padding:0, display:"grid", gridTemplateColumns:"420px 1fr", height:"calc(100vh - 56px)"}}>
          {/* List */}
          <div style={{borderRight:"1px solid var(--line)", background:"var(--bg-elev)", display:"flex", flexDirection:"column"}}>
            <div style={{padding:"20px 20px 12px"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                <h1 className="page-title" style={{fontSize:20}}>Device catalog</h1>
                <button className="btn sm primary"><Icons.plus size={12}/>New</button>
              </div>
              <div className="page-sub">{devices.length} types · dynamic — no schema changes</div>
              <div style={{
                marginTop:14,
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 10px", border:"1px solid var(--line)",
                borderRadius:6, fontSize:12, color:"var(--ink-3)", background:"var(--bg)",
              }}>
                <Icons.search size={13}/>Search devices...
              </div>
            </div>
            <div style={{flex:1, overflow:"auto"}}>
              {devices.map((x,i)=>(
                <div key={i} onClick={()=>setSelected(i)} style={{
                  padding:"12px 20px", borderBottom:"1px solid var(--line)",
                  background: i===selected ? "var(--bg-sunken)" : "transparent",
                  borderLeft: i===selected ? "2px solid var(--ink)" : "2px solid transparent",
                  cursor:"pointer",
                }}>
                  <div style={{fontSize:13, fontWeight:500, marginBottom:4}}>{x.name}</div>
                  <div style={{display:"flex", alignItems:"center", gap:6}}>
                    {x.ctx.map(c=>(
                      <span key={c.s} className={`chip ${sysColor[c.s]}`} style={{fontSize:10}}>{c.s}</span>
                    ))}
                    <span style={{marginLeft:"auto", fontSize:11, color:"var(--ink-3)"}} className="mono">
                      {x.usage.toLocaleString("ru")} uses
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div style={{overflow:"auto", padding:"24px 28px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20}}>
              <div>
                <div className="chip accent" style={{marginBottom:10}}><Icons.catalog size={11}/>Device type</div>
                <h1 className="page-title">{d.name}</h1>
                <div className="page-sub">Assigned to {d.usage.toLocaleString("ru")} objects across {d.ctx.length} system{d.ctx.length>1?"s":""}</div>
              </div>
              <div style={{display:"flex", gap:8}}>
                <button className="btn"><Icons.edit size={13}/>Edit</button>
                <button className="btn" style={{color:"var(--danger)"}}><Icons.trash size={13}/></button>
              </div>
            </div>

            {/* Context cards */}
            <div style={{display:"grid", gridTemplateColumns: d.ctx.length===1?"1fr":"1fr 1fr 1fr", gap:12, marginBottom:20}}>
              {d.ctx.map(c=>(
                <div key={c.s} className="card" style={{padding:"16px 18px"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                    <span className={`chip ${sysColor[c.s]}`}>
                      {c.s==="ОС"?<Icons.shield size={11}/>:c.s==="ПС"?<Icons.flame size={11}/>:<Icons.camera size={11}/>}
                      {c.s} context
                    </span>
                    <Icons.edit size={13} stroke="var(--ink-4)"/>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
                    <div>
                      <div style={{fontSize:10, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>R1 · inspection</div>
                      <div className="num" style={{fontSize:24, fontWeight:500, marginTop:6}}>{c.r1}<span style={{fontSize:12, color:"var(--ink-3)", marginLeft:4}}>min</span></div>
                    </div>
                    <div>
                      <div style={{fontSize:10, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>R2 · maintenance</div>
                      <div className="num" style={{fontSize:24, fontWeight:500, marginTop:6}}>{c.r2}<span style={{fontSize:12, color:"var(--ink-3)", marginLeft:4}}>min</span></div>
                    </div>
                  </div>
                </div>
              ))}
              {d.ctx.length<3 && Array.from({length: d.ctx.length===1?0:(3-d.ctx.length)}).map((_,i)=>(
                <div key={i} className="card" style={{padding:"16px 18px", borderStyle:"dashed",
                  background:"transparent", display:"flex", alignItems:"center", justifyContent:"center",
                  color:"var(--ink-3)", fontSize:12, minHeight:120
                }}>
                  <div style={{textAlign:"center"}}>
                    <Icons.plus size={16}/>
                    <div style={{marginTop:4}}>Add context</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Normative history</div>
                  <div className="card-sub">Changes trigger object recalculation</div>
                </div>
              </div>
              <table>
                <thead><tr><th>Date</th><th>Author</th><th>System</th><th>Change</th><th></th></tr></thead>
                <tbody>
                  <tr><td className="mono tiny">2026-02-14 11:04</td><td>А. Приходько</td><td><span className="chip accent">ОС</span></td><td>R2: 18 → 20 min</td><td><span className="chip ok">applied</span></td></tr>
                  <tr><td className="mono tiny">2025-11-02 09:21</td><td>А. Приходько</td><td><span className="chip accent">ОС</span></td><td>R1: 6 → 7 min</td><td><span className="chip ok">applied</span></td></tr>
                  <tr><td className="mono tiny">2025-07-18 14:55</td><td>system</td><td>—</td><td>Device imported from XLSX</td><td><span className="chip">seed</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CatalogScreen = CatalogScreen;
