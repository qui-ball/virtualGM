#!/usr/bin/env python
"""ui_cli.py — a black-box CLI that mocks the frontend UI by hitting the backend HTTP/SSE API.

Unlike cli.py (which calls the agent in-process), this talks to the FastAPI server over HTTP
exactly like the React frontend does — exercising request validation, the session store, SSE
streaming, and dice-roll round-trips. It lets Claude Code / the user drive and test the whole
app without launching the React UI.

There is no server endpoint that returns a session's current game_state, so — like the real UI
(which holds it in memory) — this CLI caches the latest game_state snapshot and pending dice
prompt to disk per session under `.ui_cli_state/`. That cache only advances when this CLI runs
turns.

Run from the backend dir so it picks up the venv:
    cd backend && .venv/bin/python ui_cli.py <command> [...]
    cd backend && uv run python ui_cli.py <command> [...]

Examples:
    ui_cli.py new-session
    ui_cli.py send a1b2 "I search the room"          # auto-rolls any dice prompts
    ui_cli.py send a1b2 --no-auto "I attack"         # stop at the dice prompt...
    ui_cli.py roll a1b2 20                            # ...then force a nat-20
    ui_cli.py --json send a1b2 "open the door"       # raw SSE events for assertions
    ui_cli.py --seed 42 send a1b2 "sneak past"       # deterministic auto-rolls
    ui_cli.py repl a1b2                               # interactive chat loop
Use `.` as the session id to target the most-recently-created ("active") session.
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import click
import httpx

DEFAULT_BASE_URL = "http://localhost:8000"
STATE_DIR = Path(__file__).parent / ".ui_cli_state"
_UNSET = object()


# --------------------------------------------------------------------------- #
# Rendering helpers
# --------------------------------------------------------------------------- #
class C:
    RESET = "\033[0m"
    DIM = "\033[90m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    CYAN = "\033[36m"
    MAGENTA = "\033[35m"


def _c(text, color):
    return f"{color}{text}{C.RESET}"


def out(text=""):
    click.echo(text)


def err(text):
    click.echo(_c(f"⚠ {text}", C.RED), err=True)


# --------------------------------------------------------------------------- #
# HTTP plumbing
# --------------------------------------------------------------------------- #
def make_client(base_url):
    # No read timeout: agent turns stream for a while. Short connect timeout so an
    # unreachable backend fails fast.
    return httpx.Client(
        base_url=base_url,
        timeout=httpx.Timeout(connect=10.0, read=None, write=30.0, pool=10.0),
    )


def _connection_hint(ctx):
    base = ctx.obj["base_url"]
    return (
        f"backend not reachable at {base}\n"
        f"  start it with:  cd backend && uv run uvicorn app:app --port 8000"
    )


def _extract_detail(resp):
    try:
        body = resp.json()
        if isinstance(body, dict) and "detail" in body:
            return str(body["detail"])
        return json.dumps(body)
    except Exception:
        return (resp.text or "").strip() or f"HTTP {resp.status_code}"


def api_get(ctx, path):
    try:
        with make_client(ctx.obj["base_url"]) as client:
            r = client.get(path)
    except httpx.ConnectError:
        err(_connection_hint(ctx))
        sys.exit(1)
    if r.status_code >= 400:
        err(_extract_detail(r))
        sys.exit(1)
    return r.json()


def api_post(ctx, path, body=None):
    try:
        with make_client(ctx.obj["base_url"]) as client:
            r = client.post(path, json=body if body is not None else {})
    except httpx.ConnectError:
        err(_connection_hint(ctx))
        sys.exit(1)
    if r.status_code >= 400:
        err(_extract_detail(r))
        sys.exit(1)
    return r.json()


# --------------------------------------------------------------------------- #
# On-disk session cache (mirrors how the real UI caches game_state in memory)
# --------------------------------------------------------------------------- #
def _state_path(sid):
    return STATE_DIR / f"{sid}.json"


def load_state(sid):
    p = _state_path(sid)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def save_state(sid, *, character_name=None, game_state=None, pending_action=_UNSET):
    STATE_DIR.mkdir(exist_ok=True)
    data = load_state(sid)
    if character_name is not None:
        data["character_name"] = character_name
    if game_state is not None:
        data["game_state"] = game_state
    if pending_action is not _UNSET:
        data["pending_action"] = pending_action
    _state_path(sid).write_text(json.dumps(data, indent=2))


def set_active(sid):
    STATE_DIR.mkdir(exist_ok=True)
    (STATE_DIR / "active").write_text(sid)


def get_active():
    p = STATE_DIR / "active"
    return p.read_text().strip() if p.exists() else None


def resolve_sid(session_id):
    """Resolve a positional session id; '.' or empty → the active session."""
    if session_id in (None, "."):
        active = get_active()
        if not active:
            err("no active session; create one with `new-session` or pass an explicit id")
            sys.exit(1)
        return active
    return session_id


# --------------------------------------------------------------------------- #
# Dice
# --------------------------------------------------------------------------- #
def _sides(dice_type):
    try:
        return int(str(dice_type).lstrip("dD"))
    except ValueError:
        return 6


def _roll_for(pending, rng):
    """Auto-roll the dice described by a pending_action. Returns (rolls, total)."""
    dice_count = int(pending.get("dice_count", 1) or 1)
    dice_type = pending.get("dice_type", "d20")
    sides = _sides(dice_type)
    rolls = [rng.randint(1, sides) for _ in range(dice_count)]
    return rolls, sum(rolls)


def _action_response(roll_result, individual_rolls=None):
    return {"action_response": {"roll_result": roll_result, "individual_rolls": individual_rolls}}


def run_turn_cmd(ctx, sid, payload, **kw):
    """run_turn for standalone commands: exit non-zero if the turn errored."""
    if run_turn(ctx, sid, payload, **kw):
        sys.exit(1)


# --------------------------------------------------------------------------- #
# Snapshot rendering
# --------------------------------------------------------------------------- #
def status_line(gs):
    """Compact one-liner mocking the UI sidebar refresh after a turn."""
    parts = []
    ch = gs.get("character") or {}
    if ch:
        parts.append(f"HP {ch.get('hp')}/{ch.get('hp_max')}")
        if ch.get("mana_max") is not None:
            parts.append(f"MP {ch.get('mana')}/{ch.get('mana_max')}")
        if ch.get("conditions"):
            parts.append("cond:" + ",".join(ch["conditions"]))
    parts.append(f"scene:{gs.get('scene_label')}")
    if gs.get("time_max"):
        parts.append(f"time {gs.get('time_current')}/{gs.get('time_max')}")
    for name, e in (gs.get("enemies") or {}).items():
        parts.append(f"{e.get('name', name)} {e.get('hp')}/{e.get('hp_max')}")
    if gs.get("in_combat"):
        parts.append(_c("IN COMBAT", C.RED))
    if gs.get("pending_level_up"):
        parts.append(_c("LEVEL UP!", C.YELLOW))
    return _c("· " + "   ".join(str(p) for p in parts), C.DIM)


def render_state_full(state):
    gs = state.get("game_state") or {}
    ch = gs.get("character") or {}
    out(_c(f"Session character: {state.get('character_name', '?')}", C.BOLD))
    if ch:
        out(f"  {ch.get('name')} — Lv{ch.get('level')} {ch.get('character_class')}  (XP {ch.get('xp', 0)})")
        st = ch.get("stats") or {}
        out(
            f"  Stats: Mig {st.get('might', 0):+d}  Fin {st.get('finesse', 0):+d}  "
            f"Wit {st.get('wit', 0):+d}  Pre {st.get('presence', 0):+d}"
        )
        line = f"  HP {ch.get('hp')}/{ch.get('hp_max')}   Evasion {ch.get('evasion')}"
        if ch.get("mana_max") is not None:
            line += f"   MP {ch.get('mana')}/{ch.get('mana_max')}"
        out(line)
        if ch.get("conditions"):
            out(f"  Conditions: {', '.join(ch['conditions'])}")
        out(
            f"  Gold {ch.get('gold', 0)}   "
            f"Weapon: {ch.get('equipped_weapon') or '—'}   Armor: {ch.get('equipped_armor') or '—'}"
        )
        if ch.get("inventory"):
            out(f"  Inventory: {', '.join(ch['inventory'])}")
        spells = ch.get("spells") or []
        if spells:
            out(
                "  Spells: "
                + ", ".join(
                    f"{s.get('name')}({s.get('id')}, {s.get('tier')}, {s.get('mp_cost')}mp"
                    + (", locked" if s.get("locked") else "")
                    + ")"
                    for s in spells
                )
            )
    out(
        f"  Campaign: {gs.get('campaign_title')}   ch.{gs.get('chapter')}   "
        f"scene: {gs.get('scene_label')}"
    )
    out(
        f"  Time {gs.get('time_current')}/{gs.get('time_max')}   "
        f"in_combat={gs.get('in_combat')}   boss={gs.get('boss_encounter')}"
    )
    enemies = gs.get("enemies") or {}
    if enemies:
        out("  Enemies:")
        for name, e in enemies.items():
            boss = " [BOSS]" if e.get("is_boss") else ""
            out(f"    - {e.get('name', name)}  HP {e.get('hp')}/{e.get('hp_max')}  Eva {e.get('evasion')}{boss}")
    cds = gs.get("countdowns") or {}
    if cds:
        out("  Countdowns: " + ", ".join(f"{k}={v}" for k, v in cds.items()))
    if gs.get("pending_level_up"):
        out(_c("  ** LEVEL UP AVAILABLE — run `level-up` **", C.YELLOW))
    pa = state.get("pending_action")
    if pa:
        out(_c(f"  Pending roll: {pa.get('purpose')} — {pa.get('dice_count')}{pa.get('dice_type')}", C.YELLOW))


def render_pending(pa):
    title = pa.get("purpose") or pa.get("action_type") or "Roll"
    out(_c(f"🎲 PENDING: {title} — {pa.get('dice_count')}{pa.get('dice_type')}", C.BOLD + C.YELLOW))
    bits = []
    if pa.get("stat"):
        bits.append(str(pa["stat"]))
    if pa.get("modifier") is not None:
        bits.append(f"{pa['modifier']:+d}")
    if pa.get("vs_label"):
        bits.append(str(pa["vs_label"]))
    elif pa.get("dc") is not None:
        bits.append(f"DC {pa['dc']}")
    if pa.get("adv_type") and pa["adv_type"] != "norm":
        reason = f" ({pa['adv_reason']})" if pa.get("adv_reason") else ""
        bits.append(_c(f"[{pa['adv_type']}{reason}]", C.MAGENTA))
    if bits:
        out("   " + "   ".join(bits))
    if pa.get("footer"):
        out(_c("   " + str(pa["footer"]), C.DIM))


def render_roll_result(rr):
    dice = str(rr.get("die_a"))
    if rr.get("die_b") is not None:
        dice += f"/{rr.get('die_b')} ({rr.get('adv_used')})"
    breakdown = (
        f"nat {rr.get('nat')} | {dice} {rr.get('modifier', 0):+d}"
        f"{(' ' + rr['stat']) if rr.get('stat') else ''} = {rr.get('total')}"
    )
    tag = ""
    if rr.get("crit"):
        tag = _c("  NAT-20 CRIT!", C.BOLD + C.GREEN)
    elif rr.get("fumble"):
        tag = _c("  NAT-1 FUMBLE!", C.BOLD + C.RED)
    vs = ""
    if rr.get("vs") is not None:
        vs = f"  vs {rr['vs']}"
    elif rr.get("dc") is not None:
        vs = f"  vs DC {rr['dc']}"
    verdict = ""
    p = rr.get("pass")
    if p is True:
        verdict = _c("  ✓ PASS", C.GREEN)
    elif p is False:
        verdict = _c("  ✗ FAIL", C.RED)
    out(
        _c(f"🎲 {rr.get('label')}: ", C.CYAN)
        + _c(str(rr.get("total")), C.BOLD)
        + _c(f"  ({breakdown})", C.DIM)
        + vs
        + verdict
        + tag
    )


# --------------------------------------------------------------------------- #
# SSE streaming + turn driver
# --------------------------------------------------------------------------- #
def stream_turn(ctx, sid, payload):
    """Yield (event_type, data) tuples from the /turns SSE stream."""
    try:
        with make_client(ctx.obj["base_url"]) as client:
            with client.stream("POST", f"/sessions/{sid}/turns", json=payload) as resp:
                if resp.status_code >= 400:
                    resp.read()
                    yield ("error", {"message": _extract_detail(resp)})
                    return
                event_type = None
                data_buf = []
                for line in resp.iter_lines():
                    if line == "":
                        if event_type is not None and data_buf:
                            yield (event_type, _parse_data(data_buf))
                        event_type, data_buf = None, []
                        continue
                    if line.startswith("event:"):
                        event_type = line[len("event:"):].strip()
                    elif line.startswith("data:"):
                        data_buf.append(line[len("data:"):].strip())
                if event_type is not None and data_buf:
                    yield (event_type, _parse_data(data_buf))
    except httpx.ConnectError:
        yield ("error", {"message": _connection_hint(ctx)})


def _parse_data(data_buf):
    raw = "".join(data_buf)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw}


def render_event(ctx, event_type, data):
    if ctx.obj["json_mode"]:
        out(json.dumps({"event": event_type, **data}))
        return
    if event_type == "thinking":
        out(_c(f"💭 {data.get('text', '')}", C.DIM))
    elif event_type == "narration":
        out(_c("📜 ", C.GREEN) + (data.get("text") or ""))
    elif event_type == "scene":
        out(_c(f"🎬 {data.get('text', '')}", C.BOLD + C.CYAN))
    elif event_type == "pending_action":
        render_pending(data.get("pending_action") or {})
    elif event_type == "roll_result":
        render_roll_result(data.get("roll_result") or {})
    elif event_type == "complete":
        gs = data.get("game_state")
        if gs:
            out(status_line(gs))
        if data.get("internal_notes"):
            out(_c(f"   (gm notes: {data['internal_notes']})", C.DIM))
    elif event_type == "error":
        err(data.get("message", ""))
    else:
        out(_c(f"[{event_type}] {json.dumps(data)}", C.DIM))


def run_turn(ctx, sid, payload, *, auto=True, pause_hint=True):
    """Stream a turn and (if auto) auto-resolve pending dice rolls until complete/error.

    With auto=False the loop stops at the first pending_action (the prompt is cached so a
    later `roll` command — or the REPL's inline prompt — can resolve it explicitly).
    Returns True if the turn ended in an error (callers may map that to a non-zero exit).
    """
    rng = ctx.obj["rng"]
    while True:
        pending = None
        saw_error = False
        for event_type, data in stream_turn(ctx, sid, payload):
            render_event(ctx, event_type, data)
            if event_type == "pending_action":
                pending = data.get("pending_action")
                save_state(sid, game_state=data.get("game_state"), pending_action=pending)
            elif event_type == "complete":
                save_state(sid, game_state=data.get("game_state"), pending_action=None)
            elif event_type == "error":
                saw_error = True
        if saw_error:
            return True
        if pending is None:
            return False
        if not auto:
            if pause_hint and not ctx.obj["json_mode"]:
                out(_c(f"   ↳ paused — run `roll {sid} <value>`  (or `roll {sid}` to auto-roll)", C.DIM))
            return False
        rolls, total = _roll_for(pending, rng)
        individual = rolls if len(rolls) > 1 else None
        if not ctx.obj["json_mode"]:
            shown = str(total) if individual is None else f"{rolls} = {total}"
            out(_c(f"   ↳ auto-rolled {pending.get('dice_count')}{pending.get('dice_type')} → {shown}", C.DIM))
        payload = _action_response(total, individual)


# --------------------------------------------------------------------------- #
# CLI group
# --------------------------------------------------------------------------- #
@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--base-url", envvar="VGM_BASE_URL", default=DEFAULT_BASE_URL, show_default=True,
              help="Backend base URL (env: VGM_BASE_URL).")
@click.option("--json", "json_mode", is_flag=True, default=False,
              help="Emit raw JSON: API responses, and each SSE event as {\"event\": ...}.")
@click.option("--seed", type=int, default=None, help="Seed the RNG for deterministic auto-rolls.")
@click.pass_context
def cli(ctx, base_url, json_mode, seed):
    """Mock-UI CLI that drives the Virtual GM backend over HTTP/SSE."""
    ctx.ensure_object(dict)
    ctx.obj["base_url"] = base_url.rstrip("/")
    ctx.obj["json_mode"] = json_mode
    ctx.obj["rng"] = random.Random(seed)


# -- Read-only / setup commands -------------------------------------------- #
@cli.command()
@click.pass_context
def health(ctx):
    """GET /health — backend connectivity check."""
    data = api_get(ctx, "/health")
    if ctx.obj["json_mode"]:
        out(json.dumps(data))
        return
    ok = data.get("status") == "ok"
    out(_c(f"status: {data.get('status')}", C.GREEN if ok else C.RED)
        + _c(f"   supabase_configured={data.get('supabase_configured')}", C.DIM))


@cli.command()
@click.pass_context
def campaigns(ctx):
    """GET /campaigns — list available campaigns."""
    data = api_get(ctx, "/campaigns")
    if ctx.obj["json_mode"]:
        out(json.dumps(data))
        return
    rows = data.get("campaigns", [])
    if not rows:
        out("(no campaigns)")
        return
    for c in rows:
        marker = _c("  *active", C.GREEN) if c.get("active") else ""
        out(
            f"- {_c(c.get('name'), C.BOLD)} [{c.get('id')}]   ch.{c.get('chapter')}   "
            f"{c.get('character_name', '')} Lv{c.get('level')} {c.get('character_class', '')}{marker}"
        )
        if c.get("last_scene"):
            out(_c(f"    {c['last_scene']}", C.DIM))


@cli.command(name="new-session")
@click.pass_context
def new_session(ctx):
    """POST /sessions — create a session (becomes the active session)."""
    data = api_post(ctx, "/sessions", {})
    sid = data["session_id"]
    gs = data.get("game_state")
    save_state(sid, character_name=data.get("character_name"), game_state=gs, pending_action=None)
    set_active(sid)
    if ctx.obj["json_mode"]:
        out(json.dumps(data))
        return
    out(_c(f"session: {sid}", C.BOLD) + f"   character: {data.get('character_name')}")
    out(_c("(set as active — target it with `.` as the session id)", C.DIM))
    if gs:
        out(status_line(gs))


@cli.command()
@click.pass_context
def sessions(ctx):
    """List locally-cached sessions (no server list endpoint exists)."""
    active = get_active()
    files = sorted(STATE_DIR.glob("*.json")) if STATE_DIR.exists() else []
    if not files:
        out("(no local sessions yet — run `new-session`)")
        return
    for f in files:
        sid = f.stem
        st = load_state(sid)
        gs = st.get("game_state") or {}
        ch = gs.get("character") or {}
        marker = _c("  *active", C.GREEN) if sid == active else ""
        out(f"- {sid}   {st.get('character_name', '?')} Lv{ch.get('level', '?')}   scene:{gs.get('scene_label', '?')}{marker}")
    out(_c("note: cache reflects only turns run through this CLI.", C.DIM))


@cli.command()
@click.argument("session_id")
@click.pass_context
def state(ctx, session_id):
    """Render the cached game_state snapshot for a session."""
    sid = resolve_sid(session_id)
    st = load_state(sid)
    if not st:
        err(f"no cached state for {sid} (run a turn first; there is no server GET-state endpoint)")
        sys.exit(1)
    if ctx.obj["json_mode"]:
        out(json.dumps(st))
        return
    render_state_full(st)


@cli.command()
@click.argument("session_id")
@click.pass_context
def messages(ctx, session_id):
    """GET /sessions/{id}/messages — message history."""
    sid = resolve_sid(session_id)
    data = api_get(ctx, f"/sessions/{sid}/messages")
    if ctx.obj["json_mode"]:
        out(json.dumps(data))
        return
    msgs = data.get("messages", [])
    if not msgs:
        out("(no messages)")
    for m in msgs:
        role = m.get("role")
        color = {"player": C.CYAN, "gm": C.GREEN, "system": C.DIM}.get(role, C.RESET)
        out(_c(f"[{role}] ", color) + (m.get("content") or ""))


# -- Turn commands (SSE) ---------------------------------------------------- #
@cli.command()
@click.argument("session_id")
@click.argument("message", nargs=-1, required=True)
@click.option("--auto/--no-auto", default=True, help="Auto-roll dice prompts (default) or stop at them.")
@click.pass_context
def send(ctx, session_id, message, auto):
    """POST a player message turn (SSE). Auto-rolls dice prompts unless --no-auto."""
    sid = resolve_sid(session_id)
    run_turn_cmd(ctx, sid, {"message": " ".join(message)}, auto=auto)


@cli.command()
@click.argument("session_id")
@click.argument("value", required=False, type=int)
@click.option("--auto/--no-auto", default=True, help="Auto-resolve further pending rolls.")
@click.pass_context
def roll(ctx, session_id, value, auto):
    """Resolve a pending dice prompt. VALUE optional → auto-roll the cached dice."""
    sid = resolve_sid(session_id)
    pending = load_state(sid).get("pending_action") or {"dice_count": 1, "dice_type": "d20"}
    if value is not None:
        if not ctx.obj["json_mode"]:
            out(_c(f"   ↳ using {value}", C.DIM))
        payload = _action_response(int(value), None)
    else:
        rolls, total = _roll_for(pending, ctx.obj["rng"])
        individual = rolls if len(rolls) > 1 else None
        if not ctx.obj["json_mode"]:
            shown = str(total) if individual is None else f"{rolls} = {total}"
            out(_c(f"   ↳ auto-rolled {pending.get('dice_count')}{pending.get('dice_type')} → {shown}", C.DIM))
        payload = _action_response(total, individual)
    run_turn_cmd(ctx, sid, payload, auto=auto)


@cli.command()
@click.argument("session_id")
@click.option("--type", "rest_type", type=click.Choice(["short", "long"]), required=True)
@click.pass_context
def rest(ctx, session_id, rest_type):
    """POST a rest action (short/long)."""
    sid = resolve_sid(session_id)
    run_turn_cmd(ctx, sid, {"rest_type": rest_type})


@cli.command(name="use-item")
@click.argument("session_id")
@click.argument("item", nargs=-1, required=True)
@click.pass_context
def use_item(ctx, session_id, item):
    """POST a use-item action."""
    sid = resolve_sid(session_id)
    run_turn_cmd(ctx, sid, {"use_item": " ".join(item)})


@cli.command()
@click.argument("session_id")
@click.option("--spell-id", required=True)
@click.option("--tier", type=click.Choice(["Minor", "Major", "Mythic"]), default="Minor", show_default=True)
@click.option("--mp-cost", type=int, default=1, show_default=True)
@click.pass_context
def cast(ctx, session_id, spell_id, tier, mp_cost):
    """POST a cast-spell action."""
    sid = resolve_sid(session_id)
    run_turn_cmd(ctx, sid, {"cast_spell": {"spell_id": spell_id, "tier": tier, "mp_cost": mp_cost}})


# -- Non-SSE state mutations ------------------------------------------------ #
@cli.command(name="level-up")
@click.argument("session_id")
@click.option("--kind", type=click.Choice(["hp", "evasion", "ability"]), required=True)
@click.option("--hp-mode", type=click.Choice(["fixed", "roll"]), default=None)
@click.option("--hp-amount", type=int, default=None)
@click.option("--ability-id", default=None)
@click.pass_context
def level_up(ctx, session_id, kind, hp_mode, hp_amount, ability_id):
    """POST /level-up — apply a level-up choice."""
    sid = resolve_sid(session_id)
    body = {"kind": kind}
    if hp_mode is not None:
        body["hp_mode"] = hp_mode
    if hp_amount is not None:
        body["hp_amount"] = hp_amount
    if ability_id is not None:
        body["ability_id"] = ability_id
    data = api_post(ctx, f"/sessions/{sid}/level-up", body)
    if data.get("game_state"):
        save_state(sid, game_state=data["game_state"])
    if ctx.obj["json_mode"]:
        out(json.dumps(data))
        return
    out(_c("Level-up applied.", C.GREEN))
    render_state_full(load_state(sid))


@cli.command(name="boss-death")
@click.argument("session_id")
@click.option("--choice", type=click.Choice(["blaze", "risk"]), required=True)
@click.pass_context
def boss_death(ctx, session_id, choice):
    """POST /boss-death — resolve a boss-death decision."""
    sid = resolve_sid(session_id)
    data = api_post(ctx, f"/sessions/{sid}/boss-death", {"choice": choice})
    if data.get("game_state"):
        save_state(sid, game_state=data["game_state"])
    if ctx.obj["json_mode"]:
        out(json.dumps(data))
        return
    out(_c("Boss-death resolved.", C.YELLOW))
    render_state_full(load_state(sid))


# --------------------------------------------------------------------------- #
# REPL
# --------------------------------------------------------------------------- #
_REPL_HELP = """\
Interactive commands:
  <text>                     send a player message (you'll be prompted for any dice roll)
  /state                     show cached game state
  /messages                  show message history
  /rest short|long           rest action
  /use-item <item>           use an item
  /cast <spell_id> [tier] [mp]   cast a spell (tier default Minor, mp default 1)
  /level-up <kind> [hp-mode] kind = hp|evasion|ability
  /boss-death <blaze|risk>   resolve a boss-death decision
  /roll [value]              resolve a pending roll (blank = auto)
  /json                      toggle raw-JSON output
  /help                      this help
  /quit                      exit
"""


def _prompt_pending_rolls(ctx, sid):
    """After a turn paused at a dice prompt, prompt for each roll until none remain."""
    while load_state(sid).get("pending_action"):
        pa = load_state(sid)["pending_action"]
        dc = f"{pa.get('dice_count')}{pa.get('dice_type')}"
        try:
            ans = input(_c(f"🎲 roll {dc} (blank=auto, or a number)> ", C.YELLOW)).strip()
        except (EOFError, KeyboardInterrupt):
            out("")
            return
        if ans.lstrip("-").isdigit():
            run_turn(ctx, sid, _action_response(int(ans), None), auto=False, pause_hint=False)
        else:
            rolls, total = _roll_for(pa, ctx.obj["rng"])
            individual = rolls if len(rolls) > 1 else None
            run_turn(ctx, sid, _action_response(total, individual), auto=False, pause_hint=False)


@cli.command()
@click.argument("session_id", required=False)
@click.pass_context
def repl(ctx, session_id):
    """Interactive chat loop (mocks the play UI). Creates a session if none is active."""
    if session_id and session_id != ".":
        sid = session_id
    else:
        sid = get_active()
        if not sid:
            data = api_post(ctx, "/sessions", {})
            sid = data["session_id"]
            save_state(sid, character_name=data.get("character_name"),
                       game_state=data.get("game_state"), pending_action=None)
            out(_c(f"created session {sid} — {data.get('character_name')}", C.BOLD))
    set_active(sid)
    st = load_state(sid)
    out(_c(f"[session {sid} · {st.get('character_name', '?')}]   /help for commands, /quit to exit", C.DIM))

    while True:
        try:
            line = input(_c("You: ", C.CYAN)).strip()
        except (EOFError, KeyboardInterrupt):
            out("\n👋")
            break
        if not line:
            continue
        if line in ("/quit", "/exit", "/q"):
            out("👋")
            break
        if line == "/help":
            out(_REPL_HELP)
            continue
        if line == "/json":
            ctx.obj["json_mode"] = not ctx.obj["json_mode"]
            out(_c(f"json mode {'on' if ctx.obj['json_mode'] else 'off'}", C.DIM))
            continue
        if line == "/state":
            render_state_full(load_state(sid))
            continue
        if line == "/messages":
            data = api_get(ctx, f"/sessions/{sid}/messages")
            for m in data.get("messages", []):
                out(_c(f"[{m.get('role')}] ", C.DIM) + (m.get("content") or ""))
            continue

        parts = line.split()
        if line.startswith("/rest"):
            run_turn(ctx, sid, {"rest_type": parts[1] if len(parts) > 1 else "short"})
            continue
        if line.startswith("/use-item"):
            run_turn(ctx, sid, {"use_item": line[len("/use-item"):].strip()})
            continue
        if line.startswith("/cast"):
            if len(parts) < 2:
                out("usage: /cast <spell_id> [tier] [mp]")
                continue
            tier = parts[2] if len(parts) > 2 else "Minor"
            mp = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 1
            run_turn(ctx, sid, {"cast_spell": {"spell_id": parts[1], "tier": tier, "mp_cost": mp}})
            continue
        if line.startswith("/level-up"):
            kind = parts[1] if len(parts) > 1 else "hp"
            body = {"kind": kind}
            if kind == "hp":
                body["hp_mode"] = parts[2] if len(parts) > 2 else "fixed"
            data = api_post(ctx, f"/sessions/{sid}/level-up", body)
            if data.get("game_state"):
                save_state(sid, game_state=data["game_state"])
            render_state_full(load_state(sid))
            continue
        if line.startswith("/boss-death"):
            data = api_post(ctx, f"/sessions/{sid}/boss-death",
                            {"choice": parts[1] if len(parts) > 1 else "risk"})
            if data.get("game_state"):
                save_state(sid, game_state=data["game_state"])
            render_state_full(load_state(sid))
            continue
        if line.startswith("/roll"):
            val = int(parts[1]) if len(parts) > 1 and parts[1].lstrip("-").isdigit() else None
            if val is not None:
                run_turn(ctx, sid, _action_response(val, None), auto=False, pause_hint=False)
            else:
                _prompt_pending_rolls(ctx, sid)
            continue
        if line.startswith("/"):
            out(_c("unknown command — /help", C.DIM))
            continue

        # Plain text → message turn; stop at any dice prompt and resolve it interactively.
        run_turn(ctx, sid, {"message": line}, auto=False, pause_hint=False)
        _prompt_pending_rolls(ctx, sid)


if __name__ == "__main__":
    cli()
