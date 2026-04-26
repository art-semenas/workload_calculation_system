/* global React, Sidebar, Topbar, Icons, StatusChip */

function SvodScreen() {
  const rows = [
    { div:"Брестское", branch:"Филиал 100/1", obj:"ЦОУ №100/1 Брест, пр-т Машерова 17", eng:["С.Иванов","М.Петров"], pzv:20, travel:40, ps:3.218547, video:1.947210, os:5.338812, rec:1.800000, rep:0.924167, r1:32.47, r2:58.91, fteNo:0.087412, fte:0.098442, stale:false },
    { div:"Брестское", branch:"Филиал 100/1", obj:"Отделение №100/4 Брест, ул. Гоголя 3", eng:["М.Петров"], pzv:20, travel:28, ps:1.104802, video:0, os:2.108144, rec:0.600000, rep:0.412500, r1:18.22, r2:31.08, fteNo:0.028912, fte:0.034721 },
    { div:"Брестское", branch:"Филиал 100/2", obj:"Инфокиоск №100/17 Кобрин, вокзал", eng:[], pzv:20, travel:64, ps:0.218147, video:0, os:0.402112, rec:0, rep:0, r1:4.02, r2:7.11, fteNo:0.004221, fte:0.009418, gap:true },
    { div:"Витебское", branch:"Филиал 200/1", obj:"ЦОУ №200/2 Витебск, Московский пр. 24", eng:["А.Коваль","Д.Тур"], pzv:20, travel:32, ps:2.817204, video:1.602408, os:4.918341, rec:1.200000, rep:0.848334, r1:28.91, r2:52.07, fteNo:0.071204, fte:0.082889 },
    { div:"Витебское", branch:"Филиал 200/1", obj:"Отделение №200/9 Витебск, Ленина 88", eng:["А.Коваль"], pzv:20, travel:22, ps:1.417298, video:0.518922, os:2.712108, rec:0.900000, rep:0.512500, r1:20.14, r2:36.22, fteNo:0.041822, fte:0.048112, stale:true },
    { div:"Гомельское", branch:"Филиал 300/3", obj:"Архив №300/3 Гомель, ул. Ленина 45", eng:["Д.Сидоров","Н.Волков","П.Лис"], pzv:20, travel:52, ps:4.017418, video:3.202147, os:5.901234, rec:2.400000, rep:1.110412, r1:42.18, r2:71.39, fteNo:0.142218, fte:0.164902 },
    { div:"Гомельское", branch:"Филиал 300/3", obj:"Гараж №300/12 Гомель, ул. Советская 74", eng:["Д.Сидоров"], pzv:20, travel:18, ps:0.412108, video:0, os:1.218332, rec:0.300000, rep:0.212500, r1:9.12, r2:14.08, fteNo:0.014218, fte:0.017721 },
    { div:"Минское", branch:"Филиал 500/8", obj:"ЦОУ №500/8 Минск, Независимости 94", eng:["К.Рыбак","Ю.Ясень"], pzv:20, travel:38, ps:3.918224, video:2.418322, os:5.802418, rec:2.100000, rep:0.992018, r1:38.22, r2:66.18, fteNo:0.112208, fte:0.128441 },
    { div:"Минское", branch:"Филиал 500/8", obj:"Инфокиоск-узел №500/42 Минск, Немига", eng:[], pzv:20, travel:22, ps:2.417208, video:0.812402, os:4.118244, rec:1.500000, rep:0.712408, r1:24.18, r2:41.08, fteNo:0.094218, fte:0.108441, gap:true },
    { div:"Минское", branch:"Филиал 500/12", obj:"ЦОУ №500/12 Борисов, пр-т Революции 19", eng:["Ю.Ясень"], pzv:20, travel:84, ps:2.117211, video:1.017302, os:3.708221, rec:1.200000, rep:0.612408, r1:24.02, r2:42.18, fteNo:0.068218, fte:0.089108 },
  ];

  const fmt6 = (v) => v === 0 ? <span className="muted">—</span> : v.toFixed(6);
  const fmt2 = (v) => v === 0 ? <span className="muted">—</span> : v.toFixed(2);

  return (
    <div className="app">
      <Sidebar active="svod" />
      <div className="main">
        <Topbar crumbs={["Workspace", "Summary · СВОД"]} />
        <div className="content" style={{padding:0, display:"flex", flexDirection:"column"}}>
          {/* Sticky filter bar */}
          <div style={{
            padding:"20px 28px 16px", borderBottom:"1px solid var(--line)",
            background:"var(--bg-elev)"
          }}>
            <div className="page-head" style={{margin:0, alignItems:"center"}}>
              <div>
                <h1 className="page-title" style={{fontSize:22}}>Consolidated Summary · СВОД</h1>
                <div className="page-sub">2 935 objects · computed from H1 2026 normatives</div>
              </div>
              <div className="page-actions">
                <button className="btn"><Icons.file size={13}/>Export PDF</button>
                <button className="btn"><Icons.download size={13}/>Export XLSX</button>
                <button className="btn primary"><Icons.clock size={13}/>Recalculate</button>
              </div>
            </div>

            <div style={{display:"flex", gap:8, marginTop:16, alignItems:"center"}}>
              <div style={{display:"flex", gap:6, padding:"3px", background:"var(--bg-sunken)", borderRadius:6}}>
                {["All divisions","Брестское","Витебское","Гомельское","Гродненское","Минское","Могилёвское","Минск гор."].map((d,i) => (
                  <div key={i} style={{
                    padding:"5px 10px", fontSize:12, borderRadius:4,
                    background: i===0 ? "var(--bg-elev)" : "transparent",
                    fontWeight: i===0 ? 600 : 450,
                    color: i===0 ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: i===0 ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                  }}>{d}</div>
                ))}
              </div>
              <div style={{flex:1}}/>
              <div style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 10px", border:"1px solid var(--line)",
                borderRadius:6, fontSize:12, color:"var(--ink-3)", background:"var(--bg-elev)",
                minWidth:240
              }}>
                <Icons.search size={13}/>
                Search 2 935 objects...
                <span className="mono" style={{marginLeft:"auto", fontSize:10, padding:"1px 5px", background:"var(--bg-sunken)", borderRadius:3}}>⌘K</span>
              </div>
              <button className="btn sm"><Icons.filter size={12}/>3 filters</button>
            </div>
          </div>

          {/* Table */}
          <div style={{flex:1, overflow:"auto"}}>
            <table style={{tableLayout:"auto"}}>
              <thead style={{position:"sticky", top:0, zIndex:2}}>
                <tr>
                  <th style={{width:30, textAlign:"center"}}>#</th>
                  <th>Object</th>
                  <th>Engineers</th>
                  <th style={{textAlign:"right"}}>PZV</th>
                  <th style={{textAlign:"right"}}>Travel</th>
                  <th style={{textAlign:"right", borderLeft:"1px dashed var(--line)"}}>
                    <span style={{color:"var(--accent)"}}>■</span> Fire · ПС
                  </th>
                  <th style={{textAlign:"right"}}>Video</th>
                  <th style={{textAlign:"right"}}>Security · ОС</th>
                  <th style={{textAlign:"right"}}>Records</th>
                  <th style={{textAlign:"right"}}>Repair</th>
                  <th style={{textAlign:"right", borderLeft:"1px dashed var(--line)"}}>R1</th>
                  <th style={{textAlign:"right"}}>R2</th>
                  <th style={{textAlign:"right", borderLeft:"1px dashed var(--line)"}}>FTE (no travel)</th>
                  <th style={{textAlign:"right", background:"var(--bg-sunken)"}}>ИТОГО Числ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{textAlign:"center", color:"var(--ink-4)", fontSize:11}} className="mono">{i+1}</td>
                    <td>
                      <div style={{fontSize:13, fontWeight:500, maxWidth:320, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                        {r.obj}
                      </div>
                      <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>
                        {r.div} · {r.branch}
                        {r.stale && <span style={{marginLeft:8}}><StatusChip kind="warn">stale</StatusChip></span>}
                      </div>
                    </td>
                    <td>
                      {r.gap
                        ? <StatusChip kind="danger">coverage gap</StatusChip>
                        : (
                          <div style={{display:"flex", alignItems:"center"}}>
                            {r.eng.slice(0,3).map((e,j) => (
                              <div key={j} className="avatar" style={{
                                width:22, height:22, fontSize:9,
                                border:"2px solid var(--bg-elev)",
                                marginLeft: j === 0 ? 0 : -6
                              }}>{e.split(".").map(s=>s[0]).join("")}</div>
                            ))}
                            <span style={{marginLeft:8, fontSize:12, color:"var(--ink-3)"}}>
                              {r.eng.length} engineer{r.eng.length>1?"s":""}
                            </span>
                          </div>
                        )
                      }
                    </td>
                    <td className="num-cell">{fmt2(r.pzv)}</td>
                    <td className="num-cell">{fmt2(r.travel)}</td>
                    <td className="num-cell" style={{borderLeft:"1px dashed var(--line)"}}>{fmt6(r.ps)}</td>
                    <td className="num-cell">{fmt6(r.video)}</td>
                    <td className="num-cell">{fmt6(r.os)}</td>
                    <td className="num-cell">{fmt6(r.rec)}</td>
                    <td className="num-cell">{fmt6(r.rep)}</td>
                    <td className="num-cell" style={{borderLeft:"1px dashed var(--line)", color:"var(--ink-3)"}}>{fmt2(r.r1)}</td>
                    <td className="num-cell" style={{color:"var(--ink-3)"}}>{fmt2(r.r2)}</td>
                    <td className="num-cell" style={{borderLeft:"1px dashed var(--line)"}}>{fmt6(r.fteNo)}</td>
                    <td className="num-cell" style={{background:"var(--bg-sunken)", fontWeight:700}}>{r.fte.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          <div style={{
            borderTop:"1px solid var(--line)", background:"var(--bg-elev)",
            padding:"12px 28px", display:"flex", alignItems:"center", gap:24,
            fontSize:12
          }}>
            <div>
              <span className="muted">Showing</span> <b>1–10 of 2 935</b>
            </div>
            <div style={{marginLeft:"auto", display:"flex", gap:24, alignItems:"center"}}>
              <div><span className="muted">Avg FTE</span> <span className="mono" style={{fontWeight:600, marginLeft:6}}>0.078214</span></div>
              <div><span className="muted">Σ FTE (page)</span> <span className="mono" style={{fontWeight:600, marginLeft:6}}>0.882195</span></div>
              <div><span className="muted">Σ FTE (all)</span> <span className="mono" style={{fontWeight:700, color:"var(--ink)", marginLeft:6, fontSize:13}}>205.7499</span></div>
              <div style={{display:"flex", gap:4}}>
                <button className="btn sm">‹</button>
                <button className="btn sm primary">1</button>
                <button className="btn sm">2</button>
                <button className="btn sm">3</button>
                <span className="muted" style={{alignSelf:"center", padding:"0 4px"}}>…</span>
                <button className="btn sm">294</button>
                <button className="btn sm">›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SvodScreen = SvodScreen;
