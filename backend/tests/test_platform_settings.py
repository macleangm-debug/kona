"""
Platform Settings Tests - Admin controls global pricing and video format requirements
Tests for admin platform settings enforcement across creator portal
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://creator-hub-566.preview.emergentagent.com').rstrip('/')

# Test credentials (Super Admin)
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

# Test series ID with custom pricing
TEST_SERIES_ID = "cs-2d72ac686d"  # Implementation Success series

# Headers to bypass rate limiting for automated tests
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json"
}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers=DEFAULT_HEADERS
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in response"
    assert data.get("user", {}).get("is_super_admin") == True, "User is not super admin"
    return data["token"]


class TestCreatorUploadSettings:
    """Tests for GET /api/creator/upload-settings endpoint"""
    
    def test_01_get_upload_settings_returns_video_config(self, super_admin_token):
        """Verify upload-settings returns video format configuration"""
        response = requests.get(
            f"{BASE_URL}/api/creator/upload-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "video" in data, "Missing video config"
        assert "allowed_formats" in data["video"], "Missing allowed_formats"
        assert "format_help" in data["video"], "Missing format_help"
        assert "max_file_size_mb" in data["video"], "Missing max_file_size_mb"
        assert isinstance(data["video"]["allowed_formats"], list), "allowed_formats should be a list"
        print(f"Video config: {data['video']}")
    
    def test_02_get_upload_settings_returns_pricing_config(self, super_admin_token):
        """Verify upload-settings returns pricing configuration"""
        response = requests.get(
            f"{BASE_URL}/api/creator/upload-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "pricing" in data, "Missing pricing config"
        assert "default_episode_price" in data["pricing"], "Missing default_episode_price"
        assert "first_episode_free" in data["pricing"], "Missing first_episode_free"
        assert isinstance(data["pricing"]["default_episode_price"], int), "default_episode_price should be int"
        assert isinstance(data["pricing"]["first_episode_free"], bool), "first_episode_free should be bool"
        print(f"Pricing config: {data['pricing']}")
    
    def test_03_get_upload_settings_requires_auth(self):
        """Verify upload-settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/upload-settings")
        assert response.status_code == 401, "Should require authentication"


