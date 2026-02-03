# Custom Simple Ruleset

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

#### Mage Spell List

**Tier 1 (Minor) — Mana Cost: 1**

| Spell Name | Description |
|------------|-------------|
| **Magic Missile** | Make a spell attack roll (d20 + Wit modifier + spellcasting ability modifier) vs target's Evasion. On hit, deal 1d4 + Wit modifier magic damage. |
| **Fire Bolt** | Make a spell attack roll vs target's Evasion. On hit, deal 1d6 + Wit modifier fire damage. |
| **Frost Ray** | Make a spell attack roll vs target's Evasion. On hit, deal 1d6 + Wit modifier cold damage. Target must make a Finesse save (10 + Finesse modifier) or have disadvantage on their next attack roll. |
| **Shield** | As your action, gain +2 Evasion until the start of your next turn. |
| **Detect Magic** | You sense the presence of magic within narrative "close" range. You learn the general type of magic (arcane, divine, nature, etc.) but not specific spells or effects. |
| **Mage Hand** | Create an invisible hand that can manipulate objects up to 10 pounds within narrative "close" range. The hand can open doors, pull levers, or move small objects. Lasts 1 minute or until dismissed. |
| **Light** | Touch an object; it sheds bright light in a narrative "close" radius for 1 hour. You can dismiss it as an action. |
| **Minor Illusion** | Create a sound or image within narrative "close" range. The illusion is obviously fake on close inspection (within 5 feet). Lasts 1 minute or until dismissed. |
| **Arcane Mark** | Place an invisible magical mark on a surface or object within narrative "close" range. You can sense the mark's direction and distance (within 1 mile) for 24 hours. |
| **Prestidigitation** | Perform minor magical tricks: clean or soil objects, warm or chill non-living material, create harmless sensory effects (sparks, sounds, smells). Effects last 1 hour. |
| **Ray of Frost** | Make a spell attack roll vs target's Evasion. On hit, deal 1d4 + Wit modifier cold damage and reduce the target's movement speed by half until the end of their next turn. |
| **Shocking Grasp** | Make a spell attack roll vs target's Evasion. On hit, deal 1d6 + Wit modifier lightning damage. If the target is wearing metal armor, you have advantage on the attack roll. |

**Tier 2 (Major) — Mana Cost: 2**

| Spell Name | Description |
|------------|-------------|
| **Fireball** | Make a spell attack roll vs target's Evasion. On hit, deal 2d6 + Wit modifier fire damage. All creatures within narrative "close" range of the target must make a Finesse save (10 + Finesse modifier) or take half damage. |
| **Ice Storm** | Target an area within narrative "close" range. All creatures in that area must make a Finesse save (10 + Finesse modifier) or take 2d4 + Wit modifier cold damage and be Restrained until they escape (Might or Finesse check, DC = 10 + your Wit modifier). |
| **Lightning Bolt** | Make a spell attack roll vs target's Evasion. On hit, deal 2d6 + Wit modifier lightning damage. The bolt continues in a line; each creature in the path must make a Finesse save (10 + Finesse modifier) or take half damage. |
| **Magic Shield** | Gain +3 Evasion until the start of your next turn. When you would take damage, you may spend 1 mana (as a reaction) to reduce that damage by 1d4 + Wit modifier. |
| **Invisibility** | Touch a creature (including yourself). They become invisible for 10 minutes or until they attack or cast a spell. The invisibility ends early if the target takes damage. |
| **Teleport** | You instantly move to any location you can see within narrative "close" range. You can bring one willing creature of your size or smaller with you. |
| **Counterspell** | When a creature within narrative "close" range casts a spell, you may spend 2 mana to attempt to counter it. Make a spell attack roll (d20 + Wit modifier + spellcasting ability modifier) vs 10 + the caster's Wit modifier. On success, the spell is negated. |
| **Charm Person** | Target one creature within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, they regard you as a friendly acquaintance for 1 hour. They know they were charmed when the effect ends. |
| **Sleep** | Target creatures within narrative "close" range with total HP equal to or less than 2d8 + your Wit modifier. They fall unconscious for 1 minute or until they take damage or are shaken awake. |
| **Mage Armor** | Touch a willing creature. They gain +2 Evasion for 8 hours. This does not stack with armor bonuses. |
| **Identify** | Touch an object. You learn its magical properties, if any, and how to use them. Takes 1 minute to cast. |
| **Detect Thoughts** | For 1 minute, you can read the surface thoughts of creatures within narrative "close" range. A creature can make a Wit save (10 + Wit modifier) to resist. On success, you learn nothing. |

