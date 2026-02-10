"""
Subscription Routes
Handles subscription management, upgrades, and payment processing
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from services.database import db
from services.auth import get_current_user
from services.subscriptions import kwikpay_subscription, SubscriptionStatus, PaymentStatus, PAYMENT_PROVIDERS
from config.subscriptions import SUBSCRIPTION_TIERS, get_device_limit, get_tier_features

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ============ MODELS ============

class InitiatePaymentRequest(BaseModel):
    tier: str  # basic, premium, vip
    provider_id: str  # mpesa, mtn_mobile_money, card, etc.
    phone_number: Optional[str] = None
    email: Optional[str] = None

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None


# ============ PUBLIC ROUTES ============

@router.get("/tiers")
async def get_subscription_tiers(country_code: Optional[str] = None):
    """Get all subscription tiers with pricing in local currency if country provided"""
    
    tiers_response = {}
    
    for tier_id, tier_info in SUBSCRIPTION_TIERS.items():
        tier_data = {
            "id": tier_id,
            **tier_info
        }
        
        # Add local pricing if country code provided
        if country_code:
            price_info = kwikpay_subscription.convert_usd_to_local(
                tier_info["price_usd"], 
                country_code
            )
            tier_data["local_price"] = {
                "amount": price_info["local_amount"],
                "currency": price_info["currency"],
                "formatted": f"{price_info['currency']} {price_info['local_amount']:,.0f}"
            }
        
        tiers_response[tier_id] = tier_data
    
    return {
        "tiers": tiers_response,
        "tier_order": ["free", "basic", "premium", "vip"],
        "country_code": country_code
    }

@router.get("/payment-providers/{country_code}")
async def get_payment_providers(country_code: str):
    """Get available payment providers for a country"""
    providers = kwikpay_subscription.get_payment_providers(country_code)
    return providers


# ============ AUTHENTICATED ROUTES ============

@router.get("/my-subscription")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """Get current user's subscription details"""
    
    # Get user's subscription from database
    subscription = await db.subscriptions.find_one(
        {"user_id": user["id"], "status": {"$in": ["active", "pending"]}},
        {"_id": 0}
    )
    
    current_tier = user.get("subscription_tier", "free")
    tier_info = SUBSCRIPTION_TIERS.get(current_tier, SUBSCRIPTION_TIERS["free"])
    
    # Get upgrade options
    tier_order = ["free", "basic", "premium", "vip"]
    current_index = tier_order.index(current_tier) if current_tier in tier_order else 0
    
    upgrade_options = []
    for tier_name in tier_order[current_index + 1:]:
        tier_data = SUBSCRIPTION_TIERS[tier_name]
        upgrade_options.append({
            "tier": tier_name,
            "name": tier_data["name"],
            "price_usd": tier_data["price_usd"],
            "device_limit": tier_data["device_limit"],
            "features": tier_data["features"]
        })
    
    return {
        "current_tier": current_tier,
        "tier_name": tier_info["name"],
        "device_limit": tier_info["device_limit"],
        "features": tier_info["features"],
        "price_usd": tier_info["price_usd"],
        "is_paid": current_tier != "free",
        "subscription": subscription,
        "upgrade_options": upgrade_options,
        "can_downgrade": current_index > 0,
        "benefits": {
            "ad_free": tier_info.get("ad_free", False),
            "download_enabled": tier_info.get("download_enabled", False),
            "max_downloads": tier_info.get("max_downloads", 0),
            "video_quality": tier_info.get("video_quality", "720p"),
            "priority_support": tier_info.get("priority_support", False)
        }
    }

