# Touch of the Necromancer — Campaign Template

Campaign template for the Virtual GM application. Uses the **virtualGM-custom-ruleset**. Single-player, levels 1–3, 2–3 sessions. Dark tone; time pressure.

---

## 1. Metadata

- **Name:** Touch of the Necromancer  
- **Description:** Sera, the PC’s younger sister, takes a necromancer’s curse meant for the player. The PC has limited time to gather three ingredients for a wizard’s ritual to save her—or lose her forever.  
- **Publisher:** Virtual GM (sample campaign)  
- **License:** Open / sample  
- **Ruleset:** virtualGM-custom-ruleset  
- **Estimated sessions:** 2–3  
- **Level range:** 1–3  
- **Boss battles:** None (all encounters are non-boss per ruleset)

---

## 2. Campaign Summary

**Arc:** The PC and Sera stumble into a ritual at an abandoned shrine (or burial mound). The necromancer **Malachara** targets the PC with a curse; Sera steps in and takes it. Malachara escapes. Sera’s condition worsens (pale, decaying). In **Hollowbridge**, **Matron Evaine** recognizes it as a necromancer’s curse: the temple’s divine magic can ease suffering but cannot break something woven with death magic. She sends them to **Aldric the Grey**, a wizard who keeps the kind of arcane knowledge needed to undo such bindings—and who knows a counter-ritual that requires three ingredients. He stresses their importance once but does **not** mention that impure ingredients can cause the spell to backfire onto the caster’s ally (the PC). The three ingredients can be gathered in **any order**. If the PC returns with all three in time, Aldric performs the ritual; outcomes depend on purity. If the PC fails to gather all three or the time counter reaches 0, Sera is lost.

**Objectives:** Obtain dragon scale (or acceptable substitute), mercury (pure or impure), and mandrake roots; return to Aldric before the counter reaches 0; survive the ritual outcome.

**Themes and tone:** Dark, brutal, time pressure. Guilt (curse was meant for the PC). Sacrifice and consequence. No boss battle; combat is non-boss only.

**GM guidance:** Keep the clock palpable. Short rest −1, long rest −5; apply event-based deductions per chapter. Track ingredient purity (dragon vs lizardman scale; pure vs impure mercury; mandrake source). Do not reveal the backfire risk until it happens. Malachara is not confronted in this campaign (future campaign hook). **Chapter order:** Ch2, Ch3, and Ch4 may be played in any order depending on which ingredient the player pursues first; track which ingredient is obtained when. **Sera’s location:** During Ch2–Ch4, Sera remains in Hollowbridge (e.g. at the temple or with Aldric) so the PC can gather ingredients; her condition worsens in their absence—use this for tension. **Returning with fewer than three:** If the PC returns to Aldric with only one or two ingredients, he refuses to attempt the ritual until all three are gathered; the counter keeps running. **Non-boss 0 HP:** Per ruleset, if the PC drops to 0 HP in an encounter (bandits, undead, rangers), they do not die; they recover with full HP and mana but suffer a narrative setback (e.g. bandits take the sword, or they are driven out of the forest empty-handed). **Optional—Sera’s deterioration:** When the counter reaches 20, describe Sera as noticeably worse; at 10, barely conscious. Use to heighten tension without changing rules.

---

## 3. Campaign Time Counter

- **Starting value:** 35 (starts when the curse is applied at the end of Chapter 1).
- **Short rest:** −1.
- **Long rest:** −5.
- **Other deductions:** Per chapter (travel to Hollowbridge after Ch1, travel between locations, delays). See each chapter’s “Time counter” section.
- **If counter reaches 0:** When a deduction would reduce the counter to 0 or below, set it to 0 and trigger the time-out outcome immediately: Aldric can no longer help in time; Sera turns into a lich and escapes; campaign ends (see Chapter 5).
- **Chapter 1:** No deductions until the curse is applied; counter is not in effect during the prologue scene. **Travel to Hollowbridge** after the curse (before Ch2): apply −2 (or −3) so the counter applies from the start of the journey.

---

## 4. Shared NPCs

These NPCs appear in multiple chapters. Reference by **id** in chapter-specific sections as needed.

---

