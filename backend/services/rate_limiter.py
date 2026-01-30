"""
Rate limiting middleware for API protection
Prevents abuse and ensures fair usage across 10M users
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Rate limit configurations by endpoint type
RATE_LIMITS = {
    "default": "100/minute",           # General endpoints
    "auth": "10/minute",               # Login/register - prevent brute force
    "spin": "10/minute",               # Spin wheel - prevent abuse
    "purchase": "20/minute",           # Purchases
    "heavy": "30/minute",              # Heavy operations
    "search": "60/minute",             # Search queries
    "notifications": "120/minute",     # Notifications - higher limit
}

def get_user_identifier(request: Request) -> str:
    """Get unique identifier for rate limiting - prefer user ID over IP"""
    # Try to get user from auth header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        # Use a hash of the token as identifier
        token = auth_header[7:]
        return f"user:{hash(token) % 10000000}"
    
    # Fall back to IP address
    return get_remote_address(request)

# Initialize limiter
limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=["100/minute"],
    storage_uri="memory://",  # Use Redis in production: "redis://localhost:6379"
    strategy="fixed-window"
)

def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": exc.detail
        }
    )

# Decorator shortcuts for common limits
def limit_auth(func):
    """Rate limit for auth endpoints"""
    return limiter.limit(RATE_LIMITS["auth"])(func)

def limit_spin(func):
    """Rate limit for spin wheel"""
    return limiter.limit(RATE_LIMITS["spin"])(func)

def limit_purchase(func):
    """Rate limit for purchases"""
    return limiter.limit(RATE_LIMITS["purchase"])(func)

def limit_heavy(func):
    """Rate limit for heavy operations"""
    return limiter.limit(RATE_LIMITS["heavy"])(func)

def limit_search(func):
    """Rate limit for search"""
    return limiter.limit(RATE_LIMITS["search"])(func)
