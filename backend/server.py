"""
Kona Mini-Series Backend - Refactored Main Server
"""
# Load environment variables FIRST
from dotenv import load_dotenv
load_dotenv()

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import api_router
from services.database import db

# ============ LOGGING ============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ SEED DATA ============
async def seed_data():
    """Seed initial data for testing/demo"""
    series_count = await db.series.count_documents({})
    if series_count >= 20:
        return  # Already seeded
    
    logger.info("Seeding database with sample data...")
    
    # Sample series data
    series_data = [
        {"id": "series-1", "title": "Love in the City", "description": "A romantic drama about finding love in the bustling city life", "thumbnail": "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.8, "total_episodes": 25, "views": 125000, "featured": True},
        {"id": "series-2", "title": "The Secret Heir", "description": "A billionaire discovers he has a secret child", "thumbnail": "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Drama", "rating": 4.6, "total_episodes": 30, "views": 98000, "featured": True},
        {"id": "series-3", "title": "Revenge of the Rejected", "description": "She returns more powerful than ever", "thumbnail": "https://images.pexels.com/photos/3807277/pexels-photo-3807277.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Thriller", "rating": 4.9, "total_episodes": 20, "views": 156000, "featured": True},
        {"id": "series-4", "title": "My CEO Husband", "description": "An unexpected contract marriage leads to true love", "thumbnail": "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.7, "total_episodes": 35, "views": 89000, "featured": True},
        {"id": "series-5", "title": "Werewolf's Mate", "description": "A supernatural love story", "thumbnail": "https://images.pexels.com/photos/3800517/pexels-photo-3800517.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "rating": 4.5, "total_episodes": 28, "views": 112000, "featured": True},
        {"id": "series-6", "title": "Campus Queen", "description": "High school drama and romance", "thumbnail": "https://images.pexels.com/photos/1462630/pexels-photo-1462630.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Teen", "rating": 4.4, "total_episodes": 22, "views": 78000, "featured": False},
        {"id": "series-7", "title": "The Mafia Boss Wife", "description": "Danger and passion intertwine", "thumbnail": "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Action", "rating": 4.8, "total_episodes": 40, "views": 145000, "featured": False},
        {"id": "series-8", "title": "Second Chance Romance", "description": "Ex-lovers reunite after years apart", "thumbnail": "https://images.pexels.com/photos/1405739/pexels-photo-1405739.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.3, "total_episodes": 18, "views": 67000, "featured": False},
        {"id": "series-9", "title": "The Cold CEO", "description": "Melting the heart of the ice king", "thumbnail": "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.6, "total_episodes": 32, "views": 93000, "featured": False},
        {"id": "series-10", "title": "Fake Marriage Real Love", "description": "A contract that becomes real", "thumbnail": "https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.5, "total_episodes": 24, "views": 81000, "featured": False},
        {"id": "series-11", "title": "Royal Scandal", "description": "Forbidden love in the palace", "thumbnail": "https://images.pexels.com/photos/2422915/pexels-photo-2422915.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Drama", "rating": 4.7, "total_episodes": 28, "views": 134000, "featured": False},
        {"id": "series-12", "title": "The Beta's Mate", "description": "A werewolf pack love triangle", "thumbnail": "https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "rating": 4.4, "total_episodes": 26, "views": 76000, "featured": False},
        {"id": "series-13", "title": "Office Romance", "description": "Love blooms between coworkers", "thumbnail": "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.2, "total_episodes": 20, "views": 58000, "featured": False},
        {"id": "series-14", "title": "Vampire King's Bride", "description": "An immortal love story", "thumbnail": "https://images.pexels.com/photos/3807755/pexels-photo-3807755.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "rating": 4.8, "total_episodes": 35, "views": 167000, "featured": False},
        {"id": "series-15", "title": "Street Fighter Love", "description": "A fighter falls for his rival", "thumbnail": "https://images.pexels.com/photos/4761671/pexels-photo-4761671.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Action", "rating": 4.3, "total_episodes": 22, "views": 72000, "featured": False},
        {"id": "series-16", "title": "Destined Hearts", "description": "Soulmates find each other against all odds", "thumbnail": "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.6, "total_episodes": 30, "views": 95000, "featured": False},
        {"id": "series-17", "title": "The Alpha's Secret", "description": "A pack leader hides a dangerous truth", "thumbnail": "https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "rating": 4.5, "total_episodes": 28, "views": 88000, "featured": False},
        {"id": "series-18", "title": "Billionaire's Baby", "description": "An unexpected pregnancy changes everything", "thumbnail": "https://images.pexels.com/photos/3807563/pexels-photo-3807563.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Drama", "rating": 4.4, "total_episodes": 25, "views": 102000, "featured": False},
        {"id": "series-19", "title": "Military Romance", "description": "Love on the battlefield", "thumbnail": "https://images.pexels.com/photos/8112199/pexels-photo-8112199.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Action", "rating": 4.7, "total_episodes": 24, "views": 118000, "featured": False},
        {"id": "series-20", "title": "Cinderella's Revenge", "description": "From rags to riches and revenge", "thumbnail": "https://images.pexels.com/photos/3807758/pexels-photo-3807758.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Drama", "rating": 4.8, "total_episodes": 32, "views": 143000, "featured": False},
        {"id": "series-21", "title": "Twin Swap", "description": "Identical twins switch lives", "thumbnail": "https://images.pexels.com/photos/3807741/pexels-photo-3807741.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Comedy", "rating": 4.3, "total_episodes": 18, "views": 65000, "featured": False},
        {"id": "series-22", "title": "The Dragon Prince", "description": "A mythical love across realms", "thumbnail": "https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "rating": 4.9, "total_episodes": 40, "views": 189000, "featured": False},
        {"id": "series-23", "title": "Arranged Marriage", "description": "Strangers forced together find love", "thumbnail": "https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.5, "total_episodes": 26, "views": 91000, "featured": False},
        {"id": "series-24", "title": "The Witch's Heart", "description": "Magic and love collide", "thumbnail": "https://images.pexels.com/photos/3807567/pexels-photo-3807567.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "rating": 4.6, "total_episodes": 22, "views": 84000, "featured": False},
        {"id": "series-25", "title": "Island Escape", "description": "Stranded together, falling in love", "thumbnail": "https://images.pexels.com/photos/1024984/pexels-photo-1024984.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Romance", "rating": 4.4, "total_episodes": 20, "views": 71000, "featured": False},
    ]
    
    await db.series.insert_many(series_data)
    
    # Generate episodes for each series
    episodes = []
    for series in series_data:
        for ep_num in range(1, series["total_episodes"] + 1):
            episodes.append({
                "id": f"{series['id']}-ep{ep_num}",
                "series_id": series["id"],
                "episode_number": ep_num,
                "title": f"Episode {ep_num}",
                "thumbnail": series["thumbnail"],
                "duration": f"{1 + (ep_num % 3)}:{str(30 + (ep_num * 7) % 30).zfill(2)}",
                "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                "is_free": ep_num == 1,  # First episode is free
                "coins_required": 0 if ep_num == 1 else 5
            })
    
    await db.episodes.insert_many(episodes)
    
    # Seed coming soon
    coming_soon = [
        {"id": "coming-1", "title": "Eternal Love", "description": "A timeless romance spanning centuries", "thumbnail": "https://images.pexels.com/photos/3807744/pexels-photo-3807744.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "release_date": "2026-02-14", "reserved_count": 1250},
        {"id": "coming-2", "title": "The Last Kingdom", "description": "Fight for the throne begins", "thumbnail": "https://images.pexels.com/photos/3807747/pexels-photo-3807747.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Action", "release_date": "2026-03-01", "reserved_count": 890},
        {"id": "coming-3", "title": "Moonlit Desires", "description": "Werewolf romance under the full moon", "thumbnail": "https://images.pexels.com/photos/3807750/pexels-photo-3807750.jpeg?auto=compress&cs=tinysrgb&w=800", "genre": "Fantasy", "release_date": "2026-02-28", "reserved_count": 2100},
    ]
    
    await db.coming_soon.insert_many(coming_soon)
    
    # Seed featured promos
    featured_promos = [
        {
            "id": "promo-christmas",
            "series_id": "series-1",
            "title": "CHRISTMAS",
            "subtitle": "Love in the City",
            "description": "A heartwarming holiday romance that will melt your heart",
            "promo_image": "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800",
            "tags": ["Romance", "Drama", "Holiday Special"],
            "badge_text": "SHORT DRAMA",
            "is_active": True,
            "priority": 10,
            "trigger_type": "both",
            "delay_seconds": 10,
            "created_at": "2026-01-01T00:00:00Z",
            "expires_at": None
        },
        {
            "id": "promo-thriller",
            "series_id": "series-3",
            "title": "REVENGE",
            "subtitle": "Revenge of the Rejected",
            "description": "She returns more powerful than ever",
            "promo_image": "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800",
            "tags": ["Thriller", "Drama", "Exclusive"],
            "badge_text": "NEW SERIES",
            "is_active": True,
            "priority": 5,
            "trigger_type": "timed",
            "delay_seconds": 15,
            "created_at": "2026-01-15T00:00:00Z",
            "expires_at": None
        }
    ]
    
    await db.featured_promos.insert_many(featured_promos)
    
    logger.info(f"Seeded {len(series_data)} series, {len(episodes)} episodes, {len(coming_soon)} coming soon, {len(featured_promos)} promos")

# ============ APP LIFECYCLE ============
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Kona Backend...")
    await seed_data()
    yield
    # Shutdown
    logger.info("Shutting down Kona Backend...")

# ============ CREATE APP ============
app = FastAPI(
    title="Kona Mini-Series API",
    description="Backend API for Kona - A coin-based mini-series streaming platform",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "kona-backend"}
