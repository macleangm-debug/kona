"""
Enhanced Search Routes
Auto-complete, filters, search history, and trending searches
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from collections import defaultdict

from services import db, get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


# ============ MODELS ============

class SearchFilters(BaseModel):
    genres: Optional[List[str]] = None
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    min_episodes: Optional[int] = None
    max_episodes: Optional[int] = None
    sort_by: Optional[str] = "relevance"  # relevance, rating, views, newest
    is_free: Optional[bool] = None
    is_exclusive: Optional[bool] = None


# ============ SEARCH HELPERS ============

async def record_search(user_id: Optional[str], query: str, results_count: int):
    """Record search for history and analytics"""
    search_record = {
        "id": f"search-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "query": query.lower().strip(),
        "results_count": results_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.search_history.insert_one(search_record)
    
    # Update trending searches counter
    await db.trending_searches.update_one(
        {"query": query.lower().strip()},
        {
            "$inc": {"count": 1},
            "$set": {"last_searched": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )


async def get_search_suggestions(partial: str, limit: int = 10) -> List[str]:
    """Get auto-complete suggestions based on partial query"""
    suggestions = []
    partial_lower = partial.lower().strip()
    
    if len(partial_lower) < 2:
        return []
    
    # Search series titles
    series = await db.series.find(
        {"title": {"$regex": partial_lower, "$options": "i"}},
        {"_id": 0, "title": 1}
    ).limit(limit).to_list(limit)
    
    suggestions.extend([s["title"] for s in series])
    
    # Search genres
    all_genres = ["Romance", "Drama", "Thriller", "Action", "Comedy", "Fantasy", "Historical", "Crime"]
    genre_matches = [g for g in all_genres if partial_lower in g.lower()]
    suggestions.extend(genre_matches[:3])
    
    # Add from trending searches
    trending = await db.trending_searches.find(
        {"query": {"$regex": f"^{partial_lower}", "$options": "i"}},
        {"_id": 0, "query": 1}
    ).sort("count", -1).limit(5).to_list(5)
    
    suggestions.extend([t["query"] for t in trending])
    
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for s in suggestions:
        s_lower = s.lower()
        if s_lower not in seen:
            unique.append(s)
            seen.add(s_lower)
    
    return unique[:limit]


# ============ API ROUTES ============

@router.get("/")
async def search_series(
    q: str = Query(..., min_length=1, description="Search query"),
    genres: Optional[str] = Query(None, description="Comma-separated genres"),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    max_rating: Optional[float] = Query(None, ge=0, le=5),
    min_episodes: Optional[int] = Query(None, ge=1),
    max_episodes: Optional[int] = Query(None),
    sort_by: str = Query("relevance", enum=["relevance", "rating", "views", "newest"]),
    is_exclusive: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user)
):
    """
    Search series with filters and sorting.
    
    Example: /search?q=love&genres=Romance,Drama&min_rating=4&sort_by=rating
    """
    query_text = q.lower().strip()
    
    # Build MongoDB query
    mongo_query = {
        "$or": [
            {"title": {"$regex": query_text, "$options": "i"}},
            {"description": {"$regex": query_text, "$options": "i"}},
            {"genre": {"$regex": query_text, "$options": "i"}}
        ]
    }
    
    # Apply filters
    if genres:
        genre_list = [g.strip() for g in genres.split(",")]
        mongo_query["genre"] = {"$in": [{"$regex": g, "$options": "i"} for g in genre_list]}
    
    if min_rating is not None:
        mongo_query.setdefault("rating", {})["$gte"] = min_rating
    
    if max_rating is not None:
        mongo_query.setdefault("rating", {})["$lte"] = max_rating
    
    if min_episodes is not None:
        mongo_query.setdefault("total_episodes", {})["$gte"] = min_episodes
    
    if max_episodes is not None:
        mongo_query.setdefault("total_episodes", {})["$lte"] = max_episodes
    
    if is_exclusive is not None:
        mongo_query["is_exclusive"] = is_exclusive
    
    # Determine sort order
    sort_field = "rating"
    sort_direction = -1
    
    if sort_by == "views":
        sort_field = "views"
    elif sort_by == "newest":
        sort_field = "created_at"
    elif sort_by == "rating":
        sort_field = "rating"
    # For "relevance", we'll use text match scoring (simplified to rating for now)
    
    # Execute search
    total = await db.series.count_documents(mongo_query)
    
    series = await db.series.find(
        mongo_query,
        {"_id": 0}
    ).sort(sort_field, sort_direction).skip(offset).limit(limit).to_list(limit)
    
    # Record search
    await record_search(user["id"], q, len(series))
    
    return {
        "results": series,
        "total": total,
        "query": q,
        "offset": offset,
        "limit": limit,
        "filters_applied": {
            "genres": genres,
            "min_rating": min_rating,
            "max_rating": max_rating,
            "min_episodes": min_episodes,
            "max_episodes": max_episodes,
            "sort_by": sort_by,
            "is_exclusive": is_exclusive
        }
    }


@router.get("/suggestions")
async def get_suggestions(
    q: str = Query(..., min_length=1, description="Partial query for auto-complete"),
    limit: int = Query(10, ge=1, le=20)
):
    """Get auto-complete suggestions as user types"""
    suggestions = await get_search_suggestions(q, limit)
    
    return {
        "suggestions": suggestions,
        "query": q
    }


@router.get("/history")
async def get_search_history(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50)
):
    """Get user's recent search history"""
    history = await db.search_history.find(
        {"user_id": user["id"]},
        {"_id": 0, "query": 1, "results_count": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Deduplicate by query
    seen = set()
    unique = []
    for h in history:
        if h["query"] not in seen:
            unique.append(h)
            seen.add(h["query"])
    
    return {"history": unique[:limit]}


@router.delete("/history")
async def clear_search_history(user: dict = Depends(get_current_user)):
    """Clear user's search history"""
    result = await db.search_history.delete_many({"user_id": user["id"]})
    return {"message": f"Cleared {result.deleted_count} search records"}


@router.delete("/history/{query}")
async def remove_from_history(
    query: str,
    user: dict = Depends(get_current_user)
):
    """Remove a specific query from search history"""
    result = await db.search_history.delete_many({
        "user_id": user["id"],
        "query": query.lower()
    })
    return {"message": f"Removed '{query}' from history"}


@router.get("/trending")
async def get_trending_searches(limit: int = Query(10, ge=1, le=30)):
    """Get trending/popular searches"""
    # Get searches from last 7 days
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    trending = await db.trending_searches.find(
        {"last_searched": {"$gte": week_ago}},
        {"_id": 0, "query": 1, "count": 1}
    ).sort("count", -1).limit(limit).to_list(limit)
    
    return {"trending": [t["query"] for t in trending]}


@router.get("/genres")
async def get_available_genres():
    """Get all available genres for filtering"""
    # Get unique genres from series
    pipeline = [
        {"$group": {"_id": "$genre", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    results = await db.series.aggregate(pipeline).to_list(50)
    
    genres = [{"name": r["_id"], "count": r["count"]} for r in results if r["_id"]]
    
    return {"genres": genres}


@router.get("/quick")
async def quick_search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(5, ge=1, le=10)
):
    """
    Quick search for navbar/header search (no auth required).
    Returns minimal results for fast response.
    """
    query_text = q.lower().strip()
    
    series = await db.series.find(
        {"title": {"$regex": query_text, "$options": "i"}},
        {"_id": 0, "id": 1, "title": 1, "thumbnail": 1, "genre": 1, "rating": 1}
    ).limit(limit).to_list(limit)
    
    # Also search episodes if enabled
    # episodes = await db.episodes.find(...)
    
    return {
        "series": series,
        "query": q
    }


# ============ ADMIN ANALYTICS ============

@router.get("/admin/analytics")
async def get_search_analytics(
    days: int = Query(7, ge=1, le=30),
    user: dict = Depends(get_current_user)
):
    """Get search analytics for admin (requires admin role)"""
    if user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Total searches
    total = await db.search_history.count_documents({
        "created_at": {"$gte": cutoff}
    })
    
    # Unique users
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "unique_users"}
    ]
    unique_result = await db.search_history.aggregate(pipeline).to_list(1)
    unique_users = unique_result[0]["unique_users"] if unique_result else 0
    
    # Top queries
    top_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {"_id": "$query", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    top_queries = await db.search_history.aggregate(top_pipeline).to_list(20)
    
    # Zero result queries
    zero_result_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "results_count": 0}},
        {"$group": {"_id": "$query", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    zero_results = await db.search_history.aggregate(zero_result_pipeline).to_list(10)
    
    return {
        "period_days": days,
        "total_searches": total,
        "unique_users": unique_users,
        "avg_searches_per_user": round(total / unique_users, 1) if unique_users > 0 else 0,
        "top_queries": [{"query": q["_id"], "count": q["count"]} for q in top_queries],
        "zero_result_queries": [{"query": q["_id"], "count": q["count"]} for q in zero_results]
    }
