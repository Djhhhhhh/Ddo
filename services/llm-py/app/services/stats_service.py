"""
Statistics service for LLM usage analytics.

Provides trend data, model distribution, and usage statistics.
"""

import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Conversation, Message, DailyStats

logger = logging.getLogger(__name__)


class StatsService:
    """Service for computing usage statistics."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_overview_stats(self) -> Dict[str, Any]:
        """Get overview statistics for today, this week, this month."""
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)
        
        # Today stats
        today_stats = await self._get_period_stats(today_start, now)
        
        # This week stats
        week_stats = await self._get_period_stats(week_start, now)
        
        # This month stats
        month_stats = await self._get_period_stats(month_start, now)
        
        return {
            "today": today_stats,
            "this_week": week_stats,
            "this_month": month_stats,
        }
    
    async def _get_period_stats(
        self,
        start: datetime,
        end: datetime
    ) -> Dict[str, Any]:
        """Get statistics for a specific period."""
        # Count messages (requests)
        count_query = (
            select(func.count())
            .where(Message.created_at >= start)
            .where(Message.created_at <= end)
            .where(Message.role == "assistant")  # Count AI responses as requests
        )
        count_result = await self.session.execute(count_query)
        requests = count_result.scalar() or 0
        
        # Sum tokens
        tokens_query = (
            select(func.sum(Message.total_tokens))
            .where(Message.created_at >= start)
            .where(Message.created_at <= end)
        )
        tokens_result = await self.session.execute(tokens_query)
        tokens = tokens_result.scalar() or 0
        
        # Average latency
        latency_query = (
            select(func.avg(Message.latency_ms))
            .where(Message.created_at >= start)
            .where(Message.created_at <= end)
            .where(Message.latency_ms.isnot(None))
        )
        latency_result = await self.session.execute(latency_query)
        avg_latency = int(latency_result.scalar() or 0)
        
        return {
            "requests": requests,
            "tokens": tokens,
            "avg_latency_ms": avg_latency,
        }
    
    async def get_trend_data(
        self,
        days: int = 7,
        group_by: str = "day"
    ) -> Dict[str, List]:
        """Get trend data for the last N days."""
        end = datetime.now()
        start = end - timedelta(days=days)
        
        # Query daily aggregated data
        if group_by == "day":
            return await self._get_daily_trend(start, end)
        elif group_by == "week":
            return await self._get_weekly_trend(start, end)
        elif group_by == "month":
            return await self._get_monthly_trend(start, end)
        else:
            raise ValueError(f"Invalid group_by: {group_by}. Use day/week/month")
    
    async def _get_daily_trend(
        self,
        start: datetime,
        end: datetime
    ) -> Dict[str, List]:
        """Get daily trend data."""
        # Aggregate by date using local date
        query = (
            select(
                func.strftime('%Y-%m-%d', Message.created_at).label("date"),
                func.count().label("requests"),
                func.sum(Message.total_tokens).label("tokens")
            )
            .where(Message.created_at >= start)
            .where(Message.created_at <= end)
            .where(Message.role == "assistant")
            .group_by(func.strftime('%Y-%m-%d', Message.created_at))
            .order_by(func.strftime('%Y-%m-%d', Message.created_at))
        )
        
        result = await self.session.execute(query)
        rows = result.all()
        
        # Fill in missing dates
        dates = []
        requests = []
        tokens = []
        
        current = start.date()
        end_date = end.date()
        # row.date is string from strftime, use string as key
        row_dict = {row.date: row for row in rows}
        
        while current <= end_date:
            date_str = current.isoformat()
            dates.append(date_str)
            row = row_dict.get(date_str)  # Compare string to string
            requests.append(row.requests if row else 0)
            tokens.append(int(row.tokens) if row and row.tokens else 0)
            current += timedelta(days=1)
        
        return {
            "dates": dates,
            "requests": requests,
            "tokens": tokens,
        }
    
    async def _get_weekly_trend(
        self,
        start: datetime,
        end: datetime
    ) -> Dict[str, List]:
        """Get weekly trend data."""
        # SQLite strftime week
        query = (
            select(
                func.strftime("%Y-W%W", Message.created_at).label("week"),
                func.count().label("requests"),
                func.sum(Message.total_tokens).label("tokens")
            )
            .where(Message.created_at >= start)
            .where(Message.created_at <= end)
            .where(Message.role == "assistant")
            .group_by(func.strftime("%Y-W%W", Message.created_at))
            .order_by(func.strftime("%Y-W%W", Message.created_at))
        )
        
        result = await self.session.execute(query)
        rows = result.all()
        
        return {
            "dates": [row.week for row in rows],
            "requests": [row.requests for row in rows],
            "tokens": [int(row.tokens or 0) for row in rows],
        }
    
    async def _get_monthly_trend(
        self,
        start: datetime,
        end: datetime
    ) -> Dict[str, List]:
        """Get monthly trend data."""
        query = (
            select(
                func.strftime("%Y-%m", Message.created_at).label("month"),
                func.count().label("requests"),
                func.sum(Message.total_tokens).label("tokens")
            )
            .where(Message.created_at >= start)
            .where(Message.created_at <= end)
            .where(Message.role == "assistant")
            .group_by(func.strftime("%Y-%m", Message.created_at))
            .order_by(func.strftime("%Y-%m", Message.created_at))
        )
        
        result = await self.session.execute(query)
        rows = result.all()
        
        return {
            "dates": [row.month for row in rows],
            "requests": [row.requests for row in rows],
            "tokens": [int(row.tokens or 0) for row in rows],
        }
    
    async def get_model_distribution(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get model usage distribution."""
        query = (
            select(
                Message.model,
                func.count().label("count")
            )
            .where(Message.role == "assistant")
            .where(Message.model.isnot(None))
        )
        
        if start_date:
            query = query.where(func.date(Message.created_at) >= start_date)
        if end_date:
            query = query.where(func.date(Message.created_at) <= end_date)
        
        query = query.group_by(Message.model).order_by(desc(func.count()))
        
        result = await self.session.execute(query)
        rows = result.all()
        
        total = sum(row.count for row in rows)
        distribution = {
            row.model: {
                "count": row.count,
                "percentage": round(row.count / total * 100, 1) if total > 0 else 0
            }
            for row in rows
        }
        
        return {
            "total": total,
            "distribution": distribution,
        }
    
    async def update_daily_stats(self, target_date: Optional[date] = None) -> None:
        """Update daily statistics (for scheduled aggregation)."""
        if target_date is None:
            target_date = date.today()
        
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = datetime.combine(target_date, datetime.max.time())
        
        # Calculate stats
        count_query = (
            select(func.count())
            .where(Message.created_at >= day_start)
            .where(Message.created_at <= day_end)
            .where(Message.role == "assistant")
        )
        count_result = await self.session.execute(count_query)
        requests = count_result.scalar() or 0
        
        tokens_query = (
            select(func.sum(Message.total_tokens))
            .where(Message.created_at >= day_start)
            .where(Message.created_at <= day_end)
        )
        tokens_result = await self.session.execute(tokens_query)
        tokens = tokens_result.scalar() or 0
        
        latency_query = (
            select(func.avg(Message.latency_ms))
            .where(Message.created_at >= day_start)
            .where(Message.created_at <= day_end)
            .where(Message.latency_ms.isnot(None))
        )
        latency_result = await self.session.execute(latency_query)
        avg_latency = int(latency_result.scalar() or 0)
        
        # Model distribution
        model_query = (
            select(Message.model, func.count())
            .where(Message.created_at >= day_start)
            .where(Message.created_at <= day_end)
            .where(Message.role == "assistant")
            .where(Message.model.isnot(None))
            .group_by(Message.model)
        )
        model_result = await self.session.execute(model_query)
        model_dist = {row.model: row.count for row in model_result.all()}
        
        # Source distribution
        source_query = (
            select(Conversation.source, func.count())
            .join(Message, Conversation.id == Message.conversation_id)
            .where(Message.created_at >= day_start)
            .where(Message.created_at <= day_end)
            .group_by(Conversation.source)
        )
        source_result = await self.session.execute(source_query)
        source_dist = {row.source: row.count for row in source_result.all()}
        
        # Update or create
        result = await self.session.execute(
            select(DailyStats).where(DailyStats.date == target_date)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.total_requests = requests
            existing.total_tokens = tokens
            existing.avg_latency_ms = avg_latency
            existing.model_distribution = model_dist
            existing.source_distribution = source_dist
            existing.updated_at = datetime.utcnow()
        else:
            new_stats = DailyStats(
                date=target_date,
                total_requests=requests,
                total_tokens=tokens,
                avg_latency_ms=avg_latency,
                model_distribution=model_dist,
                source_distribution=source_dist
            )
            self.session.add(new_stats)
        
        await self.session.commit()
        logger.info(f"Updated daily stats for {target_date}: {requests} requests")
