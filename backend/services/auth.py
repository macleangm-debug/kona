"""
Authentication and security services
"""
import bcrypt
import jwt
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from user_agents import parse as parse_user_agent

from config.settings import JWT_SECRET

security = HTTPBearer(auto_error=False)

# Device limit per user (can be configured per subscription tier)
DEFAULT_DEVICE_LIMIT = 5

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except:
        return False

def create_token(user_id: str, session_id: str = None) -> str:
    """Create JWT token with optional session_id for session tracking"""
    payload = {
        "user_id": user_id,
        "session_id": session_id or str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    """Decode JWT token and return payload"""
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])

def generate_referral_code(user_id: str) -> str:
    """Generate a unique referral code based on user_id"""
    hash_input = f"{user_id}_{datetime.now(timezone.utc).timestamp()}"
    return hashlib.sha256(hash_input.encode()).hexdigest()[:8].upper()

def parse_device_info(user_agent_string: str) -> dict:
    """Parse user agent string to extract device info"""
    try:
        ua = parse_user_agent(user_agent_string)
        device_type = "mobile" if ua.is_mobile else "tablet" if ua.is_tablet else "desktop"
        return {
            "device_type": device_type,
            "browser": f"{ua.browser.family} {ua.browser.version_string}",
            "os": f"{ua.os.family} {ua.os.version_string}",
            "device": ua.device.family if ua.device.family != "Other" else device_type.capitalize()
        }
    except:
        return {
            "device_type": "unknown",
            "browser": "Unknown",
            "os": "Unknown", 
            "device": "Unknown"
        }

async def create_session(user_id: str, request: Request, geo_data: dict = None) -> dict:
    """Create a new session for user login"""
    from services.database import db
    
    session_id = str(uuid.uuid4())
    user_agent = request.headers.get("User-Agent", "")
    device_info = parse_device_info(user_agent)
    
    # Get IP address
    client_ip = request.client.host
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    session = {
        "id": session_id,
        "user_id": user_id,
        "device_type": device_info["device_type"],
        "device_name": device_info["device"],
        "browser": device_info["browser"],
        "os": device_info["os"],
        "ip_address": client_ip if client_ip not in ["127.0.0.1", "::1"] else None,
        "location": geo_data.get("country_name") if geo_data else None,
        "country_code": geo_data.get("country_code") if geo_data else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_active": datetime.now(timezone.utc).isoformat(),
        "is_current": True
    }
    
    await db.sessions.insert_one(session)
    
    return session

async def check_device_limit(user_id: str, device_limit: int = DEFAULT_DEVICE_LIMIT) -> dict:
    """Check if user has exceeded device limit"""
    from services.database import db
    
    active_sessions = await db.sessions.count_documents({"user_id": user_id})
    
    return {
        "current_devices": active_sessions,
        "max_devices": device_limit,
        "can_login": active_sessions < device_limit,
        "exceeded": active_sessions >= device_limit
    }

async def invalidate_session(session_id: str, user_id: str) -> bool:
    """Invalidate/delete a specific session"""
    from services.database import db
    
    result = await db.sessions.delete_one({"id": session_id, "user_id": user_id})
    return result.deleted_count > 0

async def invalidate_all_sessions(user_id: str, except_session_id: str = None) -> int:
    """Invalidate all sessions for a user, optionally keeping current session"""
    from services.database import db
    
    query = {"user_id": user_id}
    if except_session_id:
        query["id"] = {"$ne": except_session_id}
    
    result = await db.sessions.delete_many(query)
    return result.deleted_count

async def update_session_activity(session_id: str):
    """Update last active time for a session"""
    from services.database import db
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
    )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    from services.database import db
    
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        session_id = payload.get("session_id")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Validate session if session_id exists (for new tokens)
        if session_id:
            session = await db.sessions.find_one({"id": session_id, "user_id": user_id})
            if not session:
                raise HTTPException(status_code=401, detail="Session expired or invalid. Please log in again.")
            # Update session activity
            await update_session_activity(session_id)
            user["_current_session_id"] = session_id
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to optionally get authenticated user (returns None if not authenticated)"""
    from services.database import db
    
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except:
        return None
