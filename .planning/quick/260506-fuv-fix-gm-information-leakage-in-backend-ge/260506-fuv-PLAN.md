---
quick_id: 260506-fuv
type: execute
wave: 1
depends_on: []
files_modified:
  - backend_generalist/agent.py
  - backend_generalist/template_world/world/scene.json
  - backend_generalist/template_world/README.md
  - backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md
  - backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md
  - backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md
  - backend_generalist/tests/test_information_boundary.py
autonomous: true
requirements: []

must_haves:
  truths:
    - "The GM never names hidden enemies, hidden DCs, or GM tactics in player-visible narration."
    - "The GM never meta-narrates the resolution layer (e.g. 'I'll call for a Wit check', 'Roll perception')."
    - "Only campaign passages explicitly marked as read-aloud may be paraphrased to the player verbatim."
    - "Any JSON field prefixed with `gm_` is GM-only and never appears in narration."
    - "The seeded scene's foreshadowing notes use a `gm_`-prefixed key that signals GM-only content."
  artifacts:
    - path: "backend_generalist/agent.py"
      provides: "SYSTEM_PROMPT with an Information Boundary section"
      contains: "Information Boundary"
    - path: "backend_generalist/template_world/world/scene.json"
      provides: "Seeded scene with gm_-prefixed notes field"
      contains: "gm_notes"
    - path: "backend_generalist/template_world/README.md"
      provides: "Documents gm_-prefix convention for GM-only fields"
      contains: "gm_"
    - path: "backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md"
      provides: "Read-aloud callout on the Meet Me in Phandalin hook"
      contains: "> [!read-aloud]"
    - path: "backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md"
      provides: "Read-aloud callout on the Part 1 opener"
      contains: "> [!read-aloud]"
    - path: "backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md"
      provides: "Read-aloud callout on the ambush-site description (NOT on the hidden-goblins line)"
      contains: "> [!read-aloud]"
    - path: "backend_generalist/tests/test_information_boundary.py"
      provides: "Pytest assertions pinning the boundary contract"
      exports: ["test_system_prompt_declares_information_boundary", "test_scene_template_uses_gm_prefixed_notes", "test_marked_campaign_files_have_read_aloud_callouts"]
  key_links:
    - from: "backend_generalist/agent.py SYSTEM_PROMPT"
      to: "gm_-prefix convention in scene.json + README.md"
      via: "shared phrasing 'gm_' in the prompt's Information Boundary section"
      pattern: "gm_"
    - from: "backend_generalist/agent.py SYSTEM_PROMPT"
      to: "read-aloud callouts in campaign markdown"
      via: "shared phrasing 'read-aloud' in the prompt"
      pattern: "read-aloud"
---

<objective>
Stop the generalist GM from leaking GM-only information into player-visible
narration. Three coordinated changes — system-prompt boundary, scene.json
`gm_`-prefix convention, and read-aloud callouts on early campaign files —
ship together so the prompt's rules and the seeded data agree from turn one.

Purpose: Real playtest leak observed: the GM revealed hidden ambushers and
meta-narrated "I'll call for a Wit check" to the player, both pulled from
GM-only campaign text and `notes` foreshadowing. The fix establishes an
explicit information boundary the agent can mechanically apply.

Output: One commit per task; SYSTEM_PROMPT with an Information Boundary
section, `gm_notes` in the seeded scene, read-aloud callouts on Part 1
opener files, and three pytest cases pinning the contract.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@backend_generalist/agent.py
@backend_generalist/template_world/world/scene.json
@backend_generalist/template_world/README.md
@backend_generalist/template_world/campaign/Introduction/Running_the_Adventure.md
@backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md
@backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md
@backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md

<background>
## The leak being fixed

Observed in a real session:
> "Around you, the woodland is quiet. Too quiet."
> "(If you state an action to look for hidden threats, I'll call for a Wit
>   check to see if you spot the ambushers hiding in the brush.)"

Two leaks:
- **Hidden content leak:** The text reveals ambushers exist — that is GM-only
  content from `Goblin_Ambush.md` line 7 ("Four goblins are hiding…"), plus
  `world/scene.json` `notes` foreshadowing ("the goblin ambush will trigger").
