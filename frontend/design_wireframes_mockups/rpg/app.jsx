/* global React, ReactDOM, Session */
const { useState, useEffect } = React;

const THEMES = [
  { id: "storm",      label: "Storm",   tag: "Lightning Mage" },
  { id: "necropolis", label: "Undead",  tag: "Lich-touched"   },
  { id: "obsidian",   label: "Obsidian",tag: "Forge Warrior"  },
  { id: "mithril",    label: "Mithril", tag: "Argent Cleric"  },
];

function App(){
  const [showTweaks, setShowTweaks] = useState(false);
  useEffect(()=>{
    const handler = (e)=>{
      if (e.data?.type === "__activate_edit_mode") setShowTweaks(true);
      if (e.data?.type === "__deactivate_edit_mode") setShowTweaks(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({type:"__edit_mode_available"}, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="stage">
      <div className="stage-head">
        <h1>RPG <b>Companion</b> · Session A across 4 themes</h1>
        <div className="meta">embedded sheet · pull stats row down to expand</div>
      </div>

      <div className="theme-stage">
        {THEMES.map((t) => <ThemedPhone key={t.id} theme={t} />)}
      </div>

      {showTweaks && (
        <div style={{position:"fixed", right:16, bottom:16, width:260, zIndex:1000, background:"var(--panel)", border:"1px solid var(--accent)", borderRadius:14, padding:14, boxShadow:"var(--glow)", color:"var(--ink)"}}>
          <div className="row sb" style={{marginBottom:8}}>
            <div className="h-display" style={{fontSize:14, color:"var(--accent)"}}>Tweaks</div>
            <button className="iconbtn" onClick={()=>{ setShowTweaks(false); window.parent.postMessage({type:"__edit_mode_dismissed"}, "*"); }} aria-label="Close"><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7"/></svg></button>
          </div>
          <div className="muted" style={{fontSize:11, lineHeight:1.5}}>
            Each phone runs Session A in its own theme. Drag the pull-handle below the stats row down past mid-screen to expand the embedded character sheet; drag up to collapse. Tap a roll prompt in chat to roll; use "+" in the composer for utility actions; ≡ top-right for Lobby / settings.
          </div>
        </div>
      )}
    </div>
  );
}

function ThemedPhone({ theme }){
  return (
    <div className="phone-wrap" data-theme={theme.id}>
      <div className="phone-cap">{theme.label.toUpperCase()} · <span style={{color:"var(--accent)"}}>{theme.tag}</span></div>
      <div className="phone" data-screen-label={`${theme.label} · Session`}>
        <div className="screen">
          <div className="statusbar">
            <span>9:41</span>
            <span className="right">
              <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M0 8h2v3H0zm4-2h2v5H4zm4-3h2v8H8zm4-3h2v11h-2z"/></svg>
              <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="18" height="10" rx="2" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/></svg>
            </span>
          </div>
          <Session themeId={theme.id} />
          <div className="home-indicator"/>
        </div>
      </div>
    </div>
  );
}

const root = document.createElement("div");
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<App/>);
