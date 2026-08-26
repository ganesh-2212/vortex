import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import (
    Merchant,
    Customer,
    RevenueEvent,
    RevenueEventType,
    RecoveryCase,
    RecoveryCaseStatus,
    RiskLevel,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown():
    store.clear()
    yield
    store.clear()

def seed_test_data() -> uuid.UUID:
    m_id = uuid.uuid4()
    c_id = uuid.uuid4()
    
    store.merchants[m_id] = Merchant(id=m_id, name="Test Merchant", retry_cooldown_hours=24, max_retry_attempts=3)
    store.customers[c_id] = Customer(id=c_id, merchant_id=m_id, name="Test Customer")
    
    return m_id, c_id

def test_empty_dataset():
    response = client.get("/api/v1/strategy-performance")
    assert response.status_code == 200
    data = response.json()
    assert data["total_cases_analyzed"] == 0
    assert data["overall_recovery_rate"] == 0.0

def test_single_strategy_no_successful_outcomes():
    m_id, c_id = seed_test_data()
    e_id = uuid.uuid4()
    case_id = uuid.uuid4()
    
    store.revenue_events[e_id] = RevenueEvent(
        id=e_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("5000.00"), status="FAILED", occurred_at=datetime.now(timezone.utc)
    )
    
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=e_id,
        amount_at_risk=Decimal("5000.00"), risk_level=RiskLevel.MEDIUM, status=RecoveryCaseStatus.OPEN
    )
    
    a_id = uuid.uuid4()
    store.recovery_actions[a_id] = RecoveryAction(
        id=a_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.FAILED, attempt_number=1, created_at=datetime.now(timezone.utc)
    )
    
    response = client.get("/api/v1/strategy-performance")
    assert response.status_code == 200
    data = response.json()
    
    stats = {s["strategy_type"]: s for s in data["strategy_statistics"]}
    imm = stats["IMMEDIATE_RETRY"]
    assert imm["total_attempts"] == 1
    assert imm["successful_attempts"] == 0
    assert imm["failed_attempts"] == 1
    assert imm["success_rate"] == 0.0
    assert imm["total_cost"] == "5.00"
    assert imm["net_recovery"] == "-5.00"

def test_multiple_strategies_with_successes():
    m_id, c_id = seed_test_data()
    
    # Create 5 successes for IMMEDIATE_RETRY to pass sample size minimum
    for i in range(5):
        e_id = uuid.uuid4()
        case_id = uuid.uuid4()
        
        store.revenue_events[e_id] = RevenueEvent(
            id=e_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.PAYMENT_FAILED,
            amount=Decimal("1000.00"), status="FAILED", occurred_at=datetime.now(timezone.utc)
        )
        
        store.recovery_cases[case_id] = RecoveryCase(
            id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=e_id,
            amount_at_risk=Decimal("1000.00"), risk_level=RiskLevel.MEDIUM, status=RecoveryCaseStatus.RECOVERED
        )
        
        a_id = uuid.uuid4()
        store.recovery_actions[a_id] = RecoveryAction(
            id=a_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED, attempt_number=1, created_at=datetime.now(timezone.utc)
        )
        
    response = client.get("/api/v1/strategy-performance")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_cases_analyzed"] == 5
    assert data["total_revenue_at_risk"] == "5000.00"
    assert data["total_revenue_recovered"] == "5000.00"
    assert data["overall_recovery_rate"] == 100.0
    
    assert data["best_strategy"] == "IMMEDIATE_RETRY"
    
    stats = {s["strategy_type"]: s for s in data["strategy_statistics"]}
    imm = stats["IMMEDIATE_RETRY"]
    assert imm["success_rate"] == 100.0
    assert imm["total_cost"] == "25.00"
    assert imm["net_recovery"] == "4975.00"
    assert imm["average_attempts_to_recovery"] == 1.0

def test_insufficient_sample_size_fallback():
    m_id, c_id = seed_test_data()
    e_id = uuid.uuid4()
    case_id = uuid.uuid4()
    
    store.revenue_events[e_id] = RevenueEvent(
        id=e_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("5000.00"), status="FAILED", occurred_at=datetime.now(timezone.utc)
    )
    
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=e_id,
        amount_at_risk=Decimal("5000.00"), risk_level=RiskLevel.MEDIUM, status=RecoveryCaseStatus.OPEN
    )
    
    a_id = uuid.uuid4()
    store.recovery_actions[a_id] = RecoveryAction(
        id=a_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.FAILED, attempt_number=1, created_at=datetime.now(timezone.utc)
    )
    
    response = client.get(f"/api/v1/strategy-performance/recommendation/{case_id}")
    assert response.status_code == 200
    data = response.json()
    
    # Should fallback because N=1 < 5
    assert data["historical_best_strategy"] == "N/A"
    assert data["fallback_reason"] == "INSUFFICIENT_SAMPLE_SIZE"

def test_by_event_type():
    response = client.get("/api/v1/strategy-performance/by-event-type")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_single_strategy():
    response = client.get("/api/v1/strategy-performance/IMMEDIATE_RETRY")
    assert response.status_code == 200
    data = response.json()
    assert data["strategy_type"] == "IMMEDIATE_RETRY"

def test_single_strategy_not_found():
    response = client.get("/api/v1/strategy-performance/UNKNOWN_STRAT")
    assert response.status_code == 404