**Tier 3 (Mythic) — Mana Cost: 3**

| Spell Name | Description |
|------------|-------------|
| **Meteor Swarm** | Make a spell attack roll vs target's Evasion. On hit, deal 4d6 + Wit modifier fire damage. All creatures within narrative "close" range of the target must make a Finesse save (10 + Finesse modifier) or take half damage. |
| **Disintegrate** | Make a spell attack roll vs target's Evasion. On hit, deal 3d8 + Wit modifier force damage. If this reduces the target to 0 HP, they are reduced to dust. Non-magical objects are destroyed on hit. |
| **Time Stop** | You briefly stop time. You can take two actions in a row, and no other creature can act during this time. After your second action, time resumes normally. |
| **Wish** | You can attempt to replicate any Tier 1 or Tier 2 spell you know, or create a narrative effect of similar power (GM discretion). After casting, you cannot cast spells for 1 minute. |
| **Teleport Circle** | Create a permanent teleportation circle at your location. You can teleport to any circle you've created by spending 3 mana and 1 minute of concentration. You can maintain up to 3 circles at once. |
| **Mass Invisibility** | Up to 4 creatures within narrative "close" range become invisible for 1 hour or until they attack or cast a spell. |
| **Dominate Person** | Target one creature within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, you control their actions for 1 minute. They can repeat the save at the end of each of their turns. |
| **Chain Lightning** | Make a spell attack roll vs target's Evasion. On hit, deal 3d6 + Wit modifier lightning damage. The lightning then arcs to up to 3 additional targets within narrative "close" range of the first, dealing 2d6 + Wit modifier lightning damage to each (no attack roll needed). |
| **Force Cage** | Create an invisible prison of force around a creature within narrative "close" range. The creature must make a Might save (10 + Might modifier) to escape. The cage lasts 1 hour or until you dismiss it. |
| **Scrying** | You can see and hear a creature you know within 1 mile for 10 minutes. The target can make a Wit save (10 + Wit modifier) to resist. On success, the spell fails. |

#### Bard Spell List

**Tier 1 (Minor) — Mana Cost: 1**

| Spell Name | Description |
|------------|-------------|
| **Healing Word** | Touch a creature. They restore 1d4 + Presence modifier HP. |
| **Vicious Mockery** | Target one creature within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, they take 1d4 psychic damage and have disadvantage on their next attack roll. |
| **Charm** | Target one creature within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, they regard you as friendly for 10 minutes. They know they were charmed when the effect ends. |
| **Inspire** | Choose an ally within narrative "close" range. Their next attack roll or ability check has advantage. |
| **Song of Rest** | You perform for 1 minute. All allies who can hear you restore 1 HP. This can be done during a short rest. |
| **Detect Thoughts** | For 1 minute, you can sense the surface emotions of creatures within narrative "close" range. You learn if they are hostile, friendly, fearful, etc., but not specific thoughts. |
| **Disguise Self** | You alter your appearance to look like another person of similar size. The illusion lasts 1 hour or until you dismiss it. Close inspection (within 5 feet) reveals it's an illusion. |
| **Friends** | For 1 minute, you have advantage on Presence-based checks against one creature you can see. When the spell ends, they realize you used magic on them and become hostile. |
| **Message** | You whisper a message to a creature within narrative "close" range. Only that creature can hear it, and they can reply in the same way. The spell lasts 1 minute. |
| **Minor Illusion** | Create a sound or image within narrative "close" range. The illusion is obviously fake on close inspection (within 5 feet). Lasts 1 minute or until dismissed. |
| **Prestidigitation** | Perform minor magical tricks: clean or soil objects, warm or chill non-living material, create harmless sensory effects (sparks, sounds, smells). Effects last 1 hour. |
| **Guidance** | Touch a creature. Their next ability check gains a +1d4 bonus. The spell ends when the check is made or after 1 minute. |

**Tier 2 (Major) — Mana Cost: 2**

