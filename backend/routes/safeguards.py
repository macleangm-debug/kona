"""
Anti-Abuse & Monetization Safeguards
Industry-standard mechanisms to prevent freeloading and encourage purchases
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from services import db, get_current_user

router = APIRouter(prefix="/economy", tags=["Economy Safeguards"])

# ============ CONFIGURATION ============
COIN_EXPIRY_DAYS = 30                    # Coins expire after 30 days
FREELOADER_THRESHOLD_DAYS = 7            # Days without purchase before penalties
DIMINISHING_RETURNS_FACTOR = 0.5         # 50% reduction after threshold
MINIMUM_PURCHASE_FOR_PREMIUM_FEATURES = 1  # At least 1 purchase to access premium games
DAILY_FREE_COIN_CAP = 15                 # Max free coins per day (across all sources)


# ============ COIN EXPIRY SYSTEM ============
class CoinTransaction(BaseModel):
    amount: int
    source: str  # "purchase", "reward", "referral", "bonus"
    expires_at: Optional[str] = None
    
    
async def add_coins_with_expiry(user_id: str, amount: int, source: str):
    """Add coins with expiry tracking for free coins"""
    now = datetime.now(timezone.utc)
    
    # Purchased coins never expire, free coins expire in 30 days
    expires_at = None
    if source != "purchase":
        expires_at = (now + timedelta(days=COIN_EXPIRY_DAYS)).isoformat()
    
    transaction = {
        "amount": amount,
        "source": source,
        "created_at": now.isoformat(),
        "expires_at": expires_at,
        "expired": False
    }
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$inc": {"coins": amount},
            "$push": {"coin_transactions": transaction}
        }
    )
    
    return transaction


async def expire_old_coins(user: dict) -> int:
    """Expire coins older than 30 days and return amount expired"""
    now = datetime.now(timezone.utc)
    transactions = user.get("coin_transactions", [])
    
    total_expired = 0
    updated_transactions = []
    
    for tx in transactions:
        if tx.get("expired"):
            updated_transactions.append(tx)
            continue
            
        expires_at = tx.get("expires_at")
        if expires_at:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if now > expiry_date:
                tx["expired"] = True
                total_expired += tx["amount"]
        
        updated_transactions.append(tx)
    
    if total_expired > 0:
        new_coins = max(0, user["coins"] - total_expired)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "coins": new_coins,
                "coin_transactions": updated_transactions,
                "last_expiry_check": now.isoformat()
            }}
        )
    
    return total_expired


# ============ FREELOADER DETECTION ============
def is_freeloader(user: dict) -> bool:
    """Check if user has never made a purchase"""
    total_purchases = user.get("total_purchases", 0)
    return total_purchases == 0


def days_since_last_purchase(user: dict) -> int:
    """Get days since last purchase (or account creation if never purchased)"""
    last_purchase = user.get("last_purchase_date")
    
    if not last_purchase:
        # Use account creation date
        created_at = user.get("created_at", datetime.now(timezone.utc).isoformat())
        last_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    else:
        last_date = datetime.fromisoformat(last_purchase.replace('Z', '+00:00'))
    
    now = datetime.now(timezone.utc)
    return (now - last_date).days


def get_reward_multiplier(user: dict) -> float:
    """Get reward multiplier based on purchase history"""
    if not is_freeloader(user):
        return 1.0  # Full rewards for paying users
    
    days = days_since_last_purchase(user)
    
    if days <= FREELOADER_THRESHOLD_DAYS:
        return 1.0  # Grace period - full rewards
    elif days <= FREELOADER_THRESHOLD_DAYS * 2:
        return DIMINISHING_RETURNS_FACTOR  # 50% rewards
    elif days <= FREELOADER_THRESHOLD_DAYS * 3:
        return 0.25  # 25% rewards
    else:
        return 0.1  # 10% rewards (minimum)


def get_daily_free_coins_remaining(user: dict) -> int:
    """Check how many free coins user can still earn today"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    last_reset = user.get("daily_coins_reset_date")
    earned_today = user.get("daily_free_coins_earned", 0)
    
    if last_reset != today:
        return DAILY_FREE_COIN_CAP
    
    return max(0, DAILY_FREE_COIN_CAP - earned_today)


