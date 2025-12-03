# Caching with pydantic_ai and OpenRouter

There are two main approaches to enable caching with pydantic_ai and OpenRouter:

## Option 1: pyai-caching (Redis-based)

**Pros:**
- Full control over cache behavior
- Works with any model/provider
- Supports cost tracking and rate limiting

**Cons:**
- Requires Redis setup
- Does NOT support streaming (`run_stream`)
- Only works with `agent.run()` or `agent.run_sync()`

### Installation

```bash
pip install pyai-caching redis
```

### Setup

1. Install and start Redis:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Or use Docker
   docker run -d -p 6379:6379 redis
   ```

2. Set environment variable:
   ```bash
   export LLM_CACHE_REDIS_URL="redis://localhost:6379/0"
   ```

### Usage Example

```python
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider
from pyai_caching import cached_agent_run
import os

api_key = os.getenv("OPENROUTER_API_KEY")
model = OpenRouterModel(
    "anthropic/claude-haiku-4.5",
    provider=OpenRouterProvider(api_key=api_key),
)

agent = Agent(model, instructions="You are a helpful assistant.")

# Use cached_agent_run instead of agent.run()
result = await cached_agent_run(
    agent=agent,
    prompt="Hello!",
    task_name="greeting",  # Unique identifier for caching
)

print(result.data)
```

**Note:** This won't work with `agent.run_stream()` - you'd need to use `agent.run()` instead.

---

## Option 2: Native OpenRouter Caching (Recommended for Streaming)

OpenRouter supports native caching through their API, similar to OpenAI. This works with streaming!

### How it Works

OpenRouter automatically caches responses when:
- The same prompt is sent with identical parameters
- Cache headers are properly set

The cache is tracked via `cache_read_tokens` and `cache_write_tokens` in the usage stats (which your code already tracks).

### Enabling Caching

You can enable caching by setting cache control headers through the model's `extra_body` parameter:

```python
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider

model = OpenRouterModel(
    "anthropic/claude-haiku-4.5",
    provider=OpenRouterProvider(api_key=api_key),
    # Enable caching - OpenRouter will cache responses automatically
    # Cache is based on prompt + model + parameters hash
)

agent = Agent(model, instructions="...")

# Works with streaming!
async with agent.run_stream(prompt, message_history=history) as result:
    async for chunk in result.stream_text(delta=True):
        print(chunk, end="", flush=True)
```

### Cache Behavior

- **Cache hits**: When a cached response is found, you'll see `cache_read_tokens > 0` in usage stats
- **Cache misses**: New responses are cached, and you'll see `cache_write_tokens > 0`
- **Cache key**: Based on model, prompt, temperature, and other parameters
- **Cache duration**: Managed by OpenRouter (typically 24 hours)

### Verifying Cache is Working

Your existing cost calculation code already tracks cache tokens:

```python
cache_read_tokens = getattr(usage, "cache_read_tokens", 0) or 0
cache_write_tokens = getattr(usage, "cache_write_tokens", 0) or 0
```

When you see `cache_read_tokens > 0`, caching is working!

---

## Recommendation

Since you're using `run_stream()` for streaming responses, **Option 2 (Native OpenRouter Caching)** is the best choice. It:
- Works seamlessly with streaming
- Requires no additional setup
- Is automatically enabled
- Already tracked in your cost calculation code

If you need more control or want to cache across different models/providers, consider Option 1, but you'll need to switch from streaming to regular `run()` calls.

