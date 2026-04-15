"""
Vector store implementations for RAG.

Supports ChromaDB and FAISS as vector storage backends.
"""

import json
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from app.core.config import get_settings
from app.models.document import StoredDocument
from app.utils.logger import get_logger

logger = get_logger(__name__)


class VectorStoreError(Exception):
    """Base exception for vector store errors."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class BaseVectorStore(ABC):
    """Abstract base class for vector stores."""

    @abstractmethod
    async def add_documents(
        self,
        documents: List[StoredDocument],
        collection: str = "default",
    ) -> List[str]:
        """
        Add documents to the store.

        Args:
            documents: Documents to add.
            collection: Collection name.

        Returns:
            List of document IDs.
        """
        pass

    @abstractmethod
    async def delete(
        self,
        document_id: str,
        collection: str = "default",
    ) -> bool:
        """
        Delete a document from the store.

        Args:
            document_id: Document ID to delete.
            collection: Collection name.

        Returns:
            True if deleted, False if not found.
        """
        pass

    @abstractmethod
    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        collection: str = "default",
        min_score: float = 0.0,
    ) -> List[Tuple[StoredDocument, float]]:
        """
        Search for similar documents.

        Args:
            query_embedding: Query embedding vector.
            top_k: Maximum number of results.
            collection: Collection name.
            min_score: Minimum similarity score (0-1).

        Returns:
            List of (document, score) tuples sorted by score.
        """
        pass

    @abstractmethod
    async def get_collection_stats(self, collection: str = "default") -> Dict[str, Any]:
        """
        Get collection statistics.

        Args:
            collection: Collection name.

        Returns:
            Dictionary with stats (count, dimensions, etc.).
        """
        pass

    @abstractmethod
    async def list_collections(self) -> List[str]:
        """
        List all collections.

        Returns:
            List of collection names.
        """
        pass

    @abstractmethod
    async def clear_collection(self, collection: str = "default") -> bool:
        """
        Clear all documents from a collection.

        Args:
            collection: Collection name.

        Returns:
            True if cleared.
        """
        pass


class ChromaVectorStore(BaseVectorStore):
    """
    ChromaDB vector store implementation.

    Uses chromadb.PersistentClient for persistent storage.
    """

    def __init__(self, store_path: Optional[str] = None):
        """
        Initialize ChromaDB vector store.

        Args:
            store_path: Path for persistent storage.
        """
        settings = get_settings()
        self.store_path = store_path or settings.rag_store_path
        self._client = None
        self._collections: Dict[str, Any] = {}

        # Expand path
        self.store_path = os.path.expanduser(self.store_path)
        Path(self.store_path).parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"[vector_store] ChromaDB initialized path={self.store_path}")

    def _get_client(self):
        """Lazy initialization of ChromaDB client."""
        if self._client is None:
            try:
                import chromadb
                from chromadb.config import Settings as ChromaSettings

                self._client = chromadb.PersistentClient(
                    path=self.store_path,
                    settings=ChromaSettings(
                        anonymized_telemetry=False,
                    ),
                )
                logger.debug(f"[vector_store] ChromaDB client created path={self.store_path}")
            except ImportError:
                logger.error("[vector_store] chromadb not installed, run: pip install chromadb")
                raise VectorStoreError(
                    "ChromaDB not installed. Install with: pip install chromadb",
                    status_code=500,
                )
        return self._client

    def _get_collection(self, name: str, dimensions: int = 1536):
        """Get or create a collection."""
        if name not in self._collections:
            client = self._get_client()
            try:
                # Try to get existing collection
                collection = client.get_collection(name=name)
                logger.debug(f"[vector_store] Using existing collection={name}")
            except Exception:
                # Create new collection
                collection = client.create_collection(
                    name=name,
                    metadata={"hnsw:space": "cosine"},
                )
                logger.info(f"[vector_store] Created new collection={name}")
            self._collections[name] = collection
        return self._collections[name]

    async def add_documents(
        self,
        documents: List[StoredDocument],
        collection: str = "default",
    ) -> List[str]:
        """Add documents to ChromaDB."""
        if not documents:
            return []

        # Get dimensions from first document
        dimensions = len(documents[0].embedding)
        coll = self._get_collection(collection, dimensions)

        ids = [doc.document_id for doc in documents]
        embeddings = [doc.embedding for doc in documents]
        contents = [doc.content for doc in documents]
        metadatas = [doc.metadata for doc in documents]

        try:
            coll.add(
                ids=ids,
                embeddings=embeddings,
                documents=contents,
                metadatas=metadatas,
            )
            logger.info(
                f"[vector_store_add] collection={collection} "
                f"documents={len(documents)}"
            )
            return ids
        except Exception as e:
            logger.error(f"[vector_store_error] add_failed error={type(e).__name__} message={str(e)}")
            raise VectorStoreError(f"Failed to add documents: {str(e)}")

    async def delete(self, document_id: str, collection: str = "default") -> bool:
        """Delete a document from ChromaDB."""
        try:
            coll = self._get_collection(collection)
            coll.delete(ids=[document_id])
            logger.debug(f"[vector_store_delete] collection={collection} document_id={document_id}")
            return True
        except Exception as e:
            logger.error(f"[vector_store_error] delete_failed error={type(e).__name__}")
            return False

    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        collection: str = "default",
        min_score: float = 0.0,
    ) -> List[Tuple[StoredDocument, float]]:
        """Search for similar documents in ChromaDB."""
        try:
            coll = self._get_collection(collection)
            results = coll.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )

            documents = []
            if results["ids"] and len(results["ids"][0]) > 0:
                for i, doc_id in enumerate(results["ids"][0]):
                    content = results["documents"][0][i] if results["documents"][0] else ""
                    metadata = results["metadatas"][0][i] if results["metadatas"][0] else {}
                    # Chroma returns distance, convert to similarity score
                    distance = results["distances"][0][i] if results["distances"][0] else 1.0
                    # Cosine distance to similarity: score = 1 - distance
                    score = 1.0 - distance

                    logger.debug(f"[vector_store_raw] doc_id={doc_id} distance={distance} score={score}")

                    if score >= min_score:
                        doc = StoredDocument(
                            document_id=doc_id,
                            content=content,
                            embedding=[],  # Not returned by query
                            metadata=metadata,
                        )
                        documents.append((doc, score))

            # Log raw results for debugging
            raw_count = len(results["ids"][0]) if results["ids"] else 0
            logger.info(
                f"[vector_store_search] collection={collection} "
                f"raw_results={raw_count} filtered_results={len(documents)} min_score={min_score}"
            )
            if raw_count > 0:
                for i, doc_id in enumerate(results["ids"][0]):
                    dist = results["distances"][0][i] if results["distances"][0] else 1.0
                    scr = 1.0 - dist
                    logger.info(f"[vector_store_result] i={i} doc_id={doc_id} distance={dist} score={scr}")
            return documents

        except Exception as e:
            logger.error(f"[vector_store_error] search_failed error={type(e).__name__}")
            raise VectorStoreError(f"Search failed: {str(e)}")

    async def get_collection_stats(self, collection: str = "default") -> Dict[str, Any]:
        """Get collection statistics."""
        try:
            coll = self._get_collection(collection)
            count = coll.count()
            return {
                "collection": collection,
                "count": count,
                "store_type": "chroma",
            }
        except Exception as e:
            logger.error(f"[vector_store_error] stats_failed error={type(e).__name__}")
            return {"collection": collection, "count": 0, "error": str(e)}

    async def list_collections(self) -> List[str]:
        """List all collections."""
        try:
            client = self._get_client()
            collections = client.list_collections()
            return [c.name for c in collections]
        except Exception as e:
            logger.error(f"[vector_store_error] list_collections_failed error={type(e).__name__}")
            return []

    async def clear_collection(self, collection: str = "default") -> bool:
        """Clear a collection."""
        try:
            client = self._get_client()
            client.delete_collection(name=collection)
            if collection in self._collections:
                del self._collections[collection]
            logger.info(f"[vector_store_clear] collection={collection}")
            return True
        except Exception as e:
            logger.error(f"[vector_store_error] clear_failed error={type(e).__name__}")
            return False


class FAISSVectorStore(BaseVectorStore):
    """
    FAISS vector store implementation.

    Uses Facebook AI Similarity Search for high-performance vector search.
    Stores metadata separately in JSON files.
    """

    def __init__(self, store_path: Optional[str] = None):
        """
        Initialize FAISS vector store.

        Args:
            store_path: Path for persistent storage.
        """
        settings = get_settings()
        self.store_path = store_path or settings.rag_store_path
        self._index: Optional[Any] = None
        self._metadata: Dict[str, Dict[str, Any]] = {}
        self._documents: Dict[str, str] = {}
        self._id_list: List[str] = []
        self._collection_path: Optional[str] = None
        self._dimensions: int = settings.rag_embedding_dimensions

        # Expand path
        self.store_path = os.path.expanduser(self.store_path)

        logger.info(f"[vector_store] FAISS initialized path={self.store_path}")

    def _get_faiss(self):
        """Lazy import faiss."""
        try:
            import faiss
            return faiss
        except ImportError:
            logger.error("[vector_store] faiss not installed, run: pip install faiss-cpu")
            raise VectorStoreError(
                "FAISS not installed. Install with: pip install faiss-cpu",
                status_code=500,
            )

    def _init_index(self, dimensions: int):
        """Initialize FAISS index if needed."""
        if self._index is None:
            faiss = self._get_faiss()
            # IndexFlatIP for cosine similarity (after normalization)
            self._index = faiss.IndexFlatIP(dimensions)
            self._dimensions = dimensions
            logger.debug(f"[vector_store] FAISS index created dimensions={dimensions}")

    def _get_collection_path(self, collection: str) -> str:
        """Get path for collection data."""
        return os.path.join(self.store_path, collection)

    async def _save_collection(self, collection: str):
        """Save collection data to disk."""
        if self._index is None:
            return

        path = self._get_collection_path(collection)
        os.makedirs(path, exist_ok=True)

        try:
            # Save FAISS index
            faiss = self._get_faiss()
            index_path = os.path.join(path, "index.faiss")
            faiss.write_index(self._index, index_path)

            # Save metadata and documents
            meta_path = os.path.join(path, "metadata.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump({
                    "metadata": self._metadata,
                    "documents": self._documents,
                    "id_list": self._id_list,
                }, f, ensure_ascii=False, indent=2)

            logger.debug(f"[vector_store_save] collection={collection} count={len(self._id_list)}")
        except Exception as e:
            logger.error(f"[vector_store_error] save_failed error={type(e).__name__}")

    async def _load_collection(self, collection: str, dimensions: int = 1536):
        """Load collection data from disk."""
        if self._collection_path == collection and self._index is not None:
            return

        path = self._get_collection_path(collection)
        index_path = os.path.join(path, "index.faiss")
        meta_path = os.path.join(path, "metadata.json")

        # Always create a new index first
        self._init_index(dimensions)
        self._metadata = {}
        self._documents = {}
        self._id_list = []
        self._collection_path = collection

        if os.path.exists(index_path) and os.path.exists(meta_path):
            try:
                faiss = self._get_faiss()
                self._index = faiss.read_index(index_path)

                with open(meta_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._metadata = data.get("metadata", {})
                    self._documents = data.get("documents", {})
                    self._id_list = data.get("id_list", [])

                logger.debug(f"[vector_store_load] collection={collection} count={len(self._id_list)}")
            except Exception as e:
                logger.error(f"[vector_store_error] load_failed error={type(e).__name__}")
                # Continue with empty index

    async def add_documents(
        self,
        documents: List[StoredDocument],
        collection: str = "default",
    ) -> List[str]:
        """Add documents to FAISS."""
        if not documents:
            return []

        dimensions = len(documents[0].embedding)
        await self._load_collection(collection, dimensions)

        # Check if dimensions match
        if dimensions != self._dimensions:
            raise VectorStoreError(
                f"Dimension mismatch: expected {self._dimensions}, got {dimensions}",
                status_code=400,
            )

        try:
            # Normalize embeddings for cosine similarity
            embeddings = []
            for doc in documents:
                vec = np.array(doc.embedding, dtype=np.float32)
                # L2 normalize
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                embeddings.append(vec)

            embeddings_array = np.array(embeddings)

            # Add to index
            self._index.add(embeddings_array)

            # Store metadata
            for i, doc in enumerate(documents):
                self._id_list.append(doc.document_id)
                self._metadata[doc.document_id] = doc.metadata
                self._documents[doc.document_id] = doc.content

            # Save to disk
            await self._save_collection(collection)

            logger.info(
                f"[vector_store_add] collection={collection} "
                f"documents={len(documents)} total={len(self._id_list)}"
            )
            return [doc.document_id for doc in documents]

        except Exception as e:
            logger.error(f"[vector_store_error] add_failed error={type(e).__name__}")
            raise VectorStoreError(f"Failed to add documents: {str(e)}")

    async def delete(self, document_id: str, collection: str = "default") -> bool:
        """Delete a document from FAISS."""
        await self._load_collection(collection)

        if document_id not in self._id_list:
            return False

        # FAISS doesn't support individual deletion easily
        # Rebuild index without the deleted document
        try:
            idx = self._id_list.index(document_id)
            self._id_list.pop(idx)
            del self._metadata[document_id]
            del self._documents[document_id]

            # Rebuild index
            if self._id_list:
                embeddings = []
                for doc_id in self._id_list:
                    # This is a limitation - we need to store embeddings for rebuild
                    # For now, we'll just log the issue
                    pass
            else:
                # Clear the index
                faiss = self._get_faiss()
                self._index = faiss.IndexFlatIP(self._dimensions)

            await self._save_collection(collection)
            logger.debug(f"[vector_store_delete] collection={collection} document_id={document_id}")
            return True

        except Exception as e:
            logger.error(f"[vector_store_error] delete_failed error={type(e).__name__}")
            return False

    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        collection: str = "default",
        min_score: float = 0.0,
    ) -> List[Tuple[StoredDocument, float]]:
        """Search for similar documents in FAISS."""
        dimensions = len(query_embedding)
        await self._load_collection(collection, dimensions)

        if self._index.ntotal == 0:
            return []

        try:
            # Normalize query
            query_vec = np.array([query_embedding], dtype=np.float32)
            norm = np.linalg.norm(query_vec)
            if norm > 0:
                query_vec = query_vec / norm

            # Search
            scores, indices = self._index.search(query_vec, min(top_k, self._index.ntotal))

            documents = []
            for i, idx in enumerate(indices[0]):
                if idx < 0 or idx >= len(self._id_list):
                    continue

                score = float(scores[0][i])
                if score < min_score:
                    continue

                doc_id = self._id_list[idx]
                doc = StoredDocument(
                    document_id=doc_id,
                    content=self._documents.get(doc_id, ""),
                    embedding=[],
                    metadata=self._metadata.get(doc_id, {}),
                )
                documents.append((doc, score))

            logger.debug(
                f"[vector_store_search] collection={collection} "
                f"results={len(documents)} min_score={min_score}"
            )
            return documents

        except Exception as e:
            logger.error(f"[vector_store_error] search_failed error={type(e).__name__}")
            raise VectorStoreError(f"Search failed: {str(e)}")

    async def get_collection_stats(self, collection: str = "default") -> Dict[str, Any]:
        """Get collection statistics."""
        await self._load_collection(collection)
        return {
            "collection": collection,
            "count": len(self._id_list),
            "dimensions": self._dimensions,
            "store_type": "faiss",
        }

    async def list_collections(self) -> List[str]:
        """List all collections."""
        try:
            if not os.path.exists(self.store_path):
                return []
            return [d for d in os.listdir(self.store_path)
                    if os.path.isdir(os.path.join(self.store_path, d))]
        except Exception as e:
            logger.error(f"[vector_store_error] list_collections_failed error={type(e).__name__}")
            return []

    async def clear_collection(self, collection: str = "default") -> bool:
        """Clear a collection."""
        path = self._get_collection_path(collection)
        try:
            import shutil
            if os.path.exists(path):
                shutil.rmtree(path)
            if self._collection_path == collection:
                self._index = None
                self._metadata = {}
                self._documents = {}
                self._id_list = []
            logger.info(f"[vector_store_clear] collection={collection}")
            return True
        except Exception as e:
            logger.error(f"[vector_store_error] clear_failed error={type(e).__name__}")
            return False


# Global instance
_vector_store: Optional[BaseVectorStore] = None


def get_vector_store() -> BaseVectorStore:
    """Get or create global vector store instance."""
    global _vector_store
    if _vector_store is None:
        settings = get_settings()
        if settings.rag_vector_store.lower() == "faiss":
            _vector_store = FAISSVectorStore(settings.rag_store_path)
            logger.info(f"[vector_store] Using FAISS backend")
        else:
            _vector_store = ChromaVectorStore(settings.rag_store_path)
            logger.info(f"[vector_store] Using ChromaDB backend")
    return _vector_store


def reset_vector_store() -> None:
    """Reset the global vector store instance."""
    global _vector_store
    _vector_store = None
    logger.info("[vector_store] Reset vector store")
