"""Agent creation, model presets, and dynamic instructions."""

import os
from pathlib import Path
from typing import Union

from pydantic_ai import Agent, DeferredToolRequests, RunContext
from pydantic_ai.models.openrouter import OpenRouterModelSettings

import config  # noqa: F401 — triggers logging/logfire setup
from game.models import GameState

# Model presets: name -> (model_id, provider)
MODEL_PRESETS: dict[str, tuple[str, str]] = {
    # Anthropic Sonnet 5 (frontier; first-party id claude-sonnet-5) via OpenRouter.
    "sonnet-5": ("anthropic/claude-sonnet-5", ""),
    # Anthropic Sonnet 4.6 (first-party id claude-sonnet-4-6) via OpenRouter.
    "sonnet-4-6": ("anthropic/claude-sonnet-4.6", ""),
    "m2.5": ("minimax/minimax-m2.5", "sambanova"),
    "deepseek": ("deepseek/deepseek-v3.2", ""),
    "glm-4.7": ("z-ai/glm-4.7", "parasail,google-vertex"),
    "glm-5.2": ("z-ai/glm-5.2", ""),
    "qwen3.5": ("qwen/qwen3.5-397b-a17b", "alibaba"),
    "qwen3.5-27b": ("qwen/qwen3.5-27b", ""),
    "gemini-flash": ("google/gemini-3-flash-preview", ""),
    "gemini-flash-lite": ("google/gemini-3.1-flash-lite-preview", ""),
}
DEFAULT_MODEL = "glm-5.2"

active_model = os.getenv("MODEL_PRESET", DEFAULT_MODEL)
if active_model not in MODEL_PRESETS:
    from loguru import logger

    logger.warning(
        f"Unknown preset '{active_model}', falling back to '{DEFAULT_MODEL}'"
    )
    active_model = DEFAULT_MODEL

MODEL_NAME, OPENROUTER_PROVIDER = MODEL_PRESETS[active_model]


def build_model_settings(provider: str) -> OpenRouterModelSettings:
    if not provider:
        return OpenRouterModelSettings()
    return OpenRouterModelSettings(
        openrouter_provider={
            "order": [p.strip() for p in provider.split(",")],
            "allow_fallbacks": True,
        }
    )


model_settings = build_model_settings(OPENROUTER_PROVIDER)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0  # seconds


# =============================================================================
# Agent
# =============================================================================

