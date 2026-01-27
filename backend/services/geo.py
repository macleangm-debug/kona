"""
Geolocation and payment helpers
"""
import httpx
from config.settings import AFRICAN_COUNTRIES, INTERNATIONAL_CONFIG

async def detect_country_from_ip(ip_address: str) -> dict:
    """Detect country from IP address using free API"""
    try:
        if ip_address in ["127.0.0.1", "localhost", "::1"]:
            return {"country_code": "US", "country_name": "United States", "is_african": False}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                country_code = data.get("countryCode", "US")
                return {
                    "country_code": country_code,
                    "country_name": data.get("country", "Unknown"),
                    "is_african": country_code in AFRICAN_COUNTRIES
                }
    except Exception as e:
        print(f"Geolocation error: {e}")
    
    return {"country_code": "US", "country_name": "United States", "is_african": False}

def get_payment_config(country_code: str) -> dict:
    """Get payment configuration for a country"""
    if country_code in AFRICAN_COUNTRIES:
        config = AFRICAN_COUNTRIES[country_code]
        return {
            "is_african": True,
            **config
        }
    return {
        "is_african": False,
        "name": "International",
        **INTERNATIONAL_CONFIG
    }

def convert_price(usd_price: float, exchange_rate: float) -> float:
    """Convert USD price to local currency"""
    return round(usd_price * exchange_rate, 2)
