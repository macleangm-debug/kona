"""
Thumbnail A/B Testing Routes
Allow creators and admins to test multiple thumbnails for series
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import random

from services import db, get_current_user
from routes.admin import require_admin

router = APIRouter(prefix="/thumbnail-testing", tags=["Thumbnail A/B Testing"])


# ============ MODELS ============

class ThumbnailVariant(BaseModel):
    url: str
    name: str = "Variant"
    weight: int = 50  # Traffic allocation percentage


class CreateThumbnailTest(BaseModel):
    series_id: str
    variants: List[ThumbnailVariant]  # First variant is control


class ThumbnailImpression(BaseModel):
    test_id: str
    variant_index: int


class ThumbnailClick(BaseModel):
    test_id: str
    variant_index: int


# ============ HELPERS ============

async def get_active_thumbnail_test(series_id: str) -> Optional[dict]:
    """Get active thumbnail test for a series"""
    test = await db.thumbnail_tests.find_one(
        {"series_id": series_id, "status": "active"},
        {"_id": 0}
    )
    return test


async def assign_user_variant(user_id: str, test: dict) -> int:
    """Assign a variant to a user (consistent per user per test)"""
    # Check if user already has an assignment
    assignment = await db.thumbnail_assignments.find_one(
        {"user_id": user_id, "test_id": test["id"]},
        {"_id": 0}
    )
    
    if assignment:
        return assignment["variant_index"]
    
    # Assign based on weights
    variants = test.get("variants", [])
    total_weight = sum(v.get("weight", 50) for v in variants)
    
    rand_val = random.randint(1, total_weight)
    cumulative = 0
    assigned_index = 0
    
    for i, variant in enumerate(variants):
        cumulative += variant.get("weight", 50)
        if rand_val <= cumulative:
            assigned_index = i
            break
    
    # Save assignment
    await db.thumbnail_assignments.insert_one({
        "id": f"assign-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "test_id": test["id"],
        "variant_index": assigned_index,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return assigned_index


# ============ API ROUTES ============

@router.get("/series/{series_id}/thumbnail")
async def get_series_thumbnail(
    series_id: str,
    user_id: Optional[str] = Query(None, description="User ID for consistent variant assignment")
):
    """
    Get the thumbnail URL for a series.
    If there's an active A/B test, returns the assigned variant.
    Called by frontend when displaying series cards.
    """
    test = await get_active_thumbnail_test(series_id)
    
    if not test or not test.get("variants"):
        # No active test, return default thumbnail
        series = await db.series.find_one({"id": series_id}, {"_id": 0, "thumbnail": 1})
        if not series:
            raise HTTPException(status_code=404, detail="Series not found")
        return {
            "thumbnail": series.get("thumbnail"),
            "is_test": False
        }
    
    # Assign variant
    if user_id:
        variant_index = await assign_user_variant(user_id, test)
    else:
        # Anonymous user - random variant based on weights
        variants = test["variants"]
        total_weight = sum(v.get("weight", 50) for v in variants)
        rand_val = random.randint(1, total_weight)
        cumulative = 0
        variant_index = 0
        for i, v in enumerate(variants):
            cumulative += v.get("weight", 50)
            if rand_val <= cumulative:
                variant_index = i
                break
    
    variant = test["variants"][variant_index]
    
    return {
        "thumbnail": variant["url"],
        "is_test": True,
        "test_id": test["id"],
        "variant_index": variant_index,
        "variant_name": variant.get("name", f"Variant {variant_index}")
    }


@router.post("/impression")
async def record_impression(
    data: ThumbnailImpression,
    user: dict = Depends(get_current_user)
):
    """Record a thumbnail impression (when user sees the thumbnail)"""
    test = await db.thumbnail_tests.find_one({"id": data.test_id}, {"_id": 0})
    if not test or test.get("status") != "active":
        return {"message": "Test not active"}
    
    # Update impression count
    await db.thumbnail_tests.update_one(
        {"id": data.test_id},
        {"$inc": {f"variants.{data.variant_index}.impressions": 1}}
    )
    
    return {"message": "Impression recorded"}


@router.post("/click")
async def record_click(
    data: ThumbnailClick,
    user: dict = Depends(get_current_user)
):
    """Record a thumbnail click (when user clicks to watch)"""
    test = await db.thumbnail_tests.find_one({"id": data.test_id}, {"_id": 0})
    if not test or test.get("status") != "active":
        return {"message": "Test not active"}
    
    # Update click count
    await db.thumbnail_tests.update_one(
        {"id": data.test_id},
        {"$inc": {f"variants.{data.variant_index}.clicks": 1}}
    )
    
    return {"message": "Click recorded"}


# ============ CREATOR ROUTES ============

@router.post("/create")
async def create_thumbnail_test(
    data: CreateThumbnailTest,
    user: dict = Depends(get_current_user)
):
    """
    Create a new thumbnail A/B test for a series.
    Creators can only create tests for their own series.
    """
    # Check if user owns this series or is admin
    is_admin = user.get("role") in ["admin", "superadmin"]
    
    if not is_admin:
        series = await db.creator_series.find_one(
            {"id": data.series_id, "creator_id": user.get("creator_id")},
            {"_id": 0}
        )
        if not series:
            raise HTTPException(status_code=403, detail="You don't have permission to test this series")
    
    # Check for existing active test
    existing = await get_active_thumbnail_test(data.series_id)
    if existing:
        raise HTTPException(status_code=400, detail="There's already an active test for this series. End it first.")
    
    if len(data.variants) < 2:
        raise HTTPException(status_code=400, detail="At least 2 variants required for A/B testing")
    
    # Validate weights sum
    total_weight = sum(v.weight for v in data.variants)
    if total_weight != 100:
        raise HTTPException(status_code=400, detail="Variant weights must sum to 100")
    
    test = {
        "id": f"thumb-test-{uuid.uuid4().hex[:8]}",
        "series_id": data.series_id,
        "created_by": user["id"],
        "created_by_role": user.get("role", "creator"),
        "status": "active",
        "variants": [
            {
                "url": v.url,
                "name": v.name,
                "weight": v.weight,
                "impressions": 0,
                "clicks": 0
            }
            for v in data.variants
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "winner": None
    }
    
    await db.thumbnail_tests.insert_one(test)
    if "_id" in test:
        del test["_id"]
    
    return {
        "message": "Thumbnail A/B test created",
        "test": test
    }


@router.get("/series/{series_id}/test")
async def get_series_test(
    series_id: str,
    user: dict = Depends(get_current_user)
):
    """Get the current thumbnail test for a series (if any)"""
    test = await db.thumbnail_tests.find_one(
        {"series_id": series_id},
        {"_id": 0}
    )
    
    if not test:
        return {"test": None, "has_active_test": False}
    
    # Calculate CTR for each variant
    for i, variant in enumerate(test.get("variants", [])):
        impressions = variant.get("impressions", 0)
        clicks = variant.get("clicks", 0)
        variant["ctr"] = round((clicks / impressions * 100) if impressions > 0 else 0, 2)
    
    return {
        "test": test,
        "has_active_test": test.get("status") == "active"
    }


@router.get("/my-tests")
async def get_my_tests(
    user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, enum=["active", "ended"]),
    limit: int = Query(20, ge=1, le=50)
):
    """Get all thumbnail tests created by current user"""
    query = {"created_by": user["id"]}
    if status:
        query["status"] = status
    
    tests = await db.thumbnail_tests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add CTR calculations
    for test in tests:
        for variant in test.get("variants", []):
            impressions = variant.get("impressions", 0)
            clicks = variant.get("clicks", 0)
            variant["ctr"] = round((clicks / impressions * 100) if impressions > 0 else 0, 2)
    
    return {"tests": tests}


@router.post("/{test_id}/end")
async def end_thumbnail_test(
    test_id: str,
    winner_index: Optional[int] = Query(None, description="Index of winning variant (0-based)"),
    user: dict = Depends(get_current_user)
):
    """End a thumbnail test and optionally declare a winner"""
    test = await db.thumbnail_tests.find_one({"id": test_id}, {"_id": 0})
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check permission
    is_admin = user.get("role") in ["admin", "superadmin"]
    if not is_admin and test.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="You don't have permission to end this test")
    
    if test.get("status") != "active":
        raise HTTPException(status_code=400, detail="Test is not active")
    
    update_data = {
        "status": "ended",
        "ended_at": datetime.now(timezone.utc).isoformat()
    }
    
    if winner_index is not None and 0 <= winner_index < len(test.get("variants", [])):
        winner_variant = test["variants"][winner_index]
        update_data["winner"] = {
            "index": winner_index,
            "name": winner_variant.get("name"),
            "url": winner_variant.get("url")
        }
    
    await db.thumbnail_tests.update_one(
        {"id": test_id},
        {"$set": update_data}
    )
    
    return {"message": "Test ended", "winner": update_data.get("winner")}


@router.post("/{test_id}/apply-winner")
async def apply_winning_thumbnail(
    test_id: str,
    user: dict = Depends(get_current_user)
):
    """Apply the winning thumbnail as the series' default thumbnail"""
    test = await db.thumbnail_tests.find_one({"id": test_id}, {"_id": 0})
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.get("status") != "ended":
        raise HTTPException(status_code=400, detail="End the test first before applying winner")
    
    winner = test.get("winner")
    if not winner:
        raise HTTPException(status_code=400, detail="No winner declared for this test")
    
    # Check permission
    is_admin = user.get("role") in ["admin", "superadmin"]
    if not is_admin and test.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="You don't have permission")
    
    # Update series thumbnail
    series_id = test["series_id"]
    winning_url = winner["url"]
    
    # Update both main series and creator series
    await db.series.update_one(
        {"id": series_id},
        {"$set": {"thumbnail": winning_url}}
    )
    
    await db.creator_series.update_one(
        {"id": series_id},
        {"$set": {"thumbnail": winning_url}}
    )
    
    return {
        "message": "Winning thumbnail applied",
        "series_id": series_id,
        "new_thumbnail": winning_url
    }


