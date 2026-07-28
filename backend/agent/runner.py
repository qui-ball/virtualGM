"""Shared agent execution: retry, plus translation of run events into app callbacks."""

import asyncio
from collections.abc import AsyncIterable, Callable

from loguru import logger
from pydantic_ai import DeferredToolResults
from pydantic_ai.messages import (
    AgentStreamEvent,
    PartDeltaEvent,
    PartEndEvent,
    PartStartEvent,
    ThinkingPart,
    ThinkingPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
)

import agent.definition as agent_mod
from agent.definition import gm_agent
from agent.narration_stream import NarrationStream
from game.models import GameState

# The only tool whose arguments are read for display. Everything else streams past untouched.
NARRATE_TOOL = "narrate"

# Callbacks receive the same (event_type, payload) shape the SSE queue carries, so the API
# layer can forward them straight through and the CLI can print them.
EventCallback = Callable[[str, dict], None]


class AgentEventStream:
    """Translate pydantic-ai run events into (event_type, payload) callbacks.

    One instance per agent run. pydantic-ai invokes the handler once per graph node, so state
    that must survive across nodes lives on the instance rather than in a local.

    Thinking is accumulated from `ThinkingPartDelta` and emitted whole at `PartEndEvent`,
    preserving the one-callback-per-thinking-block contract the CLI and SSE consumers already
    expect. Sourcing it from the model-request node is what let the old
    `is_first_call_tools_node` workaround go: a replayed call-tools node emits only
    `HandleResponseEvent`s — never part events — so the deferred-resume duplication that flag
    guarded against cannot occur.

    Narration is read the same way, from `narrate()`'s in-flight arguments, and emitted as
    cumulative `narration_delta` events. It is only ever *provisional*: the tool has not run
    yet, so it may still be sanitized differently, dropped, or vetoed. `narrate()` itself
    emits the settle (`narration`) or discard (`narration_discard`) that resolves it — see
    KTD3.
    """

    def __init__(self, on_event: EventCallback | None = None) -> None:
        self._on_event = on_event
        self._thinking: dict[int, str] = {}
        # Part index -> tool call id, for the narrate() calls in this run. Providers may leave
        # tool_call_id off a delta, so the id captured at part start is the fallback.
        self._narrate_calls: dict[int, str] = {}
        self._narration = NarrationStream()

    async def __call__(
        self, ctx, stream: AsyncIterable[AgentStreamEvent]
    ) -> None:
        """The `event_stream_handler` entry point pydantic-ai calls per node."""
        await self.handle(stream)

    async def handle(self, events: AsyncIterable[AgentStreamEvent]) -> None:
        """Consume one node's event stream. Drivable with synthetic events in tests."""
        async for event in events:
            self.handle_event(event)

    def handle_event(self, event: AgentStreamEvent) -> None:
        if isinstance(event, PartStartEvent):
            self._on_part_start(event)
        elif isinstance(event, PartDeltaEvent):
            self._on_part_delta(event)
        elif isinstance(event, PartEndEvent):
            content = self._thinking.pop(event.index, None)
            if content:
                self.emit("thinking", {"text": content})

    def _on_part_start(self, event: PartStartEvent) -> None:
        # A repeated start for an index fully replaces the previous part, so clear both maps.
        self._thinking.pop(event.index, None)
        self._narrate_calls.pop(event.index, None)

        part = event.part
        if isinstance(part, ThinkingPart):
            self._thinking[event.index] = part.content or ""
        elif isinstance(part, ToolCallPart) and part.tool_name == NARRATE_TOOL:
            self._narrate_calls[event.index] = part.tool_call_id
            # A tool call whose name arrived late is emitted as a start event carrying every
            # argument fragment seen so far — feed them or the opening text is lost.
            self._reveal(part.tool_call_id, part.args)

    def _on_part_delta(self, event: PartDeltaEvent) -> None:
        delta = event.delta
        if isinstance(delta, ThinkingPartDelta):
            if delta.content_delta:
                self._thinking[event.index] = (
                    self._thinking.get(event.index, "") + delta.content_delta
                )
        elif isinstance(delta, ToolCallPartDelta):
            tool_call_id = self._narrate_calls.get(event.index)
            if tool_call_id is None:
                return  # Not narrate() — no other tool's arguments are read for display.
            self._reveal(tool_call_id, delta.args_delta)

    def _reveal(self, tool_call_id: str, args_delta) -> None:
        text = self._narration.feed(tool_call_id, args_delta)
        if text is not None:
            self.emit("narration_delta", {"tool_call_id": tool_call_id, "text": text})

    def discard_open_narrations(self) -> None:
        """Drop every provisional bubble this attempt opened.

        Used when a whole run is retried: the failed attempt's half-written text must not be
        left standing. Clients treat a discard for an already-settled call as a no-op, so
        this is safe to fire broadly.
        """
        for tool_call_id in self._narration.open_ids():
            self.emit("narration_discard", {"tool_call_id": tool_call_id})
        self._narration.close_all()
        self._narrate_calls.clear()

    def emit(self, event_type: str, payload: dict) -> None:
        if self._on_event is not None:
            self._on_event(event_type, payload)


async def run_agent_iter(
    deps: GameState,
    message_history: list,
    user_prompt: str | None = None,
    deferred_tool_results: DeferredToolResults | None = None,
    on_event: EventCallback | None = None,
):
    """Run the GM agent with retry, returning the agent run result.

    Callers inspect result.output for DeferredToolRequests vs str (internal notes).
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
        # A fresh handler per attempt: a retried run must not inherit half-accumulated
        # state from the attempt that failed.
        events = AgentEventStream(on_event=on_event)
        try:
            return await gm_agent.run(**run_kwargs, event_stream_handler=events)
        except Exception as e:
            # Whatever happens next, this attempt's provisional text must not stay on screen.
            events.discard_open_narrations()
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
