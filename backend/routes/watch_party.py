"""
Watch Party routes - Synchronized viewing with friends
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from services import db, get_current_user

router = APIRouter(prefix="/watch-party", tags=["Watch Party"])

# In-memory storage for active watch parties (use Redis in production)
active_parties = {}
party_connections = {}

class CreatePartyRequest(BaseModel):
    series_id: str
    episode_id: str

class JoinPartyRequest(BaseModel):
    party_code: str

class PartyMessage(BaseModel):
    type: str  # chat, play, pause, seek, reaction
    content: Optional[str] = None
    timestamp: Optional[float] = None

def generate_party_code():
    """Generate a 6-character party code"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create")
async def create_watch_party(data: CreatePartyRequest, user: dict = Depends(get_current_user)):
    """Create a new watch party"""
    # Verify series and episode exist
    series = await db.series.find_one({"id": data.series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    episode = await db.episodes.find_one({"id": data.episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    party_id = str(uuid.uuid4())
    party_code = generate_party_code()
    
    # Ensure unique code
    while party_code in active_parties:
        party_code = generate_party_code()
    
    party = {
        "id": party_id,
        "code": party_code,
        "host_id": user["id"],
        "host_name": user["name"],
        "series_id": data.series_id,
        "series_title": series.get("title", "Unknown"),
        "episode_id": data.episode_id,
        "episode_title": episode.get("title", "Unknown"),
        "episode_number": episode.get("episode_number", 1),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "waiting",  # waiting, playing, paused, ended
        "current_time": 0,
        "participants": [{
            "id": user["id"],
            "name": user["name"],
            "is_host": True,
            "joined_at": datetime.now(timezone.utc).isoformat()
        }],
        "chat_messages": []
    }
    
    active_parties[party_code] = party
    party_connections[party_code] = []
    
    # Store in DB for persistence
    await db.watch_parties.insert_one({**party, "_id": party_id})
    
    return {
        "party_id": party_id,
        "party_code": party_code,
        "share_link": f"/watch-party/{party_code}",
        "message": "Watch party created! Share the code with friends."
    }

@router.post("/join")
async def join_watch_party(data: JoinPartyRequest, user: dict = Depends(get_current_user)):
    """Join an existing watch party"""
    party_code = data.party_code.upper()
    
    if party_code not in active_parties:
        # Try to find in DB
        party = await db.watch_parties.find_one({"code": party_code, "status": {"$ne": "ended"}}, {"_id": 0})
        if party:
            active_parties[party_code] = party
            party_connections[party_code] = []
        else:
            raise HTTPException(status_code=404, detail="Watch party not found or has ended")
    
    party = active_parties[party_code]
    
    # Check if user already in party
    existing = next((p for p in party["participants"] if p["id"] == user["id"]), None)
    if not existing:
        party["participants"].append({
            "id": user["id"],
            "name": user["name"],
            "is_host": False,
            "joined_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update DB
        await db.watch_parties.update_one(
            {"code": party_code},
            {"$set": {"participants": party["participants"]}}
        )
    
    return {
        "party_id": party["id"],
        "party_code": party_code,
        "series_id": party["series_id"],
        "series_title": party["series_title"],
        "episode_id": party["episode_id"],
        "episode_title": party["episode_title"],
        "episode_number": party["episode_number"],
        "host_name": party["host_name"],
        "participants": party["participants"],
        "status": party["status"],
        "current_time": party["current_time"]
    }

@router.get("/{party_code}")
async def get_party_info(party_code: str, user: dict = Depends(get_current_user)):
    """Get watch party information"""
    party_code = party_code.upper()
    
    if party_code not in active_parties:
        party = await db.watch_parties.find_one({"code": party_code}, {"_id": 0})
        if party:
            active_parties[party_code] = party
        else:
            raise HTTPException(status_code=404, detail="Watch party not found")
    
    party = active_parties[party_code]
    
    return {
        "party_id": party["id"],
        "party_code": party_code,
        "series_id": party["series_id"],
        "series_title": party["series_title"],
        "episode_id": party["episode_id"],
        "episode_title": party["episode_title"],
        "episode_number": party["episode_number"],
        "host_id": party["host_id"],
        "host_name": party["host_name"],
        "participants": party["participants"],
        "status": party["status"],
        "current_time": party["current_time"],
        "chat_messages": party.get("chat_messages", [])[-50:]  # Last 50 messages
    }

@router.post("/{party_code}/end")
async def end_watch_party(party_code: str, user: dict = Depends(get_current_user)):
    """End a watch party (host only)"""
    party_code = party_code.upper()
    
    if party_code not in active_parties:
        raise HTTPException(status_code=404, detail="Watch party not found")
    
    party = active_parties[party_code]
    
    if party["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the host can end the party")
    
    party["status"] = "ended"
    
    # Update DB
    await db.watch_parties.update_one(
        {"code": party_code},
        {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clean up
    del active_parties[party_code]
    if party_code in party_connections:
        del party_connections[party_code]
    
    return {"message": "Watch party ended"}

@router.post("/{party_code}/sync")
async def sync_playback(party_code: str, action: str, timestamp: float = 0, user: dict = Depends(get_current_user)):
    """Sync playback state (play, pause, seek)"""
    party_code = party_code.upper()
    
    if party_code not in active_parties:
        raise HTTPException(status_code=404, detail="Watch party not found")
    
    party = active_parties[party_code]
    
    # Only host can control playback
    if party["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the host can control playback")
    
    if action == "play":
        party["status"] = "playing"
    elif action == "pause":
        party["status"] = "paused"
    elif action == "seek":
        party["current_time"] = timestamp
    
    # Update DB
    await db.watch_parties.update_one(
        {"code": party_code},
        {"$set": {"status": party["status"], "current_time": party["current_time"]}}
    )
    
    return {"status": party["status"], "current_time": party["current_time"]}

@router.post("/{party_code}/chat")
async def send_chat_message(party_code: str, message: str, user: dict = Depends(get_current_user)):
    """Send a chat message to the watch party"""
    party_code = party_code.upper()
    
    if party_code not in active_parties:
        raise HTTPException(status_code=404, detail="Watch party not found")
    
    party = active_parties[party_code]
    
    chat_msg = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "message": message[:500],  # Limit message length
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if "chat_messages" not in party:
        party["chat_messages"] = []
    
    party["chat_messages"].append(chat_msg)
    
    # Keep only last 100 messages in memory
    if len(party["chat_messages"]) > 100:
        party["chat_messages"] = party["chat_messages"][-100:]
    
    # Update DB
    await db.watch_parties.update_one(
        {"code": party_code},
        {"$push": {"chat_messages": chat_msg}}
    )
    
    return chat_msg

@router.post("/{party_code}/reaction")
async def send_reaction(party_code: str, reaction: str, user: dict = Depends(get_current_user)):
    """Send a reaction emoji to the watch party"""
    party_code = party_code.upper()
    
    if party_code not in active_parties:
        raise HTTPException(status_code=404, detail="Watch party not found")
    
    # Validate reaction (common reactions)
    valid_reactions = ["❤️", "😂", "😮", "😢", "😡", "👏", "🔥", "💯", "😍", "🎉"]
    if reaction not in valid_reactions:
        reaction = "❤️"
    
    return {
        "user_id": user["id"],
        "user_name": user["name"],
        "reaction": reaction,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/user/active")
async def get_user_active_parties(user: dict = Depends(get_current_user)):
    """Get user's active watch parties"""
    parties = await db.watch_parties.find(
        {
            "participants.id": user["id"],
            "status": {"$ne": "ended"}
        },
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {"parties": parties}
