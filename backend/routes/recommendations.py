"""
Recommendation Engine Routes
Hybrid recommendation system using collaborative filtering and content-based approaches
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from collections import defaultdict
import random
import math

from services import db, get_current_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# ============ RECOMMENDATION HELPERS ============

async def get_user_watch_history(user_id: str, limit: int = 100) -> List[dict]:
    """Get user's watch history with series info"""
    history = await db.watch_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("watched_at", -1).limit(limit).to_list(limit)
    return history


async def get_user_preferences(user_id: str) -> dict:
    """Extract user preferences from watch history"""
    history = await get_user_watch_history(user_id, 200)
    
    if not history:
        return {"genres": {}, "watched_series": set(), "avg_rating": 4.0}
    
    watched_series_ids = list(set([h.get("series_id") for h in history if h.get("series_id")]))
    series_docs = await db.series.find(
        {"id": {"$in": watched_series_ids}},
        {"_id": 0, "id": 1, "genre": 1, "rating": 1}
    ).to_list(len(watched_series_ids))
    
    series_map = {s["id"]: s for s in series_docs}
    
    genre_counts = defaultdict(int)
    total_rating = 0
    rated_count = 0
    
    for h in history:
        series_id = h.get("series_id")
        if series_id and series_id in series_map:
            series = series_map[series_id]
            genre = series.get("genre", "").lower()
            if genre:
                # Weight by watch progress
                progress = h.get("progress", 0.5)
                genre_counts[genre] += 1 + progress
            
            if series.get("rating"):
                total_rating += series["rating"]
                rated_count += 1
    
    # Normalize genre preferences
    total_weight = sum(genre_counts.values()) or 1
    genre_prefs = {g: count / total_weight for g, count in genre_counts.items()}
    
    return {
        "genres": genre_prefs,
        "watched_series": set(watched_series_ids),
        "avg_rating": total_rating / rated_count if rated_count > 0 else 4.0
    }


async def collaborative_filter(user_id: str, limit: int = 20) -> List[str]:
    """
    Find series that similar users watched.
    Users are similar if they watched the same series.
    """
    # Get user's watched series
    user_history = await get_user_watch_history(user_id, 50)
    user_series = set([h.get("series_id") for h in user_history if h.get("series_id")])
    
    if not user_series:
        return []
    
    # Find users who watched the same series
    similar_users_history = await db.watch_history.find(
        {
            "series_id": {"$in": list(user_series)},
            "user_id": {"$ne": user_id}
        },
        {"_id": 0, "user_id": 1, "series_id": 1}
    ).to_list(5000)
    
    # Count how many series each user shares
    user_similarity = defaultdict(int)
    for h in similar_users_history:
        if h.get("series_id") in user_series:
            user_similarity[h["user_id"]] += 1
    
    # Get top similar users
    top_similar = sorted(user_similarity.items(), key=lambda x: x[1], reverse=True)[:20]
    similar_user_ids = [u[0] for u in top_similar]
    
    if not similar_user_ids:
        return []
    
    # Get series watched by similar users but not by target user
    similar_history = await db.watch_history.find(
        {
            "user_id": {"$in": similar_user_ids},
            "series_id": {"$nin": list(user_series)}
        },
        {"_id": 0, "series_id": 1}
    ).to_list(1000)
    
    # Count recommendations
    rec_counts = defaultdict(int)
    for h in similar_history:
        if h.get("series_id"):
            rec_counts[h["series_id"]] += 1
    
    # Sort by frequency
    sorted_recs = sorted(rec_counts.items(), key=lambda x: x[1], reverse=True)
    return [r[0] for r in sorted_recs[:limit]]


