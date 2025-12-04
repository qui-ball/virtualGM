# Suggested Tools for AI GM

Based on review of the Daggerheart rules and current implementation in `main.py`, here are additional tools the AI GM might need access to:

## ✅ Already Implemented

**Existing Tools:**
- `roll_dice()` - Handles dice rolling, including Duality Dice with automatic Fear tracking when Fear > Hope
- `narrate()` - Player-facing communication
- `spend_fear()` - Fear token management with validation

**Current Game State:**
- `fear_pool` - GM's Fear tokens (auto-tracked in `roll_dice`)

---

## 📝 What the GM Currently Does (Via Narration & Notes)

Looking at your transcript, the GM is already handling many tasks through narration and internal notes:

**Currently Working Well:**
- ✅ **Damage calculation** - GM narrates threshold comparisons ("Compare to your thresholds: Minor 7, Major 14. Since 11 is greater than 7 but less than 14, you mark 2 HP")
- ✅ **HP tracking** - GM tracks in internal notes ("Marlowe now has 4 HP marked")
- ✅ **Adversary attacks** - GM uses `roll_dice(1, "d20")` and calculates manually ("19 + 1 = 20. That hits!")
- ✅ **Adversary state** - GM tracks in notes ("The strixwolf is wounded (1 HP left)")
- ✅ **Hope tracking** - GM mentions in notes ("Marlowe gained 1 Hope")

**Potential Issues with Current Approach:**
- ⚠️ State tracking relies on LLM memory (could drift over long sessions)
- ⚠️ No validation that HP totals are correct
- ⚠️ Manual calculations could have errors
- ⚠️ No structured way to query current state

---

## 🤔 Tools That Would Add Value (Sorted by Importance)

These would provide **structured state tracking** rather than relying on narration/notes. They're optional - your current approach works, but these would make it more robust:

---

## 🔴 HIGH PRIORITY - Core State Tracking

These prevent state drift and ensure accuracy over long sessions:

### 1. `track_pc_state()` / `update_pc_state()`
**Track player character resources in GameState:**
- **HP** (marked slots) - Critical for death moves
- **Stress** (marked slots) - Affects ability usage
- **Hope** (current count, max 6) - Player resource management
- **Conditions** (Vulnerable, Restrained, Hidden, etc.) - Affect combat mechanics
- **Armor Slots** (marked/unmarked) - Damage reduction

**Why critical:** 
- Prevents HP/Stress drift over long sessions
- Enables validation ("Marlowe has 4 HP marked, not 6")
- Allows state queries
- **Current:** GM tracks in notes, works but could drift

**Implementation priority:** ⭐⭐⭐⭐⭐

---

### 2. `apply_damage()`
**Automated damage calculation + state update:**
- Input: target (PC or adversary), damage amount, damage type (physical/magic)
- Apply resistances/immunities
- Compare to thresholds (Minor/Major/Severe) 
- Mark appropriate HP slots automatically
- Handle armor slot reduction
- Return: amount marked, if target falls, any special effects

**Why critical:**
- Ensures consistent threshold calculations
- Auto-updates state (no manual tracking)
- Handles complex cases (resistances, armor slots, overflow)
- **Current:** GM calculates manually in narration, verbose and error-prone

**Implementation priority:** ⭐⭐⭐⭐⭐

---

### 3. `track_adversary_state()` / `update_adversary_state()`
**Store adversary HP/defeated status in GameState:**
- **HP** (marked slots)
- **Stress** (marked slots)  
- **Conditions**
- **Difficulty** (for attack rolls)
- **Damage Thresholds** (Major, Severe)
- **Defeated status**

**Why critical:**
- Track multiple enemies reliably (Thistlefolk Ambusher, Thief, Skeletons, Wraith)
- Know when adversaries are defeated
- Prevents "is this enemy dead?" confusion
- **Current:** GM tracks in notes, works for small encounters but gets messy

**Implementation priority:** ⭐⭐⭐⭐

---

## 🟡 MEDIUM PRIORITY - Important Mechanics

These add structure to important game mechanics:

### 4. `create_countdown()` / `advance_countdown()` / `check_countdown()`
**Structured countdown tracking for timed events:**
- Ritual countdown (d6 starting at 4) - **Critical for Act Five**
- Long-term projects
- Environmental threats

**Why important:**
- Act Five ritual encounter requires countdown tracking
- Countdowns advance based on multiple triggers (defeats, hits, rolls)
- Easy to lose track in notes
- **Current:** GM could track in notes, but countdowns are mechanically important

**Implementation priority:** ⭐⭐⭐⭐

---

