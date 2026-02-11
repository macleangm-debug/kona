"""
Dynamic Exchange Rate Service
Fetches live rates from free API and manages Kona's configurable margin
"""
import os
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from services.database import db

# Free exchange rate API (fawazahmed0/exchange-api)
# No API key needed, supports 200+ currencies including African ones
PRIMARY_API = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
FALLBACK_API = "https://currency-api.pages.dev/v1/currencies/usd.json"

# Cache settings
CACHE_TTL_HOURS = 6  # Refresh rates every 6 hours

# Default fallback rates (used if API fails)
FALLBACK_RATES = {
    "kes": 130,    # Kenya Shilling
    "tzs": 2500,   # Tanzania Shilling
    "ugx": 3700,   # Uganda Shilling
    "rwf": 1300,   # Rwanda Franc
    "ghs": 15,     # Ghana Cedi
    "ngn": 1600,   # Nigeria Naira
    "zar": 18,     # South Africa Rand
    "usd": 1
}

# Currency codes by country
COUNTRY_CURRENCIES = {
    "KE": "kes",
    "TZ": "tzs",
    "UG": "ugx",
    "RW": "rwf",
    "GH": "ghs",
    "NG": "ngn",
    "ZA": "zar",
    "US": "usd"
}


class ExchangeRateService:
    """
    Exchange Rate Service with:
    - Live rates from free API
    - Configurable margin for Kona revenue
    - Rate caching
    - Admin configuration
    """
    
    def __init__(self):
        self._cached_rates: Optional[Dict[str, float]] = None
        self._cache_time: Optional[datetime] = None
        self._lock = asyncio.Lock()
    
    async def get_admin_config(self) -> Dict[str, Any]:
        """Get admin-configured exchange settings"""
        config = await db.system_config.find_one(
            {"type": "exchange_rate_config"},
            {"_id": 0}
        )
        
        if not config:
            # Default config
            config = {
                "type": "exchange_rate_config",
                "default_margin_percent": 3.0,  # 3% default margin
                "country_margins": {},  # Per-country override margins
                "auto_update_enabled": True,
                "last_rate_update": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.system_config.insert_one(config)
        
        return config
    
    async def update_admin_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update admin exchange rate configuration"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.system_config.find_one_and_update(
            {"type": "exchange_rate_config"},
            {"$set": updates},
            upsert=True,
            return_document=True
        )
        
        # Remove _id for response
        if result and "_id" in result:
            del result["_id"]
        
        return result
    
    async def fetch_live_rates(self) -> Dict[str, float]:
        """Fetch live exchange rates from API"""
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                # Try primary API
                response = await client.get(PRIMARY_API)
                if response.status_code == 200:
                    data = response.json()
                    rates = data.get("usd", {})
                    if rates:
                        await self._record_rate_fetch("primary", True)
                        return rates
            except Exception as e:
                print(f"Primary API failed: {e}")
            
            try:
                # Try fallback API
                response = await client.get(FALLBACK_API)
                if response.status_code == 200:
                    data = response.json()
                    rates = data.get("usd", {})
                    if rates:
                        await self._record_rate_fetch("fallback", True)
                        return rates
            except Exception as e:
                print(f"Fallback API failed: {e}")
        
        # Return fallback rates
        await self._record_rate_fetch("cache", False)
        return FALLBACK_RATES
    
    async def _record_rate_fetch(self, source: str, success: bool):
        """Record rate fetch for analytics"""
        await db.exchange_rate_logs.insert_one({
            "source": source,
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def get_rates(self, force_refresh: bool = False) -> Dict[str, float]:
        """Get exchange rates (cached or fresh)"""
        
        async with self._lock:
            now = datetime.now(timezone.utc)
            
            # Check cache validity
            if not force_refresh and self._cached_rates and self._cache_time:
                cache_age = now - self._cache_time
                if cache_age < timedelta(hours=CACHE_TTL_HOURS):
                    return self._cached_rates
            
            # Fetch fresh rates
            rates = await self.fetch_live_rates()
            
            # Update cache
            self._cached_rates = rates
            self._cache_time = now
            
            # Store in DB for history
            await db.exchange_rate_history.insert_one({
                "rates": rates,
                "fetched_at": now.isoformat()
            })
            
            # Update config with last fetch time
            await db.system_config.update_one(
                {"type": "exchange_rate_config"},
                {"$set": {"last_rate_update": now.isoformat()}}
            )
            
            return rates
    
    async def convert_usd_to_local(
        self, 
        usd_amount: float, 
        country_code: str,
        include_margin: bool = True,
        apply_nice_rounding: bool = True,
        pricing_style: str = "value"
    ) -> Dict[str, Any]:
        """
        Convert USD to local currency with optional margin and smart rounding
        
        Args:
            usd_amount: Amount in USD
            country_code: Country code (KE, TZ, etc.)
            include_margin: Whether to apply Kona's margin
            apply_nice_rounding: Whether to round to nice numbers (for display)
            pricing_style: "value" (ends in 9), "premium" (ends in 0), or "exact"
        
        Returns:
            {
                "usd_amount": original USD amount,
                "base_rate": market exchange rate,
                "margin_percent": applied margin,
                "margin_amount": margin in local currency,
                "rounding_amount": additional profit from nice rounding,
                "kona_total_revenue": total Kona revenue (margin + rounding),
                "local_amount_exact": exact conversion (for creator payouts),
                "local_amount_display": nicely rounded (for user display),
                "currency": currency code,
                "formatted": "KES 400 (~$2.99 USD)" format,
                "pricing_style": applied pricing style
            }
        """
        
        # Get live rates
        rates = await self.get_rates()
        
        # Get currency for country
        currency_code = COUNTRY_CURRENCIES.get(country_code, "usd").lower()
        base_rate = rates.get(currency_code, FALLBACK_RATES.get(currency_code, 1))
        
        # Calculate base amount (exact conversion)
        base_local_amount = usd_amount * base_rate
        
        # Apply margin if requested
        margin_percent = 0
        margin_amount = 0
        
        if include_margin:
            config = await self.get_admin_config()
            
            # Check for country-specific margin first
            country_margins = config.get("country_margins", {})
            if country_code in country_margins:
                margin_percent = country_margins[country_code]
            else:
                margin_percent = config.get("default_margin_percent", 3.0)
            
            # Calculate margin
            margin_amount = base_local_amount * (margin_percent / 100)
        
        # Exact amount (for creator payouts - no rounding profit included)
        exact_amount = base_local_amount + margin_amount
        
        # Apply nice rounding for display
        rounding_amount = 0
        if apply_nice_rounding and usd_amount > 0:
            display_amount = self._round_to_nice_number(exact_amount, currency_code)
            rounding_amount = display_amount - exact_amount
            if rounding_amount < 0:
                rounding_amount = 0  # Never round down
                display_amount = exact_amount
        else:
            display_amount = round(exact_amount, 0)
        
        # Total Kona revenue = margin + rounding profit
        kona_total_revenue_local = margin_amount + rounding_amount
        kona_total_revenue_usd = kona_total_revenue_local / base_rate if base_rate > 0 else 0
        
        # Format for display: "KES 400 (~$2.99 USD)"
        currency_upper = currency_code.upper()
        formatted = f"{currency_upper} {display_amount:,.0f} (~${usd_amount:.2f} USD)"
        
        return {
            "usd_amount": usd_amount,
            "base_rate": round(base_rate, 4),
            "base_local_amount": round(base_local_amount, 2),
            "margin_percent": margin_percent,
            "margin_amount": round(margin_amount, 2),
            "margin_usd": round(margin_amount / base_rate, 4) if base_rate > 0 else 0,
            "rounding_amount": round(rounding_amount, 2),
            "rounding_usd": round(rounding_amount / base_rate, 4) if base_rate > 0 else 0,
            "kona_total_revenue_local": round(kona_total_revenue_local, 2),
            "kona_total_revenue_usd": round(kona_total_revenue_usd, 4),
            "local_amount_exact": round(exact_amount, 2),  # For creator payouts
            "local_amount_display": display_amount,  # For user display (nicely rounded)
            "currency": currency_upper,
            "formatted": formatted,
            "pricing_style": pricing_style,
            "rate_source": "live" if currency_code in rates else "fallback",
            "rate_timestamp": self._cache_time.isoformat() if self._cache_time else None
        }
    
    def _round_to_nice_number(self, amount: float, currency: str, pricing_style: str = "value") -> float:
        """
        Round to psychologically appealing numbers based on pricing style
        
        Styles:
        - "value": Ends in 9 (e.g., 399, 1,499) - feels like a deal
        - "premium": Ends in 0 (e.g., 400, 1,500) - signals quality
        - "exact": No rounding
        """
        if amount <= 0:
            return 0
        
        if pricing_style == "exact":
            return round(amount, 0)
        
        # Determine base and options based on amount size
        if amount < 100:
            base = round(amount / 10) * 10
            if pricing_style == "value":
                # Target endings: 9, 19, 29, 39, 49, etc.
                options = [base - 1, base + 9, base + 19]
            else:  # premium
                # Target endings: 0, 10, 20, 30, 50, etc.
                options = [base, base + 10, base + 20, base + 50]
                
        elif amount < 1000:
            base = round(amount / 50) * 50
            if pricing_style == "value":
                # Target endings: 49, 99, 149, 199, 249, 299, etc.
                options = [base - 1, base + 49, base + 99, base + 149, base + 199]
            else:  # premium
                # Target endings: 0, 50, 100, 150, 200, 250, 300, etc.
                options = [base, base + 50, base + 100, base + 150, base + 200]
                
        elif amount < 10000:
            base = round(amount / 100) * 100
            if pricing_style == "value":
                # Target endings: 99, 199, 299, 399, 499, etc.
                options = [base - 1, base + 99, base + 199, base + 299, base + 399, base + 499]
            else:  # premium
                # Target endings: 0, 100, 200, 500, etc.
                options = [base, base + 100, base + 200, base + 500]
                
        else:
            base = round(amount / 1000) * 1000
            if pricing_style == "value":
                # Target endings: 999, 1999, 2999, etc.
                options = [base - 1, base + 999, base + 1999, base + 2999]
            else:  # premium
                # Target endings: 0, 500, 1000, etc.
                options = [base, base + 500, base + 1000]
        
        # Find the smallest option that's >= amount (never round down)
        valid_options = [opt for opt in options if opt >= amount]
        if valid_options:
            return min(valid_options)
        
        # Fallback: round up to next increment
        increment = 100 if amount < 1000 else 1000
        return base + increment
    
    async def get_creator_payout_amount(
        self, 
        usd_amount: float, 
        country_code: str
    ) -> Dict[str, Any]:
        """
        Get creator payout amount WITHOUT margin and WITHOUT rounding profit
        This is what creators see - the exact amount they receive based on their share
        Uses exact conversion, not the rounded display amount
        """
        result = await self.convert_usd_to_local(
            usd_amount, 
            country_code, 
            include_margin=False,
            apply_nice_rounding=False
        )
        
        # Return simplified payout info for creators
        return {
            "usd_amount": result["usd_amount"],
            "local_amount": result["local_amount_exact"],  # Exact, not rounded
            "currency": result["currency"],
            "exchange_rate": result["base_rate"],
            "formatted": f"{result['currency']} {result['local_amount_exact']:,.0f}"
        }
    
    async def record_margin_revenue(
        self,
        transaction_id: str,
        transaction_type: str,  # subscription, coin_purchase, etc.
        country_code: str,
        usd_amount: float,
        local_amount: float,
        margin_percent: float,
        margin_local: float,
        margin_usd: float
    ):
        """Record margin revenue for admin analytics"""
        
        await db.exchange_margin_revenue.insert_one({
            "transaction_id": transaction_id,
            "transaction_type": transaction_type,
            "country_code": country_code,
            "usd_amount": usd_amount,
            "local_amount": local_amount,
            "margin_percent": margin_percent,
            "margin_local": margin_local,
            "margin_usd": margin_usd,
            "currency": COUNTRY_CURRENCIES.get(country_code, "usd").upper(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    async def get_margin_revenue_stats(
        self, 
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get margin revenue statistics for admin"""
        
        # Build query
        query = {}
        if start_date:
            query["created_at"] = {"$gte": start_date}
        if end_date:
            if "created_at" in query:
                query["created_at"]["$lte"] = end_date
            else:
                query["created_at"] = {"$lte": end_date}
        
        # Aggregate stats
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "total_margin_usd": {"$sum": "$margin_usd"},
                    "total_margin_local": {"$sum": "$margin_local"},
                    "total_transactions": {"$sum": 1},
                    "total_volume_usd": {"$sum": "$usd_amount"}
                }
            }
        ]
        
        result = await db.exchange_margin_revenue.aggregate(pipeline).to_list(1)
        
        # Get breakdown by country
        country_pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$country_code",
                    "margin_usd": {"$sum": "$margin_usd"},
                    "margin_local": {"$sum": "$margin_local"},
                    "transactions": {"$sum": 1},
                    "volume_usd": {"$sum": "$usd_amount"},
                    "currency": {"$first": "$currency"}
                }
            },
            {"$sort": {"margin_usd": -1}}
        ]
        
        country_breakdown = await db.exchange_margin_revenue.aggregate(country_pipeline).to_list(100)
        
        # Get breakdown by transaction type
        type_pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$transaction_type",
                    "margin_usd": {"$sum": "$margin_usd"},
                    "transactions": {"$sum": 1}
                }
            }
        ]
        
        type_breakdown = await db.exchange_margin_revenue.aggregate(type_pipeline).to_list(100)
        
        stats = result[0] if result else {
            "total_margin_usd": 0,
            "total_margin_local": 0,
            "total_transactions": 0,
            "total_volume_usd": 0
        }
        
        return {
            "summary": {
                "total_margin_revenue_usd": round(stats.get("total_margin_usd", 0), 2),
                "total_transactions": stats.get("total_transactions", 0),
                "total_volume_usd": round(stats.get("total_volume_usd", 0), 2),
                "average_margin_per_transaction": round(
                    stats.get("total_margin_usd", 0) / max(stats.get("total_transactions", 1), 1), 2
                )
            },
            "by_country": [
                {
                    "country_code": item["_id"],
                    "currency": item.get("currency", "USD"),
                    "margin_usd": round(item["margin_usd"], 2),
                    "margin_local": round(item["margin_local"], 2),
                    "transactions": item["transactions"],
                    "volume_usd": round(item["volume_usd"], 2)
                }
                for item in country_breakdown
            ],
            "by_type": [
                {
                    "type": item["_id"],
                    "margin_usd": round(item["margin_usd"], 2),
                    "transactions": item["transactions"]
                }
                for item in type_breakdown
            ]
        }
    
    async def get_current_rates_display(self) -> Dict[str, Any]:
        """Get current rates for display in admin UI with rounding examples"""
        
        rates = await self.get_rates()
        config = await self.get_admin_config()
        
        display_rates = []
        for country_code, currency in COUNTRY_CURRENCIES.items():
            if currency == "usd":
                continue
            
            rate = rates.get(currency.lower(), FALLBACK_RATES.get(currency.lower(), 1))
            
            # Get margin for this country
            country_margins = config.get("country_margins", {})
            margin = country_margins.get(country_code, config.get("default_margin_percent", 3.0))
            
            # Calculate effective rate (with margin)
            effective_rate = rate * (1 + margin / 100)
            
            # Calculate $10 example with nice rounding
            exact_amount_10 = 10 * effective_rate
            nice_amount_10 = self._round_to_nice_number(exact_amount_10, currency.lower())
            rounding_profit_10 = nice_amount_10 - exact_amount_10
            margin_profit_10 = 10 * rate * margin / 100
            total_profit_10 = margin_profit_10 + rounding_profit_10
            
            display_rates.append({
                "country_code": country_code,
                "currency": currency.upper(),
                "market_rate": round(rate, 4),
                "margin_percent": margin,
                "effective_rate": round(effective_rate, 4),
                "example_10_usd": {
                    "market": round(10 * rate, 0),
                    "with_margin_exact": round(exact_amount_10, 0),
                    "with_margin": nice_amount_10,  # Nicely rounded
                    "formatted": f"{currency.upper()} {nice_amount_10:,.0f} (~$10.00 USD)",
                    "margin_profit": round(margin_profit_10, 2),
                    "rounding_profit": round(rounding_profit_10, 2),
                    "kona_profit": round(total_profit_10, 2)  # Total: margin + rounding
                }
            })
        
        return {
            "rates": display_rates,
            "config": {
                "default_margin_percent": config.get("default_margin_percent", 3.0),
                "country_margins": config.get("country_margins", {}),
                "auto_update_enabled": config.get("auto_update_enabled", True),
                "last_rate_update": config.get("last_rate_update")
            },
            "cache_info": {
                "cached_at": self._cache_time.isoformat() if self._cache_time else None,
                "cache_ttl_hours": CACHE_TTL_HOURS
            }
        }


# Global instance
exchange_rate_service = ExchangeRateService()
