"""
SQLAlchemy models for conversation storage.

Defines Conversation and Message tables with memory system extensions.
"""

import uuid
from datetime import datetime, date
from typing import Optional, Dict, Any

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Integer, Boolean, Float, Date, JSON
)
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


class Conversation(Base):
    """Conversation session table - supports multi-turn dialogue grouping."""
    
    __tablename__ = "conversations"
    __allow_unmapped__ = True  # Allow legacy type annotations
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), index=True, nullable=True)  # Frontend session identifier
    title = Column(String(255), nullable=True)  # Conversation title (auto summary or user set)
    
    # System memory reserved fields
    context_summary = Column(Text, nullable=True)  # Context summary (for memory system)
    memory_enabled = Column(Boolean, default=False)  # Whether memory enhancement is enabled
    memory_checkpoint = Column(String(36), nullable=True)  # Memory checkpoint ID
    
    # Metadata
    source = Column(String(50), default="api")  # Source: api, cli, web
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    
    def to_dict(self, include_messages: bool = False, message_count: int = 0) -> Dict[str, Any]:
        """Convert to dictionary."""
        messages = []
        actual_count = message_count

        if include_messages and self.messages:
            messages = [msg.to_dict() for msg in self.messages]
            actual_count = len(messages)
        elif include_messages:
            actual_count = 0

        data = {
            "id": self.id,
            "session_id": self.session_id,
            "title": self.title,
            "memory_enabled": self.memory_enabled,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "message_count": actual_count,
        }

        if include_messages:
            data["messages"] = messages

        return data


class Message(Base):
    """Message record table - stores each LLM interaction."""
    
    __tablename__ = "messages"
    __allow_unmapped__ = True  # Allow legacy type annotations
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), index=True, nullable=False)
    
    # Message content
    role = Column(String(20), nullable=False)  # system, user, assistant
    content = Column(Text, nullable=False)
    
    # LLM call information
    model = Column(String(100), nullable=True)  # Model used
    provider = Column(String(50), nullable=True, default="openrouter")  # Provider: openrouter, local
    
    # Token statistics (from LLM response)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # Performance metrics
    latency_ms = Column(Integer, nullable=True)  # Response latency in milliseconds
    
    # Memory reserved fields
    embedding_id = Column(String(36), nullable=True)  # Vector store ID (for memory retrieval)
    importance_score = Column(Float, nullable=True)  # Importance score (memory priority)
    
    # Extra metadata
    extra_data = Column("metadata", JSON, default=dict)  # Extended fields: intent, sources, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "model": self.model,
            "provider": self.provider,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "latency_ms": self.latency_ms,
            "metadata": self.extra_data or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DailyStats(Base):
    """Daily statistics table - pre-aggregated for query performance."""
    
    __tablename__ = "daily_stats"
    __allow_unmapped__ = True  # Allow legacy type annotations
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    date = Column(Date, unique=True, index=True, nullable=False)  # Statistics date
    
    # Call statistics
    total_requests = Column(Integer, default=0)  # Total requests
    total_tokens = Column(Integer, default=0)  # Total token consumption
    avg_latency_ms = Column(Integer, default=0)  # Average latency
    
    # Model distribution (JSON storage)
    model_distribution = Column(JSON, default=dict)  # {"anthropic/claude-3.5": 100, ...}
    
    # Source distribution
    source_distribution = Column(JSON, default=dict)  # {"api": 50, "cli": 30, "web": 20}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "date": self.date.isoformat() if self.date else None,
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens,
            "avg_latency_ms": self.avg_latency_ms,
            "model_distribution": self.model_distribution or {},
            "source_distribution": self.source_distribution or {},
        }
