"""
RAG models for API requests and responses.

Defines Pydantic models for RAG-related data structures.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ==================== Document Embedding ====================

class EmbedRequest(BaseModel):
    """Document embedding request."""

    documents: List[str] = Field(..., description="Documents to embed")
    metadata: Optional[List[Dict[str, Any]]] = Field(None, description="Optional metadata for each document")
    model: Optional[str] = Field(None, description="Embedding model name (optional, defaults to env DDO_LLM_MODEL or system default)")


class EmbedResponse(BaseModel):
    """Document embedding response."""

    document_ids: List[str] = Field(..., description="IDs of embedded documents")
    embeddings_count: int = Field(..., description="Number of embeddings created")


# ==================== Search ====================

class SearchRequest(BaseModel):
    """Semantic search request."""

    query: str = Field(..., description="Search query text")
    collection: str = Field("default", description="Collection name to search in")
    top_k: int = Field(5, ge=1, le=50, description="Number of results to return")
    min_score: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity score")


class SearchResult(BaseModel):
    """Single search result item."""

    document_id: str = Field(..., description="Document ID")
    content: str = Field(..., description="Document content")
    score: float = Field(..., ge=0, le=1, description="Similarity score")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")


class SearchResponse(BaseModel):
    """Semantic search response."""

    documents: List[SearchResult] = Field(..., description="Search results")
    total: int = Field(..., description="Total results returned")
    collection: str = Field(..., description="Collection searched")


# ==================== RAG Q&A ====================

class RAGAskRequest(BaseModel):
    """RAG Q&A request."""

    question: str = Field(..., description="Question to ask")
    collection: str = Field("default", description="Collection to search")
    top_k: int = Field(5, ge=1, le=20, description="Number of documents to retrieve")
    min_score: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity score for retrieval")
    model: Optional[str] = Field(None, description="Model to use for generation")
    stream: bool = Field(False, description="Enable streaming response")


class RAGCitation(BaseModel):
    """Citation for RAG answer source."""

    document_id: str = Field(..., description="Source document ID")
    content_preview: str = Field(..., description="Preview of source content")
    score: float = Field(..., description="Relevance score")


class RAGAskResponse(BaseModel):
    """RAG Q&A response (non-streaming)."""

    answer: str = Field(..., description="Generated answer")
    citations: List[RAGCitation] = Field(default_factory=list, description="Source citations")
    model: str = Field(..., description="Model used for generation")
    search_stats: Dict[str, Any] = Field(default_factory=dict, description="Search statistics")


# ==================== Document Management ====================

class DocumentInfo(BaseModel):
    """Document information."""

    document_id: str = Field(..., description="Document ID")
    content_preview: str = Field(..., description="Content preview")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")


class DocumentListResponse(BaseModel):
    """Document list response."""

    documents: List[DocumentInfo] = Field(..., description="Document list")
    total: int = Field(..., description="Total document count")
    collection: str = Field(..., description="Collection name")


class CollectionStats(BaseModel):
    """Collection statistics response."""

    collection: str = Field(..., description="Collection name")
    count: int = Field(..., description="Number of documents")
    store_type: str = Field(..., description="Vector store type (chroma/faiss)")


class CollectionListResponse(BaseModel):
    """Collection list response."""

    collections: List[str] = Field(..., description="Collection names")
    total: int = Field(..., description="Total collections")
