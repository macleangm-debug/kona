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
    user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hash_password(data.password),
        "coins": 50,  # Welcome bonus
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_daily_reward": None,
        "unlocked_episodes": [],
        "watch_progress": {}
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        coins=user["coins"],
        created_at=user["created_at"],
        last_daily_reward=user["last_daily_reward"]
    )
    return TokenResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        coins=user["coins"],
        created_at=user["created_at"],
        last_daily_reward=user.get("last_daily_reward")
    )
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        coins=user["coins"],
        created_at=user["created_at"],
        last_daily_reward=user.get("last_daily_reward")
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

# ============ COIN STORE ============
@api_router.get("/store/packages", response_model=List[CoinPackage])
async def get_packages():
    return list(COIN_PACKAGES.values())

@api_router.post("/store/checkout")
async def create_checkout(data: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    if data.package_id not in COIN_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = COIN_PACKAGES[data.package_id]
    api_key = os.environ.get('STRIPE_API_KEY')
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/store?session_id={{CHECKOUT_SESSION_ID}}"
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
        "user_id": user["id"],
        "package_id": package.id,
        "amount": package.price,
        "currency": "usd",
        "coins": package.coins + package.bonus,
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/store/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if transaction and transaction["payment_status"] != "paid" and status.payment_status == "paid":
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
        "currency": status.currency
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

# ============ SEED DATA ============
async def seed_data():
    # Check if already seeded
    existing = await db.series.find_one({})
    if existing:
        return
    
    sample_series = [
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
            "featured": False
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
            "featured": False
        },
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
