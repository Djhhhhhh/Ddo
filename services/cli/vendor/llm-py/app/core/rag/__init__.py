"""
RAG Engine package.

Provides Retriever and Generator services for RAG Q&A.
"""

from app.core.rag.retriever import RetrieverService, get_retriever_service, RetrievedDocument
from app.core.rag.generator import GeneratorService, get_generator_service
from app.core.rag.vector_store import (
    BaseVectorStore,
    ChromaVectorStore,
    FAISSVectorStore,
    get_vector_store,
)

__all__ = [
    # Retriever
    "RetrieverService",
    "get_retriever_service",
    "RetrievedDocument",
    # Generator
    "GeneratorService",
    "get_generator_service",
    # Vector Store
    "BaseVectorStore",
    "ChromaVectorStore",
    "FAISSVectorStore",
    "get_vector_store",
]
