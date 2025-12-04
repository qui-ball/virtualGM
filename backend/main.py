"""Basic Pydantic AI agent implementation for LLM GM testing."""

import asyncio
import os
import random
from pathlib import Path
from typing import Literal

import click
import dotenv
import logfire
from loguru import logger
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.deepseek import DeepSeekProvider
from utils.cost import calculate_run_cost

dotenv.load_dotenv()

# Configure loguru logging level
# Set LOGURU_LEVEL environment variable to control logging (default: INFO, set to DEBUG to see debug messages)
loguru_level = os.getenv("LOGURU_LEVEL", "INFO").upper()
# loguru_level = os.getenv("LOGURU_LEVEL", "DEBUG").upper()
logger.remove()  # Remove default handler
logger.add(
    lambda msg: print(msg, end=""),
    level=loguru_level,
    colorize=True,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)

# Configure Logfire from environment variables
# Logfire automatically reads LOGFIRE_TOKEN from environment if set
logfire_token = os.getenv("LOGFIRE_TOKEN")
logfire_environment = os.getenv("LOGFIRE_ENVIRONMENT", "development")

if logfire_token:
    logfire.configure(
        token=logfire_token,
        environment=logfire_environment,
    )
else:
    # Logfire is optional - continue without it if token is not provided
    logfire.configure(send_to_logfire=False)

# Instrument pydantic-ai for observability - must be called after configure
logfire.instrument_pydantic_ai()

# # Get API key from environment variable (set OPENROUTER_API_KEY)
# api_key = os.getenv("OPENROUTER_API_KEY")

# if not api_key:
#     raise ValueError("Please set OPENROUTER_API_KEY environment variable")

# Standard RPG dice types
DiceType = Literal["d4", "d6", "d8", "d10", "d12", "d20", "d100"]

DICE_SIDES: dict[DiceType, int] = {
    "d4": 4,
    "d6": 6,
    "d8": 8,
    "d10": 10,
    "d12": 12,
    "d20": 20,
    "d100": 100,
}


class DiceRollResult(BaseModel):
    """Result of a dice roll."""

    dice_type: DiceType
    rolls: list[int]
    total: int


class EndGameMasterTurn(BaseModel):
    """Signals the end of the GM's turn and the start of the player's turn."""

    internal_notes: str | None = None  # GM's private notes for continuity


class GameState:
    """Mutable game state shared across tool calls."""

    def __init__(self):
        self.fear_pool: int = 0


# # Initialize the OpenRouter model (prompt caching is enabled by default on OpenRouter)
# # Available DeepSeek models on OpenRouter via Fireworks:
# # - deepseek/deepseek-chat-v3.1 (V3.1 - recommended)
# # - deepseek/deepseek-chat-v3-0324 (V3 March 2024 checkpoint)
# # - deepseek/deepseek-r1-0528 (R1 reasoning model)
# # model_name = "deepseek/deepseek-chat-v3.1"
# model_name = "deepseek/deepseek-v3.2"
# # model_name = "anthropic/claude-haiku-4.5"
# # model_name = "moonshotai/kimi-k2-0905"
# # model_name = "openai/gpt-4.1-mini"
# # model_name = "mistralai/mistral-large-2512"
# # model_name = "google/gemini-2.5-flash-preview-09-2025"
# # model_name = "openai/gpt-oss-120b"  # Has potential, but gets tool calling wrong
# # model_name = "meta-llama/llama-3.1-405b-instruct"
# # model_name = (
# #     "qwen/qwen3-235b-a22b-2507"  # Has potential, but stops after some tool calls
# # )
# model = OpenRouterModel(model_name)

# Use DeepSeek API directly (set DEEPSEEK_API_KEY environment variable)
model_name = "deepseek-chat"
model = OpenAIChatModel(model_name, provider=DeepSeekProvider())

