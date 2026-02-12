"""
Test Admin Dashboard Modules: Job Applications & Press Articles
Tests for:
- Admin login authentication
- Job Applications admin endpoints
- Press Articles admin endpoints
- Public press page endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "password123"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token via login"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_login_with_valid_credentials(self, api_client):
        """Test login with testuser@example.com / password123"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        # Verify user has admin access
        assert data["user"].get("is_admin") == True, "User should be admin"
    
    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code in [401, 400]


class TestJobApplicationsAdmin:
    """Test Job Applications admin endpoints"""
    
    def test_get_applications_list(self, authenticated_client):
        """Test fetching job applications list with stats"""
        response = authenticated_client.get(f"{BASE_URL}/api/careers/admin/applications")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "applications" in data
        assert "stats" in data
        assert isinstance(data["applications"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "pending" in stats
        assert "shortlisted" in stats
        assert "interview" in stats
        assert "high_priority" in stats
    
    def test_get_applications_with_status_filter(self, authenticated_client):
        """Test filtering applications by status"""
        response = authenticated_client.get(f"{BASE_URL}/api/careers/admin/applications?status=pending")
        
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
    
    def test_get_applications_with_priority_filter(self, authenticated_client):
        """Test filtering applications by priority"""
        response = authenticated_client.get(f"{BASE_URL}/api/careers/admin/applications?priority=high")
        
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data


class TestPressArticlesAdmin:
    """Test Press Articles admin endpoints"""
    
    def test_get_admin_articles_list(self, authenticated_client):
        """Test fetching all articles for admin with stats"""
        response = authenticated_client.get(f"{BASE_URL}/api/press/admin/articles")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "articles" in data
        assert "stats" in data
        assert isinstance(data["articles"], list)
        
        # Verify stats structure (3 articles, 1 featured per main agent)
        stats = data["stats"]
        assert "total" in stats
        assert "published" in stats
        assert "drafts" in stats
        assert "featured" in stats
        
        # Validate expected test data
        assert stats["total"] >= 3, f"Expected at least 3 articles, got {stats['total']}"
        assert stats["featured"] >= 1, f"Expected at least 1 featured article, got {stats['featured']}"
    
    def test_create_article(self, authenticated_client):
        """Test creating a new press article"""
        new_article = {
            "title": "TEST_Article: Testing Press Module",
            "content": "This is a test article created by the testing agent to verify press article creation functionality works correctly. It contains enough content to meet the minimum length requirement.",
            "summary": "Test article for automated testing",
            "tag": "Milestone",
            "category": "News",
            "is_featured": False,
            "is_published": True
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/press/admin/articles", json=new_article)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify article was created
        assert "id" in data
        assert data["title"] == new_article["title"]
        assert data["tag"] == new_article["tag"]
        assert data["is_published"] == True
        
        # Store article ID for cleanup
        return data["id"]
    
    def test_create_article_validation_fails_without_title(self, authenticated_client):
        """Test article creation fails when title is missing"""
        invalid_article = {
            "content": "This is content without a title which should fail validation."
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/press/admin/articles", json=invalid_article)
        
        # Should fail validation
        assert response.status_code == 422
    
    def test_create_article_validation_fails_short_content(self, authenticated_client):
        """Test article creation fails when content is too short"""
        invalid_article = {
            "title": "Valid Title Here",
            "content": "Too short",  # Less than 50 characters
            "tag": "News"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/press/admin/articles", json=invalid_article)
        
        # Should fail validation
        assert response.status_code == 422
    
    def test_update_article(self, authenticated_client):
        """Test updating an existing press article"""
        # First get existing articles
        response = authenticated_client.get(f"{BASE_URL}/api/press/admin/articles")
        assert response.status_code == 200
        articles = response.json()["articles"]
        
        if len(articles) > 0:
            article_id = articles[0]["id"]
            
            update_data = {
                "summary": "Updated summary for testing purposes"
            }
            
            response = authenticated_client.put(f"{BASE_URL}/api/press/admin/articles/{article_id}", json=update_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
    
    def test_publish_unpublish_article(self, authenticated_client):
        """Test publishing and unpublishing an article"""
        # Get articles first
        response = authenticated_client.get(f"{BASE_URL}/api/press/admin/articles")
        assert response.status_code == 200
        articles = response.json()["articles"]
        
        if len(articles) > 0:
            # Find a published article to unpublish
            published_article = next((a for a in articles if a["is_published"]), None)
            
            if published_article:
                article_id = published_article["id"]
                
                # Unpublish
                response = authenticated_client.post(f"{BASE_URL}/api/press/admin/articles/{article_id}/unpublish")
                assert response.status_code == 200
                
                # Publish again
                response = authenticated_client.post(f"{BASE_URL}/api/press/admin/articles/{article_id}/publish")
                assert response.status_code == 200
    
    def test_set_featured_article(self, authenticated_client):
        """Test setting an article as featured"""
        # Get articles first
        response = authenticated_client.get(f"{BASE_URL}/api/press/admin/articles")
        assert response.status_code == 200
        articles = response.json()["articles"]
        
        if len(articles) > 1:
            # Find a non-featured article
            non_featured = next((a for a in articles if not a.get("is_featured")), None)
            
            if non_featured:
                article_id = non_featured["id"]
                
                response = authenticated_client.post(f"{BASE_URL}/api/press/admin/articles/{article_id}/feature")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] == True


class TestPublicPressPage:
    """Test public press page endpoints"""
    
    def test_get_published_articles(self, api_client):
        """Test fetching published articles (public endpoint)"""
        response = api_client.get(f"{BASE_URL}/api/press/articles")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "articles" in data
        assert isinstance(data["articles"], list)
        
        # All returned articles should be published
        for article in data["articles"]:
            assert article.get("is_published") == True
            assert "title" in article
            assert "tag" in article
    
    def test_get_featured_article(self, api_client):
        """Test fetching featured article (public endpoint)"""
        response = api_client.get(f"{BASE_URL}/api/press/featured")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return the featured article or null
        if data is not None:
            assert data.get("is_featured") == True
            assert data.get("is_published") == True
    
    def test_get_articles_by_tag(self, api_client):
        """Test filtering articles by tag"""
        response = api_client.get(f"{BASE_URL}/api/press/articles?tag=Funding")
        
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data
        
        # All returned articles should have the requested tag
        for article in data["articles"]:
            assert article.get("tag") == "Funding"
    
    def test_get_single_article(self, api_client):
        """Test fetching a single published article by ID"""
        # First get list of articles to get a valid ID
        list_response = api_client.get(f"{BASE_URL}/api/press/articles")
        assert list_response.status_code == 200
        articles = list_response.json()["articles"]
        
        if len(articles) > 0:
            article_id = articles[0]["id"]
            
            response = api_client.get(f"{BASE_URL}/api/press/articles/{article_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == article_id


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_articles(self, authenticated_client):
        """Delete test articles created during testing"""
        response = authenticated_client.get(f"{BASE_URL}/api/press/admin/articles")
        
        if response.status_code == 200:
            articles = response.json().get("articles", [])
            
            for article in articles:
                if article.get("title", "").startswith("TEST_"):
                    delete_response = authenticated_client.delete(
                        f"{BASE_URL}/api/press/admin/articles/{article['id']}"
                    )
                    print(f"Cleaned up test article: {article['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