- **Resolution-layer meta-narration:** "I'll call for a Wit check" addresses
  the player as a player, not the character — breaks immersion and pre-tells
  the resolution path.

## How the agent uses these files

`backend_generalist/agent.py`'s SYSTEM_PROMPT instructs the agent to read
`world/scene.json` and the current campaign section every turn (via the
generic `read_file` tool). There is NO Python code that reads `notes` by
key (verified via `grep -rn '"notes"' backend_generalist/`). Renaming the
field is a pure data change — no migration logic, no shim. Tests build
their own minimal fixtures (see `tests/test_world.py` `_build_template`),
so renaming the seeded field does not break test wiring.

## Read-aloud convention precedent

`Running_the_Adventure.md` line 55 already establishes the term **"boxed
text"** as the canonical name for read-aloud passages in this campaign:

> ***Boxed Text.*** At various places, the adventure presents descriptive
> text that's meant to be read or paraphrased aloud to players. This
> read-aloud text is offset in boxes.

The original LMoP markdown lost the box visuals during conversion, leaving
the agent unable to distinguish player-perceivable description from GM
directive paragraphs. We re-establish this distinction with GitHub-flavored
admonition syntax `> [!read-aloud]` on the specific opener passages an agent
needs to set scenes from. The system prompt explicitly maps this admonition
to the existing "boxed text" terminology.
</background>

<interfaces>
SYSTEM_PROMPT shape (relevant excerpt from `backend_generalist/agent.py`):

```python
SYSTEM_PROMPT = """You are a game master (GM) for a custom tabletop RPG, ...

## Core Responsibilities
...

## World Files
...

## GM Narrative Style
...

## Pacing
...

## Skill Checks
...

## Tools
...

## Output Format
...
"""
```

Insert the new `## Information Boundary` section AFTER `## World Files` and
BEFORE `## GM Narrative Style`. (It defines what content is allowed before
the prompt teaches narration style — the boundary precedes the voice.)

Existing `world/scene.json` shape (after rename):
```json
{
  "campaign": "...",
  "current_part": "...",
  "current_section": "...",
  "location": "...",
  "time_of_day": "...",
  "mood": "...",
  "present_npcs": [],
  "scene_id": "...",
  "gm_notes": "..."
}
```

Read-aloud callout syntax (GitHub-style admonition, kept terse):
```
> [!read-aloud]
> The trail bends around a granite outcrop. The afternoon light slants
> low through the trees. Two horses lie crumpled across the road ahead,
> arrows protruding from their flanks.
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: System prompt + scene.json + README — single coordinated commit</name>
  <files>
    backend_generalist/agent.py,
    backend_generalist/template_world/world/scene.json,
    backend_generalist/template_world/README.md
  </files>
  <action>
Three edits in one commit (they are interdependent — the prompt's `gm_`
rule references the convention that scene.json and README.md establish):

(1) `backend_generalist/agent.py` — Insert a new `## Information Boundary`
section into SYSTEM_PROMPT, positioned AFTER the `## World Files` section
and BEFORE `## GM Narrative Style`. Use this exact body (no surrounding
comment block — defaulting to no comments per project guardrail):

```
## Information Boundary
The campaign/ directory is GM-only reference material. Treat it as your
notes, not the player's. Narrate ONLY what the player character would
actually perceive: sights, sounds, smells, what NPCs say to them, what
their own roll produced. Never name hidden enemies, hidden DCs, trap
locations, monster stat blocks, or your own GM tactics in player-facing
output.

Never meta-narrate the resolution layer. Do not say "I'll call for a Wit
check", "Roll perception", or "If you do X I'll do Y". Describe the
moment, then end your turn — let the player declare the action that
triggers a roll.

Boxed text (see Running_the_Adventure.md, Boxed Text glossary) is the one
exception: campaign passages explicitly marked with a `> [!read-aloud]`
callout MAY be paraphrased verbatim to the player. Everything else in
campaign/ is GM-only.

Any JSON field whose key starts with `gm_` is GM-only. Read it, plan with
it, but never surface its contents in narration.
```

