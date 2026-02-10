"""
Subscription tiers and benefits configuration
"""

# Subscription tiers with device limits and features
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "price_usd": 0,
        "device_limit": 3,
        "features": [
            "Watch free episodes",
            "Earn coins via daily rewards",
            "Basic video quality (720p)",
            "Ads on free content"
        ],
        "download_enabled": False,
        "max_downloads": 0,
        "ad_free": False,
        "video_quality": "720p",
        "priority_support": False
    },
    "basic": {
        "name": "Basic",
        "price_usd": 2.99,
        "device_limit": 5,
        "features": [
            "Watch free episodes",
            "HD video quality (1080p)",
            "5 devices",
            "Download up to 10 episodes",
            "Reduced ads"
        ],
        "download_enabled": True,
        "max_downloads": 10,
        "ad_free": False,
        "video_quality": "1080p",
        "priority_support": False
    },
    "premium": {
        "name": "Premium",
        "price_usd": 5.99,
        "device_limit": 7,
        "features": [
            "All Basic features",
            "Ad-free viewing",
            "7 devices",
            "Download up to 25 episodes",
            "Early access to new series",
            "Full HD quality"
        ],
        "download_enabled": True,
        "max_downloads": 25,
        "ad_free": True,
        "video_quality": "1080p",
        "priority_support": False
    },
    "vip": {
        "name": "VIP",
        "price_usd": 9.99,
        "device_limit": 10,
        "features": [
            "All Premium features",
            "10 devices",
            "Unlimited downloads",
            "4K quality (where available)",
            "Exclusive VIP content",
            "Priority customer support",
            "Monthly bonus coins (100)",
            "VIP badge on profile"
        ],
        "download_enabled": True,
        "max_downloads": -1,  # Unlimited
        "ad_free": True,
        "video_quality": "4k",
        "priority_support": True,
        "bonus_coins_monthly": 100
    }
}

def get_device_limit(subscription_tier: str) -> int:
    """Get device limit for a subscription tier"""
    tier = SUBSCRIPTION_TIERS.get(subscription_tier, SUBSCRIPTION_TIERS["free"])
    return tier["device_limit"]

def get_tier_features(subscription_tier: str) -> dict:
    """Get all features for a subscription tier"""
    return SUBSCRIPTION_TIERS.get(subscription_tier, SUBSCRIPTION_TIERS["free"])

def can_download(subscription_tier: str) -> bool:
    """Check if tier allows downloads"""
    tier = SUBSCRIPTION_TIERS.get(subscription_tier, SUBSCRIPTION_TIERS["free"])
    return tier.get("download_enabled", False)

def get_download_limit(subscription_tier: str) -> int:
    """Get download limit for a tier (-1 = unlimited)"""
    tier = SUBSCRIPTION_TIERS.get(subscription_tier, SUBSCRIPTION_TIERS["free"])
    return tier.get("max_downloads", 0)

def is_ad_free(subscription_tier: str) -> bool:
    """Check if tier has ad-free viewing"""
    tier = SUBSCRIPTION_TIERS.get(subscription_tier, SUBSCRIPTION_TIERS["free"])
    return tier.get("ad_free", False)
