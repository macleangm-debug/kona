from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'miniseries-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# Stripe (for international cards)
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Flutterwave settings
FLUTTERWAVE_SECRET_KEY = os.environ.get('FLUTTERWAVE_SECRET_KEY', '')
FLUTTERWAVE_PUBLIC_KEY = os.environ.get('FLUTTERWAVE_PUBLIC_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ MODELS ============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    referral_code: Optional[str] = None  # Code used during signup

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    coins: int
    created_at: str
    last_daily_reward: Optional[str] = None
    referral_code: Optional[str] = None
    referral_count: int = 0
    referral_earnings: int = 0

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class SeriesResponse(BaseModel):
    id: str
    title: str
    description: str
    genre: str
    thumbnail: str
    total_episodes: int
    coins_per_episode: int
    rating: float
    views: int
    featured: bool = False

class EpisodeResponse(BaseModel):
    id: str
    series_id: str
    episode_number: int
    title: str
    description: str
    duration: str
    thumbnail: str
    video_url: str
    is_free: bool
    coins_required: int

class UnlockEpisodeRequest(BaseModel):
    episode_id: str

class CoinPackage(BaseModel):
    id: str
    name: str
    coins: int
    price: float
    bonus: int = 0
    popular: bool = False

class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    payment_method: str = "card"  # card, mpesa, mtn, airtel
    country_code: str = "US"
    phone_number: Optional[str] = None

class WatchProgressUpdate(BaseModel):
    episode_id: str
    progress: int  # percentage 0-100

class ReminderRequest(BaseModel):
    series_id: str

class ComingSoonResponse(BaseModel):
    id: str
    title: str
    description: str
    genre: str
    thumbnail: str
    release_date: str
    reserved_count: int
    is_reminded: bool = False

# ============ COUNTRY/PAYMENT CONFIG ============
# East & Central Africa payment configuration
COUNTRY_CONFIG = {
    "KE": {
        "name": "Kenya",
        "currency": "KES",
        "payment_methods": [
            {"id": "mpesa", "name": "M-Pesa", "type": "mobilemoney", "provider": "flutterwave"},
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 130.0  # Approx KES per USD
    },
    "TZ": {
        "name": "Tanzania",
        "currency": "TZS",
        "payment_methods": [
            {"id": "mpesa", "name": "M-Pesa", "type": "mobilemoney", "provider": "flutterwave"},
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 2500.0
    },
    "UG": {
        "name": "Uganda",
        "currency": "UGX",
        "payment_methods": [
            {"id": "mtn", "name": "MTN Mobile Money", "type": "mobilemoney", "provider": "flutterwave"},
            {"id": "airtel", "name": "Airtel Money", "type": "mobilemoney", "provider": "flutterwave"},
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 3700.0
    },
    "RW": {
        "name": "Rwanda",
        "currency": "RWF",
        "payment_methods": [
            {"id": "mtn", "name": "MTN Mobile Money", "type": "mobilemoney", "provider": "flutterwave"},
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 1300.0
    },
    "CD": {
        "name": "DR Congo",
        "currency": "CDF",
        "payment_methods": [
            {"id": "airtel", "name": "Airtel Money", "type": "mobilemoney", "provider": "flutterwave"},
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 2800.0
    },
    "BI": {
        "name": "Burundi",
        "currency": "BIF",
        "payment_methods": [
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 2900.0
    },
    "SS": {
        "name": "South Sudan",
        "currency": "SSP",
        "payment_methods": [
            {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "flutterwave"}
        ],
        "exchange_rate": 130.0
    }
}

# Default for international users
DEFAULT_CONFIG = {
    "name": "International",
    "currency": "USD",
    "payment_methods": [
        {"id": "card", "name": "Card (Visa/Mastercard)", "type": "card", "provider": "stripe"}
    ],
    "exchange_rate": 1.0
}

# ============ COIN PACKAGES ============
COIN_PACKAGES = {
    "starter": CoinPackage(id="starter", name="Starter Pack", coins=50, price=0.99),
    "popular": CoinPackage(id="popular", name="Popular Pack", coins=150, price=2.99, bonus=20, popular=True),
    "value": CoinPackage(id="value", name="Value Pack", coins=350, price=5.99, bonus=50),
    "mega": CoinPackage(id="mega", name="Mega Pack", coins=800, price=9.99, bonus=150),
}

DAILY_REWARD_COINS = 10

# Referral rewards
REFERRAL_REWARD_REFERRER = 20  # Coins for the person who referred
REFERRAL_REWARD_REFEREE = 30   # Bonus coins for new user who used a referral code

def generate_referral_code(user_id: str) -> str:
    """Generate a unique referral code based on user_id"""
    import hashlib
    hash_input = f"{user_id}_{datetime.now(timezone.utc).timestamp()}"
    return hashlib.sha256(hash_input.encode()).hexdigest()[:8].upper()

# ============ GEOLOCATION HELPER ============
async def detect_country_from_ip(ip_address: str) -> dict:
    """Detect country from IP using free ipapi.co service"""
    try:
        async with httpx.AsyncClient() as client:
            # Skip geolocation for local IPs
            if ip_address in ["127.0.0.1", "localhost", "::1"] or ip_address.startswith("192.168.") or ip_address.startswith("10."):
                return {"country_code": "KE", "country_name": "Kenya"}  # Default to Kenya for dev
            
            response = await client.get(f"https://ipapi.co/{ip_address}/json/", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                return {
                    "country_code": data.get("country_code", "US"),
                    "country_name": data.get("country_name", "Unknown")
                }
    except Exception as e:
        logging.error(f"Geolocation error: {e}")
    
    return {"country_code": "US", "country_name": "Unknown"}

# ============ AUTH HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    referral_code = generate_referral_code(user_id)
    
    # Calculate initial coins (welcome bonus + referral bonus if applicable)
    initial_coins = 50  # Welcome bonus
    referred_by = None
    
    # Check if valid referral code was provided
    if data.referral_code:
        referrer = await db.users.find_one({"referral_code": data.referral_code.upper()}, {"_id": 0})
        if referrer:
            referred_by = referrer["id"]
            initial_coins += REFERRAL_REWARD_REFEREE  # Bonus for using referral
            
            # Reward the referrer
            await db.users.update_one(
                {"id": referrer["id"]},
                {
                    "$inc": {
                        "coins": REFERRAL_REWARD_REFERRER,
                        "referral_count": 1,
                        "referral_earnings": REFERRAL_REWARD_REFERRER
                    }
                }
            )
            
            # Log the referral
            referral_record = {
                "id": str(uuid.uuid4()),
                "referrer_id": referrer["id"],
                "referee_id": user_id,
                "referee_email": data.email,
                "referrer_reward": REFERRAL_REWARD_REFERRER,
                "referee_reward": REFERRAL_REWARD_REFEREE,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.referrals.insert_one(referral_record)
    
    user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hash_password(data.password),
        "coins": initial_coins,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_daily_reward": None,
        "unlocked_episodes": [],
        "watch_progress": {},
        "referral_code": referral_code,
        "referred_by": referred_by,
        "referral_count": 0,
        "referral_earnings": 0
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        coins=user["coins"],
        created_at=user["created_at"],
        last_daily_reward=user["last_daily_reward"],
        referral_code=user["referral_code"],
        referral_count=user["referral_count"],
        referral_earnings=user["referral_earnings"]
    )
    return TokenResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Auto-generate referral code for users who don't have one
    referral_code = user.get("referral_code")
    if not referral_code:
        referral_code = generate_referral_code(user["id"])
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "referral_code": referral_code,
                "referral_count": 0,
                "referral_earnings": 0
            }}
        )
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        coins=user["coins"],
        created_at=user["created_at"],
        last_daily_reward=user.get("last_daily_reward"),
        referral_code=referral_code,
        referral_count=user.get("referral_count", 0),
        referral_earnings=user.get("referral_earnings", 0)
    )
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    # Auto-generate referral code for users who don't have one
    referral_code = user.get("referral_code")
    if not referral_code:
        referral_code = generate_referral_code(user["id"])
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "referral_code": referral_code,
                "referral_count": 0,
                "referral_earnings": 0
            }}
        )
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        coins=user["coins"],
        created_at=user["created_at"],
        last_daily_reward=user.get("last_daily_reward"),
        referral_code=referral_code,
        referral_count=user.get("referral_count", 0),
        referral_earnings=user.get("referral_earnings", 0)
    )

