"""CLI entry point for the generalist GM harness.

Bootstraps a per-session world directory, builds the pydantic-ai agent
with EXACTLY 5 generic tools, and runs a stdin->agent->stdout turn loop
with rich-rendered narration plus visible tool-call telemetry.
Ctrl-C exits cleanly without corrupting the session directory.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import click
from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic_ai.messages import (
    TextPart,
    ThinkingPart,
    ToolCallPart,
    ToolReturnPart,
)
from rich.console import Console
from rich.markdown import Markdown
from rich.text import Text

from backend_generalist.agent import GMDeps, build_agent
from backend_generalist.world import create_session_world


load_dotenv()


EXIT_TOKENS = {"exit", "quit", "q", ":q"}

console = Console()


def _truncate(s: str, limit: int = 80) -> str:
    s = s.replace("\n", " ⏎ ")
    return s if len(s) <= limit else s[: limit - 1] + "…"


def _args_dict(part: ToolCallPart) -> dict:
    try:
        return part.args_as_dict() if hasattr(part, "args_as_dict") else dict(part.args or {})
    except Exception:
        return {}


def _resolve_path(session_root: Path, rel: str) -> str:
    """Render `rel` (interpreted under session_root) as a path the terminal will auto-link.

    Tries cwd-relative first (shorter, still clickable in iTerm2 / VS Code / macOS Terminal);
    falls back to absolute if the resolved path lives outside cwd.
    Empty `rel` resolves to the session root itself.
    """
    full = (session_root / rel).resolve() if rel else session_root.resolve()
    try:
        return str(full.relative_to(Path.cwd().resolve()))
    except ValueError:
        return str(full)


def _render_tool_call(part: ToolCallPart, session_root: Path) -> None:
    name = part.tool_name
    args = _args_dict(part)
    if name == "read_file":
        console.print(f"[dim cyan]↪ read_file[/]    [dim]{_resolve_path(session_root, args.get('path', ''))}[/]")
    elif name == "write_file":
        path = _resolve_path(session_root, args.get("path", ""))
        size = len(args.get("content", "") or "")
        console.print(f"[dim cyan]↪ write_file[/]   [dim]{path} ({size} bytes)[/]")
    elif name == "edit_file":
        path = _resolve_path(session_root, args.get("path", ""))
        old = _truncate(args.get("old", "") or "", 30)
        console.print(f"[dim cyan]↪ edit_file[/]    [dim]{path}  ‹{old}›[/]")
    elif name == "glob_files":
        pattern = args.get("pattern", "") or ""
        rendered = _resolve_path(session_root, pattern) if pattern and not any(c in pattern for c in "*?[") else f"{_resolve_path(session_root, '')}/{pattern}"
        console.print(f"[dim cyan]↪ glob_files[/]   [dim]{rendered}[/]")
    elif name == "bash":
        cmd = _truncate(args.get("command", "") or "", 100)
        console.print(f"[dim cyan]↪ bash[/]         [dim]$ {cmd}  [in {_resolve_path(session_root, '')}][/]")
    else:
        console.print(f"[dim cyan]↪ {name}[/]   [dim]{_truncate(str(args), 100)}[/]")
    console.print()


def _render_tool_return(part: ToolReturnPart) -> None:
    name = part.tool_name
    raw = part.content if isinstance(part.content, str) else str(part.content)
    raw = raw.rstrip()
    line_count = len(raw.splitlines()) or 1
    header = Text(f"  ← {name}", style="dim cyan")
    if line_count > 1:
        header.append(f"  ({line_count} lines)", style="dim")
    console.print(header)
    indented = "\n".join("    " + line for line in raw.splitlines())
    console.print(Text(indented, style="dim"))
    console.print()


def _render_thinking(part: ThinkingPart) -> None:
    if part.has_content():
        body = Text(f"💭 {part.content.rstrip()}", style="dim italic")
        console.print(body)
        console.print()


def _render_interim_text(part: TextPart) -> None:
    text = (part.content or "").rstrip()
    if text:
        body = Text(f"· {text}", style="dim")
        console.print(body)
        console.print()


async def run_chat(
    model_preset: str | None = None,
    sessions_dir_override: str | None = None,
) -> None:
    sessions_dir = Path(sessions_dir_override) if sessions_dir_override else None
    session_id, session_root = create_session_world(sessions_dir=sessions_dir)

    print(f"[session] id={session_id}")
    print(f"[session] world={session_root}")
    print("[session] type 'exit' or hit Ctrl-C to quit")
    print()

    agent, model_settings = build_agent(model_preset=model_preset or "qwen3.5")
    deps = GMDeps(session_root=session_root)
    message_history: list = []

    opening_prompt = (
        "The session is starting. Read README.md, pc.json, campaign/index.md, "
        "world/scene.json, and rules/core.md. Then open the scene with 2-3 sentences "
        "of narration setting the first beat. Stop and wait for the player."
    )

    try:
        current_input: str = opening_prompt
        while True:
            async with agent.iter(
                user_prompt=current_input,
                deps=deps,
                message_history=message_history,
                model_settings=model_settings,
            ) as agent_run:
                async for node in agent_run:
                    if Agent.is_call_tools_node(node):
                        for part in node.model_response.parts:
                            if isinstance(part, ThinkingPart):
                                _render_thinking(part)
                            elif isinstance(part, ToolCallPart):
                                _render_tool_call(part, session_root)
                            # TextPart is intentionally NOT rendered here — it
                            # duplicates result.output, which is rendered as
                            # Markdown under GM> after the run ends.
                    elif Agent.is_model_request_node(node):
                        for part in getattr(node.request, "parts", []) or []:
                            if isinstance(part, ToolReturnPart):
                                _render_tool_return(part)

            result = agent_run.result
            reply = result.output if isinstance(result.output, str) else str(result.output)
            message_history = result.all_messages()

            console.print()
            console.print("[bold green]GM>[/]")
            console.print(Markdown(reply))
            console.print()

            try:
                current_input = console.input("[bold yellow]You>[/] ").strip()
            except EOFError:
                print("\n[session] stdin closed; exiting.")
                break
            if current_input.lower() in EXIT_TOKENS:
                print("[session] goodbye.")
                break
            if not current_input:
                continue
    except KeyboardInterrupt:
        print("\n[session] interrupted; world dir preserved.")
    finally:
        print(f"[session] world dir: {session_root}")


@click.command()
@click.option(
    "--model",
    "-m",
    type=str,
    default=None,
    help="Model preset: qwen3.5 (default), qwen3.6-27b, deepseek, glm-4.7, gemini-flash.",
)
@click.option(
    "--sessions-dir",
    type=click.Path(),
    default=None,
    help="Parent directory for session world dirs. Default: ./sessions/",
)
def main(model: str | None, sessions_dir: str | None) -> None:
    """Start a new generalist GM session."""
    try:
        asyncio.run(run_chat(model_preset=model, sessions_dir_override=sessions_dir))
    except KeyboardInterrupt:
        print("\n[session] interrupted.")
        sys.exit(0)


if __name__ == "__main__":
    main()
