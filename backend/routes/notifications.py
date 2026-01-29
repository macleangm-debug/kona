"""
Notification routes
"""
from fastapi import APIRouter, Depends

from models.schemas import PushSubscription, NotificationSettings
from services import db, get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# VAPID keys for push notifications (in production, store in env)
VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"

@router.get("/vapid-key")
async def get_vapid_key():
    """Get VAPID public key for push subscription"""
    return {"public_key": VAPID_PUBLIC_KEY}

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
