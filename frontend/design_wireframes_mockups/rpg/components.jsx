/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ---------- icons ----------
const Icon = {
  bolt: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(95,200,255,.15)"/></svg>),
  shield: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.5"/></svg>),
  swords: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M14 4l6 6-2 2-6-6 2-2zM4 20l6-6-2-2-6 6 2 2zM10 14l4-4" stroke="currentColor" strokeWidth="1.5"/></svg>),
  eye: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>),
  scroll: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5"/></svg>),
  home: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7H10v7H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.5"/></svg>),
  flame: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 11-10 0c0-3 2-4 2-7 2 1 3 0 3-3z" stroke="currentColor" strokeWidth="1.5"/></svg>),
  close: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7"/></svg>),
  menu: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7"/></svg>),
  send: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12l18-9-7 18-3-7-8-2z" stroke="currentColor" strokeWidth="1.5" fill="rgba(95,200,255,.2)"/></svg>),
  swap: (p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M7 4l-3 3 3 3M4 7h12M17 14l3 3-3 3M20 17H8" stroke="currentColor" strokeWidth="1.5"/></svg>),
};

// ---------- StatusBar ----------
function StatusBar(){
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="right">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M0 8h2v3H0zm4-2h2v5H4zm4-3h2v8H8zm4-3h2v11h-2z"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M1 4a8 8 0 0114 0M3.5 6.5a5 5 0 019 0M6 9a2.5 2.5 0 014 0" stroke="currentColor"/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="18" height="10" rx="2" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="20" y="3.5" width="1.5" height="4" rx=".5" fill="currentColor"/></svg>
      </span>
    </div>
  );
}

// ---------- TabBar ----------
function TabBar({active, onChange}){
  const tabs = [
    { id:"lobby", label:"Lobby", ic:<Icon.home className="ico"/> },
    { id:"session", label:"Session", ic:<Icon.bolt className="ico"/> },
    { id:"sheet", label:"Sheet", ic:<Icon.scroll className="ico"/> },
  ];
  return (
    <div className="tabbar" role="tablist" aria-label="Main">
      {tabs.map(t=>(
        <button key={t.id} role="tab" aria-selected={active===t.id} className={active===t.id?"on":""} onClick={()=>onChange(t.id)}>
          {t.ic}
          <span>{t.label}</span>
        </button>
      ))}
      <div className="home-indicator"/>
    </div>
  );
}

// ---------- Bar ----------
function Bar({value, max, kind="hp"}){
  const pct = Math.max(0, Math.min(100, (value/max)*100));
  return <div className={`bar ${kind}`}><i style={{width: pct+"%"}}/></div>;
}

// ---------- Phone shell ----------
function Phone({label, children}){
  return (
    <div className="phone-wrap">
      <div className="phone-cap">{label}</div>
      <div className="phone"><div className="screen">
        <StatusBar/>
        {children}
      </div></div>
    </div>
  );
}

Object.assign(window, { Icon, StatusBar, TabBar, Bar, Phone });
