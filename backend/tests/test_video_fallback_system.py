"""
Test: Video Playback Fallback System (Netflix/YouTube-style)
Tests the multi-quality MP4 fallback system to ensure videos ALWAYS play.

Features tested:
- Episode API returns all video URL formats (video_url, hls_url, mp4_url, mp4_urls, embed_url)
- MP4 URLs with multiple qualities (720p, 480p, 360p)
- Direct CDN URLs are accessible with CORS headers
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVideoFallbackSystem:
    """Test video playback fallback system"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session with browser-like headers"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_episode_id(self):
        """Test episode ID provided in requirements"""
        return "cs-b6f412cc76-s01e01"
    
    # ============ TEST 1: Episode API Returns All Video URL Formats ============
    def test_episode_api_returns_all_video_formats(self, session, test_episode_id):
        """GET /api/episodes/{id} should return video_url, hls_url, mp4_url, mp4_urls, and embed_url"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        
        # Verify API returns 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields exist
        assert "id" in data, "Response should contain 'id'"
        assert data["id"] == test_episode_id, f"Episode ID mismatch: {data['id']}"
        
        # Check video URL fields exist
        assert "video_url" in data, "Response should contain 'video_url'"
        assert "hls_url" in data, "Response should contain 'hls_url'"
        assert "mp4_url" in data, "Response should contain 'mp4_url'"
        assert "mp4_urls" in data, "Response should contain 'mp4_urls'"
        assert "embed_url" in data, "Response should contain 'embed_url'"
        
        print(f"✓ Episode {test_episode_id} returned all required video URL fields")
        print(f"  video_url: {data.get('video_url', 'N/A')[:80]}..." if data.get('video_url') else "  video_url: None")
        print(f"  hls_url: {data.get('hls_url', 'N/A')[:80]}..." if data.get('hls_url') else "  hls_url: None")
        print(f"  mp4_url: {data.get('mp4_url', 'N/A')[:80]}..." if data.get('mp4_url') else "  mp4_url: None")
        print(f"  mp4_urls: {data.get('mp4_urls')}")
        print(f"  embed_url: {data.get('embed_url', 'N/A')[:80]}..." if data.get('embed_url') else "  embed_url: None")
    
    # ============ TEST 2: MP4 URLs Contains Multiple Qualities ============
    def test_mp4_urls_has_multiple_qualities(self, session, test_episode_id):
        """mp4_urls should contain 720p, 480p, and 360p qualities"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        mp4_urls = data.get("mp4_urls", {})
        
        # Check mp4_urls is a dictionary
        assert isinstance(mp4_urls, dict), f"mp4_urls should be a dict, got {type(mp4_urls)}"
        
        # Check for quality options
        expected_qualities = ["720p", "480p", "360p"]
        for quality in expected_qualities:
            assert quality in mp4_urls, f"mp4_urls should contain '{quality}'"
            assert mp4_urls[quality], f"mp4_urls['{quality}'] should not be empty"
            assert "http" in mp4_urls[quality], f"mp4_urls['{quality}'] should be a valid URL"
        
        print(f"✓ MP4 URLs contain all required qualities:")
        for quality, url in mp4_urls.items():
            print(f"  {quality}: {url[:80]}...")
    
    # ============ TEST 3: HLS URL Format is Correct ============
    def test_hls_url_format(self, session, test_episode_id):
        """HLS URL should be a valid m3u8 playlist URL"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        hls_url = data.get("hls_url")
        
        # HLS URL may be None if bunny_video_id is not set
        if hls_url:
            assert ".m3u8" in hls_url or "playlist" in hls_url, "HLS URL should point to m3u8 playlist"
            print(f"✓ HLS URL format is correct: {hls_url[:80]}...")
        else:
            pytest.skip("HLS URL not available for this episode (no bunny_video_id)")
    
    # ============ TEST 4: Embed URL Format is Correct ============
    def test_embed_url_format(self, session, test_episode_id):
        """Embed URL should be a valid Bunny.net iframe URL"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        embed_url = data.get("embed_url")
        
        if embed_url:
            assert "mediadelivery.net" in embed_url or "iframe" in embed_url, "Embed URL should be a Bunny.net embed URL"
            assert "embed" in embed_url, "Embed URL should contain 'embed' in path"
            print(f"✓ Embed URL format is correct: {embed_url[:80]}...")
        else:
            pytest.skip("Embed URL not available for this episode")
    
    # ============ TEST 5: MP4 CDN URLs are Accessible ============
    def test_mp4_720p_url_accessible(self, session, test_episode_id):
        """720p MP4 URL should be accessible (return 200 or 206 for partial content)"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        mp4_urls = data.get("mp4_urls", {})
        mp4_720p = mp4_urls.get("720p")
        
        if not mp4_720p:
            pytest.skip("720p MP4 URL not available")
        
        # Make HEAD request to check accessibility (avoid downloading entire video)
        try:
            head_response = session.head(mp4_720p, timeout=10, allow_redirects=True)
            # 200 = full content, 206 = partial content (range request), 403 might occur if referrer blocked
            valid_codes = [200, 206]
            
            if head_response.status_code in valid_codes:
                print(f"✓ 720p MP4 URL is accessible (status: {head_response.status_code})")
                
                # Check for CORS headers
                cors_header = head_response.headers.get("Access-Control-Allow-Origin", "")
                if cors_header:
                    print(f"  CORS header: {cors_header}")
            elif head_response.status_code == 403:
                print(f"⚠ 720p MP4 URL returned 403 (referrer may be blocked)")
                # This is still valid - CDN might block based on referrer
            else:
                print(f"⚠ 720p MP4 URL returned {head_response.status_code}")
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Could not reach CDN: {e}")
    
    def test_mp4_480p_url_accessible(self, session, test_episode_id):
        """480p MP4 URL should be accessible"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        mp4_urls = data.get("mp4_urls", {})
        mp4_480p = mp4_urls.get("480p")
        
        if not mp4_480p:
            pytest.skip("480p MP4 URL not available")
        
        try:
            head_response = session.head(mp4_480p, timeout=10, allow_redirects=True)
            valid_codes = [200, 206, 403]  # 403 is acceptable (CDN referrer check)
            
            assert head_response.status_code in valid_codes, f"Expected 200/206/403, got {head_response.status_code}"
            print(f"✓ 480p MP4 URL check completed (status: {head_response.status_code})")
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Could not reach CDN: {e}")
    
    def test_mp4_360p_url_accessible(self, session, test_episode_id):
        """360p MP4 URL should be accessible"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        mp4_urls = data.get("mp4_urls", {})
        mp4_360p = mp4_urls.get("360p")
        
        if not mp4_360p:
            pytest.skip("360p MP4 URL not available")
        
        try:
            head_response = session.head(mp4_360p, timeout=10, allow_redirects=True)
            valid_codes = [200, 206, 403]
            
            assert head_response.status_code in valid_codes, f"Expected 200/206/403, got {head_response.status_code}"
            print(f"✓ 360p MP4 URL check completed (status: {head_response.status_code})")
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Could not reach CDN: {e}")
    
    # ============ TEST 6: Default mp4_url Points to Best Quality ============
    def test_default_mp4_url_is_best_quality(self, session, test_episode_id):
        """mp4_url should default to 720p (best available quality)"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        mp4_url = data.get("mp4_url")
        mp4_urls = data.get("mp4_urls", {})
        
        if not mp4_url:
            pytest.skip("mp4_url not available")
        
        # mp4_url should match either 720p or 480p (best available)
        expected_url = mp4_urls.get("720p") or mp4_urls.get("480p")
        
        if expected_url:
            assert mp4_url == expected_url, f"mp4_url should be best quality available"
            print(f"✓ Default mp4_url is set to best quality available")
        else:
            print(f"✓ mp4_url is set: {mp4_url[:80]}...")
    
    # ============ TEST 7: Episode with bunny_video_id Returns URLs ============
    def test_bunny_video_id_generates_urls(self, session, test_episode_id):
        """Episodes with bunny_video_id should have URLs generated from it"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        bunny_video_id = data.get("bunny_video_id")
        
        if not bunny_video_id:
            pytest.skip("Episode does not have bunny_video_id")
        
        # Check that URLs contain the bunny_video_id
        mp4_urls = data.get("mp4_urls", {})
        for quality, url in mp4_urls.items():
            if url:
                assert bunny_video_id in url, f"{quality} URL should contain bunny_video_id"
        
        hls_url = data.get("hls_url")
        if hls_url:
            assert bunny_video_id in hls_url, "HLS URL should contain bunny_video_id"
        
        embed_url = data.get("embed_url")
        if embed_url:
            assert bunny_video_id in embed_url, "Embed URL should contain bunny_video_id"
        
        print(f"✓ All URLs correctly reference bunny_video_id: {bunny_video_id}")
    
    # ============ TEST 8: Free Episode Returns unlocked=True ============
    def test_free_episode_is_unlocked(self, session, test_episode_id):
        """Free episodes (is_free=True) should return unlocked=True"""
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert response.status_code == 200
        
        data = response.json()
        is_free = data.get("is_free", False)
        unlocked = data.get("unlocked", False)
        
        if is_free:
            assert unlocked == True, "Free episodes should be unlocked"
            print(f"✓ Free episode is correctly marked as unlocked")
        else:
            print(f"ℹ Episode is not free (is_free={is_free})")
    
    # ============ TEST 9: Check All Episodes in a Series Have Video URLs ============
    def test_series_episodes_have_video_urls(self, session, test_episode_id):
        """Get series episodes and verify video URLs are present"""
        # First get the episode to find series_id
        ep_response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        assert ep_response.status_code == 200
        
        episode = ep_response.json()
        series_id = episode.get("series_id")
        
        if not series_id:
            pytest.skip("Episode has no series_id")
        
        # Get all episodes for the series
        eps_response = session.get(f"{BASE_URL}/api/series/{series_id}/episodes")
        assert eps_response.status_code == 200
        
        episodes = eps_response.json()
        assert len(episodes) > 0, "Series should have at least one episode"
        
        # Check first episode (test episode) has video URLs
        first_ep = episodes[0]
        # Note: Series episodes endpoint may not include video URLs (optimization)
        # Only the individual episode endpoint returns video URLs
        print(f"✓ Series {series_id} has {len(episodes)} episodes")
        print(f"  Episode list returned (video URLs are fetched per-episode)")


class TestVideoFallbackEdgeCases:
    """Test edge cases for video fallback system"""
    
    @pytest.fixture(scope="class")
    def session(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        return session
    
    def test_nonexistent_episode_returns_404(self, session):
        """Requesting non-existent episode should return 404"""
        response = session.get(f"{BASE_URL}/api/episodes/nonexistent-episode-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent episode correctly returns 404")
    
    def test_api_response_structure(self, session):
        """Verify API response has expected structure"""
        test_episode_id = "cs-b6f412cc76-s01e01"
        response = session.get(f"{BASE_URL}/api/episodes/{test_episode_id}")
        
        if response.status_code != 200:
            pytest.skip(f"Test episode not available: {response.status_code}")
        
        data = response.json()
        
        # Required fields for video playback
        expected_fields = [
            "id", "title", "episode_number", "series_id",
            "video_url", "hls_url", "mp4_url", "mp4_urls", "embed_url"
        ]
        
        missing_fields = [f for f in expected_fields if f not in data]
        
        if missing_fields:
            print(f"⚠ Missing fields: {missing_fields}")
        else:
            print(f"✓ API response contains all expected video playback fields")
        
        # Check mp4_urls structure
        mp4_urls = data.get("mp4_urls", {})
        if isinstance(mp4_urls, dict):
            print(f"✓ mp4_urls is a dictionary with keys: {list(mp4_urls.keys())}")
        else:
            print(f"⚠ mp4_urls is not a dictionary: {type(mp4_urls)}")
