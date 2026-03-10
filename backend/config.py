"""Logging, telemetry, and environment configuration."""

import os
import sys

import dotenv
import logfire
from loguru import logger

dotenv.load_dotenv()

# Configure loguru
loguru_level = os.getenv("LOGURU_LEVEL", "INFO").upper()
logger.remove()
logger.add(
    sys.stderr,
    level=loguru_level,
    colorize=True,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)

# Configure Logfire
logfire_token = os.getenv("LOGFIRE_TOKEN")
logfire_environment = os.getenv("LOGFIRE_ENVIRONMENT", "development")

if logfire_token:
    logfire.configure(token=logfire_token, environment=logfire_environment)
else:
    logfire.configure(send_to_logfire=False)

logfire.instrument_pydantic_ai()