Do NOT modify any other section of SYSTEM_PROMPT. Do NOT add a comment
block describing what the section does (the section text is itself the
explanation; the WHY is non-obvious only in the leak example, which lives
in this plan, not in source).

(2) `backend_generalist/template_world/world/scene.json` — Rename the
top-level key `"notes"` to `"gm_notes"`. Preserve the value verbatim. No
other keys change. No backwards-compat shim (template is fresh per
session).

(3) `backend_generalist/template_world/README.md` — Update the bullet
describing `world/scene.json` (currently line 8) to mention the new field
name and the convention. Replace the existing `world/scene.json` bullet
with:

```
- `world/scene.json` — Current scene context (location, mood, present NPCs, current campaign section, GM-only notes). Edit as the scene evolves; advance `current_section` when the party moves to a new section of the campaign. Any field prefixed with `gm_` (e.g. `gm_notes`) is GM-only — read it for context, but never surface its contents in player-facing narration.
```

Leave every other bullet in README.md unchanged.

Do NOT modify `backend_generalist/social_template_world/` — that template
is out of scope for this fix. Do NOT touch any tool code, model selection,
or other system-prompt sections.
  </action>
  <verify>
    <automated>
cd /Users/bilunsun/Git/misc/virtualGM/backend_generalist &amp;&amp; \
  python -c "
import json
from backend_generalist.agent import SYSTEM_PROMPT
from pathlib import Path

# Prompt boundary section present with key phrases
assert '## Information Boundary' in SYSTEM_PROMPT, 'missing section header'
for phrase in ['GM-only', 'gm_', 'read-aloud', 'Wit check', 'Boxed text']:
    assert phrase in SYSTEM_PROMPT, f'missing phrase: {phrase}'

# scene.json renamed correctly
scene = json.loads(Path('template_world/world/scene.json').read_text())
assert 'gm_notes' in scene, 'gm_notes missing from scene.json'
assert 'notes' not in scene, 'notes still present in scene.json (must rename, not duplicate)'
assert 'goblin ambush will trigger' in scene['gm_notes'], 'gm_notes value not preserved'

# README.md mentions gm_ convention
readme = Path('template_world/README.md').read_text()
assert 'gm_' in readme, 'README.md does not document gm_ prefix convention'
assert 'gm_notes' in readme, 'README.md does not mention gm_notes field'
print('OK: prompt + scene.json + README.md all aligned')
"
    </automated>
  </verify>
  <done>
SYSTEM_PROMPT contains `## Information Boundary` section with the listed key
phrases. `template_world/world/scene.json` has `gm_notes` and no `notes` key.
`template_world/README.md` documents the `gm_` prefix convention. Inline
verification command above succeeds. Single commit:
`fix(260506-fuv): establish GM information boundary (prompt + gm_-prefix)`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Mark read-aloud callouts on Part 1 opener files + add boundary tests</name>
  <files>
    backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md,
    backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md,
    backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md,
    backend_generalist/tests/test_information_boundary.py
  </files>
  <action>
Two coordinated changes in one commit: mark the player-facing opener
passages on the three early-game files, then add pytest cases pinning the
full boundary contract (prompt + scene + callouts) so the leak cannot
silently regress.

