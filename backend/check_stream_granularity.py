"""Probe whether an OpenRouter model streams narrate() arguments finely enough to be worth rendering live.

The GM's player-visible text arrives as the `text` argument of a narrate() tool call, not as
model output text. Streaming it means reading ToolCallPartDelta.args_delta — incremental JSON
fragments — and partial-parsing `text` out of them as they land.

Providers differ on this. Some emit tool-call arguments in many small SSE chunks; others hand
back the whole blob in one. The second kind is a correct model that is useless for streaming,
and you cannot tell which you have without measuring. This script measures.

Usage:
    uv run python check_stream_granularity.py z-ai/glm-5.2
    uv run python check_stream_granularity.py minimax/minimax-m2.5 --provider sambanova
    uv run python check_stream_granularity.py z-ai/glm-4.7 --provider parasail,google-vertex --runs 5
    uv run python check_stream_granularity.py anthropic/claude-sonnet-5 --json

Exit codes: 0 STREAMABLE · 1 MARGINAL · 2 ATOMIC · 3 INCONCLUSIVE
"""

import argparse
import asyncio
import json
import os
import statistics
import sys
import time
from dataclasses import dataclass, field

import dotenv
from pydantic_ai import Agent
from pydantic_ai.messages import (
    PartDeltaEvent,
    PartStartEvent,
    TextPartDelta,
    ThinkingPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
)
from pydantic_ai.models.openrouter import OpenRouterModelSettings

from agent.narration_stream import partial_narration_text

dotenv.load_dotenv()

# A turn shaped like a real one: setup tool, then narration long enough that chunking is visible.
PROMPT = "I push open the tavern door and step inside, looking for the innkeeper."

INSTRUCTIONS = """You are the Game Master for a solo tabletop RPG. You act through tool calls.
The player sees ONLY the text you pass to narrate() — nothing else you do is visible to them.

A turn is:
1. set_scene(label) to name the place.
2. narrate(text) — 4-5 vivid, sensory sentences describing the moment, ending by inviting the
   player to act. This is the only player-visible channel.
3. Return a short string of private notes to end the turn.

Call narrate exactly once. Do not put tool markup inside narrate()."""

# Thresholds for "is this worth rendering live". A reveal is one distinct value of the partial
# `text` field — i.e. one paint the UI would actually perform. Raw chunk count overstates this,
# because fragments that land mid-JSON-key produce no new visible text.
MIN_REVEALS_STREAMABLE = 4
MIN_SPREAD_STREAMABLE = 0.3  # seconds between first and last reveal


@dataclass
class ToolTrace:
    """Accumulated streaming state for one tool call, keyed by part index."""

    index: int
    tool_name: str = ""
    chunks: list[tuple[float, str]] = field(default_factory=list)  # (t_rel, raw fragment)
    saw_dict_args: bool = False
    provider_name: str | None = None

    @property
    def raw_args(self) -> str:
        return "".join(c for _, c in self.chunks)


@dataclass
class RunResult:
    ok: bool
    reason: str = ""
    provider_name: str | None = None
    total_s: float = 0.0
    # narrate()-specific
    n_chunks: int = 0
    n_reveals: int = 0
    first_reveal_s: float = 0.0
    last_reveal_s: float = 0.0
    reveal_sizes: list[int] = field(default_factory=list)
    narration_chars: int = 0
    lossless: bool = False
    saw_dict_args: bool = False
    n_narrate_calls: int = 0
    text_deltas: int = 0
    thinking_deltas: int = 0

    @property
    def spread_s(self) -> float:
        return max(0.0, self.last_reveal_s - self.first_reveal_s)

    @property
    def verdict(self) -> str:
        if not self.ok:
            return "INCONCLUSIVE"
        if self.saw_dict_args or self.n_reveals <= 1:
            return "ATOMIC"
        if self.n_reveals >= MIN_REVEALS_STREAMABLE and self.spread_s >= MIN_SPREAD_STREAMABLE:
            return "STREAMABLE"
        return "MARGINAL"


def build_settings(provider: str | None, allow_fallbacks: bool) -> OpenRouterModelSettings:
    if not provider:
        return OpenRouterModelSettings()
    return OpenRouterModelSettings(
        openrouter_provider={
            "order": [p.strip() for p in provider.split(",") if p.strip()],
            "allow_fallbacks": allow_fallbacks,
        }
    )


# The probe measures the SAME parse the production streaming path performs, so it imports it
# rather than restating it. A local copy would let the probe keep reporting STREAMABLE against
# parsing behavior production no longer has — and this script's exit code is what gates a
# MODEL_PRESETS change, so a silent drift here is a silently wrong gate.
partial_text = partial_narration_text


def reveal_timeline(trace: ToolTrace) -> list[tuple[float, str]]:
    """Replay the chunks and record each moment the visible text would actually change."""
    timeline: list[tuple[float, str]] = []
    buf = ""
    last = None
    for t_rel, fragment in trace.chunks:
        buf += fragment
        text = partial_text(buf)
        if text is not None and text != last:
            timeline.append((t_rel, text))
            last = text
    return timeline


