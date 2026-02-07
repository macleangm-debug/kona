"""
Authentication routes
"""
import uuid
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    SendOTPRequest, VerifyOTPRequest, OTPResponse
)
from services import db, hash_password, verify_password, create_token, generate_referral_code, get_current_user
from config.settings import REFERRAL_REWARD_REFERRER, REFERRAL_REWARD_REFEREE

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage (use Redis in production)
otp_store = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def format_phone(phone: str, country_code: str) -> str:
    """Format phone number with country code"""
    # Remove any existing + or leading zeros
    phone = phone.lstrip('+').lstrip('0')
    country_code = country_code.lstrip('+')
    return f"+{country_code}{phone}"

@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(data: SendOTPRequest):
    """Send OTP via WhatsApp, Flash Call, or SMS"""
    full_phone = format_phone(data.phone, data.country_code)
    
    # Generate OTP
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Store OTP
    otp_store[full_phone] = {
        "otp": otp,
        "expires_at": expires_at,
        "method": data.verification_method,
        "attempts": 0
    }
    
    # TODO: Integrate with actual SMS provider (Africa's Talking, Twilio, etc.)
    # For now, we'll simulate sending OTP
    # In production, this would call the SMS API
    
    if data.verification_method == "whatsapp":
        # TODO: Send via WhatsApp Business API
        print(f"[DEV] WhatsApp OTP to {full_phone}: {otp}")
    elif data.verification_method == "flash_call":
        # TODO: Initiate flash call where last 4 digits = OTP
        print(f"[DEV] Flash Call OTP to {full_phone}: {otp}")
    else:  # SMS
        # TODO: Send via SMS
        print(f"[DEV] SMS OTP to {full_phone}: {otp}")
    
    return {
        "success": True,
        "message": f"Verification code sent via {data.verification_method}",
        "expires_in": 300
    }

@router.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    """Verify OTP code"""
    full_phone = format_phone(data.phone, data.country_code)
    
    stored = otp_store.get(full_phone)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a new code.")
    
    # Check expiry
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del otp_store[full_phone]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new code.")
    
    # Check attempts
    if stored["attempts"] >= 3:
        del otp_store[full_phone]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")
    
    # Verify OTP
    if data.otp != stored["otp"]:
        otp_store[full_phone]["attempts"] += 1
        raise HTTPException(status_code=400, detail="Invalid code. Please try again.")
    
    # OTP verified - clean up
    del otp_store[full_phone]
    
    return {"success": True, "message": "Phone number verified", "verified": True}

@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """Register with email or phone"""
    
    # Validate that either email or phone is provided
    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Either email or phone is required")
    
    # Check if user exists
    if data.email:
        existing = await db.users.find_one({"email": data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    if data.phone:
        full_phone = format_phone(data.phone, data.country_code or "254")
        existing = await db.users.find_one({"phone": full_phone})
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
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
        "password": hash_password(data.password),
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
    del user["password"]
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
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password - the field is named 'password' in DB
    password_hash = user.get("password")
    if not password_hash or not verify_password(data.password, password_hash):
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
    
    from datetime import datetime, timezone
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", user.get("username", "User")),
            "coins": user.get("coins", user.get("purchased_coins", 0) + user.get("free_coins_earned", 0)),
            "created_at": str(user.get("created_at", datetime.now(timezone.utc).isoformat())),
            "last_daily_reward": user.get("last_daily_reward"),
            "referral_code": user.get("referral_code"),
            "referral_count": user.get("referral_count", 0),
            "referral_earnings": user.get("referral_earnings", 0),
            "is_admin": user.get("is_admin", False),
            "is_super_admin": user.get("is_super_admin", False)
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
        "referral_earnings": user.get("referral_earnings", 0),
        "is_admin": user.get("is_admin", False),
        "is_super_admin": user.get("is_super_admin", False)
    }
