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
    "new_episode": {"icon": "film", "color": "violet"},
    "reward": {"icon": "gift", "color": "yellow"},
    "coins": {"icon": "coins", "color": "orange"},
    "achievement": {"icon": "trophy", "color": "amber"},
    "referral": {"icon": "users", "color": "green"},
    "system": {"icon": "info", "color": "blue"},
    "reminder": {"icon": "clock", "color": "pink"},
    # Creator-specific notification types
    "series_approved": {"icon": "check-circle", "color": "green", "email_subject": "Your series has been approved!"},
    "series_rejected": {"icon": "x-circle", "color": "red", "email_subject": "Update on your series submission"},
    "payout_processed": {"icon": "dollar-sign", "color": "green", "email_subject": "Your payout has been processed"},
    "payout_failed": {"icon": "alert-circle", "color": "red", "email_subject": "Issue with your payout request"},
    "milestone_reached": {"icon": "award", "color": "purple", "email_subject": "Congratulations! You reached a milestone"},
    "review_feedback": {"icon": "message-circle", "color": "blue", "email_subject": "New feedback on your submission"},
    "tier_upgrade": {"icon": "trending-up", "color": "green", "email_subject": "You've been upgraded to a new tier!"},
    "new_earnings": {"icon": "trending-up", "color": "green", "email_subject": "You have new earnings"},
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

@router.delete("/clear-all")
async def clear_all_notifications(user: dict = Depends(get_current_user)):
    """Clear all notifications for user"""
    result = await db.notifications.delete_many({"user_id": user["id"]})
    return {"message": f"Deleted {result.deleted_count} notifications"}

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


# ============ EMAIL PLACEHOLDER SERVICE ============

async def queue_notification_email(user_id: str, notification_type: str, title: str, message: str, link: str = None):
    """
    Placeholder for email service integration.
    When email service is configured, this will send emails via SendGrid/SES/etc.
    """
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("email"):
        return None
    
    type_info = NOTIFICATION_TYPES.get(notification_type, NOTIFICATION_TYPES["system"])
    email_subject = type_info.get("email_subject", "Kona Notification")
    
    email_log = {
        "id": f"email-{uuid.uuid4().hex[:12]}",
        "to": user["email"],
        "subject": email_subject,
        "title": title,
        "message": message,
        "link": link,
        "notification_type": notification_type,
        "status": "queued",  # Would be "sent" when email service is integrated
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None
    }
    
    await db.email_queue.insert_one(email_log)
    
    # TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    # Example:
    # await sendgrid.send(
    #     to=user["email"],
    #     subject=email_subject,
    #     template="creator_notification",
    #     data={"title": title, "message": message, "link": link}
    # )
    
    return email_log["id"]


# ============ CREATOR NOTIFICATION HELPERS ============

async def notify_series_approved(creator_user_id: str, series_title: str, series_id: str):
    """Notify creator when their series is approved"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="series_approved",
        title="Series Approved!",
        message=f"Great news! '{series_title}' has been approved. You can now upload all episodes.",
        action_url=f"/creator/series/{series_id}"
    )
    await queue_notification_email(
        creator_user_id, "series_approved",
        "Series Approved!",
        f"Great news! '{series_title}' has been approved. You can now upload all episodes.",
        f"/creator/series/{series_id}"
    )


async def notify_series_rejected(creator_user_id: str, series_title: str, feedback: str):
    """Notify creator when their series is rejected"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="series_rejected",
        title="Series Needs Revision",
        message=f"'{series_title}' needs some changes: {feedback[:100]}...",
        action_url="/creator"
    )
    await queue_notification_email(
        creator_user_id, "series_rejected",
        "Series Needs Revision",
        f"'{series_title}' requires some changes before approval. Feedback: {feedback}",
        "/creator"
    )


async def notify_payout_processed(creator_user_id: str, amount: float, payout_method: str, payout_id: str):
    """Notify creator when payout is processed"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="payout_processed",
        title="Payout Processed!",
        message=f"Your payout of {amount} coins via {payout_method} has been processed.",
        action_url="/creator",
        metadata={"payout_id": payout_id, "amount": amount}
    )
    await queue_notification_email(
        creator_user_id, "payout_processed",
        "Payout Processed!",
        f"Your payout of {amount} coins via {payout_method} has been processed successfully.",
        "/creator"
    )


async def notify_payout_failed(creator_user_id: str, amount: float, reason: str, payout_id: str):
    """Notify creator when payout fails"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="payout_failed",
        title="Payout Issue",
        message=f"There was an issue with your payout of {amount} coins: {reason}",
        action_url="/creator",
        metadata={"payout_id": payout_id, "amount": amount}
    )
    await queue_notification_email(
        creator_user_id, "payout_failed",
        "Payout Issue",
        f"There was an issue with your payout of {amount} coins. Reason: {reason}",
        "/creator"
    )