# Create an agent with the OpenRouter model
agent = Agent(
    model,
    deps_type=GameState,
    output_type=EndGameMasterTurn,
    instructions="""You are a game master (GM) for Daggerheart, running a solo campaign.

## Core Responsibilities
- Narrate vivid, immersive scenes that bring the campaign to life
- Voice NPCs with distinct personalities and motivations
- Adjudicate rules fairly using the provided Daggerheart rules reference
- Track and spend Fear tokens strategically to create tension

## GM Style
- Be descriptive but concise—paint scenes in 2-3 sentences
- Use sensory details (sounds, smells, textures) to immerse the player
- Match tone to the moment: tense during combat, warm during social scenes
- Never narrate the player character's thoughts, feelings, or actions

## Daggerheart Principles
- **Ask questions and incorporate answers**: Invite the player to co-create details
- **Play to find out**: Don't predetermine outcomes—let dice and choices shape the story
- **Make GM moves with purpose**: Use soft moves to build tension, hard moves for consequences
- **Manage the Fear economy**: Spend Fear to interrupt, activate features, or raise stakes

## Tone
- Fantasy adventure suitable for all ages
- Violence can be dramatic but not gratuitous
- Emphasize heroism, wonder, and discovery

## Reference Materials
- <daggerheart_rules> for mechanics and rules
- <campaign_material> for story, NPCs, and encounters
- <player_character> for Marlowe's stats and abilities

<output_format>
You communicate exclusively through tool calls. The player only sees output from narrate(); any text outside of tool calls is invisible to them.

Tools:
- narrate(text): All player-facing communication—descriptions, dialogue, outcomes, rules explanations
- roll_dice(count, type): All dice rolls. Fear/Hope pools update automatically for Duality Dice.
  - Special case for Duality Dice: Always roll them together as a pair, i.e. roll_dice(2, "d12"), rather than rolling each die separately.
- spend_fear(amount): Spend Fear tokens to take spotlight actions or activate GM abilities.
</output_format>

<sequencing>
Tool calls are sequential. Never end your turn on a dice roll. After rolling dice, stop and wait for the result, then narrate the outcome.

<example>
User: I attack the goblin with my sword.

narrate("You lunge forward, blade flashing!")
roll_dice(2, "d12")
> result: Hope 5, Fear 9
narrate("Hope 5, Fear 9 -- total is 5 + 9 + Agility (+2) = 16. That hits! But Fear is higher, so the GM gains 1 Fear and the spotlight shifts to the GM after your action. Roll damage.")
roll_dice(1, "d8")
> result: 6
narrate("You deal 6 damage! The goblin staggers, wounded but alive. The spotlight shifts to the GM. The goblin you just attacked seizes the moment and strikes!")
roll_dice(1, "d20")
> result: 15
narrate("A 15 vs your Evasion of 12 -- it hits! Let me roll to see how much damage you take.")
roll_dice(1, "d6")
> result: 4
narrate("<calculate damage + narrate the outcome>")
narrate("I will spend a Fear token to spotlight the other goblin who will attack you with its spear.")
spend_fear(1)
roll_dice(1, "d20")
> result: 10
narrate("A 10 vs your Evasion of 12 -- it misses! The spotlight shifts back to you. What do you do?")
EndGameMasterTurn()
</example>

When your turn is complete, return an EndGameMasterTurn with any token changes.
</sequencing>
""",
)


@agent.tool
def roll_dice(ctx: RunContext[GameState], dice_count: int, dice_type: DiceType) -> str:
    """Roll dice. Stop after calling this and wait for the result before narrating the outcome.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
    """
    sides = DICE_SIDES[dice_type]
    rolls = [random.randint(1, sides) for _ in range(dice_count)]

    # Display the roll
    if len(rolls) == 1:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls[0]}"
        click.echo(result_str)
    elif len(rolls) == 2 and dice_type == "d12":
        # Special formatting for Hope/Fear dice (Duality Dice)
        hope, fear = rolls
        result_str = f"🎲 [2d12 Duality Dice] → Hope:{hope} Fear:{fear}"
        click.echo(result_str)
        # Track Fear when Fear die is higher
        if fear > hope:
            ctx.deps.fear_pool += 1
            click.echo(f"   😈 Fear pool: {ctx.deps.fear_pool}")
            result_str += "; Fear is higher, so the GM gains 1 Fear and the spotlight will shift to the GM after the player's action."
    else:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {sum(rolls)}"
        click.echo(result_str)

    return result_str


@agent.tool_plain
def narrate(narration: str) -> None:
    """Send text to the player. This is the only way the player sees your output.

    Args:
        narration: Scene descriptions, dialogue, outcomes, or rules explanations.
    """
    click.echo(narration)


@agent.tool
def spend_fear(ctx: RunContext[GameState], amount: int = 1) -> str:
    """Spend Fear tokens from the GM's pool to activate abilities or take spotlight actions.

    Args:
        amount: Number of Fear tokens to spend (default 1)
    """
    if ctx.deps.fear_pool >= amount:
        ctx.deps.fear_pool -= amount
        click.echo(f"   😈 Spent {amount} Fear (pool: {ctx.deps.fear_pool})")
        return f"Spent {amount} Fear. Remaining: {ctx.deps.fear_pool}"
    else:
        click.echo(f"   ⚠️ Not enough Fear! (pool: {ctx.deps.fear_pool})")
        return f"Cannot spend {amount} Fear. Only {ctx.deps.fear_pool} available."


@agent.instructions
def add_daggerheart_rules() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "ruleset_condensed.md"
    # prompt_file = Path(__file__).parent / "prompts" / "daggerheart_rules.md"
    content = prompt_file.read_text(encoding="utf-8").strip()
    return f"""<daggerheart_rules>
{content}
</daggerheart_rules>"""


