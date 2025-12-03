# Caching Research Summary for pydantic_ai + OpenRouter

## Current Setup Analysis

### What I Found in Your Code:

1. **Model Configuration** (lines 65-68 in `main.py`):
   ```python
   model = OpenRouterModel(
       model_name,
       provider=OpenRouterProvider(api_key=api_key),
   )
   ```
   - No caching parameters currently configured
   - No `model_settings` or `extra_body` parameters set

2. **Cost Tracking** (lines 44-45 in `utils/cost.py`):
   ```python
   cache_read_tokens = getattr(usage, "cache_read_tokens", 0) or 0
   cache_write_tokens = getattr(usage, "cache_write_tokens", 0) or 0
   ```
   - Your code **already tracks cache tokens**, which suggests OpenRouter may support caching
   - These fields are populated from the API response's usage statistics

3. **Streaming Usage**:
   - You're using `agent.run_stream()` which is important because `pyai-caching` doesn't support streaming

### Is Caching Currently Enabled?

**Answer: Likely NOT explicitly enabled, but may work automatically for some models**

- OpenRouter supports caching, but it's **model-dependent**
- Anthropic Claude models (like `anthropic/claude-haiku-4.5` which you're using) **support caching**
- For Anthropic models, caching may need to be enabled **per-message** using `cache_control`
- Your code tracks cache tokens, but if they're always 0, caching isn't being used

---

## How OpenRouter Caching Works

### Two Types of Caching:

1. **Automatic Caching (Model-Level)**
   - Some models cache automatically (e.g., OpenAI models)
   - Cache key is based on: model + prompt + parameters (temperature, etc.)
   - Cache duration: Typically 24 hours
   - Tracked via `cache_read_tokens` and `cache_write_tokens` in usage stats

2. **Explicit Cache Control (Message-Level)**
   - For models like Anthropic Claude, you can mark specific message parts as cacheable
   - Uses `cache_control` parameter in message content
   - Format:
     ```json
     {
       "type": "text",
       "text": "Your prompt text here",
       "cache_control": {
         "type": "ephemeral"  // or "ephemeral-user"
       }
     }
     ```

### Cache Control Types:
- `"ephemeral"`: Cache is shared across all users (for static content like system prompts)
- `"ephemeral-user"`: Cache is per-user (for user-specific content)

---

## How to Enable Caching

### Option 1: Native OpenRouter Caching (Recommended for Streaming)

**For Anthropic Models (like Claude Haiku 4.5):**

OpenRouter's documentation indicates that Anthropic models support caching. There are **two approaches**:

#### Approach A: Anthropic-Specific Cache Parameters

When using Anthropic models (even through OpenRouter), you can enable caching with these parameters:
- `anthropic_cache_instructions`: Cache system instructions
- `anthropic_cache_tool_definitions`: Cache tool definitions  
- `anthropic_cache_messages`: Cache all messages

**However**, these parameters are typically used with `AnthropicModel` directly, not `OpenRouterModel`. When routing through OpenRouter, these need to be passed via `extra_body`.

#### Approach B: OpenRouter Cache Control

OpenRouter also supports `cache_control` in message content:
```json
{
  "type": "text",
  "text": "Your prompt",
  "cache_control": {
    "type": "ephemeral"  // or "ephemeral-user"
  }
}
```

**How pydantic_ai might support this:**

Looking at your commented code (lines 121-128), you have an example of using `model_settings`:
```python
# model_settings={
#     "extra_body": {
#         "provider": {
#             "only": ["Fireworks"],
#         }
#     }
# },
```

This suggests `Agent` accepts `model_settings` with `extra_body`. However, I need to verify:
- Does `OpenRouterModel` accept `extra_body` parameter?
- Does `Agent.model_settings` get passed to the API?
- What's the exact format for cache_control in OpenRouter API?
- Can Anthropic cache parameters be passed through OpenRouter via `extra_body`?

**What I Need to Check:**
1. pydantic_ai's OpenRouterModel source code to see what parameters it accepts
2. OpenRouter API documentation for exact cache_control format
3. Whether cache_control goes in `extra_body` or directly in the request body

### Option 2: pyai-caching (Redis-based)

**Limitations:**
- ❌ Does NOT support `run_stream()` (you're using streaming)
- ✅ Works with `agent.run()` and `agent.run_sync()`
- ✅ Full control over cache behavior
- ✅ Works with any model/provider

**If you want to use this:**
- You'd need to switch from `run_stream()` to `run()`
- Requires Redis setup
- Good for development/testing, but not production streaming

---

## Next Steps to Understand Caching

### What I Need to Research:

1. **pydantic_ai OpenRouterModel API:**
   - What parameters does `OpenRouterModel()` accept?
   - Does it support `extra_body` or `model_settings`?
   - How are these passed to the OpenRouter API?

2. **OpenRouter API Format:**
   - Exact format for `cache_control` in request body
   - Whether it goes in `extra_body` or directly in messages
   - For Anthropic models specifically

3. **Agent.model_settings:**
   - How does `Agent.model_settings` work?
   - Does it get merged with model-level settings?
   - How to pass cache_control through it?

### Verification Steps:

1. **Check if caching is already working:**
   - Run the same prompt twice
   - Check if `cache_read_tokens > 0` on the second run
   - If yes, caching is already enabled!

2. **If caching is NOT working:**
   - Need to find the correct way to pass `cache_control` to OpenRouter
   - May need to use `model_settings` with `extra_body`
   - Or may need to modify message structure

---

## Key Findings Summary

✅ **What I Know:**
- Your code already tracks cache tokens (good!)
- OpenRouter supports caching for Anthropic models
- You're using streaming (`run_stream()`)
- `pyai-caching` won't work with streaming

❓ **What I Need to Verify:**
- Exact API format for enabling cache_control in OpenRouter
- How pydantic_ai's OpenRouterModel passes parameters
- Whether caching can be enabled via `model_settings` or `extra_body`
- Current cache token values (are they 0 or non-zero?)

🔍 **Recommended Next Steps:**

1. **Verify Current Cache Status:**
   - Run your app and check the debug logs for `cache_read_tokens` and `cache_write_tokens`
   - Send the same prompt twice and see if second request shows `cache_read_tokens > 0`
   - If cache tokens are always 0, caching is NOT currently enabled

2. **Research pydantic_ai Implementation:**
   - Check pydantic_ai source code for `OpenRouterModel` class
   - See what parameters it accepts (especially `extra_body` or similar)
   - Understand how `Agent.model_settings` works

3. **Find OpenRouter API Format:**
   - Check OpenRouter API documentation for exact cache_control format
   - Determine if Anthropic cache params (`anthropic_cache_*`) work through OpenRouter
   - Understand if cache_control goes in `extra_body` or request body

4. **Test Implementation:**
   - Try passing cache parameters via `model_settings` with `extra_body`
   - Test with Anthropic-specific cache parameters
   - Verify cache tokens increase after enabling

## Key Questions to Answer

1. **Is caching currently working?** (Check cache token values)
2. **What's the correct way to enable caching for Anthropic models via OpenRouter?**
3. **Does pydantic_ai's OpenRouterModel support passing cache parameters?**
4. **Should we use `model_settings` with `extra_body` or another method?**

