"""Core turn execution — streams SSE events as the agent runs."""

import asyncio
from collections.abc import AsyncGenerator

from loguru import logger
from pydantic_ai import DeferredToolRequests, DeferredToolResults

from agent_runner import run_agent_iter
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
            def on_thinking(text: str):
                logger.info(f"\033[90m💭 {text}\033[0m")
                queue.put_nowait(("thinking", {"text": text}))

            result = await run_agent_iter(
                deps=gs,
                message_history=session.message_history,
                user_prompt=player_message,
                on_thinking=on_thinking,
            )
            _handle_result(session, result, queue)
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
            def on_thinking(text: str):
                logger.info(f"\033[90m💭 {text}\033[0m")
                queue.put_nowait(("thinking", {"text": text}))

            result = await run_agent_iter(
                deps=gs,
                message_history=session.pending_deferred.messages_snapshot,
                deferred_tool_results=deferred_results,
                on_thinking=on_thinking,
            )
            _handle_result(session, result, queue)
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
