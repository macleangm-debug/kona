"""
Test suite for Gamification APIs
- Scratch Card (status, scratch)
- Streak Shield (status, purchase)
- Prediction (streak, get, submit)
- Episode Trivia (get questions, submit answers)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_USER = {"email": "demo@kona.com", "password": "Demo123!"}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestScratchCard:
    """Scratch Card API tests"""
    
    def test_scratch_card_status(self, auth_headers):
        """GET /api/games/scratch-card/status - Check scratch card status"""
        response = requests.get(f"{BASE_URL}/api/games/scratch-card/status", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "can_scratch" in data, "Missing 'can_scratch' field"
        assert "already_scratched" in data, "Missing 'already_scratched' field"
        assert "has_watched_today" in data, "Missing 'has_watched_today' field"
        assert "episodes_watched_today" in data, "Missing 'episodes_watched_today' field"
        assert "message" in data, "Missing 'message' field"
        
        # Validate data types
        assert isinstance(data["can_scratch"], bool)
        assert isinstance(data["already_scratched"], bool)
        assert isinstance(data["has_watched_today"], bool)
        assert isinstance(data["episodes_watched_today"], int)
        
        print(f"Scratch card status: can_scratch={data['can_scratch']}, message={data['message']}")
    
    def test_scratch_card_scratch_without_watching(self, auth_headers):
        """POST /api/games/scratch-card/scratch - Should fail if no episode watched"""
        # First check status
        status_response = requests.get(f"{BASE_URL}/api/games/scratch-card/status", headers=auth_headers)
        status = status_response.json()
        
        if not status.get("has_watched_today"):
            # Try to scratch without watching - should fail
            response = requests.post(f"{BASE_URL}/api/games/scratch-card/scratch", headers=auth_headers)
            assert response.status_code == 400, f"Expected 400 when not watched, got {response.status_code}"
            assert "Watch at least 1 episode" in response.json().get("detail", "")
            print("Correctly rejected scratch without watching episode")
        else:
            print("User has already watched today, skipping negative test")


class TestStreakShield:
    """Streak Shield API tests"""
    
    def test_streak_shield_status(self, auth_headers):
        """GET /api/games/streak/shield/status - Check shield status"""
        response = requests.get(f"{BASE_URL}/api/games/streak/shield/status", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "has_shield" in data, "Missing 'has_shield' field"
        assert "shield_cost" in data, "Missing 'shield_cost' field"
        assert "can_afford" in data, "Missing 'can_afford' field"
        assert "current_coins" in data, "Missing 'current_coins' field"
        
        # Validate shield cost is 50 as per requirements
        assert data["shield_cost"] == 50, f"Expected shield cost 50, got {data['shield_cost']}"
        
        # Validate data types
        assert isinstance(data["has_shield"], bool)
        assert isinstance(data["can_afford"], bool)
        assert isinstance(data["current_coins"], int)
        
        print(f"Shield status: has_shield={data['has_shield']}, cost={data['shield_cost']}, can_afford={data['can_afford']}")
    
    def test_streak_shield_purchase_insufficient_coins(self, auth_headers):
        """POST /api/games/streak/shield - Test purchase with insufficient coins"""
        # First check status
        status_response = requests.get(f"{BASE_URL}/api/games/streak/shield/status", headers=auth_headers)
        status = status_response.json()
        
        if status.get("has_shield"):
            # Already has shield - should fail
            response = requests.post(f"{BASE_URL}/api/games/streak/shield", headers=auth_headers)
            assert response.status_code == 400
            assert "already have" in response.json().get("detail", "").lower()
            print("Correctly rejected duplicate shield purchase")
        elif not status.get("can_afford"):
            # Not enough coins - should fail
            response = requests.post(f"{BASE_URL}/api/games/streak/shield", headers=auth_headers)
            assert response.status_code == 400
            assert "Not enough coins" in response.json().get("detail", "")
            print("Correctly rejected purchase with insufficient coins")
        else:
            print(f"User can afford shield (coins: {status['current_coins']}), skipping negative test")


class TestPredictionStreak:
    """Prediction Streak API tests"""
    
    def test_prediction_streak(self, auth_headers):
        """GET /api/games/prediction/streak - Get prediction streak"""
        response = requests.get(f"{BASE_URL}/api/games/prediction/streak", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "current_streak" in data, "Missing 'current_streak' field"
        assert "streak_bonuses" in data, "Missing 'streak_bonuses' field"
        
        # Validate data types
        assert isinstance(data["current_streak"], int)
        assert isinstance(data["streak_bonuses"], dict)
        
        # Validate streak bonuses structure
        bonuses = data["streak_bonuses"]
        assert "3" in bonuses or 3 in bonuses, "Missing streak bonus for 3"
        assert "5" in bonuses or 5 in bonuses, "Missing streak bonus for 5"
        assert "10" in bonuses or 10 in bonuses, "Missing streak bonus for 10"
        
        print(f"Prediction streak: {data['current_streak']}, next_bonus: {data.get('next_bonus')}")


class TestPredictionGame:
    """Prediction Game API tests"""
    
    def test_prediction_for_episode(self, auth_headers):
        """GET /api/games/prediction/{episode_id} - Get prediction for episode"""
        test_episode_id = "test_episode_123"
        response = requests.get(f"{BASE_URL}/api/games/prediction/{test_episode_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "episode_id" in data, "Missing 'episode_id' field"
        assert data["episode_id"] == test_episode_id
        
        if not data.get("already_predicted"):
            # New prediction - should have question and options
            assert "question" in data, "Missing 'question' field"
            assert "options" in data, "Missing 'options' field"
            assert "reward_if_correct" in data, "Missing 'reward_if_correct' field"
            
            # Validate reward is 3 coins as per requirements
            assert data["reward_if_correct"] == 3, f"Expected reward 3, got {data['reward_if_correct']}"
            
            # Validate options is a list
            assert isinstance(data["options"], list)
            assert len(data["options"]) > 0
            
            print(f"Prediction question: {data['question']}, options: {len(data['options'])}")
        else:
            print(f"Already predicted for episode: {data.get('prediction_text')}")
    
    def test_prediction_submit(self, auth_headers):
        """POST /api/games/prediction/submit - Submit prediction"""
        # Use a unique episode ID to avoid conflicts
        import time
        test_episode_id = f"test_pred_{int(time.time())}"
        
        # First get prediction options
        get_response = requests.get(f"{BASE_URL}/api/games/prediction/{test_episode_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        pred_data = get_response.json()
        if pred_data.get("already_predicted"):
            print("Already predicted, skipping submit test")
            return
        
        # Submit prediction
        submit_data = {
            "episode_id": test_episode_id,
            "prediction_index": 0  # Select first option
        }
        response = requests.post(f"{BASE_URL}/api/games/prediction/submit", json=submit_data, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Missing 'success' field"
        assert data["success"] == True
        assert "message" in data, "Missing 'message' field"
        assert "prediction" in data, "Missing 'prediction' field"
        
        print(f"Prediction submitted: {data['prediction']}")
    
    def test_prediction_submit_duplicate(self, auth_headers):
        """POST /api/games/prediction/submit - Should fail for duplicate prediction"""
        test_episode_id = "test_duplicate_pred"
        
        # First submit
        submit_data = {
            "episode_id": test_episode_id,
            "prediction_index": 0
        }
        first_response = requests.post(f"{BASE_URL}/api/games/prediction/submit", json=submit_data, headers=auth_headers)
        
        # Second submit should fail
        second_response = requests.post(f"{BASE_URL}/api/games/prediction/submit", json=submit_data, headers=auth_headers)
        
        if first_response.status_code == 200:
            # First was successful, second should fail
            assert second_response.status_code == 400
            assert "Already made a prediction" in second_response.json().get("detail", "")
            print("Correctly rejected duplicate prediction")
        else:
            # First already failed (already predicted before)
            print("Episode already had prediction, duplicate test passed")


class TestEpisodeTrivia:
    """Episode Trivia API tests"""
    
    def test_trivia_get_questions_not_watched(self, auth_headers):
        """GET /api/games/trivia/{episode_id} - Should fail if episode not watched"""
        test_episode_id = "unwatched_episode_xyz"
        response = requests.get(f"{BASE_URL}/api/games/trivia/{test_episode_id}", headers=auth_headers)
        
        # Should fail because episode not watched
        assert response.status_code == 400, f"Expected 400 for unwatched episode, got {response.status_code}"
        assert "Watch the episode first" in response.json().get("detail", "")
        print("Correctly rejected trivia for unwatched episode")
    
    def test_trivia_submit_structure(self, auth_headers):
        """POST /api/games/trivia/submit - Test submit endpoint structure"""
        # This will likely fail because we haven't watched the episode,
        # but we can test the endpoint exists and validates input
        submit_data = {
            "episode_id": "test_trivia_ep",
            "answers": [0, 1, 2]
        }
        response = requests.post(f"{BASE_URL}/api/games/trivia/submit", json=submit_data, headers=auth_headers)
        
        # Should return 400 (not watched) or 200 (if somehow watched)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 400:
            # Expected - trivia not available
            print(f"Trivia submit rejected as expected: {response.json().get('detail')}")
        else:
            # Unexpected success - validate response
            data = response.json()
            assert "correct_count" in data
            assert "coins_earned" in data
            print(f"Trivia submitted: {data['correct_count']} correct, {data['coins_earned']} coins")


class TestAPIRouteOrder:
    """Test that API routes are correctly ordered (streak before parametric)"""
    
    def test_prediction_streak_route_accessible(self, auth_headers):
        """Verify /api/games/prediction/streak is accessible (not caught by /{episode_id})"""
        response = requests.get(f"{BASE_URL}/api/games/prediction/streak", headers=auth_headers)
        
        # Should return 200 with streak data, not 200 with prediction data for "streak" episode
        assert response.status_code == 200
        
        data = response.json()
        # Should have streak-specific fields, not prediction fields
        assert "current_streak" in data, "Route returned prediction data instead of streak data"
        assert "question" not in data, "Route incorrectly matched /{episode_id} pattern"
        
        print("Prediction streak route correctly ordered before parametric route")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
