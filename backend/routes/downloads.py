"""
Offline Downloads routes - VIP-only with mitigation strategies
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services import db, get_current_user

router = APIRouter(prefix="/downloads", tags=["Downloads"])

# Configuration
MAX_DEVICES = 2
DOWNLOAD_EXPIRY_DAYS = 30
MAX_DOWNLOADS_PER_DEVICE = 25

class DownloadRequest(BaseModel):
    episode_id: str
    device_id: str
    device_name: Optional[str] = "Unknown Device"

class DeviceRegistration(BaseModel):
    device_id: str
    device_name: str
    device_type: str  # mobile, tablet, desktop

async def check_vip_status(user_id: str) -> dict:
    """Check if user has active VIP subscription"""
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "status": "active",
        "end_date": {"$gt": datetime.now(timezone.utc).isoformat()}
    }, {"_id": 0})
    return subscription

async def get_user_devices(user_id: str) -> list:
    """Get user's registered devices"""
    devices = await db.user_devices.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(10)
    return devices

async def count_device_downloads(user_id: str, device_id: str) -> int:
    """Count active downloads for a device"""
    count = await db.offline_downloads.count_documents({
        "user_id": user_id,
        "device_id": device_id,
        "status": "active",
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    return count

@router.get("/status")
async def get_download_status(user: dict = Depends(get_current_user)):
    """Get user's download status and limits"""
    user_id = user["id"]
    
    # Check VIP status
    subscription = await check_vip_status(user_id)
    is_vip = subscription is not None
    
    # Get devices
    devices = await get_user_devices(user_id)
    
    # Get active downloads
    downloads = await db.offline_downloads.find(
        {
            "user_id": user_id,
            "status": "active",
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        },
        {"_id": 0}
    ).to_list(100)
    
    return {
        "is_vip": is_vip,
        "can_download": is_vip,
        "subscription_end": subscription.get("end_date") if subscription else None,
        "devices": {
            "registered": len(devices),
            "limit": MAX_DEVICES,
            "list": devices
        },
        "downloads": {
            "active": len(downloads),
            "limit_per_device": MAX_DOWNLOADS_PER_DEVICE,
            "expiry_days": DOWNLOAD_EXPIRY_DAYS,
            "list": downloads
        }
    }

@router.post("/register-device")
async def register_device(data: DeviceRegistration, user: dict = Depends(get_current_user)):
    """Register a device for downloads"""
    user_id = user["id"]
    
    # Check VIP status
    subscription = await check_vip_status(user_id)
    if not subscription:
        raise HTTPException(status_code=403, detail="VIP subscription required for offline downloads")
    
    # Check device count
    devices = await get_user_devices(user_id)
    
    # Check if device already registered
    existing = next((d for d in devices if d["device_id"] == data.device_id), None)
    if existing:
        # Update last active
        await db.user_devices.update_one(
            {"user_id": user_id, "device_id": data.device_id},
            {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Device already registered", "device": existing}
    
    # Check device limit
    if len(devices) >= MAX_DEVICES:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum {MAX_DEVICES} devices allowed. Remove a device first."
        )
    
    # Register new device
    device = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "device_id": data.device_id,
        "device_name": data.device_name,
        "device_type": data.device_type,
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "last_active": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_devices.insert_one(device)
    
    return {"message": "Device registered successfully", "device": device}

@router.delete("/devices/{device_id}")
async def remove_device(device_id: str, user: dict = Depends(get_current_user)):
    """Remove a registered device"""
    user_id = user["id"]
    
    result = await db.user_devices.delete_one({
        "user_id": user_id,
        "device_id": device_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Also remove all downloads for this device
    await db.offline_downloads.delete_many({
        "user_id": user_id,
        "device_id": device_id
    })
    
    return {"message": "Device removed and downloads cleared"}

@router.post("/request")
async def request_download(data: DownloadRequest, user: dict = Depends(get_current_user)):
    """Request to download an episode"""
    user_id = user["id"]
    
    # Check VIP status
    subscription = await check_vip_status(user_id)
    if not subscription:
        raise HTTPException(status_code=403, detail="VIP subscription required for offline downloads")
    
    # Check if device is registered
    devices = await get_user_devices(user_id)
    device = next((d for d in devices if d["device_id"] == data.device_id), None)
    
    if not device:
        raise HTTPException(status_code=400, detail="Device not registered. Please register device first.")
    
    # Check device download limit
    download_count = await count_device_downloads(user_id, data.device_id)
    if download_count >= MAX_DOWNLOADS_PER_DEVICE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_DOWNLOADS_PER_DEVICE} downloads per device. Remove some downloads first."
        )
    
    # Check if episode exists
    episode = await db.episodes.find_one({"id": data.episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Check if already downloaded
    existing = await db.offline_downloads.find_one({
        "user_id": user_id,
        "episode_id": data.episode_id,
        "device_id": data.device_id,
        "status": "active"
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Episode already downloaded on this device")
    
    # Create download record
    expires_at = datetime.now(timezone.utc) + timedelta(days=DOWNLOAD_EXPIRY_DAYS)
    
    download = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "episode_id": data.episode_id,
        "episode_title": episode.get("title", "Unknown"),
        "series_id": episode.get("series_id"),
        "device_id": data.device_id,
        "device_name": data.device_name,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "subscription_id": subscription.get("id"),
        # Encryption key for DRM (simplified - in production use proper DRM)
        "encryption_key": str(uuid.uuid4()),
        "download_url": episode.get("video_url")  # Would be encrypted URL in production
    }
    
    await db.offline_downloads.insert_one(download)
    
    return {
        "message": "Download ready",
        "download": {
            "id": download["id"],
            "episode_title": download["episode_title"],
            "expires_at": download["expires_at"],
            "encryption_key": download["encryption_key"],
            "download_url": download["download_url"]
        }
    }

@router.delete("/{download_id}")
async def remove_download(download_id: str, user: dict = Depends(get_current_user)):
    """Remove a downloaded episode"""
    result = await db.offline_downloads.delete_one({
        "id": download_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Download not found")
    
    return {"message": "Download removed"}

@router.get("/list")
async def list_downloads(device_id: str = None, user: dict = Depends(get_current_user)):
    """List user's downloads"""
    user_id = user["id"]
    
    query = {
        "user_id": user_id,
        "status": "active",
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    }
    
    if device_id:
        query["device_id"] = device_id
    
    downloads = await db.offline_downloads.find(query, {"_id": 0}).to_list(100)
    
    return {"downloads": downloads}

@router.post("/validate")
async def validate_download(download_id: str, device_id: str, user: dict = Depends(get_current_user)):
    """Validate a download is still valid for playback"""
    user_id = user["id"]
    
    # Check VIP status still active
    subscription = await check_vip_status(user_id)
    if not subscription:
        # VIP expired - invalidate all downloads
        await db.offline_downloads.update_many(
            {"user_id": user_id},
            {"$set": {"status": "expired_subscription"}}
        )
        raise HTTPException(status_code=403, detail="VIP subscription expired. Downloads are no longer valid.")
    
    # Check specific download
    download = await db.offline_downloads.find_one({
        "id": download_id,
        "user_id": user_id,
        "device_id": device_id,
        "status": "active"
    }, {"_id": 0})
    
    if not download:
        raise HTTPException(status_code=404, detail="Download not found or invalid")
    
    # Check expiry
    expires_at = datetime.fromisoformat(download["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.offline_downloads.update_one(
            {"id": download_id},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=403, detail="Download has expired")
    
    return {
        "valid": True,
        "expires_at": download["expires_at"],
        "encryption_key": download["encryption_key"]
    }

@router.post("/cleanup-expired")
async def cleanup_expired_downloads(user: dict = Depends(get_current_user)):
    """Cleanup expired downloads for user"""
    user_id = user["id"]
    
    result = await db.offline_downloads.update_many(
        {
            "user_id": user_id,
            "status": "active",
            "expires_at": {"$lt": datetime.now(timezone.utc).isoformat()}
        },
        {"$set": {"status": "expired"}}
    )
    
    return {"cleaned_up": result.modified_count}
