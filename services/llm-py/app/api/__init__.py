"""
API routes aggregation.

All API endpoints are registered here.
"""

from fastapi import APIRouter

from app.api import analyze, chat, health, models, nlp, rag

# Create main API router
api_router = APIRouter(prefix="/api")

# Register sub-routers (health is registered at root level in main.py)
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(nlp.router, prefix="/nlp", tags=["nlp"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])

__all__ = ["api_router", "health"]
