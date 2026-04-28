"""CLI entry point for the generalist GM harness.

Bootstraps a per-session world directory, builds the pydantic-ai agent
with EXACTLY 5 generic tools, and runs a stdin->agent->stdout turn loop.
Ctrl-C exits cleanly without corrupting the session directory.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import click
from dotenv import load_dotenv

from backend_generalist.agent import GMDeps, build_agent
from backend_generalist.world import create_session_world


# Load .env at import time so OPENROUTER_API_KEY is available before
# build_agent() constructs the OpenRouter provider (which validates the key
# at construction). Looks at cwd's .env first; falls back to the repo root.
# Plan 03 SUMMARY explicitly flagged this as Plan 04's concern.
load_dotenv()


EXIT_TOKENS = {"exit", "quit", "q", ":q"}


async def run_chat(
    model_preset: str | None = None,
    sessions_dir_override: str | None = None,
) -> None:
    """Run a single CLI session: bootstrap world, build agent, turn loop."""

    sessions_dir = Path(sessions_dir_override) if sessions_dir_override else None
    session_id, session_root = create_session_world(sessions_dir=sessions_dir)

    # Required by CLI-03 + Success Criterion 1: print session ID and absolute path
    print(f"[session] id={session_id}")
    print(f"[session] world={session_root}")
    print(f"[session] type 'exit' or hit Ctrl-C to quit")
    print()

    agent, model_settings = build_agent(model_preset=model_preset or "qwen3.5")
    deps = GMDeps(session_root=session_root)
    message_history: list = []

    # Send a synthetic first turn so the agent opens the scene without waiting on stdin.
    opening_prompt = (
        "The session is starting. Read README.md, pc.json, campaign/index.md, "
        "world/scene.json, and rules/core.md. Then open the scene with 2-3 sentences "
        "of narration setting the first beat. Stop and wait for the player."
    )

    try:
        current_input: str = opening_prompt
        while True:
            # Run agent for one turn
            async with agent.iter(
                user_prompt=current_input,
                deps=deps,
                message_history=message_history,
                model_settings=model_settings,
            ) as agent_run:
                async for _ in agent_run:
                    pass
            result = agent_run.result
            reply = result.output if isinstance(result.output, str) else str(result.output)
            message_history = result.all_messages()

            # Agent's reply IS the narration (HARN-04 / Success Criterion 2)
            print(f"\nGM> {reply}\n")

            # Read next player input
            try:
                current_input = input("You> ").strip()
            except EOFError:
                print("\n[session] stdin closed; exiting.")
                break
            if current_input.lower() in EXIT_TOKENS:
                print("[session] goodbye.")
                break
            if not current_input:
                continue
    except KeyboardInterrupt:
        # Success Criterion 4: clean shutdown — do NOT mutate session files in this branch.
        print("\n[session] interrupted; world dir preserved.")
    finally:
        # Final reassurance: print the session path so user can inspect.
        print(f"[session] world dir: {session_root}")


@click.command()
@click.option(
    "--model",
    "-m",
    type=str,
    default=None,
    help="Model preset: qwen3.5 (default), deepseek, glm-4.7, gemini-flash.",
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
        # Belt + suspenders: if Ctrl-C lands outside the inner try.
        print("\n[session] interrupted.")
        sys.exit(0)


if __name__ == "__main__":
    main()
