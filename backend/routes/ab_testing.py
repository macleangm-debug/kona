"""
A/B Testing Admin Routes
Manage pricing experiments and view results
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from services.auth import get_current_user
from services.ab_testing import ab_testing_service

router = APIRouter(prefix="/admin/ab-tests", tags=["admin-ab-testing"])


# ============ MODELS ============

class VariantCreate(BaseModel):
    name: str
    pricing_style: str  # "value", "premium", or "exact"
    weight: int  # Traffic allocation percentage


class TestCreate(BaseModel):
    name: str
    description: str
    variants: List[VariantCreate]
    target_tier: str = "all"  # "all", "basic", "premium", "vip"
    traffic_percentage: int = 100


class TestEnd(BaseModel):
    winner: Optional[str] = None


# ============ HELPER ============

async def verify_admin(user: dict):
    """Verify user is admin"""
    if user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")


# ============ ROUTES ============

@router.get("/")
async def list_tests(
    status: Optional[str] = Query(None, description="Filter by status: active, ended"),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """List all A/B tests"""
    await verify_admin(user)
    
    tests = await ab_testing_service.get_all_tests(status=status, limit=limit)
    
    return {
        "status": "success",
        "tests": tests,
        "count": len(tests)
    }


@router.post("/")
async def create_test(
    data: TestCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create a new A/B test
    
    Example body:
    {
        "name": "Premium vs Value for VIP",
        "description": "Test if premium pricing converts better for VIP tier",
        "variants": [
            {"name": "Control (Value)", "pricing_style": "value", "weight": 50},
            {"name": "Premium Style", "pricing_style": "premium", "weight": 50}
        ],
        "target_tier": "vip",
        "traffic_percentage": 100
    }
    """
    await verify_admin(user)
    
    # Validate pricing styles
    valid_styles = ["value", "premium", "exact"]
    for variant in data.variants:
        if variant.pricing_style not in valid_styles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid pricing_style '{variant.pricing_style}'. Must be one of: {valid_styles}"
            )
    
    # Validate target tier
    valid_tiers = ["all", "basic", "premium", "vip"]
    if data.target_tier not in valid_tiers:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target_tier '{data.target_tier}'. Must be one of: {valid_tiers}"
        )
    
    try:
        test = await ab_testing_service.create_test(
            test_name=data.name,
            description=data.description,
            variants=[v.dict() for v in data.variants],
            target_tier=data.target_tier,
            traffic_percentage=data.traffic_percentage
        )
        
        return {
            "status": "success",
            "message": "A/B test created",
            "test": test
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/active")
async def get_active_tests(user: dict = Depends(get_current_user)):
    """Get all active A/B tests"""
    await verify_admin(user)
    
    tests = await ab_testing_service.get_all_tests(status="active")
    
    return {
        "status": "success",
        "active_tests": tests,
        "count": len(tests)
    }


@router.get("/{test_id}")
async def get_test(test_id: str, user: dict = Depends(get_current_user)):
    """Get a specific test by ID"""
    await verify_admin(user)
    
    results = await ab_testing_service.get_test_results(test_id)
    
    if not results:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {
        "status": "success",
        **results
    }


@router.get("/{test_id}/results")
async def get_test_results(test_id: str, user: dict = Depends(get_current_user)):
    """Get detailed results for a test with statistical analysis"""
    await verify_admin(user)
    
    results = await ab_testing_service.get_test_results(test_id)
    
    if not results:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {
        "status": "success",
        **results
    }


@router.post("/{test_id}/end")
async def end_test(
    test_id: str,
    data: TestEnd,
    user: dict = Depends(get_current_user)
):
    """
    End an A/B test and optionally declare a winner
    
    Body:
    {
        "winner": "Control (Value)"  // Optional - name of winning variant
    }
    """
    await verify_admin(user)
    
    test = await ab_testing_service.end_test(test_id, winner=data.winner)
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {
        "status": "success",
        "message": "Test ended" + (f" with winner: {data.winner}" if data.winner else ""),
        "test": test
    }


@router.post("/{test_id}/apply-winner")
async def apply_winner(test_id: str, user: dict = Depends(get_current_user)):
    """
    Apply the winning variant as the new default pricing style
    The test must be ended with a declared winner first
    """
    await verify_admin(user)
    
    try:
        result = await ab_testing_service.apply_winner(test_id)
        
        return {
            "status": "success",
            "message": f"Winner applied! '{result['pricing_style']}' style now active for {result['applied_to']}",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ PUBLIC ENDPOINT (for frontend) ============

@router.get("/user/variant")
async def get_user_variant(
    tier: str = Query("all", description="Tier to check: all, basic, premium, vip"),
    user: dict = Depends(get_current_user)
):
    """
    Get the A/B test variant assigned to the current user
    Called by frontend when displaying pricing
    """
    variant = await ab_testing_service.get_user_variant(user["id"], tier)
    
    if variant and variant.get("is_in_test") and variant.get("variant_name"):
        # Record impression
        await ab_testing_service.record_impression(
            variant["test_id"],
            variant["variant_name"],
            user["id"]
        )
    
    return {
        "status": "success",
        "variant": variant
    }
