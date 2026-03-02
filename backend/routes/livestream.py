"""
Live Streaming Routes
Handles live stream sessions, chat, and VOD recording

NOTE: Bunny.net Stream is primarily for VOD (Video on Demand), not live RTMP streaming.
For production live streaming, consider:
- Mux Live (https://mux.com/live) - Simple API, great for startups
- AWS IVS (Interactive Video Service) - Scalable, pay-per-use
- Cloudflare Stream Live - Good for global distribution
- Wowza Streaming Cloud - Enterprise-grade

The current implementation uses placeholder RTMP URLs. To enable real live streaming:
1. Choose a live streaming provider
2. Update the RTMP_URL and playback URL generation in create_live_stream and go_live functions
3. Integrate webhook callbacks for stream status updates
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
import asyncio
import json
import os

from services import db
from services.auth import get_current_user

router = APIRouter(prefix="/livestream", tags=["LiveStream"])

# Live streaming configuration - update these for production
LIVE_RTMP_URL = os.environ.get("LIVE_RTMP_URL", "rtmp://live.kona.stream/app")
LIVE_PLAYBACK_BASE = os.environ.get("LIVE_PLAYBACK_BASE", "https://live.kona.stream/hls")

# ============ MODELS ============

class CreateLiveStream(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    scheduled_at: Optional[str] = None  # ISO datetime for scheduled streams
    is_subscriber_only: bool = False
    allow_tips: bool = True
    series_id: Optional[str] = None  # Associate with a series

class UpdateLiveStream(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_subscriber_only: Optional[bool] = None
    allow_tips: Optional[bool] = None

class ChatMessage(BaseModel):
    message: str
    reply_to: Optional[str] = None  # Message ID to reply to

# ============ STREAM MANAGEMENT ============

# In-memory store for active streams and chat connections
active_streams = {}  # stream_id -> stream_info
chat_connections = {}  # stream_id -> [websocket connections]
viewer_counts = {}  # stream_id -> count

@router.post("/create")
async def create_live_stream(data: CreateLiveStream, user: dict = Depends(get_current_user)):
    """Create a new live stream session"""
    # Check if user is a creator
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Only creators can start live streams")
    
    stream_id = f"live-{uuid.uuid4().hex[:12]}"
    
    # Generate RTMP credentials (in production, integrate with streaming service)
    stream_key = f"sk_{uuid.uuid4().hex}"
    
    stream = {
        "id": stream_id,
        "creator_id": creator["id"],
        "user_id": user["id"],
        "title": data.title,
        "description": data.description,
        "thumbnail_url": data.thumbnail_url or creator.get("avatar_url"),
        "status": "scheduled" if data.scheduled_at else "idle",  # idle, scheduled, live, ended
        "scheduled_at": data.scheduled_at,
        "started_at": None,
        "ended_at": None,
        "stream_key": stream_key,
        "rtmp_url": "rtmp://live.kona.stream/app",  # Placeholder - configure with real service
        "playback_url": None,  # HLS URL once live
        "is_subscriber_only": data.is_subscriber_only,
        "allow_tips": data.allow_tips,
        "series_id": data.series_id,
        "viewer_count": 0,
        "peak_viewers": 0,
        "total_tips": 0,
        "total_tips_count": 0,
        "chat_enabled": True,
        "recording_enabled": True,
        "vod_episode_id": None,  # Created after stream ends
        "created_at": datetime.now(timezone.utc).isoformat(),
        "creator_name": creator.get("display_name", user.get("username")),
        "creator_avatar": creator.get("avatar_url")
    }
    
    await db.live_streams.insert_one(stream)
    stream.pop("_id", None)
    
    return {
        "message": "Live stream created",
        "stream": stream,
        "broadcast_info": {
            "rtmp_url": stream["rtmp_url"],
            "stream_key": stream_key,
            "tip": "Use OBS or similar software to broadcast to this RTMP URL"
        }
    }

@router.post("/{stream_id}/go-live")
async def go_live(stream_id: str, user: dict = Depends(get_current_user)):
    """Start broadcasting the live stream"""
    stream = await db.live_streams.find_one({"id": stream_id, "user_id": user["id"]})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream["status"] == "live":
        raise HTTPException(status_code=400, detail="Stream is already live")
    
    if stream["status"] == "ended":
        raise HTTPException(status_code=400, detail="Stream has ended. Create a new stream.")
    
    # Generate playback URL (in production, get from streaming service)
    playback_url = f"https://live.kona.stream/hls/{stream_id}/playlist.m3u8"
    
    await db.live_streams.update_one(
        {"id": stream_id},
        {"$set": {
            "status": "live",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "playback_url": playback_url
        }}
    )
    
    # Add to active streams
    active_streams[stream_id] = {
        "started_at": datetime.now(timezone.utc),
        "creator_id": stream["creator_id"]
    }
    viewer_counts[stream_id] = 0
    
    # Notify followers (simplified - in production use push notifications)
    followers = await db.follows.find({"creator_id": stream["creator_id"]}).to_list(1000)
    for follow in followers:
        await db.notifications.insert_one({
            "id": f"notif-{uuid.uuid4().hex[:12]}",
            "user_id": follow["user_id"],
            "type": "live_stream",
            "title": f"{stream.get('creator_name', 'A creator')} is live!",
            "message": stream["title"],
            "data": {"stream_id": stream_id},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "message": "You are now live!",
        "playback_url": playback_url,
        "stream_id": stream_id
    }

@router.post("/{stream_id}/end")
async def end_stream(stream_id: str, user: dict = Depends(get_current_user)):
    """End the live stream and optionally save as VOD"""
    stream = await db.live_streams.find_one({"id": stream_id, "user_id": user["id"]})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream["status"] != "live":
        raise HTTPException(status_code=400, detail="Stream is not live")
    
    ended_at = datetime.now(timezone.utc)
    duration = 0
    if stream.get("started_at"):
        started = datetime.fromisoformat(stream["started_at"].replace("Z", "+00:00"))
        duration = int((ended_at - started).total_seconds())
    
    # Create VOD episode if recording was enabled
    vod_episode_id = None
    if stream.get("recording_enabled") and stream.get("series_id"):
        vod_episode_id = f"ep-{uuid.uuid4().hex[:12]}"
        # In production, get the recorded video URL from streaming service
        await db.episodes.insert_one({
            "id": vod_episode_id,
            "series_id": stream["series_id"],
            "episode_number": await get_next_episode_number(stream["series_id"]),
            "title": f"[REPLAY] {stream['title']}",
            "description": f"Live stream replay from {stream.get('started_at', '')}",
            "video_url": stream.get("playback_url", "").replace("/hls/", "/vod/"),
            "thumbnail_url": stream.get("thumbnail_url"),
            "duration": duration,
            "is_free": not stream.get("is_subscriber_only", False),
            "coin_price": 0,
            "views": stream.get("viewer_count", 0),
            "likes": 0,
            "from_livestream": True,
            "livestream_id": stream_id,
            "status": "published",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.live_streams.update_one(
        {"id": stream_id},
        {"$set": {
            "status": "ended",
            "ended_at": ended_at.isoformat(),
            "duration": duration,
            "vod_episode_id": vod_episode_id,
            "peak_viewers": viewer_counts.get(stream_id, stream.get("viewer_count", 0))
        }}
    )
    
    # Cleanup active stream
    active_streams.pop(stream_id, None)
    viewer_counts.pop(stream_id, None)
    
    return {
        "message": "Stream ended",
        "duration_seconds": duration,
        "vod_created": vod_episode_id is not None,
        "vod_episode_id": vod_episode_id,
        "stats": {
            "peak_viewers": stream.get("peak_viewers", 0),
            "total_tips": stream.get("total_tips", 0),
            "tips_count": stream.get("total_tips_count", 0)
        }
    }

async def get_next_episode_number(series_id: str) -> int:
    """Get the next episode number for a series"""
    last_episode = await db.episodes.find_one(
        {"series_id": series_id},
        sort=[("episode_number", -1)]
    )
    return (last_episode.get("episode_number", 0) if last_episode else 0) + 1

@router.get("/active")
async def get_active_streams(
    limit: int = Query(20, le=50),
    offset: int = 0
):
    """Get all currently live streams"""
    streams = await db.live_streams.find(
        {"status": "live"},
        {"_id": 0, "stream_key": 0}
    ).sort("viewer_count", -1).skip(offset).limit(limit).to_list(limit)
    
    # Add real-time viewer counts
    for stream in streams:
        stream["viewer_count"] = viewer_counts.get(stream["id"], stream.get("viewer_count", 0))
    
    return {
        "streams": streams,
        "total": await db.live_streams.count_documents({"status": "live"})
    }

@router.get("/scheduled")
async def get_scheduled_streams(
    limit: int = Query(20, le=50)
):
    """Get upcoming scheduled streams"""
    now = datetime.now(timezone.utc).isoformat()
    streams = await db.live_streams.find(
        {
            "status": "scheduled",
            "scheduled_at": {"$gte": now}
        },
        {"_id": 0, "stream_key": 0}
    ).sort("scheduled_at", 1).limit(limit).to_list(limit)
    
    return streams

@router.get("/{stream_id}")
async def get_stream(stream_id: str, user: dict = Depends(get_current_user)):
    """Get stream details"""
    stream = await db.live_streams.find_one(
        {"id": stream_id},
        {"_id": 0, "stream_key": 0}
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Check subscriber access
    if stream.get("is_subscriber_only"):
        subscription = user.get("subscription", {})
        if not subscription.get("active"):
            # Check if user follows this creator
            follows = await db.follows.find_one({
                "user_id": user["id"],
                "creator_id": stream["creator_id"]
            })
            if not follows:
                stream["playback_url"] = None
                stream["access_denied"] = True
                stream["access_message"] = "Subscribe to watch this stream"
    
    # Add viewer count
    stream["viewer_count"] = viewer_counts.get(stream_id, stream.get("viewer_count", 0))
    
    return stream

@router.get("/creator/my-streams")
async def get_my_streams(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None
):
    """Get creator's own streams"""
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    streams = await db.live_streams.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return streams

