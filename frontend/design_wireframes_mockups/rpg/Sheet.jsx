/* global React, Bar, Icon */
const { useState } = React;

function Sheet({onClose}){
  const c = window.RPG.character;
  const [tab, setTab] = useState("combat");
  const [tier, setTier] = useState("Minor");

  return (
    <>
      <div className="appbar">
        <div style={{display:"flex", alignItems:"center", gap:10, minWidth:0}}>
          <div className="sigil">Z</div>
          <div style={{minWidth:0}}>
            <div className="h" style={{fontSize:20}}>{c.name}</div>
            <div className="sub">{c.subclass} Mage · Lv {c.level}</div>
          </div>
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="Close sheet"><Icon.close/></button>
      </div>

      {/* sticky stat block */}
      <div style={{padding:"12px 14px", borderBottom:"1px solid var(--panel-edge)", background:"linear-gradient(180deg, rgba(95,200,255,.06), transparent)", zIndex:2}}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6}}>
          {Object.entries(c.stats).map(([k,v])=>(
            <div key={k} className={`chip ${k==="Wit"?"hot":""}`}>
              <div className="v">{v>=0?`+${v}`:v}</div>
              <div className="k">{k}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr", gap:6, marginTop:6}}>
          <div className="chip"><div className="v" style={{fontSize:14}}>{c.hp}<span style={{color:"var(--ink-3)", fontSize:10}}>/{c.hpMax}</span></div><div className="k">HP</div></div>
          <div className="chip hot"><div className="v" style={{fontSize:14}}>{c.mp}/{c.mpMax}</div><div className="k">MP</div></div>
          <div className="chip"><div className="v">{c.evasion}</div><div className="k">Eva</div></div>
          <div className="chip"><div className="v">+{c.stats.Fin}</div><div className="k">Init</div></div>
        </div>
      </div>

      <div className="seg" style={{margin:"12px 14px 0", borderRadius:10}}>
        {[
          {id:"combat", label:"Combat"},
          {id:"spells", label:"Spells"},
          {id:"abil", label:"Abilities"},
          {id:"inv", label:"Inventory"},
        ].map(t=>(
          <button key={t.id} className={tab===t.id?"on":""} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="scroll">
        {tab==="combat" && (
          <>
            <div className="lbl">Weapons</div>
            {c.weapons.map(w=>(
              <div key={w.name} className="panel">
                <div className="row sb">
                  <div className="h-body" style={{fontSize:15}}>{w.name}</div>
                  <span className="pill">{w.stat}</span>
                </div>
                <div className="mono muted" style={{fontSize:11, marginTop:2}}>{w.dice} + {w.stat} · {w.note}</div>
                <button className="btn primary" style={{width:"100%", marginTop:8}}>
                  <Icon.swords style={{width:14,height:14}}/> Attack — d20 +{c.stats[w.stat]}
                </button>
              </div>
            ))}

            <div className="lbl" style={{marginTop:6}}>Armor</div>
            <div className="panel">
              <div className="row sb">
                <div className="h-body">{c.armor.name}</div>
                <span className="pill tint">{c.armor.type}</span>
              </div>
              <div className="mono muted" style={{fontSize:11, marginTop:2}}>+{c.armor.evaBonus} Eva · Mage allowed</div>
            </div>

            <div className="lbl" style={{marginTop:6}}>Saving throws (10 + stat)</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6}}>
              {Object.entries(c.stats).map(([k,v])=>(
                <div key={k} className="chip"><div className="v">{10+v}</div><div className="k">{k}</div></div>
              ))}
            </div>
          </>
        )}

        {tab==="spells" && (
          <>
            <div className="panel glow">
              <div className="row sb">
                <div className="lbl">Mana</div>
                <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>3 + lv + Pre = {c.mpMax}</span>
              </div>
              <div style={{display:"flex", gap:4, marginTop:8, flexWrap:"wrap"}}>
                {Array.from({length:c.mpMax}).map((_,i)=>(
                  <div key={i} style={{
                    width:18, height:18, borderRadius:"50%",
                    border:"1px solid var(--accent)",
                    background: i<c.mp ? "radial-gradient(circle, var(--accent-3), var(--accent-2))" : "transparent",
                    boxShadow: i<c.mp ? "var(--glow)" : "none"
                  }}/>
                ))}
              </div>
            </div>

            <div className="seg">
              {["Minor","Major","Mythic"].map(t=>(
                <button key={t} className={tier===t?"on":""} onClick={()=>setTier(t)}>{t} {t==="Minor"?"1":t==="Major"?"2":"3"} MP</button>
              ))}
            </div>

            {c.spells.filter(s=>s.tier===tier).map(s=>(
              <div key={s.id} className={`panel ${s.locked?"":""}`} style={{opacity: s.locked?.55:1}}>
                <div className="row sb">
                  <div className="h-body" style={{fontSize:15}}>{s.name}</div>
                  {s.locked
                    ? <span className="pill danger">{s.locked}</span>
                    : <span className="pill solid">{s.cost} MP</span>}
                </div>
                <div style={{fontSize:13, marginTop:6, color:"var(--ink-2)", lineHeight:1.4}}>{s.desc}</div>
                {!s.locked && (
                  <button className="btn primary" style={{width:"100%", marginTop:8}}>
                    <Icon.bolt style={{width:14,height:14}}/> Cast {s.name}
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {tab==="abil" && (
          <>
            <div className="lbl">Class abilities · Stormcaller</div>
            {c.abilities.map(a=>(
              <div key={a.name} className="panel" style={{opacity: a.locked?.5:1}}>
                <div className="row sb">
                  <div className="h-body" style={{fontSize:15}}>{a.name}</div>
                  <span className={`pill ${a.locked?"danger":"tint"}`}>Lv {a.lv}{a.locked?" · locked":""}</span>
                </div>
                <div style={{fontSize:13, marginTop:6, color:"var(--ink-2)", lineHeight:1.4}}>{a.desc}</div>
              </div>
            ))}
            <div className="rune-divider"><span>Next unlock at Lv 5</span></div>
          </>
        )}

        {tab==="inv" && (
          <>
            <div className="panel">
              <div className="lbl" style={{marginBottom:6}}>Currency</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6}}>
                {[
                  {k:"CP", v:c.coin_purse?.copper ?? 0, c:"#c47a4a"},
                  {k:"SP", v:c.coin_purse?.silver ?? 0, c:"#b8c8dc"},
                  {k:"GP", v:c.coin_purse?.gold ?? c.gold, c:"var(--xp)"},
                  {k:"PP", v:c.coin_purse?.platinum ?? 0, c:"#e4dff5"},
                ].map(x=>(
                  <div key={x.k} style={{textAlign:"center", padding:"8px 4px", border:"1px solid var(--panel-edge)", borderRadius:6}}>
                    <div className="mono" style={{fontSize:9, color:"var(--ink-3)"}}>{x.k}</div>
                    <div className="h-display" style={{fontSize:18, color:x.c}}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lbl">Carried</div>
            {c.inventory.map(it=>(
              <div key={it.name} className="panel" style={{padding:"10px 12px"}}>
                <div className="row sb">
                  <div className="h-body" style={{fontSize:14}}>{it.name}</div>
                  <span className="pill">×{it.qty}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

window.Sheet = Sheet;
