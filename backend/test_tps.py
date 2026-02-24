"""Benchmark tokens-per-second using pydantic-ai with OpenRouter."""

import os
import time

import dotenv
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModelSettings

dotenv.load_dotenv()

MODEL = os.getenv("MODEL_NAME", "minimax/minimax-m2.5")
PROVIDER = "sambanova"
PROMPT = "Write a detailed explanation of how a compiler works, covering lexing, parsing, semantic analysis, optimization, and code generation. Be thorough."

settings = OpenRouterModelSettings(
    max_tokens=1024,
    openrouter_provider={
        "order": [PROVIDER],
        "allow_fallbacks": False,
    },
)

agent = Agent(
    f"openrouter:{MODEL}",
    instructions="You are a helpful assistant.",
)


def main():
    print(f"Model: {MODEL}")
    print(f"Provider: {PROVIDER}")
    print(f"Max tokens: 1024")
    print("=" * 60)

    start = time.perf_counter()
    result = agent.run_sync(PROMPT, model_settings=settings)
    elapsed = time.perf_counter() - start

    output = result.output
    output_tokens = result.usage().output_tokens
    tps = output_tokens / elapsed if elapsed > 0 else 0

    print(f"Output tokens: {output_tokens}")
    print(f"Time: {elapsed:.2f}s")
    print(f"TPS: {tps:.1f}")
    print(f"Preview: {output[:100]}...")


if __name__ == "__main__":
    main()
