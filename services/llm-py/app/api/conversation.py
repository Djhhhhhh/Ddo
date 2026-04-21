"""
Conversation management API routes.

Provides endpoints for listing, retrieving, and deleting conversations.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services.conversation_service import ConversationService

logger = logging.getLogger(__name__)
router = APIRouter()


class ConversationListResponse(BaseModel):
    """Conversation list response."""
    items: list = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0


class ConversationDetailResponse(BaseModel):
    """Conversation detail response."""
    id: str
    session_id: Optional[str] = None
    title: Optional[str] = None
    memory_enabled: bool = False
    source: str = "api"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    message_count: int = 0
    messages: Optional[list] = None


class MessageListResponse(BaseModel):
    """Message list response."""
    items: list = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 50
    total_pages: int = 0


@router.get(
    "",
    response_model=ConversationListResponse,
    summary="List conversations",
    description="List all conversations with pagination and filters."
)
async def list_conversations(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    start_date: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    source: Optional[str] = Query(None, description="Filter by source (api/cli/web)"),
    session: AsyncSession = Depends(get_session)
):
    """List conversations with filters."""
    try:
        # Parse dates
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        
        service = ConversationService(session)
        result = await service.list_conversations(
            page=page,
            page_size=page_size,
            session_id=session_id,
            start_date=start_dt,
            end_date=end_dt,
            source=source
        )
        
        return ConversationListResponse(**result)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {e}"
        )
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list conversations: {str(e)}"
        )


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation details",
    description="Get conversation by ID with all messages."
)
async def get_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get conversation details with messages."""
    try:
        service = ConversationService(session)
        conversation = await service.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conversation_id}"
            )
        
        return conversation.to_dict(include_messages=True)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )


@router.delete(
    "/{conversation_id}",
    summary="Delete conversation",
    description="Delete a conversation and all its messages."
)
async def delete_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Delete a conversation."""
    try:
        service = ConversationService(session)
        deleted = await service.delete_conversation(conversation_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conversation_id}"
            )
        
        return {"code": 0, "message": "Conversation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )


@router.get(
    "/{conversation_id}/messages",
    response_model=MessageListResponse,
    summary="List messages",
    description="List messages in a conversation."
)
async def list_messages(
    conversation_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    session: AsyncSession = Depends(get_session)
):
    """List messages in a conversation."""
    try:
        service = ConversationService(session)
        
        # Verify conversation exists
        conversation = await service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conversation_id}"
            )
        
        result = await service.list_messages(
            conversation_id=conversation_id,
            page=page,
            page_size=page_size
        )
        
        return MessageListResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list messages: {str(e)}"
        )
