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
from .downloads import router as downloads_router
from .investment import router as investment_router
from .infrastructure import router as infrastructure_router
from .gamification import router as gamification_router
from .safeguards import router as safeguards_router
from .revenue import router as revenue_router
from .streaming import router as streaming_router
from .advertiser import router as advertiser_router
from .subscriptions import router as subscriptions_router
from .exchange_rates import router as exchange_rates_router
from .ab_testing import router as ab_testing_router
from .support import router as support_router
from .careers import router as careers_router
from .press import router as press_router

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
api_router.include_router(downloads_router)
api_router.include_router(investment_router)
api_router.include_router(infrastructure_router)
api_router.include_router(gamification_router)
api_router.include_router(safeguards_router)
api_router.include_router(revenue_router)
api_router.include_router(streaming_router)
api_router.include_router(advertiser_router)
api_router.include_router(subscriptions_router)
api_router.include_router(exchange_rates_router)
api_router.include_router(ab_testing_router)
api_router.include_router(support_router)
api_router.include_router(careers_router, prefix="/careers", tags=["careers"])
