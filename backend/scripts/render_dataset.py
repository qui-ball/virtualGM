#!/usr/bin/env python3
"""Render converted dataset → Qwen 3.5 fine-tuning format.

Takes the OpenAI-format dataset from convert_dataset.py and renders each
example through the Qwen 3.5 chat template, producing a JSONL file with
a "text" column ready for SFTTrainer.

Usage:
    python scripts/render_dataset.py recordings/dataset.json -o recordings/train.jsonl
    python scripts/render_dataset.py recordings/dataset.json -o recordings/train.jsonl --model Qwen/Qwen3-8B

Requires: pip install transformers jinja2
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
DEFAULT_TOOL_DEFS = SCRIPT_DIR / "tool_defs.json"
DEFAULT_MODEL = "Qwen/Qwen3.5-27B"


def load_tokenizer(model_name: str):
    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)


def render_example(
    tokenizer,
    messages: list[dict],
    tools: list[dict],
) -> str:
    """Render one training example through the chat template."""
    return tokenizer.apply_chat_template(
        messages,
        tools=tools,
        tokenize=False,
        add_generation_prompt=False,
    )


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Input dataset (.json or .jsonl)")
    parser.add_argument("-o", "--output", type=Path, default=Path("train.jsonl"))
    parser.add_argument(
        "--model", default=DEFAULT_MODEL, help=f"Tokenizer to use (default: {DEFAULT_MODEL})"
    )
    parser.add_argument(
        "--tools", type=Path, default=DEFAULT_TOOL_DEFS, help="Tool definitions JSON file"
    )
    parser.add_argument(
        "--max-seq-len",
        type=int,
        default=None,
        help="Drop examples exceeding this token count",
    )
    parser.add_argument("--pretty", action="store_true", help="Also write a .txt preview of the first example")
    args = parser.parse_args()

    # Load tool definitions
    tools = json.loads(args.tools.read_text(encoding="utf-8"))
    print(f"Loaded {len(tools)} tool definitions", file=sys.stderr)

    # Load tokenizer
    print(f"Loading tokenizer: {args.model}", file=sys.stderr)
    tokenizer = load_tokenizer(args.model)

    # Load input dataset
    input_text = args.input.read_text(encoding="utf-8")
    if args.input.suffix == ".json":
        examples = json.loads(input_text)
    else:
        examples = [json.loads(line) for line in input_text.strip().splitlines()]
    print(f"Loaded {len(examples)} examples", file=sys.stderr)

    # Render
    rendered = []
    skipped = 0
    for ex in examples:
        messages = ex["messages"] if isinstance(ex, dict) else ex
        text = render_example(tokenizer, messages, tools)

        if args.max_seq_len:
            token_count = len(tokenizer.encode(text))
            if token_count > args.max_seq_len:
                skipped += 1
                continue

        rendered.append(text)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        for text in rendered:
            f.write(json.dumps({"text": text}, ensure_ascii=False) + "\n")

    print(f"\nWrote {len(rendered)} examples to {args.output}", file=sys.stderr)
    if skipped:
        print(f"Skipped {skipped} examples exceeding {args.max_seq_len} tokens", file=sys.stderr)

    # Token stats
    token_counts = [len(tokenizer.encode(t)) for t in rendered]
    if token_counts:
        print(f"Token counts: min={min(token_counts):,}, max={max(token_counts):,}, "
              f"avg={sum(token_counts)//len(token_counts):,}", file=sys.stderr)

    # Optional preview
    if args.pretty and rendered:
        preview_path = args.output.with_suffix(".preview.txt")
        preview_path.write_text(rendered[0], encoding="utf-8")
        print(f"Preview of first example: {preview_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
