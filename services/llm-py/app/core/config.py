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
    openrouter_api_key: Optional[str] = Field(
        default=None,
        description="OpenRouter API Key"
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
    llm_default_model: str = Field(
        default="anthropic/claude-3.5-sonnet",
        description="Default LLM model"
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
    rag_embedding_model: str = Field(
        default="openai/text-embedding-3-small",
        description="Embedding model name"
    )
    rag_top_k: int = Field(
        default=5,
        description="Number of documents to retrieve"
    )

    @property
    def openrouter_enabled(self) -> bool:
        """Check if OpenRouter is properly configured."""
        return self.openrouter_api_key is not None and len(self.openrouter_api_key) > 0


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
