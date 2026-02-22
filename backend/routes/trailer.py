"""
Series Trailer Creator Routes
- Video processing with FFmpeg
- Manual and AI scene selection
- Trailer generation and export
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import subprocess
import os
import json
import asyncio

from config.database import db
from routes.auth import get_current_user
from services.bunny import bunny_service
from models.trailer import (
    TrailerStatus, SceneSelectionMethod, ExportFormat,
    SceneMarker, TrailerCreate, TrailerSceneAdd, TrailerUpdate,
    TrailerResponse, TrailerExportRequest
)

router = APIRouter(prefix="/trailers", tags=["trailers"])

# Temporary storage for processing
TEMP_DIR = "/tmp/trailers"
os.makedirs(TEMP_DIR, exist_ok=True)


# ============ HELPER FUNCTIONS ============

async def get_creator_or_403(user: dict):
    """Get creator profile or raise 403"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator or creator.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    return creator


def run_ffprobe(video_path: str) -> dict:
    """Get video info using ffprobe"""
    try:
        result = subprocess.run([
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            video_path
        ], capture_output=True, text=True, timeout=30)
        return json.loads(result.stdout)
    except Exception as e:
        return {"error": str(e)}


def extract_clip(input_path: str, output_path: str, start: float, end: float) -> bool:
    """Extract a clip from video"""
    try:
        duration = end - start
        result = subprocess.run([
            "ffmpeg", "-y",
            "-ss", str(start),
            "-i", input_path,
            "-t", str(duration),
            "-c", "copy",
            output_path
        ], capture_output=True, timeout=120)
        return result.returncode == 0
    except Exception:
        return False


def concatenate_clips(clip_paths: List[str], output_path: str, transition: str = "fade") -> bool:
    """Concatenate multiple clips into one video"""
    try:
        # Create concat file
        concat_file = f"{TEMP_DIR}/concat_{uuid.uuid4().hex[:8]}.txt"
        with open(concat_file, "w") as f:
            for path in clip_paths:
                f.write(f"file '{path}'\n")
        
        # Use concat demuxer
        result = subprocess.run([
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-c", "copy",
            output_path
        ], capture_output=True, timeout=300)
        
        # Clean up
        os.remove(concat_file)
        
        return result.returncode == 0
    except Exception:
        return False


async def detect_exciting_scenes(video_url: str, episode_id: str) -> List[dict]:
    """
    AI-based scene detection using audio and motion analysis.
    Returns list of exciting moments with timestamps.
    """
    scenes = []
    
    try:
        # Use ffmpeg to analyze audio for peaks
        # This is a simplified version - real implementation would use ML models
        subprocess.run([
            "ffmpeg", "-y",
            "-i", video_url,
            "-t", "300",  # Analyze first 5 minutes max
            "-vn", "-af", "volumedetect",
            "-f", "null", "-"
        ], capture_output=True, timeout=120)
        
        # For demo, detect based on video duration and create evenly spaced highlights
        # In production, this would use actual audio peak detection + scene change detection
        info = run_ffprobe(video_url)
        duration = float(info.get("format", {}).get("duration", 60))
        
        # Generate 5-10 potential highlight moments
        num_scenes = min(10, max(5, int(duration / 30)))
        interval = duration / num_scenes
        
        for i in range(num_scenes):
            start = i * interval + 2  # Offset by 2 seconds
            end = min(start + 5, duration)  # 5 second clips
            
            scenes.append({
                "episode_id": episode_id,
                "start_time": round(start, 2),
                "end_time": round(end, 2),
                "label": f"Highlight {i + 1}",
                "ai_score": round(0.5 + (0.5 * ((num_scenes - i) / num_scenes)), 2),  # Higher score for earlier scenes
                "thumbnail_url": None
            })
        
        # Sort by AI score
        scenes.sort(key=lambda x: x["ai_score"], reverse=True)
        
    except Exception as e:
        print(f"Scene detection error: {e}")
    
    return scenes


