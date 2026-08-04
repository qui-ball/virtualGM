# Touch of the Necromancer — Campaign Template (Adapted)

Campaign template for the Virtual GM application. Uses the **virtualGM-custom-ruleset**. Single-player, levels 1–3, 2–3 sessions. Dark tone; time pressure.

**Source:** Adapted from `touch-of-the-necromancer.md` for `load_campaign_section` (same pattern as Lost Mine Adapted).

---

## 1. Metadata

- **Name:** Touch of the Necromancer
- **Slug:** `fantasy-touch-of-the-necromancer`
- **Description:** Sera, the PC’s younger sister, takes a necromancer’s curse meant for the player. The PC has limited time to gather three ingredients for a wizard’s ritual to save her—or lose her forever.
- **Publisher:** Virtual GM (sample campaign)
- **Ruleset:** virtualGM-custom-ruleset
- **Estimated sessions:** 2–3
- **Level range:** 1–3
- **Boss battles:** None (all encounters are non-boss)

---

## 2. Campaign Summary

**Arc:** PC and Sera stumble into Malachara’s ritual. Curse was meant for the PC; Sera takes it. Malachara escapes. In Hollowbridge, Matron Evaine cannot break death magic and sends them to Aldric the Grey. He needs three ingredients (any order); does **not** warn that impure ingredients can backfire onto the PC. Clock runs; fail or time-out → Sera lost.

**Objectives:** Dragon scale (or impure substitute), mercury (pure or impure), mandrake; return before counter hits 0; survive ritual.

**GM guidance:** Load only the section needed (`load_campaign_section`; max 3). Keep the clock palpable. Track ingredient purity. Do not reveal backfire until the ritual. Malachara is not confronted again. Ch2–Ch4 any order after the quest is given. Sera stays in Hollowbridge during ingredient chapters. Returning with fewer than three: Aldric refuses; clock keeps running. Non-boss 0 HP: full recover + narrative setback.

---

## 3. Time Counter

- **Start:** 35 when curse applies (end of shrine scene). No deductions during prologue until then.
- **Travel to Hollowbridge after curse:** −2 or −3.
- **Short rest −1 / long rest −5**; travel costs per chapter section.
- **At 0:** Time-out ending. Optional: at 20 Sera worse; at 10 barely conscious.

---

## 4. Campaign Sections

Use `load_campaign_section(section)` with paths below.

### Reference (keep handy)
- `Shared_NPCs` — NPC ids and roles
- `Shared_Locations` — Location ids
- `Appendix_Enemies/Enemy_Stat_Blocks` — Non-boss stats
- `XP_Guidance` — Suggested awards

### Chapter 1 — Prologue
- `Ch1_Prologue/Overview` — Chapter hub
- `Ch1_Prologue/The_Shrine` — Ritual, curse, Malachara flees
- `Ch1_Prologue/Travel_to_Hollowbridge` — Travel; counter deductions

### Chapter 2 — Dragon scale (any order with Ch3–Ch4 after quest)
- `Ch2_Dragon_Scale/Overview` — Chapter hub
- `Ch2_Dragon_Scale/Hollowbridge_Evaine_Aldric` — Temple + ingredient list
- `Ch2_Dragon_Scale/Torval_and_Northreach` — Errand, bandits, pure/impure scale

### Chapter 3 — Mercury
- `Ch3_Mercury/Overview` — Chapter hub
- `Ch3_Mercury/Vesper_and_Mine` — Detector, undead, ore purity

### Chapter 4 — Mandrake
- `Ch4_Mandrake/Overview` — Chapter hub
- `Ch4_Mandrake/Mara` — Buy/negotiate
- `Ch4_Mandrake/Elven_Forest` — Forage, rangers, impure variant

### Chapter 5 — Return
- `Ch5_Return/Overview` — Chapter hub
- `Ch5_Return/Ritual_Outcomes` — Time-out / success / backfire

---

## 5. Story Arc Checklist

| # | Beat | Load |
|---|------|------|
| 1 | Shrine curse; Malachara flees; counter = 35 | `Ch1_Prologue/The_Shrine` |
| 2 | Travel to Hollowbridge | `Ch1_Prologue/Travel_to_Hollowbridge` |
| 3 | Evaine → Aldric; ingredient list | `Ch2_Dragon_Scale/Hollowbridge_Evaine_Aldric` |
| 4–6 | Scale / mercury / mandrake (any order) | Torval / Vesper / Mara–Forest sections |
| 7 | Ritual resolution | `Ch5_Return/Ritual_Outcomes` |

---

## Document version

- **Version:** 1.1 (Adapted)
- **Last Updated:** 2026-07-30
- **Changelog:** Added scene-level sections (shrine, travel, Evaine/Aldric, Torval, mine, Mara, forest, ritual), Shared NPCs/Locations, XP_Guidance — parity with Lost Mine Adapted depth.