# ============ DAILY REWARDS ============
@api_router.post("/rewards/claim")
async def claim_daily_reward(user: dict = Depends(get_current_user)):
    last_reward = user.get("last_daily_reward")
    now = datetime.now(timezone.utc)
    
    if last_reward:
        last_reward_dt = datetime.fromisoformat(last_reward.replace('Z', '+00:00'))
        if (now - last_reward_dt).days < 1:
            raise HTTPException(status_code=400, detail="Daily reward already claimed today")
    
    new_coins = user["coins"] + DAILY_REWARD_COINS
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"coins": new_coins, "last_daily_reward": now.isoformat()}}
    )
    
    return {"message": "Daily reward claimed!", "coins_earned": DAILY_REWARD_COINS, "total_coins": new_coins}

@api_router.get("/rewards/status")
async def get_reward_status(user: dict = Depends(get_current_user)):
    last_reward = user.get("last_daily_reward")
    can_claim = True
    hours_until_next = 0
    
    if last_reward:
        last_reward_dt = datetime.fromisoformat(last_reward.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        time_diff = now - last_reward_dt
        if time_diff.total_seconds() < 86400:  # 24 hours
            can_claim = False
            hours_until_next = int((86400 - time_diff.total_seconds()) / 3600)
    
    return {"can_claim": can_claim, "hours_until_next": hours_until_next, "reward_amount": DAILY_REWARD_COINS}

# ============ REFERRAL ROUTES ============
@api_router.get("/referral/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """Get user's referral statistics"""
    referrals = await db.referrals.find(
        {"referrer_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "referral_code": user.get("referral_code"),
        "total_referrals": user.get("referral_count", 0),
        "total_earnings": user.get("referral_earnings", 0),
        "reward_per_referral": REFERRAL_REWARD_REFERRER,
        "referee_bonus": REFERRAL_REWARD_REFEREE,
        "recent_referrals": [
            {
                "email": r["referee_email"][:3] + "***" + r["referee_email"][r["referee_email"].index("@"):],
                "reward": r["referrer_reward"],
                "date": r["created_at"]
            }
            for r in referrals[:5]
        ]
    }

@api_router.get("/referral/validate/{code}")
async def validate_referral_code(code: str):
    """Validate if a referral code exists (for signup form)"""
    user = await db.users.find_one({"referral_code": code.upper()}, {"_id": 0})
    if user:
        return {
            "valid": True,
            "referrer_name": user["name"].split()[0],  # First name only
            "bonus_coins": REFERRAL_REWARD_REFEREE
        }
    return {"valid": False}

@api_router.get("/referral/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers (anonymized)"""
    top_referrers = await db.users.find(
        {"referral_count": {"$gt": 0}},
        {"_id": 0, "name": 1, "referral_count": 1, "referral_earnings": 1}
    ).sort("referral_count", -1).limit(10).to_list(10)
    
    return [
        {
            "name": u["name"].split()[0] + " " + u["name"].split()[-1][0] + "." if len(u["name"].split()) > 1 else u["name"],
            "referrals": u["referral_count"],
            "earnings": u["referral_earnings"]
        }
        for u in top_referrers
    ]

# ============ SERIES ROUTES ============
@api_router.get("/series", response_model=List[SeriesResponse])
async def get_series():
    series = await db.series.find({}, {"_id": 0}).to_list(100)
    if not series:
        await seed_data()
        series = await db.series.find({}, {"_id": 0}).to_list(100)
    return series

@api_router.get("/series/featured", response_model=List[SeriesResponse])
async def get_featured_series():
    series = await db.series.find({"featured": True}, {"_id": 0}).to_list(10)
    return series

# ============ COMING SOON ============
@api_router.get("/series/coming-soon")
async def get_coming_soon():
    """Get list of upcoming series"""
    coming_soon = await db.coming_soon.find({}, {"_id": 0}).to_list(20)
    return coming_soon

@api_router.post("/series/remind")
async def set_reminder(data: ReminderRequest, user: dict = Depends(get_current_user)):
    """Set a reminder for an upcoming series"""
    series = await db.coming_soon.find_one({"id": data.series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Check if already reminded
    reminders = user.get("reminders", [])
    if data.series_id in reminders:
        raise HTTPException(status_code=400, detail="Reminder already set")
    
    # Add to user's reminders
    reminders.append(data.series_id)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"reminders": reminders}}
    )
    
    # Increment reserved count
    await db.coming_soon.update_one(
        {"id": data.series_id},
        {"$inc": {"reserved_count": 1}}
    )
    
    return {"message": "Reminder set successfully!", "series_id": data.series_id}

@api_router.get("/series/{series_id}", response_model=SeriesResponse)
async def get_series_detail(series_id: str):
    series = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series

@api_router.get("/series/{series_id}/episodes", response_model=List[EpisodeResponse])
async def get_episodes(series_id: str):
    episodes = await db.episodes.find({"series_id": series_id}, {"_id": 0}).sort("episode_number", 1).to_list(100)
    return episodes

# ============ EPISODE ROUTES ============
@api_router.get("/episodes/{episode_id}")
async def get_episode(episode_id: str, user: dict = Depends(get_current_user)):
    episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    is_unlocked = episode["is_free"] or episode_id in user.get("unlocked_episodes", [])
    progress = user.get("watch_progress", {}).get(episode_id, 0)
    
    return {**episode, "is_unlocked": is_unlocked, "progress": progress}

@api_router.post("/episodes/unlock")
async def unlock_episode(data: UnlockEpisodeRequest, user: dict = Depends(get_current_user)):
    episode = await db.episodes.find_one({"id": data.episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    if episode["is_free"]:
        raise HTTPException(status_code=400, detail="Episode is already free")
    
    if data.episode_id in user.get("unlocked_episodes", []):
        raise HTTPException(status_code=400, detail="Episode already unlocked")
    
    if user["coins"] < episode["coins_required"]:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    new_coins = user["coins"] - episode["coins_required"]
    unlocked = user.get("unlocked_episodes", []) + [data.episode_id]
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"coins": new_coins, "unlocked_episodes": unlocked}}
    )
    
    return {"message": "Episode unlocked!", "coins_spent": episode["coins_required"], "remaining_coins": new_coins}

@api_router.post("/episodes/progress")
async def update_progress(data: WatchProgressUpdate, user: dict = Depends(get_current_user)):
    watch_progress = user.get("watch_progress", {})
    watch_progress[data.episode_id] = data.progress
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"watch_progress": watch_progress}}
    )
    
    return {"message": "Progress updated", "progress": data.progress}

