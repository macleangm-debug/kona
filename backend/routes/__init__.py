"""Routes package"""
from fastapi import APIRouter

from .auth import router as auth_router
from .referral import router as referral_router
from .series import router as series_router
from .users import router as users_router
from .payments import router as payments_router
from .notifications import router as notifications_router
from .admin import router as admin_router
from .promos import router as promos_router
from .creator import router as creator_router
from .payouts import router as payouts_router
from .badges import router as badges_router
from .watch_party import router as watch_party_router

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(referral_router)
api_router.include_router(series_router)
api_router.include_router(users_router)
api_router.include_router(payments_router)
api_router.include_router(notifications_router)
api_router.include_router(admin_router)
api_router.include_router(promos_router)
api_router.include_router(creator_router)
api_router.include_router(payouts_router)
api_router.include_router(badges_router)
api_router.include_router(watch_party_router)
