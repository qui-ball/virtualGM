"""Cost calculation utilities for agent runs."""

from typing import Optional, Tuple

from loguru import logger

# Track previous cache_read_tokens to estimate cache writes
# OpenRouter doesn't report cache_write_tokens, but we can estimate from the delta
_previous_cache_read_tokens: Optional[int] = None  # None = first call


def calculate_run_cost(
    result, model_name: str, provider_id: str = "openrouter"
) -> Tuple[Optional[float], int, int, int, int, bool]:
    """
    Calculate the cost of an agent run based on token usage.

    Args:
        result: The agent result object with usage information
        model_name: The model identifier (e.g., 'deepseek/deepseek-chat-v3.1')
        provider_id: The provider identifier (default: 'openrouter')

    Returns:
        Tuple of (run_cost, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, is_first_request)
        run_cost will be None if cost cannot be calculated
        is_first_request is True if this is the first request (cache write status unknown)
    """
    global _previous_cache_read_tokens

    run_cost = None
    input_tokens = 0
    output_tokens = 0
    cache_read_tokens = 0
    cache_write_tokens = 0
    is_first_request = _previous_cache_read_tokens is None

    if not result:
        return (
            run_cost,
            input_tokens,
            output_tokens,
            cache_read_tokens,
            cache_write_tokens,
            is_first_request,
        )

    # Get token counts from usage
    if hasattr(result, "usage"):
        usage = result.usage() if callable(result.usage) else result.usage
        if usage:
            # Debug: log raw usage object to see all available fields
            logger.debug(f"Raw usage object: {usage}")
            logger.debug(f"Usage type: {type(usage)}")
            if hasattr(usage, "__dict__"):
                logger.debug(f"Usage __dict__: {usage.__dict__}")

            input_tokens = getattr(usage, "input_tokens", 0) or 0
            output_tokens = getattr(usage, "output_tokens", 0) or 0
            cache_read_tokens = getattr(usage, "cache_read_tokens", 0) or 0
            cache_write_tokens = getattr(usage, "cache_write_tokens", 0) or 0

            # Also check for alternative field names that OpenRouter/Anthropic might use
            if cache_write_tokens == 0:
                cache_write_tokens = getattr(usage, "cache_creation_input_tokens", 0) or 0

            # OpenRouter doesn't report cache_write_tokens, so estimate from delta
            # If cache_read_tokens increased since last call, that increase was written
            # Skip first call (None) since we can't distinguish warm vs cold cache
            if (
                cache_write_tokens == 0
                and _previous_cache_read_tokens is not None
                and cache_read_tokens > _previous_cache_read_tokens
            ):
                estimated_write = cache_read_tokens - _previous_cache_read_tokens
                cache_write_tokens = estimated_write
                logger.debug(f"Estimated cache_write_tokens from delta: {estimated_write}")
            _previous_cache_read_tokens = cache_read_tokens

            logger.debug(f"input_tokens={input_tokens}")
            logger.debug(f"output_tokens={output_tokens}")
            logger.debug(f"cache_read_tokens={cache_read_tokens}")
            logger.debug(f"cache_write_tokens={cache_write_tokens}")

    # Try to calculate cost using genai-prices if available
    if input_tokens > 0 or output_tokens > 0:
        try:
            from genai_prices import calc_price
            from genai_prices.types import Usage

            logger.debug(
                f"Calculating cost for model={model_name}, provider={provider_id}"
            )

            # Convert OpenRouter model name format to genai-prices format
            # OpenRouter: "anthropic/claude-haiku-4.5" -> genai-prices: "claude-haiku-4-5" with provider="anthropic"
            genai_prices_model_ref = model_name
            genai_prices_provider = provider_id

            if model_name.startswith("anthropic/"):
                # Extract the model part and convert format
                model_part = model_name.replace("anthropic/", "")
                # Convert dots to hyphens: "claude-haiku-4.5" -> "claude-haiku-4-5"
                genai_prices_model_ref = model_part.replace(".", "-")
                genai_prices_provider = "anthropic"
                logger.debug(
                    f"Converted model name: {model_name} -> {genai_prices_model_ref} (provider: {genai_prices_provider})"
                )
            elif model_name.startswith("deepseek/"):
                # Keep deepseek models as-is with openrouter provider
                genai_prices_model_ref = model_name
                genai_prices_provider = "openrouter"
            # For other models, use as-is

            # Create Usage object with token counts
            usage_obj = Usage(
                input_tokens=input_tokens if input_tokens > 0 else None,
                output_tokens=output_tokens if output_tokens > 0 else None,
                cache_read_tokens=(
                    cache_read_tokens if cache_read_tokens > 0 else None
                ),
                cache_write_tokens=(
                    cache_write_tokens if cache_write_tokens > 0 else None
                ),
            )

            # Calculate cost - try with converted model name and provider
            try:
                price_calc = calc_price(
                    usage=usage_obj,
                    model_ref=genai_prices_model_ref,
                    provider_id=genai_prices_provider,
                )
                logger.debug(
                    f"Cost calculated with model_ref={genai_prices_model_ref}, provider_id={genai_prices_provider}"
                )
            except (LookupError, ValueError) as e:
                logger.debug(
                    f"Failed with provider_id={genai_prices_provider} ({e}), trying without provider_id"
                )
                try:
                    # If that fails, try without provider_id (let genai-prices auto-detect)
                    price_calc = calc_price(
                        usage=usage_obj,
                        model_ref=genai_prices_model_ref,
                    )
                    logger.debug("Cost calculated without provider_id")
                except (LookupError, ValueError) as e2:
                    # Model not found in genai-prices database - this is expected for some models
                    logger.debug(
                        f"Model {genai_prices_model_ref} not found in genai-prices database: {e2}"
                    )
                    price_calc = None

            if price_calc:
                logger.debug(f"Price calculation result: {price_calc}")

                # Extract the total cost from the price calculation
                # PriceCalculation has total_price attribute (not total_cost)
                if hasattr(price_calc, "total_price"):
                    run_cost = float(price_calc.total_price)
                    logger.debug(f"Extracted cost from total_price: {run_cost}")
                elif hasattr(price_calc, "total_cost"):
                    run_cost = float(price_calc.total_cost)
                    logger.debug(f"Extracted cost from total_cost: {run_cost}")
                elif hasattr(price_calc, "cost"):
                    run_cost = float(price_calc.cost)
                    logger.debug(f"Extracted cost from cost: {run_cost}")
                elif isinstance(price_calc, (int, float)):
                    run_cost = float(price_calc)
                    logger.debug(f"Extracted cost as number: {run_cost}")
                else:
                    logger.debug(
                        f"Could not extract cost from price_calc, attributes: {dir(price_calc)}"
                    )
        except ImportError as e:
            # genai-prices not available, skip cost calculation
            logger.debug(f"genai-prices not available: {e}")
        except Exception as e:
            # Error calculating cost, skip it
            logger.debug(f"Error calculating cost: {e}", exc_info=True)

    # Log cost information
    if run_cost is not None and run_cost > 0:
        token_parts = []
        if input_tokens > 0:
            token_parts.append(f"{input_tokens:,} input")
        if output_tokens > 0:
            token_parts.append(f"{output_tokens:,} output")
        if cache_read_tokens > 0:
            token_parts.append(f"{cache_read_tokens:,} cache read")
        if cache_write_tokens > 0:
            token_parts.append(f"{cache_write_tokens:,} cache write")
        token_info = f" ({', '.join(token_parts)} tokens)" if token_parts else ""
        logger.info(f"Run cost: ${run_cost:.6f}{token_info}")

        # Show warning on first request about unknown cache write status
        if is_first_request and cache_read_tokens > 0:
            logger.warning(
                "First request - cache write cost unknown (OpenRouter limitation)"
            )

    return run_cost, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, is_first_request