| Spell Name | Description |
|------------|-------------|
| **Cure Wounds** | Touch a creature. They restore 2d4 + Presence modifier HP. |
| **Mass Healing Word** | Up to 3 creatures within narrative "close" range each restore 1d4 + Presence modifier HP. |
| **Suggestion** | Target one creature within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, they follow a reasonable suggestion you give them for 1 hour. The suggestion must be worded to sound reasonable. |
| **Invisibility** | Touch a creature (including yourself). They become invisible for 10 minutes or until they attack or cast a spell. The invisibility ends early if the target takes damage. |
| **Hold Person** | Target one humanoid within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, they are Stunned for 1 minute. They can repeat the save at the end of each of their turns. |
| **Calm Emotions** | All creatures within narrative "close" range must make a Presence save (10 + Presence modifier). On failure, they cannot attack for 1 minute or until they take damage. Hostile creatures have advantage on this save. |
| **Enhance Ability** | Touch a creature. Choose one stat (Might, Finesse, Wit, Presence). For 1 hour, they have advantage on checks using that stat. |
| **Silence** | Create a sphere of silence with a radius of narrative "close" range centered on a point you choose. No sound can be created or pass through this area for 10 minutes. |
| **Zone of Truth** | Create a 10-foot radius zone. Creatures within it must make a Presence save (10 + Presence modifier) or be unable to speak deliberate lies for 10 minutes. They know they are in a zone of truth. |
| **Shatter** | Make a spell attack roll vs target's Evasion. On hit, deal 2d6 + Presence modifier thunder damage. Non-magical objects in the area take double damage. |
| **Heat Metal** | Target a metal object within narrative "close" range. The object becomes red-hot. A creature holding or wearing it must make a Finesse save (10 + Finesse modifier) or take 1d4 fire damage and drop the object. The effect lasts 1 minute. |
| **Heroism** | Touch a creature. For 1 minute, they are immune to being Frightened and gain temporary HP equal to your Presence modifier at the start of each of their turns. |

**Tier 3 (Mythic) — Mana Cost: 3**

| Spell Name | Description |
|------------|-------------|
| **Mass Cure Wounds** | Up to 5 creatures within narrative "close" range each restore 3d4 + Presence modifier HP. |
| **Power Word: Heal** | Touch a creature. They restore HP equal to their maximum HP. This also ends all conditions affecting them. |
| **Dominate Person** | Target one humanoid within narrative "close" range. They must make a Presence save (10 + Presence modifier). On failure, you control their actions for 1 minute. They can repeat the save at the end of each of their turns. |
| **Mass Suggestion** | Target up to 5 creatures within narrative "close" range. Each must make a Presence save (10 + Presence modifier). On failure, they follow a reasonable suggestion you give them for 24 hours. |
| **Resurrection** | Touch a creature that has been dead for no longer than 10 days. They return to life with 1 HP. This spell cannot restore missing body parts. |
| **Foresight** | Touch a creature. For 8 hours, they have advantage on all attack rolls, ability checks, and saves, and enemies have disadvantage on attack rolls against them. |
| **Power Word: Stun** | Target one creature within narrative "close" range with 50 HP or fewer. They are Stunned for 1 minute. They can make a Presence save (10 + Presence modifier) at the end of each of their turns to end the effect early. |
| **Mass Charm** | Target up to 5 creatures within narrative "close" range. Each must make a Presence save (10 + Presence modifier). On failure, they regard you as friendly for 1 hour. They know they were charmed when the effect ends. |
| **Wish** | You can attempt to replicate any Tier 1 or Tier 2 spell you know, or create a narrative effect of similar power (GM discretion). After casting, you cannot cast spells for 1 minute. |
| **Legendary Performance** | You perform for 1 minute. All allies who can hear you restore 2d4 + Presence modifier HP and gain advantage on their next attack roll. Enemies who can hear you must make a Presence save (10 + Presence modifier) or be Frightened for 1 minute. |

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

At level 1, each character chooses **one** starting ability for their class. At levels 2–10, when the player chooses “class ability” for level-up, they pick one option from their class tables below (subject to level and tier).

---

### Warrior

**Primary stat:** Might | **Secondary stat:** Finesse  
**Hit die:** d10  
**Armor:** Light, Medium, Heavy

#### Starting Abilities (Level 1 — choose one)