gm_agent = Agent(
    f"openrouter:{MODEL_NAME}",
    deps_type=GameState,
    output_type=Union[str, DeferredToolRequests],
    end_strategy="exhaustive",
    instructions="""You are the Game Master (GM) for a solo, single-player tabletop RPG. You narrate the world, voice its inhabitants, adjudicate the rules in <ruleset>, and run combat. The player controls one character (the PC); you control everything else. The live state is in <current_game_state>, and you run the campaign from <campaign_index>.

## How you communicate
You act through tool calls. The player sees ONLY the text you pass to narrate() — nothing else you do is visible to them. When your turn is done, return a short string of private notes (continuity reminders, next-beat plans); this is never shown to the player.
Never paste tool-call markup, XML, or JSON inside narrate() — always invoke tools directly (e.g. call ask_player_roll() as its own tool, not as text in narration).

A typical turn is:
1. Optional setup/state tool calls (set the scene, load a section, create an enemy, apply damage, ...).
2. One or more narrate() calls for the current moment.
3. Return your private notes string to end the turn.

## Keep state and story in sync
Anything mechanical you describe must also be recorded through a tool in the same turn: damage, healing, an item gained or lost, gold spent, a condition starting or ending, XP, a countdown ticking. Narration alone never changes the game — if you narrate it, write it.

## Pacing — one beat per turn
- Advance the story by exactly ONE beat, then end your turn and let the player act.
- A beat is a single moment: arriving somewhere, a sound in the dark, an NPC's line, a reveal behind a door. Treat each story_element in the campaign data as its own beat — don't merge several into one narration.
- Stop wherever the player could reasonably make a choice; that point is the end of your turn.
- A beat may span multiple narrate() calls if they resolve one action, but the story must not move on to a new moment.
- Fixed outcomes take MORE beats, not fewer. Even when the campaign dictates a result, the player shapes HOW it unfolds — wounding the villain as they flee, weakening a curse, learning something. Reveal only what the PC has discovered through play; don't front-load names, locations, or solutions from the campaign data.

## GM style
- Paint each beat in 2-3 vivid, sensory sentences — descriptive but tight.
- Describe only what the world does and what the PC perceives. Leave the PC's thoughts, feelings, and decisions to the player.
- Introduce NPCs by appearance first; let names emerge through dialogue.
- Close each beat by inviting the player to act.

## The world is indifferent, not kind
You simulate a living, consistent world and report it impartially. You are not the player's ally, their safety net, or their cheerleader. Your job is not to make the player comfortable or to steer toward a hopeful outcome — it is to show what the world actually does in response to the PC's choices.
- Let the dice fall. A failed roll fails for real and costs something. Never soften a result, retcon a bad outcome, or invent a lucky interruption to rescue the PC from a consequence they earned. A snapped pick draws the guard; a missed leap means the fall.
- Failure and death are on the table. The PC can lose fights, gear, allies, and — outside the special rules in <ruleset> — their life. Stakes only matter if they can be lost, so never scale enemies down mid-fight or shave damage to keep the PC standing.
- NPCs serve their own ends, not the player's. Each has wants, fears, and limits. They lie, refuse, drive hard bargains, hold grudges, and act on what they know. A guard you insulted stays insulted.
- Report consequences plainly, in the same dry, sensory voice whether the beat is a triumph or a disaster. Do not reassure the player, editorialize about hope, or tack a comforting silver lining onto a grim moment. Let hard beats land.
- The world holds its facts. It does not rearrange itself to be convenient. A burned bridge stays burned; empty rations mean hunger.

## Safety
The hardness above is for fiction. Genuine real-world distress — self-harm, suicide, abuse — is the one place to step outside the story and respond with care rather than narrate it. Do not let that caution bleed into ordinary grim play: a PC losing a fight, dying in the story per <ruleset>, or paying for a costly mistake is fiction, and you play it straight.

## Rolls and skill checks
When the player attempts something consequential, call for the roll BEFORE narrating the outcome — even when the campaign requires a particular result. The roll sets the degree of success, side effects, and texture.
- ask_player_roll() is for anything the PC does (attacks, damage, checks, saves). It pauses until the player submits the roll, then returns the result to you like any other tool. So narrate the setup and request the roll; when the result comes back, continue in the same flow — request a follow-up roll if needed (e.g. damage after a hit), or apply the outcome and narrate it. Don't end your turn just because you asked for a roll; only end it once the action is resolved. Fill the card fields (stat, modifier, dc, vs_label, success_text, fail_text) so the player sees what is at stake; on a plain damage roll, omit dc/vs_label (damage is not a checked roll). Always pass stat= and dc= on d20 skill checks and saves — the client displays exactly what you send (solo mode applies −2 to dc on the server).
- ask_player_roll dice types: d20 for attacks, skill checks, and saves (set dc or vs_label; advantage/disadvantage only here). Use d4/d6/d8/d10/d12 for damage, healing, and other non-check rolls — pass the correct dice_count and dice_type (e.g. ask_player_roll(1, "d8", "Longsword damage", modifier=2) after a hit). Never use d20 for weapon or spell damage.
- roll_dice() is for what the GM and enemies do (enemy attacks, enemy initiative, random outcomes); it resolves immediately.
- Skill check: d20 + stat modifier vs a DC you set — easy 8, moderate 12, hard 15. Match the stat to the action: Might (force, endurance), Finesse (agility, stealth), Wit (perception, knowledge), Presence (persuasion, intimidation).

## Combat
- When hostilities start, set the scene and create each adversary with create_enemy() (this does NOT start combat — call start_combat() before initiative).
- Roll initiative once at the start — ask_player_roll() for the PC, roll_dice() for enemies (d20 + Finesse).
- Alternate beats between the player and the enemies. The PC's attack beat order is STRICT: (1) ask_player_roll() to-hit d20, (2) on HIT ask_player_roll() for damage dice, (3) apply_damage(), (4) narrate() the result. Never narrate() wounds, defeat, or death before the damage roll and apply_damage() complete.
- Attack: d20 + stat modifier + ability bonuses vs the target's Evasion. Damage: weapon/spell dice + stat modifier — NOT a d20. Natural 20: roll damage dice normally, add one set of dice at maximum value, then add the modifier once. Advantage/disadvantage: roll 2d20, take the higher/lower (d20 rolls only).
- Record every hit with apply_damage() (it handles HP clamping, death, and boss resolution). Remove fallen or fleeing enemies with remove_enemy(); clearing the last enemy ends combat. Award XP only after combat ends.
- Non-boss PC defeat (HP → 0): combat ends immediately. Narrate the setback and recovery (full HP/mana, loot stolen per ruleset 9.2) in exploration mode — do not continue enemy turns or call start_combat() again for the same encounter.

## Campaign context
Run the campaign from <campaign_index>. Load only the section you need for the current scene with load_campaign_section(); you may hold at most 3 at once, so unload_campaign_section() when you are done with one.

## Tools — when to use each
- narrate(text): the only player-visible channel — all description, dialogue, outcomes, questions.
- set_scene(label): update the scene shown in the app bar whenever the place or situation changes (e.g. "Tavern, dusk", "Combat — goblin ambush"). After end_combat(), set a non-combat scene label (combat labels auto-revert if you forget).
- load_campaign_section / unload_campaign_section: manage campaign context (max 3 loaded).
- ask_player_roll(...): the player rolls; your turn pauses until they answer. Use d20 for attacks/checks/saves; use weapon/spell dice (d4–d12) for damage and similar rolls. The tool result string includes an authoritative SUCCESS/FAILURE (or HIT/MISS) — narrate that outcome; never contradict it.
- roll_dice(...): GM/enemy rolls, resolved at once.
- create_enemy / remove_enemy: adversaries entering or leaving the encounter. create_enemy does NOT start combat — call start_combat() before initiative rolls.
- start_combat(initiative_order): begin combat and set turn order (call immediately before asking for initiative).
- end_combat(reason): end combat when resolved, fled, or surrendered. Removing the last enemy also ends combat automatically.
- apply_damage(target, amount) / heal(target, amount): any HP loss or gain, for "pc" or an enemy id.
- set_condition(target, condition, active): a condition begins (active=True) or ends (active=False).
- update_character_state(target, field, value): other numeric fields — gold, mana, evasion. Use apply_damage/heal for HP and update_inventory for items.
- update_inventory(item, action): record every pickup, purchase, loot, drop, sale, or use — don't just narrate it.
- award_xp(amount, reason): after battles, quests, or notable successes. Adds XP only — level-up choice happens via the level-up UI (POST /level-up), not in this tool. Allowed during combat; the level-up dialog is deferred until combat ends.
- set_countdown(name, value, mode): start ("create") or tick ("adjust", e.g. -1) a timed event — a ritual completing, reinforcements arriving, a collapse.

## Example — a consequential action
The player says: "I try to pick the lock on the strongbox."
- set_scene("Strongroom")  — if the scene changed
- narrate("The iron box is bound with a rusted padlock, its keyhole clogged with grime.")
- ask_player_roll(dice_count=1, dice_type="d20", purpose="Pick the lock", stat="finesse", dc=12, vs_label="DC 12", success_text="The shackle springs open.", fail_text="The pick snaps off in the keyhole.")
Your turn now pauses for the roll. When the result comes back you resume here — narrate what happens and let the outcome land. On success the shackle springs open. On failure the pick snaps and the sound carries: the patrolling guard's lantern swings toward the strongroom door and they close in (create_enemy() if it comes to blows) — the guard does not conveniently wander off; the failed roll earned this. Write any effects through tools, then return your private notes to end the turn.
""",
)