**npc-sera — Sera** (ally)  
- **Description:** PC’s younger sister. Pale, slowly decaying after taking the curse; once lively, now fading. Brave and curious—her curiosity led them into the shrine.  
- **Interaction:** She is the victim; the PC acts for her. She can speak briefly when conscious; use for emotional beats.  
- **Story significance:** Central stake; her fate drives the campaign.  
- **Appears in:** ch1, ch5 (and referenced throughout). Unique: yes.

---

**npc-malachar — Malachara** (enemy)  
- **Description:** Necromancer. Gaunt, hollow-cheeked, dark robes, cold voice; presence feels wrong. Cast the curse and escaped.  
- **Interaction:** Prologue only; she does not appear again in this campaign.  
- **Story significance:** Villain; future campaign hook (revenge).  
- **Appears in:** ch1. Unique: yes.

---

**npc-evaine — Matron Evaine** (quest_giver)  
- **Description:** High Priestess. Tall, severe bearing, grey-streaked hair; voice firm but not unkind. Stern, regretful she cannot help; carries the weight of what she cannot fix.  
- **Interaction:** Recognizes the curse as necromantic—the temple’s blessings can soothe but not unravel death magic. She knows only someone with the right *arcane* counter-ritual can try; she directs the PC to Aldric the Grey and insists they go quickly.  
- **Story significance:** Points to wizard path.  
- **Appears in:** ch2 (when PC reaches Hollowbridge). Unique: yes.

---

**npc-aldric — Aldric the Grey** (quest_giver)  
- **Description:** Wizard. Thin, grey-bearded, sharp eyes; robes and tower cluttered with books and oddities. Reclusive and prickly; values his time and his ingredients. He keeps knowledge of how to counter necromantic bindings—the kind of “grey” lore the temple does not touch.  
- **Interaction:** Gives the ingredient list and later a hefty bill. Mentions importance of ingredients once. Does **not** warn that impure ingredients can backfire.  
- **Story significance:** Performs the ritual; outcome depends on ingredients and time.  
- **Appears in:** ch2, ch5. Unique: yes.

---

**npc-torval — Torval** (quest_giver)  
- **Description:** Blacksmith in Hollowbridge. Burly, soot-smudged; gruff but keeps his word. Won’t sell the dragon scale outright.  
- **Interaction:** Offers errand: deliver sword to a noble in Northreach (e.g. **Lord Cade** or the bailiff; GM may name), collect payment, return. Orc bandits may try to steal it. If they fail or refuse the errand: Torval can direct them to a trader who has lizardman scales, or the GM may allow another source—lizardman’s scale counts as **impure**.  
- **Story significance:** Source of dragon scale or substitute.  
- **Appears in:** ch2. Unique: yes.

---

**npc-vesper — Vesper** (quest_giver)  
- **Description:** Alchemist. Slight build, quick hands, faint chemical smell; speaks in short, practical bursts. Knows the abandoned mine; provides a detector for mercury in ore.  
- **Interaction:** Gives vial of mercury from ore the PC helps obtain; keeps the rest, no charge.  
- **Story significance:** Source of mercury; mine has undead.  
- **Appears in:** ch3. Unique: yes.

---

**npc-mara — Mara** (quest_giver)  
- **Description:** Herbalist. Weather-worn face, green-stained fingers; calm and observant. Has or can get mandrake; drives a hard but fair bargain.  
- **Interaction:** Price negotiable. Alternative: PC can seek mandrake in the elven forest (risk: rangers; ranger/elf PC may have advantage). Optional: wrong plant or wilted roots = **impure** (see Ch4).  
- **Story significance:** Source of mandrake.  
- **Appears in:** ch4. Unique: yes.

---

## 5. Shared Locations

---

**loc-hollowbridge — Hollowbridge**  
- **Description:** Main hub. Contains the temple, Aldric’s tower, Torval’s forge, Vesper’s shop, and Mara’s herb shop (see sub-locations).  
- **GM notes:** Dark, urgent tone. Townsfolk may comment on Sera’s condition.  
- **Connections:** loc-temple, loc-forge, loc-alchemist, loc-herbalist, loc-aldric-tower; loc-northreach (road), loc-mine (road), loc-forest (road).  
- **Appears in:** ch2, ch3, ch4, ch5.

