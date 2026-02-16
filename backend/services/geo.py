"""
Geolocation and payment helpers
"""
import httpx
import math
from typing import Optional, List, Dict
from config.settings import AFRICAN_COUNTRIES, INTERNATIONAL_CONFIG

# African regions for regional targeting
AFRICAN_REGIONS = {
    "east_africa": {
        "name": "East Africa",
        "countries": ["KE", "TZ", "UG", "RW", "BI", "ET", "SO", "DJ", "ER", "SS"]
    },
    "west_africa": {
        "name": "West Africa",
        "countries": ["NG", "GH", "CI", "SN", "ML", "BF", "NE", "GN", "BJ", "TG", "SL", "LR", "GM", "GW", "CV", "MR"]
    },
    "southern_africa": {
        "name": "Southern Africa",
        "countries": ["ZA", "BW", "NA", "ZW", "ZM", "MW", "MZ", "LS", "SZ", "AO"]
    },
    "central_africa": {
        "name": "Central Africa",
        "countries": ["CD", "CG", "CM", "GA", "GQ", "CF", "TD", "ST"]
    },
    "north_africa": {
        "name": "North Africa",
        "countries": ["EG", "MA", "DZ", "TN", "LY", "SD"]
    }
}

# Major African cities with coordinates for radius targeting
AFRICAN_CITIES = {
    "lagos": {"name": "Lagos", "country": "NG", "lat": 6.5244, "lon": 3.3792},
    "nairobi": {"name": "Nairobi", "country": "KE", "lat": -1.2921, "lon": 36.8219},
    "johannesburg": {"name": "Johannesburg", "country": "ZA", "lat": -26.2041, "lon": 28.0473},
    "cairo": {"name": "Cairo", "country": "EG", "lat": 30.0444, "lon": 31.2357},
    "accra": {"name": "Accra", "country": "GH", "lat": 5.6037, "lon": -0.1870},
    "dar_es_salaam": {"name": "Dar es Salaam", "country": "TZ", "lat": -6.7924, "lon": 39.2083},
    "kinshasa": {"name": "Kinshasa", "country": "CD", "lat": -4.4419, "lon": 15.2663},
    "addis_ababa": {"name": "Addis Ababa", "country": "ET", "lat": 8.9806, "lon": 38.7578},
    "cape_town": {"name": "Cape Town", "country": "ZA", "lat": -33.9249, "lon": 18.4241},
    "casablanca": {"name": "Casablanca", "country": "MA", "lat": 33.5731, "lon": -7.5898},
    "abuja": {"name": "Abuja", "country": "NG", "lat": 9.0765, "lon": 7.3986},
    "kampala": {"name": "Kampala", "country": "UG", "lat": 0.3476, "lon": 32.5825},
    "lusaka": {"name": "Lusaka", "country": "ZM", "lat": -15.3875, "lon": 28.3228},
    "harare": {"name": "Harare", "country": "ZW", "lat": -17.8252, "lon": 31.0335},
    "dakar": {"name": "Dakar", "country": "SN", "lat": 14.7167, "lon": -17.4677},
    "abidjan": {"name": "Abidjan", "country": "CI", "lat": 5.3600, "lon": -4.0083},
    "kigali": {"name": "Kigali", "country": "RW", "lat": -1.9706, "lon": 30.1044},
    "mombasa": {"name": "Mombasa", "country": "KE", "lat": -4.0435, "lon": 39.6682},
    "port_harcourt": {"name": "Port Harcourt", "country": "NG", "lat": 4.7771, "lon": 7.0134},
    "ibadan": {"name": "Ibadan", "country": "NG", "lat": 7.3775, "lon": 3.9470},
}