| ID | Name | Description |
|----|------|-------------|
| WAR-S1 | **Weapon Focus** | +1 to all melee attack rolls. |
| WAR-S2 | **Tough** | +2 maximum HP at level 1 (does not affect future HP gains). |
| WAR-S3 | **Armored Defense** | +1 Evasion when wearing medium or heavy armor. |
| WAR-S4 | **Power Strike** | Once per turn, when you hit with a melee weapon, you can add +2 to the damage roll. |

#### Level-Up Abilities (choose one when selecting "class ability" at level 2–10)

**Available at any level (2–10):**

| ID | Name | Description |
|----|------|-------------|
| WAR-L1 | **Melee Prowess** | +2 to all melee attack rolls. |
| WAR-L2 | **Brutal Strike** | Add one additional damage die when using a sword or axe (roll one extra die of the same type). |
| WAR-L3 | **Shield Training** | +1 Evasion when wielding a shield (if shields are in the equipment list). |
| WAR-L4 | **Second Wind** | Once per short rest: restore HP equal to your hit die + Might modifier. |
| WAR-L5 | **Heavy Hitter** | +2 to melee damage rolls. |
| WAR-L6 | **Cleave** | When you reduce an enemy to 0 HP with a melee attack, you may make one additional melee attack against another enemy within reach (once per turn). |

**Additional options at level 3+:**

| ID | Name | Description |
|----|------|-------------|
| WAR-L7 | **Critical Focus** | When you score a critical hit, add your Might modifier to the damage a second time. |
| WAR-L8 | **Indomitable** | Advantage on saves against being Frightened or Stunned. |

**Additional options at level 5+:**

| ID | Name | Description |
|----|------|-------------|
| WAR-L9 | **Extra Attack** | Once per turn when you take the Attack action, you may make one additional melee attack. |
| WAR-L10 | **Thick Skin** | Reduce incoming damage by 1 (minimum 1 damage taken). |

**Additional options at level 7+:**

| ID | Name | Description |
|----|------|-------------|
| WAR-L11 | **Devastating Blow** | Once per long rest: one melee attack automatically hits and deals maximum damage (no roll). |
| WAR-L12 | **Battle Cry** | Once per short rest: allies within narrative "close" range have advantage on their next attack roll before the end of your next turn. |

**Additional options at level 10:**

| ID | Name | Description |
|----|------|-------------|
| WAR-L13 | **Champion** | Your critical hit range expands: natural 19 or 20 counts as a critical hit. |
| WAR-L14 | **Unstoppable** | When you would drop to 0 HP, you may instead drop to 1 HP (once per long rest). |

---

### Mage

**Primary stat:** Wit | **Secondary stat:** Presence or Finesse  
**Hit die:** d6  
**Armor:** Light only  
**Mana per level-up:** 4 + level + Wit modifier  
**Starting mana (level 1):** 5 + Wit modifier  
**Starting spells:** 4 minor spells at creation (player choice)  
**Spell tiers:** Tier 2 at level 3+, Tier 3 at level 6+; level 1 = Tier 1 only

#### Starting Abilities (Level 1 — choose one)

| ID | Name | Description |
|----|------|-------------|
| MAG-S1 | **Arcane Affinity** | +1 to spell attack rolls and spell save DC (when applicable). |
| MAG-S2 | **Expanded Mana** | Your mana pool is increased by Wit modifier at level 1 (stacks with normal mana gains). |
| MAG-S3 | **Cantrip Mastery** | Choose one minor (Tier 1) spell; you can cast it without spending mana once per short rest. |
| MAG-S4 | **Scholar** | Advantage on Wit-based checks to recall lore, identify magic, or decipher codes. |

#### Level-Up Abilities (choose one when selecting "class ability" at level 2–10)

**Available at any level (2–10):**

| ID | Name | Description |
|----|------|-------------|
| MAG-L1 | **Learn Spell** | Add one new spell of an allowed tier to your spell list. |
| MAG-L2 | **Mana Reservoir** | +4 maximum mana. |
| MAG-L3 | **Spellcasting Focus** | +2 to spell attack rolls. |
| MAG-L4 | **Efficient Casting** | Once per long rest: cast a minor spell without spending mana. |
| MAG-L5 | **Hardened Will** | Advantage on saves against effects that target Wit or Presence. |
| MAG-L6 | **Arcane Insight** | +2 to spell damage rolls. |

**Additional options at level 3+:**

