"""Core turn execution — streams SSE events as the agent runs."""

import asyncio
import os
import uuid
from collections.abc import AsyncGenerator

from loguru import logger
from pydantic_ai import DeferredToolRequests, DeferredToolResults

from agent.compaction import maybe_compact
from agent.runner import run_agent_iter
from api.autosave import autosave_session
from api.enrichment import build_pending_action
from api.narration_sanitize import extract_leaked_ask_player_roll
from api.snapshot import snapshot_dict
from api.transcript_log import append_message, append_roll_prompt
from game.session import PendingDeferred, Session

# Must match frontend CAMPAIGN_OPENING_PROMPT / CAMPAIGN_RESUME_PROMPT.
# Those are sent without a player bubble and must not appear on reload.
_HIDDEN_PLAYER_PREFIXES = (
    "Begin the campaign.",
    "The player is resuming a mid-campaign playthrough.",
)


def _queue_run_event(queue: asyncio.Queue):
    """Forward run events (thinking, narration deltas) onto the session's SSE queue.

    The callback carries the same (event_type, payload) shape the queue does, so most events
    pass straight through; thinking is additionally mirrored to the server log, as before.
    """

    def on_event(event_type: str, payload: dict) -> None:
        if event_type == "thinking":
            logger.info(f"\033[90m💭 {payload.get('text', '')}\033[0m")
        queue.put_nowait((event_type, payload))

    return on_event


#: Events that end a turn from the player's point of view.
_TURN_TERMINAL = ("complete", "pending_action", "error")


async def _drain_resolving_narrations(
    queue: asyncio.Queue,
) -> AsyncGenerator[tuple[str, dict]]:
    """Yield queued events, guaranteeing every narration this turn painted is resolved.

    A `narration_delta` paints provisional text in the client; only a `narration` (settle) or
    `narration_discard` carrying the same ``tool_call_id`` can take it back. Everything
    upstream is best-effort about that pairing: the deltas are keyed by the id captured when
    the tool-call part started, while the settle is keyed by the id ``narrate()`` receives,
    and a call the provider abandons before the tool runs is never resolved by anyone.

    An unresolved bubble does not vanish — it stands next to the real narration until the
    client's end-of-turn sweep, which is how one action ends up showing two GM narrations.
    Closing the ids out here bounds that to the turn that opened them, whatever went wrong
    upstream. A discard for a narration that did settle is a no-op in every client, so the
    sweep is safe to run unconditionally.
    """
    # A dict, not a set, so the retractions and the warning follow the order the narrations
    # were painted in.
    open_ids: dict[str, None] = {}
    while True:
        event = await queue.get()
        if event is None:
            break
        event_type, payload = event

        if event_type == "narration_delta":
            open_ids[payload.get("tool_call_id")] = None
        elif event_type in ("narration", "narration_discard"):
            open_ids.pop(payload.get("tool_call_id"), None)
        elif event_type in _TURN_TERMINAL and open_ids:
            logger.warning(
                f"Narration never settled or discarded: {list(open_ids)} — "
                "retracting before the turn ends"
            )
            for tool_call_id in open_ids:
                yield ("narration_discard", {"tool_call_id": tool_call_id})
            open_ids.clear()

        yield event


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
    autosave_session(session)
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
        autosave_session(session)
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
        autosave_session(session)
        queue.put_nowait(
            (
                "complete",
                {
                    "game_state": snapshot_dict(session),
                    "internal_notes": internal_notes,
                },
            )
        )


def _should_log_player_message(text: str) -> bool:
    stripped = text.strip()
    return bool(stripped) and not stripped.startswith(_HIDDEN_PLAYER_PREFIXES)


async def stream_turn(
    session: Session, player_message: str
) -> AsyncGenerator[tuple[str, dict]]:
    """Run a player-message turn, yielding (event_type, data) tuples as SSE events."""
    if _should_log_player_message(player_message):
        append_message(session, role="player", content=player_message)

    queue: asyncio.Queue[tuple[str, dict] | None] = asyncio.Queue()
    gs = session.game_state
    gs.narrations.clear()
    gs._leaked_roll_args = None
    gs._event_queue = queue
    gs._session = session

    # Hard cap so a hung provider cannot hold session.lock forever and block
    # every later turn for this session (frontend stuck on "GM is thinking").
    turn_timeout = int(os.getenv("TURN_TIMEOUT_SECONDS", "180"))

    async def run():
        try:
            async with session.lock:
                result = await asyncio.wait_for(
                    run_agent_iter(
                        deps=gs,
                        message_history=session.message_history,
                        user_prompt=player_message,
                        on_event=_queue_run_event(queue),
                    ),
                    timeout=turn_timeout,
                )
                _handle_result(session, result, queue)
                # Compact under the lock — before any next-turn request can read
                # the pre-compaction history. The complete event is already queued,
                # so summarizer latency stays off the player-visible response.
                await maybe_compact(session, result)
        except TimeoutError:
            logger.error(f"Turn timed out after {turn_timeout}s")
            queue.put_nowait(
                (
                    "error",
                    {
                        "message": (
                            f"GM turn timed out after {turn_timeout}s — "
                            "try again."
                        )
                    },
                )
            )
        except Exception as e:
            logger.error(f"Turn error: {e}")
            queue.put_nowait(("error", {"message": str(e)}))
        finally:
            gs._event_queue = None
            gs._session = None
            queue.put_nowait(None)

    task = asyncio.create_task(run())

    async for event in _drain_resolving_narrations(queue):
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
    # Same back-reference the fresh-turn path sets: tools append combat and roll rows to the
    # transcript through it, and a deferred resume runs the same tools.
    gs._session = session

    deferred_results = DeferredToolResults()
    for call_info in session.pending_deferred.deferred_calls:
        deferred_results.calls[call_info["tool_call_id"]] = roll_result_str

    turn_timeout = int(os.getenv("TURN_TIMEOUT_SECONDS", "180"))

    async def run():
        try:
            async with session.lock:
                result = await asyncio.wait_for(
                    run_agent_iter(
                        deps=gs,
                        message_history=session.pending_deferred.messages_snapshot,
                        deferred_tool_results=deferred_results,
                        on_event=_queue_run_event(queue),
                    ),
                    timeout=turn_timeout,
                )
                _handle_result(session, result, queue)
                await maybe_compact(session, result)
        except TimeoutError:
            logger.error(f"Deferred turn timed out after {turn_timeout}s")
            queue.put_nowait(
                (
                    "error",
                    {
                        "message": (
                            f"GM turn timed out after {turn_timeout}s — "
                            "try again."
                        )
                    },
                )
            )
        except Exception as e:
            logger.error(f"Turn error: {e}")
            queue.put_nowait(("error", {"message": str(e)}))
        finally:
            gs._event_queue = None
            gs._session = None
            queue.put_nowait(None)

    task = asyncio.create_task(run())

    async for event in _drain_resolving_narrations(queue):
        yield event

    await task