---

**loc-temple — Temple of Hollowbridge**  
- **Description:** Where Matron Evaine tends the faithful. Stone, candles, quiet.  
- **GM notes:** First stop for the desperate; Evaine’s refusal sets the tone.  
- **Connections:** loc-hollowbridge. **Appears in:** ch2.

---

**loc-forge — Torval’s forge**  
- **Description:** Blacksmith’s workshop; heat, soot, the dragon scale kept out of sight.  
- **GM notes:** Errand begins here.  
- **Connections:** loc-hollowbridge. **Appears in:** ch2.

---

**loc-alchemist — Vesper’s shop**  
- **Description:** Alchemist’s workspace; vials, smells, the mercury detector.  
- **GM notes:** Mine directions and detector given here.  
- **Connections:** loc-hollowbridge. **Appears in:** ch3.

---

**loc-herbalist — Mara’s herb shop**  
- **Description:** Herbalist’s shop; drying plants, negotiated prices.  
- **GM notes:** Mandrake bought or commissioned here.  
- **Connections:** loc-hollowbridge. **Appears in:** ch4.

---

**loc-northreach — Northreach**  
- **Description:** Next town; noble (e.g. Lord Cade) or bailiff expects the sword delivery.  
- **GM notes:** Brief stay; bandits on the road.  
- **Connections:** loc-hollowbridge (road). **Appears in:** ch2.

---

**loc-shrine — Abandoned shrine / burial mound**  
- **Description:** Roadside; Sera is drawn by sounds or strange light. Where Malachara performs the ritual.  
- **GM notes:** Eerie; ritual remnants. No time counter here.  
- **Connections:** —. **Appears in:** ch1.

---

**loc-mine — Abandoned mine**  
- **Description:** Where mercury-bearing ore can be found. Undead (zombies, skeletons).  
- **GM notes:** Claustrophobic; detector for mercury.  
- **Connections:** loc-hollowbridge (road). **Appears in:** ch3.

---

**loc-forest — Elven forest**  
- **Description:** Where mandrake can be foraged. Rangers may challenge trespassers.  
- **GM notes:** Ranger or elf PC: easier negotiation or passage. Optional: wrong plant or wilted roots = impure mandrake.  
- **Connections:** loc-hollowbridge (road). **Appears in:** ch4.

---

**loc-aldric-tower — Aldric’s tower**  
- **Description:** Where the ritual is performed. Cluttered, books and oddities.  
- **GM notes:** Final scene: ritual, then outcome.  
- **Connections:** loc-hollowbridge. **Appears in:** ch2, ch5.

---

## 6. Enemy Stat Blocks

All campaign encounters are **non-boss** (per ruleset: at 0 HP the PC does not die but recovers with full HP/mana and suffers a narrative setback). Use these stats with the virtualGM-custom-ruleset: **attack roll** = d20 + modifier vs target **Evasion**; **damage** as below; **initiative** = d20 + Finesse (use Finesse value below for enemies).

**Stat shorthand for saves:** Use the same modifier as the listed attack stat when the enemy must make a save (e.g. orc Might +1, skeleton Finesse +1). Save DC for enemy effects = 10 + that modifier.

**Encounter size:** Use 2–3 orcs, 1–2 zombies, 1–2 skeletons, or 1–2 rangers; adjust for party level or pacing. Single PC: lean toward the lower count.

---

**enemy-orc-bandit — Orc bandit**  
- **Evasion:** 11 · **HP:** 12  
- **Melee:** d20 + 1 (Might) vs Evasion → 1d6 + 1 slashing (axe or sword)  
- **Ranged:** —  
- **Notes:** Aggressive; may try to grab the sword and run.  
- **Encounter:** Ch2 — road to/from Northreach (2–3 bandits).

---

**enemy-zombie — Zombie**  
- **Evasion:** 9 · **HP:** 14  
- **Melee:** d20 + 0 (Might) vs Evasion → 1d4 + 0 bludgeoning (slam)  
- **Ranged:** —  
- **Notes:** Slow; Finesse 0. May grapple (Might or Finesse check DC 10 to escape).  
- **Encounter:** Ch3 — abandoned mine (1–2 zombies).

