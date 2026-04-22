"""
Chat Completion API routes - "大门"层

FastAPI 职责：
- HTTP 路由和请求验证
- 序列化/反序列化
- 并发控制（流式响应）
- 错误处理和状态码映射

业务逻辑由 LangChain "大脑"层处理
"""

import time
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm_factory import get_llm_factory, LLMFactoryError
from app.db import get_session
from app.services.conversation_service import ConversationService
from app.utils.logger import get_logger

logger = get_logger(__name__)
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
    system_prompt: Optional[str] = Field(None, description="System prompt override")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for continuity")
    session_id: Optional[str] = Field(None, description="Session ID for grouping")
    preset_reply: Optional[str] = Field(None, description="Preset reply content (skip LLM call)")


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


def _map_llm_error_to_http(error: LLMFactoryError) -> HTTPException:
    """Map LLM Factory errors to appropriate HTTP responses."""
    error_msg = str(error).lower()

    if "api key" in error_msg or "not configured" in error_msg:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Configuration error: {error}",
        )
    elif "model" in error_msg and "not specified" in error_msg:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model configuration error: {error}",
        )
    else:
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM service error: {error}",
        )


@router.post(
    "/completions",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat completion",
    description="Chat completion using LangChain orchestration.",
    responses={
        400: {"description": "Missing model configuration"},
        401: {"description": "Invalid or missing API key"},
        502: {"description": "LLM service error"},
    },
)
async def chat_completions(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session)
) -> Dict[str, Any]:
    """
    Chat completion endpoint (non-streaming).

    Args:
        request: Chat completion request with messages and parameters.

    Returns:
        Chat completion response.
    """
    factory = get_llm_factory()
    start_time = time.time()

    try:
        # Convert messages to dict format for LangChain
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # Get model from request or config
        model = request.model or factory.settings.llm_default_model

        logger.info(
            f"[chat_request] model={model} stream=false messages={len(messages)}"
        )

        # Get or create conversation
        conv_service = ConversationService(session)
        conversation = await conv_service.get_or_create_conversation(
            session_id=request.session_id,
            conversation_id=request.conversation_id,
            source="api"
        )

        # Store user message (last message from user)
        last_user_msg = None
        for msg in reversed(messages):
            if msg["role"] == "user":
                last_user_msg = msg["content"]
                break

        if last_user_msg:
            await conv_service.add_message(
                conversation_id=conversation.id,
                role="user",
                content=last_user_msg,
                model=model,
            )

        # Use preset reply or call LLM
        if request.preset_reply:
            response_text = request.preset_reply
            latency_ms = 0  # Preset reply has no latency
            logger.info(f"[chat_preset_reply] conversation={conversation.id[:8]} using preset reply")
        else:
            # Call LangChain brain
            response_text = await factory.chat(
                messages=messages,
                model=model,
                temperature=request.temperature or 0.7,
                system_prompt=request.system_prompt,
            )
            latency_ms = int((time.time() - start_time) * 1000)

        # Store assistant response
        await conv_service.add_message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_text,
            model=model,
            latency_ms=latency_ms,
        )

        logger.info(f"[chat_complete] model={model} response_length={len(response_text)} latency={latency_ms}ms")

        # Format response to match OpenAI-compatible format
        return {
            "id": f"chatcmpl-{conversation.id[:8]}",
            "model": model,
            "conversation_id": conversation.id,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text,
                },
                "finish_reason": "stop",
            }],
            "usage": {
                "prompt_tokens": -1,  # Not available from simple response
                "completion_tokens": -1,
                "total_tokens": -1,
            },
        }

    except LLMFactoryError as e:
        raise _map_llm_error_to_http(e)
    except Exception as e:
        error_str = str(e)
        # 处理 OpenRouter 错误响应（如 524 超时）
        if "Response validation failed" in error_str or "validation errors" in error_str:
            logger.error(f"[chat_openrouter_error] error={error_str}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="LLM service timeout or unavailable. Please try again later.",
            )
        # 处理其他异常
        logger.error(f"[chat_error] error={error_str}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unexpected error: {error_str}",
        )


@router.post(
    "/completions/stream",
    summary="Chat completion streaming",
    description="Stream chat completion using LangChain with SSE.",
    responses={
        400: {"description": "Missing model configuration"},
        401: {"description": "Invalid or missing API key"},
    },
)
async def chat_completions_stream(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Streaming chat completion endpoint.

    Args:
        request: Chat completion request with messages and parameters.

    Returns:
        Server-Sent Events stream.
    """
    factory = get_llm_factory()
    start_time = time.time()

    try:
        # Convert messages
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        model = request.model or factory.settings.llm_default_model

        logger.info(
            f"[chat_request] model={model} stream=true messages={len(messages)}"
        )

        # Get or create conversation
        conv_service = ConversationService(session)
        conversation = await conv_service.get_or_create_conversation(
            session_id=request.session_id,
            conversation_id=request.conversation_id,
            source="api"
        )

        # Store user message (last message from user)
        last_user_msg = None
        for msg in reversed(messages):
            if msg["role"] == "user":
                last_user_msg = msg["content"]
                break

        if last_user_msg:
            await conv_service.add_message(
                conversation_id=conversation.id,
                role="user",
                content=last_user_msg,
                model=model,
            )

        async def event_stream():
            """Generate SSE events from LangChain stream."""
            full_response = []
            try:
                chunk_index = 0
                async for chunk in factory.stream_chat(
                    messages=messages,
                    model=model,
                    temperature=request.temperature or 0.7,
                    system_prompt=request.system_prompt,
                ):
                    chunk_index += 1
                    full_response.append(chunk)
                    # Format as SSE data with proper JSON escaping
                    import json
                    sse_data = {"choices": [{"delta": {"content": chunk}, "index": 0}]}
                    data = f"data: {json.dumps(sse_data)}\n\n"
                    yield data

                # End marker
                latency_ms = int((time.time() - start_time) * 1000)
                logger.info(f"[chat_stream_complete] model={model} chunks={chunk_index} latency={latency_ms}ms")
                yield "data: [DONE]\n\n"

                # Store assistant response after stream completes
                try:
                    response_text = "".join(full_response)
                    await conv_service.add_message(
                        conversation_id=conversation.id,
                        role="assistant",
                        content=response_text,
                        model=model,
                        latency_ms=latency_ms,
                    )
                except Exception as e:
                    logger.error(f"[chat_stream_save_error] error={str(e)}")

            except Exception as e:
                logger.error(f"[chat_stream_error] error={str(e)}")
                yield 'data: {"error": "' + str(e).replace('"', '\\"') + '"}\n\n'
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "X-Conversation-ID": conversation.id,
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except LLMFactoryError as e:
        raise _map_llm_error_to_http(e)
    except Exception as e:
        logger.error(f"[chat_stream_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stream error: {str(e)}",
        )
