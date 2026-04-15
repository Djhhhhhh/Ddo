"""
Document data models for RAG.

Defines shared data classes used by embedder, vector stores, and retrievers.
"""

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class DocumentEmbedding:
    """A document with its embedding vector and metadata."""

    document_id: str
    content: str
    embedding: List[float]
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)


@dataclass
class StoredDocument:
    """A document stored in vector store (same structure as DocumentEmbedding)."""

    document_id: str
    content: str
    embedding: List[float]
    metadata: Dict[str, Any] = field(default_factory=dict)
