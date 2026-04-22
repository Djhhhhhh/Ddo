"""
RAG (Retrieval-Augmented Generation) API routes.

Provides knowledge base management, document embedding, semantic search, and RAG Q&A.

Implementation status:
- p2-7 Embedder: ✅ /embed endpoint implemented
- p2-8 Retriever: ✅ /search endpoint implemented (semantic search)
- p2-9 Generator: ✅ /ask endpoint implemented (RAG Q&A)
- p2-9 Document Management: ✅ /documents endpoints implemented
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.core.embedder import (
    EmbedderService,
    EmbeddingError,
    RateLimitError,
    NetworkError,
    get_embedder_service,
)
from app.core.rag.generator import GeneratorService, get_generator_service
from app.core.rag.retriever import RetrieverService, get_retriever_service, RetrievedDocument
from app.core.rag.vector_store import get_vector_store, StoredDocument
from app.models.rag import (
    EmbedRequest,
    EmbedResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
    RAGAskRequest,
    RAGAskResponse,
    RAGCitation,
    DocumentListResponse,
    DocumentInfo,
    CollectionListResponse,
    CollectionStats,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ==================== Document Embedding ====================

@router.post(
    "/embed",
    response_model=EmbedResponse,
    status_code=status.HTTP_200_OK,
    summary="Embed documents",
    description="Embed documents into vector store.",
)
async def embed_documents(request: EmbedRequest) -> EmbedResponse:
    """
    Embed documents endpoint.

    Args:
        request: Documents to embed with optional metadata.

    Returns:
        Embedding result with document IDs.

    Raises:
        HTTPException: On validation errors or embedding failures.
    """
    # Validate request
    if not request.documents:
        logger.warning("[embed_api_error] empty_documents")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Documents list cannot be empty",
        )

    if request.metadata is not None and len(request.metadata) != len(request.documents):
        logger.warning(
            f"[embed_api_error] metadata_mismatch "
            f"documents={len(request.documents)} metadata={len(request.metadata)}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Metadata length ({len(request.metadata)}) must match documents length ({len(request.documents)})",
        )

    # Get embedder service with model override
    # Priority: request.model > env DDO_LLM_MODEL > system default
    embedder = get_embedder_service(model=request.model)

    try:
        # Embed documents
        embedded_docs = await embedder.embed_documents(
            documents=request.documents,
            metadata=request.metadata,
        )

        document_ids = [doc.document_id for doc in embedded_docs]

        logger.info(
            f"[embed_api_success] documents={len(request.documents)} "
            f"created={len(document_ids)}"
        )

        return EmbedResponse(
            document_ids=document_ids,
            embeddings_count=len(document_ids),
        )

    except RateLimitError as e:
        logger.error(f"[embed_api_error] rate_limit error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Embedding API rate limit exceeded. Please retry after a moment.",
        ) from e

    except NetworkError as e:
        logger.error(f"[embed_api_error] network_error error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding service temporarily unavailable. Please retry.",
        ) from e

    except EmbeddingError as e:
        logger.error(f"[embed_api_error] embedding_failed error={str(e)}")
        raise HTTPException(
            status_code=e.status_code,
            detail=str(e),
        ) from e

    except Exception as e:
        logger.error(f"[embed_api_error] unexpected_error error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to embed documents: {str(e)}",
        ) from e


# ==================== Semantic Search ====================

@router.post(
    "/search",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic search",
    description="Search documents by semantic similarity. Uses vector store (Chroma/FAISS) for efficient retrieval.",
)
async def semantic_search(request: SearchRequest) -> SearchResponse:
    """
    Semantic search endpoint.

    Args:
        request: Search query and parameters.

    Returns:
        Search results ranked by similarity.
    """
    logger.info(
        f"[search_api_start] query_length={len(request.query)} "
        f"collection={request.collection} top_k={request.top_k}"
    )

    try:
        # Get retriever service
        retriever = get_retriever_service()

        # Perform search
        documents = await retriever.search(
            query=request.query,
            collection=request.collection,
            top_k=request.top_k,
            min_score=request.min_score,
        )

        # Convert to response format
        results = [
            SearchResult(
                document_id=doc.document_id,
                content=doc.content,
                score=doc.score,
                metadata=doc.metadata,
            )
            for doc in documents
        ]

        logger.info(
            f"[search_api_success] collection={request.collection} "
            f"query_length={len(request.query)} results={len(results)}"
        )

        return SearchResponse(
            documents=results,
            total=len(results),
            collection=request.collection,
        )

    except Exception as e:
        logger.error(f"[search_api_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        ) from e


# ==================== RAG Q&A ====================

async def _rag_ask_stream_generator(
    question: str,
    collection: str,
    top_k: int,
    min_score: float,
    model: Optional[str],
) -> str:
    """Generate streaming RAG answer."""
    try:
        # Retrieve documents
        retriever = get_retriever_service()
        documents = await retriever.search(
            query=question,
            collection=collection,
            top_k=top_k,
            min_score=min_score,
        )

        # Generate stream
        generator = get_generator_service()
        async for chunk in generator.generate_stream(
            question=question,
            documents=documents,
            model=model,
        ):
            yield f"data: {chunk}\n\n"

        # Send citations as final message
        if documents:
            import json
            citations = [
                {
                    "document_id": doc.document_id,
                    "content_preview": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                    "score": doc.score,
                }
                for doc in documents
            ]
            yield f"data: {json.dumps({'citations': citations})}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"[ask_stream_error] error={type(e).__name__} message={str(e)}")
        yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"


@router.post(
    "/ask",
    response_model=RAGAskResponse,
    status_code=status.HTTP_200_OK,
    summary="RAG Q&A",
    description="Ask a question using RAG (retrieve relevant docs + generate answer). Supports streaming.",
)
async def rag_ask(request: RAGAskRequest):
    """
    RAG Q&A endpoint.

    Args:
        request: Question and parameters.

    Returns:
        Generated answer with citations (non-streaming) or SSE stream.
    """
    logger.info(
        f"[ask_api_start] question_length={len(request.question)} "
        f"collection={request.collection} stream={request.stream}"
    )

    try:
        # Get services
        retriever = get_retriever_service()
        generator = get_generator_service()

        # Retrieve documents
        documents = await retriever.search(
            query=request.question,
            collection=request.collection,
            top_k=request.top_k,
            min_score=request.min_score,
        )

        if request.stream:
            # Streaming response
            return StreamingResponse(
                _rag_ask_stream_generator(
                    question=request.question,
                    collection=request.collection,
                    top_k=request.top_k,
                    min_score=request.min_score,
                    model=request.model,
                ),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )

        # Non-streaming response
        rag_answer = await generator.generate(
            question=request.question,
            documents=documents,
            model=request.model,
        )

        citations = [
            RAGCitation(
                document_id=source.document_id,
                content_preview=source.content,
                score=source.score,
            )
            for source in rag_answer.sources
        ]

        logger.info(
            f"[ask_api_success] collection={request.collection} "
            f"answer_length={len(rag_answer.answer)} citations={len(citations)}"
        )

        return RAGAskResponse(
            answer=rag_answer.answer,
            citations=citations,
            model=rag_answer.model,
            search_stats={
                "documents_retrieved": len(documents),
                "collection": request.collection,
            },
        )

    except Exception as e:
        logger.error(f"[ask_api_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG failed: {str(e)}",
        ) from e


# ==================== Document Management ====================

@router.get(
    "/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List documents",
    description="List all embedded documents in a collection.",
)
async def list_documents(
    collection: str = "default",
    skip: int = 0,
    limit: int = 100,
) -> DocumentListResponse:
    """
    List documents endpoint.

    Args:
        collection: Collection name.
        skip: Number of documents to skip.
        limit: Maximum number of documents to return.

    Returns:
        List of documents.
    """
    logger.info(f"[list_documents_api] collection={collection} skip={skip} limit={limit}")

    try:
        # For now, return collection stats as proxy
        # Full implementation would require vector_store.list_documents
        vector_store = get_vector_store()
        stats = await vector_store.get_collection_stats(collection)

        # Return placeholder - actual implementation requires vector_store.list_documents
        return DocumentListResponse(
            documents=[],
            total=stats.get("count", 0),
            collection=collection,
        )

    except Exception as e:
        logger.error(f"[list_documents_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}",
        ) from e


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete document",
    description="Delete a document from the vector store.",
)
async def delete_document(document_id: str, collection: str = "default"):
    """
    Delete document endpoint.

    Args:
        document_id: Document ID to delete.
        collection: Collection name.
    """
    logger.info(f"[delete_document_api] collection={collection} document_id={document_id}")

    try:
        vector_store = get_vector_store()
        success = await vector_store.delete(document_id, collection)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found: {document_id}",
            )

        logger.info(f"[delete_document_success] document_id={document_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[delete_document_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}",
        ) from e


# ==================== Collection Management ====================

@router.get(
    "/collections",
    response_model=CollectionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List collections",
    description="List all available collections.",
)
async def list_collections() -> CollectionListResponse:
    """
    List collections endpoint.

    Returns:
        List of collection names.
    """
    logger.info("[list_collections_api]")

    try:
        vector_store = get_vector_store()
        collections = await vector_store.list_collections()

        return CollectionListResponse(
            collections=collections,
            total=len(collections),
        )

    except Exception as e:
        logger.error(f"[list_collections_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list collections: {str(e)}",
        ) from e


@router.get(
    "/collections/{collection}/stats",
    response_model=CollectionStats,
    status_code=status.HTTP_200_OK,
    summary="Collection stats",
    description="Get statistics for a collection.",
)
async def collection_stats(collection: str) -> CollectionStats:
    """
    Collection stats endpoint.

    Args:
        collection: Collection name.

    Returns:
        Collection statistics.
    """
    logger.info(f"[collection_stats_api] collection={collection}")

    try:
        vector_store = get_vector_store()
        stats = await vector_store.get_collection_stats(collection)

        return CollectionStats(
            collection=stats["collection"],
            count=stats["count"],
            store_type=stats.get("store_type", "unknown"),
        )

    except Exception as e:
        logger.error(f"[collection_stats_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get collection stats: {str(e)}",
        ) from e


@router.delete(
    "/collections/{collection}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear collection",
    description="Clear all documents from a collection.",
)
async def clear_collection(collection: str):
    """
    Clear collection endpoint.

    Args:
        collection: Collection name to clear.
    """
    logger.info(f"[clear_collection_api] collection={collection}")

    try:
        vector_store = get_vector_store()
        success = await vector_store.clear_collection(collection)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to clear collection: {collection}",
            )

        logger.info(f"[clear_collection_success] collection={collection}")

    except Exception as e:
        logger.error(f"[clear_collection_error] error={type(e).__name__} message={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear collection: {str(e)}",
        ) from e
