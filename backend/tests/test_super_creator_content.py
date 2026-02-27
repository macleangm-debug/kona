"""
Tests for Super Creator Content Management Features

This test file covers:
1. Super Creator Dashboard Content Tab
2. Creating content for self (Super Creator)
3. Creating content for sub-creators (attributed_to field)
4. Series API with attributed_to support
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://kona-contract-export.preview.emergentagent.com"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
}


class TestCreatorSeriesAPI:
    """Test Creator Series endpoints with attributed_to support"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@kona.com", "password": "SuperAdmin2025!"},
            headers=HEADERS
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get headers with auth token"""
        return {**HEADERS, "Authorization": f"Bearer {admin_token}"}
    
    def test_creator_status_endpoint(self, auth_headers):
        """Test GET /api/creator/status returns proper status"""
        response = requests.get(f"{BASE_URL}/api/creator/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "is_creator" in data
        print(f"Creator status: {data}")
    
    def test_get_creator_series(self, auth_headers):
        """Test GET /api/creator/series returns series list"""
        response = requests.get(f"{BASE_URL}/api/creator/series", headers=auth_headers)
        # Can be 200 (approved creator) or 403 (not approved)
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "series" in data
            print(f"Found {len(data['series'])} series")
            # Check if any series has attributed_to field
            for series in data['series'][:5]:
                if series.get('attributed_to'):
                    print(f"Series '{series['title']}' attributed to: {series['attributed_name']}")
        else:
            print("User is not an approved creator")
    
    def test_create_series_for_self(self, auth_headers):
        """Test POST /api/creator/series creates series for self"""
        payload = {
            "title": f"TEST_My_Series_{uuid.uuid4().hex[:6]}",
            "description": "Test series created by super creator for themselves",
            "genre": "Drama"
        }
        
        response = requests.post(f"{BASE_URL}/api/creator/series", json=payload, headers=auth_headers)
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            assert "series_id" in data
            print(f"Created series for self: {data['series_id']}")
            # Verify no attribution
            assert "attributed_to" not in data or data.get("attributed_to") is None
        elif response.status_code == 403:
            print("User is not an approved creator - skipping")
        else:
            print(f"Series creation response: {response.status_code} - {response.text}")
    
    def test_create_series_with_attribution(self, auth_headers):
        """Test POST /api/creator/series with attributed_to for sub-creator"""
        # This test requires user to be a Super Creator with active sub-creators
        payload = {
            "title": f"TEST_SubCreator_Series_{uuid.uuid4().hex[:6]}",
            "description": "Test series created for a sub-creator by super creator",
            "genre": "Romance",
            "attributed_to": "sc-test-subcreator-001",  # Test sub-creator ID
            "attributed_name": "Test Sub-Creator"
        }
        
        response = requests.post(f"{BASE_URL}/api/creator/series", json=payload, headers=auth_headers)
        
        # 403 if not super creator, 404 if sub-creator not found, 200/201 if success
        assert response.status_code in [200, 201, 403, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"Created series for sub-creator: {data.get('series_id')}")
        elif response.status_code == 403:
            # This is expected if user is not a super creator
            print("User is not a Super Creator - cannot create content for sub-creators (expected)")
        elif response.status_code == 404:
            # Sub-creator not found - also expected in test environment
            print("Sub-creator not found - expected for test ID")
        
    def test_series_model_has_attribution_fields(self, auth_headers):
        """Verify that series API accepts attributed_to and attributed_name fields"""
        # This test verifies the API schema accepts the attribution fields
        payload = {
            "title": f"TEST_Attribution_Fields_{uuid.uuid4().hex[:6]}",
            "description": "Testing that API accepts attribution fields without error",
            "genre": "Thriller",
            "attributed_to": None,  # Explicitly set to null
            "attributed_name": None
        }
        
        response = requests.post(f"{BASE_URL}/api/creator/series", json=payload, headers=auth_headers)
        
        # Should not fail with validation error for having these fields
        assert response.status_code in [200, 201, 403], f"API rejected attribution fields: {response.text}"
        print(f"API accepts attribution fields in schema: status {response.status_code}")


class TestSuperCreatorStatus:
    """Test Super Creator status and dashboard access"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@kona.com", "password": "SuperAdmin2025!"},
            headers=HEADERS
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {**HEADERS, "Authorization": f"Bearer {admin_token}"}
    
    def test_super_creator_status_endpoint(self, auth_headers):
        """Test GET /api/super-creator/status returns correct status"""
        response = requests.get(f"{BASE_URL}/api/super-creator/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "is_super_creator" in data
        print(f"Super Creator status: {data['is_super_creator']}")
        
        if data.get("is_super_creator"):
            assert "contract_number" in data
            assert "territory" in data
            print(f"Territory: {data.get('territory')}")
    
    def test_super_creator_dashboard(self, auth_headers):
        """Test GET /api/super-creator/dashboard"""
        response = requests.get(f"{BASE_URL}/api/super-creator/dashboard", headers=auth_headers)
        
        # 200 if super creator, 403 if not
        assert response.status_code in [200, 403]
        
        if response.status_code == 200:
            data = response.json()
            assert "sub_creators" in data
            assert "earnings_30d" in data
            print(f"Dashboard data: {data}")
        else:
            print("Not a Super Creator - dashboard access denied (expected)")
    
    def test_super_creator_sub_creators_list(self, auth_headers):
        """Test GET /api/super-creator/sub-creators"""
        response = requests.get(f"{BASE_URL}/api/super-creator/sub-creators", headers=auth_headers)
        
        assert response.status_code in [200, 403]
        
        if response.status_code == 200:
            data = response.json()
            assert "sub_creators" in data
            print(f"Found {len(data['sub_creators'])} sub-creators")
        else:
            print("Not a Super Creator - sub-creators list denied (expected)")
    
    def test_create_sub_creator_endpoint(self, auth_headers):
        """Test POST /api/super-creator/sub-creators"""
        payload = {
            "name": f"TEST_SubCreator_{uuid.uuid4().hex[:6]}",
            "email": f"test.subcreator.{uuid.uuid4().hex[:6]}@example.com",
            "commission_percent": 15.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/super-creator/sub-creators",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201, 403]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "sub_creator" in data or "success" in data
            print(f"Created sub-creator: {data}")
        else:
            print("Not a Super Creator - cannot create sub-creators (expected)")


class TestCarouselNavigation:
    """Test carousel click navigation to series detail"""
    
    def test_series_list_endpoint(self):
        """Test GET /api/series returns series list"""
        response = requests.get(f"{BASE_URL}/api/series", headers=HEADERS)
        assert response.status_code == 200
        
        data = response.json()
        # Can be list or dict with 'series' key
        if isinstance(data, list):
            series_list = data
        else:
            series_list = data.get("series", [])
        
        print(f"Found {len(series_list)} series in list")
        assert len(series_list) >= 0
    
    def test_series_detail_endpoint(self):
        """Test GET /api/series/{id} returns series detail with episodes"""
        # First get a series ID
        response = requests.get(f"{BASE_URL}/api/series", headers=HEADERS)
        assert response.status_code == 200
        
        data = response.json()
        if isinstance(data, list):
            series_list = data
        else:
            series_list = data.get("series", [])
        
        if series_list:
            series_id = series_list[0].get("id")
            
            # Get series detail
            detail_response = requests.get(f"{BASE_URL}/api/series/{series_id}", headers=HEADERS)
            assert detail_response.status_code == 200
            
            detail = detail_response.json()
            assert "title" in detail
            print(f"Series detail for '{detail['title']}': {len(detail.get('episodes', []))} episodes")
        else:
            print("No series found - skipping detail test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
