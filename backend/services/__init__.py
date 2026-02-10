"""Services package"""
from .database import db, client, create_indexes, check_db_health
from .auth import (
    hash_password, 
    verify_password, 
    create_token,
    decode_token,
    generate_referral_code,
    get_current_user,
    get_optional_user,
    security,
    create_session,
    check_device_limit,
    invalidate_session,
    invalidate_all_sessions,
    parse_device_info,
    DEFAULT_DEVICE_LIMIT
)
from .geo import (
    detect_country_from_ip, 
    get_payment_config, 
    convert_price,
    check_geo_targeting,
    get_geo_targeting_options,
    get_region_for_country,
    get_languages_for_country,
    haversine_distance,
    AFRICAN_REGIONS,
    AFRICAN_CITIES,
    AFRICAN_LANGUAGES
)
from .bunny import bunny_service, BunnyStreamService
from .payouts import payout_service, flutterwave_payout, kwikpay_service
from .cache import cache, CACHE_TTL, series_key, user_key, leaderboard_key
from .rate_limiter import limiter, custom_rate_limit_handler, RATE_LIMITS

# Subscription helpers
from config.subscriptions import (
    SUBSCRIPTION_TIERS,
    get_device_limit,
    get_tier_features,
    can_download,
    get_download_limit,
    is_ad_free
)
