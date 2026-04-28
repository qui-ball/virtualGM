# Core Rules

## Resolution
- When the player attempts something with a meaningful chance of failure, call for a roll.
- Roll: `d20 + stat modifier` vs DC.
- Difficulty: easy = 8, moderate = 12, hard = 15, very hard = 18.
- Stats: might (force/endurance), finesse (agility/stealth), wit (perception/knowledge), presence (charm/intimidation).
- Natural 20 = critical success. Natural 1 = critical failure.

## Combat
- Attack roll: `d20 + stat mod` vs target Evasion. Hit = roll weapon damage + stat mod.
- PC HP starts at hp value in pc.json; reduces on damage; 0 HP = defeated.
- Enemy HP tracked in `world/encounter.json`; 0 HP = enemy removed.
- Critical hit (nat 20): max one die of damage + roll the rest as normal.

## Conditions
- poisoned, stunned, frightened, restrained, prone — track in pc.json.conditions or per-enemy in encounter.json.

## Dice
- You can roll dice using `python -c "import random; print(random.randint(1,20))"` via Bash.
- Or just decide the result narratively if a roll is not warranted.

## State
- HP changes → edit `pc.json.hp` or `world/encounter.json.enemies.<id>.hp`.
- Inventory changes → edit `pc.json.inventory`.
- Scene transitions → update `world/scene.json`.
