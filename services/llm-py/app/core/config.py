"""
Configuration management using Pydantic Settings.

Supports environment variables and .env file.
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenRouter Configuration
    ddo_openrouter_api_key: Optional[str] = Field(
        default=None,
        alias="DDO_OPENROUTER_API_KEY",
        description="OpenRouter API Key (from env DDO_OPENROUTER_API_KEY)"
    )

    # Service Configuration
    llm_host: str = Field(
        default="127.0.0.1",
        description="Service bind host"
    )
    llm_port: int = Field(
        default=8000,
        description="Service bind port"
    )
    llm_default_model: Optional[str] = Field(
        default=None,
        alias="DDO_LLM_MODEL",
        description="Default LLM model (env: DDO_LLM_MODEL, e.g. anthropic/claude-3.5-sonnet)"
    )
    llm_timeout: int = Field(
        default=30,
        description="Request timeout in seconds"
    )

    # Logging
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )

    # RAG Configuration
    rag_enabled: bool = Field(
        default=True,
        description="Enable RAG service"
    )
    rag_vector_store: str = Field(
        default="chroma",
        description="Vector store type: chroma or faiss"
    )
    rag_store_path: str = Field(
        default="~/.ddo/data/vector/",
        description="Vector store data path"
    )
    rag_embedding_model: Optional[str] = Field(
        default=None,
        alias="DDO_LLM_RAG_MODEL",
        description="Embedding model for RAG (env: DDO_LLM_RAG_MODEL). Falls back to llm_default_model."
    )
    rag_embedding_batch_size: int = Field(
        default=100,
        description="Batch size for embedding requests"
    )
    rag_embedding_dimensions: int = Field(
        default=1536,
        description="Embedding vector dimensions (1536 for text-embedding-3-small, 3072 for text-embedding-3-large)"
    )
    rag_top_k: int = Field(
        default=5,
        description="Number of documents to retrieve"
    )
    rag_min_score: float = Field(
        default=0.5,
        description="Minimum similarity score for retrieval (0.0-1.0)"
    )
    rag_max_context_length: int = Field(
        default=4000,
        description="Maximum context length for RAG (characters)"
    )

    @property
    def openrouter_api_key(self) -> Optional[str]:
        """Get OpenRouter API Key."""
        return self.ddo_openrouter_api_key

    @property
    def openrouter_enabled(self) -> bool:
        """Check if OpenRouter is properly configured."""
        return self.ddo_openrouter_api_key is not None and len(self.ddo_openrouter_api_key) > 0


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
