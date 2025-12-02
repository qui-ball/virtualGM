"""Basic Pydantic AI agent implementation for LLM GM testing."""

import asyncio
import os
from pathlib import Path

import click
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider

import dotenv
import logfire


dotenv.load_dotenv()

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

# Initialize the OpenRouterModel
# You can change the model to any OpenRouter-supported model like:
# 'gpt-4o', 'gpt-4-turbo', 'claude-3-opus', 'anthropic/claude-3-opus', etc.
# model_name = "anthropic/claude-haiku-4.5"
model_name = "deepseek/deepseek-chat-v3-0324"
model = OpenRouterModel(
    model_name,  # Model name (OpenRouter supports many models)
    provider=OpenRouterProvider(api_key=api_key),
)

# Create an agent with the OpenRouter model
# Define dependency type (optional, for passing context to dynamic prompts)
# Set system instructions telling the agent it's a game master
agent = Agent(
    model,
    deps_type=str,
    instructions="""You are a game master (GM) for Daggerheart, a tabletop role-playing game. 
Your role is to narrate the story, control non-player characters, 
adjudicate Daggerheart rules (including Duality Dice, Hope & Fear mechanics, GM Moves, and combat), 
and create an engaging experience for the players. 
You are familiar with Daggerheart's unique mechanics including Hope and Fear dice, 
Experience tags, Hope Features, Fear Features, and the various GM Moves (soft and hard moves).

Refer to the following material to help you:
- <daggerheart_rules> for the Daggerheart rules
- <campaign_material> for the campaign material
- <player_character> for the player character
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

    # Prime the conversation history with the opening scene
    gm_opening = """This evening, you finally made it to the Sablewood—a sprawling forest filled with colossal trees some say are even older than the Forgotten Gods. Sablewood is renowned for two things: its sunken trade routes, traveled by countless merchants, and its unique, hybrid animals. Even now, from within your carriage, strange sounds drift in: the low calls of lark-moths, the croak of lemur-toads, the scittering of a family of fox-bats in the underbrush.

You've noticed something unique about the look of the trees here in the Sablewood. What is it?
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

    while True:
        # Get user input
        user_input = input("You: ").strip()

        # Check for exit commands
        if user_input.lower() in ("exit", "quit", "q"):
            click.echo("\n👋 Goodbye!")
            break

        if not user_input.strip():
            continue

        # Run the agent with streaming
        click.echo("\n🤖 Game Master:")
        try:
            async with agent.run_stream(
                user_input, message_history=message_history
            ) as result:
                # Stream text as it's generated (delta=True for incremental chunks)
                async for chunk in result.stream_text(delta=True):
                    print(chunk, end="", flush=True)
                print()  # Newline after streaming completes

                # Update message history with all messages from this interaction
                message_history = result.all_messages()
        except Exception as e:
            click.echo(f"❌ Error: {e}", err=True)

        click.echo()  # Add blank line for readability


@click.command()
def main():
    asyncio.run(run_chat())


if __name__ == "__main__":
    main()