| ID | Name | Description |
|----|------|-------------|
| MAG-L7 | **Learn Tier 2 Spell** | Add one Tier 2 spell to your spell list. |
| MAG-L8 | **Mana Shield** | Once per short rest: when you would take damage, spend 2 mana to reduce that damage by 1d6 + Wit modifier. |

**Additional options at level 5+:**

| ID | Name | Description |
|----|------|-------------|
| MAG-L9 | **Empowered Spell** | Once per long rest: when you cast a spell that deals damage, roll one extra damage die. |
| MAG-L10 | **Ritual Caster** | You can cast one chosen minor spell as a ritual (takes narrative time, no mana cost). |

**Additional options at level 6+:**

| ID | Name | Description |
|----|------|-------------|
| MAG-L11 | **Learn Tier 3 Spell** | Add one Tier 3 spell to your spell list. |
| MAG-L12 | **Spell Penetration** | +2 to spell attack rolls against targets with Evasion 15 or higher. |

**Additional options at level 7+:**

| ID | Name | Description |
|----|------|-------------|
| MAG-L13 | **Overchannel** | Once per long rest: cast a spell using 1 extra mana to add your Wit modifier to the damage. |
| MAG-L14 | **Arcane Recovery** | Once per short rest: recover mana equal to 1d4 + half your level (rounded down). |

**Additional options at level 10:**

| ID | Name | Description |
|----|------|-------------|
| MAG-L15 | **Spell Mastery** | Choose one spell you know; you can cast it once per long rest without spending mana. |
| MAG-L16 | **Archmage** | When you cast a spell, you may spend 1 additional mana to impose disadvantage on the target's save (if the spell allows a save). |

---

### Ranger

**Primary stat:** Finesse | **Secondary stat:** Wit or Presence  
**Hit die:** d8  
**Armor:** Light, Medium (no Heavy)

#### Starting Abilities (Level 1 — choose one)

| ID | Name | Description |
|----|------|-------------|
| RAN-S1 | **Marksman** | +1 to ranged attack rolls. |
| RAN-S2 | **Keen Senses** | Advantage on Wit-based checks for perception, tracking, or spotting hidden creatures. |
| RAN-S3 | **Lightfoot** | Advantage on Finesse-based checks to move silently or hide. |
| RAN-S4 | **Favored Terrain** | Choose a terrain type; you have advantage on Wit or Finesse checks related to travel, foraging, or navigation in that terrain. |

#### Level-Up Abilities (choose one when selecting "class ability" at level 2–10)

**Available at any level (2–10):**

| ID | Name | Description |
|----|------|-------------|
| RAN-L1 | **Ranged Prowess** | +2 to ranged attack rolls. |
| RAN-L2 | **Precise Shot** | +2 to ranged damage rolls. |
| RAN-L3 | **Hunter's Eye** | Advantage on one attack roll per short rest (declare before rolling). |
| RAN-L4 | **Steady Aim** | When you have not moved this turn, +1 to ranged attack rolls. |
| RAN-L5 | **Quick Step** | When you take the Attack action with a ranged weapon, you may move before or after the attack without provoking (narrative: staying mobile). |
| RAN-L6 | **Survivalist** | Advantage on checks to find food, water, or shelter; short rest restores +1d4 HP for you. |

**Additional options at level 3+:**

| ID | Name | Description |
|----|------|-------------|
| RAN-L7 | **Multi-Attack (Ranged)** | Once per turn when you take the Attack action with a ranged weapon, you may make one additional ranged attack (at disadvantage). |
| RAN-L8 | **Trapper** | You can set simple traps; when a creature triggers one, it must make a save (10 + your Finesse modifier) or take 1d6 damage and be Restrained until it escapes (Might or Finesse check, same DC). |

**Additional options at level 5+:**

| ID | Name | Description |
|----|------|-------------|
| RAN-L9 | **Critical Hunter** | On a critical hit with a ranged weapon, add one extra damage die. |
| RAN-L10 | **Nature's Veil** | Advantage on checks to hide in natural terrain. |

**Additional options at level 7+:**

| ID | Name | Description |
|----|------|-------------|
| RAN-L11 | **Deadly Precision** | Once per long rest: one ranged attack automatically hits and scores a critical hit. |
| RAN-L12 | **Skirmisher** | Once per short rest: when an enemy attacks you and misses, you may immediately use your movement to move away (no action required). |

