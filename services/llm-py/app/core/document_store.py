"""
Document store for RAG.

Provides temporary in-memory storage for embedded documents.
This is a placeholder implementation that will be replaced with
a persistent vector store (Chroma/FAISS) in task p2-8.
"""

import time
import uuid
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class DocumentEmbedding:
    """A document with its embedding vector and metadata."""

    document_id: str
    content: str
    embedding: List[float]
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)


class InMemoryDocumentStore:
    """
    In-memory document store for embedded documents.

    This is a temporary implementation for p2-7 (Embedder).
    In p2-8, this will be replaced with ChromaDB or FAISS integration.

    Thread-safe operations using a lock.
    """

    def __init__(self):
        self._store: Dict[str, DocumentEmbedding] = {}
        self._lock = Lock()

    def add(self, document: DocumentEmbedding) -> str:
        """
        Add a document to the store.

        Args:
            document: The document embedding to add.

        Returns:
            The document ID.
        """
        with self._lock:
            self._store[document.document_id] = document
        return document.document_id

    def add_batch(self, documents: List[DocumentEmbedding]) -> List[str]:
        """
        Add multiple documents to the store.

        Args:
            documents: List of document embeddings to add.

        Returns:
            List of document IDs.
        """
        with self._lock:
            for doc in documents:
                self._store[doc.document_id] = doc
        return [doc.document_id for doc in documents]

    def get(self, document_id: str) -> Optional[DocumentEmbedding]:
        """
        Retrieve a document by ID.

        Args:
            document_id: The document ID.

        Returns:
            The document embedding or None if not found.
        """
        with self._lock:
            return self._store.get(document_id)

    def delete(self, document_id: str) -> bool:
        """
        Delete a document by ID.

        Args:
            document_id: The document ID.

        Returns:
            True if deleted, False if not found.
        """
        with self._lock:
            if document_id in self._store:
                del self._store[document_id]
                return True
            return False

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[DocumentEmbedding]:
        """
        List documents with pagination.

        Args:
            skip: Number of documents to skip.
            limit: Maximum number of documents to return.

        Returns:
            List of document embeddings.
        """
        with self._lock:
            docs = list(self._store.values())
            return docs[skip:skip + limit]

    def count(self) -> int:
        """
        Get total document count.

        Returns:
            Number of documents in store.
        """
        with self._lock:
            return len(self._store)

    def clear(self) -> None:
        """Clear all documents from the store."""
        with self._lock:
            self._store.clear()

    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[tuple[DocumentEmbedding, float]]:
        """
        Perform cosine similarity search.

        Args:
            query_embedding: The query vector.
            top_k: Number of top results to return.

        Returns:
            List of (document, score) tuples sorted by similarity.

        Note:
            This is a placeholder implementation for p2-7.
            In p2-8, this will use vector database optimized search.
        """
        import math

        def cosine_similarity(a: List[float], b: List[float]) -> float:
            """Calculate cosine similarity between two vectors."""
            dot_product = sum(x * y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x * x for x in a))
            norm_b = math.sqrt(sum(x * x for x in b))
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return dot_product / (norm_a * norm_b)

        with self._lock:
            results = []
            for doc in self._store.values():
                score = cosine_similarity(query_embedding, doc.embedding)
                results.append((doc, score))

        # Sort by similarity score (descending)
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]


# Global singleton instance
document_store = InMemoryDocumentStore()


def get_document_store() -> InMemoryDocumentStore:
    """Get the global document store instance."""
    return document_store