---

**enemy-skeleton — Skeleton**  
- **Evasion:** 12 · **HP:** 10  
- **Melee:** d20 + 1 (Finesse) vs Evasion → 1d6 + 1 slashing (shortsword)  
- **Ranged:** d20 + 1 (Finesse) vs Evasion → 1d6 + 1 piercing (shortbow), range narrative “close”  
- **Notes:** Brittle but quick.  
- **Encounter:** Ch3 — abandoned mine (1–2 skeletons).

---

**enemy-elven-ranger — Elven ranger**  
- **Evasion:** 13 · **HP:** 11  
- **Melee:** d20 + 2 (Finesse) vs Evasion → 1d6 + 2 piercing (shortsword)  
- **Ranged:** d20 + 2 (Finesse) vs Evasion → 1d6 + 2 piercing (shortbow)  
- **Notes:** Prefer to drive off trespassers; may demand surrender or retreat. Ranger/elf PC: advantage on Presence (parley) or Finesse (avoid).  
- **Encounter:** Ch4 — elven forest (1–2 rangers, optional).

---

## 7. Chapter 1 — Prologue

### 7.1 Chapter metadata

- **id:** ch1-prologue · **Order:** 1 · **Name:** Prologue  
- **Summary:** PC and Sera stumble into Malachara’s ritual. Curse was meant for the PC; Sera takes it. Malachara escapes. Time counter does not run until curse is applied.  
- **Estimated session length:** Short (first part of session 1) · **Level range:** 1

### 7.2 GM notes

- **Introduction:** Open with the pair traveling (toward or from somewhere). Sera notices the shrine/mound—sounds or strange light. She is curious and insists on looking. The PC can try to dissuade her but she goes anyway; the PC follows.
- **Key beats:** Enter the location → discover Malachara mid-ritual → she targets the PC → Sera steps in and takes the curse → Malachara escapes (do not allow a full fight; she finishes the curse and leaves). Describe Sera’s condition beginning to change (pale, unwell). No time counter deductions in this chapter.
- **Adaptation:** If the player tries to attack or block the curse, allow one action or reaction; the curse still lands on Sera (she interposes or the magic finds her). Do not let them prevent the curse or catch Malachara.
- **Transition:** After Malachara leaves, the PC must get Sera to safety and seek help. **Suggested default:** They were traveling toward Hollowbridge when they passed the shrine; they continue to Hollowbridge and seek the temple (Evaine). If you use a different origin, have them reach Hollowbridge so Chapter 2 can begin with Evaine/Aldric.

### 7.3 NPCs (this chapter)

- **Malachara** (see Shared NPCs). Present only here; she escapes.
- **Sera** (see Shared NPCs). Victim; curse applied to her here.

### 7.4 Locations (this chapter)

- **Abandoned shrine / burial mound** (see Shared Locations, `loc-shrine`).

### 7.5 Story elements

- **ev1-discovery** (event) — Sera and PC discover the ritual.  
  *Trigger:* When they enter the shrine/mound. *GM:* Eerie atmosphere; Malachara at center of ritual. *NPCs:* npc-malachar. *Location:* loc-shrine.

- **ev1-curse** (event) — Malachara targets PC; Sera takes the curse.  
  *Trigger:* After discovery; Malachara completes casting. *GM:* Make the moment clear: curse was for PC, Sera steps in. *NPCs:* npc-malachar, npc-sera. *Location:* loc-shrine.

- **ev1-escape** (event) — Malachara escapes.  
  *Trigger:* After curse is applied. *GM:* No prolonged combat; she withdraws. *NPCs:* npc-malachar. *Location:* loc-shrine.

- **tr1-to-ch2** (transition) — PC seeks help for Sera.  
  *Trigger:* After Malachara is gone. *GM:* Direct them toward Hollowbridge and the temple (Evaine). *NPCs:* npc-sera. *Location:* —.

### 7.6 Time counter

- **No deductions** until the curse is applied.
- **When curse is applied:** Campaign time counter **starts at 35** for the rest of the campaign.

---

## 8. Chapter 2 — The Dragon Scale