@router.patch("/{stream_id}")
async def update_stream(
    stream_id: str,
    data: UpdateLiveStream,
    user: dict = Depends(get_current_user)
):
    """Update stream settings"""
    stream = await db.live_streams.find_one({"id": stream_id, "user_id": user["id"]})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if update_data:
        await db.live_streams.update_one(
            {"id": stream_id},
            {"$set": update_data}
        )
    
    return {"message": "Stream updated"}

@router.delete("/{stream_id}")
async def delete_stream(stream_id: str, user: dict = Depends(get_current_user)):
    """Delete a stream (only if not live)"""
    stream = await db.live_streams.find_one({"id": stream_id, "user_id": user["id"]})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream["status"] == "live":
        raise HTTPException(status_code=400, detail="Cannot delete a live stream. End it first.")
    
    await db.live_streams.delete_one({"id": stream_id})
    return {"message": "Stream deleted"}

# ============ VIEWER ACTIONS ============

@router.post("/{stream_id}/join")
async def join_stream(stream_id: str, user: dict = Depends(get_current_user)):
    """Register viewer joining the stream"""
    stream = await db.live_streams.find_one({"id": stream_id, "status": "live"})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not live")
    
    # Increment viewer count
    viewer_counts[stream_id] = viewer_counts.get(stream_id, 0) + 1
    current_viewers = viewer_counts[stream_id]
    
    # Update peak if needed
    if current_viewers > stream.get("peak_viewers", 0):
        await db.live_streams.update_one(
            {"id": stream_id},
            {"$set": {"peak_viewers": current_viewers, "viewer_count": current_viewers}}
        )
    else:
        await db.live_streams.update_one(
            {"id": stream_id},
            {"$set": {"viewer_count": current_viewers}}
        )
    
    return {
        "joined": True,
        "viewer_count": current_viewers,
        "chat_enabled": stream.get("chat_enabled", True),
        "allow_tips": stream.get("allow_tips", True)
    }

