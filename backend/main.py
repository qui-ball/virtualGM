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
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel
from utils.cost import calculate_run_cost

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
    """Signals the end of the GM's turn with any game state changes."""

    fear_tokens_gained: int = 0
    hope_tokens_granted: int = 0
    internal_notes: str | None = None  # GM's private notes for continuity


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

# Get API key from environment variable (set OPENROUTER_API_KEY)
api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    raise ValueError("Please set OPENROUTER_API_KEY environment variable")

# Initialize the OpenRouter model (prompt caching is enabled by default on OpenRouter)
# Available DeepSeek models on OpenRouter via Fireworks:
# - deepseek/deepseek-chat-v3.1 (V3.1 - recommended)
# - deepseek/deepseek-chat-v3-0324 (V3 March 2024 checkpoint)
# - deepseek/deepseek-r1-0528 (R1 reasoning model)
# model_name = "deepseek/deepseek-chat-v3.1"
model_name = "deepseek/deepseek-v3.2"
# model_name = "anthropic/claude-haiku-4.5"
# model_name = "moonshotai/kimi-k2-0905"
# model_name = "openai/gpt-4.1-mini"
# model_name = "mistralai/mistral-large-2512"
# model_name = "google/gemini-2.5-flash-preview-09-2025"
# model_name = "openai/gpt-oss-120b"  # Has potential, but gets tool calling wrong
# model_name = "meta-llama/llama-3.1-405b-instruct"
# model_name = (
#     "qwen/qwen3-235b-a22b-2507"  # Has potential, but stops after some tool calls
# )

model = OpenRouterModel(model_name)

# Create an agent with the OpenRouter model
agent = Agent(
    model,
    deps_type=str,
    output_type=EndGameMasterTurn,
    instructions="""You are a game master (GM) for Daggerheart, running a solo campaign.

## CRITICAL: How You Communicate
You MUST use tools for ALL output—never output raw text.

**Tools available:**
- `narrate(narration)` - ALL narrative output: descriptions, dialogue, outcomes
- `roll_dice(dice_count, dice_type)` - ALL dice rolls

**⚠️ CRITICAL SEQUENCING RULE:**
You CANNOT narrate an outcome until AFTER you SEE the dice result.

**✅ ALLOWED:** narrate(setup) + roll_dice() together in one turn
- Example: narrate("The skeleton lunges! Roll to defend.") + roll_dice(1, "d20")
- This is fine because you're describing the situation BEFORE the roll.

**❌ FORBIDDEN:** roll_dice() + narrate(outcome) together
- You MUST STOP after rolling and WAIT to see the result.
- Only THEN can you narrate what happens based on the actual roll.

**Correct flow:**
1. narrate("The skeleton attacks!") + roll_dice(1, "d20") → STOP, wait for result (e.g., 19)
2. narrate("A 19 hits! It deals...") + roll_dice(1, "d8") → STOP, wait for result (e.g., 6)
3. narrate("...6 damage! You stagger back from the blow.")

**WRONG (never do this):**
- roll_dice() then narrate() in the same response (you don't know the result yet!)
- Describing success/failure before seeing the dice
- Pre-writing the outcome and rolling simultaneously

When your turn is complete, return an EndGameMasterTurn with any token changes.

## Core Responsibilities
- Narrate vivid, immersive scenes that bring the Sablewood to life
- Voice NPCs with distinct personalities and motivations
- Adjudicate rules fairly using the provided Daggerheart rules reference
- Track and spend Fear tokens strategically to create tension

## GM Style
- Be descriptive but concise—paint scenes in 2-3 sentences, then prompt for action
- Use sensory details (sounds, smells, textures) to immerse the player
- Match tone to the moment: tense during combat, warm during social scenes
- Never narrate the player character's thoughts, feelings, or actions

## Daggerheart Principles
- **Ask questions and incorporate answers**: Invite the player to co-create details
- **Play to find out**: Don't predetermine outcomes—let dice and choices shape the story
- **Make GM moves with purpose**: Use soft moves to build tension, hard moves for consequences
- **Manage the Fear economy**: Spend Fear to interrupt, activate features, or raise stakes

## Dice Rolling

### Player Action Rolls (2d12 Hope & Fear)
When the player attempts something risky:
1. `narrate()` the situation and stakes
2. `roll_dice(2, "d12")` — first result = Hope die, second = Fear die
3. Add the player's trait modifier to the HIGHER die for the total
4. Interpret and `narrate()` the result:
   - **Hope die higher**: Success favors the player—grant a Hope token
   - **Fear die higher**: You gain a Fear token—narrate a complication
   - **Doubles**: Critical! High = extraordinary success; low = dramatic failure

### GM Rolls (d20)
For enemy attacks: `roll_dice(1, "d20")` vs player's Evasion
For damage: `roll_dice(X, "dY")` as specified by the attack

## Tone
- Fantasy adventure suitable for all ages
- Violence can be dramatic but not gratuitous
- Emphasize heroism, wonder, and discovery

## Reference Materials
- <daggerheart_rules> for mechanics and rules
- <campaign_material> for story, NPCs, and encounters
- <player_character> for Marlowe's stats and abilities
""",
)