### 8.1 Chapter metadata

- **id:** ch2-dragon-scale · **Order:** 2 · **Name:** The Dragon Scale  
- **Summary:** PC is in Hollowbridge. Meets Matron Evaine, then Aldric. Learns of the three ingredients. This chapter covers obtaining the dragon scale (or lizardman substitute): Torval’s errand to Northreach or alternate. The three ingredients can be gathered in any order; this chapter is one leg.  
- **Estimated session length:** Part of session 1–2 · **Level range:** 1–2

### 8.2 GM notes

- **Introduction:** PC arrives in Hollowbridge with Sera. Temple first: Matron Evaine explains that the curse is necromantic—her prayers can comfort but not break it—and directs them to Aldric the Grey, who knows the counter-ritual. (If the PC goes to Aldric first, he can say the temple would have sent them, or allow skipping Evaine if it fits.) Then Aldric: he gives the list of three ingredients, stresses their importance once, does **not** mention impure-ingredient risk. Sera remains in Hollowbridge (temple or Aldric’s care) while the PC gathers ingredients. This chapter focuses on the dragon scale.
- **Key beats:** Speak with Evaine → speak with Aldric (get full list) → speak with Torval → either (a) accept errand: travel to Northreach, deliver sword, collect payment, return (risk: orc bandits on the road), or (b) fail/refuse errand and obtain a lizardman’s scale instead (cheaper/easier but **counts as impure** for ritual). If they complete the errand and receive the real dragon scale, ingredient is **pure**.
- **Time deductions (this chapter):** Travel Hollowbridge ↔ Northreach: −2 each way (or per narrative). Short rest −1, long rest −5. Bandit encounter: no extra deduction unless you assign one (e.g. delay −1).
- **Adaptation:** If the PC goes to Northreach first and bandits steal the sword (or PC drops to 0 HP—per ruleset they don’t die but may lose the sword), they can return and get a lizardman’s scale (Torval directs to a trader, or GM provides another source). Track whether the scale is dragon (pure) or lizardman (impure).

### 8.3 NPCs (this chapter)

- Matron Evaine, Aldric the Grey, Torval (see Shared NPCs). Enemies: **enemy-orc-bandit** (see §6 Enemy Stat Blocks).

### 8.4 Locations (this chapter)

- loc-hollowbridge, loc-temple, loc-forge, loc-aldric-tower, loc-northreach (see Shared Locations). Road between Hollowbridge and Northreach.

### 8.5 Story elements

- **ev2-evaine** (event) — Evaine recognizes the necromantic curse; temple magic cannot undo it; she directs to Aldric.  
  *Trigger:* When PC visits temple. *GM:* She explains briefly why (divine vs death magic; only the right arcane ritual can try). Stern, regretful; urgency. *NPCs:* npc-evaine. *Location:* loc-temple.

- **ev2-aldric-list** (event) — Aldric gives three ingredients; stresses importance once.  
  *Trigger:* When PC visits Aldric. *GM:* Do not mention backfire. *NPCs:* npc-aldric. *Location:* loc-aldric-tower.

- **ev2-torval** (hook) — Torval offers errand for dragon scale.  
  *Trigger:* When PC asks Torval. *GM:* Errand: deliver sword to Northreach, return with payment. *NPCs:* npc-torval. *Location:* loc-forge.

- **ev2-bandits** (event) — Orc bandits attempt to take the sword.  
  *Trigger:* On road to/from Northreach (as appropriate). *GM:* Non-boss encounter. *Location:* road.

- **ev2-lizardman-option** (consequence) — If PC fails errand or chooses not to: lizardman’s scale as substitute.  
  *Trigger:* When PC cannot or will not complete errand. *GM:* Mark ingredient as impure for ritual. *NPCs:* npc-torval. *Location:* loc-forge.

- **tr2-next** (transition) — Dragon scale (or substitute) obtained.  
  *Trigger:* When PC has the scale. *GM:* Move to next ingredient chapter (Ch3 or Ch4)—player’s order. *NPCs:* npc-torval.

### 8.6 Time counter

- Short rest −1; long rest −5.
- Travel Hollowbridge ↔ Northreach: −2 per leg (or as you specify).
- Other delays: apply −1 or −2 as appropriate.

