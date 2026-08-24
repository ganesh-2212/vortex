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

MERCHANT_ID = uuid.UUID("77777777-7777-7777-7777-777777777777")
CUSTOMER_ID = uuid.UUID("88888888-8888-8888-8888-888888888888")

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
        name="Lifecycle Merchant",
        email="life@merchant.com",
        created_at=datetime.now(timezone.utc)
    )
    store.customers[CUSTOMER_ID] = Customer(
        id=CUSTOMER_ID,
        merchant_id=MERCHANT_ID,
        name="Lifecycle Customer",
        email="life@customer.com",
        phone="+919999999901",
        created_at=datetime.now(timezone.utc)
    )
    
    yield store

def test_new_case_lifecycle(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # 1. New case lifecycle
    res = client.get(f"/api/v1/recovery-cases/{case.id}/lifecycle")
    assert res.status_code == 200
    data = res.json()
    assert data["case_id"] == str(case.id)
    assert data["current_status"] == "OPEN"
    assert data["total_attempts"] == 0
    assert data["successful_attempts"] == 0
    assert data["failed_attempts"] == 0
    assert float(data["actual_recovered_amount"]) == 0.0
    assert data["first_attempt_timestamp"] is None
    assert data["last_attempt_timestamp"] is None
    assert data["recovery_duration_seconds"] is None
    assert data["final_outcome"] is None

def test_failed_retry_outcomes(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("6000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # Propose action
    res_prop = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions",
        json={"action_type": "RETRY_PAYMENT", "attempt_number": 1}
    )
    action = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id][0]
    
    # Execute (failed retry)
    res_exec = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={"payload": {"simulate_failure": True, "error_code": "INSUFFICIENT_FUNDS"}}
    )
    assert res_exec.status_code == 200
    
    # 2. Failed retry appears in attempt history
    res_attempts = client.get(f"/api/v1/recovery-cases/{case.id}/attempts")
    assert res_attempts.status_code == 200
    attempts = res_attempts.json()
    assert len(attempts) == 1
    assert attempts[0]["action_id"] == str(action.id)
    assert attempts[0]["status"] == "FAILED"
    assert float(attempts[0]["amount_attempted"]) == 6000.0
    assert float(attempts[0]["amount_recovered"]) == 0.0
    assert attempts[0]["failure_reason"] == "INSUFFICIENT_FUNDS"
    
    # 4. Failed retry contributes ₹0 to actual recovered revenue
    res_lifecycle = client.get(f"/api/v1/recovery-cases/{case.id}/lifecycle")
    data = res_lifecycle.json()
    assert data["total_attempts"] == 1
    assert data["failed_attempts"] == 1
    assert float(data["actual_recovered_amount"]) == 0.0
    assert data["first_attempt_timestamp"] is not None
    
    # 9. Unresolved case has null recovery duration
    assert data["recovery_duration_seconds"] is None

def test_successful_retry_outcome_and_duration(seeded_db):
    case_created = datetime.now(timezone.utc) - timedelta(minutes=15)
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("12000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=case_created
    )
    store.recovery_cases[case.id] = case
    
    # Propose
    client.post(
        f"/api/v1/recovery-cases/{case.id}/actions",
        json={"action_type": "RETRY_PAYMENT", "attempt_number": 1}
    )
    action = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id][0]
    
    # Execute success
    res_exec = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res_exec.status_code == 200
    
    # 3. Successful retry records actual recovered amount
    res_outcome = client.get(f"/api/v1/recovery-cases/{case.id}/outcome")
    assert res_outcome.status_code == 200
    outcome = res_outcome.json()
    assert outcome["status"] == "RECOVERED"
    assert outcome["outcome"] == "SUCCESS"
    assert float(outcome["actual_recovered_amount"]) == 12000.0
    assert outcome["provider_transaction_id"] is not None
    
    # 8. Recovered case exposes recovery duration
    res_lifecycle = client.get(f"/api/v1/recovery-cases/{case.id}/lifecycle")
    lifecycle = res_lifecycle.json()
    assert lifecycle["recovery_duration_seconds"] is not None
    assert lifecycle["recovery_duration_seconds"] >= 900.0 # ~15 mins

def test_chronological_attempts(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # Create attempts manually to specify different created_at dates
    t1 = datetime.now(timezone.utc) - timedelta(hours=2)
    t2 = datetime.now(timezone.utc) - timedelta(hours=1)
    
    act1 = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.FAILED,
        attempt_number=1,
        created_at=t2 # created later but attempt #1
    )
    act2 = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED,
        attempt_number=2,
        created_at=t1 # created earlier but attempt #2
    )
    store.recovery_actions[act1.id] = act1
    store.recovery_actions[act2.id] = act2
    
    # 10. Attempt history is chronological by action creation date
    res = client.get(f"/api/v1/recovery-cases/{case.id}/attempts")
    attempts = res.json()
    assert len(attempts) == 2
    # act2 (t1) should be first, act1 (t2) second
    assert attempts[0]["action_id"] == str(act2.id)
    assert attempts[1]["action_id"] == str(act1.id)

