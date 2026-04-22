"""
API routes aggregation.

All API endpoints are registered here.
"""

from fastapi import APIRouter

from app.api import analyze, chat, conversation, health, models, nlp, rag, stats

# Create main API router
api_router = APIRouter(prefix="/api")

# Register sub-routers (health is registered at root level in main.py)
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(conversation.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(nlp.router, prefix="/nlp", tags=["nlp"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])

__all__ = ["api_router", "health"]
