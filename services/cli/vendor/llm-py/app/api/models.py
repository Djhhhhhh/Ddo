"""
Model management API routes.

Provides model list and model information endpoints with caching.
"""

import time
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.core.openrouter import get_openrouter_client, OpenRouterError, OpenRouterAuthError
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class ModelInfo(BaseModel):
    """Model information model."""

    id: str = Field(..., description="Model identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(None, description="Model description")
    context_length: Optional[int] = Field(None, description="Maximum context length")
    pricing: Optional[Dict[str, Any]] = Field(None, description="Pricing information")


class ModelsResponse(BaseModel):
    """Models list response."""

    models: List[ModelInfo]
    total: int
    cached: bool = False
    cache_age_seconds: Optional[int] = None


# In-memory cache
_models_cache: Optional[List[Dict[str, Any]]] = None
_cache_timestamp: Optional[float] = None
_CACHE_TTL_SECONDS = 3600  # 1 hour


def _format_model_info(model_data: Dict[str, Any]) -> ModelInfo:
    """Format raw model data into ModelInfo."""
    return ModelInfo(
        id=model_data.get("id", ""),
        name=model_data.get("name", model_data.get("id", "")),
        description=model_data.get("description"),
        context_length=model_data.get("context_length"),
        pricing=model_data.get("pricing"),
    )


def _get_cached_models() -> Optional[List[Dict[str, Any]]]:
    """Get cached models if not expired."""
    global _models_cache, _cache_timestamp

    if _models_cache is None or _cache_timestamp is None:
        return None

    elapsed = time.time() - _cache_timestamp
    if elapsed > _CACHE_TTL_SECONDS:
        logger.info("[models_cache_expired] elapsed_seconds=%d", int(elapsed))
        return None

    return _models_cache


def _set_cached_models(models: List[Dict[str, Any]]) -> None:
    """Cache models with timestamp."""
    global _models_cache, _cache_timestamp

    _models_cache = models
    _cache_timestamp = time.time()
    logger.info("[models_cache_set] count=%d", len(models))


@router.get(
    "/",
    response_model=ModelsResponse,
    status_code=status.HTTP_200_OK,
    summary="List models",
    description="Get list of available LLM models from OpenRouter with caching.",
)
async def list_models(refresh: bool = False) -> ModelsResponse:
    """
    List available models.

    Args:
        refresh: Force refresh cache from OpenRouter.

    Returns:
        List of available models with metadata.

    Raises:
        HTTPException: If OpenRouter API call fails.
    """
    # Check cache first
    if not refresh:
        cached = _get_cached_models()
        if cached:
            cache_age = int(time.time() - _cache_timestamp)
            return ModelsResponse(
                models=[_format_model_info(m) for m in cached],
                total=len(cached),
                cached=True,
                cache_age_seconds=cache_age,
            )

    # Fetch from OpenRouter
    client = get_openrouter_client()

    try:
        models = await client.fetch_models()

        # Update cache
        _set_cached_models(models)

        return ModelsResponse(
            models=[_format_model_info(m) for m in models],
            total=len(models),
            cached=False,
            cache_age_seconds=0,
        )

    except OpenRouterAuthError as e:
        # Return default models if API not configured
        logger.warning(f"[models_fetch_fallback] reason=auth_error error={e.message}")

        default_models = [
            ModelInfo(
                id="anthropic/claude-3.5-sonnet",
                name="Claude 3.5 Sonnet",
                description="Claude 3.5 Sonnet by Anthropic - balanced performance",
                context_length=200000,
            ),
            ModelInfo(
                id="anthropic/claude-3.7-sonnet",
                name="Claude 3.7 Sonnet",
                description="Claude 3.7 Sonnet by Anthropic - enhanced reasoning",
                context_length=200000,
            ),
            ModelInfo(
                id="gpt-4o",
                name="GPT-4o",
                description="GPT-4o by OpenAI - multimodal model",
                context_length=128000,
            ),
            ModelInfo(
                id="deepseek/deepseek-chat",
                name="DeepSeek V3",
                description="DeepSeek V3 - cost-effective reasoning",
                context_length=64000,
            ),
        ]

        return ModelsResponse(
            models=default_models,
            total=len(default_models),
            cached=False,
        )

    except OpenRouterError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch models: {e.message}",
        )


@router.post(
    "/refresh",
    response_model=ModelsResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh model list",
    description="Force refresh cached model list from OpenRouter.",
)
async def refresh_models() -> ModelsResponse:
    """
    Force refresh model list from OpenRouter.

    Returns:
        Updated list of available models.
    """
    return await list_models(refresh=True)


@router.get(
    "/{model_id}",
    response_model=ModelInfo,
    status_code=status.HTTP_200_OK,
    summary="Get model info",
    description="Get detailed information about a specific model.",
)
async def get_model(model_id: str) -> ModelInfo:
    """
    Get model information.

    Args:
        model_id: Model identifier.

    Returns:
        Model information.

    Raises:
        HTTPException: If model not found.
    """
    # Try to find in cache first
    cached = _get_cached_models()
    if cached:
        for model in cached:
            if model.get("id") == model_id:
                return _format_model_info(model)

    # Fetch fresh list if not in cache
    models_response = await list_models()

    for model in models_response.models:
        if model.id == model_id:
            return model

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Model '{model_id}' not found",
    )
