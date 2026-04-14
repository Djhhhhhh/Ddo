"""
Logging configuration for llm-py.

Provides structured logging with consistent format.
"""

import logging
import sys
from typing import Any

from app.core.config import get_settings


def setup_logging() -> None:
    """Configure root logger for the application."""
    settings = get_settings()

    # Get log level
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )

    # Set uvicorn loggers
    logging.getLogger("uvicorn").setLevel(log_level)
    logging.getLogger("uvicorn.access").setLevel(log_level)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


def log_request_start(logger: logging.Logger, request_id: str, **kwargs: Any) -> None:
    """Log request start event."""
    logger.info(f"[llm_request_start] request_id={request_id} {format_extra(kwargs)}")


def log_request_complete(
    logger: logging.Logger,
    request_id: str,
    duration_ms: float,
    tokens: int = 0,
    **kwargs: Any
) -> None:
    """Log request complete event."""
    extra = format_extra(kwargs)
    logger.info(
        f"[llm_request_complete] request_id={request_id} "
        f"duration_ms={duration_ms:.2f} tokens={tokens} {extra}"
    )


def log_request_error(
    logger: logging.Logger,
    request_id: str,
    error: str,
    **kwargs: Any
) -> None:
    """Log request error event."""
    extra = format_extra(kwargs)
    logger.error(f"[llm_request_error] request_id={request_id} error={error} {extra}")


def format_extra(kwargs: dict) -> str:
    """Format extra keyword arguments for logging."""
    return " ".join(f"{k}={v}" for k, v in kwargs.items())
