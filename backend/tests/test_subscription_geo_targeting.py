"""
Tests for Subscription Tiers (VIP device limits) and Advanced Geo Targeting Features
- GET /api/auth/subscription-tiers: Returns all subscription tiers with features and device limits
- GET /api/auth/device-limit: Returns user's device limit based on subscription tier with upgrade options
- GET /api/advertiser/targeting-options: Returns all geo targeting options (regions, cities, languages, etc.)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSubscriptionTiers:
    """Tests for GET /api/auth/subscription-tiers endpoint - Public endpoint"""
    
    def test_get_subscription_tiers_returns_200(self):
        """Test that subscription tiers endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/auth/subscription-tiers returns 200")
    
    def test_subscription_tiers_structure(self):
        """Test subscription tiers response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "tiers" in data, "Response missing 'tiers' field"
        assert "tier_order" in data, "Response missing 'tier_order' field"
        assert "currency" in data, "Response missing 'currency' field"
        
        print(f"PASS: Subscription tiers has correct structure: {list(data.keys())}")
    
    def test_subscription_tier_order(self):
        """Test tier order is correct: free, basic, premium, vip"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        data = response.json()
        
        expected_order = ["free", "basic", "premium", "vip"]
        assert data["tier_order"] == expected_order, f"Expected order {expected_order}, got {data['tier_order']}"
        print(f"PASS: Tier order is correct: {expected_order}")
    
    def test_free_tier_device_limit(self):
        """Test free tier has device_limit of 3"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        data = response.json()
        
        free_tier = data["tiers"].get("free")
        assert free_tier is not None, "Free tier not found in tiers"
        assert free_tier["device_limit"] == 3, f"Expected free tier device_limit=3, got {free_tier['device_limit']}"
        print(f"PASS: Free tier device_limit = 3")
    
    def test_basic_tier_device_limit(self):
        """Test basic tier has device_limit of 5"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        data = response.json()
        
        basic_tier = data["tiers"].get("basic")
        assert basic_tier is not None, "Basic tier not found in tiers"
        assert basic_tier["device_limit"] == 5, f"Expected basic tier device_limit=5, got {basic_tier['device_limit']}"
        print(f"PASS: Basic tier device_limit = 5")
    
    def test_premium_tier_device_limit(self):
        """Test premium tier has device_limit of 7"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        data = response.json()
        
        premium_tier = data["tiers"].get("premium")
        assert premium_tier is not None, "Premium tier not found in tiers"
        assert premium_tier["device_limit"] == 7, f"Expected premium tier device_limit=7, got {premium_tier['device_limit']}"
        print(f"PASS: Premium tier device_limit = 7")
    
    def test_vip_tier_device_limit(self):
        """Test VIP tier has device_limit of 10"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        data = response.json()
        
        vip_tier = data["tiers"].get("vip")
        assert vip_tier is not None, "VIP tier not found in tiers"
        assert vip_tier["device_limit"] == 10, f"Expected VIP tier device_limit=10, got {vip_tier['device_limit']}"
        print(f"PASS: VIP tier device_limit = 10")
    
    def test_all_tiers_have_required_fields(self):
        """Test all tiers have required fields: name, price_usd, device_limit, features"""
        response = requests.get(f"{BASE_URL}/api/auth/subscription-tiers")
        data = response.json()
        
        required_fields = ["name", "price_usd", "device_limit", "features"]
        
        for tier_id, tier_data in data["tiers"].items():
            for field in required_fields:
                assert field in tier_data, f"Tier '{tier_id}' missing required field '{field}'"
        
        print(f"PASS: All tiers have required fields: {required_fields}")


