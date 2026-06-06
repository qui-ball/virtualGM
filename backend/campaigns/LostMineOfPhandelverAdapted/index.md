# Lost Mine of Phandelver — Campaign Template

Campaign template for the Virtual GM application. Uses the **virtualGM-custom-ruleset**. Single-player, levels 1–5, 4–6 sessions. Classic frontier adventure; escalating threat from goblins to the Black Spider.

---

## 1. Metadata

- **Name:** Lost Mine of Phandelver  
- **Description:** Escort supplies to Phandalin, rescue Gundren Rockseeker, break the Redbrand gang, and stop the drow Nezznar (the Black Spider) from seizing Wave Echo Cave and the Forge of Spells.  
- **Publisher:** Wizards of the Coast (adapted for Virtual GM)  
- **License:** Adventure content adapted for internal use  
- **Ruleset:** virtualGM-custom-ruleset  
- **Estimated sessions:** 4–6  
- **Level range:** 1–5  
- **Boss battles:** Nezznar the Black Spider (Forge of Spells, Part 4). King Grol and Glasstaff are major foes but not ruleset “boss gate” unless you designate them.

---

## 2. Campaign Summary

**Arc:** Five hundred years ago, dwarves, gnomes, and human mages shared Wave Echo Cave and the Forge of Spells until orc wars and a magical catastrophe buried the mine. The Rockseeker brothers have rediscovered the entrance. Gundren Rockseeker hires the PC to escort a wagon from Neverwinter to Phandalin while he rides ahead with Sildar Hallwinter. Cragmaw goblins ambush the trail, capture Gundren, and deliver him to King Grol at Cragmaw Castle. The PC rescues Sildar at the Cragmaw hideout and learns Gundren was taken for “the Black Spider.” In Phandalin, the Redbrand ruffians terrorize the town; their leader Glasstaff (Iarno Albrek) serves the same spider. Clearing the Redbrand hideout under Tresendar Manor exposes Iarno’s allegiance. Side leads in the region (banshee Agatha, druid Reidoth, optional sites) point toward Cragmaw Castle. There the PC rescues Gundren and obtains his map to Wave Echo Cave. In the mine, undead and monsters guard the way to Nezznar, who seeks the Forge of Spells. Defeating him restores the mine to the Rockseekers and frees Phandalin.

**Objectives:** Deliver the wagon (or survive the ambush and continue the mission); rescue Sildar; break the Redbrands; learn the Black Spider’s identity; rescue Gundren; clear Wave Echo Cave; defeat Nezznar.

**Themes and tone:** Frontier justice, rising heroism, hidden villain network. Start grounded (goblins, bandits); reveal epic stakes (lost mine, dark elf schemer).

**GM guidance:** Load only the section needed for the current scene (`load_campaign_section`). One story beat per turn. Track main NPCs and whether the PC has learned key facts (Black Spider name, map location, Glasstaff identity). Award XP after encounters and milestones (`award_xp`, outside combat). Use `update_character_state` / `update_inventory` for loot and gold — do not only narrate. Part 3 side quests are **optional** but enrich the trail to Cragmaw Castle; if the PC rushes, Sildar and Gundren’s trail still provide the critical path.

---

## 3. Adventure Hooks

Use one hook so the PC has a clear reason to be on the Triboar Trail:

**Meet Me in Phandalin (default):** In Neverwinter, dwarf patron **Gundren Rockseeker** hires the PC to escort a wagon of mining supplies to Phandalin. He rides ahead with warrior **Sildar Hallwinter**; the PC follows with the wagon. Payment: **10 gp each** from **Elmar Barthen** at Barthen’s Provisions on safe delivery.

**Character ties (pick or combine):**
- **Debt / friendship:** Gundren helped the PC before; refusing is possible but strains the bond.  
- **Frontier opportunity:** Phandalin is resettling; profit and reputation await.  
- **Lost mine legend:** The PC has heard rumors of Wave Echo Cave and wants in on the discovery.  
- **Order or faith:** Sister Garaele or a patron sends the PC to aid Phandalin and investigate goblin raids.  
- **Redemption or exile:** The PC needs a fresh start away from Neverwinter politics.

Open play at the **goblin ambush** on the Triboar Trail unless the player wants a short Neverwinter beat first.

---

## 4. Shared NPCs

Reference by **id** in chapter sections.

---

**npc-gundren — Gundren Rockseeker** (ally / quest_giver)  
- **Description:** Dwarf prospector, enthusiastic, one of three Rockseeker brothers. Found Wave Echo Cave’s entrance.  
- **Interaction:** Hires the PC; captured early; held at Cragmaw Castle; grateful if rescued; shares map to the mine.  
- **Story significance:** Catalyst; mine claim; 10% profit share at conclusion if alive.  
- **Appears in:** Part 1 (hook), Part 3 (castle), Part 4 (conclusion). Unique: yes.

