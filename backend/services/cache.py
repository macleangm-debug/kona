"""
Redis caching service for high-performance data access
Supports 10M+ users with distributed caching
"""
import json
import os
from typing import Optional, Any
from datetime import timedelta
import redis.asyncio as redis
from functools import wraps

# Redis configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Cache TTL settings (in seconds)
CACHE_TTL = {
    "series": 3600,           # 1 hour - series don't change often
    "series_list": 1800,      # 30 minutes
    "episodes": 3600,         # 1 hour
    "user_profile": 300,      # 5 minutes - balance can change
    "leaderboard": 60,        # 1 minute - frequently updated
    "notifications": 30,      # 30 seconds
    "settings": 86400,        # 24 hours - rarely changes
}

class RedisCache:
    """Redis cache manager with automatic serialization"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.enabled = True
    
    async def connect(self):
        """Initialize Redis connection pool"""
        try:
            self.redis = redis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=50,  # Connection pooling
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            # Test connection
            await self.redis.ping()
            print("✅ Redis cache connected")
            self.enabled = True
        except Exception as e:
            print(f"⚠️ Redis unavailable, running without cache: {e}")
            self.enabled = False
            self.redis = None
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled or not self.redis:
            return None
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        if not self.enabled or not self.redis:
            return False
        try:
            await self.redis.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        if not self.enabled or not self.redis:
            return False
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.enabled or not self.redis:
            return 0
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                await self.redis.delete(*keys)
            return len(keys)
        except Exception as e:
            print(f"Cache delete pattern error: {e}")
            return 0
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment a counter"""
        if not self.enabled or not self.redis:
            return 0
        try:
            return await self.redis.incrby(key, amount)
        except Exception as e:
            print(f"Cache increment error: {e}")
            return 0
    
    async def get_or_set(self, key: str, fetch_func, ttl: int = 3600) -> Any:
        """Get from cache or fetch and cache"""
        # Try cache first
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Fetch fresh data
        data = await fetch_func()
        
        # Cache it
        if data is not None:
            await self.set(key, data, ttl)
        
        return data

# Singleton instance
cache = RedisCache()

# Cache key generators
def series_key(series_id: str) -> str:
    return f"series:{series_id}"

def series_list_key(genre: str = "all", page: int = 1) -> str:
    return f"series_list:{genre}:{page}"

def episodes_key(series_id: str) -> str:
    return f"episodes:{series_id}"

def user_key(user_id: str) -> str:
    return f"user:{user_id}"

def leaderboard_key(period: str) -> str:
    return f"leaderboard:{period}"

def notifications_key(user_id: str) -> str:
    return f"notifications:{user_id}"

# Cache invalidation helpers
async def invalidate_series(series_id: str):
    """Invalidate series cache when updated"""
    await cache.delete(series_key(series_id))
    await cache.delete_pattern("series_list:*")

async def invalidate_user(user_id: str):
    """Invalidate user cache when profile changes"""
    await cache.delete(user_key(user_id))

async def invalidate_leaderboard():
    """Invalidate all leaderboard caches"""
    await cache.delete_pattern("leaderboard:*")
