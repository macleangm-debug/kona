"""
Payment and store routes
Supports Stripe (international cards) and Flutterwave (African mobile money)
"""
import stripe
import httpx
import hmac
import hashlib
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import uuid

from models.schemas import CheckoutRequest, SubscribeRequest
from services import db, get_current_user, detect_country_from_ip, get_payment_config, convert_price
from config.settings import STRIPE_API_KEY, COIN_PACKAGES, SUBSCRIPTION_PLANS, AFRICAN_COUNTRIES, INTERNATIONAL_CONFIG

router = APIRouter(tags=["Payments"])

# Initialize Stripe
stripe.api_key = STRIPE_API_KEY

# Frontend URL for redirects (from environment)
FRONTEND_URL = os.environ.get("APP_FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000")).rstrip("/")

# Flutterwave configuration
FLUTTERWAVE_SECRET_KEY = os.environ.get("FLUTTERWAVE_SECRET_KEY", "")
FLUTTERWAVE_PUBLIC_KEY = os.environ.get("FLUTTERWAVE_PUBLIC_KEY", "")
FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3"


class FlutterwaveCheckoutRequest(BaseModel):
    package_id: str
    payment_method: str  # mpesa, card, etc.
    phone_number: str
    email: str
    country_code: str = "TZ"


class FlutterwaveWebhookPayload(BaseModel):
    event: str
    data: dict

@router.get("/geo/detect")
async def detect_geo(request: Request):
    """Detect user location from IP"""
    client_ip = request.client.host
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    geo_data = await detect_country_from_ip(client_ip)
    return geo_data

@router.get("/geo/countries")
async def get_countries():
    """Get list of supported countries with payment methods and phone prefixes"""
    # Phone prefixes for each country
    PHONE_PREFIXES = {
        "KE": "+254",  # Kenya
        "TZ": "+255",  # Tanzania
        "UG": "+256",  # Uganda
        "RW": "+250",  # Rwanda
        "CD": "+243",  # DR Congo
        "BI": "+257",  # Burundi
        "SS": "+211",  # South Sudan
        "GH": "+233",  # Ghana
        "NG": "+234",  # Nigeria
        "ZA": "+27",   # South Africa
        "ET": "+251",  # Ethiopia
        "MW": "+265",  # Malawi
        "ZM": "+260",  # Zambia
        "ZW": "+263",  # Zimbabwe
        "MZ": "+258",  # Mozambique
        "SN": "+221",  # Senegal
        "CI": "+225",  # Ivory Coast
        "CM": "+237",  # Cameroon
        "AO": "+244",  # Angola
        "MG": "+261",  # Madagascar
    }
    
    countries = []
    
    # Add African countries
    for code, config in AFRICAN_COUNTRIES.items():
        countries.append({
            "code": code,
            "name": config["name"],
            "currency": config["currency"],
            "phone_prefix": PHONE_PREFIXES.get(code, ""),
            "payment_methods": [
                {"id": pm, "name": pm.replace("_", " ").title(), "type": "mobilemoney" if pm != "card" else "card"}
                for pm in config["payment_methods"]
            ]
        })
    
    # Add International option
    countries.append({
        "code": "INTL",
        "name": "International",
        "currency": "USD",
        "phone_prefix": "",
        "payment_methods": [
            {"id": "card", "name": "Credit/Debit Card", "type": "card"}
        ]
    })
    
    return countries

@router.get("/location/detect")
async def detect_location(request: Request):
    """Detect user location from IP"""
    client_ip = request.client.host
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    geo_data = await detect_country_from_ip(client_ip)
    payment_config = get_payment_config(geo_data["country_code"])
    
    return {
        **geo_data,
        "payment_config": payment_config
    }