async def record_free_coins_earned(user_id: str, amount: int):
    """Record free coins earned today"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    user = await db.users.find_one({"id": user_id})
    last_reset = user.get("daily_coins_reset_date")
    
    if last_reset != today:
        # Reset counter for new day
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "daily_coins_reset_date": today,
                "daily_free_coins_earned": amount
            }}
        )
    else:
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"daily_free_coins_earned": amount}}
        )


# ============ PREMIUM FEATURE GATES ============
def can_access_premium_games(user: dict) -> bool:
    """Check if user can access premium games (scratch card, trivia, etc.)"""
    total_purchases = user.get("total_purchases", 0)
    return total_purchases >= MINIMUM_PURCHASE_FOR_PREMIUM_FEATURES


# ============ API ENDPOINTS ============
@router.get("/status")
async def get_economy_status(user: dict = Depends(get_current_user)):
    """Get user's economy status including safeguards"""
    # Check for expired coins
    expired = await expire_old_coins(user)
    
    # Refresh user data after expiry
    user = await db.users.find_one({"id": user["id"]})
    
    is_free = is_freeloader(user)
    days_no_purchase = days_since_last_purchase(user)
    multiplier = get_reward_multiplier(user)
    remaining_daily = get_daily_free_coins_remaining(user)
    can_premium = can_access_premium_games(user)
    
    return {
        "coins": user.get("coins", 0),
        "coins_expired_today": expired,
        "is_freeloader": is_free,
        "days_since_purchase": days_no_purchase,
        "reward_multiplier": multiplier,
        "daily_free_coins_remaining": remaining_daily,
        "daily_free_coin_cap": DAILY_FREE_COIN_CAP,
        "can_access_premium_games": can_premium,
        "total_purchases": user.get("total_purchases", 0),
        "warnings": get_warnings(user, is_free, days_no_purchase, multiplier, remaining_daily)
    }


def get_warnings(user: dict, is_free: bool, days: int, multiplier: float, remaining: int) -> list:
    """Generate warning messages for user"""
    warnings = []
    
    if is_free and days > FREELOADER_THRESHOLD_DAYS:
        if multiplier <= 0.5:
            warnings.append({
                "type": "diminishing_returns",
                "message": f"Your rewards are reduced to {int(multiplier * 100)}%. Make a purchase to restore full rewards!",
                "severity": "warning"
            })
    
    if remaining <= 3:
        warnings.append({
            "type": "daily_cap",
            "message": f"Only {remaining} free coins left today. Purchase coins for unlimited access!",
            "severity": "info"
        })
    
    # Check for coins expiring soon
    transactions = user.get("coin_transactions", [])
    now = datetime.now(timezone.utc)
    expiring_soon = 0
    
    for tx in transactions:
        if tx.get("expired"):
            continue
        expires_at = tx.get("expires_at")
        if expires_at:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            days_until = (expiry_date - now).days
            if 0 < days_until <= 7:
                expiring_soon += tx["amount"]
    
    if expiring_soon > 0:
        warnings.append({
            "type": "expiring_coins",
            "message": f"{expiring_soon} coins expiring in 7 days! Use them or buy more.",
            "severity": "warning"
        })
    
    return warnings


@router.post("/apply-reward")
async def apply_reward_with_safeguards(
    amount: int,
    source: str,
    user: dict = Depends(get_current_user)
):
    """Apply a reward with all safeguards (multiplier, daily cap, expiry)"""
    
    # Check daily cap
    remaining = get_daily_free_coins_remaining(user)
    if remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail="Daily free coin limit reached! Purchase coins for more."
        )
    
    # Apply multiplier for freeloaders
    multiplier = get_reward_multiplier(user)
    adjusted_amount = max(1, int(amount * multiplier))  # Minimum 1 coin
    
    # Cap to daily remaining
    final_amount = min(adjusted_amount, remaining)
    
    # Add coins with expiry tracking
    tx = await add_coins_with_expiry(user["id"], final_amount, source)
    
    # Record daily usage
    await record_free_coins_earned(user["id"], final_amount)
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user["id"]})
    
    return {
        "original_amount": amount,
        "multiplier_applied": multiplier,
        "final_amount": final_amount,
        "new_balance": updated_user["coins"],
        "daily_remaining": remaining - final_amount,
        "expires_in_days": COIN_EXPIRY_DAYS if source != "purchase" else None,
        "message": f"+{final_amount} coins!" if multiplier == 1.0 else f"+{final_amount} coins (reduced - make a purchase for full rewards!)"
    }


@router.get("/expiring")
async def get_expiring_coins(user: dict = Depends(get_current_user)):
    """Get details of coins expiring soon"""
    transactions = user.get("coin_transactions", [])
    now = datetime.now(timezone.utc)
    
    expiring = []
    for tx in transactions:
        if tx.get("expired"):
            continue
        expires_at = tx.get("expires_at")
        if expires_at:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            days_until = (expiry_date - now).days
            if days_until <= 30:
                expiring.append({
                    "amount": tx["amount"],
                    "source": tx["source"],
                    "expires_in_days": max(0, days_until),
                    "expires_at": expires_at
                })
    
    # Sort by expiry date
    expiring.sort(key=lambda x: x["expires_in_days"])
    
    total_expiring = sum(e["amount"] for e in expiring)
    
    return {
        "total_expiring": total_expiring,
        "details": expiring,
        "message": f"{total_expiring} coins expiring soon. Use them or lose them!" if total_expiring > 0 else "No coins expiring soon."
    }
