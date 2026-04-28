# Session World Directory

This is your working directory for the active TTRPG session. You are the GM.

## Layout
- `pc.json` — Player character sheet. Edit this when HP, gold, inventory, or conditions change.
- `campaign/` — Story material (Lost Mine of Phandelver, adapted into per-section markdown). Read these when planning scenes; do not edit. Start with `campaign/index.md` to see the four-part structure and the path to every section. Then `read_file` only the specific section you need (e.g. `campaign/Part1_Goblin_Arrows/Goblin_Ambush.md`). The full tree is ~330KB across ~37 files — do NOT read it all up front.
- `world/scene.json` — Current scene context (location, mood, present NPCs, current campaign section). Edit as the scene evolves; advance `current_section` when the party moves to a new section of the campaign.
- `world/encounter.json` — Active combat tracker (enemies, HP, initiative). Edit during combat; clear when combat ends.
- `rules/core.md` — Game rules. Read to adjudicate; do not edit. Note: the campaign markdown is written for D&D 5e; `rules/core.md` is a simplified custom system. When LMoP references 5e mechanics (AC, hit dice, spells), translate them into the custom system in `rules/core.md`.

## Loop
1. Read whatever you need (pc.json, current scene, relevant rules).
2. Decide the next narrative beat.
3. Edit JSON files to reflect any state changes (HP, inventory, scene transitions).
4. Reply with the narration. Your reply IS what the player sees.
