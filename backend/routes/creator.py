"""
Creator Partnership Routes
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import PlainTextResponse

from models.creator import (
    CreatorApplication, CreatorProfile, CreatorDashboardStats,
    CreatorSeriesCreate, CreatorEpisodeCreate, VideoUploadResponse,
    CreatorSeries, CreatorEpisode, PayoutRequest, SeriesSubmission,
    SeriesSubmissionResponse, SeasonCreate, SubmissionReview, Season,
    SubtitleUpload
)
from services import db, get_current_user
from services.bunny import bunny_service

router = APIRouter(prefix="/creator", tags=["Creator"])

# ============ CREATOR TIER CONFIG ============
# Revenue Model (Aligned with ReelShort): Creator share is % of POST-EXPENSE revenue
# Example: $100 gross → $70 after 30% expenses → Creator gets 30-50% of $70
# Kona keeps 65-79% of gross revenue (sustainable margins for growth)
CREATOR_TIERS = {
    "new": {"revenue_share": 0.30, "min_views": 0, "auto_publish": False},
    "verified": {"revenue_share": 0.40, "min_views": 50000, "auto_publish": True},
    "partner": {"revenue_share": 0.50, "min_views": 500000, "auto_publish": True}
}

MILESTONE_BONUSES = [
    {"views": 50000, "bonus_coins": 500},
    {"views": 100000, "bonus_coins": 2500},
    {"views": 500000, "bonus_coins": 10000},
    {"views": 1000000, "bonus_coins": 50000},
    {"views": 5000000, "bonus_coins": 250000}
]


# ============ CREATOR APPLICATION ============
@router.post("/apply")
async def apply_as_creator(application: CreatorApplication, user: dict = Depends(get_current_user)):
    """Apply to become a content creator"""
    # Check if already a creator
    existing = await db.creators.find_one({"user_id": user["id"]})
    if existing:
        if existing["status"] == "approved":
            raise HTTPException(status_code=400, detail="You are already an approved creator")
        elif existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="Your application is pending review")
    
    creator_id = f"creator-{uuid.uuid4().hex[:12]}"
    
    creator = {
        "id": creator_id,
        "user_id": user["id"],
        "name": application.name,
        "email": application.email,
        "phone": application.phone,
        "bio": application.bio,
        "portfolio_url": application.portfolio_url,
        "content_type": application.content_type,
        "sample_video_url": application.sample_video_url,
        "expected_uploads_per_month": application.expected_uploads_per_month,
        "tier": "new",
        "status": "pending",
        "revenue_share": CREATOR_TIERS["new"]["revenue_share"],
        "total_views": 0,
        "total_earnings": 0,
        "pending_payout": 0,
        "series_count": 0,
        "milestones_claimed": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None
    }
    
    await db.creators.insert_one(creator)
    
    return {
        "message": "Application submitted successfully! We'll review within 24-48 hours.",
        "creator_id": creator_id,
        "status": "pending"
    }


@router.get("/status")
async def get_creator_status(user: dict = Depends(get_current_user)):
    """Get creator application/profile status"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    # Auto-approve admins as creators if they don't have a creator record
    if not creator and user.get("is_admin"):
        # Create approved creator record for admin
        creator_id = f"creator-{uuid.uuid4().hex[:8]}"
        creator = {
            "id": creator_id,
            "user_id": user["id"],
            "name": user.get("name", "Admin Creator"),
            "email": user.get("email"),
            "status": "approved",
            "tier": "gold",  # Admins get gold tier
            "revenue_share": 0.5,
            "total_views": 0,
            "total_earnings": 0,
            "payout_method": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.creators.insert_one(creator)
        return {
            "is_creator": True,
            "status": "approved",
            "tier": "gold",
            "creator_id": creator_id
        }
    
    if not creator:
        return {"is_creator": False, "status": None}
    
    return {
        "is_creator": creator["status"] == "approved",
        "status": creator["status"],
        "tier": creator.get("tier", "new"),
        "creator_id": creator["id"]
    }


# ============ CREATOR DASHBOARD ============
@router.get("/dashboard")
async def get_creator_dashboard(user: dict = Depends(get_current_user)):
    """Get creator dashboard statistics"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Get series count
    series_count = await db.creator_series.count_documents({"creator_id": creator["id"]})
    
    # Get episodes count
    episodes_count = await db.creator_episodes.count_documents({"creator_id": creator["id"]})
    
    # Get this month's stats
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    month_views = await db.view_records.count_documents({
        "creator_id": creator["id"],
        "timestamp": {"$gte": month_start.isoformat()}
    })
    
    month_earnings_cursor = db.view_records.aggregate([
        {"$match": {"creator_id": creator["id"], "timestamp": {"$gte": month_start.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$creator_share"}}}
    ])
    month_earnings_result = await month_earnings_cursor.to_list(1)
    month_earnings = month_earnings_result[0]["total"] if month_earnings_result else 0
    
    return {
        "creator_id": creator["id"],
        "name": creator.get("name", creator.get("display_name", "Creator")),
        "tier": creator.get("tier", "bronze"),
        "revenue_share": creator.get("revenue_share", 0.5),
        "total_series": series_count,
        "total_episodes": episodes_count,
        "total_views": creator.get("total_views", 0),
        "total_earnings": creator.get("total_earnings", 0),
        "pending_payout": creator.get("pending_payout", 0),
        "this_month_views": month_views,
        "this_month_earnings": month_earnings,
        "milestones": MILESTONE_BONUSES,
        "milestones_claimed": creator.get("milestones_claimed", [])
    }


# ============ CREATOR ANALYTICS ============

@router.get("/analytics")
async def get_creator_analytics(
    user: dict = Depends(get_current_user),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, all, or custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom period (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for custom period (YYYY-MM-DD)")
):
    """Get detailed analytics for creator dashboard with time-series data"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    
    if period == "custom" and start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    elif period == "7d":
        start = now - timedelta(days=7)
        end = now
    elif period == "30d":
        start = now - timedelta(days=30)
        end = now
    elif period == "90d":
        start = now - timedelta(days=90)
        end = now
    elif period == "all":
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end = now
    else:
        start = now - timedelta(days=30)
        end = now
    
    creator_id = creator["id"]
    
    # Get view records for the period
    view_records = await db.view_records.find({
        "creator_id": creator_id,
        "timestamp": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }).to_list(10000)
    
    # Aggregate views by day for chart
    daily_views = {}
    daily_earnings = {}
    
    for record in view_records:
        try:
            record_date = datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except (ValueError, KeyError, AttributeError):
            continue
            
        if record_date not in daily_views:
            daily_views[record_date] = 0
            daily_earnings[record_date] = 0
        
        daily_views[record_date] += 1
        daily_earnings[record_date] += record.get("creator_share", 0)
    
    # Sort and format for charts
    sorted_dates = sorted(daily_views.keys())
    views_chart_data = [{"date": d, "views": daily_views[d]} for d in sorted_dates]
    earnings_chart_data = [{"date": d, "earnings": daily_earnings[d]} for d in sorted_dates]
    
    # Get top performing episodes
    episode_stats = {}
    for record in view_records:
        ep_id = record.get("episode_id", "unknown")
        if ep_id not in episode_stats:
            episode_stats[ep_id] = {"views": 0, "earnings": 0, "likes": 0, "shares": 0}
        episode_stats[ep_id]["views"] += 1
        episode_stats[ep_id]["earnings"] += record.get("creator_share", 0)
    
    # Get episode details and sort by views
    top_episodes = []
    for ep_id, stats in sorted(episode_stats.items(), key=lambda x: x[1]["views"], reverse=True)[:10]:
        episode = await db.creator_episodes.find_one({"id": ep_id}, {"_id": 0})
        if episode:
            # Get likes count
            likes_count = await db.likes.count_documents({"episode_id": ep_id})
            shares_count = await db.shares.count_documents({"episode_id": ep_id})
            
            top_episodes.append({
                "episode_id": ep_id,
                "title": episode.get("title", "Unknown"),
                "episode_code": episode.get("episode_code", ""),
                "series_id": episode.get("series_id", ""),
                "views": stats["views"],
                "earnings": round(stats["earnings"], 2),
                "likes": likes_count,
                "shares": shares_count,
                "engagement_rate": round((likes_count + shares_count) / max(stats["views"], 1) * 100, 1)
            })
    
    # Calculate period totals
    period_views = sum(daily_views.values())
    period_earnings = sum(daily_earnings.values())
    
    # Get engagement metrics
    total_likes = await db.likes.count_documents({"creator_id": creator_id})
    total_shares = await db.shares.count_documents({"creator_id": creator_id})
    
    # Calculate averages
    days_in_period = max((end - start).days, 1)
    avg_daily_views = round(period_views / days_in_period, 1)
    avg_daily_earnings = round(period_earnings / days_in_period, 2)
    
    # Get series performance
    series_list = await db.creator_series.find({"creator_id": creator_id}, {"_id": 0}).to_list(100)
    series_performance = []
    for s in series_list:
        series_views = sum(1 for r in view_records if r.get("series_id") == s["id"])
        series_earnings = sum(r.get("creator_share", 0) for r in view_records if r.get("series_id") == s["id"])
        series_performance.append({
            "series_id": s["id"],
            "title": s["title"],
            "views": series_views,
            "earnings": round(series_earnings, 2),
            "total_episodes": s.get("total_episodes", 0)
        })
    
    series_performance.sort(key=lambda x: x["views"], reverse=True)
    
    return {
        "period": {
            "type": period,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "days": days_in_period
        },
        "summary": {
            "total_views": period_views,
            "total_earnings": round(period_earnings, 2),
            "avg_daily_views": avg_daily_views,
            "avg_daily_earnings": avg_daily_earnings,
            "total_likes": total_likes,
            "total_shares": total_shares,
            "engagement_rate": round((total_likes + total_shares) / max(creator["total_views"], 1) * 100, 1)
        },
        "charts": {
            "views": views_chart_data,
            "earnings": earnings_chart_data
        },
        "top_episodes": top_episodes,
        "series_performance": series_performance[:5],
        "metrics": {
            "watch_time_minutes": period_views * 3,  # Estimated 3 min avg per view
            "unique_viewers": len(set(r.get("user_id") for r in view_records if r.get("user_id"))),
            "returning_viewers": 0,  # Would need more tracking
            "peak_day": max(views_chart_data, key=lambda x: x["views"])["date"] if views_chart_data else None,
            "peak_views": max(views_chart_data, key=lambda x: x["views"])["views"] if views_chart_data else 0
        }
    }


@router.get("/analytics/compare")
async def compare_analytics_periods(
    user: dict = Depends(get_current_user),
    period: str = Query("30d", description="Time period to compare: 7d, 30d, 90d")
):
    """Compare current period with previous period for growth metrics"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        days = 7
    elif period == "30d":
        days = 30
    elif period == "90d":
        days = 90
    else:
        days = 30
    
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    previous_end = current_start
    
    creator_id = creator["id"]
    
    # Current period stats
    current_views = await db.view_records.count_documents({
        "creator_id": creator_id,
        "timestamp": {"$gte": current_start.isoformat()}
    })
    
    current_earnings_cursor = db.view_records.aggregate([
        {"$match": {"creator_id": creator_id, "timestamp": {"$gte": current_start.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$creator_share"}}}
    ])
    current_earnings_result = await current_earnings_cursor.to_list(1)
    current_earnings = current_earnings_result[0]["total"] if current_earnings_result else 0
    
    # Previous period stats
    previous_views = await db.view_records.count_documents({
        "creator_id": creator_id,
        "timestamp": {"$gte": previous_start.isoformat(), "$lt": previous_end.isoformat()}
    })
    
    previous_earnings_cursor = db.view_records.aggregate([
        {"$match": {"creator_id": creator_id, "timestamp": {"$gte": previous_start.isoformat(), "$lt": previous_end.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$creator_share"}}}
    ])
    previous_earnings_result = await previous_earnings_cursor.to_list(1)
    previous_earnings = previous_earnings_result[0]["total"] if previous_earnings_result else 0
    
    # Calculate growth percentages
    views_growth = ((current_views - previous_views) / max(previous_views, 1)) * 100
    earnings_growth = ((current_earnings - previous_earnings) / max(previous_earnings, 1)) * 100
    
    return {
        "period": period,
        "current": {
            "views": current_views,
            "earnings": round(current_earnings, 2),
            "start": current_start.isoformat(),
            "end": now.isoformat()
        },
        "previous": {
            "views": previous_views,
            "earnings": round(previous_earnings, 2),
            "start": previous_start.isoformat(),
            "end": previous_end.isoformat()
        },
        "growth": {
            "views_percent": round(views_growth, 1),
            "earnings_percent": round(earnings_growth, 1),
            "views_trend": "up" if views_growth > 0 else "down" if views_growth < 0 else "flat",
            "earnings_trend": "up" if earnings_growth > 0 else "down" if earnings_growth < 0 else "flat"
        }
    }



@router.get("/analytics/audience")
async def get_audience_analytics(
    user: dict = Depends(get_current_user),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, all")
):
    """Get audience demographics and geographic distribution"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    creator_id = creator["id"]
    
    # Get view records with geo data
    view_records = await db.view_records.find({
        "creator_id": creator_id,
        "timestamp": {"$gte": start.isoformat()}
    }).to_list(50000)
    
    # Aggregate by country
    country_views = {}
    device_views = {"mobile": 0, "desktop": 0, "tablet": 0, "unknown": 0}
    hourly_views = {str(h).zfill(2): 0 for h in range(24)}
    returning_viewers = set()
    new_viewers = set()
    
    viewer_watch_counts = {}
    
    for record in view_records:
        # Country aggregation
        country = record.get("country_code") or record.get("geo", {}).get("country_code") or "Unknown"
        country_name = record.get("country_name") or record.get("geo", {}).get("country_name") or country
        if country not in country_views:
            country_views[country] = {"code": country, "name": country_name, "views": 0, "earnings": 0}
        country_views[country]["views"] += 1
        country_views[country]["earnings"] += record.get("creator_share", 0)
        
        # Device aggregation
        device = record.get("device_type", "unknown").lower()
        if device in device_views:
            device_views[device] += 1
        else:
            device_views["unknown"] += 1
        
        # Hourly distribution
        try:
            record_time = datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00"))
            hour = str(record_time.hour).zfill(2)
            hourly_views[hour] += 1
        except (ValueError, KeyError):
            pass
        
        # Track viewer engagement
        user_id = record.get("user_id")
        if user_id:
            if user_id not in viewer_watch_counts:
                viewer_watch_counts[user_id] = 0
            viewer_watch_counts[user_id] += 1
    
    # Calculate returning vs new
    for user_id, count in viewer_watch_counts.items():
        if count > 1:
            returning_viewers.add(user_id)
        else:
            new_viewers.add(user_id)
    
    # Sort countries by views
    top_countries = sorted(country_views.values(), key=lambda x: x["views"], reverse=True)[:10]
    
    # Calculate percentages
    total_views = sum(device_views.values())
    device_distribution = {
        device: {"count": count, "percentage": round(count / max(total_views, 1) * 100, 1)}
        for device, count in device_views.items()
    }
    
    # Peak hours analysis
    peak_hours = sorted(hourly_views.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Audience segments
    highly_engaged = len([u for u, c in viewer_watch_counts.items() if c >= 5])
    moderately_engaged = len([u for u, c in viewer_watch_counts.items() if 2 <= c < 5])
    casual_viewers = len([u for u, c in viewer_watch_counts.items() if c == 1])
    
    return {
        "period": period,
        "geographic": {
            "top_countries": top_countries,
            "total_countries": len(country_views)
        },
        "devices": device_distribution,
        "watch_time": {
            "hourly_distribution": [{"hour": h, "views": v} for h, v in sorted(hourly_views.items())],
            "peak_hours": [{"hour": h, "views": v} for h, v in peak_hours],
            "best_time_to_post": peak_hours[0][0] + ":00 UTC" if peak_hours and peak_hours[0][1] > 0 else "No data"
        },
        "audience_segments": {
            "highly_engaged": {"count": highly_engaged, "description": "5+ episodes watched"},
            "moderately_engaged": {"count": moderately_engaged, "description": "2-4 episodes watched"},
            "casual_viewers": {"count": casual_viewers, "description": "1 episode watched"},
            "total_unique_viewers": len(viewer_watch_counts)
        },
        "retention": {
            "returning_viewers": len(returning_viewers),
            "new_viewers": len(new_viewers),
            "return_rate": round(len(returning_viewers) / max(len(viewer_watch_counts), 1) * 100, 1)
        }
    }


@router.get("/analytics/realtime")
async def get_realtime_analytics(user: dict = Depends(get_current_user)):
    """Get real-time analytics (last 24 hours with hourly breakdown)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_1h = now - timedelta(hours=1)
    
    creator_id = creator["id"]
    
    # Views in last hour
    views_1h = await db.view_records.count_documents({
        "creator_id": creator_id,
        "timestamp": {"$gte": last_1h.isoformat()}
    })
    
    # Views in last 24h
    views_24h = await db.view_records.count_documents({
        "creator_id": creator_id,
        "timestamp": {"$gte": last_24h.isoformat()}
    })
    
    # Hourly breakdown for last 24 hours
    view_records = await db.view_records.find({
        "creator_id": creator_id,
        "timestamp": {"$gte": last_24h.isoformat()}
    }).to_list(10000)
    
    hourly_data = {}
    for i in range(24):
        hour_start = now - timedelta(hours=24-i)
        hour_key = hour_start.strftime("%H:00")
        hourly_data[hour_key] = {"views": 0, "earnings": 0}
    
    for record in view_records:
        try:
            record_time = datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00"))
            hour_key = record_time.strftime("%H:00")
            if hour_key in hourly_data:
                hourly_data[hour_key]["views"] += 1
                hourly_data[hour_key]["earnings"] += record.get("creator_share", 0)
        except (ValueError, KeyError):
            pass
    
    # Active viewers (unique users in last hour)
    recent_records = await db.view_records.find({
        "creator_id": creator_id,
        "timestamp": {"$gte": last_1h.isoformat()}
    }).to_list(1000)
    
    active_viewers = len(set(r.get("user_id") for r in recent_records if r.get("user_id")))
    
    # Currently trending episode
    episode_views = {}
    for r in recent_records:
        ep_id = r.get("episode_id")
        if ep_id:
            episode_views[ep_id] = episode_views.get(ep_id, 0) + 1
    
    trending_episode = None
    if episode_views:
        top_ep_id = max(episode_views, key=episode_views.get)
        ep = await db.creator_episodes.find_one({"id": top_ep_id}, {"_id": 0})
        if ep:
            trending_episode = {
                "episode_id": top_ep_id,
                "title": ep.get("title", "Unknown"),
                "episode_code": ep.get("episode_code", ""),
                "views_last_hour": episode_views[top_ep_id]
            }
    
    return {
        "timestamp": now.isoformat(),
        "live_stats": {
            "views_last_hour": views_1h,
            "views_last_24h": views_24h,
            "active_viewers": active_viewers
        },
        "hourly_breakdown": [{"hour": h, **v} for h, v in sorted(hourly_data.items())],
        "trending_now": trending_episode,
        "velocity": {
            "views_per_hour": round(views_24h / 24, 1),
            "trend": "high" if views_1h > (views_24h / 24) else "normal"
        }
    }


@router.get("/analytics/content")
async def get_content_analytics(
    user: dict = Depends(get_current_user),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, all")
):
    """Get content performance analytics - what content performs best"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    creator_id = creator["id"]
    
    # Get all series
    series_list = await db.creator_series.find({"creator_id": creator_id}, {"_id": 0}).to_list(100)
    
    # Get view records
    view_records = await db.view_records.find({
        "creator_id": creator_id,
        "timestamp": {"$gte": start.isoformat()}
    }).to_list(50000)
    
    # Genre performance
    genre_stats = {}
    series_id_to_genre = {s["id"]: s.get("genre", "Other") for s in series_list}
    
    for record in view_records:
        series_id = record.get("series_id")
        genre = series_id_to_genre.get(series_id, "Other")
        if genre not in genre_stats:
            genre_stats[genre] = {"views": 0, "earnings": 0, "series_count": 0}
        genre_stats[genre]["views"] += 1
        genre_stats[genre]["earnings"] += record.get("creator_share", 0)
    
    # Count series per genre
    for s in series_list:
        genre = s.get("genre", "Other")
        if genre in genre_stats:
            genre_stats[genre]["series_count"] += 1
    
    # Episode performance by position
    episode_position_stats = {}
    for record in view_records:
        ep_num = record.get("episode_number", 1)
        if ep_num not in episode_position_stats:
            episode_position_stats[ep_num] = {"views": 0, "earnings": 0}
        episode_position_stats[ep_num]["views"] += 1
        episode_position_stats[ep_num]["earnings"] += record.get("creator_share", 0)
    
    # Calculate drop-off rate
    ep_positions = sorted(episode_position_stats.keys())
    drop_off_analysis = []
    for i, ep_num in enumerate(ep_positions):
        prev_views = episode_position_stats[ep_positions[i-1]]["views"] if i > 0 else episode_position_stats[ep_num]["views"]
        curr_views = episode_position_stats[ep_num]["views"]
        retention = round(curr_views / max(prev_views, 1) * 100, 1)
        drop_off_analysis.append({
            "episode_number": ep_num,
            "views": curr_views,
            "retention_from_previous": retention
        })
    
    # Content length analysis (if duration is tracked)
    # Best performing content attributes
    
    return {
        "period": period,
        "genre_performance": [
            {"genre": g, **stats, "avg_views_per_series": round(stats["views"] / max(stats["series_count"], 1))}
            for g, stats in sorted(genre_stats.items(), key=lambda x: x[1]["views"], reverse=True)
        ],
        "episode_position_analysis": drop_off_analysis[:15],
        "insights": {
            "best_performing_genre": max(genre_stats.items(), key=lambda x: x[1]["views"])[0] if genre_stats else "N/A",
            "highest_drop_off": min(drop_off_analysis, key=lambda x: x["retention_from_previous"])["episode_number"] if drop_off_analysis else "N/A",
            "recommendations": [
                "Episode 1 is your hook - make it compelling",
                f"Your {max(genre_stats.items(), key=lambda x: x[1]['views'])[0] if genre_stats else 'content'} content performs best",
                "Consider shorter seasons if drop-off is high after episode 3"
            ]
        }
    }



# ============ SERIES SUBMISSION & APPROVAL WORKFLOW ============

@router.post("/series/submit", response_model=SeriesSubmissionResponse)
async def submit_series_for_approval(data: SeriesSubmission, user: dict = Depends(get_current_user)):
    """Submit a new series with pilot episode for approval"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    submission_id = f"sub-{uuid.uuid4().hex[:12]}"
    series_id = f"cs-{uuid.uuid4().hex[:10]}"
    season_id = f"season-{uuid.uuid4().hex[:8]}"
    pilot_id = f"ep-{uuid.uuid4().hex[:10]}"
    
    # Create submission record
    submission = {
        "id": submission_id,
        "series_id": series_id,
        "creator_id": creator["id"],
        "creator_name": creator["name"],
        "creator_email": creator["email"],
        "status": "pending_review",
        
        # Series Info
        "title": data.title,
        "description": data.description,
        "genre": data.genre,
        "target_audience": data.target_audience,
        "content_rating": data.content_rating,
        "language": data.language,
        "thumbnail_url": data.thumbnail_url,
        
        # Pilot Info
        "pilot_title": data.pilot_title,
        "pilot_description": data.pilot_description,
        "pilot_video_url": data.pilot_video_url,
        "pilot_duration": data.pilot_duration,
        "pilot_episode_id": pilot_id,
        
        # Series Plan
        "planned_seasons": data.planned_seasons,
        "episodes_per_season": data.episodes_per_season,
        "release_schedule": data.release_schedule,
        "unique_selling_point": data.unique_selling_point,
        
        # Review
        "feedback": None,
        "review_scores": None,
        "reviewed_at": None,
        "reviewed_by": None,
        
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.series_submissions.insert_one(submission)
    
    # Create the series in draft/pending state
    series = {
        "id": series_id,
        "creator_id": creator["id"],
        "submission_id": submission_id,
        "title": data.title,
        "description": data.description,
        "genre": data.genre,
        "target_audience": data.target_audience,
        "content_rating": data.content_rating,
        "language": data.language,
        "thumbnail": data.thumbnail_url or "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800",
        "status": "pending_review",
        "rejection_reason": None,
        "total_seasons": 1,
        "total_episodes": 1,
        "total_views": 0,
        "total_earnings": 0,
        "rating": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewed_by": None,
        "published_at": None
    }
    
    await db.creator_series.insert_one(series)
    
    # Create Season 1
    season = {
        "id": season_id,
        "series_id": series_id,
        "creator_id": creator["id"],
        "season_number": 1,
        "title": "Season 1",
        "description": None,
        "total_episodes": 1,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seasons.insert_one(season)
    
    # Create pilot episode (S01E01)
    pilot_episode = {
        "id": pilot_id,
        "series_id": series_id,
        "season_id": season_id,
        "creator_id": creator["id"],
        "season_number": 1,
        "episode_number": 1,
        "episode_code": "S01E01",
        "title": data.pilot_title,
        "description": data.pilot_description,
        "video_url": data.pilot_video_url,
        "bunny_video_id": None,
        "encoding_status": "ready",  # Assuming URL is already hosted
        "duration": data.pilot_duration,
        "thumbnail": data.thumbnail_url,
        "is_free": True,  # Pilot is always free
        "is_pilot": True,
        "coins_required": 0,
        "intro_duration": 30,
        "views": 0,
        "earnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None
    }
    
    await db.creator_episodes.insert_one(pilot_episode)
    
    return SeriesSubmissionResponse(
        submission_id=submission_id,
        status="pending_review",
        message="Your series has been submitted for review. Our team will review your pilot episode and get back to you within 3-5 business days.",
        estimated_review_time="3-5 business days"
    )


@router.get("/submissions")
async def get_my_submissions(user: dict = Depends(get_current_user)):
    """Get all submissions by the creator"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    submissions = await db.series_submissions.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(50)
    
    return submissions


@router.get("/submissions/{submission_id}")
async def get_submission_status(submission_id: str, user: dict = Depends(get_current_user)):
    """Get status of a specific submission"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    submission = await db.series_submissions.find_one(
        {"id": submission_id, "creator_id": creator["id"]},
        {"_id": 0}
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return submission


# ============ SEASON MANAGEMENT ============

@router.post("/series/{series_id}/seasons")
async def create_season(series_id: str, data: SeasonCreate, user: dict = Depends(get_current_user)):
    """Create a new season for an approved series"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Check series exists and is approved
    series = await db.creator_series.find_one(
        {"id": series_id, "creator_id": creator["id"]},
        {"_id": 0}
    )
    
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    if series["status"] != "approved" and series["status"] != "published":
        raise HTTPException(status_code=400, detail="Series must be approved before adding seasons")
    
    # Check if season already exists
    existing = await db.seasons.find_one(
        {"series_id": series_id, "season_number": data.season_number}
    )
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Season {data.season_number} already exists")
    
    season_id = f"season-{uuid.uuid4().hex[:8]}"
    
    season = {
        "id": season_id,
        "series_id": series_id,
        "creator_id": creator["id"],
        "season_number": data.season_number,
        "title": data.title or f"Season {data.season_number}",
        "description": data.description,
        "total_episodes": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seasons.insert_one(season)
    
    # Update series total seasons
    await db.creator_series.update_one(
        {"id": series_id},
        {"$inc": {"total_seasons": 1}}
    )
    
    return {
        "message": f"Season {data.season_number} created successfully",
        "season_id": season_id
    }


@router.get("/series/{series_id}/seasons")
async def get_series_seasons(series_id: str, user: dict = Depends(get_current_user)):
    """Get all seasons for a series"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    seasons = await db.seasons.find(
        {"series_id": series_id, "creator_id": creator["id"]},
        {"_id": 0}
    ).sort("season_number", 1).to_list(20)
    
    return seasons


# ============ LEGACY SERIES MANAGEMENT (for backward compatibility) ============

@router.post("/series")
async def create_series(data: CreatorSeriesCreate, user: dict = Depends(get_current_user)):
    """Create a new series (legacy - use /series/submit for new submissions)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    series_id = f"cs-{uuid.uuid4().hex[:10]}"
    
    series = {
        "id": series_id,
        "creator_id": creator["id"],
        "title": data.title,
        "description": data.description,
        "genre": data.genre,
        "thumbnail": data.thumbnail_url or "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800",
        "status": "pending_review",  # Changed from draft to pending_review
        "total_seasons": 1,
        "total_episodes": 0,
        "total_views": 0,
        "total_earnings": 0,
        "rating": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None
    }
    
    await db.creator_series.insert_one(series)
    
    # Create Season 1 by default
    season_id = f"season-{uuid.uuid4().hex[:8]}"
    season = {
        "id": season_id,
        "series_id": series_id,
        "creator_id": creator["id"],
        "season_number": 1,
        "title": "Season 1",
        "description": None,
        "total_episodes": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seasons.insert_one(season)
    
    # Update creator series count
    await db.creators.update_one(
        {"id": creator["id"]},
        {"$inc": {"series_count": 1}}
    )
    
    return {
        "message": "Series created. Please submit with pilot episode for approval.",
        "series_id": series_id,
        "status": "pending_review"
    }


@router.get("/series")
async def get_my_series(user: dict = Depends(get_current_user)):
    """Get all series by the creator"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    series = await db.creator_series.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return series


@router.get("/series/{series_id}")
async def get_series_detail(series_id: str, user: dict = Depends(get_current_user)):
    """Get series details with episodes"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    series = await db.creator_series.find_one(
        {"id": series_id, "creator_id": creator["id"]},
        {"_id": 0}
    )
    
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    episodes = await db.creator_episodes.find(
        {"series_id": series_id},
        {"_id": 0}
    ).sort("episode_number", 1).to_list(100)
    
    return {
        **series,
        "episodes": episodes
    }


@router.patch("/series/{series_id}")
async def update_series(
    series_id: str,
    user: dict = Depends(get_current_user),
    title: Optional[str] = None,
    description: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    genre: Optional[str] = None
):
    """Update series information including thumbnail"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    series = await db.creator_series.find_one({"id": series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Build update dict
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if thumbnail_url is not None:
        # Validate URL format
        if not thumbnail_url.startswith(("http://", "https://", "data:")):
            raise HTTPException(status_code=400, detail="Invalid thumbnail URL format")
        update_data["thumbnail"] = thumbnail_url
    if genre is not None:
        update_data["genre"] = genre
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.creator_series.update_one(
        {"id": series_id},
        {"$set": update_data}
    )
    
    # Also update main series collection if published
    await db.series.update_one(
        {"id": series_id},
        {"$set": update_data}
    )
    
    return {
        "message": "Series updated successfully",
        "series_id": series_id,
        "updated_fields": list(update_data.keys())
    }


@router.post("/series/{series_id}/submit")
async def submit_series_for_review(series_id: str, user: dict = Depends(get_current_user)):
    """Submit series for admin review"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    series = await db.creator_series.find_one({"id": series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Check if has at least 1 episode
    episode_count = await db.creator_episodes.count_documents({"series_id": series_id})
    if episode_count == 0:
        raise HTTPException(status_code=400, detail="Add at least 1 episode before submitting")
    
    # Auto-publish for verified/partner creators
    new_status = "published" if CREATOR_TIERS[creator["tier"]]["auto_publish"] else "pending_review"
    
    await db.creator_series.update_one(
        {"id": series_id},
        {"$set": {
            "status": new_status,
            "published_at": datetime.now(timezone.utc).isoformat() if new_status == "published" else None
        }}
    )
    
    # If published, also add to main series collection for users to see
    if new_status == "published":
        await publish_series_to_main(series_id, creator["id"])
    
    return {
        "message": "Series published!" if new_status == "published" else "Series submitted for review",
        "status": new_status
    }


async def publish_series_to_main(series_id: str, creator_id: str):
    """Copy series to main series collection for public viewing"""
    series = await db.creator_series.find_one({"id": series_id}, {"_id": 0})
    episodes = await db.creator_episodes.find({"series_id": series_id}, {"_id": 0}).to_list(100)
    
    # Add to main series
    main_series = {
        "id": series_id,
        "title": series["title"],
        "description": series["description"],
        "thumbnail": series["thumbnail"],
        "genre": series["genre"],
        "rating": 4.5,
        "total_episodes": len(episodes),
        "views": 0,
        "featured": False,
        "creator_id": creator_id
    }
    
    await db.series.update_one(
        {"id": series_id},
        {"$set": main_series},
        upsert=True
    )
    
    # Add episodes to main episodes
    for ep in episodes:
        if ep.get("encoding_status") == "ready":
            main_episode = {
                "id": ep["id"],
                "series_id": series_id,
                "episode_number": ep["episode_number"],
                "title": ep["title"],
                "thumbnail": ep.get("thumbnail") or series["thumbnail"],
                "duration": f"{(ep.get('duration', 120) // 60)}:{str(ep.get('duration', 0) % 60).zfill(2)}",
                "video_url": bunny_service.get_direct_play_url(ep["bunny_video_id"]) if ep.get("bunny_video_id") else "",
                "bunny_video_id": ep.get("bunny_video_id"),
                "is_free": ep.get("is_free", False),
                "coins_required": ep.get("coins_required", 5),
                "intro_duration": ep.get("intro_duration", 30),  # Default 30 seconds
                "creator_id": creator_id
            }
            
            await db.episodes.update_one(
                {"id": ep["id"]},
                {"$set": main_episode},
                upsert=True
            )


# ============ EPISODE MANAGEMENT ============

# Model for series-specific episode creation (simpler, used by batch upload)
from pydantic import BaseModel as PydanticBaseModel
from typing import Optional as Opt

class SimpleEpisodeCreate(PydanticBaseModel):
    """Simple episode creation for batch upload"""
    title: str
    episode_number: Opt[int] = None
    season_number: int = 1
    is_free: bool = False
    coins_required: int = 5
    intro_duration: int = 30


@router.post("/series/{series_id}/episodes")
async def create_episode_for_series(
    series_id: str,
    data: SimpleEpisodeCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new episode for a specific series (used by batch upload UI)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Verify series ownership - allow adding episodes even while under review
    series = await db.creator_series.find_one({"id": series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Allow episodes to be added while series is pending_review, approved, or published
    if series.get("status") not in ["pending_review", "approved", "published"]:
        raise HTTPException(status_code=400, detail="Cannot add episodes to rejected or draft series")
    
    # Get existing episode count to auto-generate episode number
    existing_count = await db.creator_episodes.count_documents({"series_id": series_id})
    episode_number = data.episode_number if data.episode_number else existing_count + 1
    
    # Get or create season
    season = await db.seasons.find_one({
        "series_id": series_id,
        "season_number": data.season_number
    })
    
    if not season:
        # Create new season
        season_id = f"season-{uuid.uuid4().hex[:8]}"
        season = {
            "id": season_id,
            "series_id": series_id,
            "creator_id": creator["id"],
            "season_number": data.season_number,
            "title": f"Season {data.season_number}",
            "description": None,
            "total_episodes": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.seasons.insert_one(season)
        await db.creator_series.update_one(
            {"id": series_id},
            {"$inc": {"total_seasons": 1}}
        )
    
    season_id = season["id"]
    
    # Generate episode code (S01E03 format)
    episode_code = f"S{str(data.season_number).zfill(2)}E{str(episode_number).zfill(2)}"
    episode_id = f"{series_id}-{episode_code.lower()}"
    
    # Check if episode already exists
    existing = await db.creator_episodes.find_one({"id": episode_id})
    if existing:
        # Use timestamp to make unique
        episode_id = f"{series_id}-{episode_code.lower()}-{uuid.uuid4().hex[:6]}"
    
    # Create video placeholder in Bunny.net
    bunny_video_id = None
    video_title = f"{series['title']} - {episode_code}: {data.title}"
    bunny_result = await bunny_service.create_video(video_title)
    
    if bunny_result["success"]:
        bunny_video_id = bunny_result["video_id"]
    
    episode = {
        "id": episode_id,
        "series_id": series_id,
        "season_id": season_id,
        "creator_id": creator["id"],
        "season_number": data.season_number,
        "episode_number": episode_number,
        "episode_code": episode_code,
        "title": data.title,
        "description": None,
        "video_url": None,
        "bunny_video_id": bunny_video_id,
        "encoding_status": "pending",
        "duration": None,
        "thumbnail": None,
        "is_free": data.is_free or (data.season_number == 1 and episode_number == 1),
        "is_pilot": data.season_number == 1 and episode_number == 1,
        "coins_required": 0 if (data.is_free or (data.season_number == 1 and episode_number == 1)) else data.coins_required,
        "intro_duration": data.intro_duration,
        "is_story_content": data.season_number == 1 and episode_number == 1,
        "requires_vertical": data.season_number == 1 and episode_number == 1,
        "aspect_ratio": None,
        "views": 0,
        "earnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None
    }
    
    await db.creator_episodes.insert_one(episode)
    
    # Update season and series episode counts
    await db.seasons.update_one({"id": season_id}, {"$inc": {"total_episodes": 1}})
    await db.creator_series.update_one({"id": series_id}, {"$inc": {"total_episodes": 1}})
    
    # Return response with 'episode' key for frontend compatibility
    return {
        "message": f"Episode {episode_code} created successfully",
        "episode": {
            "id": episode_id,
            "episode_code": episode_code,
            "bunny_video_id": bunny_video_id
        },
        "episode_id": episode_id,
        "episode_code": episode_code,
        "season_number": data.season_number,
        "episode_number": episode_number
    }


@router.post("/episodes")
async def create_episode(data: CreatorEpisodeCreate, user: dict = Depends(get_current_user)):
    """Create a new episode with season support (S01E03 format)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Verify series ownership - allow adding episodes even while under review
    series = await db.creator_series.find_one({"id": data.series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Allow episodes to be added while series is pending_review, approved, or published
    if series.get("status") not in ["pending_review", "approved", "published"]:
        raise HTTPException(status_code=400, detail="Cannot add episodes to rejected or draft series")
    
    # Get or create season
    season = await db.seasons.find_one({
        "series_id": data.series_id,
        "season_number": data.season_number
    })
    
    if not season:
        # Create new season
        season_id = f"season-{uuid.uuid4().hex[:8]}"
        season = {
            "id": season_id,
            "series_id": data.series_id,
            "creator_id": creator["id"],
            "season_number": data.season_number,
            "title": f"Season {data.season_number}",
            "description": None,
            "total_episodes": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.seasons.insert_one(season)
        
        # Update series total seasons
        await db.creator_series.update_one(
            {"id": data.series_id},
            {"$inc": {"total_seasons": 1}}
        )
    
    season_id = season["id"]
    
    # Generate episode code (S01E03 format)
    episode_code = f"S{str(data.season_number).zfill(2)}E{str(data.episode_number).zfill(2)}"
    episode_id = f"{data.series_id}-{episode_code.lower()}"
    
    # Check if episode already exists
    existing = await db.creator_episodes.find_one({"id": episode_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Episode {episode_code} already exists")
    
    # Create video in Bunny.net (if no direct URL provided)
    bunny_video_id = None
    upload_url = None
    
    if not data.video_url:
        video_title = f"{series['title']} - {episode_code}: {data.title}"
        bunny_result = await bunny_service.create_video(video_title)
        
        if bunny_result["success"]:
            bunny_video_id = bunny_result["video_id"]
            upload_url = await bunny_service.get_upload_url(bunny_video_id)
    
    episode = {
        "id": episode_id,
        "series_id": data.series_id,
        "season_id": season_id,
        "creator_id": creator["id"],
        "season_number": data.season_number,
        "episode_number": data.episode_number,
        "episode_code": episode_code,
        "title": data.title,
        "description": data.description,
        "video_url": data.video_url,
        "bunny_video_id": bunny_video_id,
        "encoding_status": "ready" if data.video_url else "pending",
        "duration": None,
        "thumbnail": None,
        "is_free": data.is_free or (data.season_number == 1 and data.episode_number == 1),  # S01E01 is always free
        "is_pilot": data.season_number == 1 and data.episode_number == 1,
        "coins_required": 0 if (data.is_free or (data.season_number == 1 and data.episode_number == 1)) else data.coins_required,
        "intro_duration": data.intro_duration,
        # Story content: Episode 1 of Season 1 is always story content (requires vertical video)
        "is_story_content": data.season_number == 1 and data.episode_number == 1,
        "requires_vertical": data.season_number == 1 and data.episode_number == 1,  # Hint for frontend validation
        "aspect_ratio": None,  # Will be set after video upload/processing
        "views": 0,
        "earnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None
    }
    
    await db.creator_episodes.insert_one(episode)
    
    # Update season episode count
    await db.seasons.update_one(
        {"id": season_id},
        {"$inc": {"total_episodes": 1}}
    )
    
    # Update series episode count
    await db.creator_series.update_one(
        {"id": data.series_id},
        {"$inc": {"total_episodes": 1}}
    )
    
    response = {
        "message": f"Episode {episode_code} created successfully",
        "episode_id": episode_id,
        "episode_code": episode_code,
        "season_number": data.season_number,
        "episode_number": data.episode_number
    }
    
    if upload_url:
        response["upload_url"] = upload_url
        response["video_id"] = bunny_video_id
        response["upload_headers"] = {"AccessKey": bunny_service.api_key}
    
    return response


@router.post("/episodes/{episode_id}/upload")
async def upload_episode_video(
    episode_id: str,
    video: UploadFile = File(None, alias="video"),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user)
):
    """Upload video file for an episode"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Get episode
    episode = await db.creator_episodes.find_one({"id": episode_id, "creator_id": creator["id"]})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Use whichever file field was provided (video or file)
    upload_file = video if video and video.filename else file
    if not upload_file or not upload_file.filename:
        raise HTTPException(status_code=400, detail="No video file provided")
    
    # If bunny_video_id not set, initialize it now
    bunny_video_id = episode.get("bunny_video_id")
    if not bunny_video_id:
        # Get series for naming
        series = await db.creator_series.find_one({"id": episode.get("series_id")}, {"_id": 0})
        series_title = series.get("title", "Series") if series else "Series"
        video_title = f"{series_title} - {episode.get('episode_code', 'EP')}: {episode.get('title', 'Episode')}"
        
        bunny_result = await bunny_service.create_video(video_title)
        if not bunny_result["success"]:
            raise HTTPException(status_code=500, detail="Failed to initialize video upload: " + bunny_result.get("error", "Unknown error"))
        
        bunny_video_id = bunny_result["video_id"]
        
        # Update episode with bunny_video_id
        await db.creator_episodes.update_one(
            {"id": episode_id},
            {"$set": {"bunny_video_id": bunny_video_id, "encoding_status": "pending"}}
        )
    
    # Read file content
    content = await upload_file.read()
    
    # Upload to Bunny.net
    result = await bunny_service.upload_video(bunny_video_id, content)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Upload failed: " + result.get("error", "Unknown error"))
    
    # Update episode status
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {"encoding_status": "encoding"}}
    )
    
    return {
        "message": "Video uploaded! Encoding in progress...",
        "episode_id": episode_id,
        "status": "encoding"
    }


@router.get("/episodes/{episode_id}/status")
async def get_episode_status(episode_id: str, user: dict = Depends(get_current_user)):
    """Get episode encoding status"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    episode = await db.creator_episodes.find_one({"id": episode_id, "creator_id": creator["id"]})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    if not episode.get("bunny_video_id"):
        return {"episode_id": episode_id, "status": "pending", "message": "Video not uploaded yet"}
    
    # Get status from Bunny.net
    bunny_status = await bunny_service.get_video_status(episode["bunny_video_id"])
    
    if bunny_status["success"]:
        # Update local status
        await db.creator_episodes.update_one(
            {"id": episode_id},
            {"$set": {
                "encoding_status": bunny_status["status"],
                "duration": bunny_status.get("duration"),
                "thumbnail": bunny_status.get("thumbnail_url")
            }}
        )
        
        return {
            "episode_id": episode_id,
            "status": bunny_status["status"],
            "duration": bunny_status.get("duration"),
            "thumbnail": bunny_status.get("thumbnail_url"),
            "resolutions": bunny_status.get("available_resolutions", [])
        }
    
    return {"episode_id": episode_id, "status": episode.get("encoding_status", "unknown")}


@router.patch("/episodes/{episode_id}")
async def update_episode(
    episode_id: str, 
    user: dict = Depends(get_current_user), 
    title: str = None, 
    description: str = None, 
    is_free: bool = None, 
    coins_required: int = None, 
    intro_duration: int = None,
    thumbnail_url: str = None,
    video_url: str = None
):
    """Update episode settings including intro duration, thumbnail, and video URL"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    episode = await db.creator_episodes.find_one({"id": episode_id, "creator_id": creator["id"]})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Build update dict with only provided fields
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if is_free is not None:
        update_data["is_free"] = is_free
        if is_free:
            update_data["coins_required"] = 0
    if coins_required is not None and not update_data.get("is_free"):
        update_data["coins_required"] = max(0, min(50, coins_required))
    if intro_duration is not None:
        update_data["intro_duration"] = max(0, min(120, intro_duration))
    if thumbnail_url is not None:
        if not thumbnail_url.startswith(("http://", "https://", "data:")):
            raise HTTPException(status_code=400, detail="Invalid thumbnail URL format")
        update_data["thumbnail"] = thumbnail_url
    if video_url is not None:
        if not video_url.startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="Invalid video URL format")
        update_data["video_url"] = video_url
        update_data["encoding_status"] = "ready"
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": update_data}
    )
    
    # Also update main episodes collection if published
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": update_data}
    )
    
    return {
        "message": "Episode updated successfully",
        "episode_id": episode_id,
        "updated_fields": list(update_data.keys())
    }


# ============ EPISODE REORDERING (DRAG & DROP) ============

from pydantic import BaseModel as PydanticBaseModel

class EpisodeReorderItem(PydanticBaseModel):
    """Single episode reorder item"""
    episode_id: str
    season_number: int
    episode_number: int

class EpisodeReorderRequest(PydanticBaseModel):
    """Request to reorder episodes"""
    episodes: list[EpisodeReorderItem]

@router.post("/series/{series_id}/reorder-episodes")
async def reorder_episodes(
    series_id: str,
    data: EpisodeReorderRequest,
    user: dict = Depends(get_current_user)
):
    """Reorder episodes within and between seasons (drag & drop support)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Verify series ownership
    series = await db.creator_series.find_one({"id": series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    updated_count = 0
    
    for item in data.episodes:
        # Verify episode belongs to this series and creator
        episode = await db.creator_episodes.find_one({
            "id": item.episode_id,
            "series_id": series_id,
            "creator_id": creator["id"]
        })
        
        if not episode:
            continue
        
        # Generate new episode code
        new_episode_code = f"S{str(item.season_number).zfill(2)}E{str(item.episode_number).zfill(2)}"
        
        # Determine if this is a free episode (S01E01 is always free)
        is_free = item.season_number == 1 and item.episode_number == 1
        is_pilot = is_free
        
        # Update episode
        update_data = {
            "season_number": item.season_number,
            "episode_number": item.episode_number,
            "episode_code": new_episode_code,
            "is_pilot": is_pilot
        }
        
        # If moved to S01E01, make it free
        if is_free and not episode.get("is_free"):
            update_data["is_free"] = True
            update_data["coins_required"] = 0
        
        # Get or create season
        season = await db.seasons.find_one({
            "series_id": series_id,
            "season_number": item.season_number
        })
        
        if not season:
            # Create new season
            season_id = f"season-{uuid.uuid4().hex[:8]}"
            new_season = {
                "id": season_id,
                "series_id": series_id,
                "creator_id": creator["id"],
                "season_number": item.season_number,
                "title": f"Season {item.season_number}",
                "description": None,
                "total_episodes": 0,
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.seasons.insert_one(new_season)
            await db.creator_series.update_one(
                {"id": series_id},
                {"$inc": {"total_seasons": 1}}
            )
            update_data["season_id"] = season_id
        else:
            update_data["season_id"] = season["id"]
        
        await db.creator_episodes.update_one(
            {"id": item.episode_id},
            {"$set": update_data}
        )
        
        # Also update main episodes collection if published
        await db.episodes.update_one(
            {"id": item.episode_id},
            {"$set": update_data}
        )
        
        updated_count += 1
    
    # Recalculate season episode counts
    seasons = await db.seasons.find({"series_id": series_id}).to_list(100)
    for season in seasons:
        count = await db.creator_episodes.count_documents({
            "series_id": series_id,
            "season_number": season["season_number"]
        })
        await db.seasons.update_one(
            {"id": season["id"]},
            {"$set": {"total_episodes": count}}
        )
    
    return {
        "message": f"Successfully reordered {updated_count} episode(s)",
        "updated_count": updated_count
    }


# ============ BULK EPISODE EDITING ============

class BulkEditRequest(PydanticBaseModel):
    """Request to bulk edit episodes"""
    episode_ids: list[str]
    action: str  # 'move_season', 'set_free', 'set_coins'
    value: int | bool  # season_number, is_free (bool), or coins_required (int)

@router.post("/series/{series_id}/bulk-edit-episodes")
async def bulk_edit_episodes(
    series_id: str,
    data: BulkEditRequest,
    user: dict = Depends(get_current_user)
):
    """Bulk edit multiple episodes at once (change season, free status, or pricing)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Verify series ownership
    series = await db.creator_series.find_one({"id": series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    if not data.episode_ids:
        raise HTTPException(status_code=400, detail="No episodes selected")
    
    updated_count = 0
    
    for episode_id in data.episode_ids:
        # Verify episode belongs to this series and creator
        episode = await db.creator_episodes.find_one({
            "id": episode_id,
            "series_id": series_id,
            "creator_id": creator["id"]
        })
        
        if not episode:
            continue
        
        update_data = {}
        
        if data.action == "move_season":
            new_season = int(data.value)
            
            # Get or create season
            season = await db.seasons.find_one({
                "series_id": series_id,
                "season_number": new_season
            })
            
            if not season:
                # Create new season
                season_id = f"season-{uuid.uuid4().hex[:8]}"
                new_season_doc = {
                    "id": season_id,
                    "series_id": series_id,
                    "creator_id": creator["id"],
                    "season_number": new_season,
                    "title": f"Season {new_season}",
                    "description": None,
                    "total_episodes": 0,
                    "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.seasons.insert_one(new_season_doc)
                await db.creator_series.update_one(
                    {"id": series_id},
                    {"$inc": {"total_seasons": 1}}
                )
                update_data["season_id"] = season_id
            else:
                update_data["season_id"] = season["id"]
            
            # Get next episode number in target season
            existing_count = await db.creator_episodes.count_documents({
                "series_id": series_id,
                "season_number": new_season
            })
            
            update_data["season_number"] = new_season
            update_data["episode_number"] = existing_count + 1
            update_data["episode_code"] = f"S{str(new_season).zfill(2)}E{str(existing_count + 1).zfill(2)}"
            
        elif data.action == "set_free":
            is_free = bool(data.value)
            update_data["is_free"] = is_free
            if is_free:
                update_data["coins_required"] = 0
                
        elif data.action == "set_coins":
            coins = max(1, min(50, int(data.value)))
            update_data["coins_required"] = coins
            update_data["is_free"] = False
        
        if update_data:
            await db.creator_episodes.update_one(
                {"id": episode_id},
                {"$set": update_data}
            )
            
            # Also update main episodes collection if published
            await db.episodes.update_one(
                {"id": episode_id},
                {"$set": update_data}
            )
            
            updated_count += 1
    
    # Recalculate season episode counts
    all_seasons = await db.seasons.find({"series_id": series_id}).to_list(100)
    for season in all_seasons:
        count = await db.creator_episodes.count_documents({
            "series_id": series_id,
            "season_number": season["season_number"]
        })
        await db.seasons.update_one(
            {"id": season["id"]},
            {"$set": {"total_episodes": count}}
        )
    
    action_desc = {
        "move_season": f"moved to Season {data.value}",
        "set_free": "set to free" if data.value else "set to paid",
        "set_coins": f"priced at {data.value} coins"
    }.get(data.action, "updated")
    
    return {
        "message": f"Successfully {action_desc} {updated_count} episode(s)",
        "updated_count": updated_count,
        "action": data.action
    }


@router.post("/episodes/{episode_id}/init-video")
async def initialize_video_upload(episode_id: str, user: dict = Depends(get_current_user)):
    """Initialize Bunny.net video for an episode (call this before uploading)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    episode = await db.creator_episodes.find_one({"id": episode_id, "creator_id": creator["id"]})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Get series for title
    series = await db.creator_series.find_one({"id": episode["series_id"]}, {"_id": 0})
    series_title = series.get("title", "Series") if series else "Series"
    
    # Create video in Bunny.net
    video_title = f"{series_title} - {episode.get('episode_code', 'EP')}: {episode.get('title', 'Episode')}"
    bunny_result = await bunny_service.create_video(video_title)
    
    if not bunny_result["success"]:
        raise HTTPException(status_code=500, detail="Failed to initialize video upload")
    
    bunny_video_id = bunny_result["video_id"]
    upload_url = await bunny_service.get_upload_url(bunny_video_id)
    
    # Update episode with Bunny video ID
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {
            "bunny_video_id": bunny_video_id,
            "encoding_status": "pending"
        }}
    )
    
    return {
        "message": "Video upload initialized",
        "episode_id": episode_id,
        "bunny_video_id": bunny_video_id,
        "upload_url": upload_url,
        "upload_headers": {
            "AccessKey": bunny_service.api_key,
            "Content-Type": "application/octet-stream"
        },
        "instructions": {
            "method": "PUT",
            "note": "Upload video file directly to upload_url with the provided headers"
        }
    }


# ============ REVENUE TRACKING ============
@router.get("/earnings")
async def get_earnings_history(user: dict = Depends(get_current_user), limit: int = 50):
    """Get earnings history"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    earnings = await db.view_records.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {
        "total_earnings": creator["total_earnings"],
        "pending_payout": creator["pending_payout"],
        "recent_earnings": earnings
    }


@router.post("/payout/request")
async def request_payout(data: PayoutRequest, user: dict = Depends(get_current_user)):
    """Request a payout"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    if creator["pending_payout"] < data.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. You have {creator['pending_payout']} coins available.")
    
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum payout is 100 coins")
    
    payout_id = f"payout-{uuid.uuid4().hex[:12]}"
    
    payout = {
        "id": payout_id,
        "creator_id": creator["id"],
        "amount": data.amount,
        "payout_method": data.payout_method,
        "payout_details": data.payout_details,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None
    }
    
    await db.payouts.insert_one(payout)
    
    # Deduct from pending payout
    await db.creators.update_one(
        {"id": creator["id"]},
        {"$inc": {"pending_payout": -data.amount}}
    )
    
    return {
        "message": "Payout request submitted",
        "payout_id": payout_id,
        "amount": data.amount,
        "status": "pending"
    }


@router.get("/payouts")
async def get_payout_history(
    user: dict = Depends(get_current_user),
    status: str = None,
    limit: int = 50
):
    """Get payout history with optional status filter"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    query = {"creator_id": creator["id"]}
    if status:
        query["status"] = status
    
    payouts = await db.payouts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Calculate totals
    total_requested = sum(p.get("amount", 0) for p in payouts)
    total_completed = sum(p.get("amount", 0) for p in payouts if p.get("status") == "completed")
    total_pending = sum(p.get("amount", 0) for p in payouts if p.get("status") == "pending")
    
    return {
        "payouts": payouts,
        "summary": {
            "total_requested": total_requested,
            "total_completed": total_completed,
            "total_pending": total_pending,
            "available_balance": creator.get("pending_payout", 0)
        }
    }


@router.get("/payouts/{payout_id}")
async def get_payout_detail(payout_id: str, user: dict = Depends(get_current_user)):
    """Get details of a specific payout"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    payout = await db.payouts.find_one(
        {"id": payout_id, "creator_id": creator["id"]},
        {"_id": 0}
    )
    
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    return payout


# ============ WEBHOOK FOR ENCODING ============
@router.post("/webhook/bunny")
async def bunny_webhook(request: dict):
    """Handle Bunny.net encoding webhook"""
    video_id = request.get("VideoGuid")
    status_code = request.get("Status")
    
    if not video_id:
        return {"success": False}
    
    status_map = {
        0: "queued",
        1: "processing", 
        2: "encoding",
        3: "ready",
        4: "ready",
        5: "failed"
    }
    
    new_status = status_map.get(status_code, "unknown")
    
    # Update episode
    await db.creator_episodes.update_one(
        {"bunny_video_id": video_id},
        {"$set": {"encoding_status": new_status}}
    )
    
    return {"success": True, "status": new_status}



# ============ SUBTITLE MANAGEMENT ============

@router.post("/episodes/{episode_id}/subtitles")
async def upload_subtitle(
    episode_id: str,
    data: SubtitleUpload,
    user: dict = Depends(get_current_user)
):
    """Add or update subtitles for an episode"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Verify episode ownership
    episode = await db.creator_episodes.find_one({
        "id": episode_id,
        "creator_id": creator["id"]
    })
    
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Validate language code
    valid_languages = ["en", "sw", "fr"]
    if data.language not in valid_languages:
        raise HTTPException(status_code=400, detail=f"Invalid language. Must be one of: {valid_languages}")
    
    # Get existing subtitles or create new dict
    subtitles = episode.get("subtitles", {}) or {}
    subtitles[data.language] = data.subtitle_url
    
    # Update episode with subtitles
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    # Also update main episodes collection if published
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    return {
        "message": f"Subtitles for {data.language} uploaded successfully",
        "subtitles": subtitles
    }


@router.delete("/episodes/{episode_id}/subtitles/{language}")
async def delete_subtitle(
    episode_id: str,
    language: str,
    user: dict = Depends(get_current_user)
):
    """Remove subtitles for a specific language"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    episode = await db.creator_episodes.find_one({
        "id": episode_id,
        "creator_id": creator["id"]
    })
    
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    subtitles = episode.get("subtitles", {}) or {}
    if language in subtitles:
        del subtitles[language]
    
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    return {"message": f"Subtitles for {language} removed", "subtitles": subtitles}


@router.get("/episodes/{episode_id}/subtitles")
async def get_episode_subtitles(
    episode_id: str,
    user: dict = Depends(get_current_user)
):
    """Get all subtitles for an episode"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    episode = await db.creator_episodes.find_one(
        {"id": episode_id, "creator_id": creator["id"]},
        {"_id": 0, "subtitles": 1}
    )
    
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    return {
        "episode_id": episode_id,
        "subtitles": episode.get("subtitles", {}),
        "available_languages": list((episode.get("subtitles", {}) or {}).keys())
    }


# ============ SUBTITLE TEMPLATE ============

VTT_TEMPLATE = """WEBVTT

NOTE
This is a subtitle template for Kona mini-series.
Replace the sample text with your actual dialogue.
Timestamps format: HH:MM:SS.mmm --> HH:MM:SS.mmm

1
00:00:00.000 --> 00:00:03.000
[Opening scene description]

2
00:00:03.500 --> 00:00:06.000
Character 1: Hello, how are you?

3
00:00:06.500 --> 00:00:09.000
Character 2: I'm doing well, thank you!

4
00:00:10.000 --> 00:00:13.500
[Add more subtitles following this format]

NOTE TIPS FOR CREATORS:
- Keep each subtitle under 2 lines
- Each line should be under 42 characters
- Show subtitles for 1-7 seconds
- Sync with audio carefully
- Use [] for sound effects: [door slams], [music plays]
- Save file as .vtt (WebVTT format)
"""

@router.get("/subtitle-template", response_class=PlainTextResponse)
async def download_subtitle_template():
    """Download a VTT subtitle template file"""
    return PlainTextResponse(
        content=VTT_TEMPLATE,
        media_type="text/vtt",
        headers={
            "Content-Disposition": "attachment; filename=subtitle_template.vtt"
        }
    )

