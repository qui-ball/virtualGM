"""CLI entry point — preserves the original interactive chat loop."""

from __future__ import annotations

import asyncio
from pathlib import Path

import click
from loguru import logger
from pydantic_ai import DeferredToolRequests, DeferredToolResults

import agent as agent_mod
from agent import gm_agent, run_agent_iter
from agent.tools import handle_ask_player_roll
from game.models import GameState, create_player_character
from recording import Recorder


# ANSI color codes for terminal output
class Colors:
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    LIGHT_BLACK = "\033[90m"
    RESET = "\033[0m"


async def run_chat(*, record: bool = False):
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
    game_state.campaign_dir = str(
        Path(__file__).parent / "campaigns" / "LostMineOfPhandelverAdapted"
    )

    logger.info(
        f"Character loaded: {game_state.pc.name} (Level {game_state.pc.level} {game_state.pc.character_class})"
    )
    logger.info("")

    message_history = []

    recorder: Recorder | None = None
    if record:
        recorder = Recorder()
        logger.info(f"Recording to {recorder.path}")

    try:
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
                    def on_thinking(text: str):
                        logger.info(
                            f"{Colors.LIGHT_BLACK}💭 {text}{Colors.RESET}"
                        )

                    result = await run_agent_iter(
                        deps=game_state,
                        message_history=message_history,
                        user_prompt=current_input,
                        deferred_tool_results=deferred_results,
                        on_thinking=on_thinking,
                    )

                    # Check if we have deferred tool requests (player interaction needed)
                    if isinstance(result.output, DeferredToolRequests):
                        # Update message history with the deferred tool call
                        message_history = result.all_messages()
                        deferred_results = DeferredToolResults()

                        for call in result.output.calls:
                            args = call.args_as_dict()

                            if call.tool_name == "ask_player_roll":
                                # Handle player dice roll
                                logger.info(
                                    f"🎲 {args.get('purpose', 'Roll')} — "
                                    f"{args['dice_count']}{args['dice_type']}"
                                )
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
                        # Normal completion — output is the GM's internal notes string
                        if isinstance(result.output, str) and result.output:
                            logger.info(f"GM notes: {result.output}")

                        prev_len = len(message_history)
                        # Update message history with all messages from this interaction
                        message_history = result.all_messages()

                        if recorder:
                            recorder.record_turn(
                                all_messages=message_history,
                                game_state=game_state,
                                narrations=list(game_state.narrations),
                                model_name=agent_mod.MODEL_NAME,
                                user_input=user_input,
                                new_message_start_idx=prev_len,
                            )
                        break

            except Exception as e:
                logger.error(f"Error: {e}")

            logger.info("")
    finally:
        if recorder:
            recorder.close()
            logger.info(f"Session recorded: {recorder.path}")


@click.command()
@click.option(
    "--model",
    "-m",
    type=click.Choice(list(agent_mod.MODEL_PRESETS.keys()), case_sensitive=False),
    default=None,
    help="Model preset to use.",
)
@click.option(
    "--record",
    "-r",
    is_flag=True,
    default=False,
    help="Record raw conversation data to recordings/ for dataset generation.",
)
def main(model: str | None, record: bool):
    if model:
        agent_mod.active_model = model
        agent_mod.MODEL_NAME, agent_mod.OPENROUTER_PROVIDER = (
            agent_mod.MODEL_PRESETS[model]
        )
        gm_agent.model = f"openrouter:{agent_mod.MODEL_NAME}"  # type: ignore[assignment]
        agent_mod.model_settings = agent_mod.build_model_settings(
            agent_mod.OPENROUTER_PROVIDER
        )
    asyncio.run(run_chat(record=record))


if __name__ == "__main__":
    main()