def test_stop_and_escalated_outcomes(seeded_db):
    case1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("10000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    case2 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("20000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case1.id] = case1
    store.recovery_cases[case2.id] = case2
    
    # Propose and execute STOP_RECOVERY for case1
    client.post(f"/api/v1/recovery-cases/{case1.id}/actions", json={"action_type": "STOP_RECOVERY"})
    act1 = [a for a in store.recovery_actions.values() if a.recovery_case_id == case1.id][0]
    client.post(f"/api/v1/recovery-cases/{case1.id}/actions/{act1.id}/execute", json={})
    
    # 6. STOP_RECOVERY transitions to STOPPED and recovered amount is ₹0
    res1 = client.get(f"/api/v1/recovery-cases/{case1.id}/outcome")
    assert res1.json()["status"] == "STOPPED"
    assert res1.json()["outcome"] == "STOPPED"
    assert float(res1.json()["actual_recovered_amount"]) == 0.0
    
    # Propose and execute ESCALATE_TO_HUMAN for case2
    client.post(f"/api/v1/recovery-cases/{case2.id}/actions", json={"action_type": "ESCALATE_TO_HUMAN"})
    act2 = [a for a in store.recovery_actions.values() if a.recovery_case_id == case2.id][0]
    client.post(f"/api/v1/recovery-cases/{case2.id}/actions/{act2.id}/execute", json={})
    
    # 7. ESCALATE_TO_HUMAN transitions to ESCALATED and recovered amount is ₹0
    res2 = client.get(f"/api/v1/recovery-cases/{case2.id}/outcome")
    assert res2.json()["status"] == "ESCALATED"
    assert res2.json()["outcome"] == "ESCALATED"
    assert float(res2.json()["actual_recovered_amount"]) == 0.0

def test_duplicate_execution_double_counting(seeded_db):
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
    
    client.post(f"/api/v1/recovery-cases/{case.id}/actions", json={"action_type": "RETRY_PAYMENT", "attempt_number": 1})
    action = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id][0]
    
    # First execution succeeds
    res1 = client.post(f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute", json={})
    assert res1.status_code == 200
    
    # 5. Duplicate execution cannot double-count recovered revenue (rejected with HTTP 400)
    res2 = client.post(f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute", json={})
    assert res2.status_code == 400
    
    # Verify recovered amount remains exactly case.amount_at_risk
    assert float(store.recovery_cases[case.id].recovered_amount) == 15000.0

def test_recovery_statistics_aggregation(seeded_db):
    # Case 1: Recovered (₹10,000)
    case1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("10000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case1.id] = case1
    client.post(f"/api/v1/recovery-cases/{case1.id}/actions", json={"action_type": "RETRY_PAYMENT", "attempt_number": 1})
    act1 = [a for a in store.recovery_actions.values() if a.recovery_case_id == case1.id][0]
    client.post(f"/api/v1/recovery-cases/{case1.id}/actions/{act1.id}/execute", json={})
    
    # Case 2: Failed retry (₹5,000) - still open
    case2 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case2.id] = case2
    client.post(f"/api/v1/recovery-cases/{case2.id}/actions", json={"action_type": "RETRY_PAYMENT", "attempt_number": 1})
    act2 = [a for a in store.recovery_actions.values() if a.recovery_case_id == case2.id][0]
    client.post(f"/api/v1/recovery-cases/{case2.id}/actions/{act2.id}/execute", json={"payload": {"simulate_failure": True}})
    
    # Case 3: Stopped (₹8,000)
    case3 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("8000.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case3.id] = case3
    client.post(f"/api/v1/recovery-cases/{case3.id}/actions", json={"action_type": "STOP_RECOVERY"})
    act3 = [a for a in store.recovery_actions.values() if a.recovery_case_id == case3.id][0]
    client.post(f"/api/v1/recovery-cases/{case3.id}/actions/{act3.id}/execute", json={})
    
    # 11. Recovery statistics aggregate correctly
    res_stats = client.get("/api/v1/recovery-statistics")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    
    assert stats["total_cases"] == 3
    assert stats["open_cases"] == 1
    assert stats["recovered_cases"] == 1
    assert stats["stopped_cases"] == 1
    assert float(stats["total_amount_at_risk"]) == 23000.0
    assert float(stats["actual_recovered_revenue"]) == 10000.0
    assert pytest.approx(stats["recovery_rate"]) == 33.33333333
    assert stats["successful_retry_count"] == 1
    assert stats["failed_retry_count"] == 1
    
    # 12. Heuristic estimate (estimated_recoverable) remains completely separate from actual recovered
    res_summary = client.get("/api/v1/intelligence/summary")
    summary = res_summary.json()
    assert float(summary["estimated_recoverable"]) > 0.0
    assert float(summary["estimated_recoverable"]) != float(stats["actual_recovered_revenue"])