### 5. `apply_condition()` / `remove_condition()`
**Manage conditions that affect combat:**
- **Vulnerable** - All rolls against them have advantage
- **Restrained** - Can't move
- **Hidden/Cloaked** - Unseen, benefits vary
- **Untethered** (Forest Wraith) - Can't act until adversary defeated

**Why important:**
- Conditions significantly affect combat mechanics
- Vulnerable grants advantage (affects all rolls)
- Easy to forget in long encounters
- **Current:** GM handles via narration, but could be forgotten

**Implementation priority:** ⭐⭐⭐

---

### 6. `gain_hope()` / `spend_hope()`
**Track Hope resource for players:**
- Gain from action rolls (Success/Failure with Hope)
- Gain from rest moves (Prepare)
- Spend for abilities (Utilize Experience, Help Ally, Tag Team, Hope Features)

**Why important:**
- Hope is a key player resource (max 6)
- Players spend Hope for powerful abilities
- GM needs to know current Hope for narrative consistency
- **Current:** GM tracks in notes, works but could drift

**Implementation priority:** ⭐⭐⭐

---

## 🟢 LOW PRIORITY - Convenience Tools

These add convenience but aren't critical:

### 7. `adversary_attack()`
**Structured adversary attack tool:**
- Roll d20 + Attack Modifier
- Compare to target's Evasion (PCs) or Difficulty (adversaries)
- Roll damage on hit
- Apply damage via `apply_damage()`
- Handle critical hits (natural 20)

**Why nice-to-have:**
- Cleaner than manual `roll_dice(1, "d20")` + calculation
- Ensures consistent attack flow
- **Current:** GM uses `roll_dice()` + manual calc, works fine

**Implementation priority:** ⭐⭐

---

### 8. `apply_healing()` / `clear_hp()` / `clear_stress()`
**Handle healing and recovery:**
- Clear HP or Stress slots
- Handle rest mechanics (1d4+Tier for short rest, all for long rest)
- Potion usage
- Ability-based healing

**Why nice-to-have:**
- Rest mechanics are complex
- Ensures consistent healing calculations
- **Current:** GM handles via narration, works fine

**Implementation priority:** ⭐⭐

---

### 9. `initiate_rest()` / `rest_move()`
**Structured rest mechanics:**
- **Short Rest** (1 hour): Move cards, choose 2 moves, GM gains 1d4 Fear
- **Long Rest** (overnight): Move cards, choose 2 moves, GM gains 1d4+PCs Fear
- Enforce "3 short rests = must long rest" rule

**Why nice-to-have:**
- Rests have multiple steps and Fear generation
- Ensures all rest moves are handled
- **Current:** GM handles via narration, works fine

**Implementation priority:** ⭐⭐

---

### 10. `adversary_feature()`
**Activate adversary Fear Features:**
- Back Off (Thistlefolk Thief) - Spend Fear, attack all in Melee
- Group Attack (Ancient Skeleton) - Spend Fear, combine attacks
- Memory Delve (Forest Wraith) - Make Vulnerable
- Pass-Through (Forest Wraith) - Untether soul

**Why nice-to-have:**
- Many adversaries have special abilities
- Ensures consistent activation
- **Current:** GM handles via narration + `spend_fear()`, works fine

**Implementation priority:** ⭐⭐

---

## ⚪ VERY LOW PRIORITY - Edge Cases

These handle edge cases but aren't necessary:

### 11. `activate_environment_feature()`
**Use environment Fear Features:**
- Vengeance of the Vale - Spend Fear to summon Ancient Skeleton

**Why low priority:**
- Only one environment feature in campaign
- **Current:** GM handles via narration + `spend_fear()`, works fine

**Implementation priority:** ⭐

---

### 12. `trigger_death_move()`
**Handle when PC marks last HP:**
- Blaze of Glory - Final critical action, then death
- Avoid Death - Fall unconscious, roll for scar
- Risk It All - Roll Duality Dice, Hope > Fear = recover

**Why low priority:**
- Edge case (happens rarely)
- GM handles well via narration
- **Current:** GM narrates death move options, player chooses, works fine

**Implementation priority:** ⭐

---

### 13. `check_range()` / `move_character()`
**Range and positioning tracking:**
- Verify range for attacks/abilities (Melee, Very Close, Close, Far, Very Far)
- Line of sight and cover
- Track character positions

**Why low priority:**
- Daggerheart uses abstract ranges
- GM handles via narration effectively
- **Current:** GM describes positioning, works fine

**Implementation priority:** ⭐

---

### 14. `pass_spotlight()`
**Track whose turn it is:**
- PC spotlight, GM spotlight, Adversary spotlight

