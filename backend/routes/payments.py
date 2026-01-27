"""
Payment and store routes
"""
import stripe
from fastapi import APIRouter, HTTPException, Depends, Request

from models.schemas import CheckoutRequest, SubscribeRequest
from services import db, get_current_user, detect_country_from_ip, get_payment_config, convert_price
from config.settings import STRIPE_API_KEY, COIN_PACKAGES, SUBSCRIPTION_PLANS, AFRICAN_COUNTRIES, INTERNATIONAL_CONFIG

router = APIRouter(tags=["Payments"])

# Initialize Stripe
stripe.api_key = STRIPE_API_KEY

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
    """Get list of supported countries with payment methods"""
    countries = []
    
    # Add African countries
    for code, config in AFRICAN_COUNTRIES.items():
        countries.append({
            "code": code,
            "name": config["name"],
            "currency": config["currency"],
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
                success_url=f"https://kona.app/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url="https://kona.app/store",
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
    
    # Mobile money payments would use Flutterwave
    elif data.payment_method in ["mpesa", "mtn_momo", "airtel_money"]:
        return {
            "message": "Mobile money integration requires Flutterwave API keys",
            "provider": "flutterwave",
            "payment_method": data.payment_method,
            "amount": convert_price(package["price"], payment_config.get("exchange_rate", 1.0)),
            "currency": payment_config.get("currency", "USD")
        }
    
    raise HTTPException(status_code=400, detail="Invalid payment method")

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
            success_url=f"https://kona.app/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url="https://kona.app/subscriptions",
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
