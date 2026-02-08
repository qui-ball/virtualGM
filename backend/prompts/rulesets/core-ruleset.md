# Core Ruleset

Complete definition of the custom simple ruleset for the Virtual GM application. This document consolidates all rules from the design interview and the class ability options.

---

## 1. Core Mechanics

### 1.1 Dice System

- **Primary die:** d20 for attacks, ability checks, and initiative.
- **No proficiency:** There is no proficiency bonus; modifiers come from stats and class abilities only.
- **Advantage / Disadvantage:** Roll 2d20, take the higher (advantage) or lower (disadvantage). If both apply, they cancel to a normal roll.
- **Critical hits:** On a natural 20 on an attack roll, the attack hits and damage is: roll damage dice normally + one set of damage dice at maximum value, then add modifiers once.

### 1.2 Stats and Modifiers

**Four stats:**

| Stat      | Covers                                                                 |
|-----------|------------------------------------------------------------------------|
| **Might** | Physical power, endurance                                             |
| **Finesse** | Coordination, dexterity, stealth                                    |
| **Wit**   | Perception, smarts, investigation, planning                           |
| **Presence** | Charisma, charm, personality, leadership                           |

- **Modifier = value:** The stat value is the modifier (e.g. +2 means modifier +2). No separate “score” and “modifier.”
- **Starting modifiers:** Every character starts with exactly **+2, +1, 0, -1**. The player assigns these to the four stats as they wish.

### 1.3 Classes and Primary/Secondary Stats

| Class   | Primary   | Secondary        |
|---------|-----------|------------------|
| Warrior | Might     | Finesse          |
| Mage    | Wit       | Presence or Finesse |
| Ranger  | Finesse   | Wit or Presence  |
| Bard    | Presence  | Wit              |

---

## 2. Hit Points and Evasion

### 2.1 Hit Points

- **Starting HP (level 1):** 10 + Might modifier.
- **Hit dice by class:** Warrior d10, Ranger d8, Bard d8, Mage d6.
- **HP per level-up (when HP is chosen):** Player chooses one:
  - **Fixed:** (hit die ÷ 2) + Might modifier.
  - **Roll:** hit die + Might modifier.
- HP scaling is tied to Might and hit die; no separate “proficiency” for HP.

### 2.2 Evasion (AC Alternative)

- **Starting Evasion (level 1):** 10 + Finesse modifier.
- **Per level-up (when Evasion is chosen):** +1 Evasion.
- **Armor:** Adds to Evasion (see Armor, below). No separate “AC”; armor bonus is Evasion bonus.
- Evasion is used as the target number to hit the character (attack roll ≥ Evasion to hit).

---

## 3. Combat

### 3.1 Attack Rolls

- **Formula:** d20 + stat modifier (from weapon or spell) + ability modifier (from class level-up choices).
- Weapons and spells specify which stat modifier to use. There is no global “proficiency” bonus.

### 3.2 Damage

- **Weapons:** Base weapon damage + stat modifier (weapon indicates which stat).
- **Spells:** Per spell description; spell indicates which stat and how damage is calculated.
- **Critical hit (natural 20):** Roll damage dice normally, add one set of damage dice at maximum value, then add modifiers once. No extra modifier stacking.

### 3.3 Action Economy

- **One action per turn.** Movement is free and does not cost an action.
- **No bonus actions.** No reactions.
- **Movement:** Narrative-based; distance and positioning are determined by the GM.

### 3.4 Initiative

- **Formula:** d20 + Finesse modifier. Turn order is set at the start of combat and used for the encounter.

---

## 4. Armor

- Armor **adds to Evasion** (e.g. +1, +2, +3). D&D-style AC bonuses map directly to Evasion (e.g. studded leather +1 AC → +1 Evasion).
- **Restrictions:**
  - **Mage:** Light armor only (no medium or heavy).
  - **Ranger, Bard:** Light and medium (no heavy).
  - **Warrior:** Light, medium, and heavy.
- Exact armor list and numeric bonuses to be defined (e.g. light +1, medium +2, heavy +3).

---

## 5. Skills and Ability Checks

- **No skill list.** The Virtual GM decides which stat applies (Might, Finesse, Wit, or Presence) based on the character’s described action.
- **Formula:** d20 + that stat’s modifier. Class abilities can add further bonuses to specific types of checks (e.g. +2 lockpick, +2 persuasion).

---

## 6. Magic

### 6.1 Mana Pool

- **Spellcasting resource:** Mana only (no spell slots).
- **Mana costs by tier:** Minor 1, Major 2, Mythic 3.
- **Mana per level-up:**
  - **Mage:** 4 + level + Wit modifier.
  - **Bard:** 3 + level + Presence modifier.
- **Starting mana (level 1):** Same formulas at level 1 (Mage: 4 + 1 + Wit = 5 + Wit; Bard: 3 + 1 + Presence = 4 + Presence).

### 6.2 Spell Tiers and Access

- **Tiers:** Minor (1), Major (2), Mythic (3).
- **Mage:** Tier 2 at level 3+; Tier 3 at level 6+.
- **Bard:** Tier 2 at level 4+; Tier 3 at level 8+.
- **Level 1:** Only Tier 1 (minor) spells available for both classes.

### 6.3 Starting Spells (Character Creation)

- **Mage:** 4 minor spells at creation (player choice from Mage spell list).
- **Bard:** 3 minor spells at creation (player choice from Bard spell list).

### 6.4 Casting and Damage