async def notify_milestone_reached(creator_user_id: str, milestone_name: str, bonus_coins: int):
    """Notify creator when they reach a milestone"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="milestone_reached",
        title="Milestone Reached!",
        message=f"Congratulations! You reached '{milestone_name}' and earned {bonus_coins} bonus coins!",
        action_url="/creator",
        metadata={"milestone": milestone_name, "bonus": bonus_coins}
    )
    await queue_notification_email(
        creator_user_id, "milestone_reached",
        "Milestone Reached!",
        f"Congratulations! You reached '{milestone_name}' and earned {bonus_coins} bonus coins!",
        "/creator"
    )


async def notify_tier_upgrade(creator_user_id: str, new_tier: str, new_share: int):
    """Notify creator when they upgrade to a new tier"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="tier_upgrade",
        title="Tier Upgrade!",
        message=f"You've been promoted to {new_tier}! Your new revenue share is {new_share}%.",
        action_url="/creator"
    )
    await queue_notification_email(
        creator_user_id, "tier_upgrade",
        "Tier Upgrade!",
        f"You've been promoted to {new_tier}! Your new revenue share is now {new_share}%.",
        "/creator"
    )


async def notify_review_feedback(creator_user_id: str, series_title: str, feedback: str):
    """Notify creator of new review feedback"""
    await create_notification(
        user_id=creator_user_id,
        notification_type="review_feedback",
        title="New Feedback",
        message=f"You received feedback on '{series_title}': {feedback[:80]}...",
        action_url="/creator"
    )
    await queue_notification_email(
        creator_user_id, "review_feedback",
        "New Feedback on Your Submission",
        f"Feedback on '{series_title}': {feedback}",
        "/creator"
    )


# ============ EMAIL QUEUE STATUS ============