@router.post("/{stream_id}/leave")
async def leave_stream(stream_id: str, user: dict = Depends(get_current_user)):
    """Register viewer leaving the stream"""
    if stream_id in viewer_counts:
        viewer_counts[stream_id] = max(0, viewer_counts[stream_id] - 1)
        await db.live_streams.update_one(
            {"id": stream_id},
            {"$set": {"viewer_count": viewer_counts[stream_id]}}
        )
    
    return {"left": True}

@router.post("/{stream_id}/tip")
async def tip_streamer(
    stream_id: str,
    amount: int = Query(..., ge=1),
    message: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Send a tip during live stream"""
    stream = await db.live_streams.find_one({"id": stream_id, "status": "live"})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not live")
    
    if not stream.get("allow_tips"):
        raise HTTPException(status_code=400, detail="Tips are disabled for this stream")
    
    # Check user balance
    if user.get("coins", 0) < amount:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Deduct from user
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"coins": -amount}}
    )
    
    # Add to creator
    creator = await db.creators.find_one({"id": stream["creator_id"]})
    if creator:
        await db.creators.update_one(
            {"id": stream["creator_id"]},
            {"$inc": {"total_tips": amount, "coins_balance": amount}}
        )
    
    # Update stream stats
    await db.live_streams.update_one(
        {"id": stream_id},
        {"$inc": {"total_tips": amount, "total_tips_count": 1}}
    )
    
    # Record transaction
    tip_id = f"tip-{uuid.uuid4().hex[:12]}"
    await db.tips.insert_one({
        "id": tip_id,
        "stream_id": stream_id,
        "from_user_id": user["id"],
        "from_username": user.get("username", "Anonymous"),
        "to_creator_id": stream["creator_id"],
        "amount": amount,
        "message": message,
        "type": "livestream",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast tip to chat (will be picked up by websocket)
    if stream_id in chat_connections:
        tip_message = {
            "type": "tip",
            "user": user.get("username", "Anonymous"),
            "amount": amount,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        for ws in chat_connections.get(stream_id, []):
            try:
                await ws.send_json(tip_message)
            except Exception:
                pass
    
    return {
        "success": True,
        "tip_id": tip_id,
        "amount": amount,
        "new_balance": user.get("coins", 0) - amount
    }

# ============ CHAT ============

@router.get("/{stream_id}/chat/history")
async def get_chat_history(
    stream_id: str,
    limit: int = Query(50, le=100)
):
    """Get recent chat messages"""
    messages = await db.live_chat.find(
        {"stream_id": stream_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return list(reversed(messages))

@router.post("/{stream_id}/chat/send")
async def send_chat_message(
    stream_id: str,
    data: ChatMessage,
    user: dict = Depends(get_current_user)
):
    """Send a chat message (REST fallback for non-websocket clients)"""
    stream = await db.live_streams.find_one({"id": stream_id, "status": "live"})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not live")
    
    if not stream.get("chat_enabled"):
        raise HTTPException(status_code=400, detail="Chat is disabled for this stream")
    
    message_id = f"msg-{uuid.uuid4().hex[:12]}"
    chat_message = {
        "id": message_id,
        "stream_id": stream_id,
        "user_id": user["id"],
        "username": user.get("username", "Anonymous"),
        "avatar_url": user.get("avatar_url"),
        "message": data.message[:500],  # Limit message length
        "reply_to": data.reply_to,
        "is_creator": user["id"] == stream["user_id"],
        "is_moderator": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.live_chat.insert_one(chat_message)
    chat_message.pop("_id", None)
    
    # Broadcast to websocket clients
    if stream_id in chat_connections:
        for ws in chat_connections.get(stream_id, []):
            try:
                await ws.send_json({"type": "message", **chat_message})
            except Exception:
                pass
    
    return chat_message

# ============ WEBSOCKET CHAT ============

@router.websocket("/{stream_id}/ws")
async def websocket_chat(websocket: WebSocket, stream_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    
    # Add to connections
    if stream_id not in chat_connections:
        chat_connections[stream_id] = []
    chat_connections[stream_id].append(websocket)
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "stream_id": stream_id,
            "message": "Connected to live chat"
        })
        
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Validate and broadcast message
                message_id = f"msg-{uuid.uuid4().hex[:12]}"
                chat_message = {
                    "id": message_id,
                    "type": "message",
                    "stream_id": stream_id,
                    "user_id": data.get("user_id"),
                    "username": data.get("username", "Anonymous"),
                    "avatar_url": data.get("avatar_url"),
                    "message": data.get("message", "")[:500],
                    "is_creator": data.get("is_creator", False),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Save to database
                await db.live_chat.insert_one({**chat_message, "type": None})
                
                # Broadcast to all connected clients
                for ws in chat_connections.get(stream_id, []):
                    try:
                        await ws.send_json(chat_message)
                    except Exception:
                        pass
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        pass
    finally:
        # Remove from connections
        if stream_id in chat_connections:
            chat_connections[stream_id] = [
                ws for ws in chat_connections[stream_id] if ws != websocket
            ]
            if not chat_connections[stream_id]:
                del chat_connections[stream_id]

# ============ ANALYTICS ============

@router.get("/creator/analytics")
async def get_stream_analytics(user: dict = Depends(get_current_user)):
    """Get analytics for creator's live streams"""
    streams = await db.live_streams.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    total_streams = len(streams)
    total_duration = sum(s.get("duration", 0) for s in streams)
    total_viewers = sum(s.get("peak_viewers", 0) for s in streams)
    total_tips = sum(s.get("total_tips", 0) for s in streams)
    
    return {
        "total_streams": total_streams,
        "total_duration_hours": round(total_duration / 3600, 1),
        "total_peak_viewers": total_viewers,
        "average_viewers": round(total_viewers / max(total_streams, 1)),
        "total_tips_earned": total_tips,
        "recent_streams": streams[:10]
    }
