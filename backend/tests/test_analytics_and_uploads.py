"""
Test Creator Analytics (P2) and Thumbnail/Video URL Upload (P1) features
- Analytics endpoints: GET /api/creator/analytics, GET /api/creator/analytics/compare
- Series PATCH with thumbnail_url parameter
- Episode PATCH with thumbnail_url and video_url parameters
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@kona.com"
TEST_PASSWORD = "Demo123!"


class TestCreatorAnalytics:
    """Test P2: Enhanced Creator Analytics with charts, trends, and time periods"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_analytics_default_period(self):
        """Test GET /api/creator/analytics with default 30d period"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required response structure
        assert "period" in data, "Response should contain 'period'"
        assert "summary" in data, "Response should contain 'summary'"
        assert "charts" in data, "Response should contain 'charts'"
        assert "top_episodes" in data, "Response should contain 'top_episodes'"
        assert "series_performance" in data, "Response should contain 'series_performance'"
        assert "metrics" in data, "Response should contain 'metrics'"
        
        # Verify period structure
        assert data["period"]["type"] == "30d", "Default period should be 30d"
        assert "start" in data["period"]
        assert "end" in data["period"]
        assert "days" in data["period"]
        
        # Verify summary structure (P2 metrics)
        summary = data["summary"]
        assert "total_views" in summary, "Summary should have total_views"
        assert "total_earnings" in summary, "Summary should have total_earnings"
        assert "avg_daily_views" in summary, "Summary should have avg_daily_views"
        assert "avg_daily_earnings" in summary, "Summary should have avg_daily_earnings"
        assert "total_likes" in summary, "Summary should have total_likes"
        assert "total_shares" in summary, "Summary should have total_shares"
        assert "engagement_rate" in summary, "Summary should have engagement_rate"
        
        # Verify charts structure
        charts = data["charts"]
        assert "views" in charts, "Charts should have views data"
        assert "earnings" in charts, "Charts should have earnings data"
        
        # Verify metrics structure
        metrics = data["metrics"]
        assert "unique_viewers" in metrics, "Metrics should have unique_viewers"
        
        print(f"✅ Analytics default period test passed - Period: {data['period']['type']}")
    
    def test_analytics_7d_period(self):
        """Test GET /api/creator/analytics?period=7d"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics?period=7d")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"]["type"] == "7d", "Period type should be 7d"
        assert data["period"]["days"] <= 7, "Days should be <= 7"
        
        print(f"✅ Analytics 7d period test passed")
    
    def test_analytics_30d_period(self):
        """Test GET /api/creator/analytics?period=30d"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics?period=30d")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"]["type"] == "30d"
        print(f"✅ Analytics 30d period test passed")
    
    def test_analytics_90d_period(self):
        """Test GET /api/creator/analytics?period=90d"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics?period=90d")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"]["type"] == "90d"
        print(f"✅ Analytics 90d period test passed")
    
    def test_analytics_all_time(self):
        """Test GET /api/creator/analytics?period=all"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics?period=all")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"]["type"] == "all"
        print(f"✅ Analytics all time period test passed")
    
    def test_analytics_custom_period(self):
        """Test GET /api/creator/analytics with custom date range"""
        response = self.session.get(
            f"{BASE_URL}/api/creator/analytics?period=custom&start_date=2025-01-01&end_date=2025-01-31"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"]["type"] == "custom"
        print(f"✅ Analytics custom period test passed")
    
    def test_analytics_compare_30d(self):
        """Test GET /api/creator/analytics/compare with 30d period"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics/compare?period=30d")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify comparison structure
        assert "period" in data
        assert "current" in data
        assert "previous" in data
        assert "growth" in data
        
        # Verify current period
        assert "views" in data["current"]
        assert "earnings" in data["current"]
        
        # Verify previous period
        assert "views" in data["previous"]
        assert "earnings" in data["previous"]
        
        # Verify growth metrics (P2 feature)
        growth = data["growth"]
        assert "views_percent" in growth, "Growth should have views_percent"
        assert "earnings_percent" in growth, "Growth should have earnings_percent"
        assert "views_trend" in growth, "Growth should have views_trend (up/down/flat)"
        assert "earnings_trend" in growth, "Growth should have earnings_trend (up/down/flat)"
        
        # Validate trend values
        assert growth["views_trend"] in ["up", "down", "flat"]
        assert growth["earnings_trend"] in ["up", "down", "flat"]
        
        print(f"✅ Analytics compare test passed - Views trend: {growth['views_trend']}, Earnings trend: {growth['earnings_trend']}")
    
    def test_analytics_compare_7d(self):
        """Test GET /api/creator/analytics/compare?period=7d"""
        response = self.session.get(f"{BASE_URL}/api/creator/analytics/compare?period=7d")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "7d"
        print(f"✅ Analytics compare 7d test passed")
    
    def test_analytics_unauthenticated(self):
        """Test analytics endpoint without authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/creator/analytics")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Analytics unauthenticated test passed - Status: {response.status_code}")


class TestSeriesThumbnailUpdate:
    """Test P1: Series PATCH with thumbnail_url parameter"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_creator_series(self):
        """Get creator's series to find test series ID"""
        response = self.session.get(f"{BASE_URL}/api/creator/series")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of series"
        
        if len(data) > 0:
            print(f"✅ Found {len(data)} series. First series ID: {data[0].get('id')}")
            self.test_series_id = data[0].get('id')
        else:
            print("⚠️ No series found for this creator")
        
        return data
    
    def test_update_series_thumbnail_url(self):
        """Test PATCH /api/creator/series/{id} with thumbnail_url"""
        # First get series list
        series_list = self.test_get_creator_series()
        
        if not series_list:
            pytest.skip("No series available to test thumbnail update")
        
        series_id = series_list[0]["id"]
        test_thumbnail = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"
        
        # Update series with thumbnail_url parameter
        response = self.session.patch(
            f"{BASE_URL}/api/creator/series/{series_id}",
            params={"thumbnail_url": test_thumbnail}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "updated_fields" in data
        assert "thumbnail" in data["updated_fields"], "thumbnail should be in updated fields"
        
        print(f"✅ Series thumbnail update test passed - Updated fields: {data['updated_fields']}")
    
    def test_update_series_with_title_and_description(self):
        """Test PATCH /api/creator/series/{id} with multiple fields"""
        series_list = self.test_get_creator_series()
        
        if not series_list:
            pytest.skip("No series available")
        
        series_id = series_list[0]["id"]
        original_title = series_list[0].get("title", "")
        
        # Update with title and description
        response = self.session.patch(
            f"{BASE_URL}/api/creator/series/{series_id}",
            params={
                "title": original_title,  # Keep original
                "description": "Updated description for testing"
            }
        )
        
        assert response.status_code == 200
        print(f"✅ Series multi-field update test passed")
    
    def test_update_series_invalid_thumbnail_url(self):
        """Test PATCH with invalid thumbnail URL format"""
        series_list = self.test_get_creator_series()
        
        if not series_list:
            pytest.skip("No series available")
        
        series_id = series_list[0]["id"]
        
        # Try invalid URL
        response = self.session.patch(
            f"{BASE_URL}/api/creator/series/{series_id}",
            params={"thumbnail_url": "not-a-valid-url"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid URL, got {response.status_code}"
        print(f"✅ Invalid thumbnail URL rejection test passed")


class TestEpisodeThumbnailAndVideoUpdate:
    """Test P1: Episode PATCH with thumbnail_url and video_url parameters"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def get_test_episode(self):
        """Get first available episode for testing"""
        # Get series first
        series_response = self.session.get(f"{BASE_URL}/api/creator/series")
        
        if series_response.status_code != 200 or not series_response.json():
            return None
        
        series = series_response.json()
        
        # Get series detail with episodes
        series_id = series[0]["id"]
        detail_response = self.session.get(f"{BASE_URL}/api/creator/series/{series_id}")
        
        if detail_response.status_code != 200:
            return None
        
        detail = detail_response.json()
        episodes = detail.get("episodes", [])
        
        if not episodes:
            return None
        
        return episodes[0]
    
    def test_update_episode_thumbnail_url(self):
        """Test PATCH /api/creator/episodes/{id} with thumbnail_url"""
        episode = self.get_test_episode()
        
        if not episode:
            pytest.skip("No episodes available to test")
        
        episode_id = episode["id"]
        test_thumbnail = "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg"
        
        response = self.session.patch(
            f"{BASE_URL}/api/creator/episodes/{episode_id}",
            params={"thumbnail_url": test_thumbnail}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "updated_fields" in data
        assert "thumbnail" in data["updated_fields"], "thumbnail should be in updated fields"
        
        print(f"✅ Episode thumbnail update test passed - Episode: {episode_id}")
    
    def test_update_episode_video_url(self):
        """Test PATCH /api/creator/episodes/{id} with video_url"""
        episode = self.get_test_episode()
        
        if not episode:
            pytest.skip("No episodes available to test")
        
        episode_id = episode["id"]
        test_video = "https://vz-4eaec9b9-e1c.b-cdn.net/test-video.mp4"
        
        response = self.session.patch(
            f"{BASE_URL}/api/creator/episodes/{episode_id}",
            params={"video_url": test_video}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updated_fields" in data
        assert "video_url" in data["updated_fields"], "video_url should be in updated fields"
        assert "encoding_status" in data["updated_fields"], "encoding_status should be set to ready"
        
        print(f"✅ Episode video URL update test passed - Episode: {episode_id}")
    
    def test_update_episode_both_urls(self):
        """Test PATCH /api/creator/episodes/{id} with both thumbnail_url and video_url"""
        episode = self.get_test_episode()
        
        if not episode:
            pytest.skip("No episodes available to test")
        
        episode_id = episode["id"]
        
        response = self.session.patch(
            f"{BASE_URL}/api/creator/episodes/{episode_id}",
            params={
                "thumbnail_url": "https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg",
                "video_url": "https://vz-4eaec9b9-e1c.b-cdn.net/another-test.mp4"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "thumbnail" in data["updated_fields"]
        assert "video_url" in data["updated_fields"]
        
        print(f"✅ Episode both URLs update test passed")
    
    def test_update_episode_invalid_thumbnail_url(self):
        """Test PATCH with invalid thumbnail URL"""
        episode = self.get_test_episode()
        
        if not episode:
            pytest.skip("No episodes available")
        
        response = self.session.patch(
            f"{BASE_URL}/api/creator/episodes/{episode['id']}",
            params={"thumbnail_url": "invalid-url"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Invalid episode thumbnail URL rejection test passed")
    
    def test_update_episode_invalid_video_url(self):
        """Test PATCH with invalid video URL"""
        episode = self.get_test_episode()
        
        if not episode:
            pytest.skip("No episodes available")
        
        response = self.session.patch(
            f"{BASE_URL}/api/creator/episodes/{episode['id']}",
            params={"video_url": "invalid-video-url"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Invalid episode video URL rejection test passed")


class TestCreatorDashboard:
    """Test Creator Dashboard with tabs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed")
    
    def test_creator_status(self):
        """Test GET /api/creator/status"""
        response = self.session.get(f"{BASE_URL}/api/creator/status")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "is_creator" in data
        assert "status" in data
        
        print(f"✅ Creator status test passed - is_creator: {data['is_creator']}")
    
    def test_creator_dashboard(self):
        """Test GET /api/creator/dashboard"""
        response = self.session.get(f"{BASE_URL}/api/creator/dashboard")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "total_views" in data
        assert "total_earnings" in data
        assert "tier" in data
        assert "revenue_share" in data
        
        print(f"✅ Creator dashboard test passed - Tier: {data['tier']}, Revenue share: {data['revenue_share']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
