"""
Tests for Enhanced Search, Recommendations, Thumbnail A/B Testing, and Admin Notifications
Features: 
- Enhanced Search with auto-complete, filters, history
- Recommendation Engine with collaborative filtering and content-based hybrid approach
- Thumbnail A/B Testing for creators and admin
- Admin Notification Management with segments and triggers
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

# Common headers to avoid bot detection
COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json"
}


class TestAuthentication:
    """Helper class to manage authentication"""
    
    @staticmethod
    def get_token():
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }, headers=COMMON_HEADERS)
        if response.status_code == 200:
            return response.json().get("token")
        return None


class TestEnhancedSearch:
    """Test enhanced search endpoints with filters, suggestions, and trending"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuthentication.get_token()
        self.headers = {**COMMON_HEADERS, "Authorization": f"Bearer {self.token}"} if self.token else COMMON_HEADERS.copy()
    
    def test_01_search_series_with_query(self):
        """Test GET /api/search/?q=love - Basic search"""
        response = requests.get(f"{BASE_URL}/api/search/?q=love", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "results" in data, "Response should contain 'results' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "query" in data, "Response should contain 'query' key"
        assert data["query"] == "love", f"Query should be 'love', got {data['query']}"
        print(f"Search for 'love' returned {data['total']} results")
    
    def test_02_search_with_filters(self):
        """Test search with genre filter and sort"""
        response = requests.get(
            f"{BASE_URL}/api/search/?q=love&sort_by=rating&limit=5", 
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "filters_applied" in data, "Response should contain 'filters_applied'"
        assert data["filters_applied"]["sort_by"] == "rating"
        print(f"Search with filters returned {len(data['results'])} results")
    
    def test_03_search_suggestions_autocomplete(self):
        """Test GET /api/search/suggestions?q=lo - Auto-complete"""
        response = requests.get(f"{BASE_URL}/api/search/suggestions?q=lo", headers=COMMON_HEADERS)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "suggestions" in data, "Response should contain 'suggestions' key"
        assert "query" in data, "Response should contain 'query' key"
        assert isinstance(data["suggestions"], list), "Suggestions should be a list"
        print(f"Suggestions for 'lo': {data['suggestions'][:5]}")
    
    def test_04_search_suggestions_minimum_length(self):
        """Test suggestions with single character (should return empty)"""
        response = requests.get(f"{BASE_URL}/api/search/suggestions?q=l", headers=COMMON_HEADERS)
        
        assert response.status_code == 200
        data = response.json()
        # Single char should return empty suggestions
        assert data["suggestions"] == [] or len(data["query"]) >= 2, "Single char query should return empty or valid"
    
    def test_05_trending_searches(self):
        """Test GET /api/search/trending - Get trending searches"""
        response = requests.get(f"{BASE_URL}/api/search/trending", headers=COMMON_HEADERS)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "trending" in data, "Response should contain 'trending' key"
        assert isinstance(data["trending"], list), "Trending should be a list"
        print(f"Trending searches: {data['trending'][:5]}")
    
    def test_06_search_history_requires_auth(self):
        """Test search history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/search/history", headers=COMMON_HEADERS)
        
        # Should require auth - 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_07_search_history_with_auth(self):
        """Test search history with authentication"""
        response = requests.get(f"{BASE_URL}/api/search/history", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "history" in data, "Response should contain 'history' key"
    
    def test_08_available_genres(self):
        """Test GET /api/search/genres - Get available genres"""
        response = requests.get(f"{BASE_URL}/api/search/genres", headers=COMMON_HEADERS)
        
        assert response.status_code == 200
        data = response.json()
        assert "genres" in data, "Response should contain 'genres' key"
        print(f"Available genres: {[g.get('name') for g in data['genres'][:5]]}")
    
    def test_09_quick_search(self):
        """Test quick search (navbar search - no auth required)"""
        response = requests.get(f"{BASE_URL}/api/search/quick?q=romance", headers=COMMON_HEADERS)
        
        assert response.status_code == 200
        data = response.json()
        assert "series" in data, "Response should contain 'series' key"


class TestRecommendationEngine:
    """Test recommendation engine endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuthentication.get_token()
        self.headers = {**COMMON_HEADERS, "Authorization": f"Bearer {self.token}"} if self.token else COMMON_HEADERS.copy()
    
    def test_01_personalized_recommendations(self):
        """Test GET /api/recommendations/for-you - Personalized recommendations"""
        response = requests.get(f"{BASE_URL}/api/recommendations/for-you", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        assert "count" in data, "Response should contain 'count' key"
        assert "method" in data, "Response should contain 'method' key"
        
        # Method should be one of: hybrid, trending_fallback, none
        assert data["method"] in ["hybrid", "trending_fallback", "none"], f"Unexpected method: {data['method']}"
        print(f"For You recommendations: {data['count']} items via {data['method']}")
    
    def test_02_trending_series(self):
        """Test GET /api/recommendations/trending - Trending series"""
        response = requests.get(f"{BASE_URL}/api/recommendations/trending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "trending" in data, "Response should contain 'trending' key"
        assert "count" in data, "Response should contain 'count' key"
        print(f"Trending series: {data['count']} items")
    
    def test_03_similar_series(self):
        """Test similar series endpoint (requires valid series_id)"""
        # First get a series to use
        series_response = requests.get(f"{BASE_URL}/api/series?limit=1", headers=self.headers)
        
        if series_response.status_code == 200:
            series_list = series_response.json()
            if series_list and len(series_list) > 0:
                series_id = series_list[0].get("id")
                
                response = requests.get(f"{BASE_URL}/api/recommendations/similar/{series_id}")
                
                assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
                if response.status_code == 200:
                    data = response.json()
                    assert "series" in data, "Response should contain 'series'"
                    print(f"Similar to {series_id}: {len(data['series'])} items")
    
    def test_04_genre_recommendations(self):
        """Test genre-based recommendations"""
        response = requests.get(
            f"{BASE_URL}/api/recommendations/genres/Romance?limit=10", 
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "series" in data, "Response should contain 'series'"
        assert "genre" in data, "Response should contain 'genre'"
    
    def test_05_recommendation_feedback(self):
        """Test submitting recommendation feedback"""
        # Use a test series ID
        response = requests.post(
            f"{BASE_URL}/api/recommendations/feedback",
            params={"series_id": "test-series-123", "feedback": "liked"},
            headers=self.headers
        )
        
        # Should succeed or indicate series not found
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"


class TestThumbnailABTesting:
    """Test Thumbnail A/B Testing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuthentication.get_token()
        self.headers = {**COMMON_HEADERS, "Authorization": f"Bearer {self.token}"} if self.token else COMMON_HEADERS.copy()
        self.test_series_id = f"test-series-{uuid.uuid4().hex[:8]}"
    
    def test_01_get_admin_thumbnail_tests(self):
        """Test GET /api/thumbnail-testing/admin/all - Get all thumbnail tests"""
        response = requests.get(
            f"{BASE_URL}/api/thumbnail-testing/admin/all", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "tests" in data, "Response should contain 'tests' key"
        assert isinstance(data["tests"], list), "Tests should be a list"
        print(f"Total thumbnail tests: {len(data['tests'])}")
    
    def test_02_get_thumbnail_testing_stats(self):
        """Test GET /api/thumbnail-testing/admin/stats - Admin statistics"""
        response = requests.get(
            f"{BASE_URL}/api/thumbnail-testing/admin/stats", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "total_tests" in data, "Response should contain 'total_tests'"
        assert "active_tests" in data, "Response should contain 'active_tests'"
        assert "ended_tests" in data, "Response should contain 'ended_tests'"
        assert "decision_rate" in data, "Response should contain 'decision_rate'"
        print(f"Thumbnail stats - Total: {data['total_tests']}, Active: {data['active_tests']}")
    
    def test_03_create_thumbnail_test(self):
        """Test POST /api/thumbnail-testing/create - Create thumbnail A/B test"""
        # First need a valid series - get one from the database
        series_response = requests.get(f"{BASE_URL}/api/series?limit=1", headers=self.headers)
        
        if series_response.status_code != 200 or not series_response.json():
            pytest.skip("No series available for testing")
        
        series = series_response.json()[0]
        series_id = series.get("id")
        
        # Create test
        test_data = {
            "series_id": series_id,
            "variants": [
                {"url": "https://example.com/thumb-a.jpg", "name": "Control", "weight": 50},
                {"url": "https://example.com/thumb-b.jpg", "name": "Variant B", "weight": 50}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/thumbnail-testing/create",
            json=test_data,
            headers=self.headers
        )
        
        # May fail if test already exists - that's ok
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "test" in data, "Response should contain 'test'"
            print(f"Created thumbnail test: {data['test'].get('id')}")
        else:
            # 400 means test already exists
            print(f"Test creation returned 400 (possibly existing test): {response.json().get('detail')}")
    
    def test_04_get_series_thumbnail(self):
        """Test thumbnail assignment for a series"""
        series_response = requests.get(f"{BASE_URL}/api/series?limit=1", headers=self.headers)
        
        if series_response.status_code != 200 or not series_response.json():
            pytest.skip("No series available")
        
        series_id = series_response.json()[0].get("id")
        
        response = requests.get(f"{BASE_URL}/api/thumbnail-testing/series/{series_id}/thumbnail")
        
        assert response.status_code == 200
        data = response.json()
        assert "thumbnail" in data, "Response should contain 'thumbnail'"
        assert "is_test" in data, "Response should contain 'is_test' flag"
    
    def test_05_admin_all_requires_auth(self):
        """Test that admin/all requires authentication"""
        response = requests.get(f"{BASE_URL}/api/thumbnail-testing/admin/all")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAdminNotificationManagement:
    """Test Admin Notification Management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuthentication.get_token()
        self.headers = {**COMMON_HEADERS, "Authorization": f"Bearer {self.token}"} if self.token else COMMON_HEADERS.copy()
    
    def test_01_get_notification_stats(self):
        """Test GET /api/notifications/admin/stats - Notification statistics"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/stats", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "total_sent" in data, "Response should contain 'total_sent'"
        assert "total_read" in data, "Response should contain 'total_read'"
        assert "read_rate" in data, "Response should contain 'read_rate'"
        assert "sent_today" in data, "Response should contain 'sent_today'"
        print(f"Notification stats - Total: {data['total_sent']}, Read rate: {data['read_rate']}%")
    
    def test_02_get_notification_triggers(self):
        """Test GET /api/notifications/admin/triggers - Automated triggers"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/triggers", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "triggers" in data, "Response should contain 'triggers'"
        assert isinstance(data["triggers"], dict), "Triggers should be a dict"
        print(f"Configured triggers: {list(data['triggers'].keys())}")
    
    def test_03_broadcast_notification(self):
        """Test POST /api/notifications/admin/broadcast - Send broadcast"""
        broadcast_data = {
            "title": f"Test Broadcast {datetime.now().isoformat()[:19]}",
            "message": "This is an automated test notification.",
            "type": "info",
            "segment": "all",
            "priority": "low"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/broadcast",
            params=broadcast_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should contain 'message'"
        assert "recipients_count" in data, "Response should contain 'recipients_count'"
        assert "batch_id" in data, "Response should contain 'batch_id'"
        print(f"Broadcast sent to {data['recipients_count']} users, batch: {data['batch_id']}")
    
    def test_04_broadcast_to_segment_vip(self):
        """Test broadcast to VIP segment"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/broadcast",
            params={
                "title": "VIP Test Notification",
                "message": "Test message for VIP users",
                "type": "promo",
                "segment": "vip",
                "priority": "normal"
            },
            headers=self.headers
        )
        
        # May return 400 if no VIP users exist
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_05_update_trigger_config(self):
        """Test PUT /api/notifications/admin/triggers/{trigger_type}"""
        # Update the new_episode trigger
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/triggers/new_episode",
            json={"enabled": True, "config": {}},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        print(f"Trigger update response: {data}")
    
    def test_06_get_recent_notifications(self):
        """Test GET /api/notifications/admin/recent"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/recent?limit=5", 
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data, "Response should contain 'notifications'"
    
    def test_07_get_notification_campaigns(self):
        """Test GET /api/notifications/admin/campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/campaigns?limit=10", 
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "campaigns" in data, "Response should contain 'campaigns'"
        print(f"Total campaigns: {len(data['campaigns'])}")
    
    def test_08_admin_stats_requires_auth(self):
        """Test that admin stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/stats")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestSearchAnalytics:
    """Test search analytics for admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuthentication.get_token()
        self.headers = {**COMMON_HEADERS, "Authorization": f"Bearer {self.token}"} if self.token else COMMON_HEADERS.copy()
    
    def test_01_search_analytics(self):
        """Test GET /api/search/admin/analytics - Search analytics"""
        response = requests.get(
            f"{BASE_URL}/api/search/admin/analytics?days=7", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "total_searches" in data, "Response should contain 'total_searches'"
        assert "unique_users" in data, "Response should contain 'unique_users'"
        assert "top_queries" in data, "Response should contain 'top_queries'"
        print(f"Search analytics - Total: {data['total_searches']}, Unique users: {data['unique_users']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