(1) `campaign/Introduction/Adventure_Hook.md` — Wrap line 5 (the "Meet Me
in Phandalin" hook description starting with "***Meet Me in Phandalin.***
The characters are in the city of Neverwinter…") in a `> [!read-aloud]`
callout. Convert the whole italicized hook paragraph (lines starting at
`***Meet Me in Phandalin.***` through "...when they deliver the wagon
safely to that trading post.") into the callout body. Leave line 3 (the
"You can let players invent…" GM directive) OUTSIDE the callout — it is
GM-only. Result shape:

```
## Adventure Hook

You can let players invent their own reasons for visiting Phandalin, or you can use the following adventure hook. The backgrounds and secondary goals on the character sheets also provide characters with motivations for visiting Phandalin.

> [!read-aloud]
> ***Meet Me in Phandalin.*** The characters are in the city of Neverwinter when their dwarf patron and friend, Gundren Rockseeker, hires them to escort a wagon to Phandalin. Gundren has gone ahead with a warrior, Sildar Hallwinter, to attend to business in the town while the characters follow with the supplies. The characters will be paid 10 gp each by the owner of Barthen's Provisions in Phandalin when they deliver the wagon safely to that trading post.
```

(2) `campaign/Part1_Goblin_Arrows/Overview.md` — Wrap line 5 (the
adventure-opening paragraph starting "The adventure begins as the player
characters are escorting a wagon…") in a `> [!read-aloud]` callout. Leave
the `# Part 1: Goblin Arrows` heading and every paragraph from line 7
onward (the GM directives "Read the boxed text when you're ready…",
"Before continuing with the adventure…", and the bulleted GM checklist)
OUTSIDE the callout. Result shape:

```
# Part 1: Goblin Arrows



> [!read-aloud]
> The adventure begins as the player characters are escorting a wagon full of provisions and supplies from Neverwinter to Phandalin. The journey takes them south along the High Road to the Triboar Trail, which heads east (as shown on the overland map). When they're a half-day's march from Phandalin, they run into trouble with goblin raiders from the Cragmaw tribe.

Read the boxed text when you're ready to start. ...
```

(3) `campaign/Part1_Goblin_Arrows/Goblin_Ambush.md` — This file
interleaves GM directives with content. The CRITICAL rule:

- Line 5 (the GM directive about the "Meet Me in Phandalin" adventure hook
  describing the discovered horses) IS player-perceivable scene content.
  Wrap it in a `> [!read-aloud]` callout.
- Line 7 ("Four goblins are hiding in the woods, two on each side of the
  road. They wait until someone approaches the bodies and then attack.")
  MUST REMAIN OUTSIDE the callout. This is GM-only — leaking it caused the
  observed bug.
- All paragraphs from line 9 onward (combat directives, Developments,
  Goblin Trail, traps, XP rules) MUST REMAIN OUTSIDE the callout.

Result shape (line 7 is bare, NOT inside a callout):

```
## Goblin Ambush

Read the following boxed text to start the encounter:

> [!read-aloud]
> If you are using the "[Meet Me in Phandalin](Introduction.md#AdventureHook)" adventure hook, then any character who approaches to make a closer investigation can identify the horses as belonging to Gundren Rockseeker and Sildar Hallwinter. They've been dead about a day, and it's clear that arrows killed the horses. When the characters inspect the scene closer, read the following:

Four goblins are hiding in the woods, two on each side of the road. They wait until someone approaches the bodies and then attack.

This will likely be the first of many combat encounters in the adventure. ...
```

Skip `Cragmaw_Hideout.md` — its opener boxed text is split across many
internal area headings; marking it correctly is a larger task than this
quick fix's scope. Skip Parts 2-4, Appendix files, and class/spell rules
entirely (hard scope guardrail).

(4) `backend_generalist/tests/test_information_boundary.py` — Create a
new pytest module pinning the full boundary contract. Three test
functions, written as plain pytest module-level functions (no class,
matching the style of `tests/test_agent.py`):

```python
"""Pin the GM information-boundary contract.

These tests fail loudly if any of the three coordinated fixes regress:
  - SYSTEM_PROMPT loses its Information Boundary section
  - The seeded scene.json reverts the gm_-prefix convention
  - Read-aloud callouts disappear from the marked Part 1 opener files
"""
from __future__ import annotations

import json
from pathlib import Path

from backend_generalist.agent import SYSTEM_PROMPT


TEMPLATE_ROOT = Path(__file__).parent.parent / "template_world"


def test_system_prompt_declares_information_boundary() -> None:
    assert "## Information Boundary" in SYSTEM_PROMPT
    for phrase in ("GM-only", "gm_", "read-aloud", "Wit check", "Boxed text"):
        assert phrase in SYSTEM_PROMPT, f"missing boundary phrase: {phrase}"


def test_scene_template_uses_gm_prefixed_notes() -> None:
    scene = json.loads((TEMPLATE_ROOT / "world" / "scene.json").read_text())
    assert "gm_notes" in scene
    assert "notes" not in scene  # must be renamed, not duplicated


def test_marked_campaign_files_have_read_aloud_callouts() -> None:
    """The three early-game opener files carry > [!read-aloud] callouts.

    Goblin_Ambush.md is the bug-source file: it MUST mark the discovered-
    horses passage read-aloud AND keep the hidden-goblins line outside the
    callout (the original leak).
    """
    marked = [
        TEMPLATE_ROOT / "campaign" / "Introduction" / "Adventure_Hook.md",
        TEMPLATE_ROOT / "campaign" / "Part1_Goblin_Arrows" / "Overview.md",
        TEMPLATE_ROOT / "campaign" / "Part1_Goblin_Arrows" / "Goblin_Ambush.md",
    ]
    for path in marked:
        text = path.read_text()
        assert "> [!read-aloud]" in text, f"missing callout in {path.name}"

    ambush = (TEMPLATE_ROOT / "campaign" / "Part1_Goblin_Arrows" / "Goblin_Ambush.md").read_text()
    # The hidden-goblins line is the leak. It MUST be outside any read-aloud
    # callout block. Every line of a callout block starts with "> ".
    leak_line = "Four goblins are hiding in the woods"
    for line in ambush.splitlines():
        if leak_line in line:
            assert not line.lstrip().startswith(">"), (
                "Goblin_Ambush.md leak line is inside a read-aloud callout — "
                "must remain GM-only."
            )
            break
    else:
        raise AssertionError(f"leak line not found in Goblin_Ambush.md: {leak_line!r}")
```

Do NOT add any new test framework, fixtures, or pytest plugins. The
existing project pytest invocation must pick this file up automatically
via standard discovery.
  </action>
  <verify>
    <automated>
cd /Users/bilunsun/Git/misc/virtualGM/backend_generalist &amp;&amp; \
  python -m pytest tests/test_information_boundary.py -x -v
    </automated>
  </verify>
  <done>
Three early-game opener files contain `> [!read-aloud]` callouts on the
correct passages; `Goblin_Ambush.md` line "Four goblins are hiding…"
remains OUTSIDE any callout. `tests/test_information_boundary.py` exists
with three passing test functions. `python -m pytest tests/ -x` (full
suite) still passes — no existing test depends on the renamed field. Single
commit: `fix(260506-fuv): mark read-aloud passages and pin boundary tests`.
  </done>
</task>

</tasks>

<verification>
After both tasks land, the full backend_generalist test suite must pass:

```
cd /Users/bilunsun/Git/misc/virtualGM/backend_generalist && python -m pytest tests/ -x
```

Manual smoke check (optional, not blocking): start a CLI session at the
seeded scene and confirm the agent's first narration does NOT mention
hidden goblins, does NOT include the phrase "Wit check" addressed to the
player, and either silently ignores `gm_notes` or paraphrases ONLY the
read-aloud callout from `Goblin_Ambush.md`.
</verification>

<success_criteria>
- SYSTEM_PROMPT in `backend_generalist/agent.py` contains the
  `## Information Boundary` section with all five required key phrases.
- `template_world/world/scene.json` has `gm_notes` (no `notes` key).
- `template_world/README.md` documents the `gm_` prefix convention.
- `Adventure_Hook.md`, `Overview.md`, and `Goblin_Ambush.md` carry
  `> [!read-aloud]` callouts on the correct (player-perceivable) passages.
- `Goblin_Ambush.md` line "Four goblins are hiding…" is NOT inside any
  read-aloud callout.
- `tests/test_information_boundary.py` adds three passing tests.
- Full `pytest tests/` suite still passes (38+ tests).
- Two atomic commits, one per task.
</success_criteria>

<output>
No SUMMARY artifact required for quick tasks. STATE.md "Quick Tasks
Completed" table will be appended by the quick-task workflow upon
completion.
</output>
