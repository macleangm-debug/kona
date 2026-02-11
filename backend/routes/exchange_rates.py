"""
Exchange Rate Admin Routes
Admin configuration and analytics for exchange rate margins
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from services.auth import get_current_user
from services.exchange_rates import exchange_rate_service

router = APIRouter(prefix="/admin/exchange-rates", tags=["admin-exchange-rates"])


# ============ MODELS ============

class MarginConfigUpdate(BaseModel):
    default_margin_percent: Optional[float] = None
    country_margins: Optional[Dict[str, float]] = None
    auto_update_enabled: Optional[bool] = None


# ============ HELPER ============

async def verify_admin(user: dict):
    """Verify user is admin"""
    if user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")


# ============ ROUTES ============

@router.get("/rates")
async def get_current_rates(user: dict = Depends(get_current_user)):
    """
    Get current exchange rates with margin info
    Shows market rates, configured margins, and effective rates
    """
    await verify_admin(user)
    return await exchange_rate_service.get_current_rates_display()


@router.post("/rates/refresh")
async def refresh_rates(user: dict = Depends(get_current_user)):
    """
    Force refresh exchange rates from API
    """
    await verify_admin(user)
    
    rates = await exchange_rate_service.get_rates(force_refresh=True)
    display = await exchange_rate_service.get_current_rates_display()
    
    return {
        "status": "success",
        "message": "Exchange rates refreshed",
        "rates_count": len(rates),
        **display
    }


@router.get("/config")
async def get_margin_config(user: dict = Depends(get_current_user)):
    """
    Get current margin configuration
    """
    await verify_admin(user)
    return await exchange_rate_service.get_admin_config()


@router.put("/config")
async def update_margin_config(
    data: MarginConfigUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update margin configuration
    
    Body:
    - default_margin_percent: Default margin (e.g., 3.0 for 3%)
    - country_margins: Per-country overrides {"KE": 2.5, "NG": 4.0}
    - auto_update_enabled: Whether to auto-refresh rates
    """
    await verify_admin(user)
    
    # Validate margins
    if data.default_margin_percent is not None:
        if data.default_margin_percent < 0 or data.default_margin_percent > 50:
            raise HTTPException(
                status_code=400, 
                detail="Margin must be between 0% and 50%"
            )
    
    if data.country_margins:
        for country, margin in data.country_margins.items():
            if margin < 0 or margin > 50:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Margin for {country} must be between 0% and 50%"
                )
    
    updates = {}
    if data.default_margin_percent is not None:
        updates["default_margin_percent"] = data.default_margin_percent
    if data.country_margins is not None:
        updates["country_margins"] = data.country_margins
    if data.auto_update_enabled is not None:
        updates["auto_update_enabled"] = data.auto_update_enabled
    
    result = await exchange_rate_service.update_admin_config(updates)
    
    return {
        "status": "success",
        "message": "Margin configuration updated",
        "config": result
    }


@router.put("/config/country/{country_code}")
async def set_country_margin(
    country_code: str,
    margin_percent: float,
    user: dict = Depends(get_current_user)
):
    """
    Set margin for a specific country
    """
    await verify_admin(user)
    
    if margin_percent < 0 or margin_percent > 50:
        raise HTTPException(
            status_code=400, 
            detail="Margin must be between 0% and 50%"
        )
    
    config = await exchange_rate_service.get_admin_config()
    country_margins = config.get("country_margins", {})
    country_margins[country_code.upper()] = margin_percent
    
    result = await exchange_rate_service.update_admin_config({
        "country_margins": country_margins
    })
    
    return {
        "status": "success",
        "message": f"Margin for {country_code} set to {margin_percent}%",
        "config": result
    }


@router.delete("/config/country/{country_code}")
async def remove_country_margin(
    country_code: str,
    user: dict = Depends(get_current_user)
):
    """
    Remove country-specific margin (will use default)
    """
    await verify_admin(user)
    
    config = await exchange_rate_service.get_admin_config()
    country_margins = config.get("country_margins", {})
    
    if country_code.upper() in country_margins:
        del country_margins[country_code.upper()]
        
        result = await exchange_rate_service.update_admin_config({
            "country_margins": country_margins
        })
        
        return {
            "status": "success",
            "message": f"Country-specific margin removed for {country_code}",
            "config": result
        }
    
    return {
        "status": "info",
        "message": f"No country-specific margin found for {country_code}"
    }


@router.get("/revenue")
async def get_margin_revenue(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    user: dict = Depends(get_current_user)
):
    """
    Get margin revenue analytics
    
    Returns total revenue from exchange rate margins, broken down by:
    - Country
    - Transaction type (subscription, coin_purchase)
    """
    await verify_admin(user)
    
    stats = await exchange_rate_service.get_margin_revenue_stats(start_date, end_date)
    
    return {
        "status": "success",
        **stats
    }


@router.get("/revenue/daily")
async def get_daily_margin_revenue(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user)
):
    """
    Get daily margin revenue for charting
    """
    await verify_admin(user)
    
    from datetime import timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Aggregate by day
    pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": start_date.isoformat(),
                    "$lte": end_date.isoformat()
                }
            }
        },
        {
            "$addFields": {
                "date": {"$substr": ["$created_at", 0, 10]}
            }
        },
        {
            "$group": {
                "_id": "$date",
                "margin_usd": {"$sum": "$margin_usd"},
                "transactions": {"$sum": 1},
                "volume_usd": {"$sum": "$usd_amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_stats = await exchange_rate_service._lock  # Access db through service
    from services.database import db
    daily_stats = await db.exchange_margin_revenue.aggregate(pipeline).to_list(days)
    
    return {
        "status": "success",
        "days": days,
        "data": [
            {
                "date": item["_id"],
                "margin_usd": round(item["margin_usd"], 2),
                "transactions": item["transactions"],
                "volume_usd": round(item["volume_usd"], 2)
            }
            for item in daily_stats
        ]
    }


@router.get("/history")
async def get_rate_history(
    currency: str = Query("kes", description="Currency code"),
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user)
):
    """
    Get exchange rate history for a currency
    """
    await verify_admin(user)
    
    from services.database import db
    from datetime import timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    history = await db.exchange_rate_history.find(
        {"fetched_at": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).sort("fetched_at", -1).to_list(days * 4)  # Multiple fetches per day
    
    currency_lower = currency.lower()
    
    return {
        "status": "success",
        "currency": currency.upper(),
        "history": [
            {
                "date": item["fetched_at"],
                "rate": item["rates"].get(currency_lower, 0)
            }
            for item in history
            if currency_lower in item.get("rates", {})
        ]
    }
