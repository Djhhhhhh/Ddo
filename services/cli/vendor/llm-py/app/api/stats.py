"""
Statistics API routes.

Provides endpoints for usage statistics and trend data.
"""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services.stats_service import StatsService

logger = logging.getLogger(__name__)
router = APIRouter()


class OverviewStats(BaseModel):
    """Overview statistics for a period."""
    requests: int = 0
    tokens: int = 0
    avg_latency_ms: int = 0


class OverviewResponse(BaseModel):
    """Overview statistics response."""
    code: int = 0
    message: str = "ok"
    data: dict = Field(default_factory=dict)


class TrendResponse(BaseModel):
    """Trend data response."""
    code: int = 0
    message: str = "ok"
    data: dict = Field(default_factory=dict)


class ModelDistributionItem(BaseModel):
    """Model distribution item."""
    count: int
    percentage: float


class ModelDistributionResponse(BaseModel):
    """Model distribution response."""
    code: int = 0
    message: str = "ok"
    data: dict = Field(default_factory=dict)


@router.get(
    "/overview",
    response_model=OverviewResponse,
    summary="Get overview statistics",
    description="Get statistics for today, this week, and this month."
)
async def get_overview(
    session: AsyncSession = Depends(get_session)
):
    """Get overview statistics."""
    try:
        service = StatsService(session)
        stats = await service.get_overview_stats()
        
        return OverviewResponse(data=stats)
        
    except Exception as e:
        logger.error(f"Error getting overview stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


@router.get(
    "/trend",
    response_model=TrendResponse,
    summary="Get trend data",
    description="Get trend data for the specified number of days."
)
async def get_trend(
    days: int = Query(7, ge=1, le=90, description="Number of days to include"),
    group_by: str = Query("day", regex="^(day|week|month)$", description="Aggregation level"),
    session: AsyncSession = Depends(get_session)
):
    """Get trend data."""
    try:
        service = StatsService(session)
        trend = await service.get_trend_data(days=days, group_by=group_by)
        
        return TrendResponse(data=trend)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting trend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trend: {str(e)}"
        )


@router.get(
    "/models",
    response_model=ModelDistributionResponse,
    summary="Get model distribution",
    description="Get LLM model usage distribution."
)
async def get_model_distribution(
    start_date: Optional[str] = Query(None, description="Start date (ISO format, YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format, YYYY-MM-DD)"),
    session: AsyncSession = Depends(get_session)
):
    """Get model usage distribution."""
    try:
        # Parse dates
        start = date.fromisoformat(start_date) if start_date else None
        end = date.fromisoformat(end_date) if end_date else None
        
        service = StatsService(session)
        distribution = await service.get_model_distribution(start, end)
        
        return ModelDistributionResponse(data=distribution)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {e}. Use YYYY-MM-DD format."
        )
    except Exception as e:
        logger.error(f"Error getting model distribution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model distribution: {str(e)}"
        )
