"""Shared agent iteration logic with retry and thinking extraction."""

import asyncio
from collections.abc import Callable

from loguru import logger
from pydantic_ai import Agent, DeferredToolResults
from pydantic_ai.messages import ThinkingPart

import agent.definition as agent_mod
from agent.definition import agent
from game.models import GameState


async def run_agent_iter(
    deps: GameState,
    message_history: list,
    user_prompt: str | None = None,
    deferred_tool_results: DeferredToolResults | None = None,
    on_thinking: Callable[[str], None] | None = None,
):
    """Run agent.iter() with retry logic, returning the agent run result.

    Callers inspect result.output for DeferredToolRequests vs EndGameMasterTurn.
    """
    run_kwargs: dict = dict(
        deps=deps,
        message_history=message_history,
        model_settings=agent_mod.model_settings,
    )
    if deferred_tool_results is not None:
        run_kwargs["deferred_tool_results"] = deferred_tool_results
    if user_prompt is not None:
        run_kwargs["user_prompt"] = user_prompt

    for attempt in range(agent_mod.MAX_RETRIES):
        try:
            is_first_call_tools_node = deferred_tool_results is not None
            async with agent.iter(**run_kwargs) as agent_run:
                async for node in agent_run:
                    if Agent.is_call_tools_node(node):
                        if is_first_call_tools_node:
                            is_first_call_tools_node = False
                            continue
                        for part in node.model_response.parts:
                            if isinstance(part, ThinkingPart) and part.has_content():
                                if on_thinking:
                                    on_thinking(part.content)
            return agent_run.result
        except Exception as e:
            error_str = str(e)
            is_transient = (
                "validation error" in error_str.lower()
                and ("input_value=None" in error_str or "'error'" in error_str)
            ) or "Server Error" in error_str
            if is_transient and attempt < agent_mod.MAX_RETRIES - 1:
                delay = agent_mod.RETRY_BASE_DELAY * (2**attempt)
                logger.warning(
                    f"Transient error (attempt {attempt + 1}/{agent_mod.MAX_RETRIES}), "
                    f"retrying in {delay:.0f}s..."
                )
                await asyncio.sleep(delay)
                continue
            raise
