"""CLI entry point for the generalist GM harness.

Bootstraps a per-session world directory, builds the pydantic-ai agent
with EXACTLY 5 generalist tools, and runs a stdin->agent->stdout turn loop
with player-visible final output plus visible tool-call telemetry.
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
        return (
            part.args_as_dict()
            if hasattr(part, "args_as_dict")
            else dict(part.args or {})
        )
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
    if name == "think":
        thought = _truncate(args.get("thought", "") or "", 180)
        console.print(f"[dim magenta]↪ think[/]       [dim]{thought}[/]")
    elif name == "read_file":
        console.print(
            f"[dim cyan]↪ read_file[/]    "
            f"[dim]{_resolve_path(session_root, args.get('path', ''))}[/]"
        )
    elif name == "write_file":
        path = _resolve_path(session_root, args.get("path", ""))
        size = len(args.get("content", "") or "")
        console.print(f"[dim cyan]↪ write_file[/]   [dim]{path} ({size} bytes)[/]")
    elif name == "edit_file":
        path = _resolve_path(session_root, args.get("path", ""))
        old = _truncate(args.get("old", "") or "", 30)
        console.print(f"[dim cyan]↪ edit_file[/]    [dim]{path}  ‹{old}›[/]")
    elif name == "bash":
        cmd = _truncate(args.get("command", "") or "", 100)
        console.print(
            f"[dim cyan]↪ bash[/]         [dim]$ {cmd}  "
            f"[in {_resolve_path(session_root, '')}][/]"
        )
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


def _render_player_narration(text: str) -> None:
    console.print()
    console.print("[bold green]GM>[/]")
    console.print(Markdown(text))
    console.print()


def _final_return(output: object) -> str:
    """Normalize the final model output."""
    text = output if isinstance(output, str) else str(output)
    return text.strip()


def _render_gm_output(output: object) -> None:
    """Show the final model output as the player-visible GM channel."""
    text = _final_return(output)
    if not text:
        return
    _render_player_narration(text)


async def run_chat(
    model_id: str | None = None,
    sessions_dir_override: str | None = None,
    template_dir_override: str | None = None,
) -> None:
    sessions_dir = Path(sessions_dir_override) if sessions_dir_override else None
    template_dir = Path(template_dir_override) if template_dir_override else None
    create_kwargs = {"sessions_dir": sessions_dir}
    if template_dir is not None:
        create_kwargs["template_dir"] = template_dir
    session_id, session_root = create_session_world(**create_kwargs)

    print(f"[session] id={session_id}")
    print(f"[session] world={session_root}")
    print("[session] type 'exit' or hit Ctrl-C to quit")
    print()

    agent, model_settings = build_agent(model_id=model_id)
    deps = GMDeps(session_root=session_root)
    message_history: list = []

    opening_prompt = "[start the session]"

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
                            if isinstance(part, ToolCallPart):
                                _render_tool_call(part, session_root)
                    elif Agent.is_model_request_node(node):
                        for part in getattr(node.request, "parts", []) or []:
                            if isinstance(part, ToolReturnPart):
                                _render_tool_return(part)

            result = agent_run.result
            _render_gm_output(result.output)
            message_history = result.all_messages()

            if not _final_return(result.output):
                console.print("[dim yellow]No GM output was emitted this turn.[/]")
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
    help="OpenRouter model ID. Default: qwen/qwen3.5-397b-a17b.",
)
@click.option(
    "--sessions-dir",
    type=click.Path(),
    default=None,
    help="Parent directory for session world dirs. Default: ./sessions/",
)
@click.option(
    "--template-dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
    default=None,
    help="World template directory to copy. Default: backend_generalist/template_world.",
)
def main(model: str | None, sessions_dir: str | None, template_dir: str | None) -> None:
    """Start a new generalist GM session."""
    try:
        asyncio.run(
            run_chat(
                model_id=model,
                sessions_dir_override=sessions_dir,
                template_dir_override=template_dir,
            )
        )
    except KeyboardInterrupt:
        print("\n[session] interrupted.")
        sys.exit(0)


if __name__ == "__main__":
    main()