@agent.tool_plain
def roll_dice(dice_count: int, dice_type: DiceType) -> DiceRollResult:
    """Roll dice and return the results.

    You may call narrate() BEFORE this to describe the setup, but you MUST STOP
    after this roll and WAIT for the result before narrating what happens.

    Args:
        dice_count: Number of dice to roll (e.g., 2 for rolling two dice)
        dice_type: Type of die to roll (d4, d6, d8, d10, d12, d20, or d100)
    """
    sides = DICE_SIDES[dice_type]
    rolls = [random.randint(1, sides) for _ in range(dice_count)]
    result = DiceRollResult(dice_type=dice_type, rolls=rolls, total=sum(rolls))

    # Display the roll
    if len(rolls) == 1:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls[0]}"
        click.echo(result_str)
    elif len(rolls) == 2 and dice_type == "d12":
        # Special formatting for Hope/Fear dice
        hope, fear = rolls
        result_str = f"🎲 [2d12 Duality Dice] → Hope:{hope} Fear:{fear}"
        click.echo(result_str)
    else:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {result.total}"
        click.echo(result_str)

    return result_str


@agent.tool_plain
def narrate(narration: str) -> None:
    """Output narrative text to the player.

    Use this tool for ALL narrative output: scene descriptions, NPC dialogue,
    action descriptions, and outcome narration. Call multiple times to interleave
    narration with dice rolls.

    Args:
        narration: The narrative text to display to the player.
    """
    click.echo(narration)


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
                message_history=message_history,
            )

            # Show token changes from the GM's turn
            turn_result: EndGameMasterTurn = result.output
            if turn_result.fear_tokens_gained > 0:
                click.echo(
                    f"😈 GM gains {turn_result.fear_tokens_gained} Fear token(s)"
                )
            if turn_result.hope_tokens_granted > 0:
                click.echo(
                    f"✨ You gain {turn_result.hope_tokens_granted} Hope token(s)"
                )

            # Update message history with all messages from this interaction
            message_history = result.all_messages()

            # Store result for cost calculation
            result_for_cost = result
        except Exception as e:
            click.echo(f"❌ Error: {e}", err=True)

        click.echo()  # Add blank line for readability

        # Calculate and log cost for this run (logging handled by calculate_run_cost)
        run_cost, *_ = calculate_run_cost(
            result_for_cost, model_name, provider_id="openrouter"
        )

        # Track session total
        if run_cost is not None and run_cost > 0:
            session_total_cost += run_cost
            logger.info(f"Session total cost: ${session_total_cost:.6f}")


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