class TestDeviceLimit:
    """Tests for GET /api/auth/device-limit endpoint - Requires authentication"""
    
    @pytest.fixture
    def test_user(self):
        """Create a test user and return token"""
        unique_email = f"test_device_limit_{uuid.uuid4().hex[:8]}@test.com"
        register_data = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip(f"Could not create test user: {response.text}")
    
    def test_device_limit_requires_auth(self):
        """Test device-limit endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/device-limit")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: /api/auth/device-limit requires authentication")
    
    def test_device_limit_returns_200_with_auth(self, test_user):
        """Test device-limit returns 200 with valid auth"""
        headers = {"Authorization": f"Bearer {test_user}"}
        response = requests.get(f"{BASE_URL}/api/auth/device-limit", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/auth/device-limit returns 200 with auth")
    
    def test_device_limit_response_structure(self, test_user):
        """Test device-limit response has correct structure"""
        headers = {"Authorization": f"Bearer {test_user}"}
        response = requests.get(f"{BASE_URL}/api/auth/device-limit", headers=headers)
        data = response.json()
        
        required_fields = ["current_devices", "max_devices", "remaining_slots", "subscription_tier", "upgrade_options"]
        for field in required_fields:
            assert field in data, f"Response missing field '{field}'"
        
        print(f"PASS: device-limit response has required fields: {required_fields}")
    
    def test_new_user_has_free_tier(self, test_user):
        """Test new user defaults to free tier with 3 device limit"""
        headers = {"Authorization": f"Bearer {test_user}"}
        response = requests.get(f"{BASE_URL}/api/auth/device-limit", headers=headers)
        data = response.json()
        
        assert data["subscription_tier"] == "free", f"Expected 'free' tier, got {data['subscription_tier']}"
        assert data["max_devices"] == 3, f"Expected max_devices=3 for free tier, got {data['max_devices']}"
        print(f"PASS: New user has free tier with max_devices=3")
    
    def test_upgrade_options_for_free_tier(self, test_user):
        """Test free tier user gets upgrade options for basic, premium, vip"""
        headers = {"Authorization": f"Bearer {test_user}"}
        response = requests.get(f"{BASE_URL}/api/auth/device-limit", headers=headers)
        data = response.json()
        
        upgrade_options = data["upgrade_options"]
        assert len(upgrade_options) == 3, f"Expected 3 upgrade options, got {len(upgrade_options)}"
        
        tier_names = [opt["tier"] for opt in upgrade_options]
        assert "basic" in tier_names, "Basic tier not in upgrade options"
        assert "premium" in tier_names, "Premium tier not in upgrade options"
        assert "vip" in tier_names, "VIP tier not in upgrade options"
        
        print(f"PASS: Free tier has upgrade options: {tier_names}")
    
    def test_upgrade_options_have_extra_devices(self, test_user):
        """Test upgrade options show extra_devices correctly"""
        headers = {"Authorization": f"Bearer {test_user}"}
        response = requests.get(f"{BASE_URL}/api/auth/device-limit", headers=headers)
        data = response.json()
        
        # Free tier has 3 devices, so:
        # Basic (5): +2 extra
        # Premium (7): +4 extra
        # VIP (10): +7 extra
        expected_extras = {"basic": 2, "premium": 4, "vip": 7}
        
        for option in data["upgrade_options"]:
            tier = option["tier"]
            if tier in expected_extras:
                assert option["extra_devices"] == expected_extras[tier], \
                    f"Expected {expected_extras[tier]} extra devices for {tier}, got {option['extra_devices']}"
        
        print("PASS: Upgrade options show correct extra_devices")


class TestTargetingOptions:
    """Tests for GET /api/advertiser/targeting-options endpoint - Public endpoint"""
    
    def test_targeting_options_returns_200(self):
        """Test targeting options endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/advertiser/targeting-options returns 200")
    
    def test_targeting_options_has_geo_targeting(self):
        """Test response has geo_targeting section"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        assert "geo_targeting" in data, "Response missing 'geo_targeting' field"
        geo = data["geo_targeting"]
        
        assert "regions" in geo, "geo_targeting missing 'regions'"
        assert "cities" in geo, "geo_targeting missing 'cities'"
        assert "languages" in geo, "geo_targeting missing 'languages'"
        assert "countries" in geo, "geo_targeting missing 'countries'"
        
        print("PASS: geo_targeting has regions, cities, languages, countries")
    
    def test_african_regions_present(self):
        """Test all 5 African regions are present: east_africa, west_africa, southern_africa, central_africa, north_africa"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        regions = data["geo_targeting"]["regions"]
        expected_regions = ["east_africa", "west_africa", "southern_africa", "central_africa", "north_africa"]
        
        for region in expected_regions:
            assert region in regions, f"Region '{region}' not found in targeting options"
            assert "name" in regions[region], f"Region '{region}' missing 'name'"
            assert "country_count" in regions[region], f"Region '{region}' missing 'country_count'"
        
        print(f"PASS: All 5 African regions present: {expected_regions}")
    
    def test_african_cities_count(self):
        """Test at least 20 African cities are present"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        cities = data["geo_targeting"]["cities"]
        assert len(cities) >= 20, f"Expected at least 20 cities, got {len(cities)}"
        print(f"PASS: {len(cities)} African cities present (required: 20)")
    
    def test_major_cities_present(self):
        """Test major African cities are present: lagos, nairobi, johannesburg, cairo, accra"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        cities = data["geo_targeting"]["cities"]
        major_cities = ["lagos", "nairobi", "johannesburg", "cairo", "accra", "dar_es_salaam", "addis_ababa"]
        
        for city in major_cities:
            assert city in cities, f"Major city '{city}' not found"
            assert "name" in cities[city], f"City '{city}' missing 'name'"
            assert "country" in cities[city], f"City '{city}' missing 'country'"
        
        print(f"PASS: Major African cities present: {major_cities}")
    
    def test_african_languages_count(self):
        """Test at least 10 African languages are present"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        languages = data["geo_targeting"]["languages"]
        assert len(languages) >= 10, f"Expected at least 10 languages, got {len(languages)}"
        print(f"PASS: {len(languages)} African languages present (required: 10)")
    
    def test_key_languages_present(self):
        """Test key languages are present: english, french, arabic, swahili, portuguese"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        languages = data["geo_targeting"]["languages"]
        key_languages = ["english", "french", "arabic", "swahili", "portuguese", "hausa", "yoruba"]
        
        for lang in key_languages:
            assert lang in languages, f"Language '{lang}' not found"
            assert "name" in languages[lang], f"Language '{lang}' missing 'name'"
            assert "country_count" in languages[lang], f"Language '{lang}' missing 'country_count'"
        
        print(f"PASS: Key African languages present: {key_languages}")
    
    def test_demographic_targeting_present(self):
        """Test demographic targeting options are present"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        assert "demographic_targeting" in data, "Response missing 'demographic_targeting'"
        demo = data["demographic_targeting"]
        
        assert "age_ranges" in demo, "demographic_targeting missing 'age_ranges'"
        assert "genders" in demo, "demographic_targeting missing 'genders'"
        assert len(demo["age_ranges"]) >= 5, f"Expected at least 5 age ranges, got {len(demo['age_ranges'])}"
        
        print("PASS: Demographic targeting present with age_ranges and genders")
    
    def test_device_targeting_present(self):
        """Test device targeting options are present"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        assert "device_targeting" in data, "Response missing 'device_targeting'"
        device = data["device_targeting"]
        
        assert "devices" in device, "device_targeting missing 'devices'"
        assert "os" in device, "device_targeting missing 'os'"
        
        device_types = [d["id"] for d in device["devices"]]
        assert "mobile" in device_types, "mobile not in device types"
        assert "tablet" in device_types, "tablet not in device types"
        assert "desktop" in device_types, "desktop not in device types"
        
        print(f"PASS: Device targeting present: {device_types}")
    
    def test_time_targeting_present(self):
        """Test time-based targeting options are present"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        assert "time_targeting" in data, "Response missing 'time_targeting'"
        time = data["time_targeting"]
        
        assert "days_of_week" in time, "time_targeting missing 'days_of_week'"
        assert "time_slots" in time, "time_targeting missing 'time_slots'"
        
        print("PASS: Time targeting present with days_of_week and time_slots")
    
    def test_content_targeting_present(self):
        """Test content targeting options are present"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        assert "content_targeting" in data, "Response missing 'content_targeting'"
        content = data["content_targeting"]
        
        assert "genres" in content, "content_targeting missing 'genres'"
        assert "content_types" in content, "content_targeting missing 'content_types'"
        assert len(content["genres"]) >= 5, f"Expected at least 5 genres, got {len(content['genres'])}"
        
        print(f"PASS: Content targeting present with {len(content['genres'])} genres")
    
    def test_example_targeting_config_present(self):
        """Test example targeting configuration is provided"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        assert "example_targeting" in data, "Response missing 'example_targeting'"
        example = data["example_targeting"]
        
        assert "config" in example, "example_targeting missing 'config'"
        config = example["config"]
        
        # Verify example config has all targeting types
        assert "geo" in config, "Example config missing 'geo'"
        assert "demographic" in config, "Example config missing 'demographic'"
        assert "content" in config, "Example config missing 'content'"
        assert "device" in config, "Example config missing 'device'"
        assert "time" in config, "Example config missing 'time'"
        
        print("PASS: Example targeting config present with all targeting types")


class TestGeoServiceFunctions:
    """Tests for geo service helper functions via API responses"""
    
    def test_region_country_counts(self):
        """Test regions have correct country counts"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        regions = data["geo_targeting"]["regions"]
        
        # East Africa should have ~10 countries
        assert regions["east_africa"]["country_count"] >= 8, "East Africa should have at least 8 countries"
        # West Africa should have ~16 countries
        assert regions["west_africa"]["country_count"] >= 10, "West Africa should have at least 10 countries"
        # Southern Africa should have ~10 countries
        assert regions["southern_africa"]["country_count"] >= 8, "Southern Africa should have at least 8 countries"
        
        print("PASS: Regions have correct country counts")
    
    def test_cities_have_country_codes(self):
        """Test all cities have valid country codes"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        cities = data["geo_targeting"]["cities"]
        
        for city_id, city_data in cities.items():
            assert "country" in city_data, f"City '{city_id}' missing country code"
            assert len(city_data["country"]) == 2, f"City '{city_id}' has invalid country code: {city_data['country']}"
        
        print("PASS: All cities have valid 2-letter country codes")
    
    def test_lagos_city_data(self):
        """Test Lagos city has correct data"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        lagos = data["geo_targeting"]["cities"].get("lagos")
        assert lagos is not None, "Lagos city not found"
        assert lagos["name"] == "Lagos", f"Expected name 'Lagos', got {lagos['name']}"
        assert lagos["country"] == "NG", f"Expected country 'NG', got {lagos['country']}"
        
        print("PASS: Lagos city data correct")
    
    def test_nairobi_city_data(self):
        """Test Nairobi city has correct data"""
        response = requests.get(f"{BASE_URL}/api/advertiser/targeting-options")
        data = response.json()
        
        nairobi = data["geo_targeting"]["cities"].get("nairobi")
        assert nairobi is not None, "Nairobi city not found"
        assert nairobi["name"] == "Nairobi", f"Expected name 'Nairobi', got {nairobi['name']}"
        assert nairobi["country"] == "KE", f"Expected country 'KE', got {nairobi['country']}"
        
        print("PASS: Nairobi city data correct")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
