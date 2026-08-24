import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import (
    Merchant,
    Customer,
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionStatus,
    RecoveryActionType,
    RiskLevel
)

client = TestClient(app)

MERCHANT_ID = uuid.UUID("99999999-9999-9999-9999-999999999999")
CUSTOMER_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

@pytest.fixture
def seeded_db():
    store.merchants.clear()
    store.customers.clear()
    store.revenue_events.clear()
    store.recovery_cases.clear()
    store.recovery_actions.clear()
    store.audit_logs.clear()
    
    # Seed merchant and customer
    store.merchants[MERCHANT_ID] = Merchant(
        id=MERCHANT_ID,
        name="Recommendation Merchant",
        email="rec@merchant.com",
        created_at=datetime.now(timezone.utc)
    )
    store.customers[CUSTOMER_ID] = Customer(
        id=CUSTOMER_ID,
        merchant_id=MERCHANT_ID,
        name="Recommendation Customer",
        email="rec@customer.com",
        phone="+919999999902",
        created_at=datetime.now(timezone.utc)
    )
    
    yield store

def test_high_risk_fresh_case_recommends_retry(seeded_db):
    # 1. High-risk fresh case recommends retry when guardrails allow
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    res = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation")
    assert res.status_code == 200
    data = res.json()
    
    assert data["recommendation"]["recommended_action"] == "RETRY_PAYMENT"
    # Fresh high risk retry should have strong confidence (e.g. 90 + 10 risk + 5 age + 5 no-retry = 100 max)
    assert data["recommendation"]["confidence"] == 100
    assert data["recommendation"]["guardrail_status"] == "ALLOWED"
    
    reasons = [r["message"] for r in data["recommendation"]["reasons"]]
    assert any("active recovery opportunity" in r for r in reasons)
    assert any("fresh" in r for r in reasons)

def test_critical_case_recommends_escalation(seeded_db):
    # 2. Critical case recommends escalation
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("45000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    res = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation")
    assert res.status_code == 200
    assert res.json()["recommendation"]["recommended_action"] == "ESCALATE_TO_HUMAN"
    
    reasons = [r["message"] for r in res.json()["recommendation"]["reasons"]]
    assert any("Critical risk" in r for r in reasons)

def test_exhausted_retry_opportunity_recommends_stop(seeded_db):
    # 3. Exhausted retry opportunity recommends stop
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("12000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # Simulate 3 executed retries
    for i in range(3):
        act = RecoveryAction(
            id=uuid.uuid4(),
            recovery_case_id=case.id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED,
            attempt_number=i + 1,
            created_at=datetime.now(timezone.utc) - timedelta(hours=4 - i)
        )
        store.recovery_actions[act.id] = act
        
    res = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation")
    assert res.status_code == 200
    assert res.json()["recommendation"]["recommended_action"] == "STOP_RECOVERY"
    
    reasons = [r["message"] for r in res.json()["recommendation"]["reasons"]]
    assert any("fully exhausted" in r for r in reasons)

def test_guardrail_blocked_retry_recommends_escalation(seeded_db):
    # 4. Guardrail-blocked retry never produces RETRY_PAYMENT
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("12000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # Simulate 1 executed retry 2 hours ago (triggers cooldown)
    act = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED,
        attempt_number=1,
        created_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    store.recovery_actions[act.id] = act
    
    res = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation")
    assert res.status_code == 200
    data = res.json()
    assert data["recommendation"]["recommended_action"] == "ESCALATE_TO_HUMAN"
    assert data["recommendation"]["guardrail_status"] == "BLOCKED"
    
    reasons = [r["message"] for r in data["recommendation"]["reasons"]]
    assert any("cooldown" in r.lower() for r in reasons)

def test_non_active_cases_receive_no_recommendation(seeded_db):
    # 5. Recovered and 6. Stopped cases receive no active recommendation (returns HTTP 400)
    case_recovered = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.RECOVERED,
        created_at=datetime.now(timezone.utc)
    )
    case_stopped = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("2000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.STOPPED,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case_recovered.id] = case_recovered
    store.recovery_cases[case_stopped.id] = case_stopped
    
    res1 = client.get(f"/api/v1/recovery-cases/{case_recovered.id}/recommendation")
    assert res1.status_code == 400
    assert "Recommendations are only available for active cases" in res1.json()["detail"]
    
    res2 = client.get(f"/api/v1/recovery-cases/{case_stopped.id}/recommendation")
    assert res2.status_code == 400
    assert "Recommendations are only available for active cases" in res2.json()["detail"]

def test_recommendation_is_deterministic_and_bounded(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("25000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc) - timedelta(hours=36)
    )
    store.recovery_cases[case.id] = case
    
    # 7. Recommendation is deterministic
    res1 = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation").json()
    res2 = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation").json()
    
    # Remove dynamic timestamps for strict comparison
    res1["recommendation"].pop("generated_at", None)
    res2["recommendation"].pop("generated_at", None)
    res1.pop("generated_at", None)
    res2.pop("generated_at", None)
    assert res1 == res2
    
    # 8. Confidence is always between 0 and 100
    conf = res1["recommendation"]["confidence"]
    assert 0 <= conf <= 100

def test_recommendations_sorted_by_priority(seeded_db):
    # Case 1: Low Priority (Low Risk, small amount)
    case_low = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("100.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    # Case 2: High Priority (High Risk, large amount)
    case_high = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("49000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case_low.id] = case_low
    store.recovery_cases[case_high.id] = case_high
    
    # 9. Recommendations are sorted by F03 priority score
    res = client.get("/api/v1/recommendations")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    # case_high should have a higher score and be first
    assert data[0]["case_id"] == str(case_high.id)
    assert data[1]["case_id"] == str(case_low.id)
    assert data[0]["recommendation"]["priority_score"] > data[1]["recommendation"]["priority_score"]

def test_recommendation_statistics(seeded_db):
    # Case 1: Retry (High Risk fresh case)
    case1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    # Case 2: Escalate (Critical Risk)
    case2 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("20000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case1.id] = case1
    store.recovery_cases[case2.id] = case2
    
    # 13. Recommendation statistics work
    res = client.get("/api/v1/recommendation-statistics")
    assert res.status_code == 200
    stats = res.json()
    assert stats["cases_evaluated"] == 2
    assert stats["retry_recommended"] == 1
    assert stats["escalation_recommended"] == 1
    assert stats["stop_recommended"] == 0
    assert stats["blocked_retry_count"] == 0 # no actions, so not blocked by cooldown/limits

def test_recommendation_safety(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # 14. Recommendation never executes an action automatically
    res = client.get(f"/api/v1/recovery-cases/{case.id}/recommendation")
    assert res.status_code == 200
    
    # Verify no action is created in the database
    actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
    assert len(actions) == 0