---

## 9. Chapter 3 — The Mercury

### 9.1 Chapter metadata

- **id:** ch3-mercury · **Order:** 3 · **Name:** The Mercury  
- **Summary:** PC obtains mercury with Vesper’s help: trip to the abandoned mine, use detector for mercury-bearing ore, face undead. Vesper prepares the vial. PC may choose to bring pure or impure ore (impure = backfire risk).  
- **Estimated session length:** Part of session 2 · **Level range:** 1–2

### 9.2 GM notes

- **Introduction:** PC goes to Vesper (in Hollowbridge). Vesper knows the abandoned mine; gives a device that detects mercury in ore. He will prepare the vial from ore the PC collects; he keeps the rest, no charge.
- **Key beats:** Vesper explains the mine and gives the detector → travel to mine → find ore (detector indicates pure vs impure veins) → encounter undead (zombies, skeletons; non-boss) → return with ore → Vesper prepares vial. **Choice:** PC can deliberately collect impure ore (e.g. to save time or avoid deeper danger); if so, mark mercury as **impure** for the ritual.
- **Time deductions:** Travel to/from mine: −2 each way (or as specified). Short rest −1; long rest −5. Mine exploration: −1 per significant delay if you use it.
- **Adaptation:** If the PC avoids combat and grabs ore quickly, allow it but still apply time for travel. Undead should feel threatening but not block progress entirely.

### 9.3 NPCs (this chapter)

- Vesper (see Shared NPCs). Enemies: **enemy-zombie**, **enemy-skeleton** (see §6 Enemy Stat Blocks).

### 9.4 Locations (this chapter)

- loc-hollowbridge, loc-alchemist, loc-mine (see Shared Locations).

### 9.5 Story elements

- **ev3-vesper** (event) — Vesper gives detector and directions to mine.  
  *Trigger:* When PC visits Vesper. *GM:* No charge for vial; he keeps extra mercury. *NPCs:* npc-vesper. *Location:* loc-alchemist.

- **ev3-mine-undead** (event) — Undead in mine.  
  *Trigger:* When PC is in mine. *GM:* Non-boss; zombies and/or skeletons. *Location:* loc-mine.

- **ev3-ore-choice** (consequence) — PC can take pure or impure ore.  
  *Trigger:* When collecting ore. *GM:* Impure = backfire risk at ritual. *NPCs:* npc-vesper. *Location:* loc-mine.

- **tr3-next** (transition) — Vial of mercury obtained.  
  *Trigger:* When Vesper delivers vial. *GM:* Move to next ingredient chapter. *NPCs:* npc-vesper.

### 9.6 Time counter

- Short rest −1; long rest −5.
- Travel to/from mine: −2 per leg.
- Optional: −1 for delays in mine.

---

## 10. Chapter 4 — The Mandrake

### 10.1 Chapter metadata

- **id:** ch4-mandrake · **Order:** 4 · **Name:** The Mandrake  
- **Summary:** PC obtains mandrake roots: buy from Mara (negotiable price) or forage in the elven forest. Forest option risks elven rangers (trespassing); ranger or elf PC may have advantage.  
- **Estimated session length:** Part of session 2–3 · **Level range:** 1–3

### 10.2 GM notes

- **Introduction:** PC needs mandrake roots. Mara (herbalist in Hollowbridge) may have them for a negotiable price. Alternatively, PC can seek mandrake in the elven forest.
- **Key beats:** (Path A) Negotiate with Mara → pay (or persuade) → receive roots. (Path B) Travel to elven forest → forage → possibly confronted by elven rangers. If PC is ranger or elf, use advantage on negotiation or avoidance (e.g. advantage on relevant checks, or rangers allow passage with a warning). **Mandrake purity:** From Mara or correctly foraged in the forest = **pure**. **Optional impure variant:** If the PC forages in the forest and fails a Wit (or Finesse) check to identify the right plant, or takes wilted/compromised roots, treat mandrake as **impure** (see story element ev4-mandrake-impure).
- **Time deductions:** Travel to/from forest: −2 per leg. Negotiation or foraging: no extra unless you add a delay. Short rest −1; long rest −5.
- **Adaptation:** If the PC cannot afford Mara and fails in the forest, they might return to Mara with a different offer (favor, future payment) or find another way; avoid deadlock.

