"""
OpenRouter client wrapper.

Simple wrapper for OpenRouter API connection testing and model fetching.
Used by health check and models endpoints.
"""

import httpx
from typing import Optional, List, Dict, Any
from functools import lru_cache

from app.core.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class OpenRouterError(Exception):
    """Base OpenRouter API error."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class OpenRouterAuthError(OpenRouterError):
    """OpenRouter authentication error (API key issues)."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class OpenRouterClient:
    """Simple OpenRouter API client for health checks and model fetching."""

    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://openrouter.ai/api/v1"
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client."""
        if self._client is None:
            headers = {
                "Content-Type": "application/json",
            }
            if self.settings.openrouter_api_key:
                headers["Authorization"] = f"Bearer {self.settings.openrouter_api_key}"

            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=10.0,
            )
        return self._client

    async def test_connection(self) -> bool:
        """
        Test connection to OpenRouter API.

        Returns:
            True if connection successful, False otherwise.
        """
        if not self.settings.openrouter_enabled:
            return False

        try:
            # Try to fetch available models as a simple connectivity test
            client = self._get_client()
            response = await client.get("/models")
            if response.status_code == 200:
                logger.debug("[openrouter] connection_test success")
                return True
            else:
                logger.warning(f"[openrouter] connection_test failed status={response.status_code}")
                return False
        except httpx.NetworkError as e:
            logger.warning(f"[openrouter] connection_test network_error error={str(e)}")
            return False
        except Exception as e:
            logger.error(f"[openrouter] connection_test error={type(e).__name__} message={str(e)}")
            return False

    async def fetch_models(self) -> List[Dict[str, Any]]:
        """
        Fetch available models from OpenRouter.

        Returns:
            List of model data dictionaries.

        Raises:
            OpenRouterAuthError: If authentication fails (401).
            OpenRouterError: For other API errors.
        """
        if not self.settings.openrouter_enabled:
            raise OpenRouterAuthError("OpenRouter API key not configured")

        client = self._get_client()

        try:
            response = await client.get("/models")

            if response.status_code == 401:
                raise OpenRouterAuthError("Invalid API key")

            if response.status_code != 200:
                raise OpenRouterError(
                    f"OpenRouter API error: {response.status_code}",
                    status_code=response.status_code
                )

            data = response.json()
            models = data.get("data", [])

            logger.info(f"[openrouter] fetch_models count={len(models)}")
            return models

        except httpx.NetworkError as e:
            raise OpenRouterError(f"Network error: {str(e)}")
        except OpenRouterError:
            raise
        except Exception as e:
            raise OpenRouterError(f"Failed to fetch models: {str(e)}")

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


@lru_cache
def get_openrouter_client() -> OpenRouterClient:
    """Get cached OpenRouter client instance."""
    return OpenRouterClient()


async def close_openrouter_client() -> None:
    """Close the global OpenRouter client (for cleanup on shutdown)."""
    client = get_openrouter_client()
    await client.close()