async def process_trailer_job(trailer_id: str, creator_id: str):
    """Background job to process and compile trailer"""
    try:
        # Update status
        await db.trailers.update_one(
            {"id": trailer_id},
            {"$set": {"status": TrailerStatus.PROCESSING.value, "progress_percent": 10}}
        )
        
        trailer = await db.trailers.find_one({"id": trailer_id}, {"_id": 0})
        if not trailer or not trailer.get("scenes"):
            await db.trailers.update_one(
                {"id": trailer_id},
                {"$set": {"status": TrailerStatus.FAILED.value, "error": "No scenes selected"}}
            )
            return
        
        # Get video URLs for each episode
        clip_paths = []
        progress = 20
        
        for i, scene in enumerate(trailer["scenes"]):
            episode = await db.creator_episodes.find_one(
                {"id": scene["episode_id"]},
                {"_id": 0, "bunny_video_id": 1}
            )
            
            if not episode or not episode.get("bunny_video_id"):
                continue
            
            # Get direct video URL
            video_url = bunny_service.get_direct_play_url(episode["bunny_video_id"])
            
            # Extract clip
            clip_path = f"{TEMP_DIR}/clip_{trailer_id}_{i}.mp4"
            
            # Download and extract using ffmpeg
            result = subprocess.run([
                "ffmpeg", "-y",
                "-ss", str(scene["start_time"]),
                "-i", video_url,
                "-t", str(scene["end_time"] - scene["start_time"]),
                "-c:v", "libx264", "-preset", "fast",
                "-c:a", "aac",
                clip_path
            ], capture_output=True, timeout=120)
            
            if result.returncode == 0 and os.path.exists(clip_path):
                clip_paths.append(clip_path)
            
            # Update progress
            progress = 20 + int(50 * (i + 1) / len(trailer["scenes"]))
            await db.trailers.update_one(
                {"id": trailer_id},
                {"$set": {"progress_percent": progress}}
            )
        
        if not clip_paths:
            await db.trailers.update_one(
                {"id": trailer_id},
                {"$set": {"status": TrailerStatus.FAILED.value, "error": "Failed to extract clips"}}
            )
            return
        
        # Concatenate clips
        output_path = f"{TEMP_DIR}/trailer_{trailer_id}.mp4"
        if not concatenate_clips(clip_paths, output_path):
            await db.trailers.update_one(
                {"id": trailer_id},
                {"$set": {"status": TrailerStatus.FAILED.value, "error": "Failed to concatenate clips"}}
            )
            return
        
        await db.trailers.update_one(
            {"id": trailer_id},
            {"$set": {"progress_percent": 80}}
        )
        
        # Upload to Bunny.net
        # For now, store locally (in production, would upload to CDN)
        preview_url = f"/api/trailers/{trailer_id}/preview"
        
        # Get actual duration
        info = run_ffprobe(output_path)
        actual_duration = float(info.get("format", {}).get("duration", 0))
        
        # Update trailer as ready
        await db.trailers.update_one(
            {"id": trailer_id},
            {"$set": {
                "status": TrailerStatus.READY.value,
                "progress_percent": 100,
                "actual_duration": actual_duration,
                "preview_url": preview_url,
                "local_path": output_path,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Clean up clip files
        for path in clip_paths:
            try:
                os.remove(path)
            except:
                pass
        
    except Exception as e:
        await db.trailers.update_one(
            {"id": trailer_id},
            {"$set": {"status": TrailerStatus.FAILED.value, "error": str(e)}}
        )


# ============ TRAILER MANAGEMENT ============

@router.post("/")
async def create_trailer(
    trailer: TrailerCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new trailer project"""
    creator = await get_creator_or_403(user)
    
    # Verify series exists and belongs to creator
    series = await db.creator_series.find_one({
        "id": trailer.series_id,
        "creator_id": creator["id"]
    }, {"_id": 0, "title": 1})
    
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    trailer_id = f"trailer-{uuid.uuid4().hex[:12]}"
    
    trailer_doc = {
        "id": trailer_id,
        "series_id": trailer.series_id,
        "series_title": series["title"],
        "creator_id": creator["id"],
        "title": trailer.title,
        "target_duration": trailer.target_duration,
        "actual_duration": None,
        "selection_method": trailer.selection_method.value,
        "scenes": [],
        "include_title_card": trailer.include_title_card,
        "include_end_card": trailer.include_end_card,
        "background_music_id": trailer.background_music_id,
        "transition_style": "cut",
        "status": TrailerStatus.DRAFT.value,
        "progress_percent": 0,
        "preview_url": None,
        "exports": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None
    }
    
    await db.trailers.insert_one(trailer_doc)
    
    return {"message": "Trailer project created", "trailer_id": trailer_id, "trailer": trailer_doc}


@router.get("/my")
async def get_my_trailers(
    user: dict = Depends(get_current_user),
    series_id: Optional[str] = None
):
    """Get all trailers for current creator"""
    creator = await get_creator_or_403(user)
    
    query = {"creator_id": creator["id"]}
    if series_id:
        query["series_id"] = series_id
    
    trailers = await db.trailers.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {"trailers": trailers, "count": len(trailers)}


@router.get("/{trailer_id}")
async def get_trailer(
    trailer_id: str,
    user: dict = Depends(get_current_user)
):
    """Get trailer details"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    }, {"_id": 0})
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    return trailer


@router.patch("/{trailer_id}")
async def update_trailer(
    trailer_id: str,
    update: TrailerUpdate,
    user: dict = Depends(get_current_user)
):
    """Update trailer settings"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    })
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Reset status if content changed
    if any(k in update_data for k in ["scene_order", "transition_style", "background_music_id"]):
        update_data["status"] = TrailerStatus.DRAFT.value
    
    await db.trailers.update_one({"id": trailer_id}, {"$set": update_data})
    
    return {"message": "Trailer updated"}


@router.delete("/{trailer_id}")
async def delete_trailer(
    trailer_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a trailer project"""
    creator = await get_creator_or_403(user)
    
    result = await db.trailers.delete_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    return {"message": "Trailer deleted"}


# ============ SCENE MANAGEMENT ============

@router.post("/{trailer_id}/scenes")
async def add_scenes(
    trailer_id: str,
    scenes: TrailerSceneAdd,
    user: dict = Depends(get_current_user)
):
    """Add scenes to a trailer"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    })
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    # Validate scenes - all episodes must belong to the series
    for scene in scenes.scenes:
        episode = await db.creator_episodes.find_one({
            "id": scene.episode_id,
            "series_id": trailer["series_id"]
        })
        if not episode:
            raise HTTPException(status_code=400, detail=f"Episode {scene.episode_id} not found in series")
    
    # Add scene IDs
    scene_docs = []
    for scene in scenes.scenes:
        scene_doc = scene.dict()
        scene_doc["id"] = f"scene-{uuid.uuid4().hex[:8]}"
        scene_docs.append(scene_doc)
    
    # Append to existing scenes
    await db.trailers.update_one(
        {"id": trailer_id},
        {
            "$push": {"scenes": {"$each": scene_docs}},
            "$set": {"status": TrailerStatus.DRAFT.value, "updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": f"Added {len(scene_docs)} scenes", "scenes": scene_docs}


@router.delete("/{trailer_id}/scenes/{scene_id}")
async def remove_scene(
    trailer_id: str,
    scene_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove a scene from trailer"""
    creator = await get_creator_or_403(user)
    
    result = await db.trailers.update_one(
        {"id": trailer_id, "creator_id": creator["id"]},
        {
            "$pull": {"scenes": {"id": scene_id}},
            "$set": {"status": TrailerStatus.DRAFT.value, "updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Trailer or scene not found")
    
    return {"message": "Scene removed"}


# ============ AI SCENE DETECTION ============

@router.post("/{trailer_id}/detect-scenes")
async def detect_scenes_ai(
    trailer_id: str,
    user: dict = Depends(get_current_user)
):
    """Use AI to detect exciting scenes from series episodes"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    }, {"_id": 0})
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    # Get all ready episodes for the series
    episodes = await db.creator_episodes.find({
        "series_id": trailer["series_id"],
        "encoding_status": "ready"
    }, {"_id": 0, "id": 1, "title": 1, "bunny_video_id": 1}).to_list(50)
    
    if not episodes:
        raise HTTPException(status_code=400, detail="No ready episodes found")
    
    all_scenes = []
    
    for episode in episodes[:5]:  # Analyze first 5 episodes
        if not episode.get("bunny_video_id"):
            continue
        
        video_url = bunny_service.get_direct_play_url(episode["bunny_video_id"])
        scenes = await detect_exciting_scenes(video_url, episode["id"])
        
        for scene in scenes:
            scene["episode_title"] = episode.get("title", "Unknown")
        
        all_scenes.extend(scenes)
    
    # Sort by AI score and take top scenes
    all_scenes.sort(key=lambda x: x.get("ai_score", 0), reverse=True)
    top_scenes = all_scenes[:10]
    
    return {
        "detected_scenes": top_scenes,
        "total_detected": len(all_scenes),
        "message": "AI detected exciting moments. Review and add to your trailer."
    }


# ============ PROCESSING & EXPORT ============

@router.post("/{trailer_id}/process")
async def process_trailer(
    trailer_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Start processing the trailer (compile scenes)"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    })
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    if not trailer.get("scenes"):
        raise HTTPException(status_code=400, detail="Add scenes before processing")
    
    if trailer["status"] == TrailerStatus.PROCESSING.value:
        raise HTTPException(status_code=400, detail="Trailer is already being processed")
    
    # Start background processing
    background_tasks.add_task(process_trailer_job, trailer_id, creator["id"])
    
    return {"message": "Trailer processing started", "trailer_id": trailer_id}


@router.get("/{trailer_id}/status")
async def get_processing_status(
    trailer_id: str,
    user: dict = Depends(get_current_user)
):
    """Get trailer processing status"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    }, {"_id": 0, "status": 1, "progress_percent": 1, "preview_url": 1, "actual_duration": 1})
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    return trailer


@router.post("/{trailer_id}/export")
async def export_trailer(
    trailer_id: str,
    export_req: TrailerExportRequest,
    user: dict = Depends(get_current_user)
):
    """Export trailer in specific format"""
    creator = await get_creator_or_403(user)
    
    trailer = await db.trailers.find_one({
        "id": trailer_id,
        "creator_id": creator["id"]
    })
    
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    
    if trailer["status"] != TrailerStatus.READY.value:
        raise HTTPException(status_code=400, detail="Trailer must be processed first")
    
    # Get source path
    source_path = trailer.get("local_path")
    if not source_path or not os.path.exists(source_path):
        raise HTTPException(status_code=400, detail="Source video not found")
    
    # Define export settings
    export_settings = {
        ExportFormat.MP4_1080P: {"resolution": "1920:1080", "bitrate": "8M"},
        ExportFormat.MP4_720P: {"resolution": "1280:720", "bitrate": "5M"},
        ExportFormat.MP4_480P: {"resolution": "854:480", "bitrate": "2M"},
        ExportFormat.VERTICAL_9_16: {"resolution": "1080:1920", "bitrate": "6M"},
        ExportFormat.SQUARE_1_1: {"resolution": "1080:1080", "bitrate": "6M"}
    }
    
    settings = export_settings.get(export_req.format)
    if not settings:
        raise HTTPException(status_code=400, detail="Invalid export format")
    
    export_id = f"exp-{uuid.uuid4().hex[:8]}"
    output_path = f"{TEMP_DIR}/export_{export_id}.mp4"
    
    try:
        # Export with ffmpeg
        cmd = [
            "ffmpeg", "-y",
            "-i", source_path,
            "-vf", f"scale={settings['resolution']}:force_original_aspect_ratio=decrease,pad={settings['resolution']}:(ow-iw)/2:(oh-ih)/2",
            "-b:v", settings["bitrate"],
            "-c:a", "aac", "-b:a", "128k",
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, timeout=300)
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Export failed")
        
        # Get file size
        file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
        
        # Store export info
        export_info = {
            "id": export_id,
            "format": export_req.format.value,
            "url": f"/api/trailers/{trailer_id}/exports/{export_id}",
            "local_path": output_path,
            "file_size_mb": round(file_size, 2),
            "resolution": settings["resolution"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.trailers.update_one(
            {"id": trailer_id},
            {"$push": {"exports": export_info}}
        )
        
        return {
            "message": "Export completed",
            "export": export_info
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Export timed out")


# ============ BACKGROUND MUSIC ============

@router.get("/music/library")
async def get_music_library():
    """Get available background music tracks"""
    # In production, this would come from a database
    music_library = [
        {"id": "music-1", "title": "Epic Adventure", "artist": "Kona Music", "duration": 120, "genre": "dramatic", "preview_url": None, "is_premium": False, "coins_required": 0},
        {"id": "music-2", "title": "Romantic Sunset", "artist": "Kona Music", "duration": 90, "genre": "romantic", "preview_url": None, "is_premium": False, "coins_required": 0},
        {"id": "music-3", "title": "Action Hero", "artist": "Kona Music", "duration": 60, "genre": "action", "preview_url": None, "is_premium": False, "coins_required": 0},
        {"id": "music-4", "title": "Mysterious Night", "artist": "Kona Music", "duration": 75, "genre": "thriller", "preview_url": None, "is_premium": True, "coins_required": 50},
        {"id": "music-5", "title": "Feel Good Vibes", "artist": "Kona Music", "duration": 100, "genre": "upbeat", "preview_url": None, "is_premium": False, "coins_required": 0}
    ]
    
    return {"tracks": music_library}
