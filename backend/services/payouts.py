"""
Payout Services - Flutterwave + KwikPay (Mock)
Handles creator payouts via local payment channels
"""
import os
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from enum import Enum

# ============ PAYOUT PROVIDERS ============

class PayoutProvider(str, Enum):
    FLUTTERWAVE = "flutterwave"
    KWIKPAY = "kwikpay"

class PayoutMethod(str, Enum):
    MOBILE_MONEY = "mobile_money"
    BANK_TRANSFER = "bank_transfer"

class PayoutStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# ============ MOBILE MONEY CONFIG ============

MOBILE_MONEY_PROVIDERS = {
    "KE": {
        "name": "Kenya",
        "currency": "KES",
        "providers": ["mpesa", "airtel_money"],
        "default_provider": "mpesa"
    },
    "TZ": {
        "name": "Tanzania",
        "currency": "TZS",
        "providers": ["vodacom_mpesa", "tigopesa", "airtel_money"],
        "default_provider": "vodacom_mpesa"
    },
    "UG": {
        "name": "Uganda",
        "currency": "UGX",
        "providers": ["mtn_mobile_money", "airtel_money"],
        "default_provider": "mtn_mobile_money"
    },
    "RW": {
        "name": "Rwanda",
        "currency": "RWF",
        "providers": ["mtn_mobile_money", "airtel_money"],
        "default_provider": "mtn_mobile_money"
    },
    "GH": {
        "name": "Ghana",
        "currency": "GHS",
        "providers": ["mtn_mobile_money", "vodafone_cash", "airtel_tigo"],
        "default_provider": "mtn_mobile_money"
    },
    "NG": {
        "name": "Nigeria",
        "currency": "NGN",
        "providers": ["bank_transfer"],  # Nigeria mainly uses bank transfers
        "default_provider": "bank_transfer"
    }
}

# Coin to USD conversion rate (1 coin = $0.01)
COIN_TO_USD_RATE = 0.01

# Exchange rates (USD to local currency) - In production, fetch real-time rates
EXCHANGE_RATES = {
    "KES": 130,
    "TZS": 2500,
    "UGX": 3700,
    "RWF": 1300,
    "GHS": 15,
    "NGN": 1600,
    "USD": 1
}


# ============ FLUTTERWAVE PAYOUT SERVICE ============

