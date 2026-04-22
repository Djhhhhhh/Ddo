"""
Data models for llm-py service.

Defines Pydantic models for API requests and responses.
"""

from app.models.document import DocumentEmbedding, StoredDocument
from app.models.rag import (
    # Embedding
    EmbedRequest,
    EmbedResponse,
    # Search
    SearchRequest,
    SearchResponse,
    SearchResult,
    # RAG Q&A
    RAGAskRequest,
    RAGAskResponse,
    RAGCitation,
    # Document Management
    DocumentInfo,
    DocumentListResponse,
    CollectionStats,
    CollectionListResponse,
)

__all__ = [
    # Core document models
    "DocumentEmbedding",
    "StoredDocument",
    # Embedding
    "EmbedRequest",
    "EmbedResponse",
    # Search
    "SearchRequest",
    "SearchResponse",
    "SearchResult",
    # RAG Q&A
    "RAGAskRequest",
    "RAGAskResponse",
    "RAGCitation",
    # Document Management
    "DocumentInfo",
    "DocumentListResponse",
    "CollectionStats",
    "CollectionListResponse",
]