### 10.3 NPCs (this chapter)

- Mara (see Shared NPCs). Optional enemies: **enemy-elven-ranger** (see §6 Enemy Stat Blocks; use if PC trespasses and fails negotiation/stealth).

### 10.4 Locations (this chapter)

- loc-hollowbridge, loc-herbalist, loc-forest (see Shared Locations).

### 10.5 Story elements

- **ev4-mara** (hook) — Mara has or can get mandrake; price negotiable.  
  *Trigger:* When PC visits Mara. *GM:* Presence-based negotiation possible. *NPCs:* npc-mara. *Location:* loc-herbalist.

- **ev4-forest** (event) — Elven forest: forage mandrake; rangers may challenge.  
  *Trigger:* When PC enters forest. *GM:* Ranger/elf PC: advantage on checks or leniency. *Location:* loc-forest.

- **ev4-mandrake-impure** (consequence) — Optional: wrong plant or wilted roots = impure mandrake.  
  *Trigger:* If PC forages and fails identification or takes bad roots. *GM:* Call for Wit or Finesse check; failure = impure. Use for three-way symmetry with scale/mercury. *Location:* loc-forest.

- **tr4-next** (transition) — Mandrake roots obtained.  
  *Trigger:* When PC has roots. *GM:* All three ingredients ready; move to Ch5. *NPCs:* npc-mara.

### 10.6 Time counter

- Short rest −1; long rest −5.
- Travel to/from forest: −2 per leg if used.

---

## 11. Chapter 5 — Return and Resolution

### 11.1 Chapter metadata

- **id:** ch5-return · **Order:** 5 · **Name:** Return and Resolution  
- **Summary:** PC returns to Aldric with the three ingredients (or fails: missing ingredients or time counter 0). Aldric performs the ritual. Outcomes: Sera saved (all pure); Sera saved but curse transfers to PC (any impure); or Sera lost (incomplete or time out).  
- **Estimated session length:** End of session 2–3 · **Level range:** 1–3

### 11.2 GM notes

- **Introduction:** When the PC has all three ingredients and returns to Aldric (or when time runs out or PC gives up), this chapter plays. If **time counter reached 0** before return with all three: Aldric cannot help in time. Sera turns into a lich and escapes in the night—campaign ends (see outcome A).
- **Key beats:** Return to Aldric → present ingredients → Aldric performs ritual. Do **not** reveal before the ritual that impure ingredients can backfire. After the ritual, resolve by purity:
  - **All ingredients pure:** Spell succeeds. Sera is restored. Aldric sends a hefty bill (pay later). Award bonus XP.
  - **Any ingredient impure:** Spell backfires. Curse transfers from Sera to the PC. Sera is saved. That night the PC becomes a lich and is lost. Character dies and cannot be used in future adventures; prompt the user to save a copy of the character (pre-lich) for future use.
- **Time deductions:** Any final travel or delay: apply as needed. Short rest −1; long rest −5 if they rest before the ritual.

### 11.3 NPCs (this chapter)

- Aldric the Grey, Sera (see Shared NPCs). No new combatants unless you add a final scene (e.g. Sera’s transformation if time ran out).

### 11.4 Locations (this chapter)

- loc-hollowbridge, loc-aldric-tower (see Shared Locations).

### 11.5 Story elements

- **ev5-time-out** (consequence) — Time counter 0 before return with all three.  
  *Trigger:* Counter reaches 0. *GM:* Aldric cannot help. Sera turns into a lich and escapes—campaign ends. *NPCs:* npc-aldric, npc-sera. *Location:* loc-aldric-tower.

- **ev5-ritual** (event) — Aldric performs the removal spell.  
  *Trigger:* When PC returns with all three ingredients. *GM:* Do not warn about impure ingredients. *NPCs:* npc-aldric, npc-sera. *Location:* loc-aldric-tower.

- **ev5-success** (consequence) — All pure: Sera restored; bill; bonus XP.  
  *Trigger:* Ritual with all ingredients pure. *GM:* Positive ending; bill can be paid in future adventures. *NPCs:* npc-aldric, npc-sera. *Location:* loc-aldric-tower.

