"""
Database session management.

Provides async SQLAlchemy engine and session management.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Global engine and session factory
_engine = None
_session_factory = None
Base = declarative_base()


async def init_db() -> None:
    """Initialize database connection and create tables."""
    global _engine, _session_factory
    
    settings = get_settings()
    
    try:
        # Create async engine with SQLite
        _engine = create_async_engine(
            settings.db_url,
            echo=settings.db_echo,
            connect_args={
                "check_same_thread": False,
            },
        )
        
        # Create session factory
        _session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        
        # Create all tables
        async with _engine.begin() as conn:
            from app.db import models
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info(f"Database initialized: {settings.db_path}")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    """Close database connections."""
    global _engine
    
    if _engine:
        await _engine.dispose()
        logger.info("Database connection closed")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get a database session."""
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
