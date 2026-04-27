/* global React, Icons */

function LoginScreen() {
  const stats = [
    { label: "Objects under maintenance", value: "2 935", spark: [22,24,25,27,28,30,32,34] },
    { label: "Required FTE · H1 2026", value: "205.75" },
    { label: "Active engineers", value: "148" },
  ];

  return (
    <div style={{
      width: 1440, height: 900,
      display: "grid", gridTemplateColumns: "1fr 520px",
      background: "var(--bg)", fontFamily: "var(--font-sans)", color: "var(--ink)"
    }}>
      {/* Left — brand pane */}
      <div style={{
        background: "var(--ink)", color: "#fff",
        position: "relative", overflow: "hidden",
        padding: "40px 56px",
        display: "flex", flexDirection: "column", justifyContent: "space-between"
      }}>
        {/* dot grid bg */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          pointerEvents: "none"
        }}/>
        {/* gradient blob */}
        <div style={{
          position:"absolute", right:-160, top:-120, width:520, height:520, borderRadius:"50%",
          background:"radial-gradient(circle at 30% 30%, rgba(58,79,207,0.55), transparent 60%)"
        }}/>

        <div style={{position:"relative", display:"flex", alignItems:"center", gap:12}}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "#fff", color: "var(--ink)",
            display: "grid", placeItems: "center", fontWeight: 700,
            fontFamily: "var(--font-mono)", fontSize: 16
          }}>W</div>
          <div>
            <div style={{fontWeight:600, fontSize:15, letterSpacing:"-0.01em"}}>Workload Calculator</div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.55)"}}>Belarusbank · Security systems maintenance</div>
          </div>
        </div>

        <div style={{position:"relative", maxWidth: 460}}>
          <div style={{
            fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase",
            color:"rgba(255,255,255,0.5)", marginBottom:14
          }}>Planning period · H1 2026</div>
          <h1 style={{
            fontSize: 44, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1,
            margin: 0, marginBottom: 18
          }}>
            Calculate maintenance headcount<br/>across <span style={{color:"#9ab2ff"}}>2 935 objects</span>.
          </h1>
          <p style={{
            fontSize:14, lineHeight:1.55, color:"rgba(255,255,255,0.65)",
            margin:0, maxWidth:420
          }}>
            Replace the manual XLSX workflow with an auditable, deterministic engine.
            Equipment normatives flow through to FTE coefficients automatically.
          </p>

          {/* stat strip */}
          <div style={{
            marginTop: 36, display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1, background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow:"hidden"
          }}>
            {stats.map((s,i) => (
              <div key={i} style={{
                background:"var(--ink)", padding:"16px 18px"
              }}>
                <div style={{
                  fontSize:10, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase",
                  color:"rgba(255,255,255,0.5)"
                }}>{s.label}</div>
                <div className="num" style={{
                  fontSize:22, fontWeight:500, letterSpacing:"-0.02em", marginTop:8, lineHeight:1
                }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center",
          fontSize:11, color:"rgba(255,255,255,0.45)"
        }}>
          <span>v2.24 · build 8f3a-e921</span>
          <span style={{display:"flex", alignItems:"center", gap:6}}>
            <span style={{width:6, height:6, borderRadius:"50%", background:"#4ade80"}}/>
            All systems operational
          </span>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        background:"var(--bg-elev)", padding:"56px 64px",
        display:"flex", flexDirection:"column", justifyContent:"center"
      }}>
        <div style={{maxWidth: 360, width:"100%"}}>
          <div style={{fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:8}}>
            Sign in
          </div>
          <h2 style={{fontSize:28, fontWeight:600, letterSpacing:"-0.02em", margin:"0 0 8px"}}>
            Welcome back.
          </h2>
          <p style={{fontSize:13, color:"var(--ink-3)", margin:"0 0 32px"}}>
            Use your corporate credentials to access the workload tool.
          </p>

          <form style={{display:"flex", flexDirection:"column", gap:18}}>
            <div className="field">
              <div className="field-label">Email</div>
              <input className="input" defaultValue="a.prikhodko@belarusbank.by" />
            </div>
            <div className="field">
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                <div className="field-label">Password</div>
                <a style={{fontSize:11, color:"var(--accent)", textDecoration:"none", fontWeight:500}}>Forgot?</a>
              </div>
              <div style={{position:"relative"}}>
                <input className="input" type="password" defaultValue="••••••••••••" style={{paddingRight:36, width:"100%"}}/>
                <div style={{position:"absolute", right:8, top:8, color:"var(--ink-4)"}}>
                  <Icons.search size={16}/>
                </div>
              </div>
            </div>

            <label style={{display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--ink-2)", marginTop:4}}>
              <span style={{
                width:14, height:14, borderRadius:3, border:"1.5px solid var(--ink)",
                background:"var(--ink)", display:"grid", placeItems:"center", color:"#fff"
              }}>
                <Icons.check size={10} sw={2.5}/>
              </span>
              Keep me signed in for 30 days
            </label>

            <button type="button" className="btn primary" style={{
              padding:"12px 14px", fontSize:14, fontWeight:500, justifyContent:"center", marginTop:4
            }}>
              Sign in
              <Icons.chevR size={14}/>
            </button>
          </form>

          <div style={{
            display:"flex", alignItems:"center", gap:12, margin:"28px 0",
            color:"var(--ink-4)", fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase"
          }}>
            <div style={{flex:1, height:1, background:"var(--line)"}}/>
            or
            <div style={{flex:1, height:1, background:"var(--line)"}}/>
          </div>

          <button type="button" className="btn" style={{
            width:"100%", padding:"11px 14px", fontSize:13, justifyContent:"center", gap:10
          }}>
            <span style={{
              width:18, height:18, borderRadius:4, background:"var(--accent)",
              color:"#fff", display:"grid", placeItems:"center",
              fontFamily:"var(--font-mono)", fontSize:11, fontWeight:700
            }}>S</span>
            Continue with corporate SSO
          </button>

          <div style={{marginTop:32, fontSize:11, color:"var(--ink-3)", lineHeight:1.6}}>
            Trouble signing in? Contact <span style={{color:"var(--ink)", fontWeight:500}}>IT Service Desk</span> ext. 4400 or <span style={{color:"var(--accent)"}}>helpdesk@belarusbank.by</span>.
          </div>

          <div style={{
            marginTop:48, paddingTop:20, borderTop:"1px solid var(--line)",
            display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--ink-4)"
          }}>
            <span>© 2026 Belarusbank</span>
            <span style={{display:"flex", gap:14}}>
              <span>Privacy</span>
              <span>Terms</span>
              <span>Status</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variant B — minimal centered card
