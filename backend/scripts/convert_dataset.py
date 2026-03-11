#!/usr/bin/env python3
"""Convert raw JSONL recordings → fine-tuning dataset.

Reads session_*.jsonl files produced by the --record flag and outputs a
HuggingFace-compatible JSONL dataset where each line is:

    {"messages": [{"role": "system", ...}, {"role": "user", ...}, ...]}

Tool calls and tool responses follow the OpenAI format so that
tokenizer.apply_chat_template(messages, tools=TOOLS) renders them
correctly for Qwen 3 (Hermes JSON) or Qwen 3.5 (XML parameters).

Usage:
    python scripts/convert_dataset.py recordings/session_*.jsonl -o dataset.jsonl
    python scripts/convert_dataset.py recordings/ -o dataset.jsonl  # all sessions in dir

Each *turn* in a recording becomes one training example whose messages list
contains the full conversation up to and including that turn.  This means
later turns have longer context (realistic for multi-turn fine-tuning).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_tool_defs_from_instructions(instructions: str) -> str | None:
    """The raw instructions already contain tool schemas injected by
    pydantic-ai in some providers.  We strip them out so they can be
    passed separately via the `tools=` parameter to apply_chat_template.
    For now we return None — tool defs are provided externally.
    """
    return None


def _convert_response(msg: dict) -> dict:
    """Convert a single pydantic-ai response message → OpenAI assistant message."""
    thinking = ""
    tool_calls = []
    text_content = ""

    for part in msg["parts"]:
        pk = part["part_kind"]
        if pk == "thinking":
            content = part.get("content") or ""
            if content:
                thinking += content + "\n"
        elif pk == "tool-call":
            args = part["args"]
            if isinstance(args, str):
                args = json.loads(args)
            tool_calls.append({
                "type": "function",
                "id": part["tool_call_id"],
                "function": {
                    "name": part["tool_name"],
                    "arguments": args,
                },
            })
        elif pk == "text":
            text_content += part.get("content", "")

    assistant_msg: dict = {"role": "assistant"}
    if thinking.strip():
        assistant_msg["reasoning_content"] = thinking.strip()
    if tool_calls:
        assistant_msg["content"] = text_content or ""
        assistant_msg["tool_calls"] = tool_calls
    else:
        assistant_msg["content"] = text_content
    return assistant_msg


def _convert_request_parts(msg: dict) -> list[dict]:
    """Convert request parts (user-prompt, tool-return) → ChatML messages."""
    out = []
    for part in msg["parts"]:
        pk = part["part_kind"]
        if pk == "user-prompt":
            out.append({"role": "user", "content": part["content"]})
        elif pk == "tool-return":
            out.append({
                "role": "tool",
                "content": part["content"],
                "tool_call_id": part["tool_call_id"],
                "name": part["tool_name"],
            })
    return out


def _convert_messages(raw_messages: list[dict]) -> list[dict]:
    """Convert pydantic-ai message list → list of training examples.

    Each request→response pair becomes one training example, because the
    system prompt (dynamic instructions) can change between calls — e.g.
    after load_campaign_section mutates game state.

    Each example contains:
      - The system message with the instructions active for that call
      - The full conversation history up to that point
      - The assistant response (the training target)

    This mirrors what the model actually saw on each API call.
    """
    examples: list[dict] = []
    # History of non-system ChatML messages accumulated so far
    history: list[dict] = []

    i = 0
    while i < len(raw_messages):
        msg = raw_messages[i]

        if msg["kind"] == "request":
            instructions = msg.get("instructions") or ""
            system_msg = {"role": "system", "content": instructions}
            request_parts = _convert_request_parts(msg)
            history.extend(request_parts)

            # Pair with the next response if available
            if i + 1 < len(raw_messages) and raw_messages[i + 1]["kind"] == "response":
                response_msg = _convert_response(raw_messages[i + 1])
                # Build the training example: system + history so far + response
                examples.append([system_msg] + history + [response_msg])
                history.append(response_msg)
                i += 2
            else:
                i += 1
        else:
            # Orphan response (shouldn't happen) — skip
            i += 1

    return examples


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def convert_session(path: Path) -> list[dict]:
    """Convert one session JSONL file → list of training examples.

    Uses only the *last* turn's messages (which contains the full cumulative
    history) to avoid duplicating earlier turns that are already included.
    Each model call (request→response pair) becomes one training example.
    """
    last_turn = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            last_turn = json.loads(line)

    if last_turn is None:
        return []

    call_examples = _convert_messages(last_turn["messages"])
    return [
        {
            "messages": msgs,
            "metadata": {
                "source_session": path.name,
                "turn": last_turn["turn"],
                "call_index": i,
                "model_name": last_turn["model_name"],
            },
        }
        for i, msgs in enumerate(call_examples)
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("inputs", nargs="+", type=Path, help="Session JSONL files or directories containing them")
    parser.add_argument("-o", "--output", type=Path, default=Path("dataset.jsonl"), help="Output dataset path")
    parser.add_argument("--no-metadata", action="store_true", help="Strip metadata from output (pure messages only)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON (outputs a JSON array instead of JSONL)")
    args = parser.parse_args()

    # Collect all session files
    session_files: list[Path] = []
    for inp in args.inputs:
        if inp.is_dir():
            session_files.extend(sorted(inp.glob("session_*.jsonl")))
        elif inp.is_file():
            session_files.append(inp)
        else:
            print(f"Warning: {inp} not found, skipping", file=sys.stderr)

    if not session_files:
        print("No session files found.", file=sys.stderr)
        sys.exit(1)

    all_examples = []
    for sf in session_files:
        examples = convert_session(sf)
        if args.no_metadata:
            examples = [{"messages": ex["messages"]} for ex in examples]
        all_examples.extend(examples)
        print(f"  {sf.name}: {len(examples)} examples", file=sys.stderr)

    with open(args.output, "w", encoding="utf-8") as out_f:
        if args.pretty:
            json.dump(all_examples, out_f, indent=2, ensure_ascii=False)
            out_f.write("\n")
        else:
            for ex in all_examples:
                out_f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"\nWrote {len(all_examples)} examples to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
