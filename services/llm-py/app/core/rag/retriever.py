"""
Retriever service for RAG.

Provides semantic search capabilities using vector similarity.
"""

import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.core.embedder import get_embedder_service
from app.core.rag.vector_store import (
    BaseVectorStore,
    StoredDocument,
    get_vector_store,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class RetrievedDocument:
    """A retrieved document with similarity score."""

    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]


class RetrieverService:
    """
    Service for semantic document retrieval.

    Combines embedding + vector store search to find relevant documents.
    """

    def __init__(self, vector_store: Optional[BaseVectorStore] = None):
        """
        Initialize retriever service.

        Args:
            vector_store: Vector store instance. If None, uses global instance.
        """
        self.vector_store = vector_store or get_vector_store()
        self.settings = get_settings()
        logger.info("[retriever_init] service_initialized")

    async def search(
        self,
        query: str,
        collection: str = "default",
        top_k: Optional[int] = None,
        min_score: Optional[float] = None,
    ) -> List[RetrievedDocument]:
        """
        Search for relevant documents.

        Args:
            query: Search query text.
            collection: Collection name to search in.
            top_k: Maximum number of results. Defaults to settings.rag_top_k.
            min_score: Minimum similarity score (0-1). Defaults to 0.7.

        Returns:
            List of retrieved documents sorted by relevance.
        """
        top_k = top_k or self.settings.rag_top_k
        min_score = min_score if min_score is not None else 0.7

        start_time = time.time()
        logger.info(
            f"[retriever_search_start] query_length={len(query)} "
            f"collection={collection} top_k={top_k} min_score={min_score}"
        )

        try:
            # Generate query embedding
            embedder = get_embedder_service()
            query_embedding = await embedder.embed_query(query)

            logger.debug(
                f"[retriever_query_embedded] collection={collection} "
                f"dimensions={len(query_embedding)}"
            )

            # Search in vector store
            results = await self.vector_store.search(
                query_embedding=query_embedding,
                top_k=top_k,
                collection=collection,
                min_score=min_score,
            )

            # Convert to RetrievedDocument
            documents = []
            for doc, score in results:
                retrieved = RetrievedDocument(
                    document_id=doc.document_id,
                    content=doc.content,
                    score=score,
                    metadata=doc.metadata,
                )
                documents.append(retrieved)

            duration = (time.time() - start_time) * 1000

            # Event: rag_search_executed
            logger.info(
                f"[rag_search_executed] collection={collection} "
                f"query_length={len(query)} results={len(documents)} "
                f"duration_ms={duration:.1f} top_k={top_k} min_score={min_score}"
            )

            return documents

        except Exception as e:
            logger.error(
                f"[retriever_search_error] error={type(e).__name__} "
                f"message={str(e)}"
            )
            raise

    async def get_collection_stats(self, collection: str = "default") -> Dict[str, Any]:
        """
        Get collection statistics.

        Args:
            collection: Collection name.

        Returns:
            Dictionary with stats.
        """
        stats = await self.vector_store.get_collection_stats(collection)
        logger.debug(f"[retriever_stats] collection={collection} stats={stats}")
        return stats

    async def list_collections(self) -> List[str]:
        """List all collections."""
        return await self.vector_store.list_collections()


# Global instance
_retriever_service: Optional[RetrieverService] = None


def get_retriever_service() -> RetrieverService:
    """Get or create global retriever service."""
    global _retriever_service
    if _retriever_service is None:
        _retriever_service = RetrieverService()
    return _retriever_service


def reset_retriever_service() -> None:
    """Reset the global retriever service."""
    global _retriever_service
    _retriever_service = None
    logger.info("[retriever_reset] service_reset")
