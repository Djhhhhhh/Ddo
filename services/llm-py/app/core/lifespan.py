"""
Application lifespan management.

Handles startup and shutdown events.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.openrouter import close_openrouter_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan.

    Startup:
    - Validate configuration
    - Initialize connections

    Shutdown:
    - Cleanup resources (close HTTP client)
    """
    # Startup
    settings = get_settings()
    logger.info(f"Starting llm-py service v{app.version}")
    logger.info(f"Log level: {settings.log_level}")
    logger.info(f"RAG enabled: {settings.rag_enabled}")

    if not settings.openrouter_enabled:
        logger.warning("DDO_OPENROUTER_API_KEY not configured. Chat functionality will be limited.")
    else:
        logger.info("OpenRouter API Key configured")

    if not settings.llm_default_model:
        logger.warning("DDO_LLM_MODEL not configured. Please set the default LLM model.")
        logger.warning("Example: set DDO_LLM_MODEL=anthropic/claude-3.5-sonnet")
    else:
        logger.info(f"Default LLM model: {settings.llm_default_model}")

    yield

    # Shutdown
    logger.info("Shutting down llm-py service...")
    await close_openrouter_client()
    logger.info("Cleanup complete")