@api_router.get("/user/unlocked-episodes")
async def get_unlocked_episodes(user: dict = Depends(get_current_user)):
    return {"unlocked_episodes": user.get("unlocked_episodes", [])}

# ============ COMING SOON ============
@api_router.get("/series/coming-soon")
async def get_coming_soon():
    """Get list of upcoming series"""
    coming_soon = await db.coming_soon.find({}, {"_id": 0}).to_list(20)
    return coming_soon

@api_router.post("/series/remind")
async def set_reminder(data: ReminderRequest, user: dict = Depends(get_current_user)):
    """Set a reminder for an upcoming series"""
    series = await db.coming_soon.find_one({"id": data.series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Check if already reminded
    reminders = user.get("reminders", [])
    if data.series_id in reminders:
        raise HTTPException(status_code=400, detail="Reminder already set")
    
    # Add to user's reminders
    reminders.append(data.series_id)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"reminders": reminders}}
    )
    
    # Increment reserved count
    await db.coming_soon.update_one(
        {"id": data.series_id},
        {"$inc": {"reserved_count": 1}}
    )
    
    return {"message": "Reminder set successfully!", "series_id": data.series_id}

@api_router.get("/user/reminders")
async def get_user_reminders(user: dict = Depends(get_current_user)):
    """Get user's set reminders"""
    return {"reminders": user.get("reminders", [])}

