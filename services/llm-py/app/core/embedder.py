"""
Embedding service for RAG.

Provides document vectorization using LangChain's embedding interfaces.
Supports OpenRouter and other embedding providers.
"""

import time
import uuid
from typing import Any, Dict, List, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings
from app.core.document_store import DocumentEmbedding, get_document_store
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EmbeddingError(Exception):
    """Base exception for embedding errors."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class RateLimitError(EmbeddingError):
    """Raised when API rate limit is hit."""

    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, status_code=429)


class NetworkError(EmbeddingError):
    """Raised when network error occurs."""

    def __init__(self, message: str = "Network error"):
        super().__init__(message, status_code=503)


class EmbedderService:
    """
    Service for embedding documents into vector representations.

    Uses LangChain's embedding interface with OpenRouter or OpenAI.
    Supports batch processing and automatic retries.

    Model priority: explicit model param > env DDO_LLM_MODEL > system default
    """

    def __init__(self, model: Optional[str] = None):
        """
        Initialize the embedder service.

        Args:
            model: Embedding model name.
                   Priority: this param > env DDO_LLM_MODEL > config default.
        """
        settings = get_settings()
        # Priority: explicit model > env DDO_LLM_MODEL > rag_embedding_model default
        self.model = model or settings.llm_default_model or settings.rag_embedding_model
        self.batch_size = settings.rag_embedding_batch_size
        self.dimensions = settings.rag_embedding_dimensions
        self._embeddings = None

        logger.info(
            f"[embedder_init] model={self.model} "
            f"batch_size={self.batch_size} dimensions={self.dimensions}"
        )

    @property
    def embeddings(self):
        """Lazy initialization of LangChain embeddings."""
        if self._embeddings is None:
            self._embeddings = self._create_embeddings()
        return self._embeddings

    def _create_embeddings(self):
        """Create LangChain embeddings instance."""
        from langchain_openai import OpenAIEmbeddings

        settings = get_settings()
        api_key = settings.openrouter_api_key

        if not api_key:
            logger.error("[embedder_error] OpenRouter API key not configured")
            raise EmbeddingError(
                "OpenRouter API key not configured. Set DDO_OPENROUTER_API_KEY.",
                status_code=500,
            )

        # Use OpenRouter's embeddings endpoint
        return OpenAIEmbeddings(
            openai_api_base="https://openrouter.ai/api/v1",
            openai_api_key=api_key,
            model=self.model,
        )

    @retry(
        retry=retry_if_exception_type((httpx.NetworkError, RateLimitError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def _embed_with_retry(self, texts: List[str]) -> List[List[float]]:
        """
        Embed texts with automatic retry on failure.

        Args:
            texts: List of texts to embed.

        Returns:
            List of embedding vectors.

        Raises:
            RateLimitError: If rate limited (will retry).
            NetworkError: If network error occurs (will retry).
            EmbeddingError: For other errors.
        """
        try:
            result = await self.embeddings.aembed_documents(texts)
            if not result or len(result) != len(texts):
                logger.error(
                    f"[embedder_error] invalid_response model={self.model} "
                    f"expected={len(texts)} got={len(result) if result else 0}"
                )
                raise EmbeddingError(
                    f"Model '{self.model}' returned invalid embedding data. "
                    f"This model may not support embeddings.",
                    status_code=400,
                )
            return result
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning(f"[embedder_retry] rate_limited retrying texts={len(texts)}")
                raise RateLimitError(f"Rate limited: {e.response.text}")
            elif e.response.status_code >= 500:
                logger.error(f"[embedder_error] server_error status={e.response.status_code}")
                raise EmbeddingError(
                    f"Embedding server error: {e.response.status_code}",
                    status_code=503,
                )
            else:
                raise EmbeddingError(
                    f"Embedding API error: {e.response.status_code}",
                    status_code=e.response.status_code,
                )
        except httpx.NetworkError as e:
            logger.warning(f"[embedder_retry] network_error retrying texts={len(texts)}")
            raise NetworkError(str(e))
        except ValueError as e:
            # Handle "No embedding data received" and similar API errors
            error_msg = str(e).lower()
            if "no embedding data" in error_msg or "empty response" in error_msg:
                logger.error(
                    f"[embedder_error] model_unsupported model={self.model} "
                    f"error={str(e)}"
                )
                raise EmbeddingError(
                    f"Model '{self.model}' may not support embeddings or returned empty data. "
                    f"Try using 'openai/text-embedding-3-small' or check model availability.",
                    status_code=400,
                )
            logger.error(f"[embedder_error] value_error message={str(e)}")
            raise EmbeddingError(f"Embedding failed: {str(e)}", status_code=500)
        except Exception as e:
            logger.error(f"[embedder_error] unexpected_error error={type(e).__name__} message={str(e)}")
            raise EmbeddingError(f"Embedding failed: {str(e)}", status_code=500)

    async def embed_documents(
        self,
        documents: List[str],
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> List[DocumentEmbedding]:
        """
        Embed a list of documents.

        Args:
            documents: List of text documents to embed.
            metadata: Optional metadata for each document. Must match documents length.

        Returns:
            List of DocumentEmbedding objects with generated IDs.

        Raises:
            ValueError: If metadata length doesn't match documents length.
            EmbeddingError: If embedding fails.
        """
        if not documents:
            logger.warning("[embedder_warn] empty_documents_list")
            return []

        if metadata is not None and len(metadata) != len(documents):
            raise ValueError(
                f"Metadata length ({len(metadata)}) must match documents length ({len(documents)})"
            )

        start_time = time.time()
        logger.info(f"[embedder_start] documents={len(documents)} batch_size={self.batch_size}")

        # Process in batches
        all_embeddings: List[List[float]] = []
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i:i + self.batch_size]
            batch_embeddings = await self._embed_with_retry(batch)
            all_embeddings.extend(batch_embeddings)

        # Create DocumentEmbedding objects
        results: List[DocumentEmbedding] = []
        doc_metadata = metadata or [{} for _ in documents]

        for i, (content, embedding) in enumerate(zip(documents, all_embeddings)):
            doc = DocumentEmbedding(
                document_id=str(uuid.uuid4()),
                content=content,
                embedding=embedding,
                metadata={
                    **doc_metadata[i],
                    "model": self.model,
                    "dimensions": len(embedding),
                },
            )
            results.append(doc)

        # Store in document store
        store = get_document_store()
        store.add_batch(results)

        duration = (time.time() - start_time) * 1000
        logger.info(
            f"[embedder_success] documents={len(documents)} "
            f"duration_ms={duration:.1f} stored={len(results)}"
        )

        return results

    async def embed_query(self, query: str) -> List[float]:
        """
        Embed a single query string.

        Args:
            query: The query text.

        Returns:
            Query embedding vector.
        """
        logger.debug(f"[embedder_query] query_length={len(query)}")

        try:
            embedding = await self.embeddings.aembed_query(query)
            logger.debug(f"[embedder_query_success] dimensions={len(embedding)}")
            return embedding
        except Exception as e:
            logger.error(f"[embedder_query_error] error={type(e).__name__}")
            raise EmbeddingError(f"Query embedding failed: {str(e)}", status_code=500)


# Global singleton instances per model
_embedder_services: Dict[str, EmbedderService] = {}


def get_embedder_service(model: Optional[str] = None) -> EmbedderService:
    """
    Get or create an embedder service instance.

    Args:
        model: Embedding model name.
               Priority: this param > env DDO_LLM_MODEL > config default.

    Returns:
        EmbedderService instance (cached per model).
    """
    global _embedder_services

    # Resolve the effective model
    settings = get_settings()
    effective_model = model or settings.llm_default_model or settings.rag_embedding_model

    if effective_model not in _embedder_services:
        _embedder_services[effective_model] = EmbedderService(model=model)

    return _embedder_services[effective_model]


def reset_embedder_service(model: Optional[str] = None) -> None:
    """
    Reset the embedder service for a specific model or all models.

    Args:
        model: Specific model to reset, or None to reset all.
    """
    global _embedder_services
    if model:
        _embedder_services.pop(model, None)
    else:
        _embedder_services.clear()
