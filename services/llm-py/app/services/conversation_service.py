"""
Conversation service for storing and retrieving chat history.

Provides async CRUD operations for conversations and messages.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlalchemy import select, desc, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Conversation, Message

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for managing conversation storage."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_conversation(
        self,
        session_id: Optional[str] = None,
        title: Optional[str] = None,
        source: str = "api",
        memory_enabled: bool = False
    ) -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(
            id=str(uuid4()),
            session_id=session_id,
            title=title,
            source=source,
            memory_enabled=memory_enabled,
        )
        self.session.add(conversation)
        await self.session.commit()
        await self.session.refresh(conversation)
        logger.info(f"Created conversation: {conversation.id}")
        return conversation
    
    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID with messages."""
        result = await self.session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()
    
    async def list_conversations(
        self,
        page: int = 1,
        page_size: int = 20,
        session_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        """List conversations with pagination and filters."""
        # Build query
        query = select(Conversation)

        if session_id:
            query = query.where(Conversation.session_id == session_id)
        if start_date:
            query = query.where(Conversation.created_at >= start_date)
        if end_date:
            query = query.where(Conversation.created_at <= end_date)
        if source:
            query = query.where(Conversation.source == source)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(desc(Conversation.updated_at))
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        conversations = result.scalars().all()

        # Get message counts separately to avoid async lazy loading issues
        conv_ids = [conv.id for conv in conversations]
        message_counts = {}
        if conv_ids:
            count_stmt = (
                select(Message.conversation_id, func.count().label("count"))
                .where(Message.conversation_id.in_(conv_ids))
                .group_by(Message.conversation_id)
            )
            count_result = await self.session.execute(count_stmt)
            message_counts = {row[0]: row[1] for row in count_result.all()}

        return {
            "items": [conv.to_dict(message_count=message_counts.get(conv.id, 0)) for conv in conversations],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and its messages."""
        result = await self.session.execute(
            delete(Conversation).where(Conversation.id == conversation_id)
        )
        await self.session.commit()
        deleted = result.rowcount > 0
        if deleted:
            logger.info(f"Deleted conversation: {conversation_id}")
        return deleted
    
    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
        latency_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """Add a message to a conversation."""
        # Ensure conversation exists
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation not found: {conversation_id}")
        
        message = Message(
            id=str(uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            model=model,
            provider=provider,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            metadata=metadata or {}
        )
        
        self.session.add(message)
        
        # Update conversation timestamp
        conversation.updated_at = datetime.utcnow()
        
        # Auto-generate title from first user message if not set
        if not conversation.title and role == "user":
            # Use first 50 chars of content as title
            conversation.title = content[:50] + ("..." if len(content) > 50 else "")
        
        await self.session.commit()
        await self.session.refresh(message)
        
        logger.info(f"Added message: {message.id} to conversation: {conversation_id}")
        return message
    
    async def list_messages(
        self,
        conversation_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """List messages in a conversation."""
        # Count total
        count_query = select(func.count()).where(Message.conversation_id == conversation_id)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Paginate
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        
        result = await self.session.execute(query)
        messages = result.scalars().all()
        
        return {
            "items": [msg.to_dict() for msg in messages],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    
    async def get_or_create_conversation(
        self,
        session_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        source: str = "api"
    ) -> Conversation:
        """Get existing conversation or create new one."""
        if conversation_id:
            conversation = await self.get_conversation(conversation_id)
            if conversation:
                return conversation
        
        return await self.create_conversation(
            session_id=session_id,
            source=source
        )
