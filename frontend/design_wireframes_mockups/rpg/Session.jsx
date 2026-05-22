/* global React, Icon, Bar */
const { useState, useEffect, useRef } = React;

// ---------- per-theme character + scene + transcript ----------
// advType is set by the GM/system (not the player). Values: "norm" | "adv" | "dis".
const THEME_DATA = {
  storm: {
    char: {
      name: "Zaelan", classFull: "Stormcaller Mage", classShort: "Mage", level: 4,
      xp: 680, xpNext: 1000,
      stats: { Mig: -1, Fin: 0, Wit: 2, Pre: 1 },
      hp: 18, hpMax: 22, mp: 6, mpMax: 9,
      evasion: 12, initiative: 0,
      conditions: [],
    },
    campaign: { title: "The Hollow Pact", chapter: 3, scene: "Tavern, dusk", time: 37, timeMax: 50 },
    monogram: "Z",
    seed: [
      { kind: "scene", text: "Scene · The wagon" },
      { who: "gm", ts: "19:42", text: 'Rain hammers the slate roof. The bandit captain steps from the back room, two crossbows leveled. "Drop the satchel — last warning."' },
      { who: "you", ts: "19:43", text: "I draw a line of static along the floorboards toward the puddle at his feet." },
      { who: "prompt", ts: "19:43", label: "Wit check", source: "static trick", stat: "Wit", mod: 2, dc: 13, advType: "norm", success: "Your bolt finds the puddle. The captain's boots fizz; he stumbles half a step. The crossbowmen exchange a look.", fail: "The static dies in the damp. He smiles, slow. \"Try again.\"" },
    ],
    sayLabel: "say or do something…",
  },
  necropolis: {
    char: {
      name: "Mirin Vael", classFull: "Lich-touched Necromancer", classShort: "Mage", level: 5,
      xp: 1820, xpNext: 2000,
      stats: { Mig: 0, Fin: -1, Wit: 3, Pre: 1 },
      hp: 16, hpMax: 24, mp: 7, mpMax: 10,
      evasion: 11, initiative: -1,
      conditions: ["Frightened"],
    },
    campaign: { title: "The Ashen March", chapter: 2, scene: "Crypt mouth", time: 42, timeMax: 50 },
    monogram: "M",
    seed: [
      { kind: "scene", text: "Scene · The crypt mouth" },
      { who: "gm", ts: "22:11", text: "Bone-dust drifts on the wind. From the dark beyond the threshold, three rasping breaths answer your own. The wardstone in your palm goes cold." },
      { who: "you", ts: "22:12", text: "I steel myself and step forward, holding the wardstone high." },
      { who: "prompt", ts: "22:12", label: "Pre save", source: "unliving fear", stat: "Pre", mod: 1, dc: 14, advType: "dis", advReason: "you are Frightened", footer: "fail → Frightened (deeper)", success: "The wardstone flares. The breathing stops, just for a moment.", fail: "Your knees buckle. The dark inside seems wider than the doorway." },
    ],
    sayLabel: "speak or invoke…",
  },
  obsidian: {
    char: {
      name: "Kael Vorin", classFull: "Forge-Sworn Warrior", classShort: "War", level: 4,
      xp: 720, xpNext: 1000,
      stats: { Mig: 2, Fin: 1, Wit: 0, Pre: -1 },
      hp: 28, hpMax: 34, mp: 0, mpMax: 0,
      evasion: 14, initiative: 1,
      conditions: [],
    },
    campaign: { title: "Iron Vigil", chapter: 3, scene: "The Anvil Gate", time: 29, timeMax: 50 },
    monogram: "K",
    seed: [
      { kind: "scene", text: "Scene · The Anvil Gate" },
      { who: "gm", ts: "20:03", text: "The mercenary's hammer rises in a long, slow arc. Sparks scatter off his shoulder plates. He's wide open on the recover." },
      { who: "you", ts: "20:04", text: "I take the opening — strike for the wrist." },
      { who: "prompt", ts: "20:04", label: "Attack", source: "Longsword · d8 + Mig", stat: "Mig", mod: 2, dc: 13, vsLabel: "vs Eva 13", advType: "adv", advReason: "target mid-swing", footer: "crit on nat-20", success: "Steel finds the gap in his bracer. The hammer falls into the dirt; he doesn't.", fail: "He pivots faster than he looks. The blow rings off his pauldron and your arm goes numb." },
    ],
    sayLabel: "say or do something…",
  },
  mithril: {
    char: {
      name: "Sister Auren", classFull: "Argent Cleric", classShort: "Clr", level: 3,
      xp: 410, xpNext: 500,
      stats: { Mig: 0, Fin: 0, Wit: 1, Pre: 2 },
      hp: 22, hpMax: 26, mp: 5, mpMax: 8,
      evasion: 13, initiative: 0,
      conditions: ["Prone"],
    },
    campaign: { title: "Silvered Vows", chapter: 1, scene: "Cathedral steps", time: 46, timeMax: 50 },
    monogram: "A",
    seed: [
      { kind: "scene", text: "Scene · Cathedral steps" },
      { who: "gm", ts: "18:55", text: "The reliquary's seal cracks under your touch. Argent light spills out — and the warden's eyes snap open, two pinpoints of cold silver." },
      { who: "you", ts: "18:56", text: "I raise my prayer-shield between us and speak the binding rite." },
      { who: "prompt", ts: "18:56", label: "Pre save", source: "hallowed binding", stat: "Pre", mod: 2, dc: 12, advType: "adv", advReason: "shield raised, rite spoken", footer: "fail → Restrained 1 turn", success: "Light meets light. The warden's gaze fractures into a thousand silvered shards.", fail: "The binding falters. Argent threads coil around your wrists." },
    ],
    sayLabel: "speak or pray…",
  },
};

