"""
Contract Template System API Tests
Tests CRUD operations for creator partnership contracts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kona-contract-export.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with authorization"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestContractsPlatformDefaults:
    """Test GET /api/contracts/defaults/platform - returns default values"""
    
    def test_get_platform_defaults_success(self):
        """Test that platform defaults endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/contracts/defaults/platform")
        
        # Status assertion
        assert response.status_code == 200
        
        data = response.json()
        
        # Data assertions - verify required fields exist
        assert "name" in data
        assert "company_name" in data
        assert "email" in data
        assert "default_revenue_terms" in data
        assert "default_contract_terms" in data
        assert "default_tax_terms" in data
        
        # Verify default revenue terms structure
        revenue = data["default_revenue_terms"]
        assert revenue["platform_fee_percent"] == 25
        assert revenue["creator_share_percent"] == 60
        assert revenue["platform_share_percent"] == 40
        assert revenue["minimum_payout_threshold"] == 50
        assert revenue["payout_frequency"] == "monthly"
        assert revenue["currency"] == "USD"
        
        # Verify creator + platform shares equal 100
        assert revenue["creator_share_percent"] + revenue["platform_share_percent"] == 100
        
        # Verify default contract terms
        terms = data["default_contract_terms"]
        assert terms["duration_months"] == 12
        assert terms["auto_renewal"] == True
        assert terms["exclusivity"] == False
        assert terms["content_ownership"] == "creator"
        assert terms["termination_notice_days"] == 30
        
        # Verify default tax terms
        tax = data["default_tax_terms"]
        assert tax["vat_handling"] == "creator_responsible"
        assert tax["withholding_tax_percent"] == 0


