"""Caching utilities for OpenRouter with Anthropic models.

OpenRouter requires cache_control to be embedded in the message content structure
for Anthropic prompt caching to work. This module provides a custom HTTP transport
that injects cache_control into messages before they're sent to OpenRouter.
"""

import json

import httpx
from loguru import logger


class CacheInjectingTransport(httpx.AsyncBaseTransport):
    """Custom transport that injects cache_control into system and user messages.

    Anthropic allows up to 4 cache breakpoints. We use 2:
    1. System message - caches the large system prompt
    2. Last user message - caches conversation history up to current turn

    Usage:
        http_client = httpx.AsyncClient(transport=CacheInjectingTransport())
        openai_client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            http_client=http_client,
        )
        model = OpenRouterModel(
            model_name,
            provider=OpenRouterProvider(openai_client=openai_client),
        )
    """

    def __init__(self):
        self._transport = httpx.AsyncHTTPTransport()

    def _add_cache_control_to_message(self, msg: dict) -> bool:
        """Add cache_control to a message. Returns True if modified."""
        content = msg.get("content")
        if isinstance(content, str):
            msg["content"] = [
                {
                    "type": "text",
                    "text": content,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
            return True
        elif isinstance(content, list):
            for block in reversed(content):
                if block.get("type") == "text" and "cache_control" not in block:
                    block["cache_control"] = {"type": "ephemeral"}
                    return True
        return False

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        # Only modify chat completion requests with POST method
        if request.method == "POST" and b"/chat/completions" in request.url.raw_path:
            try:
                # Read and parse body
                body = json.loads(request.content)
                messages = body.get("messages", [])

                modified = False

                # 1. Add cache_control to system message
                for msg in messages:
                    if msg.get("role") == "system":
                        if self._add_cache_control_to_message(msg):
                            modified = True
                        break

                # 2. Add cache_control to the last user message (caches conversation history)
                for msg in reversed(messages):
                    if msg.get("role") == "user":
                        if self._add_cache_control_to_message(msg):
                            modified = True
                        break

                if modified:
                    # Rebuild request with modified body
                    new_content = json.dumps(body).encode("utf-8")
                    headers = dict(request.headers)
                    headers["content-length"] = str(len(new_content))
                    logger.debug("Cache control injected into messages")

                    request = httpx.Request(
                        method=request.method,
                        url=request.url,
                        headers=headers,
                        content=new_content,
                    )
                else:
                    logger.debug("No messages found to inject cache control")
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.debug(f"Cache injection skipped: {e}")

        return await self._transport.handle_async_request(request)

    async def aclose(self) -> None:
        await self._transport.aclose()