# ============ ADMIN ROUTES ============

@router.get("/admin/all")
async def get_all_tests(
    user: dict = Depends(require_admin),
    status: Optional[str] = Query(None, enum=["active", "ended"]),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all thumbnail tests (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    tests = await db.thumbnail_tests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add CTR and series info
    for test in tests:
        series = await db.series.find_one(
            {"id": test["series_id"]},
            {"_id": 0, "title": 1}
        )
        test["series_title"] = series.get("title") if series else "Unknown"
        
        for variant in test.get("variants", []):
            impressions = variant.get("impressions", 0)
            clicks = variant.get("clicks", 0)
            variant["ctr"] = round((clicks / impressions * 100) if impressions > 0 else 0, 2)
    
    return {"tests": tests}


@router.get("/admin/stats")
async def get_thumbnail_testing_stats(user: dict = Depends(require_admin)):
    """Get overall thumbnail testing statistics"""
    total_tests = await db.thumbnail_tests.count_documents({})
    active_tests = await db.thumbnail_tests.count_documents({"status": "active"})
    ended_tests = await db.thumbnail_tests.count_documents({"status": "ended"})
    
    # Get tests with significant data
    pipeline = [
        {"$match": {"status": "ended", "winner": {"$exists": True}}},
        {"$count": "with_winner"}
    ]
    winner_result = await db.thumbnail_tests.aggregate(pipeline).to_list(1)
    tests_with_winner = winner_result[0]["with_winner"] if winner_result else 0
    
    # Average improvement from winners
    # (Would need more complex calculation in production)
    
    return {
        "total_tests": total_tests,
        "active_tests": active_tests,
        "ended_tests": ended_tests,
        "tests_with_winner": tests_with_winner,
        "decision_rate": round((tests_with_winner / ended_tests * 100) if ended_tests > 0 else 0, 1)
    }
