"""
Model management API routes.

Provides model list and model information endpoints.

TODO: Implement actual model management (Task p2-6)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter()


class ModelInfo(BaseModel):
    """Model information model."""

    id: str = Field(..., description="Model identifier")
    description: Optional[str] = Field(None, description="Model description")
    context_length: Optional[int] = Field(None, description="Maximum context length")
    pricing: Optional[dict] = Field(None, description="Pricing information")


class ModelsResponse(BaseModel):
    """Models list response."""

    models: List[ModelInfo]
    total: int


@router.get(
    "/",
    response_model=ModelsResponse,
    status_code=status.HTTP_200_OK,
    summary="List models",
    description="Get list of available LLM models from OpenRouter.",
)
async def list_models() -> ModelsResponse:
    """
    List available models.

    Returns:
        List of available models with metadata.

    TODO: Implement actual model fetching from OpenRouter in p2-6
    """
    # Return placeholder response
    return ModelsResponse(
        models=[
            ModelInfo(
                id="anthropic/claude-3.5-sonnet",
                description="Claude 3.5 Sonnet by Anthropic",
                context_length=200000,
            ),
        ],
        total=1,
    )


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

    TODO: Implement actual model fetching from OpenRouter in p2-6
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Model info not yet implemented for {model_id}. See task p2-6.",
    )