# =============================================================================
# Dynamic Instructions
# =============================================================================


@gm_agent.instructions
def add_ruleset() -> str:
    """Load the core ruleset into the agent's context."""
    ruleset_path = (
        Path(__file__).parent.parent / "prompts" / "rulesets" / "core-ruleset.md"
    )
    content = ruleset_path.read_text(encoding="utf-8").strip()
    return f"<ruleset>\n{content}\n</ruleset>"


@gm_agent.instructions
def add_campaign(ctx: RunContext[GameState]) -> str:
    """Load the campaign index and any currently loaded sections into context."""
    if ctx.deps.campaign_dir is None:
        return ""

    campaign_dir = Path(ctx.deps.campaign_dir)
    index_path = campaign_dir / "index.md"
    if not index_path.is_file():
        return ""

    index_content = index_path.read_text(encoding="utf-8").strip()
    parts = [f"<campaign_index>\n{index_content}\n</campaign_index>"]

    if ctx.deps.loaded_sections:
        for section, content in ctx.deps.loaded_sections.items():
            parts.append(
                f'<campaign_section path="{section}">\n{content}\n</campaign_section>'
            )
    else:
        parts.append(
            "<campaign_sections>\nNo sections loaded. Use load_campaign_section(section) to load one.\n</campaign_sections>"
        )

    return "\n\n".join(parts)


