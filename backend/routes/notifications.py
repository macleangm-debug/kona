"""
Notification routes
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import uuid

from models.schemas import PushSubscription, NotificationSettings
from services import db, get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# VAPID keys for push notifications (in production, store in env)
VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"

# Notification types
NOTIFICATION_TYPES = {
    "new_episode": {"icon": "🎬", "color": "violet"},
    "reward": {"icon": "🎁", "color": "yellow"},
    "coins": {"icon": "🪙", "color": "orange"},
    "achievement": {"icon": "🏆", "color": "amber"},
    "referral": {"icon": "👥", "color": "green"},
    "system": {"icon": "📢", "color": "blue"},
    "reminder": {"icon": "⏰", "color": "pink"},
}

@router.get("/vapid-key")
async def get_vapid_key():
    """Get VAPID public key for push subscription"""
    return {"public_key": VAPID_PUBLIC_KEY}

@router.get("/list")
async def get_notifications(
    user: dict = Depends(get_current_user),
    limit: int = 50,
    unread_only: bool = False
):
    """Get user's notifications"""
    query = {"user_id": user["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Count unread
    unread_count = await db.notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "total": len(notifications)
    }

@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    return {"unread_count": count}

@router.post("/mark-read/{notification_id}")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a single notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
async def mark_all_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    result = await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Marked {result.modified_count} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({
        "id": notification_id,
        "user_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@router.delete("/clear-all")
async def clear_all_notifications(user: dict = Depends(get_current_user)):
    """Clear all notifications for user"""
    result = await db.notifications.delete_many({"user_id": user["id"]})
    return {"message": f"Deleted {result.deleted_count} notifications"}

# Helper function to create notifications (used by other parts of the app)
async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Create a new notification for a user"""
    type_info = NOTIFICATION_TYPES.get(notification_type, NOTIFICATION_TYPES["system"])
    
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "icon": type_info["icon"],
        "color": type_info["color"],
        "title": title,
        "message": message,
        "action_url": action_url,
        "metadata": metadata or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    return notification

# Seed sample notifications for testing
@router.post("/seed-sample")
async def seed_sample_notifications(user: dict = Depends(get_current_user)):
    """Seed sample notifications for testing"""
    sample_notifications = [
        {
            "type": "new_episode",
            "title": "New Episode Available!",
            "message": "Episode 5 of 'Love in the City' is now available to watch.",
            "action_url": "/series/series-1"
        },
        {
            "type": "reward",
            "title": "Daily Reward Claimed!",
            "message": "You received 3 coins from your daily login bonus.",
            "action_url": "/rewards"
        },
        {
            "type": "achievement",
            "title": "Badge Unlocked!",
            "message": "You earned the 'Binge Starter' badge for watching 3 episodes.",
            "action_url": "/profile"
        },
        {
            "type": "coins",
            "title": "Mystery Box Reward",
            "message": "You won 3 coins from the Mystery Box!",
            "action_url": "/rewards"
        },
        {
            "type": "referral",
            "title": "Referral Bonus!",
            "message": "Your friend John joined Kona! You earned 5 coins.",
            "action_url": "/profile"
        },
        {
            "type": "system",
            "title": "Welcome to Kona!",
            "message": "Start watching amazing mini-series and earn rewards.",
            "action_url": "/"
        },
        {
            "type": "reminder",
            "title": "Continue Watching",
            "message": "You left off at Episode 3 of 'Secret Romance'. Continue now!",
            "action_url": "/series/series-2"
        }
    ]
    
    created = 0
    for notif in sample_notifications:
        await create_notification(
            user_id=user["id"],
            notification_type=notif["type"],
            title=notif["title"],
            message=notif["message"],
            action_url=notif.get("action_url")
        )
        created += 1
    
    return {"message": f"Created {created} sample notifications"}

@router.post("/subscribe")
async def save_push_subscription(subscription: PushSubscription, user: dict = Depends(get_current_user)):
    """Save push subscription for user"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"push_subscription": subscription.dict()}}
    )
    return {"message": "Push subscription saved"}

@router.delete("/unsubscribe")
async def remove_push_subscription(user: dict = Depends(get_current_user)):
    """Remove push subscription for user"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"push_subscription": ""}}
    )
    return {"message": "Push subscription removed"}

@router.get("/settings")
async def get_notification_settings(user: dict = Depends(get_current_user)):
    """Get user's notification preferences"""
    return {
        "push_enabled": "push_subscription" in user,
        "milestone_alerts": user.get("notification_settings", {}).get("milestone_alerts", True),
        "new_episodes": user.get("notification_settings", {}).get("new_episodes", True),
        "daily_rewards": user.get("notification_settings", {}).get("daily_rewards", True)
    }

@router.put("/settings")
async def update_notification_settings(settings: NotificationSettings, user: dict = Depends(get_current_user)):
    """Update user's notification preferences"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"notification_settings": settings.dict()}}
    )
    return {"message": "Notification settings updated", "settings": settings.dict()}