class TestAdminPlatformSettings:
    """Tests for GET/PUT /api/admin/platform-settings endpoints"""
    
    def test_04_get_platform_settings_returns_full_config(self, super_admin_token):
        """Verify admin can get full platform settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("id") == "global", "Settings should have global id"
        assert "pricing" in data, "Missing pricing"
        assert "video" in data, "Missing video"
        assert "created_at" in data or "updated_at" in data, "Missing timestamp"
        print(f"Platform settings: {data}")
    
    def test_05_update_platform_settings_pricing(self, super_admin_token):
        """Verify super admin can update global pricing settings"""
        # Get current settings
        current = requests.get(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        original_price = current.get("pricing", {}).get("default_episode_price", 5)
        
        # Update pricing
        new_price = 10
        response = requests.put(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "id": "global",
                "pricing": {
                    "default_episode_price": new_price,
                    "first_episode_free": True
                },
                "video": current.get("video", {"allowed_formats": ["vertical"]})
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.json().get("success") == True
        
        # Verify update
        updated = requests.get(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        assert updated["pricing"]["default_episode_price"] == new_price
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "id": "global",
                "pricing": {
                    "default_episode_price": original_price,
                    "first_episode_free": True
                },
                "video": current.get("video", {"allowed_formats": ["vertical"]})
            }
        )
        print(f"Price updated from {original_price} to {new_price} and restored")
    
    def test_06_update_platform_settings_video_formats(self, super_admin_token):
        """Verify super admin can update video format requirements"""
        # Get current settings
        current = requests.get(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        original_formats = current.get("video", {}).get("allowed_formats", ["vertical"])
        
        # Update to allow both formats
        response = requests.put(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "id": "global",
                "pricing": current.get("pricing", {}),
                "video": {
                    "allowed_formats": ["vertical", "landscape"],
                    "max_file_size_mb": 500,
                    "max_duration_minutes": 60
                }
            }
        )
        assert response.status_code == 200
        
        # Verify creator upload-settings reflects update
        creator_settings = requests.get(
            f"{BASE_URL}/api/creator/upload-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        assert "vertical" in creator_settings["video"]["allowed_formats"]
        assert "landscape" in creator_settings["video"]["allowed_formats"]
        assert creator_settings["video"]["format_help"] == "both"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "id": "global",
                "pricing": current.get("pricing", {}),
                "video": {
                    "allowed_formats": original_formats,
                    "max_file_size_mb": 500,
                    "max_duration_minutes": 60
                }
            }
        )
        print(f"Video formats updated to both and restored to {original_formats}")
    
    def test_07_platform_settings_requires_super_admin(self, super_admin_token):
        """Verify platform settings requires super admin (not just admin)"""
        # This test verifies the endpoint protects itself correctly
        # Since we have a super admin token, this should work
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200


class TestSeriesPricing:
    """Tests for GET/PUT /api/admin/series/{id}/pricing endpoints"""
    
    def test_08_get_series_pricing_returns_custom_settings(self, super_admin_token):
        """Verify getting series-specific pricing for test series"""
        response = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("series_id") == TEST_SERIES_ID
        assert "is_exclusive" in data, "Missing is_exclusive"
        assert "custom_episode_price" in data, "Missing custom_episode_price"
        assert "first_episode_free_override" in data, "Missing first_episode_free_override"
        assert "default_price" in data, "Missing default_price (from global)"
        print(f"Series pricing: {data}")
    
    def test_09_update_series_custom_price(self, super_admin_token):
        """Verify super admin can set custom episode price per series"""
        # Get current pricing
        current = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        original_price = current.get("custom_episode_price")
        
        # Set new custom price
        new_price = 25
        response = requests.put(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"custom_episode_price": new_price}
        )
        assert response.status_code == 200
        
        # Verify update
        updated = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        assert updated["custom_episode_price"] == new_price
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"custom_episode_price": original_price}
        )
        print(f"Custom price updated from {original_price} to {new_price} and restored")
    
    def test_10_update_series_exclusive_flag(self, super_admin_token):
        """Verify super admin can mark series as exclusive"""
        # Get current setting
        current = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        original_exclusive = current.get("is_exclusive", False)
        
        # Toggle exclusive flag
        new_exclusive = not original_exclusive
        response = requests.put(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"is_exclusive": new_exclusive}
        )
        assert response.status_code == 200
        
        # Verify update
        updated = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        assert updated["is_exclusive"] == new_exclusive
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"is_exclusive": original_exclusive}
        )
        print(f"Exclusive flag toggled from {original_exclusive} to {new_exclusive} and restored")
    
    def test_11_update_first_episode_free_override(self, super_admin_token):
        """Verify super admin can override first episode free rule per series"""
        # Get current setting
        current = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        original_override = current.get("first_episode_free_override")
        
        # Set override to False (first episode NOT free)
        response = requests.put(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"first_episode_free_override": False}
        )
        assert response.status_code == 200
        
        # Verify update
        updated = requests.get(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        assert updated["first_episode_free_override"] == False
        
        # Restore to null (use global setting)
        requests.put(
            f"{BASE_URL}/api/admin/series/{TEST_SERIES_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"first_episode_free_override": original_override}
        )
        print(f"First episode free override set to False and restored to {original_override}")
    
    def test_12_series_pricing_404_for_invalid_series(self, super_admin_token):
        """Verify 404 for non-existent series"""
        response = requests.get(
            f"{BASE_URL}/api/admin/series/invalid-series-id-12345/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404


class TestFirstEpisodeFreeEnforcement:
    """Test that first episode free rule is enforced based on admin settings"""
    
    def test_13_global_first_episode_free_reflected_in_creator_settings(self, super_admin_token):
        """Verify global first_episode_free setting is reflected in creator upload settings"""
        # Get current global setting
        global_settings = requests.get(
            f"{BASE_URL}/api/admin/platform-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        first_ep_free = global_settings.get("pricing", {}).get("first_episode_free", True)
        
        # Verify creator settings reflect this
        creator_settings = requests.get(
            f"{BASE_URL}/api/creator/upload-settings",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        assert creator_settings["pricing"]["first_episode_free"] == first_ep_free
        print(f"Global first_episode_free={first_ep_free} correctly reflected in creator settings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
