"""
Application configuration and constants
"""
import os
from datetime import timezone

# Environment
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET", "kona-mini-series-jwt-secret-key-2024-secure")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

# Daily Rewards - PROFIT FOCUSED (very low to encourage purchases)
DAILY_REWARD_COINS = 3

# Referral Rewards
REFERRAL_REWARD_REFERRER = 20
REFERRAL_REWARD_REFEREE = 30

# Referral Milestones
REFERRAL_MILESTONES = [
    {
        "id": "bronze",
        "name": "Bronze",
        "icon": "🥉",
        "required_referrals": 10,
        "reward_coins": 100,
        "reward_description": "100 bonus coins"
    },
    {
        "id": "silver",
        "name": "Silver",
        "icon": "🥈",
        "required_referrals": 25,
        "reward_coins": 300,
        "reward_description": "300 bonus coins"
    },
    {
        "id": "gold",
        "name": "Gold",
        "icon": "🥇",
        "required_referrals": 50,
        "reward_coins": 600,
        "reward_description": "600 bonus coins"
    },
    {
        "id": "platinum",
        "name": "Platinum",
        "icon": "💎",
        "required_referrals": 100,
        "reward_coins": 1500,
        "reward_description": "1500 bonus coins"
    },
    {
        "id": "diamond",
        "name": "Diamond",
        "icon": "👑",
        "required_referrals": 200,
        "reward_coins": 4000,
        "reward_description": "4000 bonus coins + Legend badge"
    }
]

# Subscription Plans
SUBSCRIPTION_PLANS = [
    {
        "id": "basic",
        "name": "Basic",
        "price": 4.99,
        "coins_per_month": 100,
        "description": "100 coins/month",
        "features": ["100 coins monthly", "Daily rewards", "Basic support"],
        "popular": False
    },
    {
        "id": "standard",
        "name": "Standard",
        "price": 9.99,
        "coins_per_month": 250,
        "description": "250 coins/month + Bonus",
        "features": ["250 coins monthly", "10% bonus coins", "Daily rewards", "Priority support"],
        "popular": True
    },
    {
        "id": "premium",
        "name": "Premium",
        "price": 19.99,
        "coins_per_month": 600,
        "description": "600 coins/month + VIP",
        "features": ["600 coins monthly", "20% bonus coins", "Daily rewards", "VIP support", "Early access"],
        "popular": False
    },
    {
        "id": "ultimate",
        "name": "Ultimate",
        "price": 39.99,
        "coins_per_month": 1500,
        "description": "1500 coins/month + All perks",
        "features": ["1500 coins monthly", "30% bonus coins", "Daily rewards", "VIP support", "Early access", "Exclusive content"],
        "popular": False
    }
]

# Country/Payment Configuration
AFRICAN_COUNTRIES = {
    "KE": {"name": "Kenya", "currency": "KES", "payment_methods": ["mpesa", "card"], "exchange_rate": 155.0},
    "TZ": {"name": "Tanzania", "currency": "TZS", "payment_methods": ["mpesa", "tigopesa", "card"], "exchange_rate": 2500.0},
    "UG": {"name": "Uganda", "currency": "UGX", "payment_methods": ["mtn_momo", "airtel_money", "card"], "exchange_rate": 3800.0},
    "RW": {"name": "Rwanda", "currency": "RWF", "payment_methods": ["mtn_momo", "card"], "exchange_rate": 1250.0},
    "CD": {"name": "DR Congo", "currency": "CDF", "payment_methods": ["mpesa", "orange_money", "card"], "exchange_rate": 2750.0},
    "BI": {"name": "Burundi", "currency": "BIF", "payment_methods": ["ecocash", "card"], "exchange_rate": 2850.0},
    "SS": {"name": "South Sudan", "currency": "SSP", "payment_methods": ["mtn_momo", "card"], "exchange_rate": 950.0},
    "GH": {"name": "Ghana", "currency": "GHS", "payment_methods": ["mtn_momo", "vodafone_cash", "card"], "exchange_rate": 15.0},
    "NG": {"name": "Nigeria", "currency": "NGN", "payment_methods": ["card", "bank_transfer"], "exchange_rate": 1550.0},
    "ZA": {"name": "South Africa", "currency": "ZAR", "payment_methods": ["card"], "exchange_rate": 19.0},
}

INTERNATIONAL_CONFIG = {
    "currency": "USD",
    "payment_methods": ["card"],
    "exchange_rate": 1.0
}

# Coin Packages
COIN_PACKAGES = [
    {"id": "starter", "coins": 50, "price": 0.99, "bonus": 0, "popular": False},
    {"id": "basic", "coins": 120, "price": 1.99, "bonus": 20, "popular": False},
    {"id": "value", "coins": 350, "price": 4.99, "bonus": 50, "popular": True},
    {"id": "premium", "coins": 800, "price": 9.99, "bonus": 150, "popular": False},
]
