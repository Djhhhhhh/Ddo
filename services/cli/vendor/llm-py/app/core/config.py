"""
Configuration management using Pydantic Settings.

Supports environment variables and .env file.
"""

import json
import os
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_data_root() -> str:
    data_dir = os.getenv("DDO_DATA_DIR")
    if data_dir:
        return os.path.abspath(os.path.expanduser(data_dir))

    return os.path.join(os.path.expanduser("~"), ".ddo")


def _resolve_config_path() -> str:
    custom_path = os.getenv("DDO_LLM_PY_CONFIG")
    if custom_path:
        return os.path.abspath(os.path.expanduser(custom_path))

    return os.path.join(_resolve_data_root(), "llm-py", "config.json")


def _load_runtime_config() -> dict:
    config_path = _resolve_config_path()
    if not os.path.exists(config_path):
        return {}

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            loaded = json.load(f)
    except Exception:
        return {}

    return loaded if isinstance(loaded, dict) else {}


_RUNTIME_CONFIG = _load_runtime_config()


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
        default=_RUNTIME_CONFIG.get("llm_host", "127.0.0.1"),
        description="Service bind host"
    )
    llm_port: int = Field(
        default=_RUNTIME_CONFIG.get("llm_port", 50002),
        description="Service bind port"
    )
    llm_default_model: Optional[str] = Field(
        default=None,
        alias="DDO_LLM_MODEL",
        description="Default LLM model (env: DDO_LLM_MODEL, e.g. anthropic/claude-3.5-sonnet)"
    )
    llm_timeout: int = Field(
        default=_RUNTIME_CONFIG.get("llm_timeout", 30),
        description="Request timeout in seconds"
    )
    llm_reload: bool = Field(
        default=_RUNTIME_CONFIG.get("llm_reload", False),
        description="Enable reload mode"
    )

    # Logging
    log_level: str = Field(
        default=_RUNTIME_CONFIG.get("log_level", "INFO"),
        description="Logging level"
    )

    # RAG Configuration
    rag_enabled: bool = Field(
        default=_RUNTIME_CONFIG.get("rag_enabled", True),
        description="Enable RAG service"
    )
    rag_vector_store: str = Field(
        default=_RUNTIME_CONFIG.get("rag_vector_store", "chroma"),
        description="Vector store type: chroma or faiss"
    )
    rag_store_path: str = Field(
        default=_RUNTIME_CONFIG.get("rag_store_path", os.path.join(_resolve_data_root(), "data", "vector")),
        description="Vector store data path"
    )
    rag_embedding_model: Optional[str] = Field(
        default=None,
        alias="DDO_LLM_RAG_MODEL",
        description="Embedding model for RAG (env: DDO_LLM_RAG_MODEL). Falls back to llm_default_model."
    )
    rag_embedding_batch_size: int = Field(
        default=_RUNTIME_CONFIG.get("rag_embedding_batch_size", 100),
        description="Batch size for embedding requests"
    )
    rag_embedding_dimensions: int = Field(
        default=_RUNTIME_CONFIG.get("rag_embedding_dimensions", 1536),
        description="Embedding vector dimensions (1536 for text-embedding-3-small, 3072 for text-embedding-3-large)"
    )
    rag_top_k: int = Field(
        default=_RUNTIME_CONFIG.get("rag_top_k", 5),
        description="Number of documents to retrieve"
    )
    rag_min_score: float = Field(
        default=_RUNTIME_CONFIG.get("rag_min_score", 0.5),
        description="Minimum similarity score for retrieval (0.0-1.0)"
    )
    rag_max_context_length: int = Field(
        default=_RUNTIME_CONFIG.get("rag_max_context_length", 4000),
        description="Maximum context length for RAG (characters)"
    )

    # Database Configuration
    db_path: str = Field(
        default=_RUNTIME_CONFIG.get("db_path", os.path.join(_resolve_data_root(), "data", "llm", "conversations.db")),
        description="SQLite database file path for conversation storage"
    )
    db_echo: bool = Field(
        default=_RUNTIME_CONFIG.get("db_echo", False),
        description="Enable SQLAlchemy query logging"
    )

    @property
    def db_url(self) -> str:
        """Get database URL."""
        import os
        expanded_path = os.path.expanduser(self.db_path)
        # Ensure directory exists
        os.makedirs(os.path.dirname(expanded_path), exist_ok=True)
        return f"sqlite+aiosqlite:///{expanded_path}"

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
