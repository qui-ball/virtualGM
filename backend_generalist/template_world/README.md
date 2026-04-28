# Session World Directory

This is your working directory for the active TTRPG session. You are the GM.

## Layout
- `pc.json` — Player character sheet. Edit this when HP, gold, inventory, or conditions change.
- `campaign/` — Story material. Read these when planning scenes; do not edit.
- `world/scene.json` — Current scene context (location, mood, present NPCs). Edit as the scene evolves.
- `world/encounter.json` — Active combat tracker (enemies, HP, initiative). Edit during combat; clear when combat ends.
- `rules/core.md` — Game rules. Read to adjudicate; do not edit.

## Loop
1. Read whatever you need (pc.json, current scene, relevant rules).
2. Decide the next narrative beat.
3. Edit JSON files to reflect any state changes (HP, inventory, scene transitions).
4. Reply with the narration. Your reply IS what the player sees.
