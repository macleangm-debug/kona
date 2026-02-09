"""
Authentication routes
"""
import uuid
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request

from models.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    SendOTPRequest, VerifyOTPRequest, OTPResponse
)
from services import db, hash_password, verify_password, create_token, generate_referral_code, get_current_user, detect_country_from_ip
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
async def register(data: UserCreate, request: Request):
    """Register with email or phone"""
    
    # Detect user's geo-location from IP
    client_ip = request.client.host
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    geo_data = await detect_country_from_ip(client_ip)
    print(f"[AUTH] Registration - IP: {client_ip}, Geo: {geo_data}")
    
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
                "referee_phone": format_phone(data.phone, data.country_code) if data.phone else None,
                "referrer_reward": REFERRAL_REWARD_REFERRER,
                "referee_reward": REFERRAL_REWARD_REFEREE,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    user = {
        "id": user_id,
        "email": data.email,
        "phone": format_phone(data.phone, data.country_code) if data.phone else None,
        "country_code": data.country_code,
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
        "claimed_milestones": [],
        "phone_verified": False,
        "email_verified": False,
        # Geo-location data from IP
        "geo": {
            "country": geo_data.get("country_name"),
            "country_code": geo_data.get("country_code"),
            "is_african": geo_data.get("is_african", False),
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "ip": client_ip if client_ip not in ["127.0.0.1", "::1"] else None
        },
        "last_login_geo": None
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
            "email": user.get("email"),
            "phone": user.get("phone"),
            "country_code": user.get("country_code"),
            "name": user["name"],
            "coins": user["coins"],
            "created_at": user["created_at"],
            "last_daily_reward": user["last_daily_reward"],
            "referral_code": user["referral_code"],
            "referral_count": user["referral_count"],
            "referral_earnings": user["referral_earnings"],
            "phone_verified": user.get("phone_verified", False),
            "email_verified": user.get("email_verified", False),
            "is_admin": user.get("is_admin", False),
            "is_super_admin": user.get("is_super_admin", False),
            "geo": user.get("geo")
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    """Login with email or phone"""
    
    # Detect user's geo-location from IP
    client_ip = request.client.host
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    geo_data = await detect_country_from_ip(client_ip)
    
    user = None
    
    # Find user by email or phone
    if data.email:
        user = await db.users.find_one({"email": data.email})
    elif data.phone:
        # Try to find by phone - need to handle various formats
        phone_clean = data.phone.lstrip('+').lstrip('0')
        user = await db.users.find_one({
            "$or": [
                {"phone": data.phone},
                {"phone": f"+{phone_clean}"},
                {"phone": {"$regex": f"{phone_clean}$"}}
            ]
        })
    
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
    
    # Update last login geo-location
    last_login_geo = {
        "country": geo_data.get("country_name"),
        "country_code": geo_data.get("country_code"),
        "is_african": geo_data.get("is_african", False),
        "logged_in_at": datetime.now(timezone.utc).isoformat(),
        "ip": client_ip if client_ip not in ["127.0.0.1", "::1"] else None
    }
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"last_login_geo": last_login_geo},
            "$push": {"login_history": {"$each": [last_login_geo], "$slice": -10}}  # Keep last 10 logins
        }
    )
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user.get("email"),
            "phone": user.get("phone"),
            "country_code": user.get("country_code"),
            "name": user.get("name", user.get("username", "User")),
            "coins": user.get("coins", user.get("purchased_coins", 0) + user.get("free_coins_earned", 0)),
            "created_at": str(user.get("created_at", datetime.now(timezone.utc).isoformat())),
            "last_daily_reward": user.get("last_daily_reward"),
            "referral_code": user.get("referral_code"),
            "referral_count": user.get("referral_count", 0),
            "referral_earnings": user.get("referral_earnings", 0),
            "is_admin": user.get("is_admin", False),
            "is_super_admin": user.get("is_super_admin", False),
            "phone_verified": user.get("phone_verified", False),
            "email_verified": user.get("email_verified", False),
            "geo": user.get("geo"),
            "last_login_geo": last_login_geo
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user.get("email"),
        "phone": user.get("phone"),
        "country_code": user.get("country_code"),
        "name": user["name"],
        "coins": user["coins"],
        "created_at": user["created_at"],
        "last_daily_reward": user.get("last_daily_reward"),
        "referral_code": user.get("referral_code"),
        "referral_count": user.get("referral_count", 0),
        "referral_earnings": user.get("referral_earnings", 0),
        "is_admin": user.get("is_admin", False),
        "is_super_admin": user.get("is_super_admin", False),
        "phone_verified": user.get("phone_verified", False),
        "email_verified": user.get("email_verified", False),
        "geo": user.get("geo"),
        "last_login_geo": user.get("last_login_geo")
    }