@router.get("/email-queue")
async def get_email_queue(
    user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get email queue for user (shows pending emails)"""
    emails = await db.email_queue.find(
        {"to": user.get("email")},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "emails": emails,
        "note": "Email service integration pending - emails are queued but not yet sent"
    }


# ============ ADMIN NOTIFICATION MANAGEMENT ============
from routes.admin import require_admin, require_super_admin
from pydantic import BaseModel
from typing import List
from enum import Enum
from datetime import timedelta


class NotificationTarget(str, Enum):
    ALL_USERS = "all_users"
    SUBSCRIBERS = "subscribers"
    INACTIVE_USERS = "inactive_users"
    CREATORS = "creators"
    VIP_USERS = "vip_users"
    LOW_BALANCE = "low_balance"
    SPECIFIC_USERS = "specific_users"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AdminNotificationRequest(BaseModel):
    title: str
    message: str
    notification_type: str = "system"
    target: NotificationTarget = NotificationTarget.ALL_USERS
    priority: NotificationPriority = NotificationPriority.NORMAL
    target_user_ids: Optional[List[str]] = None
    target_series_id: Optional[str] = None
    action_url: Optional[str] = None
    image_url: Optional[str] = None
    scheduled_at: Optional[str] = None


class TriggerConfigUpdate(BaseModel):
    enabled: bool
    config: dict = {}


# Default automated trigger configurations
DEFAULT_TRIGGERS = {
    "new_episode": {
        "enabled": True,
        "title_template": "New Episode Available!",
        "message_template": "{series_title} - Episode {episode_number} is now live!",
        "priority": "high"
    },
    "series_follow_update": {
        "enabled": True,
        "title_template": "Update from {series_title}",
        "message_template": "A series you follow has new content!",
        "priority": "normal"
    },
    "coin_balance_low": {
        "enabled": True,
        "threshold": 10,
        "title_template": "Running Low on Coins",
        "message_template": "You have only {coins} coins left. Top up to keep watching!",
        "priority": "normal"
    },
    "weekly_digest": {
        "enabled": True,
        "day_of_week": 0,
        "hour": 10,
        "title_template": "Your Weekly Kona Digest",
        "message_template": "Check out {new_episodes} new episodes and {trending_count} trending series this week!",
        "priority": "low"
    },
    "inactive_user": {
        "enabled": True,
        "days_inactive": 7,
        "title_template": "We Miss You!",
        "message_template": "You haven't watched anything in {days} days. {new_content} new episodes are waiting!",
        "priority": "normal"
    },
    "creator_milestone": {
        "enabled": True,
        "milestones": [100, 1000, 10000, 100000, 1000000],
        "title_template": "Milestone Achieved!",
        "message_template": "Your series {series_title} reached {milestone} views!",
        "priority": "high"
    }
}


async def get_target_users(target: NotificationTarget, target_user_ids: List[str] = None,
                           target_series_id: str = None, days_inactive: int = 7,
                           coin_threshold: int = 10) -> List[dict]:
    """Get users based on target criteria"""
    users = []
    
    if target == NotificationTarget.ALL_USERS:
        users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(100000)
    
    elif target == NotificationTarget.SPECIFIC_USERS and target_user_ids:
        users = await db.users.find(
            {"id": {"$in": target_user_ids}},
            {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(len(target_user_ids))
    
    elif target == NotificationTarget.SUBSCRIBERS and target_series_id:
        watch_history = await db.watch_history.find(
            {"series_id": target_series_id},
            {"user_id": 1}
        ).to_list(100000)
        user_ids = list(set([w["user_id"] for w in watch_history]))
        
        my_list_users = await db.users.find(
            {"my_list": target_series_id},
            {"_id": 0, "id": 1}
        ).to_list(100000)
        user_ids.extend([u["id"] for u in my_list_users])
        user_ids = list(set(user_ids))
        
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(len(user_ids))
    
    elif target == NotificationTarget.INACTIVE_USERS:
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days_inactive)).isoformat()
        users = await db.users.find(
            {"last_active": {"$lt": cutoff_date}},
            {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(100000)
    
    elif target == NotificationTarget.CREATORS:
        creators = await db.creators.find(
            {"status": "approved"},
            {"_id": 0, "user_id": 1}
        ).to_list(10000)
        creator_user_ids = [c["user_id"] for c in creators if c.get("user_id")]
        users = await db.users.find(
            {"id": {"$in": creator_user_ids}},
            {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(len(creator_user_ids))
    
    elif target == NotificationTarget.VIP_USERS:
        users = await db.users.find(
            {"subscription_tier": {"$in": ["premium", "vip", "ultra"]}},
            {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(100000)
    
    elif target == NotificationTarget.LOW_BALANCE:
        users = await db.users.find(
            {"coins": {"$lt": coin_threshold}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "coins": 1}
        ).to_list(100000)
    
    return users


async def send_bulk_notifications(users: List[dict], title: str, message: str,
                                  notification_type: str, priority: str = "normal",
                                  action_url: str = None, image_url: str = None,
                                  batch_id: str = None):
    """Send notifications to multiple users"""
    if not batch_id:
        batch_id = f"batch-{uuid.uuid4().hex[:8]}"
    
    notifications = []
    now = datetime.now(timezone.utc).isoformat()
    type_info = NOTIFICATION_TYPES.get(notification_type, NOTIFICATION_TYPES["system"])
    
    for user in users:
        notifications.append({
            "id": f"notif-{uuid.uuid4().hex[:12]}",
            "user_id": user["id"],
            "type": notification_type,
            "icon": type_info["icon"],
            "color": type_info["color"],
            "title": title,
            "message": message,
            "priority": priority,
            "action_url": action_url,
            "image_url": image_url,
            "batch_id": batch_id,
            "read": False,
            "created_at": now
        })
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return len(notifications)


@router.post("/admin/send")
async def admin_send_notification(
    data: AdminNotificationRequest,
    user: dict = Depends(require_admin)
):
    """Send notification to targeted users (Admin only)"""
    
    target_users = await get_target_users(
        target=data.target,
        target_user_ids=data.target_user_ids,
        target_series_id=data.target_series_id
    )
    
    if not target_users:
        raise HTTPException(status_code=400, detail="No users match the target criteria")
    
    batch_id = f"batch-{uuid.uuid4().hex[:8]}"
    
    # Log the campaign
    campaign = {
        "id": batch_id,
        "title": data.title,
        "message": data.message,
        "notification_type": data.notification_type,
        "target": data.target,
        "target_count": len(target_users),
        "priority": data.priority,
        "action_url": data.action_url,
        "image_url": data.image_url,
        "scheduled_at": data.scheduled_at,
        "sent_by": user["id"],
        "sent_by_name": user.get("name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "sending" if not data.scheduled_at else "scheduled"
    }
    await db.notification_campaigns.insert_one(campaign)
    
    if not data.scheduled_at:
        sent_count = await send_bulk_notifications(
            users=target_users,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
            priority=data.priority,
            action_url=data.action_url,
            image_url=data.image_url,
            batch_id=batch_id
        )
        
        await db.notification_campaigns.update_one(
            {"id": batch_id},
            {"$set": {"status": "sent", "sent_count": sent_count, "sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "message": f"Notification sent to {sent_count} users",
            "batch_id": batch_id,
            "target_count": len(target_users)
        }
    else:
        return {
            "message": f"Notification scheduled for {data.scheduled_at}",
            "batch_id": batch_id,
            "target_count": len(target_users)
        }


@router.get("/admin/campaigns")
async def get_notification_campaigns(
    user: dict = Depends(require_admin),
    status: str = None,
    limit: int = 50
):
    """Get notification campaign history"""
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.notification_campaigns.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"campaigns": campaigns}


@router.delete("/admin/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user: dict = Depends(require_admin)):
    """Delete a notification campaign"""
    result = await db.notification_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}


@router.get("/admin/triggers")
async def get_trigger_configs(user: dict = Depends(require_admin)):
    """Get automated trigger configurations"""
    configs = await db.notification_triggers.find({}, {"_id": 0}).to_list(100)
    
    result = {}
    for trigger_type, default_config in DEFAULT_TRIGGERS.items():
        saved_config = next((c for c in configs if c.get("trigger_type") == trigger_type), None)
        if saved_config:
            result[trigger_type] = {**default_config, **saved_config}
        else:
            result[trigger_type] = {**default_config, "trigger_type": trigger_type}
    
    return {"triggers": result}


@router.put("/admin/triggers/{trigger_type}")
async def update_trigger_config(
    trigger_type: str,
    config: TriggerConfigUpdate,
    user: dict = Depends(require_admin)
):
    """Update an automated trigger configuration"""
    if trigger_type not in DEFAULT_TRIGGERS:
        raise HTTPException(status_code=400, detail="Invalid trigger type")
    
    await db.notification_triggers.update_one(
        {"trigger_type": trigger_type},
        {"$set": {
            "trigger_type": trigger_type,
            "enabled": config.enabled,
            **config.config,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user["id"]
        }},
        upsert=True
    )
    
    return {"message": f"Trigger '{trigger_type}' updated", "enabled": config.enabled}


@router.get("/admin/stats")
async def get_admin_notification_stats(user: dict = Depends(require_admin)):
    """Get notification statistics for admin dashboard"""
    total_sent = await db.notifications.count_documents({})
    total_read = await db.notifications.count_documents({"read": True})
    total_unread = await db.notifications.count_documents({"read": False})
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    sent_today = await db.notifications.count_documents({
        "created_at": {"$gte": today_start}
    })
    
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]
    by_type = await db.notifications.aggregate(pipeline).to_list(20)
    
    recent_campaigns = await db.notification_campaigns.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get trigger statuses
    triggers = await db.notification_triggers.find({}, {"_id": 0, "trigger_type": 1, "enabled": 1}).to_list(10)
    trigger_status = {t["trigger_type"]: t.get("enabled", True) for t in triggers}
    
    return {
        "total_sent": total_sent,
        "total_read": total_read,
        "total_unread": total_unread,
        "read_rate": round((total_read / total_sent * 100) if total_sent > 0 else 0, 1),
        "sent_today": sent_today,
        "by_type": {item["_id"]: item["count"] for item in by_type},
        "recent_campaigns": recent_campaigns,
        "triggers": trigger_status
    }


# ============ AUTOMATED TRIGGER FUNCTIONS ============

async def trigger_new_episode_notification(series_id: str, episode_number: int):
    """Triggered when a new episode is published"""
    config = await db.notification_triggers.find_one({"trigger_type": "new_episode"})
    if config and not config.get("enabled", True):
        return 0
    
    cfg = config or DEFAULT_TRIGGERS["new_episode"]
    series = await db.series.find_one({"id": series_id}, {"_id": 0, "title": 1, "thumbnail": 1})
    if not series:
        return 0
    
    title = cfg.get("title_template", DEFAULT_TRIGGERS["new_episode"]["title_template"])
    message = cfg.get("message_template", DEFAULT_TRIGGERS["new_episode"]["message_template"])
    message = message.format(series_title=series["title"], episode_number=episode_number)
    
    users = await get_target_users(NotificationTarget.SUBSCRIBERS, target_series_id=series_id)
    
    if users:
        return await send_bulk_notifications(
            users=users,
            title=title,
            message=message,
            notification_type="new_episode",
            priority=cfg.get("priority", "high"),
            action_url=f"/series/{series_id}",
            image_url=series.get("thumbnail")
        )
    return 0


async def trigger_low_coin_notification(user_id: str, current_coins: int):
    """Triggered when user's coin balance drops below threshold"""
    config = await db.notification_triggers.find_one({"trigger_type": "coin_balance_low"})
    if config and not config.get("enabled", True):
        return
    
    cfg = config or DEFAULT_TRIGGERS["coin_balance_low"]
    threshold = cfg.get("threshold", 10)
    if current_coins >= threshold:
        return
    
    recent = await db.notifications.find_one({
        "user_id": user_id,
        "type": "coins",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
    })
    if recent:
        return
    
    title = cfg.get("title_template", DEFAULT_TRIGGERS["coin_balance_low"]["title_template"])
    message = cfg.get("message_template", DEFAULT_TRIGGERS["coin_balance_low"]["message_template"])
    message = message.format(coins=current_coins)
    
    await create_notification(
        user_id=user_id,
        notification_type="coins",
        title=title,
        message=message,
        action_url="/shop"
    )


