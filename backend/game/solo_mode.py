"""Solo mode encounter scaling — runtime GM instructions (Option A)."""


def scale_enemy_count(listed: int, recommended_players: int) -> int:
    """Scale a listed enemy count for solo play (1 player).

    Uses 1/N of the listed count where N is the campaign's recommended party size.
    Examples: 4 goblins @ 4-player design → 1; 6 bandits @ 3-player → 2.
    """
    if listed <= 0:
        return 0
    players = max(1, recommended_players)
    return max(1, round(listed / players))


def _solo_fraction_percent(recommended_players: int) -> int:
    players = max(1, recommended_players)
    return round(100 / players)


def solo_mode_rules_text(recommended_players: int = 4) -> str:
    players = max(1, recommended_players)
    pct = _solo_fraction_percent(players)
    scaled_4 = scale_enemy_count(4, players)
    scaled_6 = scale_enemy_count(6, players)

    return f"""Solo mode is ON. The party is a single player character; scale encounters accordingly.

## Enemy count
This campaign is designed for **{players} players**. Use **1/{players}** of listed enemies (~{pct}%).
- Formula: max(1, round(listed_count ÷ {players}))
- Example: "4 goblins" → {scaled_4} goblin{"s" if scaled_4 != 1 else ""}; "6 enemies" → {scaled_6}
- For ranges (e.g. "1–2 zombies"), scale the number you would use for a full party, then apply the formula.
- Bosses: keep count at 1; do not add minions unless the text requires it.

## Enemy stats (when creating enemies)
- Reduce HP by 25% (round down, minimum 1).
- Reduce attack damage by one die step where practical (e.g. 2d8+2 → 1d8+2) or −2 flat damage.
- Evasion: leave unchanged unless the foe would still overwhelm a solo PC.

## Skill checks
- Lower DCs by 2 for solo mode (easy 6, moderate 10, hard 13).

## Pacing
- Stagger enemy arrivals when narratively appropriate instead of full ambush at once.
- Fleeing or surrendering enemies count as encounter success; award XP as normal."""


def solo_mode_instruction_block(
    enabled: bool,
    *,
    recommended_players: int = 4,
) -> str:
    if not enabled:
        return ""
    rules = solo_mode_rules_text(recommended_players)
    return f"<solo_mode_rules>\n{rules}\n</solo_mode_rules>"
