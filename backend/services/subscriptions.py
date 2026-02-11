"""
Subscription Payment Service with KwikPay Integration
Handles subscription purchases, renewals, and management
Uses dynamic exchange rates with configurable margins
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum

from config.subscriptions import SUBSCRIPTION_TIERS, get_device_limit

# Import dynamic exchange rate service
from services.exchange_rates import exchange_rate_service, COUNTRY_CURRENCIES

# Mobile Money providers by country
PAYMENT_PROVIDERS = {
    "KE": {
        "name": "Kenya",
        "currency": "KES",
        "providers": [
            {"id": "mpesa", "name": "M-Pesa", "type": "mobile_money"},
            {"id": "airtel_money", "name": "Airtel Money", "type": "mobile_money"}
        ]
    },
    "TZ": {
        "name": "Tanzania",
        "currency": "TZS",
        "providers": [
            {"id": "vodacom_mpesa", "name": "Vodacom M-Pesa", "type": "mobile_money"},
            {"id": "tigopesa", "name": "Tigo Pesa", "type": "mobile_money"},
            {"id": "airtel_money", "name": "Airtel Money", "type": "mobile_money"}
        ]
    },
    "UG": {
        "name": "Uganda",
        "currency": "UGX",
        "providers": [
            {"id": "mtn_mobile_money", "name": "MTN Mobile Money", "type": "mobile_money"},
            {"id": "airtel_money", "name": "Airtel Money", "type": "mobile_money"}
        ]
    },
    "RW": {
        "name": "Rwanda",
        "currency": "RWF",
        "providers": [
            {"id": "mtn_mobile_money", "name": "MTN Mobile Money", "type": "mobile_money"},
            {"id": "airtel_money", "name": "Airtel Money", "type": "mobile_money"}
        ]
    },
    "GH": {
        "name": "Ghana",
        "currency": "GHS",
        "providers": [
            {"id": "mtn_mobile_money", "name": "MTN Mobile Money", "type": "mobile_money"},
            {"id": "vodafone_cash", "name": "Vodafone Cash", "type": "mobile_money"},
            {"id": "airtel_tigo", "name": "AirtelTigo Money", "type": "mobile_money"}
        ]
    },
    "NG": {
        "name": "Nigeria",
        "currency": "NGN",
        "providers": [
            {"id": "card", "name": "Debit/Credit Card", "type": "card"},
            {"id": "bank_transfer", "name": "Bank Transfer", "type": "bank"}
        ]
    },
    "ZA": {
        "name": "South Africa",
        "currency": "ZAR",
        "providers": [
            {"id": "card", "name": "Debit/Credit Card", "type": "card"},
            {"id": "eft", "name": "EFT (Bank Transfer)", "type": "bank"}
        ]
    }
}

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"
    FAILED = "failed"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class KwikPaySubscriptionService:
    """
    KwikPay Subscription Service - MOCK IMPLEMENTATION
    Handles subscription payments via mobile money and other local methods
    Uses dynamic exchange rates with configurable Kona margins
    """
    
    BASE_URL = "https://api.kwikpay.com/v1"
    
    def __init__(self):
        self.api_key = os.environ.get("KWIKPAY_API_KEY", "")
        self.secret_key = os.environ.get("KWIKPAY_SECRET_KEY", "")
        self.is_configured = bool(self.api_key and self.secret_key)
        self.mock_mode = True  # Always mock until KwikPay is ready
    
    async def convert_usd_to_local(self, usd_amount: float, country_code: str) -> Dict[str, Any]:
        """
        Convert USD price to local currency using dynamic rates with margin
        The margin is Kona's revenue and is NOT shown to creators
        """
        # Use the dynamic exchange rate service
        result = await exchange_rate_service.convert_usd_to_local(
            usd_amount, 
            country_code,
            include_margin=True
        )
        
        return {
            "usd_amount": result["usd_amount"],
            "local_amount": result["local_amount"],
            "currency": result["currency"],
            "exchange_rate": result["base_rate"],
            "effective_rate": result["base_rate"] * (1 + result["margin_percent"] / 100),
            "margin_percent": result["margin_percent"],
            "kona_revenue_local": result["kona_revenue_local"],
            "kona_revenue_usd": result["kona_revenue_usd"],
            "rate_source": result["rate_source"]
        }
    
    def convert_usd_to_local_sync(self, usd_amount: float, country_code: str) -> Dict[str, Any]:
        """
        Synchronous fallback for non-async contexts
        Uses fallback rates without live update
        """
        from services.exchange_rates import FALLBACK_RATES
        
        currency_code = COUNTRY_CURRENCIES.get(country_code, "usd").lower()
        rate = FALLBACK_RATES.get(currency_code, 1)
        local_amount = round(usd_amount * rate * 1.03, 0)  # 3% default margin
        
        return {
            "usd_amount": usd_amount,
            "local_amount": local_amount,
            "currency": currency_code.upper(),
            "exchange_rate": rate
        }
    
    def get_payment_providers(self, country_code: str) -> Dict[str, Any]:
        """Get available payment providers for a country"""
        config = PAYMENT_PROVIDERS.get(country_code, PAYMENT_PROVIDERS.get("KE"))
        return {
            "country_code": country_code,
            "country_name": config.get("name", "Unknown"),
            "currency": config.get("currency", "USD"),
            "providers": config.get("providers", [])
        }
    
    async def initiate_subscription_payment(
        self,
        user_id: str,
        tier: str,
        country_code: str,
        provider_id: str,
        phone_number: Optional[str] = None,
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate a subscription payment via KwikPay
        
        Args:
            user_id: User's ID
            tier: Subscription tier (basic, premium, vip)
            country_code: User's country code
            provider_id: Payment provider ID (mpesa, mtn_mobile_money, etc.)
            phone_number: For mobile money payments
            email: For card payments
        
        Returns:
            Payment initiation response with checkout details
        """
        
        # Get tier details
        tier_info = SUBSCRIPTION_TIERS.get(tier)
        if not tier_info:
            return {"status": "error", "message": f"Invalid subscription tier: {tier}"}
        
        # Convert price to local currency
        price_info = self.convert_usd_to_local(tier_info["price_usd"], country_code)
        
        # Generate payment reference
        payment_ref = f"sub_{uuid.uuid4().hex[:12]}"
        
        # MOCK RESPONSE
        if self.mock_mode:
            # Simulate STK push for mobile money
            provider_config = PAYMENT_PROVIDERS.get(country_code, {})
            provider = next((p for p in provider_config.get("providers", []) if p["id"] == provider_id), None)
            
            if provider and provider["type"] == "mobile_money":
                return {
                    "status": "success",
                    "message": "Payment request sent to your phone",
                    "data": {
                        "payment_id": payment_ref,
                        "checkout_type": "stk_push",
                        "tier": tier,
                        "tier_name": tier_info["name"],
                        "amount": {
                            "usd": tier_info["price_usd"],
                            "local": price_info["local_amount"],
                            "currency": price_info["currency"]
                        },
                        "provider": provider,
                        "phone_number": phone_number,
                        "status": "pending",
                        "instructions": f"Check your phone for the {provider['name']} payment prompt. Enter your PIN to complete the payment.",
                        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
                        "poll_url": f"/api/subscriptions/payment/{payment_ref}/status"
                    },
                    "mock": True
                }
            else:
                # Card or bank payment - return checkout URL
                return {
                    "status": "success",
                    "message": "Checkout session created",
                    "data": {
                        "payment_id": payment_ref,
                        "checkout_type": "redirect",
                        "checkout_url": f"https://checkout.kwikpay.com/{payment_ref}",
                        "tier": tier,
                        "tier_name": tier_info["name"],
                        "amount": {
                            "usd": tier_info["price_usd"],
                            "local": price_info["local_amount"],
                            "currency": price_info["currency"]
                        },
                        "status": "pending",
                        "instructions": "Complete payment on the checkout page",
                        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
                        "callback_url": f"/api/subscriptions/payment/{payment_ref}/callback"
                    },
                    "mock": True
                }
        
        # REAL IMPLEMENTATION (for when KwikPay is ready)
        # ... actual API calls would go here
        return {"status": "error", "message": "KwikPay integration pending"}
    
    async def check_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Check the status of a subscription payment"""
        
        # MOCK RESPONSE - Simulate successful payment after a few checks
        if self.mock_mode:
            # In a real scenario, we'd track payment attempts in DB
            # For demo, we'll return success
            return {
                "status": "success",
                "data": {
                    "payment_id": payment_id,
                    "payment_status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "receipt_number": f"RCP{uuid.uuid4().hex[:8].upper()}"
                },
                "mock": True
            }
        
        return {"status": "error", "message": "KwikPay integration pending"}
    
    async def cancel_subscription(self, subscription_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Cancel a subscription (stops auto-renewal)"""
        
        # MOCK RESPONSE
        if self.mock_mode:
            return {
                "status": "success",
                "message": "Subscription cancelled. You'll have access until the end of your billing period.",
                "data": {
                    "subscription_id": subscription_id,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "reason": reason,
                    "access_until": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                },
                "mock": True
            }
        
        return {"status": "error", "message": "KwikPay integration pending"}


# Global instance
kwikpay_subscription = KwikPaySubscriptionService()