@router.post("/upgrade")
async def initiate_upgrade(
    data: InitiatePaymentRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Initiate a subscription upgrade payment"""
    
    # Validate tier
    if data.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {data.tier}")
    
    if data.tier == "free":
        raise HTTPException(status_code=400, detail="Cannot purchase free tier")
    
    current_tier = user.get("subscription_tier", "free")
    tier_order = ["free", "basic", "premium", "vip"]
    current_index = tier_order.index(current_tier) if current_tier in tier_order else 0
    new_index = tier_order.index(data.tier)
    
    if new_index <= current_index:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot downgrade from {current_tier} to {data.tier}. Contact support for downgrades."
        )
    
    # Get user's country from geo data
    country_code = user.get("geo", {}).get("country_code") or user.get("country_code", "KE")
    
    # Validate provider for country
    providers = kwikpay_subscription.get_payment_providers(country_code)
    valid_provider_ids = [p["id"] for p in providers.get("providers", [])]
    
    if data.provider_id not in valid_provider_ids:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid payment provider. Available: {valid_provider_ids}"
        )
    
    # Check if provider needs phone number
    provider = next((p for p in providers["providers"] if p["id"] == data.provider_id), None)
    if provider and provider.get("type") == "mobile_money" and not data.phone_number:
        raise HTTPException(status_code=400, detail="Phone number required for mobile money payment")
    
    # Initiate payment
    result = await kwikpay_subscription.initiate_subscription_payment(
        user_id=user["id"],
        tier=data.tier,
        country_code=country_code,
        provider_id=data.provider_id,
        phone_number=data.phone_number,
        email=data.email or user.get("email")
    )
    
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result.get("message", "Payment initiation failed"))
    
    # Store pending payment in database
    payment_record = {
        "id": result["data"]["payment_id"],
        "user_id": user["id"],
        "type": "subscription_upgrade",
        "from_tier": current_tier,
        "to_tier": data.tier,
        "amount_usd": result["data"]["amount"]["usd"],
        "amount_local": result["data"]["amount"]["local"],
        "currency": result["data"]["amount"]["currency"],
        "provider_id": data.provider_id,
        "phone_number": data.phone_number,
        "status": PaymentStatus.PENDING.value,
        "country_code": country_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": result["data"].get("expires_at")
    }
    
    await db.subscription_payments.insert_one(payment_record)
    
    return result

@router.get("/payment/{payment_id}/status")
async def check_payment_status(payment_id: str, user: dict = Depends(get_current_user)):
    """Check the status of a subscription payment"""
    
    # Get payment record
    payment = await db.subscription_payments.find_one(
        {"id": payment_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check with KwikPay
    result = await kwikpay_subscription.check_payment_status(payment_id)
    
    if result["status"] == "success" and result["data"]["payment_status"] == "completed":
        # Payment successful - upgrade user's subscription
        new_tier = payment["to_tier"]
        tier_info = SUBSCRIPTION_TIERS[new_tier]
        
        # Update user's subscription tier
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "subscription_tier": new_tier,
                    "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Create subscription record
        subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
        subscription = {
            "id": subscription_id,
            "user_id": user["id"],
            "tier": new_tier,
            "status": SubscriptionStatus.ACTIVE.value,
            "payment_id": payment_id,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "auto_renew": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.subscriptions.insert_one(subscription)
        
        # Update payment record
        await db.subscription_payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": PaymentStatus.COMPLETED.value,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "subscription_id": subscription_id,
                    "receipt_number": result["data"].get("receipt_number")
                }
            }
        )
        
        return {
            "status": "success",
            "payment_status": "completed",
            "message": f"Congratulations! You're now a {tier_info['name']} subscriber!",
            "subscription": {
                "tier": new_tier,
                "tier_name": tier_info["name"],
                "device_limit": tier_info["device_limit"],
                "expires_at": subscription["expires_at"],
                "features": tier_info["features"]
            }
        }
    
    return {
        "status": "pending",
        "payment_status": result.get("data", {}).get("payment_status", "pending"),
        "message": "Payment is being processed. Please wait...",
        "payment": payment
    }

@router.post("/payment/{payment_id}/simulate-success")
async def simulate_payment_success(payment_id: str, user: dict = Depends(get_current_user)):
    """
    DEMO ENDPOINT: Simulate successful payment for testing
    In production, this would be replaced by KwikPay webhook
    """
    
    # Get payment record
    payment = await db.subscription_payments.find_one(
        {"id": payment_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] == PaymentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    # Upgrade user's subscription
    new_tier = payment["to_tier"]
    tier_info = SUBSCRIPTION_TIERS[new_tier]
    
    # Update user's subscription tier
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "subscription_tier": new_tier,
                "subscription_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create subscription record
    subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
    subscription = {
        "id": subscription_id,
        "user_id": user["id"],
        "tier": new_tier,
        "status": SubscriptionStatus.ACTIVE.value,
        "payment_id": payment_id,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "auto_renew": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscriptions.insert_one(subscription)
    
    # Update payment record
    await db.subscription_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": PaymentStatus.COMPLETED.value,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "subscription_id": subscription_id,
                "receipt_number": f"RCP{uuid.uuid4().hex[:8].upper()}"
            }
        }
    )
    
    return {
        "status": "success",
        "message": f"Payment simulated successfully! You're now a {tier_info['name']} subscriber!",
        "subscription": {
            "id": subscription_id,
            "tier": new_tier,
            "tier_name": tier_info["name"],
            "device_limit": tier_info["device_limit"],
            "expires_at": subscription["expires_at"],
            "features": tier_info["features"]
        }
    }

@router.post("/cancel")
async def cancel_subscription(
    data: CancelSubscriptionRequest,
    user: dict = Depends(get_current_user)
):
    """Cancel current subscription (stops auto-renewal)"""
    
    current_tier = user.get("subscription_tier", "free")
    
    if current_tier == "free":
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # Get active subscription
    subscription = await db.subscriptions.find_one(
        {"user_id": user["id"], "status": SubscriptionStatus.ACTIVE.value},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Cancel subscription (user keeps access until expires_at)
    await db.subscriptions.update_one(
        {"id": subscription["id"]},
        {
            "$set": {
                "status": SubscriptionStatus.CANCELLED.value,
                "auto_renew": False,
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "cancellation_reason": data.reason
            }
        }
    )
    
    tier_info = SUBSCRIPTION_TIERS.get(current_tier, {})
    
    return {
        "status": "success",
        "message": "Subscription cancelled. You'll keep your benefits until the end of your billing period.",
        "access_until": subscription.get("expires_at"),
        "current_tier": current_tier,
        "tier_name": tier_info.get("name", current_tier),
        "will_downgrade_to": "free"
    }

@router.get("/payment-history")
async def get_payment_history(user: dict = Depends(get_current_user)):
    """Get user's subscription payment history"""
    
    payments = await db.subscription_payments.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "payments": payments,
        "total": len(payments)
    }
