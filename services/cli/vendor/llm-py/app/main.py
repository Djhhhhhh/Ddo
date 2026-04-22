"""
FastAPI main application.

Entry point for the llm-py service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.api.health import router as health_router
from app.core.config import get_settings
from app.core.lifespan import lifespan
from app.utils.logger import setup_logging

# Setup logging first
setup_logging()

# Get settings
settings = get_settings()

# Create FastAPI application
app = FastAPI(
    title="llm-py",
    description="Ddo LLM Agent Service - OpenRouter proxy and RAG knowledge base",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router)

# Include health router at root level (provides /health and /ready)
app.include_router(health_router)


@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirects to docs."""
    return {
        "service": "llm-py",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health",
    }