class FlutterwavePayoutService:
    """Flutterwave Payouts API Integration"""
    
    BASE_URL = "https://api.flutterwave.com/v3"
    
    def __init__(self):
        self.secret_key = os.environ.get("FLUTTERWAVE_SECRET_KEY", "")
        self.is_configured = bool(self.secret_key)
    
    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
    
    async def create_mobile_money_transfer(
        self,
        amount: float,
        currency: str,
        phone_number: str,
        network: str,
        reference: str,
        narration: str = "Kona Creator Payout"
    ) -> Dict[str, Any]:
        """Create mobile money transfer via Flutterwave"""
        if not self.is_configured:
            return {
                "status": "error",
                "message": "Flutterwave not configured",
                "mock": True
            }
        
        payload = {
            "account_bank": network,
            "account_number": phone_number,
            "amount": amount,
            "currency": currency,
            "narration": narration,
            "reference": reference,
            "callback_url": f"{os.environ.get('BACKEND_URL', '')}/api/payouts/webhook/flutterwave"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/transfers",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def create_bank_transfer(
        self,
        amount: float,
        currency: str,
        account_number: str,
        bank_code: str,
        account_name: str,
        reference: str,
        narration: str = "Kona Creator Payout"
    ) -> Dict[str, Any]:
        """Create bank transfer via Flutterwave"""
        if not self.is_configured:
            return {
                "status": "error",
                "message": "Flutterwave not configured",
                "mock": True
            }
        
        payload = {
            "account_bank": bank_code,
            "account_number": account_number,
            "amount": amount,
            "currency": currency,
            "narration": narration,
            "reference": reference,
            "beneficiary_name": account_name,
            "callback_url": f"{os.environ.get('BACKEND_URL', '')}/api/payouts/webhook/flutterwave"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/transfers",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def get_transfer_status(self, transfer_id: str) -> Dict[str, Any]:
        """Get transfer status from Flutterwave"""
        if not self.is_configured:
            return {"status": "error", "message": "Flutterwave not configured"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/transfers/{transfer_id}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def get_banks(self, country_code: str) -> Dict[str, Any]:
        """Get list of banks for a country"""
        if not self.is_configured:
            # Return mock banks for demo
            return {
                "status": "success",
                "data": [
                    {"code": "044", "name": "Access Bank"},
                    {"code": "023", "name": "Citibank"},
                    {"code": "063", "name": "Diamond Bank"},
                    {"code": "050", "name": "EcoBank"},
                    {"code": "070", "name": "Fidelity Bank"},
                ]
            }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/banks/{country_code}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}


# ============ KWIKPAY MOCK SERVICE ============

class KwikPayService:
    """
    KwikPay Payment Aggregator - MOCK IMPLEMENTATION
    Ready to be connected when KwikPay is developed.
    
    API Structure follows industry standard payment aggregator patterns.
    """
    
    BASE_URL = "https://api.kwikpay.com/v1"  # Future API URL
    
    def __init__(self):
        self.api_key = os.environ.get("KWIKPAY_API_KEY", "")
        self.secret_key = os.environ.get("KWIKPAY_SECRET_KEY", "")
        self.is_configured = bool(self.api_key and self.secret_key)
        self.mock_mode = True  # Always mock until KwikPay is ready
    
    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-Secret-Key": self.secret_key,
            "Content-Type": "application/json"
        }
    
    async def create_payout(
        self,
        amount: float,
        currency: str,
        recipient_type: str,  # "mobile_money" or "bank"
        recipient_details: Dict[str, Any],
        reference: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a payout via KwikPay
        
        Args:
            amount: Amount in local currency
            currency: Currency code (KES, TZS, UGX, etc.)
            recipient_type: "mobile_money" or "bank"
            recipient_details: {
                For mobile_money: {"phone": "+254...", "provider": "mpesa"}
                For bank: {"account_number": "...", "bank_code": "...", "account_name": "..."}
            }
            reference: Unique transaction reference
            metadata: Optional metadata (creator_id, payout_id, etc.)
        
        Returns:
            Payout response with transaction ID and status
        """
        
        # MOCK RESPONSE - Replace with real API call when KwikPay is ready
        if self.mock_mode:
            mock_transaction_id = f"kwk_{uuid.uuid4().hex[:12]}"
            return {
                "status": "success",
                "message": "Payout initiated successfully",
                "data": {
                    "transaction_id": mock_transaction_id,
                    "reference": reference,
                    "amount": amount,
                    "currency": currency,
                    "recipient_type": recipient_type,
                    "recipient": recipient_details,
                    "status": "processing",
                    "estimated_completion": "2-5 minutes",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "fees": {
                        "kwikpay_fee": round(amount * 0.01, 2),  # 1% fee
                        "network_fee": round(amount * 0.005, 2)  # 0.5% network fee
                    }
                },
                "mock": True,
                "note": "This is a mock response. KwikPay integration pending."
            }
        
        # REAL IMPLEMENTATION (for when KwikPay is ready)
        payload = {
            "amount": amount,
            "currency": currency,
            "recipient_type": recipient_type,
            "recipient": recipient_details,
            "reference": reference,
            "metadata": metadata or {},
            "callback_url": f"{os.environ.get('BACKEND_URL', '')}/api/payouts/webhook/kwikpay"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/payouts",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def get_payout_status(self, transaction_id: str) -> Dict[str, Any]:
        """Get payout status from KwikPay"""
        
        # MOCK RESPONSE
        if self.mock_mode:
            return {
                "status": "success",
                "data": {
                    "transaction_id": transaction_id,
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                },
                "mock": True
            }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/payouts/{transaction_id}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def get_supported_providers(self, country_code: str) -> Dict[str, Any]:
        """Get supported payment providers for a country"""
        
        # MOCK RESPONSE - Return actual mobile money providers
        providers = MOBILE_MONEY_PROVIDERS.get(country_code, {})
        return {
            "status": "success",
            "data": {
                "country": country_code,
                "country_name": providers.get("name", "Unknown"),
                "currency": providers.get("currency", "USD"),
                "mobile_money_providers": providers.get("providers", []),
                "bank_transfer_supported": country_code in ["NG", "KE", "GH"],
                "default_provider": providers.get("default_provider")
            },
            "mock": True
        }
    
    async def get_exchange_rate(self, from_currency: str, to_currency: str) -> Dict[str, Any]:
        """Get exchange rate between currencies"""
        
        # MOCK RESPONSE
        if self.mock_mode:
            from_rate = EXCHANGE_RATES.get(from_currency, 1)
            to_rate = EXCHANGE_RATES.get(to_currency, 1)
            rate = to_rate / from_rate
            
            return {
                "status": "success",
                "data": {
                    "from_currency": from_currency,
                    "to_currency": to_currency,
                    "rate": rate,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                },
                "mock": True
            }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/rates/{from_currency}/{to_currency}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}


# ============ UNIFIED PAYOUT SERVICE ============

class PayoutService:
    """
    Unified Payout Service
    Routes payouts through the best available provider based on country and method
    """
    
    def __init__(self):
        self.flutterwave = FlutterwavePayoutService()
        self.kwikpay = KwikPayService()
    
    def get_best_provider(self, country_code: str, method: PayoutMethod) -> PayoutProvider:
        """Determine best payout provider based on country and method"""
        
        # KwikPay preferred for East African mobile money (when ready)
        east_africa = ["KE", "TZ", "UG", "RW"]
        west_africa = ["NG", "GH"]
        
        if country_code in east_africa and method == PayoutMethod.MOBILE_MONEY:
            # Use KwikPay for East Africa mobile money (mock for now)
            return PayoutProvider.KWIKPAY
        elif country_code in west_africa or method == PayoutMethod.BANK_TRANSFER:
            # Use Flutterwave for West Africa and bank transfers
            return PayoutProvider.FLUTTERWAVE
        else:
            # Default to KwikPay
            return PayoutProvider.KWIKPAY
    
    def convert_coins_to_local(self, coins: int, currency: str) -> float:
        """Convert coins to local currency"""
        usd_amount = coins * COIN_TO_USD_RATE
        exchange_rate = EXCHANGE_RATES.get(currency, 1)
        return round(usd_amount * exchange_rate, 2)
    
    async def create_payout(
        self,
        creator_id: str,
        coins: int,
        country_code: str,
        method: PayoutMethod,
        recipient_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a payout for a creator
        
        Args:
            creator_id: Creator's ID
            coins: Number of coins to pay out
            country_code: Creator's country
            method: Payment method (mobile_money or bank_transfer)
            recipient_details: Payment details (phone/account info)
        
        Returns:
            Payout result with transaction details
        """
        
        # Get currency and convert amount
        country_config = MOBILE_MONEY_PROVIDERS.get(country_code, {})
        currency = country_config.get("currency", "USD")
        local_amount = self.convert_coins_to_local(coins, currency)
        
        # Generate reference
        reference = f"kona_payout_{uuid.uuid4().hex[:8]}"
        
        # Determine provider
        provider = self.get_best_provider(country_code, method)
        
        # Route to appropriate provider
        if provider == PayoutProvider.KWIKPAY:
            result = await self.kwikpay.create_payout(
                amount=local_amount,
                currency=currency,
                recipient_type=method.value,
                recipient_details=recipient_details,
                reference=reference,
                metadata={"creator_id": creator_id, "coins": coins}
            )
        else:
            if method == PayoutMethod.MOBILE_MONEY:
                result = await self.flutterwave.create_mobile_money_transfer(
                    amount=local_amount,
                    currency=currency,
                    phone_number=recipient_details.get("phone", ""),
                    network=recipient_details.get("provider", ""),
                    reference=reference
                )
            else:
                result = await self.flutterwave.create_bank_transfer(
                    amount=local_amount,
                    currency=currency,
                    account_number=recipient_details.get("account_number", ""),
                    bank_code=recipient_details.get("bank_code", ""),
                    account_name=recipient_details.get("account_name", ""),
                    reference=reference
                )
        
        return {
            "provider": provider.value,
            "reference": reference,
            "coins": coins,
            "local_amount": local_amount,
            "currency": currency,
            "result": result
        }
    
    async def get_payout_options(self, country_code: str) -> Dict[str, Any]:
        """Get available payout options for a country"""
        
        country_config = MOBILE_MONEY_PROVIDERS.get(country_code, {})
        
        return {
            "country": country_code,
            "country_name": country_config.get("name", "International"),
            "currency": country_config.get("currency", "USD"),
            "exchange_rate": EXCHANGE_RATES.get(country_config.get("currency", "USD"), 1),
            "methods": {
                "mobile_money": {
                    "available": len(country_config.get("providers", [])) > 0,
                    "providers": country_config.get("providers", []),
                    "default": country_config.get("default_provider")
                },
                "bank_transfer": {
                    "available": country_code in ["NG", "KE", "GH", "TZ", "UG"],
                    "min_amount_usd": 10
                }
            },
            "min_payout_coins": 500,  # Minimum 500 coins ($5) to request payout
            "fees": {
                "percentage": 2.5,  # 2.5% payout fee
                "minimum_usd": 0.50
            }
        }


# ============ SERVICE INSTANCES ============

flutterwave_payout = FlutterwavePayoutService()
kwikpay_service = KwikPayService()
payout_service = PayoutService()