# ============ COIN STORE ============
@api_router.get("/store/packages", response_model=List[CoinPackage])
async def get_packages():
    return list(COIN_PACKAGES.values())

# ============ GEOLOCATION & PAYMENT METHODS ============
@api_router.get("/geo/detect")
async def detect_location(request: Request):
    """Auto-detect user's location from IP"""
    # Get client IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"
    
    geo_data = await detect_country_from_ip(client_ip)
    country_code = geo_data["country_code"]
    
    # Get config for this country or default
    config = COUNTRY_CONFIG.get(country_code, DEFAULT_CONFIG)
    
    return {
        "country_code": country_code,
        "country_name": geo_data["country_name"],
        "currency": config["currency"],
        "payment_methods": config["payment_methods"],
        "exchange_rate": config["exchange_rate"],
        "detected_ip": client_ip
    }

@api_router.get("/geo/countries")
async def get_supported_countries():
    """Get list of supported countries for manual selection"""
    countries = []
    for code, config in COUNTRY_CONFIG.items():
        countries.append({
            "code": code,
            "name": config["name"],
            "currency": config["currency"],
            "payment_methods": config["payment_methods"]
        })
    # Add international option
    countries.append({
        "code": "INTL",
        "name": "International (Card Only)",
        "currency": "USD",
        "payment_methods": DEFAULT_CONFIG["payment_methods"]
    })
    return countries

@api_router.get("/geo/payment-methods/{country_code}")
async def get_payment_methods_for_country(country_code: str):
    """Get payment methods available for a specific country"""
    if country_code == "INTL":
        config = DEFAULT_CONFIG
    else:
        config = COUNTRY_CONFIG.get(country_code, DEFAULT_CONFIG)
    
    return {
        "country_code": country_code,
        "currency": config["currency"],
        "payment_methods": config["payment_methods"],
        "exchange_rate": config.get("exchange_rate", 1.0)
    }

