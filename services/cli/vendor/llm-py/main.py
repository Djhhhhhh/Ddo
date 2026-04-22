"""
llm-py startup script.

Entry point for running the FastAPI service with Uvicorn.
"""

import uvicorn

from app.core.config import get_settings, _load_runtime_config


def main():
    """Run the llm-py service."""
    settings = get_settings()
    runtime = _load_runtime_config()

    host = runtime.get("llm_host", settings.llm_host)
    port = runtime.get("llm_port", settings.llm_port)

    print(f"[llm-py] binding to {host}:{port}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=settings.llm_reload,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
