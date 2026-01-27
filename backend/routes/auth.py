"""
Authentication routes
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from services import db, hash_password, verify_password, create_token, generate_referral_code, get_current_user
from config.settings import REFERRAL_REWARD_REFERRER, REFERRAL_REWARD_REFEREE

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    referral_code = generate_referral_code(user_id)
    
    # Base coins
    coins = 50  # Welcome bonus
    referrer_id = None
    
    # Process referral code if provided
    if data.referral_code:
        referrer = await db.users.find_one({"referral_code": data.referral_code.upper()})
        if referrer:
            referrer_id = referrer["id"]
            coins += REFERRAL_REWARD_REFEREE  # Referee bonus
            
            # Update referrer
            await db.users.update_one(
                {"id": referrer_id},
                {
                    "$inc": {
                        "coins": REFERRAL_REWARD_REFERRER,
                        "referral_count": 1,
                        "referral_earnings": REFERRAL_REWARD_REFERRER
                    }
                }
            )
            
            # Record referral
            await db.referrals.insert_one({
                "id": str(uuid.uuid4()),
                "referrer_id": referrer_id,
                "referee_id": user_id,
                "referee_email": data.email,
                "referrer_reward": REFERRAL_REWARD_REFERRER,
                "referee_reward": REFERRAL_REWARD_REFEREE,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "coins": coins,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_daily_reward": None,
        "referral_code": referral_code,
        "referral_count": 0,
        "referral_earnings": 0,
        "referred_by": referrer_id,
        "my_list": [],
        "unlocked_episodes": [],
        "watch_progress": {},
        "reminders": [],
        "is_admin": False,
        "claimed_milestones": []
    }
    
    await db.users.insert_one(user)
    del user["password_hash"]
    if "_id" in user:
        del user["_id"]
    
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "coins": user["coins"],
            "created_at": user["created_at"],
            "last_daily_reward": user["last_daily_reward"],
            "referral_code": user["referral_code"],
            "referral_count": user["referral_count"],
            "referral_earnings": user["referral_earnings"]
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    
    # Generate referral code if user doesn't have one
    if not user.get("referral_code"):
        referral_code = generate_referral_code(user["id"])
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"referral_code": referral_code}}
        )
        user["referral_code"] = referral_code
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "coins": user["coins"],
            "created_at": user["created_at"],
            "last_daily_reward": user.get("last_daily_reward"),
            "referral_code": user.get("referral_code"),
            "referral_count": user.get("referral_count", 0),
            "referral_earnings": user.get("referral_earnings", 0)
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "coins": user["coins"],
        "created_at": user["created_at"],
        "last_daily_reward": user.get("last_daily_reward"),
        "referral_code": user.get("referral_code"),
        "referral_count": user.get("referral_count", 0),
        "referral_earnings": user.get("referral_earnings", 0)
    }
