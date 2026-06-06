# Missing Backend APIs — Frontend Integration Gap List

**Audience:** Backend team  
**Date:** 2026-06-02 (re-verified against `backend/app.py`, `frontend/src/api/client.ts`, `useChat.ts`)  
**Scope:** What the **play/campaign frontend** still needs from the **FastAPI backend**. This doc is intentionally conservative — items in [Already implemented](#already-implemented-do-not-re-build) exist today and should **not** be re-requested.

**Live docs:** `http://localhost:8000/docs` when the backend is running.

---

## Verification summary

**Authoritative FastAPI route list** (only these 7 routes exist in `backend/app.py`):

| Method | Path |
|--------|------|
| `GET` | `/health` |
| `GET` | `/campaigns` |
| `POST` | `/sessions` |
| `GET` | `/sessions/{session_id}/messages` |
| `POST` | `/sessions/{session_id}/level-up` |
| `POST` | `/sessions/{session_id}/boss-death` |
| `POST` | `/sessions/{session_id}/turns` (SSE) |

No other HTTP routes, routers, or `/characters` / `/campaign-templates` endpoints were found in the backend.

**Supabase:** PostgreSQL tables + RLS exist (`users`, `characters`, `active_campaigns`, `sessions`, …). The browser can call PostgREST directly (see home-page RLS smoke test), but **no play/campaign UI uses Supabase for game data** — only FastAPI. The backend Supabase client is configured for `/health` reporting only; it is **not** wired into game routes.

---

## Already implemented (do NOT re-build)

These were original wireframe gaps (G1–G11 in `local/feature/04-play-experience/design.md`) and **are implemented** in the current backend. Your colleague should treat them as done.

| Gap | Status | Where |
|-----|--------|-------|
| **G1** Roll prompt enrichment (`stat`, `modifier`, `dc`, `vs_label`, adv/dis, narrative text) | ✅ Schema + runtime builder | `api/schemas.py` `PendingAction`, `api/enrichment.py` |
| **G2** Structured roll results | ✅ SSE `roll_result` event | `api/roll_result.py`, `api/dice.py`, `/turns` handler |
| **G3** Scene markers in transcript | ✅ SSE `scene` + transcript rows | `agent/tools.py` `set_scene`, `api/transcript_log.py` |
| **G4** Session app bar fields (chapter, scene, time, campaign title) | ✅ On `GameStateSnapshot` | `api/snapshot.py` |
| **G5** Short/long rest, use item | ✅ `TurnRequest` fields + handlers | `api/session_actions.py`, `/turns` |
| **G6** Cast spell via turn | ✅ `TurnRequest.cast_spell` + `SpellDefinition` on `CharacterState` | `api/session_actions.py`, `game/models.py` |
| **G7** Level-up submission | ✅ `POST /sessions/{id}/level-up` with XP threshold validation | `api/level_up.py` |
| **G8** Boss death modal | ✅ `boss_encounter` on snapshot + `POST /sessions/{id}/boss-death` | `api/session_actions.py`, `api/snapshot.py` |
| **G9** Rich campaign list **shape** | ✅ `CampaignSummary` (chapter, time, last_scene, character summary, pending_level_up) | `api/schemas.py`, `api/campaigns.py` |
| **G10** Transcript rehydration | ✅ `GET /sessions/{id}/messages` returns `transcript[]` | `app.py`, `api/transcript_log.py` |
| **G11** Advantage/disadvantage on rolls | ✅ `PendingAction.adv_type`, `adv_reason` | `api/enrichment.py` |

**Frontend wiring:** All of the above are called from `frontend/src/api/client.ts` and `frontend/src/hooks/useChat.ts`.

**Caveats (not missing APIs):**
- `PendingAction` fields are **always populated by the enrichment builder** (with defaults when the GM tool omits args). Sparse *agent tool args* can still produce inferred UI — that is not a missing endpoint.
- `CharacterState.spells[]` exists in the schema but the default PC (`create_player_character`) does not populate it; casters would need spell data in state. That is a **data population** gap, not a missing route.
- `CreateSessionRequest.character_name` is in the **request schema** and the frontend **sends it** on `POST /sessions`, but `create_session()` **does not read any request fields** — always creates default Aldric.

---

## Frontend integration inventory (current)

Every FastAPI route has a client wrapper. Play/campaign UI uses all session routes; only `/health` is unused outside tests.

| Route | `client.ts` | Wired in UI | Notes |
|-------|-------------|-------------|-------|
| `GET /health` | `getHealth()` | ❌ Tests only | Optional lobby “backend connected” indicator |
| `GET /campaigns` | `getCampaigns()` | ✅ `CampaignPage` → `fetchCampaignList()` | Fixture fallback on network error |
| `POST /sessions` | `createSession()` | ✅ `bootstrapPlaySession()` | Sends optional `character_name`; backend ignores |
| `GET /sessions/{id}/messages` | `getSessionMessages()` | ✅ Transcript on bootstrap/resume | No `game_state` in response |
| `POST /sessions/{id}/level-up` | `submitLevelUp()` | ✅ `LevelUpDialog` → `confirmLevelUp()` | Dev local fallback if API 400 |
| `POST /sessions/{id}/boss-death` | `submitBossDeath()` | ✅ `BossDeathDialog` → `resolveBossDeath()` | |
| `POST /sessions/{id}/turns` | `streamTurn()` | ✅ `useChat` → `processTurnStream()` | See SSE table below |

**SSE events from `/turns`:**

| Event | Handled in `useChat` | Effect |
|-------|----------------------|--------|
| `narration` | ✅ | GM transcript line |
| `scene` | ✅ | Scene marker entry |
| `roll_result` | ✅ | Roll card + mark prompt rolled |
| `pending_action` | ✅ | Roll prompt + `game_state` |
| `complete` | ✅ | Final `game_state` + session cache |
| `error` | ✅ | System error line |
| `thinking` | ❌ Intentional | Loading UI only; no transcript |
| `internal_notes` on `complete` | ❌ Intentional | GM private notes; not shown to player |

**Turn request fields used:** `message`, `action_response`, `rest_type`, `use_item`, `cast_spell` — all map to Plus menu, roll cards, cast tray, debug console.

**Correctly local-only (no backend today):**

| Feature | Where | Why |
|---------|-------|-----|
| OOC composer messages | `sendMessage({ ooc: true })` | No `ooc` on `TurnRequest` |
| Free rolls (`+` tray) | `performFreeRoll()` | No `free_roll` on `TurnRequest` |
| Character notes | `SheetNotesTab` | `localStorage` only |
| Lobby character switcher vitals | `CampaignPage` fixtures | No `GET /characters` |
| Other campaigns “Open” | `CampaignRow` disabled | No campaign activate API (#3) |
| Dev demo roll (no server pending) | `devRollPromptFixture` | Resolves locally in dev |
| Non-boss HP=0 recovery | `applyNonBossAutoRecover` | Server narrates but doesn’t heal (#12) |

**Stopgaps within available API:**

- **Session resume (same browser):** `sessionStorage` cache keyed by `?campaignId=`; revalidates session via `GET .../messages`; restores cached `game_state` (vitals/sheet) because messages endpoint lacks it.
- **Campaign resume link:** `/play?campaignId=…&characterName=…` — query params ready; backend does not bind campaign/character yet.
- **Sheet catalogs:** `sheetCatalog.ts` / `ABILITY_CATALOG` when API omits spell descriptions or ability metadata.
- **Currency display:** `currency.ts` maps backend `gold` → GP row (`coin_purse` is frontend-only type).

**Unit tests:** 162 tests in `frontend/` cover client, session bootstrap, campaign API, transcript hydrate, level-up, session cache (all passing as of last run).

---

## Frontend ↔ backend integration status

| Feature | Backend | Frontend |
|---------|---------|----------|
| Play session (chat, rolls, vitals) | ✅ | ✅ Wired |
| Rests / use item / cast spell | ✅ | ✅ Wired |
| Level-up / boss death | ✅ | ✅ Wired |
| Campaign lobby list | ✅ (static) | ✅ `GET /campaigns` + fixture fallback |
| Transcript on session start / resume | ✅ | ✅ `GET .../messages` + `hydrateTranscript` |
| Session resume (same browser) | ⚠️ Partial | ✅ Cache restores `game_state`; transcript from API |
| Campaign-scoped session start | ❌ | ⚠️ `?campaignId=` + cache only; backend ignores |
| Character switcher | ❌ | ❌ Fixtures |
| New campaign | ❌ | ❌ Placeholder UI |
| Auth on REST calls | ❌ | ❌ Supabase auth is route-guard only |
| `GET /health` | ✅ | ⚠️ Client helper exists; **not called from UI** |
| Multi-user live sync | ❌ | ❌ Single-browser, turn-initiator SSE only |

---

## Architecture — real-time sync & multi-user sessions

The current integration model assumes **one browser tab owns the session**: the client that calls `POST /sessions/{id}/turns` receives an SSE stream for that turn only, applies `game_state` on the `complete` event, and caches locally in `sessionStorage`. That works for solo play but **does not scale** when multiple users remotely connect to the same game session (co-players, spectators, GM dashboard, mobile companion).

Backend and frontend should plan for an **event-driven sync layer** alongside the REST/SSE turn API — not only more CRUD endpoints.

### Current limitations

| Pattern | Today | Breaks when… |
|---------|-------|--------------|
| State delivery | `game_state` on SSE `complete` to **turn submitter only** | Another player’s sheet/vitals stay stale |
| Transcript | `GET .../messages` on bootstrap; then local append | Remote clients miss GM rolls, scene markers, loot narration |
| Session resume | `GET /sessions/{id}` (missing) or `sessionStorage` cache | Different device/user cannot rejoin live state |
| Blocking flows (level-up, boss death) | Gated on local `game_state` in `useChat` | Only one client may see the modal; others desync |
| Agent tool side effects (gold, XP, inventory) | In-memory session, no broadcast | Chat says “+20 gp” but another client’s sheet unchanged |

Polling `GET /sessions/{id}` on an interval is a stopgap for resume, not a substitute for **push** when several clients share one session.

### Recommended direction: session event stream

Treat each `session_id` as a **shared event channel**. All connected clients subscribe; the backend publishes after any state change (GM turn, player turn, level-up, rest, join/leave).

**Option A — Dedicated realtime transport (preferred for play UX)**

- **WebSocket** or **long-lived SSE** on e.g. `GET /sessions/{session_id}/events` (or upgrade from a subscribe endpoint).
- Server pushes the same event types the turn SSE already uses today (`thinking`, `roll_result`, `scene`, `complete`, `error`) plus session-level events (see below).
- Turn submission stays `POST /turns`; the stream is **session-scoped**, not tied to a single HTTP request lifecycle.

**Option B — Database realtime (fits Supabase persistence)**

- Persist `game_state`, `transcript` rows, and a `session_events` (or changelog) table.
- Clients subscribe via **Supabase Realtime** (or equivalent) on `session_id`.
- FastAPI writes on every mutation; all subscribers get row/JSON patches.
- Aligns with P0 auth + Supabase ownership; reduces custom socket infra.

**Option C — Internal event bus + fan-out**

- Backend publishes to Redis/NATS/etc. on every state change; a **connection manager** fans out to WebSocket/SSE clients (and optionally workers).
- Useful if the GM agent, persistence, and notifications are separate services later.

These are complementary: e.g. agent → event bus → persist to Supabase **and** push to connected browsers.

### Event types to standardize (minimum)

Reuse existing SSE payloads where possible so the frontend can share one reducer (`useChat` / a future `useSessionEvents`):

| Event | When emitted | All clients? |
|-------|----------------|--------------|
| `transcript_entry` | New GM/player/system line, roll card, scene marker | ✅ |
| `game_state_updated` | After tools (`gold`, `xp`, HP, inventory), rests, level-up apply | ✅ |
| `pending_action` | Roll prompt created/cleared | ✅ (see turn ownership) |
| `level_up_pending` | XP threshold met, choice not yet submitted | ✅ |
| `boss_encounter` | Boss HP = 0 gate | ✅ |
| `combat_state` | `in_combat`, initiative (if exposed on snapshot) | ✅ |
| `participant_joined` / `participant_left` | Presence | ✅ |
| `turn_lock` / `turn_unlock` | Optional: who may submit `POST /turns` | ✅ |

**Turn ownership:** With multiple players, the API should define whether one “active” character submits turns, players rotate, or the GM drives all NPC/combat resolution. The event stream should carry **`actor_id` / `character_id`** so the UI knows who must respond to `pending_action`.

### Webhooks (outbound integrations)

**Webhooks are not required for browser multiplayer** (browsers need push via WebSocket/SSE/Realtime, not inbound HTTP webhooks). They are still worth designing for:

- **Outbound webhooks** from the session event bus → Discord, Slack, campaign logs, analytics, or a separate “GM tools” service.
- **Signed delivery** (`session_id`, event type, payload hash, retry policy) so external systems react to `level_up_pending`, loot, combat end, etc. without polling FastAPI.

Document webhook payloads as a **subset of the session event schema** so internal realtime and external integrations stay aligned.

### Frontend implications (for backend contract design)

- **Single source of truth:** Every UI surface (sheet dropdown, vitals bar, transcript, modals) should update from **session events**, not only from the client that last called `/turns`.
- **Idempotent handlers:** Clients may reconnect; events should carry `sequence` or `event_id` for dedup and gap recovery (`GET /sessions/{id}/events?after=…`).
- **Optimistic UI:** Local turn submitters can still optimistically append; remote clients wait for push. Conflicts resolve server-side.
- **Auth on subscribe:** Same JWT as REST; RLS or session membership checks before joining the channel.

### Relation to missing APIs in this doc

| Item | Without event architecture | With event architecture |
|------|----------------------------|-------------------------|
| **#1** `GET /sessions/{id}` | Resume snapshot once | Also **catch-up** after reconnect (`last_event_id`) |
| **#4** Auth + persistence | User-owned rows in Supabase | Realtime channels scoped by `user_id` + session membership |
| **#12–17** Behavioral gaps (gold, level-up, recovery) | Fixed per turn on one client | **All clients** see the same post-tool `game_state` |

### Suggested sequencing

1. **Now (solo):** Keep per-turn SSE; add `GET /sessions/{id}` + Supabase persistence so state survives refresh.
2. **Next (multi-user):** Define session event schema; add subscribe endpoint or Supabase Realtime on session tables.
3. **Later:** Outbound webhooks, turn locks, presence, spectator role.

---

## True missing APIs (net-new routes or auth)

### P0 — Session & campaign lifecycle

#### 1. Fetch session state (for resume)

**Missing:** `GET /sessions/{session_id}`

**Partial today:** `GET /sessions/{session_id}/messages` returns `messages` + `transcript` but **not** `game_state`, `pending_action`, or `campaign_id`. Knowing a `session_id` is enough to rebuild chat history, but **not** vitals, sheet, or combat state.

**Suggested response:**
```json
{
  "session_id": "...",
  "campaign_id": null,
  "character_id": null,
  "game_state": { ... },
  "pending_action": null
}
```

**Alternative:** Add `game_state` (and optionally `pending_action`) to the existing `GET .../messages` response — avoids a new route if preferred.

#### 2. Create session bound to campaign / character

**Missing:** Request fields and handler logic on existing `POST /sessions`.

**Today:** Always creates a fresh in-memory session with `create_player_character()` (Aldric warrior). Lobby “Resume” passes `?campaignId=` on the frontend, but the backend has no `campaign_id` concept.

**Need (extend existing route):**
```json
POST /sessions
{
  "campaign_id": "lost-mine",
  "character_id": "uuid-optional",
  "character_name": "optional-until-wired"
}
```

#### 3. Campaign activation / resume by campaign id

**Missing:** e.g. `POST /campaigns/{campaign_id}/resume` or `/activate`

**Today:** No way to open a non-active campaign row or fetch its live `session_id`.

---

### P0 — Auth & user-scoped persistence

#### 4. JWT-authenticated FastAPI routes

**Missing:** `Authorization: Bearer <supabase_jwt>` on game endpoints; user-scoped session/campaign ownership.

**Today:** Sessions are in-memory; anyone with a `session_id` can call session routes. Supabase auth only gates React routes.

**Note for colleague:** Supabase **tables** for users/campaigns/characters **exist** (migrations + RLS). What is missing is the **FastAPI layer** connecting play sessions to those tables — not the database schema itself.

#### 5. Character APIs (FastAPI)

**Missing:** `GET /characters`, `POST /characters`, etc.

**Today:** Character switcher uses frontend fixtures. Supabase PostgREST can CRUD `characters` (RLS smoke test on home page only) — that path is **not** integrated into `/campaign` or `/play`.

**Lobby card gap:** `GET /campaigns` returns `character_name`, `character_class`, `level` per campaign but **not** HP/MP/XP vitals needed for the full character card bars.

---

### P1 — Campaign management

#### 6. Create campaign

**Missing:** `POST /campaigns`

**Today:** Only `GET /campaigns` exists. New Campaign modal is disabled placeholder.

#### 7. Campaign templates

**Missing:** `GET /campaign-templates` (or equivalent)

**Today:** No backend route. Templates may exist in Supabase seed data but are not exposed via FastAPI.

#### 8. Persisted campaign list

**Not a new route — extend existing `GET /campaigns`:**

| Today | Needed |
|-------|--------|
| Static Python fixture (`api/campaigns.py`) | Load from `active_campaigns` + joins per signed-in user |
| No `session_id` on rows | Include active `session_id` for resume |
| No status filter | `status`: active / paused / completed; optional `?status=` |

---

### P1 — Sheet metadata & persistence (optional endpoints)

These improve fidelity but **core play works without them** (frontend uses local catalogs / localStorage).

#### 9. Ruleset catalog

**Missing:** `GET /rulesets/{id}/catalog` (abilities, spells, items with descriptions)

**Today:** `class_abilities` is a list of string IDs; `SpellDefinition` lacks `description`. Frontend fills gaps from `sheetCatalog.ts`.

#### 10. Equipment change endpoint

**Missing:** e.g. `PATCH /sessions/{id}/character/equipment`

**Today:** `equipped_weapon` / `equipped_armor` are **response fields** on `CharacterState` but there is no API to change them. `use_item` via `/turns` consumes items but does not swap loadout.

#### 11. Character notes (server persistence)

**Missing:** notes API

**Today:** Notes use **`localStorage`** per character name (`SheetNotesTab`) — device-local, not server. Not “lost on refresh” within the same browser; lost on new device / cleared storage.

---

## Behavioral gaps (may not need new routes)

These are **server behavior** gaps on existing endpoints, not necessarily new URLs.

#### 12. Non-boss HP=0 state update

**Today:** `apply_damage` GM tool **narrates** non-boss recovery (`"recovers with full HP/mana…"`) but does **not** mutate `character.hp` / `mana` or clear combat. Frontend applies recovery client-side in `useChat` (`applyNonBossAutoRecover`).

**Fix options:** Agent tool auto-heals on non-boss zero, or `/turns` / snapshot logic applies the ruleset rule server-side.

#### 13. Free rolls (composer `+` tray)

**Today:** Frontend rolls locally; no API call. Transcript entries are not persisted.

**Optional:** Extend `TurnRequest` with `free_roll` payload if transcript persistence matters.

#### 14. OOC messages

**Today:** Frontend adds OOC to local transcript only; no GM turn. No `ooc` flag on `TurnRequest`.

**Optional:** Extend `TurnRequest` if OOC should be stored server-side.

#### 15. Level-up ability validation

**Today:** `POST /level-up` validates XP eligibility and applies `ability_id` as a string — it does **not** validate against a class/level catalog.

**Optional:** `GET .../level-up/options` for discovery — **not required** for the basic flow (POST already works).

#### 16. `award_xp` auto-level vs blocking Level-Up dialog (playtest)

**Today:** `award_xp` in `agent/tools.py` increments `pc.level` when XP crosses the threshold and tells the player to choose HP/Evasion/Ability in **chat text only**. It does **not** set a pending-choice flag or call `POST /level-up`.

**Frontend:** Blocking `LevelUpDialog` opens when `isPendingLevelUp(xp, level) && !in_combat` — i.e. XP at threshold **before** level is incremented. After `award_xp` auto-levels, `pending_level_up` on the snapshot is usually **false**, so the modal never appears during real play (unlike debug “Level-up pending”, which sets XP without bumping level).

**Fix:** `award_xp` should only add XP; level increment + HP/Evasion/Ability should happen exclusively via `POST /level-up` after the player confirms in the UI.

#### 17. Loot / gold narration without state mutation (playtest)

**Today:** The GM may narrate rewards (“+20 gp added to inventory”) without calling `update_character_state(field="gold")` or the correct inventory tool. Chat and sidenotes update; `game_state.character.gold` / `inventory` do not — sheet Currency/Carried stay stale.

**Related mistake:** `update_inventory(item="20 gp")` adds a **carried item** string, not numeric gold.

**Fix:** Agent prompt enforcement + optional server validation that narration mentioning currency matches a tool call in the same turn. Long-term: persist mutations and broadcast via session event stream (see Architecture section).

---

## Not backend gaps (frontend / docs only)

| Item | Reality |
|------|---------|
| **`thinking` SSE events** | Backend emits them; frontend ignores. Client UX choice — **no new endpoint**. |
| **`internal_notes` on `complete`** | Backend sends GM private notes on `complete`; frontend ignores. Player-facing UX choice — **no new endpoint**. |
| **`GET /health`** | Exists; frontend has `getHealth()` but does not call it from UI yet. |
| **OpenAPI file in repo** | Auto-generated at `/openapi.json` at runtime; not committed. Docs/CI preference, not a blocking API. |
| **Initiative chip in vitals** | `GameState` tracks `initiative_order` internally; **not exposed** on `GameStateSnapshot`. Frontend derives display from `stats.finesse`. Optional snapshot field, not a new route. |
| **`coin_purse` on character** | Present in **frontend types only**; backend `CharacterState` has `gold` but **no** `coin_purse` field. |

---

## Field-level notes on existing responses

| Area | Backend today | Frontend fallback |
|------|---------------|-------------------|
| Roll prompts | Full `PendingAction` schema; enrichment fills defaults | `stubEnriched` dev banner when agent args are sparse |
| Spells (cast tray) | `CharacterState.spells[]` schema; often empty for default PC | `sheetCatalog.ts` |
| Abilities (sheet) | ID strings only | `ABILITY_CATALOG` local map |
| Currency | `gold` only | `currency.ts` maps gold → GP display |
| Campaign ↔ session | No link in API | `?campaignId=` + `sessionStorage` cache |

---

## Suggested backend priority

1. Auth middleware + persist sessions/campaigns to Supabase  
2. **`GET /sessions/{id}`** (or extend `GET .../messages` with `game_state`)  
3. **`POST /sessions`** accepts `campaign_id` / `character_id`  
4. **`GET /characters`** + wire lobby character card  
5. **`POST /campaigns`** + template list  
6. **Persist `GET /campaigns`** (same route, real data)  
7. **Behavioral fixes #16–17** (`award_xp` + loot tools) so play matches wireframe Level-Up dialog and sheet state  
8. Ruleset catalog, equipment PATCH, server-side non-boss recovery (as product priority allows)  
9. **Session event stream** (WebSocket/SSE subscribe or Supabase Realtime) — see [Architecture — real-time sync & multi-user sessions](#architecture--real-time-sync--multi-user-sessions); required before remote multi-client play, not only more REST routes

---

## Reference files

| Concern | Path |
|---------|------|
| All HTTP routes | `backend/app.py` |
| Request/response schemas | `backend/api/schemas.py` |
| Domain models | `backend/game/models.py` |
| Static campaign list | `backend/api/campaigns.py` |
| Frontend HTTP client | `frontend/src/api/client.ts` |
| Session hook | `frontend/src/hooks/useChat.ts` |
| Session cache (stopgap) | `frontend/src/lib/play/sessionCache.ts` |
| Supabase schema spec | `local/steering/04-data-models-schemas.md` |
| Original gap analysis (historical) | `local/feature/04-play-experience/design.md` § API gaps |
