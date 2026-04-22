"""
Generator service for RAG.

Generates answers using retrieved documents as context.
"""

import time
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, List, Optional

from langchain_core.prompts import ChatPromptTemplate

from app.core.config import get_settings
from app.core.llm_factory import get_llm_factory
from app.core.rag.retriever import RetrievedDocument
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SourceInfo:
    """Source information for generated answer."""

    document_id: str
    content: str
    score: float


@dataclass
class RAGAnswer:
    """RAG-generated answer with sources."""

    answer: str
    sources: List[SourceInfo]
    model: str
    usage: Optional[Dict[str, Any]] = None


class GeneratorService:
    """
    Service for RAG answer generation.

    Combines retrieved documents with LLM to generate contextual answers.
    """

    # RAG system prompt template
    RAG_SYSTEM_PROMPT = """你是一个智能助手，基于提供的上下文回答用户的问题。

要求：
1. 只使用下面提供的上下文信息来回答问题
2. 如果上下文中没有足够信息，明确告知用户
3. 回答简洁准确
4. 引用相关信息时，自然地提及来源（如 #doc1）

上下文：
{context}

请基于以上上下文回答用户的问题。回答使用中文。"""

    def __init__(self):
        """Initialize generator service."""
        self.settings = get_settings()
        self.llm_factory = get_llm_factory()
        logger.info("[generator_init] service_initialized")

    def _format_context(self, documents: List[RetrievedDocument]) -> str:
        """
        Format retrieved documents into context string.

        Args:
            documents: List of retrieved documents.

        Returns:
            Formatted context string.
        """
        max_length = getattr(self.settings, "rag_max_context_length", 4000)

        context_parts = []
        total_length = 0

        for i, doc in enumerate(documents, 1):
            # Format each document
            doc_text = f"[Document {i}]\n{doc.content}\n"

            # Check if adding this document would exceed max length
            if total_length + len(doc_text) > max_length and context_parts:
                logger.debug(
                    f"[generator_context_truncated] documents={i-1}/{len(documents)} "
                    f"length={total_length}"
                )
                break

            context_parts.append(doc_text)
            total_length += len(doc_text)

        return "\n".join(context_parts)

    def _create_rag_prompt(self) -> ChatPromptTemplate:
        """Create RAG prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", self.RAG_SYSTEM_PROMPT),
            ("human", "{question}"),
        ])

    async def generate(
        self,
        question: str,
        documents: List[RetrievedDocument],
        model: Optional[str] = None,
    ) -> RAGAnswer:
        """
        Generate answer from retrieved documents.

        Args:
            question: User question.
            documents: Retrieved relevant documents.
            model: Model to use for generation. Defaults to settings.llm_default_model.

        Returns:
            RAGAnswer with answer text and sources.
        """
        start_time = time.time()
        logger.info(
            f"[generator_start] question_length={len(question)} "
            f"documents={len(documents)}"
        )

        if not documents:
            logger.warning("[generator_no_documents] returning_unavailable_response")
            return RAGAnswer(
                answer="抱歉，知识库中没有找到与您问题相关的信息。您可以尝试用更通用的关键词查询，或者添加相关知识到知识库中。",
                sources=[],
                model=model or self.settings.llm_default_model or "unknown",
            )

        try:
            # Format context from documents
            context = self._format_context(documents)

            # Get model for response
            settings = get_settings()
            effective_model = model or settings.llm_default_model

            if not effective_model:
                raise ValueError("No model specified. Set DDO_LLM_MODEL environment variable.")

            # Create RAG chain using llm_factory
            from langchain_core.output_parsers import StrOutputParser

            prompt = self._create_rag_prompt()
            chat_model = self.llm_factory._create_chat_model(effective_model)
            chain = prompt | chat_model | StrOutputParser()

            # Generate answer
            chain_start = time.time()
            answer = await chain.ainvoke({
                "context": context,
                "question": question,
            })
            chain_duration = (time.time() - chain_start) * 1000

            # Prepare sources
            sources = [
                SourceInfo(
                    document_id=doc.document_id,
                    content=doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                    score=doc.score,
                )
                for doc in documents
            ]

            total_duration = (time.time() - start_time) * 1000

            # Event: rag_answer_generated
            logger.info(
                f"[rag_answer_generated] model={effective_model} "
                f"question_length={len(question)} answer_length={len(answer)} "
                f"context_docs={len(documents)} chain_duration_ms={chain_duration:.1f} "
                f"total_duration_ms={total_duration:.1f}"
            )

            return RAGAnswer(
                answer=answer,
                sources=sources,
                model=effective_model,
            )

        except Exception as e:
            logger.error(
                f"[generator_error] error={type(e).__name__} message={str(e)}"
            )
            # Re-raise for caller to handle
            raise

    async def generate_stream(
        self,
        question: str,
        documents: List[RetrievedDocument],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """
        Stream answer generation.

        Args:
            question: User question.
            documents: Retrieved relevant documents.
            model: Model to use for generation.

        Yields:
            Answer text chunks.
        """
        start_time = time.time()
        logger.info(
            f"[generator_stream_start] question_length={len(question)} "
            f"documents={len(documents)}"
        )

        if not documents:
            logger.warning("[generator_stream_no_documents]")
            yield "抱歉，知识库中没有找到与您问题相关的信息。您可以尝试用更通用的关键词查询，或者添加相关知识到知识库中。"
            return

        try:
            # Format context
            context = self._format_context(documents)

            # Get model
            settings = get_settings()
            effective_model = model or settings.llm_default_model

            if not effective_model:
                raise ValueError("No model specified. Set DDO_LLM_MODEL environment variable.")

            # Create RAG chain
            from langchain_core.output_parsers import StrOutputParser

            prompt = self._create_rag_prompt()
            chat_model = self.llm_factory._create_chat_model(effective_model)
            chain = prompt | chat_model | StrOutputParser()

            # Stream generation
            chunk_count = 0
            async for chunk in chain.astream({
                "context": context,
                "question": question,
            }):
                chunk_count += 1
                yield chunk

            total_duration = (time.time() - start_time) * 1000

            # Event: rag_answer_generated (streaming)
            logger.info(
                f"[rag_answer_generated] streaming=true model={effective_model} "
                f"chunks={chunk_count} duration_ms={total_duration:.1f}"
            )

        except Exception as e:
            logger.error(
                f"[generator_stream_error] error={type(e).__name__} message={str(e)}"
            )
            raise


# Global instance
_generator_service: Optional[GeneratorService] = None


def get_generator_service() -> GeneratorService:
    """Get or create global generator service."""
    global _generator_service
    if _generator_service is None:
        _generator_service = GeneratorService()
    return _generator_service


def reset_generator_service() -> None:
    """Reset the global generator service."""
    global _generator_service
    _generator_service = None
    logger.info("[generator_reset] service_reset")
