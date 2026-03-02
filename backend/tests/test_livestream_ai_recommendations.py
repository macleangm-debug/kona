"""
Backend Tests for Live Streaming and AI Recommendations APIs
Tests the new features: Live Streaming, Advanced AI Recommendations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "superadmin@kona.com"
ADMIN_PASSWORD = "SuperAdmin2025!"

# Common headers to avoid bot detection
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Origin": BASE_URL,
    "Referer": BASE_URL
}

class TestLiveStreamingAPI:
    """Test Live Streaming API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def login(self):
        """Login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    def test_livestream_active_endpoint(self):
        """Test GET /api/livestream/active endpoint returns list of active streams"""
        response = self.session.get(f"{BASE_URL}/api/livestream/active?limit=10")
        print(f"GET /api/livestream/active: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "streams" in data, "Response should contain 'streams' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["streams"], list), "'streams' should be a list"
        print(f"PASS: Active streams endpoint returns {len(data['streams'])} streams, total: {data['total']}")
    
    def test_livestream_scheduled_endpoint(self):
        """Test GET /api/livestream/scheduled endpoint returns upcoming streams"""
        response = self.session.get(f"{BASE_URL}/api/livestream/scheduled?limit=10")
        print(f"GET /api/livestream/scheduled: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of scheduled streams"
        print(f"PASS: Scheduled streams endpoint returns {len(data)} streams")
    
    def test_livestream_create_requires_auth(self):
        """Test POST /api/livestream/create requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/livestream/create", json={
            "title": "TEST_Stream",
            "description": "Test stream"
        })
        print(f"POST /api/livestream/create (no auth): {response.status_code}")
        
        # Should return 401 or 403 without authentication
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Create stream endpoint requires authentication")
    
    def test_livestream_create_requires_creator(self):
        """Test POST /api/livestream/create requires creator status"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.post(f"{BASE_URL}/api/livestream/create", json={
            "title": "TEST_Stream",
            "description": "Test stream"
        })
        print(f"POST /api/livestream/create (with auth): {response.status_code}")
        
        # Admin user may or may not be a creator - either 200/201 or 403 is acceptable
        assert response.status_code in [200, 201, 403], f"Expected 200/201/403, got {response.status_code}: {response.text}"
        
        if response.status_code == 403:
            print("PASS: Non-creator users get 403 (expected behavior)")
        else:
            data = response.json()
            assert "stream" in data or "id" in data, "Response should contain stream info"
            print("PASS: Creator can create stream")


class TestAIRecommendationsAPI:
    """Test AI Recommendations API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def login(self):
        """Login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    def test_ai_mood_happy(self):
        """Test GET /api/recommendations/ai/mood/happy returns mood-based recommendations"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.get(f"{BASE_URL}/api/recommendations/ai/mood/happy?limit=10")
        print(f"GET /api/recommendations/ai/mood/happy: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mood" in data, "Response should contain 'mood' key"
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        assert data["mood"] == "happy", f"Mood should be 'happy', got {data['mood']}"
        print(f"PASS: Mood recommendations for 'happy' returns {len(data['recommendations'])} items")
    
    def test_ai_mood_romantic(self):
        """Test GET /api/recommendations/ai/mood/romantic returns mood-based recommendations"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.get(f"{BASE_URL}/api/recommendations/ai/mood/romantic?limit=10")
        print(f"GET /api/recommendations/ai/mood/romantic: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mood" in data, "Response should contain 'mood' key"
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        assert data["mood"] == "romantic", f"Mood should be 'romantic', got {data['mood']}"
        print(f"PASS: Mood recommendations for 'romantic' returns {len(data['recommendations'])} items")
    
    def test_ai_mood_thrilling(self):
        """Test GET /api/recommendations/ai/mood/thrilling returns mood-based recommendations"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.get(f"{BASE_URL}/api/recommendations/ai/mood/thrilling?limit=10")
        print(f"GET /api/recommendations/ai/mood/thrilling: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mood" in data, "Response should contain 'mood' key"
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        print(f"PASS: Mood recommendations for 'thrilling' returns {len(data['recommendations'])} items")
    
    def test_ai_personalized_recommendations(self):
        """Test GET /api/recommendations/ai/personalized returns personalized recommendations"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.get(f"{BASE_URL}/api/recommendations/ai/personalized?limit=10")
        print(f"GET /api/recommendations/ai/personalized: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        assert "signals_used" in data, "Response should contain 'signals_used' key"
        print(f"PASS: AI Personalized recommendations returns {len(data['recommendations'])} items")
    
    def test_ai_quick_picks_short(self):
        """Test GET /api/recommendations/ai/quick-picks returns quick picks for short duration"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.get(f"{BASE_URL}/api/recommendations/ai/quick-picks?duration=short")
        print(f"GET /api/recommendations/ai/quick-picks?duration=short: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "duration" in data, "Response should contain 'duration' key"
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        assert "label" in data, "Response should contain 'label' key"
        print(f"PASS: Quick picks (short) returns {len(data['recommendations'])} items")


class TestStandardRecommendationsAPI:
    """Test standard recommendations API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def login(self):
        """Login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    def test_for_you_recommendations(self):
        """Test GET /api/recommendations/for-you returns personalized recommendations"""
        if not self.login():
            pytest.skip("Login failed")
        
        response = self.session.get(f"{BASE_URL}/api/recommendations/for-you?limit=10")
        print(f"GET /api/recommendations/for-you: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recommendations" in data, "Response should contain 'recommendations' key"
        assert "method" in data, "Response should contain 'method' key"
        print(f"PASS: For-you recommendations returns {len(data['recommendations'])} items using method: {data['method']}")
    
    def test_trending_recommendations(self):
        """Test GET /api/recommendations/trending returns trending series"""
        response = self.session.get(f"{BASE_URL}/api/recommendations/trending?limit=10")
        print(f"GET /api/recommendations/trending: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "trending" in data, "Response should contain 'trending' key"
        print(f"PASS: Trending recommendations returns {len(data['trending'])} items")


class TestSeriesAPI:
    """Test Series API endpoints to verify series data for testing Free Episodes feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_series_list(self):
        """Test GET /api/series returns series list"""
        response = self.session.get(f"{BASE_URL}/api/series")
        print(f"GET /api/series: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of series"
        
        # Check for free series (no is_exclusive and no custom_episode_price)
        free_series = [s for s in data if not s.get("is_exclusive") and not s.get("custom_episode_price")]
        exclusive_series = [s for s in data if s.get("is_exclusive") or s.get("custom_episode_price")]
        
        print(f"PASS: Series endpoint returns {len(data)} series")
        print(f"  - Free first episode series: {len(free_series)}")
        print(f"  - Exclusive/Premium series: {len(exclusive_series)}")
        
        # Verify series structure
        if len(data) > 0:
            series = data[0]
            assert "id" in series, "Series should have 'id'"
            assert "title" in series, "Series should have 'title'"
            print(f"  - Sample series: {series.get('title')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
