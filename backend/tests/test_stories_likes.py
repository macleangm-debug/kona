"""
Backend Tests for Stories Feed, Episode Likes, and Share APIs
Tests the new features:
- GET /api/stories/feed
- POST /api/episodes/like
- POST /api/episodes/unlike
- GET /api/episodes/{id}/like-status
- POST /api/episodes/share
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@kona.com"
TEST_PASSWORD = "Demo123!"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestStoriesFeed:
    """Tests for GET /api/stories/feed - TikTok-style free episodes"""
    
    def test_stories_feed_returns_list(self, api_client):
        """Stories feed should return a list of stories"""
        response = api_client.get(f"{BASE_URL}/api/stories/feed")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Stories feed returned {len(data)} stories")
    
    def test_stories_feed_has_correct_structure(self, api_client):
        """Each story should have series, episode, liked, likes, shares fields"""
        response = api_client.get(f"{BASE_URL}/api/stories/feed")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            story = data[0]
            assert "series" in story, "Story should have 'series' field"
            assert "episode" in story, "Story should have 'episode' field"
            assert "liked" in story, "Story should have 'liked' field"
            assert "likes" in story, "Story should have 'likes' field"
            assert "shares" in story, "Story should have 'shares' field"
            print(f"✅ Story structure is correct: {list(story.keys())}")
    
    def test_stories_contains_free_first_episodes(self, api_client):
        """All stories should be first episodes (free episodes)"""
        response = api_client.get(f"{BASE_URL}/api/stories/feed")
        assert response.status_code == 200
        data = response.json()
        
        for story in data[:5]:  # Check first 5
            episode = story.get("episode", {})
            assert episode.get("episode_number") == 1, "Story should be first episode"
            assert episode.get("is_free") == True, "First episode should be free"
        print("✅ All stories are free first episodes")
    
    def test_stories_feed_count(self, api_client):
        """Stories feed should return approximately 25 stories (one per series)"""
        response = api_client.get(f"{BASE_URL}/api/stories/feed")
        assert response.status_code == 200
        data = response.json()
        # Should have at least 20 stories based on seeded data
        assert len(data) >= 20, f"Expected at least 20 stories, got {len(data)}"
        print(f"✅ Stories feed count: {len(data)} stories")
    
    def test_stories_have_video_url(self, api_client):
        """Each story episode should have a video URL"""
        response = api_client.get(f"{BASE_URL}/api/stories/feed")
        assert response.status_code == 200
        data = response.json()
        
        for story in data[:5]:
            episode = story.get("episode", {})
            assert "video_url" in episode, "Episode should have video_url"
            assert episode["video_url"].startswith("http"), "Video URL should be valid"
        print("✅ All stories have valid video URLs")


class TestEpisodeLikes:
    """Tests for episode like/unlike functionality"""
    
    def test_like_episode_requires_auth(self, api_client):
        """Liking an episode should require authentication"""
        # Remove auth header if present
        temp_session = requests.Session()
        temp_session.headers.update({"Content-Type": "application/json"})
        
        response = temp_session.post(f"{BASE_URL}/api/episodes/like", json={
            "episode_id": "series-1-ep1"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Like endpoint requires authentication")
    
    def test_like_episode_success(self, authenticated_client):
        """Should successfully like an episode"""
        # First unlike to ensure clean state
        authenticated_client.post(f"{BASE_URL}/api/episodes/unlike", json={
            "episode_id": "series-1-ep1"
        })
        
        # Now like
        response = authenticated_client.post(f"{BASE_URL}/api/episodes/like", json={
            "episode_id": "series-1-ep1"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("liked") == True
        assert "likes" in data
        print(f"✅ Episode liked successfully. Total likes: {data.get('likes')}")
    
    def test_like_episode_already_liked(self, authenticated_client):
        """Liking an already liked episode should return 400"""
        # Ensure it's liked first
        authenticated_client.post(f"{BASE_URL}/api/episodes/like", json={
            "episode_id": "series-1-ep1"
        })
        
        # Try to like again
        response = authenticated_client.post(f"{BASE_URL}/api/episodes/like", json={
            "episode_id": "series-1-ep1"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Correctly rejects duplicate likes")
    
    def test_unlike_episode_success(self, authenticated_client):
        """Should successfully unlike an episode"""
        # Ensure it's liked first
        authenticated_client.post(f"{BASE_URL}/api/episodes/like", json={
            "episode_id": "series-1-ep1"
        })
        
        # Now unlike
        response = authenticated_client.post(f"{BASE_URL}/api/episodes/unlike", json={
            "episode_id": "series-1-ep1"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("liked") == False
        assert "likes" in data
        print(f"✅ Episode unliked successfully. Total likes: {data.get('likes')}")
    
    def test_unlike_not_liked_episode(self, authenticated_client):
        """Unliking a non-liked episode should return 400"""
        # Ensure it's not liked
        authenticated_client.post(f"{BASE_URL}/api/episodes/unlike", json={
            "episode_id": "series-2-ep1"
        })
        
        # Try to unlike again
        response = authenticated_client.post(f"{BASE_URL}/api/episodes/unlike", json={
            "episode_id": "series-2-ep1"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Correctly rejects unlike for non-liked episode")


class TestLikeStatus:
    """Tests for GET /api/episodes/{id}/like-status"""
    
    def test_like_status_anonymous(self, api_client):
        """Anonymous users should see likes count but not be liked"""
        # Remove auth header
        temp_session = requests.Session()
        response = temp_session.get(f"{BASE_URL}/api/episodes/series-1-ep1/like-status")
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        assert "likes" in data
        # Anonymous user should have liked=False
        assert data["liked"] == False
        print(f"✅ Anonymous like status: liked={data['liked']}, likes={data['likes']}")
    
    def test_like_status_authenticated(self, authenticated_client):
        """Authenticated users should see their like status"""
        response = authenticated_client.get(f"{BASE_URL}/api/episodes/series-1-ep1/like-status")
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        assert "likes" in data
        assert isinstance(data["liked"], bool)
        assert isinstance(data["likes"], int)
        print(f"✅ Authenticated like status: liked={data['liked']}, likes={data['likes']}")


class TestEpisodeShare:
    """Tests for POST /api/episodes/share"""
    
    def test_share_episode_anonymous(self, api_client):
        """Anonymous users should be able to track shares"""
        temp_session = requests.Session()
        temp_session.headers.update({"Content-Type": "application/json"})
        
        response = temp_session.post(f"{BASE_URL}/api/episodes/share", json={
            "episode_id": "series-1-ep1",
            "platform": "whatsapp"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("shared") == True
        assert data.get("platform") == "whatsapp"
        print("✅ Anonymous share tracked successfully")
    
    def test_share_episode_authenticated(self, authenticated_client):
        """Authenticated users should be able to track shares"""
        response = authenticated_client.post(f"{BASE_URL}/api/episodes/share", json={
            "episode_id": "series-1-ep1",
            "platform": "twitter"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("shared") == True
        assert data.get("platform") == "twitter"
        print("✅ Authenticated share tracked successfully")
    
    def test_share_multiple_platforms(self, authenticated_client):
        """Should track shares across different platforms"""
        platforms = ["whatsapp", "twitter", "facebook", "copy_link"]
        
        for platform in platforms:
            response = authenticated_client.post(f"{BASE_URL}/api/episodes/share", json={
                "episode_id": "series-3-ep1",
                "platform": platform
            })
            assert response.status_code == 200
            data = response.json()
            assert data.get("platform") == platform
        print(f"✅ All share platforms working: {platforms}")


class TestVideoPlayerEndpoints:
    """Tests for video player related endpoints"""
    
    def test_get_episode_details(self, authenticated_client):
        """Should get episode details"""
        response = authenticated_client.get(f"{BASE_URL}/api/episodes/series-1-ep1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "video_url" in data
        print(f"✅ Episode details: {data.get('title')}")
    
    def test_get_series_details(self, api_client):
        """Should get series details"""
        response = api_client.get(f"{BASE_URL}/api/series/series-1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "total_episodes" in data
        print(f"✅ Series details: {data.get('title')}")
    
    def test_get_series_episodes(self, api_client):
        """Should get all episodes for a series"""
        response = api_client.get(f"{BASE_URL}/api/series/series-1/episodes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Series has {len(data)} episodes")


class TestTopTenSeries:
    """Tests for Top 10 series functionality"""
    
    def test_get_all_series(self, api_client):
        """Should get all series for Top 10 display"""
        response = api_client.get(f"{BASE_URL}/api/series")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"Expected at least 10 series for Top 10, got {len(data)}"
        
        # Check series have required fields for display
        for series in data[:5]:
            assert "id" in series
            assert "title" in series
            assert "thumbnail" in series
            assert "genre" in series
        print(f"✅ Got {len(data)} series for Top 10 display")
    
    def test_get_featured_series(self, api_client):
        """Should get featured series for carousel"""
        response = api_client.get(f"{BASE_URL}/api/series/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Got {len(data)} featured series")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
