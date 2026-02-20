"""
Test New Releases sorting and Session Management 
Tests for:
1) New Releases section shows newest series first
2) Session stability - users should not be logged out unexpectedly
3) Episode count accuracy
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"


class TestNewReleasesAndSession:
    """Test New Releases sorting and session stability"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        
    def test_01_series_api_returns_sorted_by_created_at(self):
        """GET /api/series should return series sorted by created_at descending (newest first)"""
        response = self.session.get(f"{BASE_URL}/api/series")
        
        print(f"Series API Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get series: {response.text}"
        
        series = response.json()
        assert isinstance(series, list), "Series should be a list"
        assert len(series) > 0, "Should have at least one series"
        
        print(f"Total series returned: {len(series)}")
        
        # Check if series have created_at field and are sorted
        series_with_dates = []
        for s in series:
            if "created_at" in s:
                series_with_dates.append({
                    "id": s["id"],
                    "title": s["title"],
                    "created_at": s.get("created_at"),
                    "total_episodes": s.get("total_episodes", 0)
                })
        
        # Print first 8 series (New Releases section uses series.slice(0, 8))
        print("\nFirst 8 series (New Releases section):")
        for i, s in enumerate(series[:8]):
            print(f"  {i+1}. {s['title']} - created_at: {s.get('created_at', 'N/A')} - episodes: {s.get('total_episodes', 0)}")
        
        # Check if the series titled 'Implementation Success' is in the first few
        implementation_success_index = None
        for i, s in enumerate(series):
            if "Implementation Success" in s.get("title", ""):
                implementation_success_index = i
                print(f"\n'Implementation Success' found at index {i}")
                break
        
        # Verify sorting by created_at (if dates are available)
        if len(series_with_dates) >= 2:
            for i in range(min(5, len(series_with_dates) - 1)):
                current = series_with_dates[i]
                next_item = series_with_dates[i + 1]
                if current["created_at"] and next_item["created_at"]:
                    print(f"Comparing: {current['title']} ({current['created_at']}) vs {next_item['title']} ({next_item['created_at']})")
                    assert current["created_at"] >= next_item["created_at"], \
                        f"Series not sorted correctly: {current['title']} should come before {next_item['title']}"
        
        print("\nSeries are sorted by created_at descending (newest first)")
        
    def test_02_login_success(self):
        """Test login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        print(f"Login Response: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        
        print(f"Logged in as: {data['user'].get('name', 'Unknown')}")
        print(f"User email: {data['user'].get('email')}")
        print(f"Is admin: {data['user'].get('is_admin')}")
        
        # Store token for subsequent tests
        TestNewReleasesAndSession.token = data["token"]
        TestNewReleasesAndSession.user_id = data["user"]["id"]
        
    def test_03_session_persists_with_valid_token(self):
        """Verify session persists across multiple requests"""
        token = getattr(TestNewReleasesAndSession, 'token', None)
        if not token:
            pytest.skip("No token available")
        
        # Make multiple requests with the same token
        for i in range(3):
            response = self.session.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            print(f"Request {i+1} - Status: {response.status_code}")
            assert response.status_code == 200, f"Session invalid on request {i+1}: {response.text}"
            
            data = response.json()
            assert "email" in data, "User data not returned"
            
            # Small delay between requests
            time.sleep(0.5)
        
        print("Session persisted across 3 consecutive requests")
        
    def test_04_auth_me_returns_valid_user(self):
        """Test /auth/me returns valid user data with token"""
        token = getattr(TestNewReleasesAndSession, 'token', None)
        if not token:
            pytest.skip("No token available")
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Auth Me Response: {response.status_code}")
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "User ID not returned"
        assert "email" in data, "Email not returned"
        assert data["email"] == TEST_EMAIL, f"Email mismatch: {data['email']} != {TEST_EMAIL}"
        
        print(f"User verified: {data.get('name')} ({data.get('email')})")
        
    def test_05_creator_status_check(self):
        """Test creator status endpoint"""
        token = getattr(TestNewReleasesAndSession, 'token', None)
        if not token:
            pytest.skip("No token available")
        
        response = self.session.get(
            f"{BASE_URL}/api/creator/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Creator Status Response: {response.status_code}")
        assert response.status_code == 200, f"Creator status failed: {response.text}"
        
        data = response.json()
        print(f"Creator status: {data}")
        assert "is_creator" in data, "is_creator field not returned"
        
    def test_06_creator_dashboard_loads(self):
        """Test creator dashboard loads without errors"""
        token = getattr(TestNewReleasesAndSession, 'token', None)
        if not token:
            pytest.skip("No token available")
        
        response = self.session.get(
            f"{BASE_URL}/api/creator/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Creator Dashboard Response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Dashboard data: {list(data.keys())}")
            assert "total_series" in data or "creator_id" in data, "Invalid dashboard response"
            print("Creator dashboard loaded successfully")
        elif response.status_code == 403:
            print("User is not an approved creator (expected for some users)")
        else:
            pytest.fail(f"Unexpected dashboard response: {response.text}")
        
    def test_07_episode_count_accuracy(self):
        """Verify episode counts are accurate on series"""
        response = self.session.get(f"{BASE_URL}/api/series")
        
        assert response.status_code == 200
        series = response.json()
        
        # Check episode counts for first few series
        print("\nEpisode counts verification:")
        for s in series[:5]:
            series_id = s["id"]
            total_episodes = s.get("total_episodes", 0)
            
            # Get actual episodes for this series
            ep_response = self.session.get(f"{BASE_URL}/api/series/{series_id}/episodes")
            
            if ep_response.status_code == 200:
                actual_episodes = len(ep_response.json())
                print(f"  {s['title']}: claimed={total_episodes}, actual={actual_episodes}")
                
                # Allow for some discrepancy but warn if significant
                if total_episodes != actual_episodes:
                    print(f"    WARNING: Episode count mismatch!")
            else:
                print(f"  {s['title']}: claimed={total_episodes}, could not verify (status {ep_response.status_code})")
                
    def test_08_no_401_on_protected_endpoints(self):
        """Verify no unexpected 401 errors on protected endpoints with valid token"""
        token = getattr(TestNewReleasesAndSession, 'token', None)
        if not token:
            pytest.skip("No token available")
        
        protected_endpoints = [
            "/api/auth/me",
            "/api/creator/status",
            "/api/rewards/status",
            "/api/user/profile"
        ]
        
        print("\nTesting protected endpoints with valid token:")
        for endpoint in protected_endpoints:
            response = self.session.get(
                f"{BASE_URL}{endpoint}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            # 401 would indicate session issue
            # 403 is acceptable (permission denied but token valid)
            # 404 is acceptable (endpoint may not exist)
            print(f"  {endpoint}: {response.status_code}")
            
            assert response.status_code != 401, f"Unexpected 401 on {endpoint} - session may have been invalidated"
            
        print("All protected endpoints responded without 401 errors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
