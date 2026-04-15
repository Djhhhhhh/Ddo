"""
Health check endpoints.

Provides service health status and dependency checks.
"""

from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Optional

from app.core.config import get_settings
from app.core.openrouter import get_openrouter_client

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    version: str
    service: str
    openrouter_configured: bool
    openrouter_connected: Optional[bool] = None


class ReadyResponse(BaseModel):
    """Readiness check response model."""

    ready: bool
    checks: dict


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Returns service health status and OpenRouter connection status.",
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns:
        HealthResponse with status, version, and OpenRouter connection info.
    """
    settings = get_settings()
    client = get_openrouter_client()

    # Test OpenRouter connection if configured
    openrouter_connected = None
    if settings.openrouter_enabled:
        openrouter_connected = await client.test_connection()

    return HealthResponse(
        status="ok",
        version="0.1.0",
        service="llm-py",
        openrouter_configured=settings.openrouter_enabled,
        openrouter_connected=openrouter_connected,
    )


@router.get(
    "/ready",
    response_model=ReadyResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness check",
    description="Detailed readiness check including dependency status.",
)
async def readiness_check() -> ReadyResponse:
    """
    Detailed readiness check.

    Returns:
        ReadyResponse with readiness status and individual check results.
    """
    settings = get_settings()
    client = get_openrouter_client()

    # Test OpenRouter connection
    openrouter_ok = True
    if settings.openrouter_enabled:
        openrouter_ok = await client.test_connection()

    checks = {
        "openrouter_configured": settings.openrouter_enabled,
        "openrouter_connected": openrouter_ok,
        "rag_enabled": settings.rag_enabled,
    }

    # Service is ready if basic configuration is valid
    # Note: Allow starting without OpenRouter for development
    all_ready = True

    return ReadyResponse(
        ready=all_ready,
        checks=checks,
    )