def build_agent() -> tuple[Agent, list[str]]:
    """A minimal stand-in for gm_agent with the same narrate()-as-visible-channel shape."""
    received: list[str] = []

    agent = Agent(
        instructions=INSTRUCTIONS,
        output_type=str,
        end_strategy="exhaustive",
    )

    @agent.tool_plain
    def set_scene(label: str) -> str:
        """Update the scene label shown in the app bar.

        Args:
            label: Short scene name, e.g. "Tavern, dusk".
        """
        return f"Scene set to {label}."

    @agent.tool_plain
    def narrate(text: str) -> str:
        """Show text to the player.

        Args:
            text: Description, dialogue, or outcome for the current moment.
        """
        received.append(text)
        return f"Narration was shown to the player: {text[:50]}..."

    return agent, received


async def probe_once(model: str, settings: OpenRouterModelSettings) -> RunResult:
    agent, received = build_agent()
    traces: dict[int, ToolTrace] = {}
    text_deltas = 0
    thinking_deltas = 0
    provider_name: str | None = None

    start = time.perf_counter()
    try:
        async with agent.iter(PROMPT, model=f"openrouter:{model}", model_settings=settings) as run:
            async for node in run:
                if not Agent.is_model_request_node(node):
                    continue
                async with node.stream(run.ctx) as request_stream:
                    async for event in request_stream:
                        now = time.perf_counter() - start

                        if isinstance(event, PartStartEvent):
                            part = event.part
                            provider_name = provider_name or getattr(part, "provider_name", None)
                            if isinstance(part, ToolCallPart):
                                trace = traces.setdefault(event.index, ToolTrace(index=event.index))
                                trace.tool_name = part.tool_name or trace.tool_name
                                trace.provider_name = getattr(part, "provider_name", None)
                                # Some providers ship the whole args blob on the start event.
                                if isinstance(part.args, str) and part.args:
                                    trace.chunks.append((now, part.args))
                                elif isinstance(part.args, dict) and part.args:
                                    trace.saw_dict_args = True
                                    trace.chunks.append((now, json.dumps(part.args)))

                        elif isinstance(event, PartDeltaEvent):
                            delta = event.delta
                            if isinstance(delta, TextPartDelta):
                                text_deltas += 1
                            elif isinstance(delta, ThinkingPartDelta):
                                thinking_deltas += 1
                            elif isinstance(delta, ToolCallPartDelta):
                                provider_name = provider_name or delta.provider_name
                                trace = traces.setdefault(event.index, ToolTrace(index=event.index))
                                if delta.tool_name_delta:
                                    trace.tool_name += delta.tool_name_delta
                                if isinstance(delta.args_delta, str) and delta.args_delta:
                                    trace.chunks.append((now, delta.args_delta))
                                elif isinstance(delta.args_delta, dict) and delta.args_delta:
                                    trace.saw_dict_args = True
                                    trace.chunks.append((now, json.dumps(delta.args_delta)))
    except Exception as e:  # noqa: BLE001 — a probe reports failures, it does not raise them
        return RunResult(ok=False, reason=f"{type(e).__name__}: {e}", total_s=time.perf_counter() - start)

    total_s = time.perf_counter() - start

    narrate_traces = [t for t in traces.values() if t.tool_name == "narrate"]
    if not narrate_traces:
        seen = sorted({t.tool_name for t in traces.values() if t.tool_name}) or ["<none>"]
        return RunResult(
            ok=False,
            reason=f"model never called narrate() — tools called: {', '.join(seen)}",
            provider_name=provider_name,
            total_s=total_s,
            text_deltas=text_deltas,
            thinking_deltas=thinking_deltas,
        )

    trace = narrate_traces[0]
    timeline = reveal_timeline(trace)
    reconstructed = partial_text(trace.raw_args) or ""
    actual = received[0] if received else ""

    return RunResult(
        ok=True,
        provider_name=provider_name or trace.provider_name,
        total_s=total_s,
        n_chunks=len(trace.chunks),
        n_reveals=len(timeline),
        first_reveal_s=timeline[0][0] if timeline else 0.0,
        last_reveal_s=timeline[-1][0] if timeline else 0.0,
        reveal_sizes=[len(text) for _, text in timeline],
        narration_chars=len(actual),
        lossless=bool(actual) and reconstructed == actual,
        saw_dict_args=trace.saw_dict_args,
        n_narrate_calls=len(narrate_traces),
        text_deltas=text_deltas,
        thinking_deltas=thinking_deltas,
    )


VERDICT_NOTES = {
    "STREAMABLE": "Drop-in compatible. Render narrate() args live off ToolCallPartDelta.",
    "MARGINAL": "Args do fragment, but too coarsely to read as flowing text. Consider pairing with a client-side typewriter to smooth the reveals.",
    "ATOMIC": "Arguments arrive in one blob. Live token streaming is NOT achievable with this model/provider — only a client-side typewriter after the fact.",
    "INCONCLUSIVE": "Probe did not complete. See reason above.",
}