function LoginMinimalScreen() {
  return (
    <div style={{
      width: 1440, height: 900,
      background: "var(--bg)",
      display:"grid", placeItems:"center",
      position:"relative", overflow:"hidden",
      fontFamily:"var(--font-sans)"
    }}>
      {/* faint grid */}
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:"linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
        backgroundSize:"48px 48px",
        opacity:0.5,
        maskImage:"radial-gradient(ellipse at center, black 20%, transparent 70%)",
        WebkitMaskImage:"radial-gradient(ellipse at center, black 20%, transparent 70%)"
      }}/>

      <div style={{
        position:"absolute", top:32, left:40,
        display:"flex", alignItems:"center", gap:10
      }}>
        <div style={{
          width:28, height:28, borderRadius:7, background:"var(--ink)", color:"#fff",
          display:"grid", placeItems:"center", fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13
        }}>W</div>
        <div style={{fontSize:13, fontWeight:600}}>Workload Calculator</div>
      </div>

      <div style={{
        position:"relative", width:400, background:"var(--bg-elev)",
        border:"1px solid var(--line)", borderRadius:14, padding:"36px 36px 28px"
      }}>
        <div style={{
          width:42, height:42, borderRadius:10, background:"var(--ink)", color:"#fff",
          display:"grid", placeItems:"center", fontWeight:700, fontFamily:"var(--font-mono)", fontSize:18,
          marginBottom:20
        }}>W</div>

        <h2 style={{fontSize:22, fontWeight:600, letterSpacing:"-0.015em", margin:"0 0 4px"}}>
          Sign in to Workload
        </h2>
        <p style={{fontSize:13, color:"var(--ink-3)", margin:"0 0 24px"}}>
          Use your @belarusbank.by account.
        </p>

        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="field">
            <div className="field-label">Email</div>
            <input className="input" defaultValue="a.prikhodko@belarusbank.by"/>
          </div>
          <div className="field">
            <div className="field-label">Password</div>
            <input className="input" type="password" defaultValue="••••••••••••"/>
          </div>

          <button type="button" className="btn primary" style={{
            padding:"11px 14px", fontSize:14, fontWeight:500, justifyContent:"center", marginTop:6
          }}>
            Continue
          </button>

          <button type="button" className="btn" style={{
            padding:"10px 14px", fontSize:13, justifyContent:"center"
          }}>
            Continue with SSO
          </button>
        </div>

        <div style={{
          marginTop:22, paddingTop:16, borderTop:"1px solid var(--line)",
          display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--ink-3)"
        }}>
          <a style={{color:"var(--ink-2)"}}>Forgot password?</a>
          <span>v2.24</span>
        </div>
      </div>

      <div style={{position:"absolute", bottom:24, fontSize:11, color:"var(--ink-3)"}}>
        © 2026 Belarusbank · Internal use only
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
window.LoginMinimalScreen = LoginMinimalScreen;
