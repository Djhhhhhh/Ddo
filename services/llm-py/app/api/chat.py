"""
Chat Completion API routes.

Provides OpenRouter chat completion proxy with streaming support.

TODO: Implement actual OpenRouter integration (Task p2-6)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message model."""

    role: Literal["system", "user", "assistant"] = Field(..., description="Message role")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat completion request model."""

    messages: List[ChatMessage] = Field(..., description="Conversation messages")
    model: Optional[str] = Field(None, description="Model ID (default from config)")
    stream: bool = Field(False, description="Enable streaming response")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, ge=1, description="Maximum tokens to generate")


class ChatResponseChoice(BaseModel):
    """Chat response choice model."""

    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


class UsageInfo(BaseModel):
    """Token usage information."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatResponse(BaseModel):
    """Chat completion response model."""

    id: str
    model: str
    choices: List[ChatResponseChoice]
    usage: UsageInfo


@router.post(
    "/completions",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat completion",
    description="Proxy chat completion request to OpenRouter.",
)
async def chat_completions(request: ChatRequest) -> Dict[str, Any]:
    """
    Chat completion endpoint.

    Args:
        request: Chat completion request with messages and parameters.

    Returns:
        Chat completion response from OpenRouter.

    TODO: Implement actual OpenRouter integration in p2-6
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Chat completion not yet implemented. See task p2-6.",
    )


@router.post(
    "/completions/stream",
    summary="Chat completion streaming",
    description="Stream chat completion response from OpenRouter using SSE.",
)
async def chat_completions_stream(request: ChatRequest):
    """
    Streaming chat completion endpoint.

    Args:
        request: Chat completion request with messages and parameters.

    Returns:
        Server-Sent Events stream of chat completion chunks.

    TODO: Implement actual OpenRouter streaming integration in p2-6
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Streaming chat completion not yet implemented. See task p2-6.",
    )
