"""Basic Pydantic AI agent implementation for LLM GM testing."""

import asyncio
import os
from pathlib import Path

import click
import dotenv
import httpx
import logfire
from loguru import logger
from openai import AsyncOpenAI
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider

from utils.caching import CacheInjectingTransport
from utils.cost import calculate_run_cost


dotenv.load_dotenv()

# Configure loguru logging level
# Set LOGURU_LEVEL environment variable to control logging (default: INFO, set to DEBUG to see debug messages)
loguru_level = os.getenv("LOGURU_LEVEL", "DEBUG").upper()
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

# Initialize the OpenRouter model with custom transport for Anthropic caching
# Available DeepSeek models on OpenRouter via Fireworks:
# - deepseek/deepseek-chat-v3.1 (V3.1 - recommended)
# - deepseek/deepseek-chat-v3-0324 (V3 March 2024 checkpoint)
# - deepseek/deepseek-r1-0528 (R1 reasoning model)
model_name = "deepseek/deepseek-chat-v3.1"
# model_name = "anthropic/claude-haiku-4.5"

# Create custom HTTP client with cache control injection
http_client = httpx.AsyncClient(transport=CacheInjectingTransport())
openai_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
    http_client=http_client,
)

# Create OpenRouter model with cache-injecting client
model = OpenRouterModel(
    model_name,
    provider=OpenRouterProvider(openai_client=openai_client),
)

# Create an agent with the OpenRouter model
# The CacheControlTransport automatically injects cache_control into system messages
agent = Agent(
    model,
    deps_type=str,
    instructions="""You are a game master (GM) for Daggerheart, running a solo campaign.

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
- **Ask questions and incorporate answers**: Invite the player to co-create details ("What does your spell look like?" "How do you feel about this?")
- **Play to find out**: Don't predetermine outcomes—let dice and player choices shape the story
- **Make GM moves with purpose**: Use soft moves to build tension, hard moves for consequences
- **Manage the Fear economy**: Spend Fear to interrupt, activate features, or raise stakes at dramatic moments

## Handling Dice Rolls
When a roll is needed:
1. Describe the situation and stakes
2. Tell the player which trait to roll (e.g., "Make a Presence roll")
3. State the difficulty if appropriate
4. Ask for the total AND which die (Hope or Fear) was higher
5. Narrate the outcome, applying Hope/Fear consequences

## Combat Flow
- Describe enemy positions and the environment
- Prompt the player for their action each turn
- Roll enemy attacks against the PC's Evasion
- Narrate damage cinematically, then state mechanical effects

## Tone
- Fantasy adventure suitable for all ages
- Violence can be dramatic but not gratuitous
- Emphasize heroism, wonder, and discovery

## Reference Materials
Consult these sections as needed:
- <daggerheart_rules> for mechanics and rules
- <campaign_material> for story, NPCs, and encounters
- <player_character> for Marlowe's stats and abilities
""",
)


@agent.instructions
def add_daggerheart_rules() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "daggerheart_rules.md"
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
    """Async chat loop with streaming responses."""
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

        # Run the agent with streaming
        click.echo("\n🤖 Game Master:")
        result_for_cost = None
        try:
            async with agent.run_stream(
                user_input,
                message_history=message_history,
            ) as result:
                # Stream text as it's generated (delta=True for incremental chunks)
                async for chunk in result.stream_text(delta=True):
                    print(chunk, end="", flush=True)
                print()  # Newline after streaming completes

                # Update message history with all messages from this interaction
                message_history = result.all_messages()

                # Store result for cost calculation after streaming
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


@click.command()
def main():
    asyncio.run(run_chat())


if __name__ == "__main__":
    main()
