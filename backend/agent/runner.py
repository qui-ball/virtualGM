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
)

import agent.definition as agent_mod
from agent.definition import gm_agent
from game.models import GameState

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
    """

    def __init__(self, on_event: EventCallback | None = None) -> None:
        self._on_event = on_event
        self._thinking: dict[int, str] = {}

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
            if isinstance(event.part, ThinkingPart):
                # A repeated start for an index fully replaces the previous part.
                self._thinking[event.index] = event.part.content or ""
        elif isinstance(event, PartDeltaEvent):
            if isinstance(event.delta, ThinkingPartDelta) and event.delta.content_delta:
                self._thinking[event.index] = (
                    self._thinking.get(event.index, "") + event.delta.content_delta
                )
        elif isinstance(event, PartEndEvent):
            content = self._thinking.pop(event.index, None)
            if content:
                self.emit("thinking", {"text": content})

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