- **ev5-backfire** (consequence) — Any impure: curse transfers to PC; PC becomes lich.  
  *Trigger:* Ritual with at least one impure ingredient. *GM:* Sera saved; PC lost. Offer to save character copy (pre-lich). *NPCs:* npc-aldric, npc-sera. *Location:* loc-aldric-tower.

### 11.6 Time counter

- Apply any final travel or rest deductions.
- If counter reaches 0 before ritual: outcome A (Sera lost, campaign ends).

---

## 12. Outcome Summary

- **Time counter reaches 0** before PC returns with all three ingredients → Aldric cannot help. Sera turns into a lich and escapes. Campaign ends.  
- **PC returns with all three; all ingredients pure** → Spell succeeds. Sera restored. Aldric sends hefty bill (pay later). Bonus XP.  
- **PC returns with all three; any ingredient impure** → Spell backfires. Curse transfers to PC. Sera saved. PC becomes lich and is lost. Prompt to save character copy (pre-lich).

**Ingredient purity reference:**

- **Dragon scale:** Pure = real dragon scale (Torval’s errand completed). Impure = lizardman’s scale (substitute; source: trader Torval can direct to, or GM).
- **Mercury:** Pure = ore from a pure vein; impure = deliberately or accidentally impure ore.
- **Mandrake:** Pure = from Mara or correctly foraged in the forest. **Optional impure:** Wrong plant or wilted roots when foraging (e.g. failed Wit or Finesse check); see Ch4 story element ev4-mandrake-impure.

---

## 13. XP Guidance (suggested)

Use these as guidelines so the PC can reach level 2 (100 XP) and possibly level 3 (250 XP) over 2–3 sessions. Adjust to taste.

- Prologue (Ch1) — **25 XP**
- Meeting Evaine and Aldric, receiving quest — **25 XP**
- Dragon scale obtained (Ch2) — **50 XP**
- Orc bandits encounter — **25 XP**
- Mercury obtained (Ch3) — **50 XP**
- Undead in mine — **50 XP**
- Mandrake obtained (Ch4) — **50 XP**
- Elven rangers (if encountered) — **25 XP**
- Ritual success (all pure) bonus — **50 XP**
- **Total (full run, all pure) — 350 XP**

If the campaign ends early (time-out or backfire), award XP for what was completed. Level-up occurs only outside battle when the character’s total XP reaches the next threshold (ruleset).

---

## Document version

- **Version:** 1.4  
- **Last updated:** 2025-02-23  
- **Changelog (1.4):** All tables converted to human-readable format: Metadata and chapter metadata as key-value lists; Shared NPCs and Shared Locations as one block per entry; Enemy Stat Blocks as one block per enemy; story elements as bullet lists with Trigger/GM/NPCs/Location; Outcome Summary and XP Guidance as bullet lists.  
- **Changelog (1.3):** Added §6 Enemy Stat Blocks: Evasion, HP, melee/ranged attack, and notes for orc bandits, zombies, skeletons, elven rangers; chapter NPC sections reference enemy ids; section numbers renumbered (Ch1–Ch5 = §7–§11, Outcome §12, XP §13).  
- **Changelog (1.2):** Full evaluation recommendations: NPC physical/personality detail for all Shared NPCs; Hollowbridge sub-locations (loc-temple, loc-forge, loc-alchemist, loc-herbalist); optional mandrake impure variant (ev4-mandrake-impure); chapter locations updated to use sub-location IDs; connections use location IDs consistently.  
- **Changelog (1.1):** Evaluation applied: Sera’s location, travel to Hollowbridge, lizardman source, return with &lt;3 ingredients, counter-at-0 clarification, chapter order note, Northreach noble (Lord Cade), prologue travel default, skip-Evaine note, non-boss 0 HP note, XP guidance table, optional Sera deterioration. See `campaigns/touch-of-the-necromancer-evaluation.md`.  
- **Source:** Design from `samples/campaign-curse.md`; structure from `local/steering/06-campaign-management.md`; rules from `rulesets/virtualGM-custom-ruleset.md`.
