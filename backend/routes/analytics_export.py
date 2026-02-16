"""
Analytics Export Routes
Exports analytics data to CSV and PDF for creators and admins
"""
import uuid
import io
import csv
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services import db, get_current_user
from routes.admin import require_admin

router = APIRouter(prefix="/export", tags=["Analytics Export"])


# ============ HELPER FUNCTIONS ============

def get_date_range(period: str):
    """Get start and end dates based on period"""
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    elif period == "1y":
        start = now - timedelta(days=365)
    else:  # all time
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    return start.isoformat(), now.isoformat()


def format_number(num):
    """Format numbers for display"""
    if num >= 1000000:
        return f"{num/1000000:.1f}M"
    elif num >= 1000:
        return f"{num/1000:.1f}K"
    return str(num)


# ============ CREATOR ANALYTICS EXPORT ============

@router.get("/creator/csv")
async def export_creator_analytics_csv(
    user: dict = Depends(get_current_user),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y, all")
):
    """Export creator analytics to CSV"""
    # Check if user is a creator
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Creator account required")
    
    start_date, end_date = get_date_range(period)
    
    # Get series data
    series_list = await db.creator_series.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Get earnings data
    earnings = await db.creator_earnings.find(
        {
            "creator_id": creator["id"],
            "created_at": {"$gte": start_date, "$lte": end_date}
        },
        {"_id": 0}
    ).to_list(10000)
    
    # Get episode performance
    episode_stats = []
    for s in series_list:
        episodes = await db.creator_episodes.find(
            {"series_id": s["id"]},
            {"_id": 0}
        ).to_list(100)
        episode_stats.extend(episodes)
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Overview Section
    writer.writerow(["=== CREATOR ANALYTICS EXPORT ==="])
    writer.writerow(["Period", period])
    writer.writerow(["Export Date", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")])
    writer.writerow(["Creator", creator.get("name", "Unknown")])
    writer.writerow(["Tier", creator.get("tier", "new")])
    writer.writerow([])
    
    # Summary Stats
    total_views = sum(s.get("views", 0) for s in series_list)
    total_earnings = sum(e.get("amount", 0) for e in earnings)
    total_series = len(series_list)
    total_episodes = len(episode_stats)
    
    writer.writerow(["=== SUMMARY ==="])
    writer.writerow(["Total Views", total_views])
    writer.writerow(["Total Earnings", f"${total_earnings:.2f}"])
    writer.writerow(["Total Series", total_series])
    writer.writerow(["Total Episodes", total_episodes])
    writer.writerow([])
    
    # Series Performance
    writer.writerow(["=== SERIES PERFORMANCE ==="])
    writer.writerow(["Series Title", "Genre", "Status", "Views", "Episodes", "Rating", "Created"])
    for s in series_list:
        writer.writerow([
            s.get("title", ""),
            s.get("genre", ""),
            s.get("status", ""),
            s.get("views", 0),
            s.get("episode_count", 0),
            s.get("rating", 0),
            s.get("created_at", "")[:10] if s.get("created_at") else ""
        ])
    writer.writerow([])
    
    # Episode Performance
    writer.writerow(["=== EPISODE PERFORMANCE ==="])
    writer.writerow(["Episode Title", "Series", "Views", "Likes", "Watch Time (min)", "Retention %"])
    for ep in episode_stats:
        writer.writerow([
            ep.get("title", ""),
            ep.get("series_id", ""),
            ep.get("views", 0),
            ep.get("likes", 0),
            ep.get("watch_time", 0),
            f"{ep.get('retention_rate', 0):.1f}%"
        ])
    writer.writerow([])
    
    # Earnings Breakdown
    writer.writerow(["=== EARNINGS BREAKDOWN ==="])
    writer.writerow(["Date", "Type", "Amount", "Description"])
    for e in earnings:
        writer.writerow([
            e.get("created_at", "")[:10] if e.get("created_at") else "",
            e.get("type", ""),
            f"${e.get('amount', 0):.2f}",
            e.get("description", "")
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=kona_creator_analytics_{period}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/creator/summary")
async def get_creator_export_summary(
    user: dict = Depends(get_current_user),
    period: str = Query("30d")
):
    """Get creator analytics summary (for PDF preview)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Creator account required")
    
    start_date, end_date = get_date_range(period)
    
    series_list = await db.creator_series.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).to_list(100)
    
    earnings = await db.creator_earnings.find(
        {
            "creator_id": creator["id"],
            "created_at": {"$gte": start_date, "$lte": end_date}
        },
        {"_id": 0}
    ).to_list(10000)
    
    total_views = sum(s.get("views", 0) for s in series_list)
    total_earnings = sum(e.get("amount", 0) for e in earnings)
    
    # Group earnings by type
    earnings_by_type = {}
    for e in earnings:
        t = e.get("type", "other")
        earnings_by_type[t] = earnings_by_type.get(t, 0) + e.get("amount", 0)
    
    # Top performing series
    top_series = sorted(series_list, key=lambda x: x.get("views", 0), reverse=True)[:5]
    
    return {
        "period": period,
        "creator_name": creator.get("name"),
        "tier": creator.get("tier"),
        "summary": {
            "total_views": total_views,
            "total_earnings": round(total_earnings, 2),
            "total_series": len(series_list),
            "avg_rating": round(sum(s.get("rating", 0) for s in series_list) / max(len(series_list), 1), 1)
        },
        "earnings_by_type": earnings_by_type,
        "top_series": [
            {"title": s.get("title"), "views": s.get("views", 0), "earnings": s.get("earnings", 0)}
            for s in top_series
        ],
        "export_date": datetime.now(timezone.utc).isoformat()
    }


# ============ ADMIN ANALYTICS EXPORT ============

@router.get("/admin/csv")
async def export_admin_analytics_csv(
    user: dict = Depends(require_admin),
    period: str = Query("30d"),
    report_type: str = Query("overview", description="overview, users, content, revenue, creators")
):
    """Export platform analytics to CSV (Admin only)"""
    start_date, end_date = get_date_range(period)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["=== KONA PLATFORM ANALYTICS EXPORT ==="])
    writer.writerow(["Report Type", report_type])
    writer.writerow(["Period", period])
    writer.writerow(["Export Date", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")])
    writer.writerow(["Exported By", user.get("name", "Admin")])
    writer.writerow([])
    
    if report_type == "overview" or report_type == "all":
        # Platform Overview
        total_users = await db.users.count_documents({})
        total_creators = await db.creators.count_documents({"status": "approved"})
        total_series = await db.series.count_documents({})
        total_episodes = await db.episodes.count_documents({})
        
        # Coins in circulation
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$coins"}}}]
        coins_result = await db.users.aggregate(pipeline).to_list(1)
        total_coins = coins_result[0]["total"] if coins_result else 0
        
        writer.writerow(["=== PLATFORM OVERVIEW ==="])
        writer.writerow(["Total Users", total_users])
        writer.writerow(["Total Creators", total_creators])
        writer.writerow(["Total Series", total_series])
        writer.writerow(["Total Episodes", total_episodes])
        writer.writerow(["Coins in Circulation", total_coins])
        writer.writerow([])
    
    if report_type == "users" or report_type == "all":
        # User Growth Data
        users = await db.users.find(
            {"created_at": {"$gte": start_date, "$lte": end_date}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "created_at": 1, "coins": 1, "subscription_tier": 1}
        ).sort("created_at", -1).to_list(10000)
        
        writer.writerow(["=== USER REGISTRATIONS ==="])
        writer.writerow(["User ID", "Name", "Email", "Registration Date", "Coins", "Subscription Tier"])
        for u in users:
            writer.writerow([
                u.get("id", ""),
                u.get("name", ""),
                u.get("email", ""),
                u.get("created_at", "")[:10] if u.get("created_at") else "",
                u.get("coins", 0),
                u.get("subscription_tier", "free")
            ])
        writer.writerow([])
    
    if report_type == "content" or report_type == "all":
        # Content Performance
        series_list = await db.series.find({}, {"_id": 0}).sort("views", -1).to_list(500)
        
        writer.writerow(["=== CONTENT PERFORMANCE ==="])
        writer.writerow(["Series Title", "Genre", "Views", "Rating", "Episodes", "Featured"])
        for s in series_list:
            writer.writerow([
                s.get("title", ""),
                s.get("genre", ""),
                s.get("views", 0),
                s.get("rating", 0),
                s.get("total_episodes", 0),
                "Yes" if s.get("featured") else "No"
            ])
        writer.writerow([])
    
    if report_type == "revenue" or report_type == "all":
        # Revenue Data
        transactions = await db.transactions.find(
            {"created_at": {"$gte": start_date, "$lte": end_date}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(10000)
        
        total_revenue = sum(t.get("amount", 0) for t in transactions if t.get("type") == "purchase")
        
        writer.writerow(["=== REVENUE DATA ==="])
        writer.writerow(["Total Revenue (Period)", f"${total_revenue:.2f}"])
        writer.writerow(["Total Transactions", len(transactions)])
        writer.writerow([])
        writer.writerow(["Transaction ID", "User ID", "Type", "Amount", "Date"])
        for t in transactions[:1000]:  # Limit to 1000 transactions
            writer.writerow([
                t.get("id", ""),
                t.get("user_id", ""),
                t.get("type", ""),
                f"${t.get('amount', 0):.2f}",
                t.get("created_at", "")[:10] if t.get("created_at") else ""
            ])
        writer.writerow([])
    
    if report_type == "creators" or report_type == "all":
        # Creator Performance
        creators = await db.creators.find(
            {"status": "approved"},
            {"_id": 0}
        ).to_list(1000)
        
        writer.writerow(["=== CREATOR PERFORMANCE ==="])
        writer.writerow(["Creator Name", "Email", "Tier", "Total Views", "Total Earnings", "Series Count", "Joined"])
        for c in creators:
            writer.writerow([
                c.get("name", ""),
                c.get("email", ""),
                c.get("tier", "new"),
                c.get("total_views", 0),
                f"${c.get('total_earnings', 0):.2f}",
                c.get("series_count", 0),
                c.get("created_at", "")[:10] if c.get("created_at") else ""
            ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=kona_admin_{report_type}_{period}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/admin/summary")
async def get_admin_export_summary(
    user: dict = Depends(require_admin),
    period: str = Query("30d")
):
    """Get platform analytics summary for PDF/dashboard"""
    start_date, end_date = get_date_range(period)
    
    # Basic counts
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents({"created_at": {"$gte": start_date}})
    total_creators = await db.creators.count_documents({"status": "approved"})
    total_series = await db.series.count_documents({})
    total_episodes = await db.episodes.count_documents({})
    
    # Active users (logged in within period)
    active_users = await db.users.count_documents({"last_active": {"$gte": start_date}})
    
    # Revenue
    transactions = await db.transactions.find(
        {"created_at": {"$gte": start_date}, "type": "purchase"},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    total_revenue = sum(t.get("amount", 0) for t in transactions)
    
    # Content stats
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$views"}}}]
    views_result = await db.series.aggregate(pipeline).to_list(1)
    total_views = views_result[0]["total"] if views_result else 0
    
    # Top content
    top_series = await db.series.find({}, {"_id": 0, "title": 1, "views": 1, "genre": 1}).sort("views", -1).limit(10).to_list(10)
    
    # User breakdown by subscription
    pipeline = [{"$group": {"_id": "$subscription_tier", "count": {"$sum": 1}}}]
    user_breakdown = await db.users.aggregate(pipeline).to_list(10)
    
    return {
        "period": period,
        "summary": {
            "total_users": total_users,
            "new_users": new_users,
            "active_users": active_users,
            "total_creators": total_creators,
            "total_series": total_series,
            "total_episodes": total_episodes,
            "total_views": total_views,
            "total_revenue": round(total_revenue, 2)
        },
        "user_breakdown": {item["_id"] or "free": item["count"] for item in user_breakdown},
        "top_series": [
            {"title": s.get("title"), "views": s.get("views", 0), "genre": s.get("genre")}
            for s in top_series
        ],
        "export_date": datetime.now(timezone.utc).isoformat()
    }


# ============ PDF GENERATION (returns data for frontend PDF lib) ============

@router.get("/pdf-data")
async def get_pdf_export_data(
    user: dict = Depends(get_current_user),
    export_type: str = Query("creator", description="creator or admin"),
    period: str = Query("30d")
):
    """Get formatted data for frontend PDF generation"""
    if export_type == "admin":
        # Check admin permission
        if not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return await get_admin_export_summary(user, period)
    else:
        return await get_creator_export_summary(user, period)
