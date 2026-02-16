"""
Security Middleware & Rate Limiting
Protection against bots, brute force attacks, and DDoS
"""
import re
import time
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from services.database import db

# ============ RATE LIMITER SETUP ============

def get_user_identifier(request: Request) -> str:
    """Get unique identifier for rate limiting (user ID or IP)"""
    # Try to get user from auth header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        # Hash token for privacy
        return f"user:{hashlib.md5(token.encode()).hexdigest()[:16]}"
    
    # Fall back to IP address
    return f"ip:{get_remote_address(request)}"


# Initialize rate limiter
limiter = Limiter(key_func=get_user_identifier)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded"""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down.",
            "retry_after": exc.detail
        },
        headers={"Retry-After": str(60)}
    )


# ============ BOT DETECTION ============

# Known bot user-agent patterns
BOT_PATTERNS = [
    r'bot(?![\w-])', r'crawler', r'spider', r'scraper',  # Common bots (bot with word boundary)
    r'python-requests', r'python-urllib', r'python-httpx',  # Python libraries
    r'go-http-client', r'java/', r'okhttp',  # Other languages
    r'postman', r'insomnia', r'httpie',  # API testing tools
    r'semrush', r'ahrefsbot', r'mj12bot', r'dotbot', r'petalbot',  # SEO bots
    r'phantomjs', r'selenium(?![\w-])',  # Headless browsers (but not in normal UA)
]

# Compiled regex for faster matching
BOT_REGEX = re.compile('|'.join(BOT_PATTERNS), re.IGNORECASE)

# Whitelisted bots (SEO, social media previews)
ALLOWED_BOTS = [
    r'googlebot', r'bingbot', r'facebookexternalhit', r'twitterbot', 
    r'linkedinbot', r'whatsapp', r'telegrambot', r'slackbot'
]
ALLOWED_BOT_REGEX = re.compile('|'.join(ALLOWED_BOTS), re.IGNORECASE)

# Suspicious patterns in requests
SUSPICIOUS_PATTERNS = [
    r'<script', r'javascript:', r'onerror=', r'onload=',  # XSS
    r'union\s+select', r'drop\s+table', r'\bor\b.*=.*',    # SQL injection
    r'\$where', r'\$gt', r'\$regex',                        # NoSQL injection
    r'\.\./', r'%2e%2e',                                    # Path traversal
]
SUSPICIOUS_REGEX = re.compile('|'.join(SUSPICIOUS_PATTERNS), re.IGNORECASE)


def is_bot(user_agent: str) -> bool:
    """Check if user agent is a bot"""
    if not user_agent:
        return False  # Allow requests without user agent (some mobile apps)
    
    user_agent_lower = user_agent.lower()
    
    # Allow all standard browsers
    browser_indicators = ['mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera', 'webkit']
    if any(indicator in user_agent_lower for indicator in browser_indicators):
        # It's a browser - allow it unless it's specifically a blocked bot
        return False
    
    # Check if it's an allowed bot (social media, search engines)
    if ALLOWED_BOT_REGEX.search(user_agent):
        return False
    
    # Check if it's a blocked bot pattern
    return bool(BOT_REGEX.search(user_agent))


def has_suspicious_content(request: Request) -> bool:
    """Check for suspicious patterns in request"""
    # Check URL path
    if SUSPICIOUS_REGEX.search(request.url.path):
        return True
    
    # Check query parameters
    query_string = str(request.query_params)
    if SUSPICIOUS_REGEX.search(query_string):
        return True
    
    return False


# ============ LOGIN ATTEMPT TRACKING ============

# In-memory store for login attempts (use Redis in production for multi-instance)
login_attempts = {}
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15


async def check_login_attempts(identifier: str) -> tuple[bool, int]:
    """
    Check if login is allowed for this identifier.
    Returns (is_allowed, remaining_attempts)
    """
    now = time.time()
    lockout_seconds = LOGIN_LOCKOUT_MINUTES * 60
    
    if identifier in login_attempts:
        attempts, first_attempt_time = login_attempts[identifier]
        
        # Reset if lockout period has passed
        if now - first_attempt_time > lockout_seconds:
            login_attempts[identifier] = (0, now)
            return True, LOGIN_MAX_ATTEMPTS
        
        # Check if locked out
        if attempts >= LOGIN_MAX_ATTEMPTS:
            remaining_time = int(lockout_seconds - (now - first_attempt_time))
            return False, remaining_time
        
        return True, LOGIN_MAX_ATTEMPTS - attempts
    
    return True, LOGIN_MAX_ATTEMPTS


async def record_login_attempt(identifier: str, success: bool):
    """Record a login attempt"""
    now = time.time()
    
    if success:
        # Clear attempts on successful login
        login_attempts.pop(identifier, None)
    else:
        if identifier in login_attempts:
            attempts, first_time = login_attempts[identifier]
            login_attempts[identifier] = (attempts + 1, first_time)
        else:
            login_attempts[identifier] = (1, now)


async def get_login_identifier(request: Request) -> str:
    """Get identifier for login tracking (IP + fingerprint)"""
    ip = get_remote_address(request)
    user_agent = request.headers.get("User-Agent", "")
    fingerprint = hashlib.md5(f"{ip}:{user_agent}".encode()).hexdigest()[:16]
    return fingerprint


# ============ SECURITY MIDDLEWARE ============

class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware"""
    
    # Paths that don't require bot protection (public API docs, health checks)
    EXEMPT_PATHS = ['/docs', '/redoc', '/openapi.json', '/health', '/api/health']
    
    # Paths with stricter rate limits
    SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password']
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        user_agent = request.headers.get("User-Agent", "")
        ip = get_remote_address(request)
        
        # Skip checks for exempt paths
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return await call_next(request)
        
        # 1. Bot Detection (for API endpoints)
        if path.startswith('/api/'):
            if is_bot(user_agent) and not any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
                # Log bot attempt
                await self._log_blocked_request(ip, user_agent, path, "bot_detected")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Automated requests are not allowed"}
                )
        
        # 2. Suspicious Content Check
        if has_suspicious_content(request):
            await self._log_blocked_request(ip, user_agent, path, "suspicious_content")
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid request"}
            )
        
        # 3. Login Attempt Check
        if path in ['/api/auth/login', '/api/auth/register']:
            identifier = await get_login_identifier(request)
            is_allowed, remaining = await check_login_attempts(identifier)
            
            if not is_allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Too many login attempts. Please try again in {remaining // 60} minutes.",
                        "retry_after": remaining
                    },
                    headers={"Retry-After": str(remaining)}
                )
        
        # 4. Add security headers to response
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response
    
    async def _log_blocked_request(self, ip: str, user_agent: str, path: str, reason: str):
        """Log blocked requests for monitoring"""
        try:
            await db.security_logs.insert_one({
                "ip": ip,
                "user_agent": user_agent[:500],  # Truncate long UAs
                "path": path,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception:
            pass  # Don't fail on logging errors


# ============ CAPTCHA VERIFICATION (Optional) ============

async def verify_captcha(token: str, secret_key: str = None) -> bool:
    """
    Verify reCAPTCHA or hCaptcha token
    Implement when adding captcha to forms
    """
    # Placeholder - implement with actual captcha service
    # import httpx
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         "https://www.google.com/recaptcha/api/siteverify",
    #         data={"secret": secret_key, "response": token}
    #     )
    #     return response.json().get("success", False)
    return True


# ============ HELPER FUNCTIONS ============

def get_client_ip(request: Request) -> str:
    """Get real client IP, handling proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


async def is_ip_blocked(ip: str) -> bool:
    """Check if IP is in blocklist"""
    blocked = await db.blocked_ips.find_one({"ip": ip, "active": True})
    return blocked is not None


async def block_ip(ip: str, reason: str, duration_hours: int = 24):
    """Add IP to blocklist"""
    await db.blocked_ips.update_one(
        {"ip": ip},
        {
            "$set": {
                "ip": ip,
                "reason": reason,
                "blocked_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=duration_hours)).isoformat(),
                "active": True
            }
        },
        upsert=True
    )