@api_router.post("/store/checkout")
async def create_checkout(data: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    """Create checkout - routes to Stripe (international) or Flutterwave (Africa)"""
    if data.package_id not in COIN_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = COIN_PACKAGES[data.package_id]
    
    # Determine which payment provider to use based on country
    country_code = data.country_code
    config = COUNTRY_CONFIG.get(country_code, DEFAULT_CONFIG)
    
    # Find the payment method config
    payment_method_config = None
    for pm in config["payment_methods"]:
        if pm["id"] == data.payment_method:
            payment_method_config = pm
            break
    
    if not payment_method_config:
        # Default to card if method not found
        payment_method_config = {"id": "card", "type": "card", "provider": "stripe"}
    
    provider = payment_method_config.get("provider", "stripe")
    
    # Calculate local price
    exchange_rate = config.get("exchange_rate", 1.0)
    local_amount = round(package.price * exchange_rate, 2)
    currency = config["currency"].lower()
    
    tx_ref = f"MINI_{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex[:8]}"
    
    if provider == "flutterwave" and FLUTTERWAVE_SECRET_KEY:
        # Use Flutterwave for African payments
        return await create_flutterwave_checkout(
            user=user,
            package=package,
            data=data,
            local_amount=local_amount,
            currency=currency,
            tx_ref=tx_ref,
            payment_method=data.payment_method
        )
    else:
        # Use Stripe for international card payments
        return await create_stripe_checkout(
            user=user,
            package=package,
            data=data,
            request=request
        )

async def create_stripe_checkout(user: dict, package: CoinPackage, data: CheckoutRequest, request: Request):
    """Create Stripe checkout session for international payments"""
    api_key = os.environ.get('STRIPE_API_KEY')
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/store?session_id={{CHECKOUT_SESSION_ID}}&provider=stripe"
    cancel_url = f"{data.origin_url}/store"
    
    checkout_request = CheckoutSessionRequest(
        amount=package.price,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "package_id": package.id,
            "coins": str(package.coins + package.bonus)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "tx_ref": session.session_id,
        "user_id": user["id"],
        "package_id": package.id,
        "amount": package.price,
        "currency": "usd",
        "coins": package.coins + package.bonus,
        "provider": "stripe",
        "payment_method": "card",
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id, "provider": "stripe"}

async def create_flutterwave_checkout(user: dict, package: CoinPackage, data: CheckoutRequest, 
                                       local_amount: float, currency: str, tx_ref: str, payment_method: str):
    """Create Flutterwave payment for African mobile money & cards"""
    
    success_url = f"{data.origin_url}/store?tx_ref={tx_ref}&provider=flutterwave"
    cancel_url = f"{data.origin_url}/store"
    
    # Map payment method to Flutterwave payment type
    payment_options = "card"
    if payment_method in ["mpesa", "mtn", "airtel"]:
        payment_options = "mobilemoney"
    
    # Prepare Flutterwave payment link request
    payload = {
        "tx_ref": tx_ref,
        "amount": local_amount,
        "currency": currency.upper(),
        "redirect_url": success_url,
        "payment_options": payment_options,
        "customer": {
            "email": user["email"],
            "name": user["name"],
            "phonenumber": data.phone_number or ""
        },
        "customizations": {
            "title": "MiniSeries Coins",
            "description": f"{package.name} - {package.coins + package.bonus} coins",
            "logo": "https://images.pexels.com/photos/12198531/pexels-photo-12198531.jpeg"
        },
        "meta": {
            "user_id": user["id"],
            "package_id": package.id,
            "coins": str(package.coins + package.bonus)
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.flutterwave.com/v3/payments",
                json=payload,
                headers={
                    "Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if result.get("status") == "success":
                payment_link = result["data"]["link"]
                
                # Create transaction record
                transaction = {
                    "id": str(uuid.uuid4()),
                    "tx_ref": tx_ref,
                    "session_id": tx_ref,
                    "user_id": user["id"],
                    "package_id": package.id,
                    "amount": local_amount,
                    "amount_usd": package.price,
                    "currency": currency.upper(),
                    "coins": package.coins + package.bonus,
                    "provider": "flutterwave",
                    "payment_method": payment_method,
                    "country_code": data.country_code,
                    "status": "pending",
                    "payment_status": "initiated",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.payment_transactions.insert_one(transaction)
                
                return {"url": payment_link, "tx_ref": tx_ref, "provider": "flutterwave"}
            else:
                logging.error(f"Flutterwave error: {result}")
                raise HTTPException(status_code=400, detail=result.get("message", "Payment initialization failed"))
                
    except httpx.RequestError as e:
        logging.error(f"Flutterwave request error: {e}")
        raise HTTPException(status_code=500, detail="Payment service temporarily unavailable")

@api_router.get("/store/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, provider: str = "stripe", user: dict = Depends(get_current_user)):
    """Check payment status - works for both Stripe and Flutterwave"""
    
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        # Try finding by tx_ref for Flutterwave
        transaction = await db.payment_transactions.find_one({"tx_ref": session_id}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    actual_provider = transaction.get("provider", "stripe")
    
    if actual_provider == "flutterwave":
        return await check_flutterwave_status(session_id, transaction, user)
    else:
        return await check_stripe_status(session_id, transaction, user)

async def check_stripe_status(session_id: str, transaction: dict, user: dict):
    """Check Stripe payment status"""
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    if transaction["payment_status"] != "paid" and status.payment_status == "paid":
        # Credit coins only once
        coins_to_add = transaction["coins"]
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"coins": coins_to_add}}
        )
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "payment_status": "paid"}}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "provider": "stripe"
    }

async def check_flutterwave_status(tx_ref: str, transaction: dict, user: dict):
    """Check Flutterwave payment status"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref={tx_ref}",
                headers={
                    "Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if result.get("status") == "success":
                payment_data = result.get("data", {})
                payment_status = payment_data.get("status", "").lower()
                
                if transaction["payment_status"] != "paid" and payment_status == "successful":
                    # Credit coins only once
                    coins_to_add = transaction["coins"]
                    await db.users.update_one(
                        {"id": user["id"]},
                        {"$inc": {"coins": coins_to_add}}
                    )
                    await db.payment_transactions.update_one(
                        {"tx_ref": tx_ref},
                        {"$set": {
                            "status": "completed",
                            "payment_status": "paid",
                            "flutterwave_response": payment_data
                        }}
                    )
                    payment_status = "paid"
                elif payment_status == "successful":
                    payment_status = "paid"
                
                return {
                    "status": payment_status,
                    "payment_status": payment_status,
                    "amount_total": payment_data.get("amount", 0),
                    "currency": payment_data.get("currency", ""),
                    "provider": "flutterwave"
                }
            else:
                return {
                    "status": "pending",
                    "payment_status": "pending",
                    "provider": "flutterwave"
                }
                
    except Exception as e:
        logging.error(f"Flutterwave status check error: {e}")
        return {
            "status": "pending",
            "payment_status": "pending",
            "provider": "flutterwave"
        }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if transaction and transaction["payment_status"] != "paid":
                user_id = webhook_response.metadata.get("user_id")
                coins = int(webhook_response.metadata.get("coins", 0))
                
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"coins": coins}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed", "payment_status": "paid"}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"status": "error"}

@api_router.post("/webhook/flutterwave")
async def flutterwave_webhook(request: Request):
    """Handle Flutterwave webhook notifications"""
    try:
        body = await request.json()
        
        # Verify webhook (in production, verify signature)
        event_type = body.get("event")
        data = body.get("data", {})
        
        if event_type == "charge.completed" and data.get("status") == "successful":
            tx_ref = data.get("tx_ref")
            
            transaction = await db.payment_transactions.find_one({"tx_ref": tx_ref}, {"_id": 0})
            
            if transaction and transaction["payment_status"] != "paid":
                user_id = transaction.get("user_id")
                coins = transaction.get("coins", 0)
                
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"coins": coins}}
                )
                await db.payment_transactions.update_one(
                    {"tx_ref": tx_ref},
                    {"$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "flutterwave_response": data
                    }}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Flutterwave webhook error: {e}")
        return {"status": "error"}

# ============ SEED DATA ============
async def seed_data():
    # Check if already seeded with enough data
    count = await db.series.count_documents({})
    if count >= 20:
        return
    
    # Clear existing data for fresh seed
    await db.series.delete_many({})
    await db.episodes.delete_many({})
    
    sample_series = [
        # Featured Series (Hero Carousel)
        {
            "id": "series-1",
            "title": "Love in the City",
            "description": "A heartwarming romance between two strangers who keep crossing paths in bustling New York City.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 15,
            "rating": 4.8,
            "views": 125000,
            "featured": True
        },
        {
            "id": "series-2",
            "title": "The Billionaire's Secret",
            "description": "She thought he was just a regular guy, until she discovered his billion-dollar empire.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3768911/pexels-photo-3768911.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 12,
            "coins_per_episode": 20,
            "rating": 4.6,
            "views": 98000,
            "featured": True
        },
        {
            "id": "series-3",
            "title": "Revenge of the Rejected",
            "description": "After being betrayed by everyone she loved, she returns more powerful than ever.",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 15,
            "coins_per_episode": 18,
            "rating": 4.9,
            "views": 200000,
            "featured": True
        },
        {
            "id": "series-4",
            "title": "My CEO Husband",
            "description": "A contract marriage turns into something neither of them expected.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/3760137/pexels-photo-3760137.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 8,
            "coins_per_episode": 15,
            "rating": 4.5,
            "views": 75000,
            "featured": True
        },
        {
            "id": "series-5",
            "title": "Hidden Identity",
            "description": "By day she's a simple waitress, by night she's the city's most wanted hacker.",
            "genre": "Action",
            "thumbnail": "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 20,
            "rating": 4.7,
            "views": 110000,
            "featured": True
        },
        # Romance Series
        {
            "id": "series-6",
            "title": "Campus Rivals",
            "description": "Two academic rivals discover that love and hate are closer than they thought.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/3755760/pexels-photo-3755760.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 12,
            "rating": 4.4,
            "views": 65000,
            "featured": False
        },
        {
            "id": "series-7",
            "title": "Married to the Mafia Boss",
            "description": "Forced into marriage with a ruthless mafia boss, she never expected to fall for him.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 16,
            "coins_per_episode": 18,
            "rating": 4.7,
            "views": 180000,
            "featured": False
        },
        {
            "id": "series-8",
            "title": "Second Chance at Love",
            "description": "High school sweethearts reunite 10 years later, but everything has changed.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/1139793/pexels-photo-1139793.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 12,
            "coins_per_episode": 15,
            "rating": 4.5,
            "views": 89000,
            "featured": False
        },
        {
            "id": "series-9",
            "title": "The Fake Girlfriend",
            "description": "He needed a fake girlfriend for his family reunion. She needed the money. Simple, right?",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/1024981/pexels-photo-1024981.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 14,
            "rating": 4.6,
            "views": 95000,
            "featured": False
        },
        # Drama Series
        {
            "id": "series-10",
            "title": "Empire of Lies",
            "description": "A powerful family's dark secrets threaten to destroy everything they've built.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 20,
            "coins_per_episode": 22,
            "rating": 4.8,
            "views": 220000,
            "featured": False
        },
        {
            "id": "series-11",
            "title": "The Heir's Burden",
            "description": "Inheriting a fortune sounds like a dream, until you learn the conditions attached.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3771836/pexels-photo-3771836.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 14,
            "coins_per_episode": 18,
            "rating": 4.5,
            "views": 78000,
            "featured": False
        },
        {
            "id": "series-12",
            "title": "Broken Vows",
            "description": "A marriage falling apart reveals secrets that could destroy both families.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3807755/pexels-photo-3807755.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 12,
            "coins_per_episode": 16,
            "rating": 4.4,
            "views": 67000,
            "featured": False
        },
        # Thriller Series
        {
            "id": "series-13",
            "title": "The Perfect Crime",
            "description": "She committed the perfect murder. Or so she thought.",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3831849/pexels-photo-3831849.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 20,
            "rating": 4.9,
            "views": 250000,
            "featured": False
        },
        {
            "id": "series-14",
            "title": "Witness Protection",
            "description": "After witnessing a mob murder, her new identity comes with unexpected dangers.",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3831645/pexels-photo-3831645.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 15,
            "coins_per_episode": 18,
            "rating": 4.7,
            "views": 145000,
            "featured": False
        },
        {
            "id": "series-15",
            "title": "The Stalker",
            "description": "Someone is watching her every move. But who? And why?",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3831847/pexels-photo-3831847.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 8,
            "coins_per_episode": 16,
            "rating": 4.6,
            "views": 112000,
            "featured": False
        },
        # Action Series
        {
            "id": "series-16",
            "title": "Street Fighter Queen",
            "description": "In the underground fighting world, she's the undefeated champion with a deadly secret.",
            "genre": "Action",
            "thumbnail": "https://images.pexels.com/photos/3771120/pexels-photo-3771120.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 12,
            "coins_per_episode": 20,
            "rating": 4.8,
            "views": 190000,
            "featured": False
        },
        {
            "id": "series-17",
            "title": "Bodyguard's Heart",
            "description": "Hired to protect her, falling for her wasn't part of the job description.",
            "genre": "Action",
            "thumbnail": "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 18,
            "rating": 4.6,
            "views": 88000,
            "featured": False
        },
        {
            "id": "series-18",
            "title": "Escape from Paradise",
            "description": "Trapped on a luxury island resort that's actually a prison for the elite.",
            "genre": "Action",
            "thumbnail": "https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 14,
            "coins_per_episode": 20,
            "rating": 4.7,
            "views": 135000,
            "featured": False
        },
        # More Romance
        {
            "id": "series-19",
            "title": "The Wrong Twin",
            "description": "She fell for him thinking he was someone else. Now the truth threatens everything.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/3791664/pexels-photo-3791664.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 11,
            "coins_per_episode": 15,
            "rating": 4.5,
            "views": 72000,
            "featured": False
        },
        {
            "id": "series-20",
            "title": "Divorced but Not Done",
            "description": "They signed the papers, but fate keeps bringing them back together.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 14,
            "rating": 4.4,
            "views": 68000,
            "featured": False
        },
        {
            "id": "series-21",
            "title": "Office Romance",
            "description": "Dating your boss is against company policy. Too bad she didn't know he owned the company.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 12,
            "coins_per_episode": 15,
            "rating": 4.6,
            "views": 105000,
            "featured": False
        },
        # More Thriller
        {
            "id": "series-22",
            "title": "Missing",
            "description": "Her daughter vanished without a trace. The police gave up. She won't.",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3831862/pexels-photo-3831862.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 10,
            "coins_per_episode": 18,
            "rating": 4.8,
            "views": 175000,
            "featured": False
        },
        {
            "id": "series-23",
            "title": "The Bunker",
            "description": "Five strangers wake up in an underground bunker with no memory of how they got there.",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3831851/pexels-photo-3831851.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 8,
            "coins_per_episode": 20,
            "rating": 4.7,
            "views": 140000,
            "featured": False
        },
        # More Drama
        {
            "id": "series-24",
            "title": "The Surrogate",
            "description": "She agreed to carry their baby. She never expected to fall for the husband.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3807524/pexels-photo-3807524.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 14,
            "coins_per_episode": 16,
            "rating": 4.5,
            "views": 92000,
            "featured": False
        },
        {
            "id": "series-25",
            "title": "Glass Houses",
            "description": "In this wealthy neighborhood, everyone has secrets. Some are deadly.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&cs=tinysrgb&w=600",
            "total_episodes": 16,
            "coins_per_episode": 18,
            "rating": 4.6,
            "views": 115000,
            "featured": False
        }
    ]
    
    await db.series.insert_many(sample_series)
    
    # Create episodes for each series
    sample_videos = [
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    ]
    
    episodes = []
    for series in sample_series:
        for ep_num in range(1, series["total_episodes"] + 1):
            episode = {
                "id": f"{series['id']}-ep{ep_num}",
                "series_id": series["id"],
                "episode_number": ep_num,
                "title": f"Episode {ep_num}",
                "description": f"Episode {ep_num} of {series['title']}. The story continues with unexpected twists.",
                "duration": f"{5 + (ep_num % 3)}:00",
                "thumbnail": series["thumbnail"],
                "video_url": sample_videos[(ep_num - 1) % len(sample_videos)],
                "is_free": ep_num == 1,  # First episode is free
                "coins_required": 0 if ep_num == 1 else series["coins_per_episode"]
            }
            episodes.append(episode)
    
    await db.episodes.insert_many(episodes)
    
    # Seed Coming Soon series
    coming_soon_series = [
        {
            "id": "coming-1",
            "title": "The Last Heiress",
            "description": "When the only heir to a billion-dollar empire goes missing, everyone becomes a suspect.",
            "genre": "Thriller",
            "thumbnail": "https://images.pexels.com/photos/3800517/pexels-photo-3800517.jpeg?auto=compress&cs=tinysrgb&w=600",
            "release_date": "Jan 28",
            "reserved_count": 8500
        },
        {
            "id": "coming-2",
            "title": "Forbidden Kingdom",
            "description": "A princess falls for a commoner in a kingdom where love across classes means death.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?auto=compress&cs=tinysrgb&w=600",
            "release_date": "Feb 1",
            "reserved_count": 12300
        },
        {
            "id": "coming-3",
            "title": "Blood Ties",
            "description": "Twin sisters separated at birth reunite, but one has a deadly secret.",
            "genre": "Drama",
            "thumbnail": "https://images.pexels.com/photos/3807541/pexels-photo-3807541.jpeg?auto=compress&cs=tinysrgb&w=600",
            "release_date": "Feb 5",
            "reserved_count": 6200
        },
        {
            "id": "coming-4",
            "title": "Undercover Love",
            "description": "An undercover agent falls for the crime boss's daughter. Will love or duty win?",
            "genre": "Action",
            "thumbnail": "https://images.pexels.com/photos/3771089/pexels-photo-3771089.jpeg?auto=compress&cs=tinysrgb&w=600",
            "release_date": "Feb 10",
            "reserved_count": 9800
        },
        {
            "id": "coming-5",
            "title": "The Alpha's Revenge",
            "description": "She rejected him years ago. Now he's back as the most powerful alpha in the region.",
            "genre": "Romance",
            "thumbnail": "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600",
            "release_date": "Feb 14",
            "reserved_count": 15600
        }
    ]
    
    # Clear and insert coming soon
    await db.coming_soon.delete_many({})
    await db.coming_soon.insert_many(coming_soon_series)

@api_router.get("/")
async def root():
    return {"message": "MiniSeries API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await seed_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