---

**npc-sildar — Sildar Hallwinter** (ally)  
- **Description:** Human warrior, retired soldier, honorable, practical. Gundren’s traveling companion.  
- **Interaction:** Captured with Gundren; held at Cragmaw hideout; urges alliance with Phandalin and Lords’ Alliance against goblins.  
- **Story significance:** Rescue milestone; political glue; quest to Cragmaw Castle.  
- **Appears in:** Part 1, Part 2, Part 3. Unique: yes.

---

**npc-klarg — Klarg** (enemy)  
- **Description:** Bugbear chief at Cragmaw hideout; serves King Grol and the Black Spider.  
- **Interaction:** Combat at hideout; may boast about “the spider.”  
- **Appears in:** Part 1. Unique: yes.

---

**npc-glasstaff — Glasstaff / Iarno Albrek** (enemy)  
- **Description:** Human mage, Redbrand leader, secretly agents of Nezznar. Polite facade, cruel orders.  
- **Interaction:** Hideout confrontation; may flee via teleport if cornered; reveals Black Spider connection if pressed or found notes.  
- **Appears in:** Part 2. Unique: yes.

---

**npc-grol — King Grol** (enemy)  
- **Description:** Fat, arrogant goblin king at Cragmaw Castle; holds Gundren for Nezznar.  
- **Interaction:** Negotiation or combat; doppelganger may impersonate Gundren.  
- **Appears in:** Part 3. Unique: yes.

---

**npc-nezznar — Nezznar / Black Spider** (enemy, boss)  
- **Description:** Drow mage; true identity of the Black Spider. Seeks Forge of Spells.  
- **Interaction:** Final confrontation at Wave Echo Cave; use `create_enemy(..., is_boss=True)`.  
- **Appears in:** Part 4. Unique: yes.

---

**npc-elmar — Elmar Barthen** (quest_giver)  
- **Description:** Owner of Barthen’s Provisions; worried about Gundren’s absence.  
- **Interaction:** Pays wagon delivery; points PC to goblin troubles and key townsfolk.  
- **Appears in:** Part 2. Unique: yes.

---

**npc-garaele — Sister Garaele** (quest_giver)  
- **Description:** Shrine of Luck acolyte; gentle, determined.  
- **Interaction:** Quest to ask banshee **Agatha** about Bowgentle’s spellbook; reward leads toward Cragmaw region.  
- **Appears in:** Part 2–3. Unique: yes.

---

**npc-reidoth — Reidoth** (ally)  
- **Description:** Druid in Thundertree ruins; wary of strangers.  
- **Interaction:** Knows Cragmaw Castle location; can guide or direct if befriended.  
- **Appears in:** Part 3 (optional Thundertree). Unique: yes.

---

**npc-agatha — Agatha** (neutral)  
- **Description:** Banshee in Conyberry ruins; ancient, sorrowful, dangerous if disrespected.  
- **Interaction:** One clear question if appeased; answers about spellbook or Cragmaw activity.  
- **Appears in:** Part 3 (optional). Unique: yes.

---

## 5. Shared Locations

---

**loc-triboar-trail — Triboar Trail**  
- Road from Neverwinter toward Phandalin; goblin ambush site. **Part 1.**

**loc-cragmaw-hideout — Cragmaw Hideout**  
- Cave complex; wolves, goblins, Klarg; Sildar prisoner. **Part 1.**

**loc-phandalin — Phandalin**  
- Frontier town; Stonehill Inn, Barthen’s, Lionshield Coster, shrine, Tresendar Manor. **Part 2–3.**

**loc-redbrand-hideout — Redbrand Hideout**  
- Cellars under Tresendar Manor; Glasstaff, prisoners, nothic optional. **Part 2.**

**loc-cragmaw-castle — Cragmaw Castle**  
- Ruined castle; King Grol, Gundren, hobgoblins. **Part 3.**

**loc-wave-echo — Wave Echo Cave**  
- Lost mine; undead, Forge of Spells, Nezznar. **Part 4.**

**loc-conyberry — Conyberry / Agatha’s lair** (optional) **Part 3.**

**loc-thundertree — Ruins of Thundertree** (optional) **Part 3.**

---

## 6. Enemy Stat Blocks

Use virtualGM-custom-ruleset: attack = d20 + modifier vs **Evasion**; damage as noted. Non-boss 0 HP: PC recovers per ruleset with narrative setback.

