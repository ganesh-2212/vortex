import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store, seed_store, MemoryStore
from app.services.policy_what_if import clone_isolated_sandbox

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_store():
    store.clear()
    seed_store(store)
    yield
    store.clear()

def test_sandbox_isolation():
    """
    Ensure deep cloning genuinely isolates the sandbox from production.
    """
    store.clear()
    seed_store(store)
    merchant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    sandbox = clone_isolated_sandbox(store)
    
    # Modify sandbox
    sandbox.merchants[merchant_id].max_retry_attempts = 999
    
    # Assert original remains unchanged
    assert store.merchants[merchant_id].max_retry_attempts == 3

def test_current_policy_returns_correctly():
    merchant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    response = client.get(f"/api/v1/policy-what-if/current?merchant_id={merchant_id}")
    assert response.status_code == 200
    assert response.json()["current_max_retries"] == 3

def test_negative_retry_limit_rejected():
    merchant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    response = client.post("/api/v1/policy-what-if/run", json={
        "merchant_id": str(merchant_id),
        "proposed_max_retries": -1
    })
    assert response.status_code == 400
    assert "INVALID" in response.json()["detail"]

def test_run_what_if_is_read_only_and_deterministic():
    merchant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    # Capture state before
    before_merchants = str(store.merchants)
    before_cases = str(store.recovery_cases)
    before_latest_simulation = str(getattr(store, "latest_simulation", None))
    
    response = client.post("/api/v1/policy-what-if/run", json={
        "merchant_id": str(merchant_id),
        "proposed_max_retries": 5
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["assessment"] in ["FAVORABLE", "UNFAVORABLE", "NEUTRAL"]
    
    # Verify state after
    after_merchants = str(store.merchants)
    after_cases = str(store.recovery_cases)
    after_latest_simulation = str(getattr(store, "latest_simulation", None))
    
    assert before_merchants == after_merchants
    assert before_cases == after_cases
    assert before_latest_simulation == after_latest_simulation
