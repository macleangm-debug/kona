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

