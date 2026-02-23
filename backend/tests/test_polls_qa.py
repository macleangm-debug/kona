"""
Test Fan Polls & Q&A API Endpoints
Tests for poll creation, retrieval, and Q&A features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with browser-like headers"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": BASE_URL,
        "Referer": f"{BASE_URL}/"
    })
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPollsEndpoints:
    """Test polls API endpoints"""
    
    poll_ids_to_cleanup = []
    
    def test_create_multiple_choice_poll(self, authenticated_client):
        """Test POST /api/polls/ - Create multiple choice poll"""
        poll_data = {
            "question": f"TEST_poll_mc_{uuid.uuid4().hex[:8]}",
            "poll_type": "multiple_choice",
            "options": ["Option A", "Option B", "Option C", "Option D"]
        }
        response = authenticated_client.post(f"{BASE_URL}/api/polls/", json=poll_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "success" in data
        assert data["success"] is True
        assert "poll" in data
        
        poll = data["poll"]
        assert poll["question"] == poll_data["question"]
        assert poll["poll_type"] == "multiple_choice"
        assert len(poll["options"]) == 4
        assert poll["status"] == "active"
        assert poll["total_votes"] == 0
        
        # Save for cleanup
        self.poll_ids_to_cleanup.append(poll["id"])
        print(f"✓ Created multiple choice poll: {poll['id']}")
    
    def test_create_yes_no_poll(self, authenticated_client):
        """Test POST /api/polls/ - Create yes/no poll"""
        poll_data = {
            "question": f"TEST_poll_yesno_{uuid.uuid4().hex[:8]}",
            "poll_type": "yes_no"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/polls/", json=poll_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        poll = data["poll"]
        assert poll["poll_type"] == "yes_no"
        # Yes/No polls auto-generate options
        assert len(poll["options"]) == 2
        assert poll["options"][0]["text"] == "Yes"
        assert poll["options"][1]["text"] == "No"
        
        self.poll_ids_to_cleanup.append(poll["id"])
        print(f"✓ Created yes/no poll: {poll['id']}")
    
    def test_create_rating_poll(self, authenticated_client):
        """Test POST /api/polls/ - Create rating poll"""
        poll_data = {
            "question": f"TEST_poll_rating_{uuid.uuid4().hex[:8]}",
            "poll_type": "rating"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/polls/", json=poll_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        poll = data["poll"]
        assert poll["poll_type"] == "rating"
        # Rating polls auto-generate 1-5 options
        assert len(poll["options"]) == 5
        option_texts = [opt["text"] for opt in poll["options"]]
        assert option_texts == ["1", "2", "3", "4", "5"]
        
        self.poll_ids_to_cleanup.append(poll["id"])
        print(f"✓ Created rating poll: {poll['id']}")
    
    def test_get_creator_polls(self, authenticated_client):
        """Test GET /api/polls/creator/my - Get creator's polls"""
        response = authenticated_client.get(f"{BASE_URL}/api/polls/creator/my")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "polls" in data
        assert "total" in data
        assert isinstance(data["polls"], list)
        assert data["total"] >= 0
        
        # Check poll structure if any exist
        if data["polls"]:
            poll = data["polls"][0]
            assert "id" in poll
            assert "question" in poll
            assert "poll_type" in poll
            assert "options" in poll
            assert "total_votes" in poll
            assert "status" in poll
        
        print(f"✓ Retrieved {data['total']} creator polls")
    
    def test_create_poll_validation_short_question(self, authenticated_client):
        """Test POST /api/polls/ - Validation for short question"""
        poll_data = {
            "question": "Abc",  # Too short (minimum 5 chars)
            "poll_type": "multiple_choice",
            "options": ["A", "B"]
        }
        response = authenticated_client.post(f"{BASE_URL}/api/polls/", json=poll_data)
        
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"
        print("✓ Short question validation works")
    
    def test_create_poll_validation_insufficient_options(self, authenticated_client):
        """Test POST /api/polls/ - Validation for insufficient options"""
        poll_data = {
            "question": "This is a valid question?",
            "poll_type": "multiple_choice",
            "options": ["Only one"]  # Need at least 2 for multiple choice
        }
        response = authenticated_client.post(f"{BASE_URL}/api/polls/", json=poll_data)
        
        # Should fail with 400 (business logic validation)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Insufficient options validation works")


class TestQAEndpoints:
    """Test Q&A API endpoints"""
    
    def test_get_pending_questions(self, authenticated_client):
        """Test GET /api/polls/qa/creator/pending"""
        response = authenticated_client.get(f"{BASE_URL}/api/polls/qa/creator/pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "questions" in data
        assert "total" in data
        assert isinstance(data["questions"], list)
        
        print(f"✓ Retrieved {data['total']} pending questions")


class TestPollActions:
    """Test poll actions - update, delete, pin"""
    
    def test_create_update_and_delete_poll(self, authenticated_client):
        """Test full poll lifecycle: create -> update -> delete"""
        # Create poll
        create_data = {
            "question": f"TEST_lifecycle_{uuid.uuid4().hex[:8]}",
            "poll_type": "multiple_choice",
            "options": ["Option 1", "Option 2"]
        }
        create_response = authenticated_client.post(f"{BASE_URL}/api/polls/", json=create_data)
        assert create_response.status_code == 200
        poll_id = create_response.json()["poll"]["id"]
        print(f"✓ Created poll: {poll_id}")
        
        # Update poll (pin it)
        update_response = authenticated_client.patch(
            f"{BASE_URL}/api/polls/{poll_id}",
            json={"pinned": True}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_poll = update_response.json()["poll"]
        assert updated_poll["pinned"] is True
        print(f"✓ Updated poll to pinned")
        
        # Close poll
        close_response = authenticated_client.patch(
            f"{BASE_URL}/api/polls/{poll_id}",
            json={"status": "closed"}
        )
        assert close_response.status_code == 200
        assert close_response.json()["poll"]["status"] == "closed"
        print(f"✓ Closed poll")
        
        # Delete poll
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/polls/{poll_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"✓ Deleted poll: {poll_id}")
        
        # Verify deletion
        get_response = authenticated_client.get(f"{BASE_URL}/api/polls/{poll_id}")
        assert get_response.status_code == 404
        print(f"✓ Verified poll is deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