# ============ EMAIL VERIFICATION ============

# In-memory email verification storage (use Redis in production)
email_verification_store = {}

@router.post("/send-email-verification")
async def send_email_verification(user: dict = Depends(get_current_user)):
    """Send email verification code to user's email"""
    from services.email_service import send_verification_email, generate_verification_token
    
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email associated with this account")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate 6-digit code
    code = generate_verification_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Store verification code
    email_verification_store[user["id"]] = {
        "code": code,
        "email": email,
        "expires_at": expires_at,
        "attempts": 0
    }
    
    # Send email
    result = await send_verification_email(email, code, user.get("name", "there"))
    
    response = {
        "message": "Verification code sent to your email",
        "email_masked": f"{email[:3]}***{email[email.index('@'):]}"
    }
    
    # In test mode, include the code for development (remove in production)
    if result.get("test_mode"):
        response["test_mode"] = True
        response["test_code"] = code  # Only for development!
        response["note"] = "Email service in test mode. Use test_code to verify."
    elif not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    
    return response

@router.post("/verify-email")
async def verify_email(code: str, user: dict = Depends(get_current_user)):
    """Verify email with the code sent"""
    from services.email_service import send_welcome_email
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    stored = email_verification_store.get(user["id"])
    if not stored:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")
    
    # Check expiry
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del email_verification_store[user["id"]]
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
    
    # Check attempts
    stored["attempts"] += 1
    if stored["attempts"] > 5:
        del email_verification_store[user["id"]]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")
    
    # Verify code
    if stored["code"] != code:
        raise HTTPException(status_code=400, detail=f"Invalid code. {5 - stored['attempts']} attempts remaining.")
    
    # Mark email as verified and award coins
    VERIFICATION_REWARD = 5
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "email_verified": True,
                "email_verified_at": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"coins": VERIFICATION_REWARD}
        }
    )
    
    # Clean up
    del email_verification_store[user["id"]]
    
    # Send welcome email
    await send_welcome_email(user.get("email"), user.get("name", "there"))
    
    return {
        "message": "Email verified successfully!",
        "coins_awarded": VERIFICATION_REWARD
    }


@router.post("/verify-phone-code")
async def verify_phone_code(code: str, user: dict = Depends(get_current_user)):
    """
    Verify phone with OTP code.
    NOTE: Phone verification is currently disabled until SMS provider (Africa's Talking/Twilio) is integrated.
    Users should use email verification instead.
    """
    # Temporarily disabled until SMS provider is integrated
    raise HTTPException(
        status_code=503, 
        detail="Phone verification temporarily unavailable. Please use email verification instead."
    )
        {
            "$set": {
                "phone_verified": True,
                "phone_verified_at": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"coins": VERIFICATION_REWARD}
        }
    )
    
    # Clean up
    del otp_store[full_phone]
    
    return {
        "message": "Phone verified successfully!",
        "coins_awarded": VERIFICATION_REWARD
    }


@router.get("/verification-status")
async def get_verification_status(user: dict = Depends(get_current_user)):
    """Get current verification status for the user"""
    return {
        "email": user.get("email"),
        "email_verified": user.get("email_verified", False),
        "phone": user.get("phone"),
        "phone_verified": user.get("phone_verified", False),
        "verification_reward": 5,
        "features_locked": not (user.get("email_verified") or user.get("phone_verified"))
    }


@router.post("/request-password-reset")
async def request_password_reset(email: str):
    """Request password reset email"""
    from services.email_service import send_password_reset_email, generate_secure_token
    
    # Find user by email
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        # Don't reveal if user exists - return success anyway
        return {"message": "If an account exists with this email, a reset link has been sent."}
    
    # Generate reset token
    reset_token = generate_secure_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "token": reset_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Send email
    await send_password_reset_email(email, reset_token, user.get("name", "there"))
    
    return {"message": "If an account exists with this email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """Reset password using token from email"""
    # Find reset request
    reset_request = await db.password_resets.find_one({"token": token})
    if not reset_request:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    # Check expiry
    expires_at = datetime.fromisoformat(reset_request["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    
    # Validate password
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Update password
    hashed = hash_password(new_password)
    await db.users.update_one(
        {"id": reset_request["user_id"]},
        {"$set": {"password": hashed}}
    )
    
    # Delete reset token
    await db.password_resets.delete_one({"token": token})
    
    return {"message": "Password reset successfully. You can now log in with your new password."}