**Why low priority:**
- Spotlight is narrative, not mechanical
- GM handles via narration effectively
- **Current:** GM manages spotlight naturally, works fine

**Implementation priority:** ⭐

---

### 15. `track_npc()`
**Track important NPCs:**
- Whitefire Arcanist (Difficulty 11, narrative HP)
- Town NPCs (Fidget, Lausa, Halython)

**Why low priority:**
- NPCs are mostly narrative
- Arcanist HP is narrative (affects countdown, not tracked)
- **Current:** GM handles via narration, works fine

**Implementation priority:** ⭐

---

## 📊 Summary by Priority

### 🔴 Must-Have (Implement First)
1. **`track_pc_state()`** - Core state tracking (HP, Stress, Hope, Conditions)
2. **`apply_damage()`** - Automated damage calculation + state update
3. **`track_adversary_state()`** - Adversary HP/defeated tracking

### 🟡 Should-Have (Implement Next)
4. **`create_countdown()` / `advance_countdown()`** - Critical for Act Five ritual
5. **`apply_condition()` / `remove_condition()`** - Combat-affecting conditions
6. **`gain_hope()` / `spend_hope()`** - Hope resource tracking

### 🟢 Nice-to-Have (If Time Permits)
7. **`adversary_attack()`** - Structured adversary attacks
8. **`apply_healing()`** - Healing mechanics
9. **`initiate_rest()` / `rest_move()`** - Rest mechanics
10. **`adversary_feature()`** - Adversary special abilities

### ⚪ Skip (Not Worth It)
- Environment features, death moves, range checking, spotlight tracking, NPC tracking
- GM handles these effectively via narration

---

## Implementation Notes

### GameState Expansion
Consider expanding `GameState` to include:
```python
class GameState:
    def __init__(self):
        self.fear_pool: int = 0
        self.pc_hp: int = 6  # Marlowe's HP slots
        self.pc_stress: int = 0  # Marked stress slots
        self.pc_hope: int = 2  # Current Hope
        self.pc_conditions: list[str] = []  # Vulnerable, etc.
        self.pc_armor_slots: int = 0  # Marked armor slots
        self.adversaries: dict[str, dict] = {}  # Name -> {hp, stress, conditions}
        self.countdowns: dict[str, int] = {}  # Name -> value
        self.spotlight: str = "player"  # "player" | "gm" | "adversary"
```

### Tool Design Principles
- **Idempotent**: Tools should be safe to call multiple times
- **Descriptive**: Return clear status messages
- **Narrative**: Tools should support `narrate()` calls for player communication
- **Stateful**: Update `GameState` consistently

---

## Example Usage Flow

### Combat Encounter
1. `narrate()` - Describe the ambush
2. `adversary_attack()` - Thistlefolk Ambusher attacks
3. `apply_damage()` - Calculate and mark PC HP
4. `narrate()` - Describe the outcome
5. Player acts...
6. `roll_dice()` - Player's attack roll
7. `apply_damage()` - Apply damage to adversary
8. `track_adversary_state()` - Check if defeated
9. `advance_countdown()` - If ritual encounter, tick countdown
10. `narrate()` - Describe results

### Rest Sequence
1. `narrate()` - Describe rest location
2. `initiate_rest()` - Start short/long rest
3. `rest_move()` - Process player's downtime moves
4. `gain_hope()` - From Prepare move
5. `apply_healing()` - From Tend to Wounds
6. `spend_fear()` - GM gains Fear from rest
7. `narrate()` - Describe rest completion

---

## Conclusion

**Your current implementation works well!** The GM successfully handles:
- Damage calculations via narration
- HP/Stress tracking in internal notes  
- Adversary attacks using `roll_dice()` + manual calculation
- State tracking through conversation context

**The suggested tools are optional enhancements** that would:
- Provide **persistent state** (survives across turns, prevents drift)
- Add **validation** (ensure HP totals are correct)
- Reduce **verbosity** (less manual calculation in narration)
- Enable **state queries** (ask "how much HP does Marlowe have?")

**You don't need these tools** - your current approach is functional. They would make the system more robust for longer sessions or more complex encounters, but they're not required for the game to work.

---

## Questions to Consider

1. **State Persistence**: Should game state persist between sessions? (Hope/Fear carry over)
2. **Player Agency**: How much should players control vs GM tracks? (Hope spending, HP marking)
3. **Automation Level**: Should tools auto-narrate or just update state?
4. **Error Handling**: What happens if invalid state transitions occur?
5. **Multi-Character**: Current implementation is solo; should tools support multiple PCs?