def report(model: str, provider: str | None, results: list[RunResult]) -> str:
    ok = [r for r in results if r.ok]
    # Worst verdict across runs — fragmentation is known to vary run to run, so be conservative.
    order = ["INCONCLUSIVE", "ATOMIC", "MARGINAL", "STREAMABLE"]
    overall = min((r.verdict for r in results), key=order.index)

    lines = [
        "=" * 68,
        f"Model:    {model}",
        f"Provider: {provider or '(openrouter default routing)'}",
    ]
    served = {r.provider_name for r in results if r.provider_name}
    if served:
        lines.append(f"Served by: {', '.join(sorted(served))}")
    lines += [f"Runs:     {len(results)}", "=" * 68, ""]

    for i, r in enumerate(results, 1):
        if not r.ok:
            lines.append(f"  run {i}: {r.verdict:12s}  {r.reason}")
            continue
        lines.append(
            f"  run {i}: {r.verdict:12s}  {r.n_reveals:3d} reveals  "
            f"{r.n_chunks:3d} chunks  {r.narration_chars:4d} chars  "
            f"first@{r.first_reveal_s:5.2f}s  spread {r.spread_s:5.2f}s  total {r.total_s:5.2f}s"
        )
        if not r.lossless:
            lines.append("           ⚠ reconstructed text != text narrate() received — partial parsing is lossy here")
        if r.n_narrate_calls > 1:
            lines.append(f"           note: {r.n_narrate_calls} narrate() calls this turn (measured the first)")

    if ok:
        lines += ["", "-" * 68]
        first = statistics.median(r.first_reveal_s for r in ok)
        total = statistics.median(r.total_s for r in ok)
        saved = total - first
        lines.append(f"  Median time to first visible token: {first:.2f}s")
        lines.append(f"  Median time to full narration:      {total:.2f}s")
        lines.append(f"  Perceived wait removed:             {saved:.2f}s  ({saved / total * 100:.0f}% of the turn)")
        lines.append(f"  Median reveals per narration:       {statistics.median(r.n_reveals for r in ok):.0f}")
        if any(r.thinking_deltas for r in ok):
            lines.append(f"  Thinking deltas seen:               yes (median {statistics.median(r.thinking_deltas for r in ok):.0f})")

    lines += [
        "",
        "=" * 68,
        f"  VERDICT: {overall}",
        f"  {VERDICT_NOTES[overall]}",
        "=" * 68,
    ]
    return "\n".join(lines)


async def main_async(args) -> int:
    if not os.getenv("OPENROUTER_API_KEY"):
        print("OPENROUTER_API_KEY is not set (checked env and .env).", file=sys.stderr)
        return 3

    settings = build_settings(args.provider, args.allow_fallbacks)
    results: list[RunResult] = []
    for i in range(args.runs):
        if not args.json:
            print(f"probing {args.model} … run {i + 1}/{args.runs}", file=sys.stderr)
        results.append(await probe_once(args.model, settings))

    order = ["INCONCLUSIVE", "ATOMIC", "MARGINAL", "STREAMABLE"]
    overall = min((r.verdict for r in results), key=order.index)

    if args.json:
        print(
            json.dumps(
                {
                    "model": args.model,
                    "provider": args.provider,
                    "verdict": overall,
                    "runs": [
                        {
                            "verdict": r.verdict,
                            "ok": r.ok,
                            "reason": r.reason,
                            "provider_name": r.provider_name,
                            "chunks": r.n_chunks,
                            "reveals": r.n_reveals,
                            "reveal_sizes": r.reveal_sizes,
                            "first_reveal_s": round(r.first_reveal_s, 3),
                            "last_reveal_s": round(r.last_reveal_s, 3),
                            "total_s": round(r.total_s, 3),
                            "narration_chars": r.narration_chars,
                            "lossless": r.lossless,
                            "dict_args": r.saw_dict_args,
                            "narrate_calls": r.n_narrate_calls,
                            "text_deltas": r.text_deltas,
                            "thinking_deltas": r.thinking_deltas,
                        }
                        for r in results
                    ],
                },
                indent=2,
            )
        )
    else:
        print(report(args.model, args.provider, results))

    return {"STREAMABLE": 0, "MARGINAL": 1, "ATOMIC": 2, "INCONCLUSIVE": 3}[overall]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check whether an OpenRouter model streams narrate() args finely enough to render live.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("model", help="OpenRouter model id, e.g. z-ai/glm-5.2")
    parser.add_argument(
        "--provider",
        default=None,
        help="Comma-separated provider order, e.g. 'sambanova' or 'parasail,google-vertex'",
    )
    parser.add_argument(
        "--allow-fallbacks",
        action="store_true",
        help="Let OpenRouter fall back off the pinned provider (default off, so results are attributable)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="Number of probe runs; fragmentation varies run to run (default 3)",
    )
    parser.add_argument("--json", action="store_true", help="Machine-readable output")
    args = parser.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
