"""CLI entry point — preserves the original interactive chat loop."""

import asyncio

import click
from loguru import logger
from pydantic_ai import Agent, DeferredToolRequests, DeferredToolResults
from pydantic_ai.messages import ThinkingPart

import agent as agent_mod
from agent import agent
from models import EndGameMasterTurn, GameState, create_player_character
from tools import handle_ask_player_roll


# ANSI color codes for terminal output
class Colors:
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    LIGHT_BLACK = "\033[90m"
    RESET = "\033[0m"


async def run_chat():
    """Async chat loop."""
    logger.info("🎮 Virtual GM - Custom Ruleset")
    logger.info("=" * 50)
    provider_info = (
        f" via {agent_mod.OPENROUTER_PROVIDER}"
        if agent_mod.OPENROUTER_PROVIDER
        else ""
    )
    logger.info(f"Model: {agent_mod.MODEL_NAME}{provider_info}")
    logger.info("Type 'exit' or 'quit' to end")
    logger.info("=" * 50)
    logger.info("")

    # Initialize game state with pre-generated character
    game_state = GameState()
    game_state.pc = create_player_character()

    logger.info(
        f"Character loaded: {game_state.pc.name} (Level {game_state.pc.level} {game_state.pc.character_class})"
    )
    logger.info("")

    message_history = []

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ("exit", "quit", "q"):
            logger.info("\n👋 Goodbye!")
            break

        if not user_input:
            continue

        logger.info("\n🤖 Game Master:")
        try:
            current_input: str | None = user_input
            deferred_results = None

            while True:
                run_kwargs: dict = dict(
                    deps=game_state,
                    message_history=message_history,
                    model_settings=agent_mod.model_settings,
                )
                if deferred_results is not None:
                    run_kwargs["deferred_tool_results"] = deferred_results
                if current_input:
                    run_kwargs["user_prompt"] = current_input

                is_first_call_tools_node = deferred_results is not None
                async with agent.iter(**run_kwargs) as agent_run:
                    async for node in agent_run:
                        if Agent.is_call_tools_node(node):
                            if is_first_call_tools_node:
                                is_first_call_tools_node = False
                                continue
                            for part in node.model_response.parts:
                                if (
                                    isinstance(part, ThinkingPart)
                                    and part.has_content()
                                ):
                                    logger.info(
                                        f"{Colors.LIGHT_BLACK}💭 {part.content}{Colors.RESET}"
                                    )

                result = agent_run.result

                # Check if we have deferred tool requests (player interaction needed)
                if isinstance(result.output, DeferredToolRequests):
                    # Update message history with the deferred tool call
                    message_history = result.all_messages()
                    deferred_results = DeferredToolResults()

                    for call in result.output.calls:
                        args = call.args_as_dict()

                        if call.tool_name == "ask_player_roll":
                            # Handle player dice roll
                            result_str = handle_ask_player_roll(args, game_state)
                        else:
                            logger.error(f"Unknown deferred tool: {call.tool_name}")
                            result_str = (
                                f"Error: Unknown deferred tool {call.tool_name}"
                            )

                        deferred_results.calls[call.tool_call_id] = result_str

                    # Continue the run with the player's results (no new user input needed)
                    current_input = None
                    continue
                else:
                    # Normal completion
                    if isinstance(result.output, EndGameMasterTurn):
                        if result.output.internal_notes:
                            logger.debug(f"GM notes: {result.output.internal_notes}")

                    # Update message history with all messages from this interaction
                    message_history = result.all_messages()
                    break

        except Exception as e:
            logger.error(f"Error: {e}")

        logger.info("")


@click.command()
@click.option(
    "--model",
    "-m",
    type=click.Choice(list(agent_mod.MODEL_PRESETS.keys()), case_sensitive=False),
    default=None,
    help="Model preset to use.",
)
def main(model: str | None):
    if model:
        agent_mod.active_model = model
        agent_mod.MODEL_NAME, agent_mod.OPENROUTER_PROVIDER = (
            agent_mod.MODEL_PRESETS[model]
        )
        agent.model = f"openrouter:{agent_mod.MODEL_NAME}"  # type: ignore[assignment]
        agent_mod.model_settings = agent_mod.build_model_settings(
            agent_mod.OPENROUTER_PROVIDER
        )
    asyncio.run(run_chat())


if __name__ == "__main__":
    main()
