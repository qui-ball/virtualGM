/* global React, Bar, Icon */
const { useState } = React;

function Lobby({onResume, onSwitchChar, onTheme, theme}){
  const c = window.RPG.character;
  const camps = window.RPG.campaigns;
  const active = camps.find(x=>x.active);

  return (
    <>
      <div className="appbar">
        <div>
          <div className="lbl" style={{color:"var(--accent)"}}>Welcome back</div>
          <div className="h">{c.name}</div>
          <div className="sub">{c.subclass} · Level {c.level}</div>
        </div>
        <button className="iconbtn" onClick={onSwitchChar} aria-label="Switch character"><Icon.swap/></button>
      </div>

      <div className="scroll">
        {/* Hero card */}
        <div className="panel glow" style={{padding:"16px"}}>
          <div className="row sb">
            <div className="lbl">Active Campaign</div>
            <span className="pill tint">CH {active.chapter} · T {active.time}/{active.timeMax}</span>
          </div>
          <div className="h-display" style={{fontSize:22, marginTop:6}}>{active.title}</div>
          <div className="muted" style={{fontSize:12, marginTop:2}}>Last: {active.lastScene}</div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14}}>
            <div>
              <div className="row sb"><span className="lbl">HP</span><span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{c.hp}/{c.hpMax}</span></div>
              <Bar value={c.hp} max={c.hpMax} kind="hp"/>
            </div>
            <div>
              <div className="row sb"><span className="lbl">Mana</span><span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{c.mp}/{c.mpMax}</span></div>
              <Bar value={c.mp} max={c.mpMax} kind="mp"/>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <div className="row sb"><span className="lbl">XP → Level {c.level+1}</span><span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{c.xp}/{c.xpNext}</span></div>
            <Bar value={c.xp} max={c.xpNext} kind="xp"/>
          </div>

          <button className="btn primary" style={{width:"100%", marginTop:14, fontSize:15, letterSpacing:".18em", textTransform:"uppercase"}} onClick={onResume}>
            <Icon.bolt style={{width:18, height:18}}/> Resume Session
          </button>
        </div>

        {/* Stat strip */}
        <div className="panel" style={{padding:"10px 12px"}}>
          <div className="row sb" style={{marginBottom:8}}>
            <div className="lbl">Attributes</div>
            <span className="mono" style={{fontSize:10, color:"var(--ink-3)"}}>roll d20 + stat</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6}}>
            {Object.entries(c.stats).map(([k,v])=>(
              <div key={k} className={`chip ${k==="Wit"?"hot":""}`}>
                <div className="v">{v>=0?`+${v}`:v}</div>
                <div className="k">{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rune-divider"><span>Other Campaigns</span></div>

        {camps.filter(x=>!x.active).map(cm=>(
          <div key={cm.id} className="panel" style={{padding:"12px 14px"}}>
            <div className="row sb">
              <div>
                <div className="h-body" style={{fontSize:15}}>{cm.title}</div>
                <div className="mono" style={{fontSize:10, color:"var(--ink-3)", letterSpacing:".18em", textTransform:"uppercase", marginTop:2}}>{cm.char} · {cm.classShort} · CH {cm.chapter}</div>
              </div>
              <span className="pill">Open</span>
            </div>
            {cm.pendingLevelUp && (
              <div style={{marginTop:8}}>
                <span className="pill solid" style={{fontSize:10}}>↑ Pending Level-Up</span>
              </div>
            )}
          </div>
        ))}

        <button className="btn ghost" style={{width:"100%"}}>+ New Campaign</button>

        <div className="rune-divider"><span>Theme</span></div>
        <div className="seg" style={{flexWrap:"wrap"}}>
          {[
            {id:"necropolis", label:"Undead"},
            {id:"dragonfire", label:"Dragon"},
            {id:"tempest", label:"Tempest"},
            {id:"sylvan", label:"Sylvan"},
          ].map(t=>(
            <button key={t.id} className={theme===t.id?"on":""} onClick={()=>onTheme(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="seg" style={{marginTop:6}}>
          {[
            {id:"obsidian", label:"Obsidian"},
            {id:"bloodmoon", label:"Bloodmoon"},
            {id:"vellum", label:"Vellum"},
            {id:"mithril", label:"Mithril"},
          ].map(t=>(
            <button key={t.id} className={theme===t.id?"on":""} onClick={()=>onTheme(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="seg" style={{marginTop:6}}>
          {[
            {id:"storm", label:"Storm"},
            {id:"ember", label:"Ember"},
            {id:"verdant", label:"Verdant"},
            {id:"parchment", label:"Tome"},
          ].map(t=>(
            <button key={t.id} className={theme===t.id?"on":""} onClick={()=>onTheme(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
    </>
  );
}

window.Lobby = Lobby;
