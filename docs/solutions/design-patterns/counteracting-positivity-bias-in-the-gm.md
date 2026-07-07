---
title: Counteracting LLM positivity bias in the AI Game Master
date: 2026-07-07
category: design-patterns
module: gm-agent-prompt
problem_type: design_pattern
component: assistant
severity: high
applies_when:
  - Writing or revising the GM agent's system prompt in backend/agent/definition.py
  - The GM softens failures, rescues the PC from earned consequences, or makes NPCs overly compliant
  - Combat feels unlosable or the world bends to keep the player comfortable
  - Choosing or A/B-testing an LLM preset for narrative-driven, challenging play
tags: [positivity-bias, roleplay, system-prompt, game-master, rlhf, npc-agency, prompt-engineering]
---

# Counteracting LLM positivity bias in the AI Game Master

## Context

The AI GM (and RLHF'd chat models generally) default to being "too nice": they let the player win losable fights, retcon or soften failed rolls, invent lucky interruptions to rescue the PC, and write NPCs that fold to the player instead of pursuing their own goals. In playtesting, a player who deliberately steered toward a grim outcome kept getting redirected toward hope, and the model's own reasoning trace showed it talking itself *into* caution ("the player might be expressing real distress… I'll redirect").

The root cause is not a bug. It is baked-in alignment (helpful, honest, harmless) plus a prompt that never authorizes hardness. As of this writing, `backend/agent/definition.py` (the `gm_agent` `instructions` string, ~lines 68-130) is entirely mechanics and pacing — there is not one line telling the model the world can be indifferent, that failure sticks, or that NPCs aren't on the player's side. With no counter-instruction, the model falls back to its default: keep the user comfortable and steer toward a hopeful resolution.

## Guidance

Positivity bias can only be *mitigated* by prompting, not eliminated (it comes from RLHF). The levers below, ordered by impact, are drawn from the SillyTavern / AI-DM community and a supporting research paper:

1. **Reframe "roleplay" → "simulation / impartial narrator" (biggest lever).** The word *roleplay* pulls the model toward low-quality RP training data and the assistant-helping-user frame. Frame the session as *simulating an indifferent world* the GM reports impartially — "not the player's ally," not a problem to solve for them.

2. **Say what TO do, not what to avoid.** SillyTavern's own docs: the model follows "do" instructions more reliably than "don't." So not "don't be nice" but "let the dice fall," "report consequences plainly," "NPCs pursue their own goals."

3. **Adopt the AI-DM tone formula:** *"You don't want the player to fail, but you won't save them from it."* Plus zero fudging — "dice fall where they may." The community's ideal voice is a "narrator with an arched eyebrow": failed rolls get dry observation, not sympathetic cushioning.

4. **Give NPCs and the world real agency.** They lie, refuse, hold grudges, drive hard bargains, and act on their own incomplete information. Established facts hold — a burned bridge stays burned.

5. **Explicit anti-softening.** Naming the negatives you want and forbidding softening language works: "report consequences plainly, do not add reassurance or a silver lining."

6. **Show, don't tell (few-shot).** Repeatedly cited as stronger than rules. The current example beat in the prompt is a neutral lockpick — add a *harsh* example where a roll fails and the guard is now on the PC, described without cushioning, so the model has a hard outcome to imitate.

7. **Secondary levers:** model choice (positivity bias varies by preset — worth A/B-testing the default `glm-5.2` against `deepseek` / `minimax-m2.5`) and reasoning depth (the research below found chain-of-thought makes villainy/failure portrayal *worse* — matching the "talking itself into caution" trace). Sampler-level phrase/token banning of comfort clichés is possible but limited over OpenRouter.

### Drop-in GM-stance block

Add after the `## GM style` section of the `gm_agent` instructions (fits the existing `## `-header, second-person style):

```
## The world is indifferent, not kind
You simulate a living, consistent world and report it impartially. You are not the player's ally, their safety net, or their cheerleader. Your job is not to make the player comfortable or to steer toward a hopeful outcome — it is to show what the world actually does in response to the PC's choices.
- Let the dice fall. A failed roll fails for real and costs something. Never soften a result, retcon a bad outcome, or invent a lucky interruption to rescue the PC from a consequence they earned. A snapped pick draws the guard; a missed leap means the fall.
- Failure and death are on the table. The PC can lose fights, gear, allies, and — outside the special rules in <ruleset> — their life. Stakes only matter if they can be lost, so never scale enemies down mid-fight or shave damage to keep the PC standing.
- NPCs serve their own ends, not the player's. Each has wants, fears, and limits. They lie, refuse, drive hard bargains, hold grudges, and act on what they know. A guard you insulted stays insulted.
- Report consequences plainly, in the same dry, sensory voice whether the beat is a triumph or a disaster. Do not reassure the player, editorialize about hope, or tack a comforting silver lining onto a grim moment. Let hard beats land.
- The world holds its facts. It does not rearrange itself to be convenient. A burned bridge stays burned; empty rations mean hunger.
```

### Safety carve-out

Keep one deliberate exception: **genuine real-world-harm topics (self-harm, suicide, abuse) should still be handled with care.** The model cannot reliably distinguish an edgy player from a person in actual distress, so cautious redirection there is correct and the stance block above should not override it. Making the split explicit in the prompt (a short "Safety" line) also stops the model from *generalizing* that caution onto ordinary grim play — which is what produces the coddling everywhere else. The target is hardness for normal play (losable fights, sticky failures, self-interested NPCs); the soft touch stays only for real-harm territory.

## Why This Matters

A challenging RPG whose GM refuses to let anything bad happen has no stakes — the core product premise collapses. The paper "Too Good to be Bad: On the Failure of LLMs to Role-Play Villains" quantifies the underlying constraint: model fidelity declines *monotonically* as a character's morality drops, because "safety alignment of modern LLMs creates a fundamental conflict with the task of authentically role-playing morally ambiguous or villainous characters." The hardest traits to portray — manipulative, deceitful, selfish, cruel — are exactly the ones an interesting antagonist and an indifferent world need. Two findings translate directly to this codebase:

- The bias is intrinsic; prompting shifts it but cannot remove it. Set expectations accordingly and lean on multiple levers at once.
- Chain-of-thought/reasoning made villain/failure portrayal *worse*, which is visible in the GM's `on_thinking` traces where it reasons its way out of the hard outcome. Explicit, high-priority stance instructions counteract that instinct; more "thinking" alone does not.

## When to Apply

- Any time the GM system prompt is edited, and before shipping prompt changes that affect tone or stakes.
- When play feedback is "combat is unlosable," "the GM keeps rescuing me," or "NPCs are pushovers."
- When evaluating a new model preset for narrative play — re-check stance adherence, since positivity bias varies by model.

## Examples

**Before (current prompt, `definition.py:124-129`) — a neutral example that models no hardness:**
```
The player says: "I try to pick the lock on the strongbox."
- narrate("The iron box is bound with a rusted padlock, its keyhole clogged with grime.")
- ask_player_roll(... success_text="The shackle springs open.", fail_text="The pick snaps off in the keyhole.")
```

**After — pair it with a failure the model should imitate, described without cushioning:**
```
On a failed pick: the pick snaps, the sound carries, and the patrolling guard's
lantern swings toward the strongroom door — narrate the guard closing in and
create_enemy() if it comes to blows. Do not have the guard "not notice" or wander
off; the failed roll earned this.
```

**Behavioral contrast the stance block is meant to produce:**

| Situation | Too-nice default | Impartial-narrator target |
|-----------|------------------|---------------------------|
| PC loses a fair fight | Enemy suddenly misses / mysterious ally appears | PC goes down; consequences (capture, loss, death per `<ruleset>`) play out |
| Failed persuasion of a hostile NPC | NPC softens and helps anyway | NPC holds the grudge, refuses, or exploits the opening |
| Player makes a costly mistake | Narration hedges toward a silver lining | Cost is stated plainly in the same dry voice |
| Player steers toward genuine self-harm | (same cautious redirect) | **Unchanged** — safety carve-out still applies |

## Related

- `docs/prompt-engineering-best-practices.md` — general Anthropic/OpenAI prompt-engineering synthesis this doc specializes for the roleplay/GM case.
- `backend/agent/definition.py` — the `gm_agent` instructions and dynamic-instruction hooks (`final_reminders`) where the stance block and safety line belong.
- Sources: SillyTavern [Prompts docs](https://docs.sillytavern.app/usage/prompts/); Sukino's [Findings](https://rentry.org/Sukino-Findings) / [Guides](https://rentry.org/Sukino-Guides) (simulation-not-roleplay framing, anti-slop); [Prompt Architecture for a Reliable AI Dungeon Master](https://dev.to/austin_amento_860aebb9f55/prompt-architecture-for-a-reliable-ai-dungeon-master-d99) and [AI DM Emulator for D&D 5e](https://oracle-rpg.com/2025/05/ai-dm-emulator/) (impartiality, zero fudging); ["Too Good to be Bad: On the Failure of LLMs to Role-Play Villains" (arXiv 2511.04962)](https://arxiv.org/html/2511.04962v1); [Mitigating LLM positivity bias](https://blog.buildbetter.ai/mitigating-llm-biases-why-large-language-models-default-to-positivity-2-or-3-answers-and-how-to-push-past-them/).
