"""Core turn execution — streams SSE events as the agent runs."""

import asyncio
from collections.abc import AsyncGenerator

from loguru import logger
from pydantic_ai import Agent, DeferredToolRequests, DeferredToolResults
from pydantic_ai.messages import ThinkingPart

import agent as agent_mod
from agent import agent
from models import EndGameMasterTurn
from schemas import GameStateSnapshot, PendingAction
from session import PendingDeferred, Session


def _snapshot(session: Session) -> dict:
    gs = session.game_state
    return GameStateSnapshot(
        character=gs.pc,
        enemies=gs.enemies,
        countdowns=gs.countdowns,
        in_combat=gs.in_combat,
    ).model_dump()


def _handle_result(session: Session, result, queue: asyncio.Queue):
    """Process the agent result and push the final event onto the queue."""
    if isinstance(result.output, DeferredToolRequests):
        session.message_history = result.all_messages()
        calls_info = []
        for call in result.output.calls:
            calls_info.append(
                {
                    "tool_call_id": call.tool_call_id,
                    "tool_name": call.tool_name,
                    "args": call.args_as_dict(),
                }
            )
        session.pending_deferred = PendingDeferred(
            messages_snapshot=result.all_messages(),
            deferred_calls=calls_info,
        )

        first = calls_info[0]
        args = first["args"]
        pending = PendingAction(
            action_type=first["tool_name"],
            dice_count=args.get("dice_count", 1),
            dice_type=args.get("dice_type", "d20"),
            purpose=args.get("purpose", ""),
            tool_call_id=first["tool_call_id"],
        )
        queue.put_nowait(
            (
                "pending_action",
                {
                    "pending_action": pending.model_dump(),
                    "game_state": _snapshot(session),
                },
            )
        )
    else:
        internal_notes = None
        if isinstance(result.output, EndGameMasterTurn):
            internal_notes = result.output.internal_notes
        session.message_history = result.all_messages()
        session.pending_deferred = None
        queue.put_nowait(
            (
                "complete",
                {
                    "game_state": _snapshot(session),
                    "internal_notes": internal_notes,
                },
            )
        )


async def stream_turn(
    session: Session, player_message: str
) -> AsyncGenerator[tuple[str, dict]]:
    """Run a player-message turn, yielding (event_type, data) tuples as SSE events."""
    queue: asyncio.Queue[tuple[str, dict] | None] = asyncio.Queue()
    gs = session.game_state
    gs.narrations.clear()
    gs._event_queue = queue

    async def run():
        try:
            async with agent.iter(
                user_prompt=player_message,
                deps=gs,
                message_history=session.message_history,
                model_settings=agent_mod.model_settings,
            ) as agent_run:
                async for node in agent_run:
                    if Agent.is_call_tools_node(node):
                        for part in node.model_response.parts:
                            if isinstance(part, ThinkingPart) and part.has_content():
                                logger.info(f"\033[90m💭 {part.content}\033[0m")
                                queue.put_nowait(
                                    ("thinking", {"text": part.content})
                                )

            _handle_result(session, agent_run.result, queue)
        except Exception as e:
            logger.error(f"Turn error: {e}")
            queue.put_nowait(("error", {"message": str(e)}))
        finally:
            gs._event_queue = None
            queue.put_nowait(None)

    task = asyncio.create_task(run())

    while True:
        event = await queue.get()
        if event is None:
            break
        yield event

    await task


async def stream_deferred_response(
    session: Session, roll_result_str: str
) -> AsyncGenerator[tuple[str, dict]]:
    """Resume the agent after a player dice roll, yielding SSE events."""
    if session.pending_deferred is None:
        raise ValueError("No pending deferred action on this session.")

    queue: asyncio.Queue[tuple[str, dict] | None] = asyncio.Queue()
    gs = session.game_state
    gs.narrations.clear()
    gs._event_queue = queue

    deferred_results = DeferredToolResults()
    for call_info in session.pending_deferred.deferred_calls:
        deferred_results.calls[call_info["tool_call_id"]] = roll_result_str

    async def run():
        try:
            is_first_call_tools_node = True
            async with agent.iter(
                deps=gs,
                message_history=session.pending_deferred.messages_snapshot,
                model_settings=agent_mod.model_settings,
                deferred_tool_results=deferred_results,
            ) as agent_run:
                async for node in agent_run:
                    if Agent.is_call_tools_node(node):
                        if is_first_call_tools_node:
                            is_first_call_tools_node = False
                            continue
                        for part in node.model_response.parts:
                            if isinstance(part, ThinkingPart) and part.has_content():
                                logger.info(f"\033[90m💭 {part.content}\033[0m")
                                queue.put_nowait(
                                    ("thinking", {"text": part.content})
                                )

            _handle_result(session, agent_run.result, queue)
        except Exception as e:
            logger.error(f"Turn error: {e}")
            queue.put_nowait(("error", {"message": str(e)}))
        finally:
            gs._event_queue = None
            queue.put_nowait(None)

    task = asyncio.create_task(run())

    while True:
        event = await queue.get()
        if event is None:
            break
        yield event

    await task