// Two-phase reveal heights (px). Phase 1 = character header above stats. Phase 2 = sheet body below stats.
const PHASE1_MAX = 90;
const PHASE2_MAX = 380;
const FULL_PULL = PHASE1_MAX + PHASE2_MAX;

// ---------- Session screen ----------
function Session({ themeId = "storm", onOpenLobby }) {
  const theme = THEME_DATA[themeId] || THEME_DATA.storm;
  const c = theme.char;
  const camp = theme.campaign;

  const [transcript, setTranscript] = useState(theme.seed);
  const [composer, setComposer] = useState("");
  const [rolling, setRolling] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tray, setTray] = useState(null);
  const [hp, setHp] = useState(c.hp);
  const [mp, setMp] = useState(c.mp);
  const scrollRef = useRef(null);

  // Sheet state: open boolean + drag offset (px from anchor)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startY: 0, screenH: 0, phoneTop: 0, startOpen: false, moved: false, pointerId: 0 });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  // ----- chat actions -----
  const send = () => {
    if (!composer.trim()) return;
    const text = composer.trim();
    setComposer("");
    setTranscript(t => [...t, { who: "you", ts: nowTs(), text }]);
    setTimeout(() => {
      setTranscript(t => [...t, { who: "gm", ts: nowTs(), text: gmReply(themeId) }]);
    }, 700);
  };

  const rollPrompt = (idx) => {
    const p = transcript[idx];
    if (!p || p.rolled) return;
    const advUsed = p.advType || "norm";
    setRolling(true);
    setTimeout(() => {
      const r = window.RPG.roll({ adv: advUsed, mod: p.mod, vs: p.dc, label: p.label });
      setRolling(false);
      setTranscript(t => {
        const next = t.map((m, i) => i === idx ? { ...m, rolled: true, result: r, advUsed } : m);
        next.push({ who: "sys", kind: "result", ts: nowTs(), result: r, prompt: p, advUsed });
        next.push({ who: "gm", ts: nowTs(), text: r.pass === false ? (p.fail || "The GM considers your roll.") : (p.success || "The GM nods.") });
        return next;
      });
    }, 750);
  };

  const handlePlusAction = (action) => {
    setPlusOpen(false);
    if (action === "freeroll") { setTray({ kind: "free", label: "Free roll", mod: 0, vs: null }); return; }
    if (action === "shortrest") {
      const heal = Math.max(1, c.stats.Mig + 4);
      setHp(h => Math.min(c.hpMax, h + heal));
      setTranscript(t => [...t, { who: "sys", ts: nowTs(), kind: "rest", text: `Short rest · +${heal} HP · time −1 (t=${camp.time + 1}/${camp.timeMax})` }]);
      return;
    }
    if (action === "longrest") {
      setHp(c.hpMax); setMp(c.mpMax);
      setTranscript(t => [...t, { who: "sys", ts: nowTs(), kind: "rest", text: `Long rest · HP & MP full · time −5 (t=${camp.time + 5}/${camp.timeMax})` }]);
      return;
    }
    if (action === "cast") { setTray({ kind: "cast", label: "Voltaic Lance", mod: c.stats.Wit, vs: 13, cost: 1 }); return; }
    if (action === "item") {
      setTranscript(t => [...t, { who: "sys", ts: nowTs(), kind: "item", text: "Item used · Healing draught (+1d6+2 HP) · −1 from inventory" }]);
      return;
    }
    if (action === "note") {
      setTranscript(t => [...t, { who: "you", ts: nowTs(), text: "(OOC: brb 5 min)", ooc: true }]);
      return;
    }
  };

  const closeTray = () => setTray(null);
  const doFreeRoll = () => {
    if (!tray) return;
    setRolling(true);
    setTimeout(() => {
      const r = window.RPG.roll({ adv: "norm", mod: tray.mod, vs: tray.vs, label: tray.label });
      setRolling(false);
      if (tray.cost) setMp(m => Math.max(0, m - tray.cost));
      setTranscript(t => [...t, { who: "sys", ts: nowTs(), kind: "result", result: r, prompt: tray, advUsed: "norm", freeRoll: true }]);
      setTray(null);
    }, 600);
  };

  // ----- drag gesture (works whether sheet is closed OR open) -----
  const onHandleDown = (e) => {
    const phone = e.currentTarget.closest(".screen");
    const rect = phone.getBoundingClientRect();
    dragRef.current = {
      startY: e.clientY,
      screenH: phone.clientHeight,
      phoneTop: rect.top,
      startOpen: sheetOpen,
      moved: false,
      pointerId: e.pointerId,
    };
    setDragging(true);
    setDragOffset(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandleMove = (e) => {
    if (!dragging) return;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dy) > 4) dragRef.current.moved = true;
    // Constrain so the visible pull is in [0..FULL_PULL]
    const startPull = dragRef.current.startOpen ? FULL_PULL : 0;
    const desired = startPull + dy;
    const clamped = Math.max(0, Math.min(FULL_PULL, desired));
    setDragOffset(clamped - startPull);
  };
  const onHandleUp = (e) => {
    if (!dragging) return;
    const wasMoved = dragRef.current.moved;
    const finalY = e.clientY;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(dragRef.current.pointerId);

    if (!wasMoved) {
      setSheetOpen(o => !o); // tap toggles
    } else {
      const halfH = dragRef.current.screenH / 2;
      const relY = finalY - dragRef.current.phoneTop;
      // Threshold: finger past half-screen → open; before → close
      setSheetOpen(relY > halfH);
    }
    setDragOffset(0);
  };

  // ----- compute rendered pull -----
  const basePull = sheetOpen ? FULL_PULL : 0;
  const renderPull = dragging ? Math.max(0, Math.min(FULL_PULL, basePull + dragOffset)) : basePull;
  const topH = Math.min(renderPull, PHASE1_MAX);
  const botH = Math.max(0, renderPull - PHASE1_MAX);
  const openness = renderPull / FULL_PULL; // 0..1

  // ----- render -----
  return (
    <>
      {/* app bar */}
      <div className="appbar">
        <div style={{ minWidth: 0 }}>
          <div className="lbl" style={{ color: "var(--accent)" }}>
            {camp.title} · Ch {camp.chapter}
          </div>
          <div className="h" style={{ fontSize: 20 }}>{camp.scene}</div>
          <div className="sub">time {camp.time}/{camp.timeMax}</div>
        </div>
        <button className="iconbtn" aria-label="Menu" onClick={() => setMenuOpen(v => !v)}><Icon.menu /></button>
      </div>

      {/* CHARACTER HEADER (phase 1 reveal — slides in above the stats row) */}
      <div
        className={`char-header ${dragging ? "dragging" : ""}`}
        style={{ height: topH }}
        aria-hidden={topH < 4}
      >
        <div className="char-header-inner">
          <div className="row sb">
            <div style={{ minWidth: 0 }}>
              <div className="lbl">Character</div>
              <div className="h-display" style={{ fontSize: 18, marginTop: 1 }}>{c.name}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 2 }}>
                {c.classFull} · Lv {c.level}
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "0 0 auto" }}>
              <div className="lbl">XP → {c.level + 1}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>{c.xp}/{c.xpNext}</div>
              <div className="bar xp" style={{ width: 80, marginTop: 3 }}><i style={{ width: `${(c.xp / c.xpNext) * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS ROW (always visible) */}
      <div className="vital-strip">
        <div className="chip-row">
          <div className={`chip ${hp <= c.hpMax * 0.3 ? "bad" : hp <= c.hpMax * 0.6 ? "warn" : ""}`}>
            <div className="v" style={{ fontSize: 14 }}>{hp}<span style={{ color: "var(--ink-3)", fontSize: 10 }}>/{c.hpMax}</span></div>
            <div className="k">HP</div>
          </div>
          {c.mpMax > 0 ? (
            <div className="chip hot">
              <div className="v" style={{ fontSize: 14 }}>{mp}<span style={{ color: "var(--ink-3)", fontSize: 10 }}>/{c.mpMax}</span></div>
              <div className="k">Mana</div>
            </div>
          ) : (
            <div className="chip">
              <div className="v" style={{ fontSize: 14 }}>{c.stats.Mig >= 0 ? "+" : ""}{c.stats.Mig}</div>
              <div className="k">Mig</div>
            </div>
          )}
          <div className="chip">
            <div className="v" style={{ fontSize: 14 }}>{c.evasion}</div>
            <div className="k">Eva</div>
          </div>
          {c.conditions.length > 0 ? (
            <div className="chip warn">
              <div className="v" style={{ fontSize: 14 }}>!</div>
              <div className="k">{c.conditions[0]}</div>
            </div>
          ) : (
            <div className="chip">
              <div className="v" style={{ fontSize: 14 }}>{c.initiative >= 0 ? "+" : ""}{c.initiative}</div>
              <div className="k">Init</div>
            </div>
          )}
        </div>
      </div>

      {/* SHEET BOTTOM (phase 2 reveal — ability scores + combat + ...) */}
      <div
        className={`sheet-bot ${dragging ? "dragging" : ""}`}
        style={{ height: botH }}
        aria-hidden={botH < 4}
      >
        <div className="sheet-bot-inner">
          {/* ability scores */}
          <div className="drawer-stats">
            {Object.entries(c.stats).map(([k, v]) => (
              <div className="chip" key={k}>
                <div className="v" style={{ fontSize: 16 }}>{v >= 0 ? "+" : ""}{v}</div>
                <div className="k">{k}</div>
              </div>
            ))}
          </div>

          {/* combat / vitals / abilities / inv */}
          <div className="panel">
            <div className="row sb"><div className="lbl">Vitals</div><div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Init {c.initiative >= 0 ? "+" : ""}{c.initiative}</div></div>
            <div style={{ display: "grid", gridTemplateColumns: c.mpMax > 0 ? "1fr 1fr" : "1fr 1fr", gap: 8, marginTop: 6 }}>
              <div>
                <div className="row sb"><span className="lbl">HP</span><span className="mono" style={{ fontSize: 10 }}>{hp}/{c.hpMax}</span></div>
                <Bar value={hp} max={c.hpMax} kind="hp" />
              </div>
              {c.mpMax > 0 ? (
                <div>
                  <div className="row sb"><span className="lbl">Mana</span><span className="mono" style={{ fontSize: 10 }}>{mp}/{c.mpMax}</span></div>
                  <Bar value={mp} max={c.mpMax} kind="mp" />
                </div>
              ) : (
                <div>
                  <div className="row sb"><span className="lbl">Evasion</span><span className="mono" style={{ fontSize: 10 }}>{c.evasion}</span></div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)" }}>10 + Fin + armor</div>
                </div>
              )}
            </div>
          </div>

          <div className="seg" style={{ borderRadius: 8 }}>
            <button className="on">Combat</button>
            <button>Abilities</button>
            {c.mpMax > 0 && <button>Spells</button>}
            <button>Inv</button>
          </div>

          <div className="panel">
            <div className="row sb"><div className="h-display" style={{ fontSize: 13 }}>{c.classShort === "Mage" ? "Storm Staff" : c.classShort === "Clr" ? "Argent Mace" : "Longsword"}</div><span className="pill">{c.classShort === "Mage" ? "Wit" : c.classShort === "Clr" ? "Pre" : "Mig"}</span></div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 3 }}>
              {c.classShort === "Mage" ? "d6 + Wit · arcane focus" : c.classShort === "Clr" ? "d6 + Pre · sanctified" : "d8 + Mig · martial"}
            </div>
          </div>
          <div className="panel">
            <div className="row sb"><div className="h-display" style={{ fontSize: 13 }}>{c.classShort === "Mage" ? "Robe of Currents" : c.classShort === "Clr" ? "Argent Vestments" : "Chainmail"}</div><span className="pill">{c.classShort === "Mage" ? "Light" : c.classShort === "Clr" ? "Medium" : "+2 Eva"}</span></div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 3 }}>
              {c.classShort === "Mage" ? "Light · any class" : c.classShort === "Clr" ? "Medium · Cleric+" : "Heavy · Warrior"}
            </div>
          </div>

          {c.conditions.length > 0 && (
            <div className="panel" style={{ borderColor: "var(--warn)" }}>
              <div className="lbl" style={{ color: "var(--warn)" }}>Active conditions</div>
              <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {c.conditions.map(cd => <span className="pill" key={cd}>{cd}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PULL HANDLE — sits at the boundary between sheet and chat. Drag down to open, drag up to close. */}
      <div
        className={`pull-handle row-handle ${openness > 0 ? "active" : ""} ${dragging ? "dragging" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={openness > 0.5 ? "Drag up to close character sheet" : "Drag down to open character sheet"}
        aria-expanded={sheetOpen}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSheetOpen(v => !v); } }}
      >
        <div className="grip" />
        <div className="hint">
          {openness > 0.5
            ? "▲ pull up to close"
            : openness > 0
              ? "▾ keep pulling…"
              : "▼ pull for sheet"}
        </div>
      </div>

      {/* chat scroll */}
      <div className="scroll" ref={scrollRef} role="log" aria-live="polite">
        {transcript.map((m, i) => renderMessage(m, i, c, theme, { rolling, onRoll: () => rollPrompt(i) }))}
      </div>

      {/* composer */}
      <div className="composer-row">
        <button
          className={`plus-btn ${plusOpen ? "open" : ""}`}
          onClick={() => setPlusOpen(v => !v)}
          aria-label={plusOpen ? "Close menu" : "More actions"}
        >
          {plusOpen ? "×" : "+"}
        </button>
        <input
          value={composer}
          onChange={e => setComposer(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder={theme.sayLabel}
        />
        <button className="btn icon primary" onClick={send} aria-label="Send">
          <Icon.send style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* plus menu */}
      {plusOpen && (
        <>
          <div className="plus-menu-backdrop" onClick={() => setPlusOpen(false)} />
          <div className="plus-menu" role="dialog" aria-label="Actions">
            <div className="grid">
              <button className="item" onClick={() => handlePlusAction("freeroll")}><span className="glyph">◇</span> Free roll</button>
              {c.mpMax > 0 && (
                <button className="item" onClick={() => handlePlusAction("cast")}><span className="glyph">✦</span> Cast spell</button>
              )}
              <button className="item" onClick={() => handlePlusAction("shortrest")}><span className="glyph">☼</span> Short rest <span className="cost">t−1</span></button>
              <button className="item" onClick={() => handlePlusAction("longrest")}><span className="glyph">☾</span> Long rest <span className="cost">t−5</span></button>
              <button className="item" onClick={() => handlePlusAction("item")}><span className="glyph">⌘</span> Use item</button>
              <button className="item" onClick={() => handlePlusAction("note")}><span className="glyph">✎</span> Note (OOC)</button>
            </div>
            <div className="footer">most rolls flow from GM prompts in chat</div>
          </div>
        </>
      )}

      {/* top-right menu (replaces the bottom tab bar for navigation away from session) */}
      {menuOpen && (
        <>
          <div className="plus-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="topright-menu" role="dialog" aria-label="Session menu">
            <button className="item" onClick={() => { setMenuOpen(false); onOpenLobby?.(); }}>
              <span className="glyph">⌂</span> Campaigns / Lobby
            </button>
            <button className="item"><span className="glyph">⇅</span> Switch character</button>
            <button className="item"><span className="glyph">⚙</span> Settings</button>
            <button className="item"><span className="glyph">↩</span> Sign out</button>
          </div>
        </>
      )}

      {/* free roll / cast tray */}
      {tray && (
        <>
          <div className="tray-backdrop" onClick={closeTray} />
          <div className="tray" role="dialog" aria-label="Roll tray">
            <div className="row sb">
              <div>
                <div className="lbl">{tray.kind === "cast" ? "Cast spell" : "Free roll"}</div>
                <div className="h-display" style={{ fontSize: 20, marginTop: 2 }}>{tray.label}</div>
              </div>
              <button className="iconbtn" onClick={closeTray} aria-label="Close"><Icon.close /></button>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14, marginBottom: 12 }}>
              <span className="pill tint">d20</span>
              <span className="pill">{tray.mod >= 0 ? "+" : ""}{tray.mod} mod</span>
              {tray.vs != null && <span className="pill">vs {tray.vs}</span>}
              {tray.cost && <span className="pill solid">−{tray.cost} MP</span>}
            </div>
            <button className="btn primary" style={{ width: "100%", fontSize: 15 }} onClick={doFreeRoll} disabled={rolling}>
              <Icon.bolt style={{ width: 18, height: 18 }} /> Roll d20
            </button>
            <div className="lbl" style={{ textAlign: "center", marginTop: 8, color: "var(--ink-4)" }}>
              escape hatch — most rolls flow from GM prompts
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ---------- message renderer ----------
function renderMessage(m, i, char, theme, ctx) {
  if (m.kind === "scene") return <div key={i} className="scene-mark">{m.text}</div>;
  if (m.kind === "rest" || m.kind === "item") {
    return (
      <div key={i} className="bubble sys">
        <div className="card-head"><span className="avat sys" /><span className="speaker">System · {m.kind}</span><span className="ts">{m.ts}</span></div>
        <div className="mono" style={{ fontSize: 12 }}>{m.text}</div>
      </div>
    );
  }
  if (m.kind === "result") return <ResultCard key={i} result={m.result} prompt={m.prompt} advUsed={m.advUsed} freeRoll={m.freeRoll} />;
  if (m.who === "prompt") {
    if (m.rolled) {
      return (
        <div key={i} className="roll-card" style={{ opacity: 0.55 }}>
          <div className="head">
            <div className="dice-glyph" />
            <span className="speaker">System · {m.label} — rolled</span>
            <span className="ts">{m.ts}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            rolled {m.advUsed === "adv" ? "with Advantage" : m.advUsed === "dis" ? "with Disadvantage" : "Normal"} → see result below
          </div>
        </div>
      );
    }
    return <PromptCard key={i} prompt={m} rolling={ctx.rolling} onRoll={ctx.onRoll} />;
  }
  const who = m.who;
  return (
    <div key={i} className={`bubble ${who} ${m.ooc ? "ooc" : ""}`}>
      <div className="card-head">
        <span className={`avat ${who}`}>{who === "gm" ? "G" : theme.monogram}</span>
        <span className="speaker">{who === "gm" ? "Game Master" : `You · ${char.name}`}</span>
        <span className="ts">{m.ts}</span>
      </div>
      <div>{m.text}</div>
    </div>
  );
}

// ---------- in-chat GM-prompted roll card (READ-ONLY adv/dis indicator) ----------
function PromptCard({ prompt, rolling, onRoll }) {
  const advType = prompt.advType || "norm";
  const advLabel = advType === "adv" ? "Advantage" : advType === "dis" ? "Disadvantage" : "Normal roll";
  const advGlyph = advType === "adv" ? "↟" : advType === "dis" ? "↡" : "•";

  return (
    <div className="roll-card">
      <div className="head">
        <div className="dice-glyph" />
        <span className="speaker">System · GM asks for a roll</span>
        <span className="ts">{prompt.ts}</span>
      </div>
      <div className="title-row">
        <div className="h-display">{prompt.label}</div>
        {prompt.dc != null && <span className="pill tint">{prompt.vsLabel || `DC ${prompt.dc}`}</span>}
      </div>
      <div className="formula">
        d20 + {prompt.stat} ({prompt.mod >= 0 ? "+" : ""}{prompt.mod}){prompt.source ? ` · source: ${prompt.source}` : ""}
      </div>
      <div className={`adv-indicator ${advType}`} role="status" aria-label={advLabel}>
        <span className="adv-glyph" aria-hidden="true">{advGlyph}</span>
        <span className="adv-text">{advLabel}</span>
        {prompt.advReason && <span className="adv-reason">— {prompt.advReason}</span>}
      </div>
      <button className="btn primary" onClick={onRoll} disabled={rolling}>
        <Icon.bolt style={{ width: 16, height: 16 }} />
        {rolling
          ? "Rolling…"
          : `Roll ${advType === "adv" ? "2d20↑" : advType === "dis" ? "2d20↓" : "d20"} ${prompt.mod >= 0 ? "+" : ""}${prompt.mod} ${prompt.stat}`}
      </button>
      {prompt.footer && <div className="footer">{prompt.footer}</div>}
    </div>
  );
}

// ---------- in-chat result card ----------
function ResultCard({ result: r, prompt, advUsed, freeRoll }) {
  const isCrit = r.crit;
  const isFumble = r.fumble;
  const verdictText = r.crit ? "Critical hit" : r.fumble ? "Fumble" : r.pass === true ? "Success" : r.pass === false ? "Miss" : null;
  const verdictClass = r.crit ? "crit" : r.fumble ? "fail" : r.pass === true ? "pass" : r.pass === false ? "fail" : "";
  const breakdown = advUsed && advUsed !== "norm"
    ? `2d20 (${advUsed === "adv" ? "Adv" : "Dis"}) = ${r.a}, ${r.b} · take ${advUsed === "adv" ? "higher" : "lower"} ${r.nat} · ${r.mod >= 0 ? "+" : ""}${r.mod} ${prompt.stat || "mod"}`
    : `d20 = ${r.nat} · ${r.mod >= 0 ? "+" : ""}${r.mod} ${prompt.stat || "mod"}`;

  return (
    <div className={`bubble sys`} style={{ padding: 0, background: "transparent", border: 0 }}>
      <div className={`result-card ${isCrit ? "crit" : isFumble ? "fumble" : ""}`}>
        <div className="row" style={{ gap: 6 }}>
          <div className="dice-glyph" />
          <span className="speaker" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".22em", color: "var(--ink-3)", textTransform: "uppercase" }}>
            System · {prompt.label}{freeRoll ? " · free" : ""} · result
          </span>
        </div>
        <div className="row" style={{ alignItems: "baseline", gap: 10 }}>
          <span className="big">{r.total}</span>
          {isCrit && <span className="nat-pill">✦ NAT 20</span>}
          {isFumble && <span className="nat-pill" style={{ background: "var(--bad)" }}>✗ NAT 1</span>}
        </div>
        <div className="breakdown">
          {breakdown}
          {prompt.vs != null && ` · vs ${prompt.vs}`}
          {prompt.dc != null && !prompt.vs && ` · vs DC ${prompt.dc}`}
        </div>
        {isCrit && prompt.kind !== "save" && (
          <div className="breakdown" style={{ borderTop: "1px dashed var(--panel-edge)", paddingTop: 6, marginTop: 2 }}>
            crit damage: max one set + roll one set + mods once
          </div>
        )}
        {verdictText && (
          <div className={`verdict ${verdictClass}`} style={{ marginTop: 2 }}>
            {isCrit ? "⚡ " : isFumble ? "✗ " : verdictClass === "pass" ? "✓ " : "✗ "}{verdictText}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- helpers ----------
function nowTs() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
function gmReply(themeId) {
  const replies = {
    storm: 'The captain narrows his eyes. The air around him crackles.',
    necropolis: "A dry laugh echoes from the dark. \"You'll need more than wardstones, child.\"",
    obsidian: 'The hammer-bearer steps back, weighing his options. His breathing slows.',
    mithril: 'Silver light dances along the warden\'s arms. She tilts her head, considering.',
  };
  return replies[themeId] || replies.storm;
}

window.Session = Session;
window.SESSION_THEME_DATA = THEME_DATA;
