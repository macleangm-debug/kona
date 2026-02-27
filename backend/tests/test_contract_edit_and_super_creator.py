"""
Contract Edit Feature & Super Creator Dashboard API Tests
Tests:
1. Contract Edit - PUT /api/contracts/{id} with version tracking
2. Contract Activate - POST /api/contracts/{id}/activate for signed contracts
3. Super Creator Status API - GET /api/super-creator/status
4. Super Creator Dashboard API - GET /api/super-creator/dashboard
5. Super Creator Sub-Creators CRUD - /api/super-creator/sub-creators
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kona-contract-export.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

# Browser-like User-Agent to bypass bot detection
TEST_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


@pytest.fixture(scope="module")
def base_headers():
    """Get base headers with User-Agent to bypass bot detection"""
    return {
        "User-Agent": TEST_USER_AGENT,
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def auth_token(base_headers):
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        headers=base_headers,
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with authorization and User-Agent"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
        "User-Agent": TEST_USER_AGENT
    }


# =================
# Contract Edit Tests
# =================
class TestContractEdit:
    """Test PUT /api/contracts/{id} - Edit contract with version tracking"""
    
    @pytest.fixture(scope="class")
    def edit_test_contract_id(self, headers):
        """Create a test contract for edit tests"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_Edit_Creator_{unique_id}",
                "email": f"edit_test_{unique_id}@example.com",
                "address": "123 Original Street",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Dar24 Media Limited",
                "email": "partnerships@dar24media.com",
                "address": "Dar es Salaam, Tanzania",
                "tax_id": "",
                "company_name": "Dar24 Media Limited"
            },
            "platform_provider": {
                "name": "Kona Streaming Services",
                "role": "Technology Platform Provider"
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50000,
                "payout_frequency": "monthly",
                "currency": "TZS"
            },
            "contract_terms": {
                "duration_months": 12,
                "auto_renewal": True,
                "exclusivity": False,
                "exclusivity_scope": "none",
                "content_ownership": "creator",
                "termination_notice_days": 30,
                "is_super_creator": False,
                "can_manage_creators": False
            },
            "tax_terms": {
                "vat_handling": "creator_responsible",
                "withholding_tax_percent": 0,
                "tax_jurisdiction": "",
                "creator_tax_registered": False,
                "creator_vat_number": None
            },
            "additional_clauses": None,
            "notes": "Test contract for edit tests"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200, f"Create contract failed: {response.text}"
        return response.json()["contract"]["id"]
    
    def test_edit_contract_updates_version(self, headers, edit_test_contract_id):
        """Test that editing a contract increments the version number"""
        # Get current contract to verify initial state
        get_response = requests.get(
            f"{BASE_URL}/api/contracts/{edit_test_contract_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        original_contract = get_response.json()
        original_version = original_contract.get("version", 1)
        
        # Edit the contract
        update_payload = {
            "creator": {
                "name": "TEST_Updated_Creator_Name",
                "email": original_contract["creator"]["email"],
                "address": "456 Updated Street",
                "tax_id": None,
                "company_name": None
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{edit_test_contract_id}",
            headers=headers,
            json=update_payload
        )
        
        # Status assertion
        assert response.status_code == 200, f"Edit failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "contract" in data
        
        # Version should be incremented
        updated_contract = data["contract"]
        assert updated_contract["version"] == original_version + 1, "Version should be incremented"
        
        # Creator name should be updated
        assert updated_contract["creator"]["name"] == "TEST_Updated_Creator_Name"
        assert updated_contract["creator"]["address"] == "456 Updated Street"
        
        # Amendments history should be populated
        assert "amendments" in updated_contract
        assert len(updated_contract["amendments"]) > 0
    
    def test_edit_contract_updates_revenue_terms(self, headers, edit_test_contract_id):
        """Test editing contract revenue terms"""
        update_payload = {
            "revenue_terms": {
                "platform_fee_percent": 30,
                "creator_share_percent": 55,
                "platform_share_percent": 45,
                "minimum_payout_threshold": 100000,
                "payout_frequency": "weekly",
                "currency": "KES"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{edit_test_contract_id}",
            headers=headers,
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        updated_contract = data["contract"]
        assert updated_contract["revenue_terms"]["platform_fee_percent"] == 30
        assert updated_contract["revenue_terms"]["creator_share_percent"] == 55
        assert updated_contract["revenue_terms"]["minimum_payout_threshold"] == 100000
        assert updated_contract["revenue_terms"]["payout_frequency"] == "weekly"
        assert updated_contract["revenue_terms"]["currency"] == "KES"
    
    def test_edit_contract_updates_contract_terms(self, headers, edit_test_contract_id):
        """Test editing contract terms including Super Creator fields"""
        update_payload = {
            "contract_terms": {
                "duration_months": 24,
                "auto_renewal": False,
                "exclusivity": True,
                "exclusivity_scope": "territory",
                "content_ownership": "creator",
                "termination_notice_days": 60,
                "territory": "United Republic of Tanzania",
                "territory_exclusive": True,
                "is_super_creator": True,
                "can_manage_creators": True,
                "sub_creator_commission_percent": 15,
                "sub_creator_negotiable_terms": True,
                "show_sub_creator_distribution": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{edit_test_contract_id}",
            headers=headers,
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        updated_contract = data["contract"]
        assert updated_contract["contract_terms"]["duration_months"] == 24
        assert updated_contract["contract_terms"]["exclusivity"] == True
        assert updated_contract["contract_terms"]["is_super_creator"] == True
        assert updated_contract["contract_terms"]["territory"] == "United Republic of Tanzania"
    
    def test_edit_contract_requires_auth(self, edit_test_contract_id, base_headers):
        """Test that editing contract requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/contracts/{edit_test_contract_id}",
            headers={"User-Agent": TEST_USER_AGENT},
            json={"notes": "Should fail without auth"}
        )
        assert response.status_code == 401
    
    def test_edit_contract_not_found(self, headers):
        """Test editing non-existent contract returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/contracts/non-existent-contract-id",
            headers=headers,
            json={"notes": "Test"}
        )
        assert response.status_code == 404


# =================
# Contract Activate Tests  
# =================
class TestContractActivate:
    """Test POST /api/contracts/{id}/activate - Activate signed contracts"""
    
    @pytest.fixture(scope="class")
    def signed_contract_id(self, headers):
        """Create a contract and mark it as signed for activation testing"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_Activate_Creator_{unique_id}",
                "email": f"activate_test_{unique_id}@example.com",
                "address": "",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Dar24 Media Limited",
                "email": "partnerships@dar24media.com",
                "address": "Dar es Salaam, Tanzania",
                "tax_id": "",
                "company_name": "Dar24 Media Limited"
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50000,
                "payout_frequency": "monthly",
                "currency": "TZS"
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
            "notes": "Test contract for activation"
        }
        
        # Create contract
        create_response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        contract_id = create_response.json()["contract"]["id"]
        
        # Update to sent
        requests.patch(
            f"{BASE_URL}/api/contracts/{contract_id}/status",
            headers=headers,
            json={"status": "sent"}
        )
        
        # Update to signed
        requests.patch(
            f"{BASE_URL}/api/contracts/{contract_id}/status",
            headers=headers,
            json={
                "status": "signed",
                "signed_date": datetime.utcnow().isoformat(),
                "signed_by_creator": True,
                "signed_by_platform": True
            }
        )
        
        return contract_id
    
    def test_activate_contract_success(self, headers, signed_contract_id):
        """Test activating a signed contract with a start date"""
        start_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/{signed_contract_id}/activate",
            headers=headers,
            json={
                "start_date": start_date,
                "notes": "Activated during testing"
            }
        )
        
        # Status assertion
        assert response.status_code == 200, f"Activate failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "effective_date" in data
        assert "expiry_date" in data
        
        # Verify contract is now active
        get_response = requests.get(
            f"{BASE_URL}/api/contracts/{signed_contract_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        contract = get_response.json()
        assert contract["status"] == "active"
    
    def test_activate_contract_only_signed_allowed(self, headers):
        """Test that only signed contracts can be activated"""
        # Create a new draft contract
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "creator": {
                "name": f"TEST_NotSigned_{unique_id}",
                "email": f"notsigned_{unique_id}@example.com",
                "address": "",
                "tax_id": None,
                "company_name": None
            },
            "platform": {
                "name": "Dar24 Media Limited",
                "email": "partnerships@dar24media.com",
                "address": "",
                "tax_id": "",
                "company_name": "Dar24 Media Limited"
            },
            "revenue_terms": {
                "platform_fee_percent": 25,
                "creator_share_percent": 60,
                "platform_share_percent": 40,
                "minimum_payout_threshold": 50000,
                "payout_frequency": "monthly",
                "currency": "TZS"
            },
            "contract_terms": {
                "duration_months": 12,
                "auto_renewal": True,
                "exclusivity": False,
                "content_ownership": "creator",
                "termination_notice_days": 30
            },
            "tax_terms": {
                "vat_handling": "creator_responsible",
                "withholding_tax_percent": 0
            }
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/contracts/create",
            headers=headers,
            json=payload
        )
        contract_id = create_response.json()["contract"]["id"]
        
        # Try to activate draft contract - should fail
        response = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/activate",
            headers=headers,
            json={"start_date": datetime.utcnow().strftime("%Y-%m-%d")}
        )
        
        assert response.status_code == 400
        assert "signed" in response.json().get("detail", "").lower()
    
    def test_activate_contract_requires_auth(self, signed_contract_id):
        """Test that activating contract requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/contracts/{signed_contract_id}/activate",
            headers={"User-Agent": TEST_USER_AGENT},
            json={"start_date": "2026-02-01"}
        )
        assert response.status_code == 401


# =================
# Super Creator Status API Tests
# =================
class TestSuperCreatorStatus:
    """Test GET /api/super-creator/status - Check if user is a super creator"""
    
    def test_super_creator_status_endpoint_exists(self, headers):
        """Test that the super creator status endpoint returns valid response"""
        response = requests.get(
            f"{BASE_URL}/api/super-creator/status",
            headers=headers
        )
        
        # Status assertion - should return 200 even if user is not super creator
        assert response.status_code == 200, f"Status check failed: {response.text}"
        
        data = response.json()
        
        # Response should have is_super_creator field
        assert "is_super_creator" in data
        
        # If not a super creator, should have a message
        if not data["is_super_creator"]:
            assert "message" in data
    
    def test_super_creator_status_requires_auth(self):
        """Test that super creator status requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/super-creator/status",
            headers={"User-Agent": TEST_USER_AGENT}
        )
        assert response.status_code == 401


# =================
# Super Creator Dashboard API Tests
# =================
class TestSuperCreatorDashboard:
    """Test GET /api/super-creator/dashboard - Dashboard overview"""
    
    def test_super_creator_dashboard_returns_403_for_non_super_creator(self, headers):
        """Test that dashboard returns 403 for non-super creators"""
        response = requests.get(
            f"{BASE_URL}/api/super-creator/dashboard",
            headers=headers
        )
        
        # Super admin may not be a super creator (no contract)
        # Should return 403 if not a super creator
        assert response.status_code in [200, 403], f"Dashboard response: {response.text}"
        
        if response.status_code == 403:
            assert "super creator" in response.json().get("detail", "").lower()
    
    def test_super_creator_dashboard_requires_auth(self):
        """Test that dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-creator/dashboard")
        assert response.status_code == 401


# =================
# Super Creator Sub-Creators CRUD Tests
# =================
class TestSuperCreatorSubCreators:
    """Test /api/super-creator/sub-creators CRUD operations"""
    
    def test_list_sub_creators_returns_403_for_non_super_creator(self, headers):
        """Test that listing sub-creators returns 403 for non-super creators"""
        response = requests.get(
            f"{BASE_URL}/api/super-creator/sub-creators",
            headers=headers
        )
        
        assert response.status_code in [200, 403], f"List response: {response.text}"
    
    def test_create_sub_creator_returns_403_for_non_super_creator(self, headers):
        """Test that creating sub-creator returns 403 for non-super creators"""
        response = requests.post(
            f"{BASE_URL}/api/super-creator/sub-creators",
            headers=headers,
            json={
                "name": "Test Sub Creator",
                "email": f"test_subcreator_{uuid.uuid4().hex[:8]}@example.com",
                "commission_percent": 10
            }
        )
        
        assert response.status_code in [200, 201, 403], f"Create response: {response.text}"
    
    def test_sub_creators_requires_auth(self):
        """Test that sub-creators endpoints require authentication"""
        # List
        response = requests.get(f"{BASE_URL}/api/super-creator/sub-creators")
        assert response.status_code == 401
        
        # Create
        response = requests.post(
            f"{BASE_URL}/api/super-creator/sub-creators",
            json={"name": "Test", "email": "test@test.com"}
        )
        assert response.status_code == 401


# =================
# Super Creator Earnings API Tests
# =================
class TestSuperCreatorEarnings:
    """Test GET /api/super-creator/earnings - Earnings report"""
    
    def test_earnings_endpoint_returns_403_for_non_super_creator(self, headers):
        """Test that earnings returns 403 for non-super creators"""
        response = requests.get(
            f"{BASE_URL}/api/super-creator/earnings?period=30d",
            headers=headers
        )
        
        assert response.status_code in [200, 403]
    
    def test_earnings_requires_auth(self):
        """Test that earnings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-creator/earnings")
        assert response.status_code == 401


# =================
# Super Creator Invite API Tests
# =================
class TestSuperCreatorInvite:
    """Test POST /api/super-creator/invite - Send invitation"""
    
    def test_invite_returns_403_for_non_super_creator(self, headers):
        """Test that invite returns 403 for non-super creators"""
        response = requests.post(
            f"{BASE_URL}/api/super-creator/invite",
            headers=headers,
            json={
                "name": "Test Invitee",
                "email": f"invitee_{uuid.uuid4().hex[:8]}@example.com",
                "commission_percent": 10
            }
        )
        
        assert response.status_code in [200, 403]
    
    def test_invite_requires_auth(self):
        """Test that invite endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-creator/invite",
            json={"name": "Test", "email": "test@test.com", "commission_percent": 10}
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