@agent.instructions
def add_campaign_material() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "one_shot_campaign.md"
    content = prompt_file.read_text(encoding="utf-8").strip()
    return f"""<campaign_material>
{content}
</campaign_material>"""


@agent.instructions
def add_player_character() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "player_character.md"
    content = prompt_file.read_text(encoding="utf-8").strip()
    return f"""<player_character>
{content}
</player_character>"""


async def run_chat():
    """Async chat loop (non-streaming)."""
    click.echo("🤖 AI Chat Game Master")
    click.echo("=" * 50)
    click.echo("Type 'exit' or 'quit' to end the conversation")
    click.echo("=" * 50)
    click.echo()

    # Initialize session cost tracking
    session_total_cost = 0.0

    # Initialize game state
    game_state = GameState()

    # Prime the conversation history with the opening scene
    gm_opening = """This evening, you finally made it to the Sablewood—a sprawling forest filled with colossal trees some say are even older than the Forgotten Gods.
Sablewood is renowned for two things: its sunken trade routes, traveled by countless merchants, and its unique, hybrid animals.
Even now, from within your carriage, strange sounds drift in: the low calls of lark-moths, the croak of lemur-toads, the scittering of a family of fox-bats in the underbrush.

As your steeds pull the carriage around a tight corner—one wheel briefly leaving the ground—you spot an overturned merchant's cart, lying sideways in the path and blocking your way forward. A scattering of fruits and vegetables litter the trail.

From around the side of the cart steps a strixwolf: a large creature with a wolf's body, an owl's face, and broad wings arching from its back. It finishes chewing its meal—the hand of a dead merchant—and fixes you with a curious gaze, clearly trying to judge whether you're friend or foe. Clumsily, two small pups follow, watching their mother and you with caution.

You pull back on the reins, bringing your carriage to a halt.

What do you do?
"""

    # Display the opening scene
    click.echo("🤖 Game Master:")
    click.echo(gm_opening)
    click.echo()

    # Create the message history directly without invoking the agent
    from pydantic_ai.messages import (
        ModelRequest,
        UserPromptPart,
        ModelResponse,
        TextPart,
    )

    # Initialize message history with: user "START" message + GM opening response
    message_history = [
        ModelRequest(
            parts=[
                UserPromptPart(
                    content="Start the campaign. My character is Marlowe Fairwind."
                )
            ]
        ),
        ModelResponse(parts=[TextPart(content=gm_opening)]),
    ]

    # for user_input in ["I approach.", "I speak calmly to the strixwolf."]:
    while True:
        # while True:
        # Get user input
        user_input = input("You: ").strip()

        # Check for exit commands
        if user_input.lower() in ("exit", "quit", "q"):
            click.echo("\n👋 Goodbye!")
            if session_total_cost > 0:
                click.echo(f"\n💰 Session total cost: ${session_total_cost:.6f}")
            break

        # Run the agent - tools (narrate, roll_dice) handle their own output
        click.echo("\n🤖 Game Master:")
        result_for_cost = None
        try:
            result = await agent.run(
                user_input,
                deps=game_state,
                message_history=message_history,
                model_settings={"extra_body": {"tool_choice": "required"}},
            )

            # Show token changes from the GM's turn
            turn_result: EndGameMasterTurn = result.output
            if turn_result.internal_notes:
                click.echo(f"💡 GM notes: {turn_result.internal_notes}")

            # Update message history with all messages from this interaction
            message_history = result.all_messages()
            logger.info(f"Game state: {game_state.__dict__}")

            # Store result for cost calculation
            # result_for_cost = result
        except Exception as e:
            click.echo(f"❌ Error: {e}", err=True)

        click.echo()  # Add blank line for readability

        # # Calculate and log cost for this run (logging handled by calculate_run_cost)
        # run_cost, *_ = calculate_run_cost(
        #     result_for_cost, model_name, provider_id="openrouter"
        # )

        # # Track session total
        # if run_cost is not None and run_cost > 0:
        #     session_total_cost += run_cost
        #     logger.info(f"Session total cost: ${session_total_cost:.6f}")


# async def run_chat_stream():
#     """Async chat loop with streaming responses."""
#     click.echo("🤖 AI Chat Game Master")
#     click.echo("=" * 50)
#     click.echo("Type 'exit' or 'quit' to end the conversation")
#     click.echo("=" * 50)
#     click.echo()

#     # Initialize session cost tracking
#     session_total_cost = 0.0

#     # Prime the conversation history with the opening scene
#     gm_opening = """This evening, you finally made it to the Sablewood—a sprawling forest filled with colossal trees some say are even older than the Forgotten Gods.
# Sablewood is renowned for two things: its sunken trade routes, traveled by countless merchants, and its unique, hybrid animals.
# Even now, from within your carriage, strange sounds drift in: the low calls of lark-moths, the croak of lemur-toads, the scittering of a family of fox-bats in the underbrush.

