"""
Shorts Creation API - Create social media shorts from episodes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from services import db, get_current_user

router = APIRouter(prefix="/shorts", tags=["shorts"])

class CreateShortRequest(BaseModel):
    episode_id: str
    series_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., gt=0)
    format: str = Field(default="tiktok")
    aspect_ratio: str = Field(default="9:16")

class ShortResponse(BaseModel):
    id: str
    title: str
    episode_id: str
    series_id: Optional[str]
    start_time: float
    end_time: float
    duration: float
    format: str
    aspect_ratio: str
    status: str
    short_url: Optional[str] = None
    download_url: Optional[str] = None
    created_at: str

@router.post("/create")
async def create_short(
    request: CreateShortRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a short clip from an episode for social media sharing"""
    
    # Validate episode exists and user has access
    episode = await db.episodes.find_one({"id": request.episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Check user owns the series/episode
    series = await db.series.find_one({"id": episode.get("series_id")})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    if series.get("creator_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You don't have permission to create shorts from this episode")
    
    # Validate time range
    duration = request.end_time - request.start_time
    if duration < 3:
        raise HTTPException(status_code=400, detail="Short must be at least 3 seconds")
    if duration > 120:
        raise HTTPException(status_code=400, detail="Short cannot exceed 120 seconds")
    
    # Format-specific duration limits
    format_limits = {
        "tiktok": 60,
        "instagram": 90,
        "youtube": 60,
        "square": 60,
        "landscape": 120
    }
    max_duration = format_limits.get(request.format, 60)
    if duration > max_duration:
        raise HTTPException(status_code=400, detail=f"Maximum duration for {request.format} is {max_duration}s")
    
    # Create short record
    short_id = f"short-{ObjectId()}"
    short_data = {
        "id": short_id,
        "creator_id": current_user["id"],
        "episode_id": request.episode_id,
        "series_id": request.series_id or episode.get("series_id"),
        "title": request.title,
        "start_time": request.start_time,
        "end_time": request.end_time,
        "duration": duration,
        "format": request.format,
        "aspect_ratio": request.aspect_ratio,
        "status": "ready",  # In production, this would be "processing" and handled by a video processing queue
        "source_video_url": episode.get("hls_url") or episode.get("video_url"),
        "short_url": None,
        "download_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "views": 0,
        "shares": 0
    }
    
    # In a real implementation, we would:
    # 1. Send the job to a video processing queue (e.g., FFmpeg, cloud video service)
    # 2. The queue would clip the video, resize to aspect ratio, and upload
    # 3. Update the short record with the final URL
    
    # For now, we simulate the processing being complete
    # In production, the frontend would poll for status
    short_data["short_url"] = f"/api/shorts/{short_id}/preview"
    short_data["download_url"] = f"/api/shorts/{short_id}/download"
    
    db.shorts.insert_one(short_data)
    
    return ShortResponse(
        id=short_id,
        title=short_data["title"],
        episode_id=short_data["episode_id"],
        series_id=short_data["series_id"],
        start_time=short_data["start_time"],
        end_time=short_data["end_time"],
        duration=short_data["duration"],
        format=short_data["format"],
        aspect_ratio=short_data["aspect_ratio"],
        status=short_data["status"],
        short_url=short_data["short_url"],
        download_url=short_data["download_url"],
        created_at=short_data["created_at"]
    )

@router.get("/my")
async def get_my_shorts(
    current_user: dict = Depends(get_current_user)
):
    """Get all shorts created by the current user"""
    
    shorts = list(db.shorts.find(
        {"creator_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1))
    
    return {
        "shorts": shorts,
        "total": len(shorts)
    }

@router.get("/{short_id}")
async def get_short(
    short_id: str
):
    """Get a specific short by ID"""
    
    short = db.shorts.find_one({"id": short_id}, {"_id": 0})
    if not short:
        raise HTTPException(status_code=404, detail="Short not found")
    
    return short

@router.delete("/{short_id}")
async def delete_short(
    short_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a short"""
    
    short = db.shorts.find_one({"id": short_id})
    if not short:
        raise HTTPException(status_code=404, detail="Short not found")
    
    if short.get("creator_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this short")
    
    db.shorts.delete_one({"id": short_id})
    
    return {"message": "Short deleted successfully"}

@router.post("/{short_id}/share")
async def track_share(
    short_id: str,
    platform: str = "unknown"
):
    """Track when a short is shared"""
    
    result = db.shorts.update_one(
        {"id": short_id},
        {"$inc": {"shares": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Short not found")
    
    return {"message": "Share tracked", "platform": platform}
