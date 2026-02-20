"""
Admin routes
"""
import uuid
import os
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import PlainTextResponse

from models.schemas import (
    AdminSeriesCreate, AdminEpisodeCreate, AdminUserUpdate,
    FeaturedPromoCreate, FeaturedPromo
)
from services import db, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

async def require_admin(user: dict = Depends(get_current_user)):
    """Dependency to require admin privileges"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: dict = Depends(get_current_user)):
    """Dependency to require super admin privileges"""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

# ============ ADMIN SERIES ============
@router.get("/series")
async def list_series(user: dict = Depends(require_admin)):
    """List all series for admin"""
    series = await db.series.find({}, {"_id": 0}).sort("views", -1).to_list(100)
    return series

@router.post("/series")
async def create_series(data: AdminSeriesCreate, user: dict = Depends(require_admin)):
    series_id = f"series-{uuid.uuid4().hex[:8]}"
    series = {
        "id": series_id,
        **data.dict(),
        "views": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.series.insert_one(series)
    del series["_id"]
    return series

@router.put("/series/{series_id}")
async def update_series(series_id: str, data: AdminSeriesCreate, user: dict = Depends(require_admin)):
    result = await db.series.update_one(
        {"id": series_id},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Series not found")
    return {"message": "Series updated"}

@router.delete("/series/{series_id}")
async def delete_series(series_id: str, user: dict = Depends(require_admin)):
    result = await db.series.delete_one({"id": series_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Series not found")
    # Also delete episodes
    await db.episodes.delete_many({"series_id": series_id})
    return {"message": "Series and episodes deleted"}

# ============ ADMIN EPISODES ============
@router.post("/episodes")
async def create_episode(data: AdminEpisodeCreate, user: dict = Depends(require_admin)):
    episode_id = f"{data.series_id}-ep{data.episode_number}"
    episode = {
        "id": episode_id,
        **data.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.episodes.insert_one(episode)
    del episode["_id"]
    return episode

@router.put("/episodes/{episode_id}")
async def update_episode(episode_id: str, data: AdminEpisodeCreate, user: dict = Depends(require_admin)):
    result = await db.episodes.update_one(
        {"id": episode_id},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Episode not found")
    return {"message": "Episode updated"}

@router.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: str, user: dict = Depends(require_admin)):
    result = await db.episodes.delete_one({"id": episode_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Episode not found")
    return {"message": "Episode deleted"}

# ============ ADMIN USERS ============
@router.get("/users")
async def list_users(user: dict = Depends(require_admin), skip: int = 0, limit: int = 50):
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    return {"users": users, "total": total}

@router.put("/users/{user_id}")
async def update_user(user_id: str, data: AdminUserUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

# ============ ADMIN STATS ============
@router.get("/stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_series = await db.series.count_documents({})
    total_episodes = await db.episodes.count_documents({})
    
    # Calculate total coins in circulation
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$coins"}}}]
    coins_result = await db.users.aggregate(pipeline).to_list(1)
    total_coins = coins_result[0]["total"] if coins_result else 0
    
    return {
        "total_users": total_users,
        "total_series": total_series,
        "total_episodes": total_episodes,
        "total_coins_circulation": total_coins
    }

# ============ ADMIN TRANSACTIONS ============
@router.get("/transactions")
async def list_transactions(user: dict = Depends(require_admin), limit: int = 20):
    """List recent transactions"""
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"transactions": transactions}

# ============ ADMIN PROMOS ============
@router.get("/promos")
async def list_promos(user: dict = Depends(require_admin)):
    promos = await db.featured_promos.find({}, {"_id": 0}).to_list(100)
    return promos

@router.post("/promos")
async def create_promo(data: FeaturedPromoCreate, user: dict = Depends(require_admin)):
    promo_id = f"promo-{uuid.uuid4().hex[:8]}"
    promo = {
        "id": promo_id,
        **data.dict(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None
    }
    await db.featured_promos.insert_one(promo)
    del promo["_id"]
    return promo

@router.put("/promos/{promo_id}")
async def update_promo(promo_id: str, data: FeaturedPromoCreate, user: dict = Depends(require_admin)):
    result = await db.featured_promos.update_one(
        {"id": promo_id},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promo not found")
    return {"message": "Promo updated"}

@router.delete("/promos/{promo_id}")
async def delete_promo(promo_id: str, user: dict = Depends(require_admin)):
    result = await db.featured_promos.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo not found")
    return {"message": "Promo deleted"}



# ============ ADMIN CREATOR MANAGEMENT ============
@router.get("/creator-applications")
async def list_creator_applications(user: dict = Depends(require_admin), status: str = None):
    """List all creator applications (alias for /creators)"""
    query = {}
    if status:
        query["status"] = status
    
    creators = await db.creators.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"applications": creators}

@router.get("/creators")
async def list_creators(user: dict = Depends(require_admin), status: str = None):
    """List all creator applications"""
    query = {}
    if status:
        query["status"] = status
    
    creators = await db.creators.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return creators

@router.get("/creators/{creator_id}")
async def get_creator_detail(creator_id: str, user: dict = Depends(require_admin)):
    """Get creator details"""
    creator = await db.creators.find_one({"id": creator_id}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Get series count
    series = await db.creator_series.find({"creator_id": creator_id}, {"_id": 0}).to_list(100)
    
    return {
        **creator,
        "series": series
    }

@router.post("/creators/{creator_id}/approve")
async def approve_creator(creator_id: str, user: dict = Depends(require_admin)):
    """Approve a creator application"""
    result = await db.creators.update_one(
        {"id": creator_id, "status": "pending"},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creator not found or already processed")
    
    return {"message": "Creator approved", "creator_id": creator_id}

@router.post("/creators/{creator_id}/reject")
async def reject_creator(creator_id: str, reason: str = "Does not meet requirements", user: dict = Depends(require_admin)):
    """Reject a creator application"""
    result = await db.creators.update_one(
        {"id": creator_id, "status": "pending"},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creator not found or already processed")
    
    return {"message": "Creator rejected", "creator_id": creator_id}

@router.post("/creators/{creator_id}/upgrade-tier")
async def upgrade_creator_tier(creator_id: str, new_tier: str, user: dict = Depends(require_admin)):
    """Upgrade creator tier"""
    TIER_CONFIG = {
        "new": {"revenue_share": 0.60},
        "verified": {"revenue_share": 0.65},
        "partner": {"revenue_share": 0.70}
    }
    
    if new_tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    result = await db.creators.update_one(
        {"id": creator_id},
        {"$set": {
            "tier": new_tier,
            "revenue_share": TIER_CONFIG[new_tier]["revenue_share"]
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    return {"message": f"Creator upgraded to {new_tier}", "new_revenue_share": TIER_CONFIG[new_tier]["revenue_share"]}

@router.get("/creator-series")
async def list_pending_series(user: dict = Depends(require_admin), status: str = "pending_review"):
    """List series pending review"""
    series = await db.creator_series.find({"status": status}, {"_id": 0}).to_list(100)
    
    # Add creator info
    for s in series:
        creator = await db.creators.find_one({"id": s["creator_id"]}, {"_id": 0, "name": 1, "tier": 1})
        s["creator"] = creator
    
    return series

@router.post("/creator-series/{series_id}/approve")
async def approve_series(series_id: str, user: dict = Depends(require_admin)):
    """Approve and publish a series"""
    from routes.creator import publish_series_to_main
    
    series = await db.creator_series.find_one({"id": series_id})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    await db.creator_series.update_one(
        {"id": series_id},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Publish to main series
    await publish_series_to_main(series_id, series["creator_id"])
    
    return {"message": "Series approved and published", "series_id": series_id}

@router.post("/creator-series/{series_id}/reject")
async def reject_series(series_id: str, reason: str = "Does not meet quality standards", user: dict = Depends(require_admin)):
    """Reject a series"""
    result = await db.creator_series.update_one(
        {"id": series_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Series not found")
    
    return {"message": "Series rejected", "series_id": series_id}

@router.get("/payouts")
async def list_payouts(user: dict = Depends(require_admin), status: str = None):
    """List payout requests"""
    query = {}
    if status:
        query["status"] = status
    
    payouts = await db.payouts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add creator info
    for p in payouts:
        creator = await db.creators.find_one({"id": p["creator_id"]}, {"_id": 0, "name": 1, "email": 1})
        p["creator"] = creator
    
    return payouts

@router.post("/payouts/{payout_id}/process")
async def process_payout(payout_id: str, user: dict = Depends(require_admin)):
    """Mark payout as processed"""
    result = await db.payouts.update_one(
        {"id": payout_id, "status": "pending"},
        {"$set": {
            "status": "completed",
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payout not found or already processed")
    
    return {"message": "Payout marked as processed"}

# ============ SUPER ADMIN DOCUMENTATION ============

# Document metadata mapping
DOC_METADATA = {
    "production_guide": {"title": "Production Deployment Guide", "icon": "🚀", "category": "P0"},
    "launch_checklist": {"title": "Launch Checklist", "icon": "✅", "category": "P0"},
    "marketing_plan": {"title": "Marketing & Go-to-Market Plan", "icon": "📈", "category": "P0"},
    "monetization_strategy": {"title": "Monetization & Pricing Strategy", "icon": "💰", "category": "P0"},
    "legal_compliance": {"title": "Legal & Compliance Checklist", "icon": "⚖️", "category": "P0"},
    "kpi_metrics": {"title": "KPI & Metrics Dashboard", "icon": "📊", "category": "P1"},
    "content_strategy": {"title": "Content Strategy & Pipeline", "icon": "🎬", "category": "P1"},
    "support_playbook": {"title": "Customer Support Playbook", "icon": "🎧", "category": "P1"},
    "crisis_management": {"title": "Crisis Management Plan", "icon": "🚨", "category": "P1"},
    "growth_retention": {"title": "Growth & Retention Playbook", "icon": "🌱", "category": "P2"},
    "localization_expansion": {"title": "Localization & Expansion Guide", "icon": "🌍", "category": "P2"},
    "creator_partnership": {"title": "Creator Partnership Program", "icon": "🤝", "category": "P2"},
    "security_data_protection": {"title": "Security & Data Protection", "icon": "🔒", "category": "P2"},
}

@router.get("/docs/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(require_super_admin)):
    """Get any document by ID (Super Admin only)"""
    doc_path = f"/app/docs/{doc_id}.md"
    
    if not os.path.exists(doc_path):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")
    
    with open(doc_path, "r") as f:
        content = f.read()
    
    metadata = DOC_METADATA.get(doc_id, {"title": doc_id.replace("_", " ").title(), "icon": "📄", "category": "Other"})
    
    return {
        "id": doc_id,
        "title": metadata["title"],
        "icon": metadata["icon"],
        "category": metadata["category"],
        "content": content,
        "last_updated": datetime.fromtimestamp(os.path.getmtime(doc_path)).isoformat()
    }

@router.get("/docs")
async def list_docs(user: dict = Depends(require_super_admin)):
    """List available documentation (Super Admin only)"""
    docs_dir = "/app/docs"
    docs = []
    
    if os.path.exists(docs_dir):
        for filename in os.listdir(docs_dir):
            if filename.endswith(".md"):
                doc_id = filename.replace(".md", "")
                filepath = os.path.join(docs_dir, filename)
                metadata = DOC_METADATA.get(doc_id, {"title": doc_id.replace("_", " ").title(), "icon": "📄", "category": "Other"})
                docs.append({
                    "id": doc_id,
                    "title": metadata["title"],
                    "icon": metadata["icon"],
                    "category": metadata["category"],
                    "last_updated": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
                })
    
    # Sort by category priority
    category_order = {"P0": 0, "P1": 1, "P2": 2, "Other": 3}
    docs.sort(key=lambda x: category_order.get(x["category"], 99))
    
    return {"docs": docs}

@router.get("/system/health")
async def get_system_health(user: dict = Depends(require_super_admin)):
    """Get detailed system health (Super Admin only)"""
    from services.cache import cache
    from services.database import check_db_health
    
    db_health = await check_db_health()
    cache_status = "connected" if cache.enabled else "disabled"
    
    # Get collection stats
    users_count = await db.users.estimated_document_count()
    series_count = await db.series.estimated_document_count()
    episodes_count = await db.episodes.estimated_document_count()
    
    return {
        "database": db_health,
        "cache": cache_status,
        "collections": {
            "users": users_count,
            "series": series_count,
            "episodes": episodes_count
        },
        "scaling_features": {
            "rate_limiting": "enabled",
            "connection_pooling": "enabled (maxPoolSize=100)",
            "indexes": "optimized",
            "caching": cache_status
        }
    }

# ============ LAUNCH CHECKLIST PROGRESS ============
@router.get("/checklist")
async def get_checklist_progress(user: dict = Depends(require_super_admin)):
    """Get launch checklist progress"""
    checklist = await db.launch_checklist.find_one({"id": "main"}, {"_id": 0})
    if not checklist:
        # Initialize with default checklist items
        checklist = {
            "id": "main",
            "completed_items": [],
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        await db.launch_checklist.insert_one(checklist)
    return checklist

@router.post("/checklist/toggle")
async def toggle_checklist_item(item_id: str, user: dict = Depends(require_super_admin)):
    """Toggle a checklist item"""
    checklist = await db.launch_checklist.find_one({"id": "main"})
    if not checklist:
        checklist = {"id": "main", "completed_items": []}
        await db.launch_checklist.insert_one(checklist)
    
    completed = checklist.get("completed_items", [])
    if item_id in completed:
        completed.remove(item_id)
        action = "unchecked"
    else:
        completed.append(item_id)
        action = "checked"
    
    await db.launch_checklist.update_one(
        {"id": "main"},
        {"$set": {"completed_items": completed, "last_updated": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"item_id": item_id, "action": action, "completed_items": completed}



# ============ CONTENT SUBMISSION REVIEW ============

@router.get("/submissions")
async def get_pending_submissions(
    status: str = "pending_review",
    user: dict = Depends(require_admin)
):
    """Get all series submissions for review"""
    query = {}
    if status != "all":
        query["status"] = status
    
    submissions = await db.series_submissions.find(
        query,
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    return submissions


@router.get("/submissions/{submission_id}")
async def get_submission_detail(submission_id: str, user: dict = Depends(require_admin)):
    """Get detailed submission with pilot video for review"""
    submission = await db.series_submissions.find_one(
        {"id": submission_id},
        {"_id": 0}
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get creator info
    creator = await db.creators.find_one(
        {"id": submission["creator_id"]},
        {"_id": 0}
    )
    
    # Get pilot episode if exists
    pilot = await db.creator_episodes.find_one(
        {"id": submission.get("pilot_episode_id")},
        {"_id": 0}
    )
    
    return {
        **submission,
        "creator": creator,
        "pilot_episode": pilot
    }


@router.post("/submissions/{submission_id}/review")
async def review_submission(
    submission_id: str,
    decision: str,  # approved, rejected, request_changes
    feedback: str,
    content_quality_score: int = 0,
    market_fit_score: int = 0,
    technical_quality_score: int = 0,
    user: dict = Depends(require_admin)
):
    """Review and approve/reject a series submission"""
    submission = await db.series_submissions.find_one({"id": submission_id})
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission["status"] not in ["pending_review", "under_review"]:
        raise HTTPException(status_code=400, detail="Submission already processed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update submission
    update_data = {
        "status": decision,
        "feedback": feedback,
        "review_scores": {
            "content_quality": content_quality_score,
            "market_fit": market_fit_score,
            "technical_quality": technical_quality_score,
            "total": content_quality_score + market_fit_score + technical_quality_score
        },
        "reviewed_at": now,
        "reviewed_by": user["id"]
    }
    
    await db.series_submissions.update_one(
        {"id": submission_id},
        {"$set": update_data}
    )
    
    # Update series status
    series_status = "approved" if decision == "approved" else ("rejected" if decision == "rejected" else "pending_review")
    
    series_update = {
        "status": series_status,
        "reviewed_at": now,
        "reviewed_by": user["id"]
    }
    
    if decision == "rejected":
        series_update["rejection_reason"] = feedback
    
    await db.creator_series.update_one(
        {"id": submission["series_id"]},
        {"$set": series_update}
    )
    
    # If approved, publish the series and pilot to main content
    if decision == "approved":
        await _publish_approved_series(submission)
    
    # Notify creator (in production, send email/push notification)
    notification = {
        "id": f"notif-{uuid.uuid4().hex[:8]}",
        "user_id": submission["creator_id"],
        "type": "submission_review",
        "title": f"Series {'Approved' if decision == 'approved' else 'Reviewed'}",
        "message": f"Your series '{submission['title']}' has been {decision}. {feedback}",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    return {
        "message": f"Submission {decision}",
        "submission_id": submission_id,
        "series_id": submission["series_id"],
        "decision": decision
    }


async def _publish_approved_series(submission: dict):
    """Publish an approved series to the main content library"""
    series_id = submission["series_id"]
    
    # Get creator series
    creator_series = await db.creator_series.find_one({"id": series_id}, {"_id": 0})
    if not creator_series:
        return
    
    # Create in main series collection
    main_series = {
        "id": series_id,
        "title": submission["title"],
        "description": submission["description"],
        "genre": submission["genre"],
        "thumbnail": submission.get("thumbnail_url") or "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800",
        "rating": 4.5,
        "total_episodes": 1,
        "total_seasons": 1,
        "views": 0,
        "featured": False,
        "content_rating": submission.get("content_rating", "PG-13"),
        "language": submission.get("language", "en"),
        "creator_id": submission["creator_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.series.update_one(
        {"id": series_id},
        {"$set": main_series},
        upsert=True
    )
    
    # Publish pilot episode
    pilot = await db.creator_episodes.find_one(
        {"id": submission.get("pilot_episode_id")},
        {"_id": 0}
    )
    
    if pilot:
        main_episode = {
            "id": pilot["id"],
            "series_id": series_id,
            "season_number": 1,
            "episode_number": 1,
            "episode_code": "S01E01",
            "title": pilot["title"],
            "description": pilot.get("description"),
            "thumbnail": pilot.get("thumbnail") or main_series["thumbnail"],
            "duration": f"{(pilot.get('duration', 120) // 60)}:{str(pilot.get('duration', 0) % 60).zfill(2)}" if pilot.get('duration') else "2:00",
            "video_url": pilot.get("video_url", ""),
            "is_free": True,
            "is_pilot": True,
            "coins_required": 0,
            "intro_duration": pilot.get("intro_duration", 30),
            "creator_id": submission["creator_id"],
            "views": 0,
            "likes": 0,
            "shares": 0
        }
        
        await db.episodes.update_one(
            {"id": pilot["id"]},
            {"$set": main_episode},
            upsert=True
        )
    
    # Update creator series status to published
    await db.creator_series.update_one(
        {"id": series_id},
        {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
    )


@router.post("/submissions/{submission_id}/start-review")
async def start_review(submission_id: str, user: dict = Depends(require_admin)):
    """Mark a submission as under review (to prevent duplicate reviews)"""
    result = await db.series_submissions.update_one(
        {"id": submission_id, "status": "pending_review"},
        {"$set": {"status": "under_review", "reviewing_by": user["id"]}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="Submission not available for review")
    
    return {"message": "Review started", "submission_id": submission_id}


@router.get("/submissions/stats")
async def get_submission_stats(user: dict = Depends(require_admin)):
    """Get submission statistics"""
    pending = await db.series_submissions.count_documents({"status": "pending_review"})
    under_review = await db.series_submissions.count_documents({"status": "under_review"})
    approved = await db.series_submissions.count_documents({"status": "approved"})
    rejected = await db.series_submissions.count_documents({"status": "rejected"})
    
    return {
        "pending_review": pending,
        "under_review": under_review,
        "approved": approved,
        "rejected": rejected,
        "total": pending + under_review + approved + rejected
    }



# ============ ENGAGEMENT SEEDING (LAUNCH TRACTION) ============

@router.post("/seed/likes")
async def seed_likes_for_episodes(
    user: dict = Depends(require_super_admin),
    min_likes: int = 500,
    max_likes: int = 5000,
    episode_ids: List[str] = None
):
    """
    Seed episodes with base like counts for launch traction.
    This sets a 'base_likes' field that gets added to real user likes.
    Only Super Admin can use this feature.
    """
    import random
    
    # Get all episodes if no specific IDs provided
    if episode_ids:
        episodes = await db.episodes.find({"id": {"$in": episode_ids}}, {"_id": 0}).to_list(1000)
    else:
        episodes = await db.episodes.find({}, {"_id": 0}).to_list(1000)
    
    if not episodes:
        raise HTTPException(status_code=404, detail="No episodes found")
    
    seeded_count = 0
    for ep in episodes:
        # Generate random base likes within range
        base_likes = random.randint(min_likes, max_likes)
        
        # Update episode with base_likes
        await db.episodes.update_one(
            {"id": ep["id"]},
            {"$set": {"base_likes": base_likes}}
        )
        seeded_count += 1
    
    return {
        "message": f"Seeded {seeded_count} episodes with base likes",
        "range": {"min": min_likes, "max": max_likes},
        "episodes_affected": seeded_count
    }


@router.post("/seed/views")
async def seed_views_for_episodes(
    user: dict = Depends(require_super_admin),
    min_views: int = 1000,
    max_views: int = 50000,
    episode_ids: List[str] = None
):
    """
    Seed episodes with base view counts for launch traction.
    This sets a 'base_views' field that gets added to real user views.
    """
    import random
    
    if episode_ids:
        episodes = await db.episodes.find({"id": {"$in": episode_ids}}, {"_id": 0}).to_list(1000)
    else:
        episodes = await db.episodes.find({}, {"_id": 0}).to_list(1000)
    
    if not episodes:
        raise HTTPException(status_code=404, detail="No episodes found")
    
    seeded_count = 0
    for ep in episodes:
        base_views = random.randint(min_views, max_views)
        
        await db.episodes.update_one(
            {"id": ep["id"]},
            {"$set": {"base_views": base_views}}
        )
        seeded_count += 1
    
    return {
        "message": f"Seeded {seeded_count} episodes with base views",
        "range": {"min": min_views, "max": max_views},
        "episodes_affected": seeded_count
    }


@router.post("/seed/series-stats")
async def seed_series_stats(
    user: dict = Depends(require_super_admin),
    min_views: int = 5000,
    max_views: int = 250000,
    min_rating: float = 4.0,
    max_rating: float = 4.9
):
    """
    Seed all series with base view counts and ratings for launch.
    """
    import random
    
    series_list = await db.series.find({}, {"_id": 0}).to_list(100)
    
    seeded_count = 0
    for s in series_list:
        base_views = random.randint(min_views, max_views)
        base_rating = round(random.uniform(min_rating, max_rating), 1)
        
        await db.series.update_one(
            {"id": s["id"]},
            {"$set": {
                "base_views": base_views,
                "base_rating": base_rating,
                "rating": base_rating  # Set visible rating
            }}
        )
        seeded_count += 1
    
    return {
        "message": f"Seeded {seeded_count} series with base stats",
        "view_range": {"min": min_views, "max": max_views},
        "rating_range": {"min": min_rating, "max": max_rating}
    }


@router.get("/seed/status")
async def get_seed_status(user: dict = Depends(require_admin)):
    """Check current seeding status across content"""
    
    # Episodes with base likes
    episodes_with_base_likes = await db.episodes.count_documents({"base_likes": {"$exists": True, "$gt": 0}})
    episodes_with_base_views = await db.episodes.count_documents({"base_views": {"$exists": True, "$gt": 0}})
    
    # Series with base stats
    series_with_base_views = await db.series.count_documents({"base_views": {"$exists": True, "$gt": 0}})
    
    # Get totals
    total_episodes = await db.episodes.count_documents({})
    total_series = await db.series.count_documents({})
    
    return {
        "episodes": {
            "total": total_episodes,
            "with_base_likes": episodes_with_base_likes,
            "with_base_views": episodes_with_base_views
        },
        "series": {
            "total": total_series,
            "with_base_views": series_with_base_views
        }
    }


@router.delete("/seed/clear")
async def clear_all_seeds(user: dict = Depends(require_super_admin)):
    """Clear all seeded data (reset to organic only)"""
    
    # Remove base fields from episodes
    await db.episodes.update_many(
        {},
        {"$unset": {"base_likes": "", "base_views": ""}}
    )
    
    # Remove base fields from series
    await db.series.update_many(
        {},
        {"$unset": {"base_views": "", "base_rating": ""}}
    )
    
    return {"message": "All seeded data cleared"}


# ============ VERTICAL VIDEO SAMPLES ============
# Various sample videos from Google's public CDN for testing
SAMPLE_VIDEOS = [
    # Horizontal videos from Google's sample bucket
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
]

@router.post("/seed/varied-videos")
async def seed_varied_video_samples(user: dict = Depends(require_admin)):
    """Update episodes with varied video URLs for better testing experience"""
    import random
    
    # Get all episodes
    episodes = await db.episodes.find({}).to_list(1000)
    
    if not episodes:
        raise HTTPException(status_code=404, detail="No episodes found to update")
    
    # Update each episode with a random video from the sample list
    updated_count = 0
    for ep in episodes:
        video_url = random.choice(SAMPLE_VIDEOS)
        await db.episodes.update_one(
            {"id": ep["id"]},
            {"$set": {"video_url": video_url}}
        )
        updated_count += 1
    
    return {
        "message": f"Updated {updated_count} episodes with varied video samples",
        "total_episodes": len(episodes),
        "sample_videos_used": len(SAMPLE_VIDEOS)
    }


@router.post("/seed/vertical-videos")
async def seed_vertical_video_samples(user: dict = Depends(require_admin)):
    """
    Mark some episodes as vertical for testing adaptive player.
    Note: Since public vertical video CDN URLs are hard to find,
    this endpoint marks episodes as "vertical" which can be updated
    with actual vertical video URLs when available.
    """
    import random
    
    # Get some episodes to update
    episodes = await db.episodes.find({}).to_list(100)
    
    if not episodes:
        raise HTTPException(status_code=404, detail="No episodes found to update")
    
    # For now, we'll use the available videos and mark them
    # The frontend will adapt based on actual video dimensions
    updated_count = 0
    for i, ep in enumerate(episodes):
        if i % 3 == 0:  # Every 3rd episode
            await db.episodes.update_one(
                {"id": ep["id"]},
                {"$set": {
                    "is_vertical": True,
                    "aspect_ratio": "9:16",
                    "video_url": random.choice(SAMPLE_VIDEOS)  # Use available videos
                }}
            )
            updated_count += 1
    
    return {
        "message": f"Marked {updated_count} episodes as vertical (video URLs are horizontal samples - player will auto-detect actual dimensions)",
        "total_episodes": len(episodes),
        "vertical_episodes": updated_count,
        "note": "The adaptive player will detect actual video dimensions regardless of this flag"
    }


@router.delete("/seed/vertical-videos")
async def remove_vertical_video_samples(user: dict = Depends(require_admin)):
    """Revert all episodes back to horizontal sample video"""
    horizontal_video = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    
    result = await db.episodes.update_many(
        {"is_vertical": True},
        {"$set": {
            "video_url": horizontal_video,
            "is_vertical": False
        }, "$unset": {"aspect_ratio": ""}}
    )
    
    return {
        "message": f"Reverted {result.modified_count} episodes back to horizontal video",
        "episodes_affected": result.modified_count
    }


@router.post("/seed/story-content")
async def seed_story_content_flags(user: dict = Depends(require_admin)):
    """
    Mark Episode 1 of all series as story content (for vertical Stories feed).
    This is a one-time migration for existing content.
    """
    # Update all Episode 1s to be story content
    result = await db.episodes.update_many(
        {"episode_number": 1},
        {"$set": {
            "is_story_content": True,
            "requires_vertical": True
        }}
    )
    
    return {
        "message": f"Marked {result.modified_count} Episode 1s as story content",
        "episodes_affected": result.modified_count,
        "note": "These episodes will appear in the Stories feed and should ideally be vertical (9:16) format"
    }


@router.post("/series/{series_id}/make-free")
async def make_series_free(series_id: str, user: dict = Depends(require_admin)):
    """
    Make all episodes of a series free (e.g., for sponsored/completed series).
    This ONLY changes is_free flag - does NOT affect is_story_content.
    Horizontal episodes that become free will NOT appear in Stories feed.
    """
    # Verify series exists
    series = await db.series.find_one({"id": series_id})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Make all episodes free
    result = await db.episodes.update_many(
        {"series_id": series_id},
        {"$set": {
            "is_free": True,
            "coins_required": 0
        }}
    )
    
    return {
        "message": f"Made {result.modified_count} episodes of '{series['title']}' free",
        "series_id": series_id,
        "episodes_affected": result.modified_count,
        "note": "Only Episode 1 (if vertical) will appear in Stories feed. Other episodes remain in normal episode list."
    }


@router.post("/series/{series_id}/make-paid")
async def make_series_paid(series_id: str, coins_required: int = 5, user: dict = Depends(require_admin)):
    """
    Revert a series back to paid (except Episode 1 which stays free).
    """
    # Verify series exists
    series = await db.series.find_one({"id": series_id})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Make episodes paid (except Episode 1)
    result = await db.episodes.update_many(
        {"series_id": series_id, "episode_number": {"$ne": 1}},
        {"$set": {
            "is_free": False,
            "coins_required": coins_required
        }}
    )
    
    return {
        "message": f"Made {result.modified_count} episodes of '{series['title']}' paid ({coins_required} coins each)",
        "series_id": series_id,
        "episodes_affected": result.modified_count,
        "note": "Episode 1 remains free as the preview/hook episode"
    }


# ============ ADVERTISER/ADS MANAGEMENT (ADMIN) ============

@router.get("/ads/pending")
async def get_pending_ads(user: dict = Depends(require_admin)):
    """Get all ads pending approval"""
    pending_ads = await db.ad_creatives.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with advertiser and campaign info
    for ad in pending_ads:
        advertiser = await db.advertisers.find_one(
            {"id": ad.get("advertiser_id")},
            {"_id": 0, "company_name": 1, "email": 1, "tier": 1}
        )
        campaign = await db.campaigns.find_one(
            {"id": ad.get("campaign_id")},
            {"_id": 0, "name": 1, "budget": 1, "ad_placements": 1}
        )
        ad["advertiser"] = advertiser
        ad["campaign"] = campaign
    
    return pending_ads

@router.get("/campaigns/pending")
async def get_pending_campaigns(user: dict = Depends(require_admin)):
    """Get all campaigns pending approval"""
    pending_campaigns = await db.campaigns.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with advertiser info
    for campaign in pending_campaigns:
        advertiser = await db.advertisers.find_one(
            {"id": campaign.get("advertiser_id")},
            {"_id": 0, "company_name": 1, "email": 1, "tier": 1}
        )
        campaign["advertiser"] = advertiser
        # Count ads in this campaign
        ads_count = await db.ad_creatives.count_documents({"campaign_id": campaign["id"]})
        campaign["ads_count"] = ads_count
    
    return pending_campaigns

@router.post("/ads/{ad_id}/approve")
async def approve_ad(ad_id: str, user: dict = Depends(require_admin)):
    """Approve an ad creative"""
    from datetime import datetime, timezone
    
    result = await db.ad_creatives.update_one(
        {"id": ad_id, "status": "pending_approval"},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user["id"]
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found or already processed")
    
    return {"message": "Ad approved successfully", "ad_id": ad_id}

@router.post("/ads/{ad_id}/reject")
async def reject_ad(ad_id: str, reason: str = "Does not meet content guidelines", user: dict = Depends(require_admin)):
    """Reject an ad creative"""
    from datetime import datetime, timezone
    
    result = await db.ad_creatives.update_one(
        {"id": ad_id, "status": "pending_approval"},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": user["id"],
            "rejection_reason": reason
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found or already processed")
    
    return {"message": "Ad rejected", "ad_id": ad_id}

@router.post("/campaigns/{campaign_id}/approve")
async def approve_campaign(campaign_id: str, user: dict = Depends(require_admin)):
    """Approve a campaign (activates it)"""
    from datetime import datetime, timezone
    
    result = await db.campaigns.update_one(
        {"id": campaign_id, "status": "pending_approval"},
        {"$set": {
            "status": "active",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user["id"]
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found or already processed")
    
    return {"message": "Campaign approved and activated", "campaign_id": campaign_id}

@router.post("/campaigns/{campaign_id}/reject")
async def reject_campaign(campaign_id: str, reason: str = "Does not meet platform guidelines", user: dict = Depends(require_admin)):
    """Reject a campaign and refund reserved budget"""
    from datetime import datetime, timezone
    
    campaign = await db.campaigns.find_one({"id": campaign_id, "status": "pending_approval"})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found or already processed")
    
    # Refund reserved budget back to advertiser
    reserved_budget = campaign.get("reserved_budget", 0)
    if reserved_budget > 0:
        await db.advertisers.update_one(
            {"id": campaign["advertiser_id"]},
            {"$inc": {
                "balance": reserved_budget,
                "reserved_balance": -reserved_budget
            }}
        )
        
        # Log refund transaction
        await db.ad_transactions.insert_one({
            "id": f"txn-{uuid.uuid4().hex[:12]}",
            "advertiser_id": campaign["advertiser_id"],
            "campaign_id": campaign_id,
            "type": "refund",
            "amount": reserved_budget,
            "description": f"Campaign rejected: {reason}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": user["id"],
            "rejection_reason": reason
        }}
    )
    
    return {
        "message": "Campaign rejected and budget refunded",
        "campaign_id": campaign_id,
        "refunded_amount": reserved_budget
    }

@router.get("/ads/stats")
async def get_ads_stats(user: dict = Depends(require_admin)):
    """Get advertising statistics for admin dashboard"""
    pending_ads = await db.ad_creatives.count_documents({"status": "pending_approval"})
    approved_ads = await db.ad_creatives.count_documents({"status": "approved"})
    rejected_ads = await db.ad_creatives.count_documents({"status": "rejected"})
    
    pending_campaigns = await db.campaigns.count_documents({"status": "pending_approval"})
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
    completed_campaigns = await db.campaigns.count_documents({"status": "completed"})
    
    total_advertisers = await db.advertisers.count_documents({})
    
    # Total revenue from ads
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_spent"}}}]
    revenue_result = await db.advertisers.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "ads": {
            "pending": pending_ads,
            "approved": approved_ads,
            "rejected": rejected_ads
        },
        "campaigns": {
            "pending": pending_campaigns,
            "active": active_campaigns,
            "completed": completed_campaigns
        },
        "total_advertisers": total_advertisers,
        "total_ad_revenue": round(total_revenue, 2)
    }


@router.get("/ads/alerts")
async def get_admin_campaign_alerts(
    user: dict = Depends(require_admin),
    unread_only: bool = False,
    limit: int = 100
):
    """Get all campaign alerts for admin dashboard"""
    query = {}
    if unread_only:
        query["is_read_admin"] = False
    
    alerts = await db.campaign_alerts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich with advertiser info
    for alert in alerts:
        advertiser = await db.advertisers.find_one(
            {"id": alert.get("advertiser_id")},
            {"_id": 0, "company_name": 1, "email": 1}
        )
        alert["advertiser"] = advertiser
    
    unread_count = await db.campaign_alerts.count_documents({"is_read_admin": False})
    
    return {
        "alerts": alerts,
        "unread_count": unread_count
    }

@router.post("/ads/alerts/{alert_id}/read")
async def mark_admin_alert_read(alert_id: str, user: dict = Depends(require_admin)):
    """Mark an alert as read for admin"""
    result = await db.campaign_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_read_admin": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert marked as read"}

@router.post("/ads/alerts/mark-all-read")
async def mark_all_admin_alerts_read(user: dict = Depends(require_admin)):
    """Mark all alerts as read for admin"""
    result = await db.campaign_alerts.update_many(
        {"is_read_admin": False},
        {"$set": {"is_read_admin": True}}
    )
    
    return {"message": f"Marked {result.modified_count} alerts as read"}





# ============ BUNNY.NET CDN CONFIGURATION ============
@router.get("/bunny/referrers")
async def get_bunny_referrers(user: dict = Depends(require_admin)):
    """Get current allowed referrer domains for Bunny.net embed player"""
    from services.bunny import bunny_service
    result = await bunny_service.get_allowed_referrers()
    return result

@router.post("/bunny/referrers")
async def add_bunny_referrer(hostname: str, user: dict = Depends(require_admin)):
    """
    Add a domain to Bunny.net allowed referrers for embed player access.
    This fixes 403 errors when embedding videos on new domains.
    
    Args:
        hostname: Domain to allow (e.g., "example.com" or "myapp.preview.emergentagent.com")
    """
    from services.bunny import bunny_service
    
    # Clean the hostname (remove protocol and paths)
    hostname = hostname.replace("https://", "").replace("http://", "").split("/")[0]
    
    result = await bunny_service.add_allowed_referrer(hostname)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400, 
            detail=result.get("error", "Failed to add referrer")
        )
    
    return result