async def content_based_filter(user_id: str, limit: int = 20) -> List[str]:
    """
    Recommend series with similar genres/attributes to what user has watched.
    """
    preferences = await get_user_preferences(user_id)
    watched = preferences["watched_series"]
    genre_prefs = preferences["genres"]
    
    if not genre_prefs:
        return []
    
    # Get all series not watched by user
    all_series = await db.series.find(
        {"id": {"$nin": list(watched)}},
        {"_id": 0, "id": 1, "genre": 1, "rating": 1, "views": 1}
    ).to_list(500)
    
    # Score each series
    scored = []
    for series in all_series:
        genre = series.get("genre", "").lower()
        genre_score = genre_prefs.get(genre, 0)
        rating_score = (series.get("rating", 0) / 5.0)
        
        # Normalize views (log scale)
        views = series.get("views", 0)
        view_score = min(1.0, math.log10(views + 1) / 6) if views > 0 else 0
        
        # Combined score: 50% genre, 30% rating, 20% popularity
        total_score = (genre_score * 0.5) + (rating_score * 0.3) + (view_score * 0.2)
        
        scored.append((series["id"], total_score))
    
    # Sort by score and return top
    scored.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in scored[:limit]]


async def get_trending_series(limit: int = 10) -> List[str]:
    """Get trending series based on recent views"""
    # Get series with most watch history in last 7 days
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    pipeline = [
        {"$match": {"watched_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$series_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    results = await db.watch_history.aggregate(pipeline).to_list(limit)
    return [r["_id"] for r in results if r.get("_id")]


async def get_new_releases(limit: int = 10) -> List[str]:
    """Get newly added series"""
    series = await db.series.find(
        {},
        {"_id": 0, "id": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [s["id"] for s in series]


# ============ API ROUTES ============

@router.get("/for-you")
async def get_personalized_recommendations(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50)
):
    """
    Get personalized "For You" recommendations using hybrid approach.
    Combines collaborative filtering and content-based recommendations.
    """
    user_id = user["id"]
    
    # Get recommendations from both methods
    collab_recs = await collaborative_filter(user_id, limit=15)
    content_recs = await content_based_filter(user_id, limit=15)
    
    # Merge and deduplicate (prefer collaborative)
    seen = set()
    merged = []
    
    # Interleave results
    for i in range(max(len(collab_recs), len(content_recs))):
        if i < len(collab_recs) and collab_recs[i] not in seen:
            merged.append(collab_recs[i])
            seen.add(collab_recs[i])
        if i < len(content_recs) and content_recs[i] not in seen:
            merged.append(content_recs[i])
            seen.add(content_recs[i])
    
    merged = merged[:limit]
    
    # If not enough recommendations, add trending
    if len(merged) < limit:
        trending = await get_trending_series(limit - len(merged) + 5)
        for t in trending:
            if t not in seen:
                merged.append(t)
                seen.add(t)
                if len(merged) >= limit:
                    break
    
    # Fetch full series info
    if merged:
        series = await db.series.find(
            {"id": {"$in": merged}},
            {"_id": 0}
        ).to_list(limit)
        
        # Maintain order
        series_map = {s["id"]: s for s in series}
        ordered = [series_map[sid] for sid in merged if sid in series_map]
        
        return {
            "recommendations": ordered,
            "count": len(ordered),
            "method": "hybrid"
        }
    
    # Fallback to trending if no history
    trending_ids = await get_trending_series(limit)
    if trending_ids:
        series = await db.series.find(
            {"id": {"$in": trending_ids}},
            {"_id": 0}
        ).to_list(limit)
        
        return {
            "recommendations": series,
            "count": len(series),
            "method": "trending_fallback"
        }
    
    return {"recommendations": [], "count": 0, "method": "none"}


@router.get("/similar/{series_id}")
async def get_similar_series(
    series_id: str,
    limit: int = Query(10, ge=1, le=30)
):
    """Get series similar to a given series"""
    # Get target series
    target = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Series not found")
    
    target_genre = target.get("genre", "").lower()
    
    # Find series with same genre, excluding target
    similar = await db.series.find(
        {
            "id": {"$ne": series_id},
            "genre": {"$regex": target_genre, "$options": "i"}
        },
        {"_id": 0}
    ).sort("rating", -1).limit(limit * 2).to_list(limit * 2)
    
    # Also find series watched by users who watched target
    users_who_watched = await db.watch_history.find(
        {"series_id": series_id},
        {"user_id": 1}
    ).to_list(1000)
    
    user_ids = list(set([u["user_id"] for u in users_who_watched]))
    
    if user_ids:
        also_watched = await db.watch_history.find(
            {
                "user_id": {"$in": user_ids},
                "series_id": {"$ne": series_id}
            },
            {"series_id": 1}
        ).to_list(5000)
        
        watch_counts = defaultdict(int)
        for w in also_watched:
            watch_counts[w["series_id"]] += 1
        
        top_also = sorted(watch_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        also_series = await db.series.find(
            {"id": {"$in": [t[0] for t in top_also]}},
            {"_id": 0}
        ).to_list(limit)
        
        # Merge results
        seen_ids = set([s["id"] for s in similar])
        for s in also_series:
            if s["id"] not in seen_ids:
                similar.append(s)
                seen_ids.add(s["id"])
    
    return {
        "series": similar[:limit],
        "based_on": target["title"]
    }


@router.get("/because-you-watched/{series_id}")
async def because_you_watched(
    series_id: str,
    user: dict = Depends(get_current_user),
    limit: int = Query(8, ge=1, le=20)
):
    """Get recommendations based on a specific watched series"""
    series = await db.series.find_one({"id": series_id}, {"_id": 0, "title": 1, "genre": 1})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Get user's watched series to exclude
    history = await get_user_watch_history(user["id"], 100)
    watched_ids = set([h.get("series_id") for h in history])
    watched_ids.add(series_id)
    
    # Find similar by genre
    genre = series.get("genre", "")
    similar = await db.series.find(
        {
            "id": {"$nin": list(watched_ids)},
            "genre": {"$regex": genre, "$options": "i"}
        },
        {"_id": 0}
    ).sort("rating", -1).limit(limit).to_list(limit)
    
    return {
        "recommendations": similar,
        "because": series["title"],
        "genre": genre
    }


@router.get("/trending")
async def get_trending(limit: int = Query(10, ge=1, le=30)):
    """Get trending series based on recent watch activity"""
    trending_ids = await get_trending_series(limit)
    
    if trending_ids:
        series = await db.series.find(
            {"id": {"$in": trending_ids}},
            {"_id": 0}
        ).to_list(limit)
        
        # Maintain order
        series_map = {s["id"]: s for s in series}
        ordered = [series_map[sid] for sid in trending_ids if sid in series_map]
        
        return {"trending": ordered, "count": len(ordered)}
    
    # Fallback to highest rated
    series = await db.series.find(
        {},
        {"_id": 0}
    ).sort("rating", -1).limit(limit).to_list(limit)
    
    return {"trending": series, "count": len(series)}


@router.get("/genres/{genre}")
async def get_by_genre(
    genre: str,
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
    exclude_watched: bool = True
):
    """Get top series in a specific genre"""
    query = {"genre": {"$regex": genre, "$options": "i"}}
    
    if exclude_watched:
        history = await get_user_watch_history(user["id"], 200)
        watched_ids = [h.get("series_id") for h in history if h.get("series_id")]
        if watched_ids:
            query["id"] = {"$nin": watched_ids}
    
    series = await db.series.find(
        query,
        {"_id": 0}
    ).sort("rating", -1).limit(limit).to_list(limit)
    
    return {
        "series": series,
        "genre": genre,
        "count": len(series)
    }


@router.post("/feedback")
async def submit_recommendation_feedback(
    series_id: str,
    feedback: str,  # "liked", "disliked", "not_interested"
    user: dict = Depends(get_current_user)
):
    """Submit feedback on a recommendation to improve future suggestions"""
    feedback_doc = {
        "id": f"feedback-{uuid.uuid4().hex[:8]}",
        "user_id": user["id"],
        "series_id": series_id,
        "feedback": feedback,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.recommendation_feedback.insert_one(feedback_doc)
    
    # If not_interested, add to user's exclusion list
    if feedback == "not_interested":
        await db.users.update_one(
            {"id": user["id"]},
            {"$addToSet": {"recommendation_exclusions": series_id}}
        )
    
    return {"message": "Feedback recorded"}


# ============ ADVANCED AI RECOMMENDATIONS ============

@router.get("/ai/personalized")
async def get_ai_personalized_recommendations(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, le=50),
    context: Optional[str] = None  # "morning", "evening", "weekend", "commute"
):
    """
    Advanced AI-powered recommendations using multiple signals:
    - Watch history and completion rates
    - Time of day / day of week patterns
    - Social signals (what friends watch)
    - Trending content
    - Content freshness
    """
    user_id = user["id"]
    
    # Get user preferences
    prefs = await get_user_preferences(user_id)
    watched_series = prefs.get("watched_series", set())
    
    # Get user behavior patterns
    behavior = await analyze_user_behavior(user_id)
    
    # Score all available series
    all_series = await db.series.find(
        {"status": "published", "id": {"$nin": list(watched_series)}},
        {"_id": 0}
    ).to_list(500)
    
    scored_series = []
    for series in all_series:
        score = calculate_recommendation_score(series, prefs, behavior, context)
        scored_series.append({
            **series,
            "_score": score,
            "_reason": get_recommendation_reason(series, prefs, behavior)
        })
    
    # Sort by score and return top results
    scored_series.sort(key=lambda x: x["_score"], reverse=True)
    
    return {
        "recommendations": scored_series[:limit],
        "context": context,
        "signals_used": ["watch_history", "genre_preference", "time_pattern", "trending", "freshness"]
    }


async def analyze_user_behavior(user_id: str) -> dict:
    """Analyze user's viewing behavior patterns"""
    history = await db.watch_history.find(
        {"user_id": user_id},
        {"_id": 0, "watched_at": 1, "progress": 1, "duration_watched": 1, "series_id": 1}
    ).sort("watched_at", -1).limit(100).to_list(100)
    
    if not history:
        return {
            "avg_completion_rate": 0.5,
            "binge_score": 0.5,
            "preferred_times": [],
            "preferred_days": [],
            "watch_frequency": "occasional"
        }
    
    # Calculate completion rate
    completion_rates = [h.get("progress", 0.5) for h in history]
    avg_completion = sum(completion_rates) / len(completion_rates) if completion_rates else 0.5
    
    # Analyze time patterns
    time_counts = defaultdict(int)
    day_counts = defaultdict(int)
    
    for h in history:
        watched_at = h.get("watched_at", "")
        if watched_at:
            try:
                dt = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
                hour = dt.hour
                if 6 <= hour < 12:
                    time_counts["morning"] += 1
                elif 12 <= hour < 17:
                    time_counts["afternoon"] += 1
                elif 17 <= hour < 21:
                    time_counts["evening"] += 1
                else:
                    time_counts["night"] += 1
                
                day_counts[dt.strftime("%A").lower()] += 1
            except Exception:
                pass
    
    # Calculate binge score (multiple episodes in same day)
    episodes_per_day = defaultdict(int)
    for h in history:
        watched_at = h.get("watched_at", "")
        if watched_at:
            try:
                dt = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
                day_key = dt.strftime("%Y-%m-%d")
                episodes_per_day[day_key] += 1
            except Exception:
                pass
    
    avg_eps_per_day = sum(episodes_per_day.values()) / len(episodes_per_day) if episodes_per_day else 1
    binge_score = min(1.0, avg_eps_per_day / 5)  # 5+ eps/day = max binge score
    
    # Determine watch frequency
    if len(history) < 10:
        frequency = "new"
    elif len(history) < 30:
        frequency = "occasional"
    elif len(history) < 100:
        frequency = "regular"
    else:
        frequency = "power"
    
    return {
        "avg_completion_rate": avg_completion,
        "binge_score": binge_score,
        "preferred_times": sorted(time_counts.keys(), key=lambda x: time_counts[x], reverse=True)[:2],
        "preferred_days": sorted(day_counts.keys(), key=lambda x: day_counts[x], reverse=True)[:3],
        "watch_frequency": frequency
    }


def calculate_recommendation_score(series: dict, prefs: dict, behavior: dict, context: str = None) -> float:
    """Calculate a recommendation score for a series based on multiple factors"""
    score = 0.0
    
    # Genre match (0-30 points)
    genre = series.get("genre", "").lower()
    genre_prefs = prefs.get("genres", {})
    if genre in genre_prefs:
        score += genre_prefs[genre] * 30
    
    # Rating (0-20 points)
    rating = series.get("rating", 3.0)
    score += (rating / 5) * 20
    
    # Popularity / Views (0-15 points)
    views = series.get("total_views", 0)
    if views > 100000:
        score += 15
    elif views > 10000:
        score += 10
    elif views > 1000:
        score += 5
    
    # Freshness / Recency (0-15 points)
    created_at = series.get("created_at", "")
    if created_at:
        try:
            created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            days_old = (datetime.now(timezone.utc) - created).days
            if days_old < 7:
                score += 15
            elif days_old < 30:
                score += 10
            elif days_old < 90:
                score += 5
        except Exception:
            pass
    
    # Episode count for binge watchers (0-10 points)
    if behavior.get("binge_score", 0) > 0.5:
        episode_count = series.get("episode_count", 0)
        if episode_count >= 10:
            score += 10
        elif episode_count >= 5:
            score += 5
    
    # Context-based adjustments (0-10 points)
    if context:
        content_mood = series.get("mood", "").lower()
        if context == "morning" and content_mood in ["uplifting", "comedy", "light"]:
            score += 10
        elif context == "evening" and content_mood in ["drama", "thriller", "romance"]:
            score += 10
        elif context == "weekend" and content_mood in ["binge", "series", "adventure"]:
            score += 10
    
    # Add some randomness to avoid filter bubbles (0-5 points)
    score += random.uniform(0, 5)
    
    return score


def get_recommendation_reason(series: dict, prefs: dict, behavior: dict) -> str:
    """Generate a human-readable reason for the recommendation"""
    reasons = []
    
    genre = series.get("genre", "").lower()
    genre_prefs = prefs.get("genres", {})
    
    if genre in genre_prefs and genre_prefs[genre] > 0.2:
        reasons.append(f"Because you enjoy {genre.title()}")
    
    rating = series.get("rating", 0)
    if rating >= 4.5:
        reasons.append("Highly rated by viewers")
    
    views = series.get("total_views", 0)
    if views > 50000:
        reasons.append("Trending this week")
    
    created_at = series.get("created_at", "")
    if created_at:
        try:
            created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            days_old = (datetime.now(timezone.utc) - created).days
            if days_old < 14:
                reasons.append("New release")
        except Exception:
            pass
    
    episode_count = series.get("episode_count", 0)
    if episode_count >= 10 and behavior.get("binge_score", 0) > 0.5:
        reasons.append("Great for binge-watching")
    
    if not reasons:
        reasons.append("Recommended for you")
    
    return reasons[0]


@router.get("/ai/because-you-watched/{series_id}")
async def get_because_you_watched(
    series_id: str,
    user: dict = Depends(get_current_user),
    limit: int = Query(10, le=20)
):
    """Get recommendations based on a specific watched series"""
    source_series = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not source_series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Find similar series by genre, tags, and creator
    query = {
        "status": "published",
        "id": {"$ne": series_id},
        "$or": [
            {"genre": source_series.get("genre")},
            {"creator_id": source_series.get("creator_id")},
            {"tags": {"$in": source_series.get("tags", [])}}
        ]
    }
    
    # Exclude already watched
    history = await get_user_watch_history(user["id"], 200)
    watched_ids = [h.get("series_id") for h in history if h.get("series_id")]
    if watched_ids:
        query["id"] = {"$nin": watched_ids + [series_id]}
    
    similar_series = await db.series.find(query, {"_id": 0}).limit(limit * 2).to_list(limit * 2)
    
    # Score by similarity
    for s in similar_series:
        similarity = 0
        if s.get("genre") == source_series.get("genre"):
            similarity += 3
        if s.get("creator_id") == source_series.get("creator_id"):
            similarity += 2
        shared_tags = set(s.get("tags", [])) & set(source_series.get("tags", []))
        similarity += len(shared_tags)
        s["_similarity"] = similarity
    
    similar_series.sort(key=lambda x: x.get("_similarity", 0), reverse=True)
    
    return {
        "source_series": {
            "id": source_series["id"],
            "title": source_series.get("title"),
            "thumbnail_url": source_series.get("thumbnail_url")
        },
        "recommendations": similar_series[:limit],
        "reason": f"Because you watched {source_series.get('title')}"
    }


@router.get("/ai/mood/{mood}")
async def get_mood_based_recommendations(
    mood: str,  # "happy", "sad", "excited", "relaxed", "romantic", "thrilling"
    user: dict = Depends(get_current_user),
    limit: int = Query(15, le=30)
):
    """Get recommendations based on current mood"""
    # Map moods to genres and content types
    mood_mapping = {
        "happy": {"genres": ["comedy", "feel-good", "musical"], "rating_min": 4.0},
        "sad": {"genres": ["drama", "tearjerker", "emotional"], "rating_min": 4.2},
        "excited": {"genres": ["action", "thriller", "adventure"], "rating_min": 3.8},
        "relaxed": {"genres": ["slice-of-life", "documentary", "romance"], "rating_min": 3.5},
        "romantic": {"genres": ["romance", "drama", "feel-good"], "rating_min": 4.0},
        "thrilling": {"genres": ["thriller", "horror", "mystery", "crime"], "rating_min": 4.0}
    }
    
    mood_config = mood_mapping.get(mood.lower(), mood_mapping["relaxed"])
    
    # Get user's watched series to exclude
    history = await get_user_watch_history(user["id"], 200)
    watched_ids = [h.get("series_id") for h in history if h.get("series_id")]
    
    query = {
        "status": "published",
        "genre": {"$in": mood_config["genres"]},
        "rating": {"$gte": mood_config["rating_min"]}
    }
    
    if watched_ids:
        query["id"] = {"$nin": watched_ids}
    
    series = await db.series.find(query, {"_id": 0}).sort("rating", -1).limit(limit).to_list(limit)
    
    return {
        "mood": mood,
        "recommendations": series,
        "description": f"Perfect for when you're feeling {mood}"
    }


@router.get("/ai/quick-picks")
async def get_quick_picks(
    user: dict = Depends(get_current_user),
    duration: str = Query("short", enum=["short", "medium", "long"])
):
    """Get recommendations based on available time"""
    # Duration mapping (estimated watch time in minutes)
    duration_config = {
        "short": {"max_episodes": 3, "max_duration": 30, "label": "Under 30 minutes"},
        "medium": {"max_episodes": 6, "max_duration": 90, "label": "1-2 hours"},
        "long": {"min_episodes": 7, "label": "Full binge session"}
    }
    
    config = duration_config.get(duration, duration_config["short"])
    
    query = {"status": "published"}
    
    if duration == "short":
        query["episode_count"] = {"$lte": config["max_episodes"]}
    elif duration == "medium":
        query["episode_count"] = {"$lte": config["max_episodes"]}
    else:
        query["episode_count"] = {"$gte": config.get("min_episodes", 7)}
    
    # Exclude watched
    history = await get_user_watch_history(user["id"], 200)
    watched_ids = [h.get("series_id") for h in history if h.get("series_id")]
    if watched_ids:
        query["id"] = {"$nin": watched_ids}
    
    series = await db.series.find(query, {"_id": 0}).sort("rating", -1).limit(15).to_list(15)
    
    return {
        "duration": duration,
        "label": config["label"],
        "recommendations": series
    }

