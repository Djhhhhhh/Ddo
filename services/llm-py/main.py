"""
llm-py startup script.

Entry point for running the FastAPI service with Uvicorn.
"""

import uvicorn

from app.core.config import get_settings


def main():
    """Run the llm-py service."""
    settings = get_settings()

    uvicorn.run(
        "app.main:app",
        host=settings.llm_host,
        port=settings.llm_port,
        reload=True,  # Enable auto-reload for development
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
