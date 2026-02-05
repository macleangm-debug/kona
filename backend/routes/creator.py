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
        "name": creator["name"],
        "tier": creator["tier"],
        "revenue_share": creator["revenue_share"],
        "total_series": series_count,
        "total_episodes": episodes_count,
        "total_views": creator["total_views"],
        "total_earnings": creator["total_earnings"],
        "pending_payout": creator["pending_payout"],
        "this_month_views": month_views,
        "this_month_earnings": month_earnings,
        "milestones": MILESTONE_BONUSES,
        "milestones_claimed": creator.get("milestones_claimed", [])
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
@router.post("/episodes")
async def create_episode(data: CreatorEpisodeCreate, user: dict = Depends(get_current_user)):
    """Create a new episode with season support (S01E03 format)"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    # Verify series ownership and approval status
    series = await db.creator_series.find_one({"id": data.series_id, "creator_id": creator["id"]})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    if series["status"] not in ["approved", "published"]:
        raise HTTPException(status_code=400, detail="Series must be approved before adding episodes")
    
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
    file: UploadFile = File(...),
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
    
    if not episode.get("bunny_video_id"):
        raise HTTPException(status_code=400, detail="Video not initialized")
    
    # Read file content
    content = await file.read()
    
    # Upload to Bunny.net
    result = await bunny_service.upload_video(episode["bunny_video_id"], content)
    
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
async def update_episode(episode_id: str, user: dict = Depends(get_current_user), title: str = None, description: str = None, is_free: bool = None, coins_required: int = None, intro_duration: int = None):
    """Update episode settings including intro duration for Skip Intro feature"""
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
async def get_payout_history(user: dict = Depends(get_current_user)):
    """Get payout history"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    payouts = await db.payouts.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return payouts


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