**Additional options at level 10:**

| ID | Name | Description |
|----|------|-------------|
| RAN-L13 | **Master Archer** | Your critical hit range with ranged weapons expands: natural 19 or 20 counts as a critical hit. |
| RAN-L14 | **Vanishing Act** | Once per long rest: when you take the Hide action, you have advantage and enemies have disadvantage to find you until you attack or leave cover. |

---

### Bard

**Primary stat:** Presence | **Secondary stat:** Wit  
**Hit die:** d8  
**Armor:** Light, Medium (no Heavy)  
**Mana per level-up:** 3 + level + Presence modifier  
**Starting mana (level 1):** 4 + Presence modifier  
**Starting spells:** 3 minor spells at creation (player choice)  
**Spell tiers:** Tier 2 at level 4+, Tier 3 at level 8+; level 1 = Tier 1 only

#### Starting Abilities (Level 1 — choose one)

| ID | Name | Description |
|----|------|-------------|
| BRD-S1 | **Silver Tongue** | +2 to Presence-based checks for persuasion, deception, or performance. |
| BRD-S2 | **Inspiring Presence** | Once per short rest: choose an ally; their next roll has advantage. |
| BRD-S3 | **Jack of All Trades** | +1 to any one stat's checks (choose one: Might, Finesse, Wit, Presence) for skill checks only. |
| BRD-S4 | **Musical Focus** | When you use an instrument or perform as part of casting a spell, +1 to that spell's attack roll or save DC. |

#### Level-Up Abilities (choose one when selecting "class ability" at level 2–10)

**Available at any level (2–10):**

| ID | Name | Description |
|----|------|-------------|
| BRD-L1 | **Learn Spell** | Add one new spell of an allowed tier to your spell list. |
| BRD-L2 | **Mana Reservoir** | +3 maximum mana. |
| BRD-L3 | **Persuasion** | +2 to persuasion rolls. |
| BRD-L4 | **Lockpick** | +2 to lockpick and trap-disarming rolls (Finesse or Wit, as determined by GM). |
| BRD-L5 | **Deception** | +2 to deception rolls. |
| BRD-L6 | **Healing Melody** | When you cast a spell that restores HP, add your Presence modifier to the amount restored. |
| BRD-L7 | **Counter Charm** | Advantage on saves against being Charmed or Frightened. |
| BRD-L8 | **Shield Ally** | Once per short rest: as your action, choose an ally within narrative "close" range; they gain temporary HP equal to 1d6 + your Presence modifier (lasts until used or until the end of that ally's next turn). |

**Additional options at level 4+:**

| ID | Name | Description |
|----|------|-------------|
| BRD-L9 | **Learn Tier 2 Spell** | Add one Tier 2 spell to your spell list. |
| BRD-L10 | **Inspire Courage** | Once per short rest: all allies within narrative "close" range add +1 to their next attack roll or save before the end of your next turn. |

**Additional options at level 5+:**

| ID | Name | Description |
|----|------|-------------|
| BRD-L11 | **Fast Talk** | Advantage on Presence-based checks to negotiate, distract, or avoid conflict. |
| BRD-L12 | **Song of Rest** | During a short rest, you can perform; each ally who rests with you restores an additional 1d4 HP. |

**Additional options at level 8+:**

| ID | Name | Description |
|----|------|-------------|
| BRD-L13 | **Learn Tier 3 Spell** | Add one Tier 3 spell to your spell list. |
| BRD-L14 | **Master Performer** | When you use performance or an instrument as part of a spell, add +2 to the spell's attack roll or save DC. |

**Additional options at level 10:**

| ID | Name | Description |
|----|------|-------------|
| BRD-L15 | **Legendary Presence** | Once per long rest: all allies within narrative "close" range have advantage on all rolls until the end of your next turn. |
| BRD-L16 | **Irresistible** | Advantage on all Presence-based checks; when you fail a Presence check, you may reroll once per long rest. |

---

## Document Version

- **Version:** 1.1  
- **Last Updated:** 2025-01-27  
- **Changelog:** Consolidated full ruleset from interview; gentle XP curve; starting mana and spells (Mage 4 minor, Bard 3 minor, Tier 1 only at level 1).  
- **Next Review:** When class spell lists or equipment are defined.