# Languages spoken in African countries
AFRICAN_LANGUAGES = {
    "english": {
        "name": "English",
        "countries": ["NG", "GH", "KE", "ZA", "TZ", "UG", "ZW", "ZM", "BW", "NA", "RW", "MW", "SL", "LR", "GM"]
    },
    "french": {
        "name": "French", 
        "countries": ["CD", "CI", "CM", "SN", "ML", "BF", "NE", "GN", "TD", "CG", "GA", "MG", "BJ", "TG", "RW", "BI", "DJ"]
    },
    "arabic": {
        "name": "Arabic",
        "countries": ["EG", "MA", "DZ", "TN", "LY", "SD", "MR", "TD", "DJ", "SO"]
    },
    "portuguese": {
        "name": "Portuguese",
        "countries": ["AO", "MZ", "CV", "GW", "ST"]
    },
    "swahili": {
        "name": "Swahili",
        "countries": ["KE", "TZ", "UG", "RW", "BI", "CD"]
    },
    "amharic": {
        "name": "Amharic",
        "countries": ["ET"]
    },
    "hausa": {
        "name": "Hausa",
        "countries": ["NG", "NE", "GH", "CM", "BF"]
    },
    "yoruba": {
        "name": "Yoruba",
        "countries": ["NG", "BJ"]
    },
    "igbo": {
        "name": "Igbo",
        "countries": ["NG"]
    },
    "zulu": {
        "name": "Zulu",
        "countries": ["ZA", "LS", "SZ", "ZW", "MW", "MZ"]
    }
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def get_region_for_country(country_code: str) -> Optional[str]:
    """Get African region for a country code"""
    for region_id, region_data in AFRICAN_REGIONS.items():
        if country_code in region_data["countries"]:
            return region_id
    return None

def get_languages_for_country(country_code: str) -> List[str]:
    """Get languages spoken in a country"""
    languages = []
    for lang_id, lang_data in AFRICAN_LANGUAGES.items():
        if country_code in lang_data["countries"]:
            languages.append(lang_id)
    return languages

async def detect_country_from_ip(ip_address: str) -> dict:
    """Detect country and detailed location from IP address using free API"""
    try:
        if ip_address in ["127.0.0.1", "localhost", "::1"]:
            return {
                "country_code": "US", 
                "country_name": "United States", 
                "is_african": False,
                "city": None,
                "region": None,
                "lat": None,
                "lon": None,
                "timezone": None,
                "isp": None
            }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                country_code = data.get("countryCode", "US")
                return {
                    "country_code": country_code,
                    "country_name": data.get("country", "Unknown"),
                    "is_african": country_code in AFRICAN_COUNTRIES,
                    "city": data.get("city"),
                    "region": data.get("regionName"),
                    "region_code": data.get("region"),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                    "timezone": data.get("timezone"),
                    "isp": data.get("isp"),
                    "african_region": get_region_for_country(country_code),
                    "languages": get_languages_for_country(country_code)
                }
    except Exception as e:
        print(f"Geolocation error: {e}")
    
    return {
        "country_code": "US", 
        "country_name": "United States", 
        "is_african": False,
        "city": None,
        "region": None,
        "lat": None,
        "lon": None
    }

def check_geo_targeting(user_geo: dict, targeting: dict) -> bool:
    """
    Check if a user matches the geo targeting criteria
    
    targeting can include:
    - countries: List of country codes
    - exclude_countries: List of countries to exclude
    - regions: List of African regions (east_africa, west_africa, etc.)
    - cities: List of city IDs
    - radius: { city: "lagos", km: 50 } - Target within radius of a city
    - languages: List of language codes
    """
    if not targeting:
        return True
    
    user_country = user_geo.get("country_code")
    user_lat = user_geo.get("lat")
    user_lon = user_geo.get("lon")
    user_region = user_geo.get("african_region")
    user_languages = user_geo.get("languages", [])
    
    # Check country exclusion first
    exclude_countries = targeting.get("exclude_countries", [])
    if user_country in exclude_countries:
        return False
    
    # Check country inclusion
    target_countries = targeting.get("countries", [])
    if target_countries and user_country not in target_countries:
        # Check if user's country is in targeted regions
        target_regions = targeting.get("regions", [])
        if target_regions:
            if user_region not in target_regions:
                return False
        else:
            return False
    
    # Check region targeting
    target_regions = targeting.get("regions", [])
    if target_regions and not target_countries:
        if user_region not in target_regions:
            return False
    
    # Check city targeting
    target_cities = targeting.get("cities", [])
    if target_cities:
        user_city = user_geo.get("city", "").lower().replace(" ", "_")
        if user_city not in target_cities:
            return False
    
    # Check radius targeting
    radius_targeting = targeting.get("radius")
    if radius_targeting and user_lat and user_lon:
        city_id = radius_targeting.get("city")
        radius_km = radius_targeting.get("km", 50)
        
        if city_id and city_id in AFRICAN_CITIES:
            city = AFRICAN_CITIES[city_id]
            distance = haversine_distance(user_lat, user_lon, city["lat"], city["lon"])
            if distance > radius_km:
                return False
    
    # Check language targeting
    target_languages = targeting.get("languages", [])
    if target_languages:
        if not any(lang in user_languages for lang in target_languages):
            return False
    
    return True

def get_geo_targeting_options() -> dict:
    """Return all available geo targeting options"""
    return {
        "regions": {
            region_id: {
                "name": region_data["name"],
                "country_count": len(region_data["countries"])
            }
            for region_id, region_data in AFRICAN_REGIONS.items()
        },
        "cities": {
            city_id: {
                "name": city_data["name"],
                "country": city_data["country"]
            }
            for city_id, city_data in AFRICAN_CITIES.items()
        },
        "languages": {
            lang_id: {
                "name": lang_data["name"],
                "country_count": len(lang_data["countries"])
            }
            for lang_id, lang_data in AFRICAN_LANGUAGES.items()
        },
        "countries": list(AFRICAN_COUNTRIES.keys())
    }

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

