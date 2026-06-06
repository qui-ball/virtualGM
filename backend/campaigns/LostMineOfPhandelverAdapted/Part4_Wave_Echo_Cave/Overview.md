## Part 4 — Wave Echo Cave

**Level:** 4–5 · **Location:** `loc-wave-echo`

### Overview

Lost mine beneath the Sword Mountains. Undead guardians, lingering magic, echoing wave sounds. **Nezznar** (`npc-nezznar`, `enemy-nezznar`) seeks the **Forge of Spells** at the cave’s heart.

**Boss:** Nezznar — use `create_enemy(..., is_boss=True)` when the final confrontation begins.

### Entering

- Gundren’s map leads to a hidden entrance (thicket or ravine).
- First area: signs of recent drow activity; dead Rockseeker scout (**Tharden**) optional clue.

### Key areas (abstract — not 20 rooms)

| Area | Content |
|------|---------|
| Mine tunnels | **Skeletons** / **zombies** (`enemy-skeleton`, `enemy-zombie`); darkness |
| Fungus garden | Flammable spores; optional hazard |
| Smelter / forge hall | **Bugbear** guards (`enemy-bugbear`); forge warmth |
| Boiling chamber | Steam hazard; collapsed bridge |
| Wizards’ quarters | Old spellbooks; magic item loot (+1 weapon, **Lightbringer** mace, or **Spider Staff** — pick one suitable item) |
| Forge of Spells | **Nezznar** + 4 giant spiders or bugbear backup; forge glow |

### Nezznar (Black Spider)

- Drow mage with staff; arrogant; believes mine is his.
- On defeat: boss gate clears; mine can be secured.
- If fleeing: only if dramatically earned — default is confrontation here.

### Loot & milestones

- Treasure from forge area (gems, magic item).
- **Wave Echo Cave restored** — story milestone for conclusion.

### Story elements

- **ev4-enter-mine** — Entrance and first undead.
- **ev4-forge-approach** — Forge of Spells reached.
- **ev4-nezznar** — Boss fight; Nezznar defeated.
- **tr4-conclusion** — Load `Part4_Wave_Echo_Cave/Conclusion`.

### XP

**50–75 XP** per major area; **100 XP** for defeating Nezznar (award after boss gate resolves).