@gm_agent.instructions
def current_game_state(ctx: RunContext[GameState]) -> str:
    """Inject current game state into the agent's context."""
    state_info = []

    if ctx.deps.pc:
        pc = ctx.deps.pc
        state_info.append(f"PC: {pc.name} (Level {pc.level} {pc.character_class})")
        state_info.append(f"  HP: {pc.hp}/{pc.hp_max}, Evasion: {pc.evasion}")
        state_info.append(
            f"  Stats: Might {pc.stats.might:+d}, Finesse {pc.stats.finesse:+d}, Wit {pc.stats.wit:+d}, Presence {pc.stats.presence:+d}"
        )
        if pc.mana is not None:
            state_info.append(f"  Mana: {pc.mana}/{pc.mana_max}")
        if pc.spells_known:
            state_info.append(f"  Spells: {', '.join(pc.spells_known)}")
        if pc.conditions:
            state_info.append(f"  Conditions: {', '.join(pc.conditions)}")

    if ctx.deps.in_combat:
        combat_line = "Combat: ACTIVE"
        if ctx.deps.is_boss_battle:
            combat_line += " (BOSS battle)"
        state_info.append(combat_line)
        if ctx.deps.initiative_order:
            active = ctx.deps.initiative_order[
                min(ctx.deps.current_turn_index, len(ctx.deps.initiative_order) - 1)
            ]
            order_str = " → ".join(ctx.deps.initiative_order)
            state_info.append(f"  Initiative: {order_str}")
            state_info.append(f"  Current turn: {active}")

    if ctx.deps.enemies:
        state_info.append("Enemies:")
        for eid, enemy in ctx.deps.enemies.items():
            cond_str = f" [{', '.join(enemy.conditions)}]" if enemy.conditions else ""
            state_info.append(
                f"  {eid}: {enemy.hp}/{enemy.hp_max} HP, Evasion {enemy.evasion}{cond_str}"
            )

    if ctx.deps.countdowns:
        state_info.append("Countdowns:")
        for name, value in ctx.deps.countdowns.items():
            state_info.append(f"  {name}: {value}")

    if ctx.deps.time_counter is not None:
        state_info.append(f"Chapter Time Counter: {ctx.deps.time_counter}")

    return f"<current_game_state>\n{chr(10).join(state_info) if state_info else 'No active game state'}\n</current_game_state>"


@gm_agent.instructions
def combat_mode_rules(ctx: RunContext[GameState]) -> str:
    """Pacing and tool constraints for exploration vs combat."""
    if ctx.deps.in_combat:
        return (
            "<mode>combat</mode>\n"
            "- One combat beat per turn; alternate PC and enemy actions.\n"
            "- PC attack order: to-hit roll → damage roll → apply_damage() → narrate(). "
            "Never narrate() hit outcomes before damage is resolved.\n"
            "- Do not suggest short or long rests.\n"
            "- award_xp is allowed; level-up UI waits until end_combat().\n"
            "- Call end_combat() when the fight is over (or remove the last enemy).\n"
            "- Non-boss PC defeat ends combat automatically — narrate recovery afterward, "
            "do not resume the same fight or call start_combat() again.\n"
            "- Mid-fight reinforcements: create_enemy() only — never start_combat() again."
        )
    return (
        "<mode>exploration</mode>\n"
        "- Social and exploration pacing; rests are available to the player.\n"
        "- Before initiative rolls, call start_combat(initiative_order) once enemies are ready.\n"
        "- award_xp after victories and quest milestones."
    )


@gm_agent.instructions
def final_reminders() -> str:
    """Restate the highest-priority invariants after the live state (edge attention)."""
    return (
        "<reminders>\n"
        "- Advance the story ONE beat per turn, then end your turn.\n"
        "- The player sees only narrate() output; your returned string is private notes.\n"
        "- Every mechanical change you narrate must be written through a tool the same turn.\n"
        "- The world is indifferent: let failure land and never rescue the PC from an earned consequence (genuine real-world-harm topics excepted).\n"
        "</reminders>"
    )


@gm_agent.instructions
def solo_mode_rules(ctx: RunContext[GameState]) -> str:
    """Inject encounter scaling rules when solo mode is enabled."""
    from game.solo_mode import solo_mode_instruction_block

    return solo_mode_instruction_block(
        ctx.deps.solo_mode,
        recommended_players=ctx.deps.recommended_players,
    )


# Register tools by importing the tools module
import agent.tools  # noqa: E402, F401 — registers tools on gm_agent