@router.get("/store/packages")
async def get_packages(country_code: str = "US"):
    """Get coin packages with local pricing"""
    payment_config = get_payment_config(country_code)
    exchange_rate = payment_config.get("exchange_rate", 1.0)
    currency = payment_config.get("currency", "USD")
    
    packages = []
    for pkg in COIN_PACKAGES:
        local_price = convert_price(pkg["price"], exchange_rate)
        packages.append({
            **pkg,
            "local_price": local_price,
            "currency": currency,
            "display_price": f"{currency} {local_price:,.0f}" if currency != "USD" else f"${pkg['price']:.2f}"
        })
    
    return {
        "packages": packages,
        "payment_methods": payment_config.get("payment_methods", ["card"]),
        "currency": currency,
        "is_african": payment_config.get("is_african", False)
    }

@router.post("/store/checkout")
async def create_checkout(data: CheckoutRequest, user: dict = Depends(get_current_user)):
    """Create checkout session"""
    package = next((p for p in COIN_PACKAGES if p["id"] == data.package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    country_code = data.country_code or "US"
    payment_config = get_payment_config(country_code)
    
    # Use Stripe for card payments
    if data.payment_method == "card":
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": int(package["price"] * 100),
                        "product_data": {
                            "name": f"{package['coins']} Coins" + (f" (+{package['bonus']} bonus)" if package['bonus'] else ""),
                        },
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=f"{FRONTEND_URL}/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/store",
                metadata={
                    "user_id": user["id"],
                    "package_id": package["id"],
                    "coins": package["coins"] + package["bonus"]
                }
            )
            return {
                "checkout_url": session.url,
                "session_id": session.id,
                "provider": "stripe"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # Mobile money payments use Flutterwave
    elif data.payment_method in ["mpesa", "mtn_momo", "airtel_money", "tigopesa", "vodafone_cash", "orange_money", "ecocash"]:
        if not FLUTTERWAVE_SECRET_KEY:
            raise HTTPException(
                status_code=503, 
                detail="Mobile money payments not configured. Please add Flutterwave API keys."
            )
        
        # Return info for frontend to use Flutterwave inline checkout
        local_amount = convert_price(package["price"], payment_config.get("exchange_rate", 1.0))
        return {
            "provider": "flutterwave",
            "public_key": FLUTTERWAVE_PUBLIC_KEY,
            "payment_method": data.payment_method,
            "amount": local_amount,
            "currency": payment_config.get("currency", "TZS"),
            "package_id": package["id"],
            "coins": package["coins"] + package["bonus"],
            "user_id": user["id"],
            "tx_ref": f"KONA-{user['id'][:8]}-{uuid.uuid4().hex[:8]}",
            "redirect_url": f"{FRONTEND_URL}/payment/success"
        }
    
    raise HTTPException(status_code=400, detail="Invalid payment method")


# ============ FLUTTERWAVE INTEGRATION ============

@router.post("/flutterwave/checkout")
async def flutterwave_checkout(data: FlutterwaveCheckoutRequest, user: dict = Depends(get_current_user)):
    """Initialize Flutterwave payment for mobile money"""
    
    if not FLUTTERWAVE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Flutterwave not configured")
    
    package = next((p for p in COIN_PACKAGES if p["id"] == data.package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    payment_config = get_payment_config(data.country_code)
    local_amount = convert_price(package["price"], payment_config.get("exchange_rate", 1.0))
    currency = payment_config.get("currency", "TZS")
    
    tx_ref = f"KONA-{user['id'][:8]}-{uuid.uuid4().hex[:8]}"
    
    # Map payment method to Flutterwave type
    payment_type_map = {
        "mpesa": "mpesa",
        "tigopesa": "mpesa",  # Tanzania mobile money
        "mtn_momo": "mobile_money_uganda",
        "airtel_money": "mobile_money_uganda",
        "vodafone_cash": "mobile_money_ghana",
        "orange_money": "mobile_money_franco",
        "card": "card"
    }
    
    flw_payment_type = payment_type_map.get(data.payment_method, "mpesa")
    
    # Country code mapping
    country_map = {
        "TZ": "TZ", "KE": "KE", "UG": "UG", "GH": "GH", 
        "NG": "NG", "RW": "RW", "ZA": "ZA"
    }
    country = country_map.get(data.country_code, "TZ")
    
    # Store pending payment in database
    payment_record = {
        "id": tx_ref,
        "user_id": user["id"],
        "package_id": package["id"],
        "coins_to_award": package["coins"] + package["bonus"],
        "amount": local_amount,
        "currency": currency,
        "payment_method": data.payment_method,
        "provider": "flutterwave",
        "status": "pending",
        "phone_number": data.phone_number,
        "email": data.email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_record)
    
    # Initialize payment with Flutterwave
    headers = {
        "Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "tx_ref": tx_ref,
        "amount": str(int(local_amount)),
        "currency": currency,
        "email": data.email,
        "phone_number": data.phone_number,
        "type": flw_payment_type,
        "country": country,
        "meta": {
            "user_id": user["id"],
            "package_id": package["id"],
            "coins": package["coins"] + package["bonus"]
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FLUTTERWAVE_BASE_URL}/charges?type={flw_payment_type}",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            result = response.json()
        
        if result.get("status") == "success":
            return {
                "success": True,
                "tx_ref": tx_ref,
                "message": result.get("message", "Payment initiated"),
                "data": result.get("data", {}),
                "provider": "flutterwave",
                "amount": local_amount,
                "currency": currency
            }
        else:
            # Update payment status to failed
            await db.payments.update_one(
                {"id": tx_ref},
                {"$set": {"status": "failed", "error": result.get("message")}}
            )
            raise HTTPException(
                status_code=400, 
                detail=result.get("message", "Payment initiation failed")
            )
    
    except httpx.RequestError as e:
        await db.payments.update_one(
            {"id": tx_ref},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=f"Payment service error: {str(e)}")


@router.post("/flutterwave/verify/{tx_ref}")
async def verify_flutterwave_payment(tx_ref: str, user: dict = Depends(get_current_user)):
    """Verify Flutterwave payment and award coins"""
    
    if not FLUTTERWAVE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Flutterwave not configured")
    
    # Find payment record
    payment = await db.payments.find_one({"id": tx_ref, "user_id": user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") == "completed":
        return {"success": True, "message": "Payment already verified", "coins_awarded": payment.get("coins_to_award", 0)}
    
    # Verify with Flutterwave
    headers = {"Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref={tx_ref}",
                headers=headers,
                timeout=30.0
            )
            result = response.json()
        
        if result.get("status") == "success":
            tx_data = result.get("data", {})
            
            if tx_data.get("status") == "successful":
                # Award coins to user
                coins_to_award = payment.get("coins_to_award", 0)
                
                await db.users.update_one(
                    {"id": user["id"]},
                    {
                        "$inc": {"coins": coins_to_award},
                        "$set": {"has_made_purchase": True}
                    }
                )
                
                # Update payment status
                await db.payments.update_one(
                    {"id": tx_ref},
                    {
                        "$set": {
                            "status": "completed",
                            "flutterwave_id": tx_data.get("id"),
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                return {
                    "success": True,
                    "message": "Payment verified successfully",
                    "coins_awarded": coins_to_award,
                    "new_balance": (user.get("coins", 0) + coins_to_award)
                }
            else:
                await db.payments.update_one(
                    {"id": tx_ref},
                    {"$set": {"status": "failed", "error": tx_data.get("status")}}
                )
                raise HTTPException(status_code=400, detail=f"Payment status: {tx_data.get('status')}")
        else:
            raise HTTPException(status_code=400, detail=result.get("message", "Verification failed"))
    
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


@router.post("/flutterwave/webhook")
async def flutterwave_webhook(request: Request):
    """Handle Flutterwave webhook events"""
    
    # Get webhook secret hash for verification
    signature = request.headers.get("verif-hash")
    webhook_secret = os.environ.get("FLUTTERWAVE_WEBHOOK_SECRET", "")
    
    # Verify webhook signature if secret is configured
    if webhook_secret and signature != webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    event = payload.get("event")
    data = payload.get("data", {})
    
    # Log webhook for debugging
    await db.webhook_logs.insert_one({
        "provider": "flutterwave",
        "event": event,
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    if event == "charge.completed":
        tx_ref = data.get("tx_ref")
        status = data.get("status")
        
        if status == "successful" and tx_ref:
            # Find and complete payment
            payment = await db.payments.find_one({"id": tx_ref})
            
            if payment and payment.get("status") != "completed":
                # Award coins
                coins_to_award = payment.get("coins_to_award", 0)
                user_id = payment.get("user_id")
                
                await db.users.update_one(
                    {"id": user_id},
                    {
                        "$inc": {"coins": coins_to_award},
                        "$set": {"has_made_purchase": True}
                    }
                )
                
                # Update payment
                await db.payments.update_one(
                    {"id": tx_ref},
                    {
                        "$set": {
                            "status": "completed",
                            "flutterwave_id": data.get("id"),
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
    
    return {"status": "success"}


@router.get("/flutterwave/config")
async def get_flutterwave_config():
    """Get Flutterwave public key for frontend"""
    return {
        "configured": bool(FLUTTERWAVE_PUBLIC_KEY),
        "public_key": FLUTTERWAVE_PUBLIC_KEY if FLUTTERWAVE_PUBLIC_KEY else None
    }


# ============ SUBSCRIPTIONS ============
@router.get("/subscriptions/plans")
async def get_subscription_plans(country_code: str = "US"):
    """Get subscription plans with local pricing"""
    payment_config = get_payment_config(country_code)
    exchange_rate = payment_config.get("exchange_rate", 1.0)
    currency = payment_config.get("currency", "USD")
    
    plans = []
    for plan in SUBSCRIPTION_PLANS:
        local_price = convert_price(plan["price"], exchange_rate)
        plans.append({
            **plan,
            "local_price": local_price,
            "currency": currency,
            "display_price": f"{currency} {local_price:,.0f}/mo" if currency != "USD" else f"${plan['price']:.2f}/mo"
        })
    
    return {
        "plans": plans,
        "payment_methods": payment_config.get("payment_methods", ["card"]),
        "currency": currency
    }

@router.post("/subscriptions/subscribe")
async def subscribe(data: SubscribeRequest, user: dict = Depends(get_current_user)):
    """Create subscription"""
    plan = next((p for p in SUBSCRIPTION_PLANS if p["id"] == data.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check for existing subscription
    existing = await db.subscriptions.find_one({
        "user_id": user["id"],
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed. Cancel current subscription first.")
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(plan["price"] * 100),
                    "product_data": {
                        "name": f"{plan['name']} Subscription",
                        "description": plan["description"],
                    },
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/subscriptions",
            metadata={
                "user_id": user["id"],
                "plan_id": plan["id"],
                "coins_per_month": plan["coins_per_month"]
            }
        )
        return {
            "checkout_url": session.url,
            "session_id": session.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """Get user's subscription status"""
    subscription = await db.subscriptions.find_one(
        {"user_id": user["id"], "status": "active"},
        {"_id": 0}
    )
    
    if subscription:
        plan = next((p for p in SUBSCRIPTION_PLANS if p["id"] == subscription.get("plan_id")), None)
        return {
            "is_subscribed": True,
            "subscription": subscription,
            "plan": plan
        }
    
    return {"is_subscribed": False}

@router.post("/subscriptions/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """Cancel active subscription"""
    subscription = await db.subscriptions.find_one({
        "user_id": user["id"],
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # In production, would cancel via Stripe API
    await db.subscriptions.update_one(
        {"id": subscription["id"]},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Subscription cancelled"}
