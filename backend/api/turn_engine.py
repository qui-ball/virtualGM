"""Core turn execution — streams SSE events as the agent runs."""

import asyncio
import uuid
from collections.abc import AsyncGenerator

from loguru import logger
from pydantic_ai import DeferredToolRequests, DeferredToolResults

from agent.runner import run_agent_iter
from api.enrichment import build_pending_action
from api.narration_sanitize import extract_leaked_ask_player_roll
from api.snapshot import snapshot_dict
from api.transcript_log import append_roll_prompt
from game.session import PendingDeferred, Session


def _try_recover_leaked_roll(
    session: Session,
    result,
    queue: asyncio.Queue,
) -> bool:
    """Some models embed ask_player_roll markup inside narrate() instead of calling the tool."""
    gs = session.game_state
    leaked = gs._leaked_roll_args
    if leaked is None:
        for narration in gs.narrations:
            _, args = extract_leaked_ask_player_roll(narration)
            if args is not None:
                leaked = args
                break
    if leaked is None:
        return False

    tool_call_id = f"leaked-{uuid.uuid4().hex[:12]}"
    calls_info = [
        {
            "tool_call_id": tool_call_id,
            "tool_name": "ask_player_roll",
            "args": leaked,
        }
    ]
    session.pending_deferred = PendingDeferred(
        messages_snapshot=result.all_messages(),
        deferred_calls=calls_info,
    )
    pending = build_pending_action(
        "ask_player_roll",
        tool_call_id,
        leaked,
        session.game_state,
    )
    append_roll_prompt(session, pending)
    session.message_history = result.all_messages()
    gs._leaked_roll_args = None
    queue.put_nowait(
        (
            "pending_action",
            {
                "pending_action": pending.model_dump(),
                "game_state": snapshot_dict(session),
            },
        )
    )
    return True


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
        pending = build_pending_action(
            first["tool_name"],
            first["tool_call_id"],
            args,
            session.game_state,
        )
        append_roll_prompt(session, pending)
        queue.put_nowait(
            (
                "pending_action",
                {
                    "pending_action": pending.model_dump(),
                    "game_state": snapshot_dict(session),
                },
            )
        )
    else:
        if _try_recover_leaked_roll(session, result, queue):
            return
        internal_notes = result.output if isinstance(result.output, str) else None
        session.message_history = result.all_messages()
        session.pending_deferred = None
        queue.put_nowait(
            (
                "complete",
                {
                    "game_state": snapshot_dict(session),
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
    gs._leaked_roll_args = None
    gs._event_queue = queue
    gs._session = session

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
            gs._session = None
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
    gs._leaked_roll_args = None
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
            gs._session = None
            queue.put_nowait(None)

    task = asyncio.create_task(run())

    while True:
        event = await queue.get()
        if event is None:
            break
        yield event

    await task
