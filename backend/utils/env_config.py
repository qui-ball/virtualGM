"""Numeric environment-variable reads with a shared fallback policy.

Operator-tunable limits (cache budgets, rate limits, stream ceilings) all behave the
same way: an unset, non-numeric, or non-positive value falls back to the documented
default rather than disabling the safeguard it configures.
"""

from __future__ import annotations

import os

from loguru import logger


def positive_number(name: str, default: float) -> float:
    """Read ``name`` as a positive number, falling back to ``default``."""
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        logger.warning(f"{name} is not numeric; using default {default}")
        return default
    if value <= 0:
        logger.warning(f"{name} must be positive; using default {default}")
        return default
    return value


def positive_int(name: str, default: int) -> int:
    """Read ``name`` as a positive integer, falling back to ``default``."""
    return int(positive_number(name, default))
