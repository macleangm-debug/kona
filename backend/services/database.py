"""
Database connection and initialization with connection pooling
Optimized for 10M+ users with proper indexing
"""
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGO_URL, DB_NAME

# MongoDB connection with connection pooling
client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=100,           # Max connections in pool
    minPoolSize=10,            # Min connections to keep open
    maxIdleTimeMS=30000,       # Close idle connections after 30s
    waitQueueTimeoutMS=5000,   # Timeout for waiting on connection
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    retryWrites=True,
    retryReads=True
)
db = client[DB_NAME]

async def create_indexes():
    """Create database indexes for optimal query performance"""
    print("📊 Creating database indexes...")
    
    # Users collection indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code", unique=True, sparse=True)
    await db.users.create_index("referred_by")
    await db.users.create_index("created_at")
    await db.users.create_index("total_episodes_watched")  # For leaderboards
    await db.users.create_index([("weekly_watch", -1)])    # For weekly leaderboard
    
    # Series collection indexes
    await db.series.create_index("id", unique=True)
    await db.series.create_index("genre")
    await db.series.create_index("featured")
    await db.series.create_index("views")
    await db.series.create_index("rating")
    await db.series.create_index([("views", -1), ("rating", -1)])  # Compound for sorting
    
    # Episodes collection indexes
    await db.episodes.create_index("id", unique=True)
    await db.episodes.create_index("series_id")
    await db.episodes.create_index([("series_id", 1), ("episode_number", 1)])
    
    # Notifications collection indexes
    await db.notifications.create_index("id", unique=True)
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.notifications.create_index("created_at", expireAfterSeconds=2592000)  # Auto-delete after 30 days
    
    # Transactions collection indexes
    await db.transactions.create_index("id", unique=True)
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("created_at")
    await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
    
    # Creators collection indexes
    await db.creators.create_index("id", unique=True)
    await db.creators.create_index("email", unique=True, sparse=True)  # sparse allows null values
    await db.creators.create_index("status")
    await db.creators.create_index("user_id")
    
    # Watch progress indexes (for continue watching)
    await db.users.create_index([("watch_progress", 1)])
    
    print("✅ Database indexes created successfully")

async def check_db_health():
    """Check database connection health"""
    try:
        await client.admin.command('ping')
        return {"status": "healthy", "message": "MongoDB connection OK"}
    except Exception as e:
        return {"status": "unhealthy", "message": str(e)}