- **Casting roll:** d20 + spell’s stat modifier + spellcasting ability modifier (from class) vs target’s Evasion + target’s stat modifier (as defined by spell or effect).
- **Damage:** Defined per spell (which stat, dice, modifiers).
- **No components:** Spells are simply cast; no verbal/somatic/material tracking.

### 6.5 Spell Lists

- Separate spell lists per class (Mage spells ≠ Bard spells). New spells are gained via level-up choices from the class list.
- **See [spell-list.md](spell-list.md) for complete Mage and Bard spell lists.**

---

## 7. Saving Throws

- **Formula:** 10 + relevant stat modifier.
- **Which stat:** Determined by the effect (spell text, trap, or environment). Spells indicate the stat; traps are often Finesse; environment depends.
- **No reactions:** Characters do not use reactions to avoid attacks or effects; defense is passive or via saves as above.

---

## 8. Rest and Healing

### 8.1 Short Rest

- **HP restored:** Class hit die + Might modifier.
- **Mana restored:** d4 + Wit modifier.
- **Time counter (campaign):** Short rest decreases the chapter time counter by 1 (see Campaign Time Counter).

### 8.2 Long Rest

- **HP:** Restored to maximum.
- **Mana:** Restored to maximum.
- **Time counter:** Long rest decreases the chapter time counter by 5.

### 8.3 Campaign Time Counter

- Chapters can define a time counter (e.g. 50) that must not reach 0 before the chapter is completed.
- Short rest: -1; long rest: -5.
- Other events in the chapter can also reduce the counter as specified.

---

## 9. Death and Dying

### 9.1 Boss Battles

- Boss battles are designated by the campaign (never dynamic).
- When character HP reaches 0 in a boss battle, the player chooses:
  - **Blaze of Glory:** Take one action; all attacks from that action are automatic critical hits (roll damage normally, no attack roll). The character then dies. If the boss also dies, the story continues with that character’s death (ending).
  - **Risk It All:** Roll d20. On a natural 20, the character survives with 5 HP and the battle continues. Otherwise, death as normal.
- **On death (not Blaze of Glory):**
  - **Retry:** System restores character state to the start of the boss battle; player can retry the battle from the beginning (only for boss battles; state must be saved at battle start).
  - **End campaign:** Player may choose to end the campaign instead.

### 9.2 Non-Boss Battles

- When HP reaches 0 in a non-boss encounter: character does not die. They recover with **full HP and full mana**, but **loot is stolen** (amount to be defined later).

---

## 10. Experience and Leveling

### 10.1 XP and When Level-Up Happens

- **XP sources:** Battles, completing tasks/quests, succeeding at skills (e.g. lockpick). The GM assigns XP following guidelines.
- **Level-up:** Only outside battle. When the character’s total XP reaches the next level’s threshold, they level up **automatically on the spot** and receive their level-up choices immediately.
- **Max level:** 10.

### 10.2 XP Thresholds (Gentle Curve)

| Level | Total XP Required |
|-------|-------------------|
| 2     | 100               |
| 3     | 250               |
| 4     | 500               |
| 5     | 1,000             |
| 6     | 2,000             |
| 7     | 4,000             |
| 8     | 7,000             |
| 9     | 11,000            |
| 10    | 16,000            |

### 10.3 Level-Up Choices (Every Level 2–10)

Each level-up, the player chooses **one** of:

1. **HP** — Fixed (hit die ÷ 2 + Might) or Roll (hit die + Might).
2. **Evasion** — +1 Evasion.
3. **Class ability** — One option from the class tables below (subject to level and tier restrictions).

At levels 3, 5, 7, and 10, additional (often stronger) class options become available.

---

## 11. Equipment and Inventory

- **Weapons and equipment:** Follow D&D for the most part; D&D AC from armor becomes Evasion (see Armor).
- **Starting gold:** 10 gp.
- **Inventory:** Slot-based; no weight limits. Characters can carry multiple weapons and switch between them.
- **POC:** Pre-built characters with fixed equipment. **Later (character creation):** Players choose starting weapons and equipment; armor is part of starting equipment (details TBD).

---

## 12. Conditions and Advantage/Disadvantage

### 12.1 Conditions (Simple)

| Condition   | Effect | Removal |
|------------|--------|---------|
| **Poisoned** | Disadvantage on all rolls | Rest or healing spell |
| **Stunned** | Cannot take actions | After 1 turn or healing spell |
| **Frightened** | Disadvantage on attack rolls | Rest or spell |
| **Restrained** | Disadvantage on attack rolls and Evasion | Escape (Might or Finesse check) or spell |
| **Prone** | Disadvantage on attack rolls; attackers have advantage against you | Stand up (no action cost) |

### 12.2 Advantage and Disadvantage

- **Advantage:** Roll 2d20, take higher.
- **Disadvantage:** Roll 2d20, take lower.
- **Both:** Cancel to single d20.
- GM can grant advantage or disadvantage for narrative reasons (e.g. surprise, high ground).

---

## 13. Class Abilities

At level 1, each character chooses **one** starting ability for their class. At levels 2–10, when the player chooses "class ability" for level-up, they pick one option from their class tables (subject to level and tier restrictions).

- **See [class-abilities.md](class-abilities.md) for complete class ability tables (Warrior, Mage, Ranger, Bard).**

---

## Document Version

- **Version:** 1.1  
- **Last Updated:** 2025-01-27  
- **Changelog:** Consolidated full ruleset from interview; gentle XP curve; starting mana and spells (Mage 4 minor, Bard 3 minor, Tier 1 only at level 1).  
- **Next Review:** When class spell lists or equipment are defined.
