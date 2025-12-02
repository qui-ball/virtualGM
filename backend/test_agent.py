"""Minimal Pydantic AI agent example for LLM GM testing."""

import os
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


api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise ValueError("Please set OPENROUTER_API_KEY environment variable")
model = OpenRouterModel(
    "anthropic/claude-haiku-4.5",
    provider=OpenRouterProvider(api_key=api_key),
)
agent = Agent(
    model,
    instructions="You are a helpful assistant.",
)


@agent.system_prompt
def add_user_name(ctx) -> str:
    return "The user's name is Bilun."


def main():
    result = agent.run_sync("Hello, what is my name?")
    print("\n🤖 Assistant:", result.output, "\n")


if __name__ == "__main__":
    main()