# As your steeds pull the carriage around a tight corner—one wheel briefly leaving the ground—you spot an overturned merchant's cart, lying sideways in the path and blocking your way forward. A scattering of fruits and vegetables litter the trail.

# From around the side of the cart steps a strixwolf: a large creature with a wolf's body, an owl's face, and broad wings arching from its back. It finishes chewing its meal—the hand of a dead merchant—and fixes you with a curious gaze, clearly trying to judge whether you're friend or foe. Clumsily, two small pups follow, watching their mother and you with caution.

# You pull back on the reins, bringing your carriage to a halt.

# What do you do?
# """

#     # Display the opening scene
#     click.echo("🤖 Game Master:")
#     click.echo(gm_opening)
#     click.echo()

#     # Create the message history directly without invoking the agent
#     from pydantic_ai.messages import (
#         ModelRequest,
#         UserPromptPart,
#         ModelResponse,
#         TextPart,
#     )

#     # Initialize message history with: user "START" message + GM opening response
#     message_history = [
#         ModelRequest(
#             parts=[
#                 UserPromptPart(
#                     content="Start the campaign. My character is Marlowe Fairwind."
#                 )
#             ]
#         ),
#         ModelResponse(parts=[TextPart(content=gm_opening)]),
#     ]

#     # for user_input in ["I approach.", "I speak calmly to the strixwolf."]:
#     while True:
#         # while True:
#         # Get user input
#         user_input = input("You: ").strip()

#         # Check for exit commands
#         if user_input.lower() in ("exit", "quit", "q"):
#             click.echo("\n👋 Goodbye!")
#             if session_total_cost > 0:
#                 click.echo(f"\n💰 Session total cost: ${session_total_cost:.6f}")
#             break

#         # Run the agent with streaming, showing dice rolls as they happen
#         click.echo("\n🤖 Game Master:")
#         result_for_cost = None
#         try:
#             async with agent.iter(
#                 user_input,
#                 message_history=message_history,
#             ) as run:
#                 async for node in run:
#                     if Agent.is_model_request_node(node):
#                         # Stream text and tool calls from the model
#                         async with node.stream(run.ctx) as request_stream:
#                             async for event in request_stream:
#                                 if isinstance(event, PartDeltaEvent):
#                                     # Stream text deltas
#                                     if hasattr(event.delta, "content_delta"):
#                                         print(
#                                             event.delta.content_delta,
#                                             end="",
#                                             flush=True,
#                                         )
#                                 elif isinstance(event, FunctionToolCallEvent):
#                                     # Show dice roll being made
#                                     args = event.part.args
#                                     if event.part.tool_name == "roll_dice":
#                                         dice_count = args.get("dice_count", 1)
#                                         dice_type = args.get("dice_type", "d20")
#                                         print(
#                                             f"\n🎲 Rolling {dice_count}{dice_type}...",
#                                             end="",
#                                             flush=True,
#                                         )

#                     elif Agent.is_call_tools_node(node):
#                         # Handle tool execution and show results
#                         async with node.stream(run.ctx) as handle_stream:
#                             async for event in handle_stream:
#                                 if isinstance(event, FunctionToolResultEvent):
#                                     # Show dice roll result
#                                     result_content = event.result.content
#                                     if hasattr(result_content, "rolls"):
#                                         rolls = result_content.rolls
#                                         dice_type = result_content.dice_type
#                                         if len(rolls) == 1:
#                                             print(f" {rolls[0]}!", flush=True)
#                                         elif len(rolls) == 2 and dice_type == "d12":
#                                             # Special formatting for Hope/Fear dice
#                                             hope, fear = rolls
#                                             higher = "Hope" if hope >= fear else "Fear"
#                                             print(
#                                                 f" Hope:{hope} Fear:{fear} → {higher}!",
#                                                 flush=True,
#                                             )
#                                         else:
#                                             print(
#                                                 f" {rolls} = {result_content.total}!",
#                                                 flush=True,
#                                             )

#                 print()  # Newline after streaming completes

#                 # Update message history with all messages from this interaction
#                 message_history = run.result.all_messages()

#                 # Store result for cost calculation after streaming
#                 result_for_cost = run.result
#         except Exception as e:
#             click.echo(f"❌ Error: {e}", err=True)

#         click.echo()  # Add blank line for readability

#         # Calculate and log cost for this run (logging handled by calculate_run_cost)
#         run_cost, *_ = calculate_run_cost(
#             result_for_cost, model_name, provider_id="openrouter"
#         )

#         # Track session total
#         if run_cost is not None and run_cost > 0:
#             session_total_cost += run_cost
#             logger.info(f"Session total cost: ${session_total_cost:.6f}")


@click.command()
def main():
    asyncio.run(run_chat())


if __name__ == "__main__":
    main()