| id | Name | Evasion | HP | Attack | Notes |
|----|------|---------|-----|--------|-------|
| enemy-goblin | Goblin | 12 | 7 | d20+4 (Finesse) → 1d6+2 slash or d20+4 → 1d6+2 pierce (shortbow) | Sneaky; flee when outnumbered |
| enemy-wolf | Wolf | 11 | 11 | d20+2 (Finesse) → 2d4+2 pierce | Pack tactics with goblins |
| enemy-klarg | Bugbear (Klarg) | 11 | 27 | d20+4 (Might) → 2d8+2 bludgeon | Part 1 leader |
| enemy-redbrand | Redbrand ruffian | 11 | 16 | d20+3 (Might) → 1d6+1 bludgeon | Human thug |
| enemy-nothic | Nothic | 12 | 45 | d20+3 (Wit) → 2d6+1 psychic | Optional hideout |
| enemy-glasstaff | Glasstaff | 13 | 22 | d20+5 (Wit) → 1d10+3 force (staff) | Mage; may flee |
| enemy-hobgoblin | Hobgoblin | 12 | 22 | d20+3 (Might) → 1d8+1 slash | Castle garrison |
| enemy-grol | King Grol | 12 | 45 | d20+4 (Might) → 1d6+2 pierce (spear) | Goblin king |
| enemy-nezznar | Nezznar (boss) | 14 | 58 | d20+6 (Wit) → 2d8+4 force; staff powers | **Boss** — `is_boss=True` |
| enemy-skeleton | Skeleton | 12 | 10 | d20+1 (Finesse) → 1d6+1 slash | Wave Echo undead |
| enemy-zombie | Zombie | 9 | 14 | d20+0 (Might) → 1d4 bludgeon | Wave Echo undead |
| enemy-bugbear | Bugbear | 11 | 27 | d20+4 (Might) → 2d8+2 bludgeon | Wave Echo guardian |

---

## 7. Campaign Sections

Use `load_campaign_section(section)` with paths below. Only load what you need.

### Introduction
- `Introduction/Adventure_Hook` — Hire, payment, character ties

### Part 1: Goblin Arrows (Level 1)
- `Part1_Goblin_Arrows/Goblin_Ambush` — Wagon, dead horses, ambush, trail
- `Part1_Goblin_Arrows/Cragmaw_Hideout` — Cave, Klarg, rescue Sildar, Gundren taken to castle

### Part 2: Phandalin (Level 2)
- `Part2_Phandalin/Overview` — Town, key NPCs, Redbrand trouble
- `Part2_Phandalin/Redbrand_Hideout` — Tresendar Manor cellars, Glasstaff

### Part 3: The Spider's Web (Level 3)
- `Part3_The_Spiders_Web/Overview` — Optional quests, trail to castle
- `Part3_The_Spiders_Web/Cragmaw_Castle` — King Grol, rescue Gundren, map
- `Part3_The_Spiders_Web/Whats_Next` — Transition to Wave Echo Cave

### Part 4: Wave Echo Cave (Level 4–5)
- `Part4_Wave_Echo_Cave/Overview` — Mine, key areas, Nezznar boss
- `Part4_Wave_Echo_Cave/Conclusion` — Rewards, Rockseeker share, epilogue

### Reference
- `Appendix_B_Monsters/Enemy_Stat_Blocks` — Same stats as §6 (quick load in combat)

---

## 8. Story Arc Checklist

Track these beats so the campaign feels complete:

| # | Beat | Part |
|---|------|------|
| 1 | Hired to escort wagon; Gundren & Sildar go ahead | Hook |
| 2 | Goblin ambush; trail to hideout | 1 |
| 3 | Sildar rescued; learn Gundren sent to Cragmaw Castle / Black Spider | 1 |
| 4 | Arrive Phandalin; Redbrands identified as threat | 2 |
| 5 | Redbrand hideout cleared; Glasstaff link to Black Spider | 2 |
| 6 | (Optional) Side quests gather clues | 3 |
| 7 | Cragmaw Castle: Gundren rescued; map to Wave Echo Cave | 3 |
| 8 | Enter mine; reach Forge of Spells | 4 |
| 9 | Defeat Nezznar; conclusion and Rockseeker reward | 4 |

---

## 9. XP Guidance (suggested)

Award via `award_xp` after milestones (outside combat):

- Goblin ambush + hideout cleared — **50 XP**  
- Sildar rescued — **25 XP**  
- Redbrand hideout cleared — **75 XP**  
- Glasstaff defeated or driven off — **50 XP**  
- Cragmaw Castle + Gundren rescued — **100 XP**  
- Wave Echo Cave key areas — **50–75 XP** each  
- Nezznar defeated — **100 XP**  

Target **~600–700 XP** total for level 5 by end (adjust to ruleset thresholds).

---

## Document version

- **Version:** 2.0 (simplified)  
- **Last updated:** 2026-06-02  
- **Changelog:** Condensed from full module to necromancer-style template; removed room-by-room keyed dungeons, premade characters, and full monster appendix; preserved main plot, NPCs, and encounters.
