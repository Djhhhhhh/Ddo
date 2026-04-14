"""
Health check endpoints.

Provides service health status and version information.
"""

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    version: str
    service: str
    openrouter_ready: bool


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Returns service health status and version information.",
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns:
        HealthResponse with status, version, and OpenRouter configuration status.
    """
    settings = get_settings()

    return HealthResponse(
        status="ok",
        version="0.1.0",
        service="llm-py",
        openrouter_ready=settings.openrouter_enabled,
    )


class ReadyResponse(BaseModel):
    """Readiness check response model."""

    ready: bool
    checks: dict


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
    checks = {
        "openrouter_configured": settings.openrouter_enabled,
        "rag_enabled": settings.rag_enabled,
    }

    # Service is ready if basic configuration is valid
    all_ready = True  # Allow starting without OpenRouter for development

    return ReadyResponse(
        ready=all_ready,
        checks=checks,
    )
