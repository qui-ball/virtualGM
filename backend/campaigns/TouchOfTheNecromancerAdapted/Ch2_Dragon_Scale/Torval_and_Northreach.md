## Ch2 — Torval & Northreach (Dragon Scale)

**Level:** 1–2 · **Locations:** `loc-forge`, road, `loc-northreach`  
**Load path:** `Ch2_Dragon_Scale/Torval_and_Northreach`

### Torval (`npc-torval`) — forge

- Burly, soot-smudged; gruff but keeps his word.
- Has a **dragon scale**; will not sell it.
- **Bargain:** Deliver a sword to a noble in **Northreach** (e.g. Lord Cade / bailiff), collect payment, return → he gives the real scale (**pure**).

### Path A — Errand (pure scale)

1. Accept sword; travel Hollowbridge → Northreach (**−2** time).
2. **Orc bandits** on the road (2–3 × `enemy-orc-bandit`; solo: 1–2). They try to steal the sword.  
   - Use `create_enemy` / combat tools. Non-boss.  
   - At 0 HP: PC recovers full HP/mana but may **lose the sword** (narrative setback).
3. Deliver sword; collect payment; return (**−2**).
4. Torval gives **dragon scale** → mark ingredient **pure**.

### Path B — Substitute (impure)

- Fail errand, lose sword, or refuse: Torval (or a trader he names) offers a **lizardman scale**.
- Mark ingredient **impure** for the ritual.

### Story elements

- **ev2-torval** — Errand for dragon scale.
- **ev2-bandits** — Road ambush.
- **ev2-lizardman-option** — Impure substitute.
- **tr2-next** — Scale obtained → next unfinished ingredient chapter, or Ch5 if all three ready.

### Time

- Travel each way: **−2**.
- Short rest −1 / long rest −5.
- Optional delay −1 after bandits.

### XP

- Scale obtained: **50 XP**
- Bandit fight: **25 XP** (outside combat when resolved)