class TestContractsCreate:
    """Test POST /api/contracts/create - creates new contracts"""
    
    def test_create_contract_success(self, headers):
        """Test creating a new contract with all fields"""
        unique_id = uuid.uuid4().hex[:8]
        
        payload = {
            "creator": {
                "name": f"TEST_Creator_{unique_id}",
                "email": f"test_{unique_id}@example.com",
                "address": "123 Test Street",
                "tax_id": f"TAX-{unique_id}",
                "company_name": f"Test Company {unique_id}"
            },
            "platform": {
                "name": "Kona Streaming Platform",
                "email": "partnerships@kona.com",
                "address": "",
                "tax_id": "",
                "company_name": "Kona Media Inc."
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50,
                "payout_frequency": "monthly",
                "currency": "USD"
            },
            "contract_terms": {
                "duration_months": 12,
                "auto_renewal": True,
                "exclusivity": False,
                "exclusivity_scope": "none",
                "content_ownership": "creator",
                "termination_notice_days": 30
            },
            "tax_terms": {
                "vat_handling": "creator_responsible",
                "withholding_tax_percent": 0,
                "tax_jurisdiction": "UK",
                "creator_tax_registered": False,
                "creator_vat_number": None
            },
            "additional_clauses": ["Test clause 1"],
            "notes": "Test contract for automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        
        # Status assertion
        assert response.status_code == 200
        
        data = response.json()
        
        # Data assertions
        assert data["success"] == True
        assert "contract" in data
        assert "message" in data
        
        contract = data["contract"]
        assert contract["id"].startswith("contract-")
        assert contract["contract_number"].startswith("KON-")
        assert contract["status"] == "draft"
        assert contract["creator"]["name"] == f"TEST_Creator_{unique_id}"
        assert contract["revenue_terms"]["platform_fee_percent"] == 25
        assert contract["revenue_terms"]["creator_share_percent"] == 60
        assert contract["contract_terms"]["duration_months"] == 12
        assert contract["tax_terms"]["vat_handling"] == "creator_responsible"
        assert contract["version"] == 1
        
        # Store contract ID for cleanup
        return contract["id"]
    
    def test_create_contract_requires_auth(self):
        """Test that creating contract requires authentication"""
        payload = {
            "creator": {"name": "Test", "email": "test@test.com"},
            "platform": {"name": "Platform", "email": "p@p.com"},
            "revenue_terms": {},
            "contract_terms": {},
            "tax_terms": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            json=payload
        )
        
        assert response.status_code == 401


class TestContractsList:
    """Test GET /api/contracts/list - returns contracts with stats"""
    
    def test_list_contracts_success(self, headers):
        """Test listing contracts returns proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/list",
            headers=headers
        )
        
        # Status assertion
        assert response.status_code == 200
        
        data = response.json()
        
        # Data assertions - verify structure
        assert "contracts" in data
        assert "stats" in data
        assert "total" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "draft" in stats
        assert "sent" in stats
        assert "signed" in stats
        assert "active" in stats
        assert "terminated" in stats
        assert "expired" in stats
        
        # Verify stats add up
        status_sum = stats["draft"] + stats["sent"] + stats["signed"] + stats["active"] + stats["terminated"] + stats["expired"]
        assert stats["total"] == status_sum
        
        # Verify contracts are returned as list
        assert isinstance(data["contracts"], list)
        
        if len(data["contracts"]) > 0:
            contract = data["contracts"][0]
            assert "id" in contract
            assert "contract_number" in contract
            assert "status" in contract
            assert "creator" in contract
            assert "revenue_terms" in contract
            assert "contract_terms" in contract
    
    def test_list_contracts_filter_by_status(self, headers):
        """Test filtering contracts by status"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/list?status=draft",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned contracts should be draft status
        for contract in data["contracts"]:
            assert contract["status"] == "draft"
    
    def test_list_contracts_requires_auth(self):
        """Test that listing contracts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contracts/list")
        assert response.status_code == 401


class TestContractsHtml:
    """Test GET /api/contracts/{id}/html - returns HTML contract document"""
    
    @pytest.fixture(scope="class")
    def test_contract_id(self, headers):
        """Create a test contract and return its ID"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_HTML_Creator_{unique_id}",
                "email": f"html_test_{unique_id}@example.com",
                "address": "123 HTML Street",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Kona Streaming Platform",
                "email": "partnerships@kona.com",
                "address": "",
                "tax_id": "",
                "company_name": "Kona Media Inc."
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50,
                "payout_frequency": "monthly",
                "currency": "USD"
            },
            "contract_terms": {
                "duration_months": 24,
                "auto_renewal": False,
                "exclusivity": True,
                "exclusivity_scope": "platform",
                "content_ownership": "creator",
                "termination_notice_days": 60
            },
            "tax_terms": {
                "vat_handling": "platform_withholds",
                "withholding_tax_percent": 15,
                "tax_jurisdiction": "USA",
                "creator_tax_registered": True,
                "creator_vat_number": "US-12345"
            },
            "additional_clauses": ["Custom legal clause 1", "Custom legal clause 2"],
            "notes": "Test for HTML export"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200
        return response.json()["contract"]["id"]
    
    def test_get_contract_html_success(self, headers, test_contract_id):
        """Test getting contract as HTML"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{test_contract_id}/html",
            headers=headers
        )
        
        # Status assertion
        assert response.status_code == 200
        
        # Verify it returns HTML
        html = response.text
        assert "<!DOCTYPE html>" in html
        assert "<html" in html
        assert "Creator Partnership Agreement" in html
        assert "Revenue Sharing" in html
        assert "Tax Obligations" in html
        assert "Term & Termination" in html
        assert "Signatures" in html
    
    def test_get_contract_html_contains_contract_data(self, headers, test_contract_id):
        """Test that HTML contains the actual contract data"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{test_contract_id}/html",
            headers=headers
        )
        
        html = response.text
        
        # Revenue terms should be in the HTML
        assert "25%" in html or "25" in html  # Platform fee
        assert "60%" in html or "60" in html  # Creator share
        
        # Contract terms
        assert "24" in html  # Duration months
        
    def test_get_contract_html_not_found(self, headers):
        """Test getting HTML for non-existent contract"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/non-existent-id/html",
            headers=headers
        )
        assert response.status_code == 404


class TestContractsStatusUpdate:
    """Test PATCH /api/contracts/{id}/status - updates contract status"""
    
    @pytest.fixture(scope="class")
    def status_test_contract_id(self, headers):
        """Create a test contract for status update tests"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_Status_Creator_{unique_id}",
                "email": f"status_test_{unique_id}@example.com",
                "address": "",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Kona Streaming Platform",
                "email": "partnerships@kona.com",
                "address": "",
                "tax_id": "",
                "company_name": "Kona Media Inc."
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50,
                "payout_frequency": "monthly",
                "currency": "USD"
            },
            "contract_terms": {
                "duration_months": 12,
                "auto_renewal": True,
                "exclusivity": False,
                "exclusivity_scope": "none",
                "content_ownership": "creator",
                "termination_notice_days": 30
            },
            "tax_terms": {
                "vat_handling": "creator_responsible",
                "withholding_tax_percent": 0,
                "tax_jurisdiction": "",
                "creator_tax_registered": False,
                "creator_vat_number": None
            },
            "additional_clauses": None,
            "notes": "Test for status updates"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200
        return response.json()["contract"]["id"]
    
    def test_update_status_draft_to_sent(self, headers, status_test_contract_id):
        """Test updating contract status from draft to sent"""
        response = requests.patch(
            f"{BASE_URL}/api/contracts/{status_test_contract_id}/status",
            headers=headers,
            json={"status": "sent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "sent" in data["message"]
    
    def test_update_status_sent_to_signed(self, headers, status_test_contract_id):
        """Test updating contract status from sent to signed"""
        response = requests.patch(
            f"{BASE_URL}/api/contracts/{status_test_contract_id}/status",
            headers=headers,
            json={
                "status": "signed",
                "signed_date": "2026-02-27T12:00:00Z",
                "signed_by_creator": True,
                "signed_by_platform": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_status_invalid_status(self, headers, status_test_contract_id):
        """Test that invalid status returns error"""
        response = requests.patch(
            f"{BASE_URL}/api/contracts/{status_test_contract_id}/status",
            headers=headers,
            json={"status": "invalid_status"}
        )
        
        assert response.status_code == 400
    
    def test_update_status_not_found(self, headers):
        """Test updating status of non-existent contract"""
        response = requests.patch(
            f"{BASE_URL}/api/contracts/non-existent-id/status",
            headers=headers,
            json={"status": "sent"}
        )
        assert response.status_code == 404


class TestContractsDelete:
    """Test DELETE /api/contracts/{id} - deletes draft contracts"""
    
    def test_delete_draft_contract_success(self, headers):
        """Test deleting a draft contract"""
        # First create a contract to delete
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_Delete_Creator_{unique_id}",
                "email": f"delete_test_{unique_id}@example.com",
                "address": "",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Kona Streaming Platform",
                "email": "partnerships@kona.com",
                "address": "",
                "tax_id": "",
                "company_name": "Kona Media Inc."
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50,
                "payout_frequency": "monthly",
                "currency": "USD"
            },
            "contract_terms": {
                "duration_months": 12,
                "auto_renewal": True,
                "exclusivity": False,
                "exclusivity_scope": "none",
                "content_ownership": "creator",
                "termination_notice_days": 30
            },
            "tax_terms": {
                "vat_handling": "creator_responsible",
                "withholding_tax_percent": 0,
                "tax_jurisdiction": "",
                "creator_tax_registered": False,
                "creator_vat_number": None
            },
            "additional_clauses": None,
            "notes": "Test for deletion"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        contract_id = create_response.json()["contract"]["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["success"] == True
        
        # Verify it's actually deleted
        get_response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=headers
        )
        assert get_response.status_code == 404
    
    def test_delete_non_draft_contract_fails(self, headers):
        """Test that deleting non-draft contract fails"""
        # Create and update status to sent
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_NonDraft_Creator_{unique_id}",
                "email": f"nondraft_test_{unique_id}@example.com",
                "address": "",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Kona Streaming Platform",
                "email": "partnerships@kona.com",
                "address": "",
                "tax_id": "",
                "company_name": "Kona Media Inc."
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50,
                "payout_frequency": "monthly",
                "currency": "USD"
            },
            "contract_terms": {
                "duration_months": 12,
                "auto_renewal": True,
                "exclusivity": False,
                "exclusivity_scope": "none",
                "content_ownership": "creator",
                "termination_notice_days": 30
            },
            "tax_terms": {
                "vat_handling": "creator_responsible",
                "withholding_tax_percent": 0,
                "tax_jurisdiction": "",
                "creator_tax_registered": False,
                "creator_vat_number": None
            },
            "additional_clauses": None,
            "notes": "Test for non-draft deletion"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        contract_id = create_response.json()["contract"]["id"]
        
        # Update to sent
        requests.patch(
            f"{BASE_URL}/api/contracts/{contract_id}/status",
            headers=headers,
            json={"status": "sent"}
        )
        
        # Try to delete - should fail
        delete_response = requests.delete(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
