"""
Application lifespan management.

Handles startup and shutdown events.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan.

    Startup:
    - Validate configuration
    - Initialize connections

    Shutdown:
    - Cleanup resources
    """
    # Startup
    settings = get_settings()
    logger.info(f"Starting llm-py service v{app.version}")
    logger.info(f"Log level: {settings.log_level}")
    logger.info(f"RAG enabled: {settings.rag_enabled}")

    if not settings.openrouter_enabled:
        logger.warning("OpenRouter API Key not configured. Chat functionality will be limited.")
    else:
        logger.info("OpenRouter configuration validated")

    yield

    # Shutdown
    logger.info("Shutting down llm-py service...")
