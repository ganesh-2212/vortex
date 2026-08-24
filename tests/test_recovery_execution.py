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
    RevenueEvent,
    RevenueEventType,
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionStatus,
    RecoveryActionType,
    RiskLevel
)

client = TestClient(app)

MERCHANT_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
CUSTOMER_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")

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
        name="Execution Merchant",
        email="exec@merchant.com",
        created_at=datetime.now(timezone.utc)
    )
    store.customers[CUSTOMER_ID] = Customer(
        id=CUSTOMER_ID,
        merchant_id=MERCHANT_ID,
        name="Execution Customer",
        email="exec@customer.com",
        phone="+919999999900",
        created_at=datetime.now(timezone.utc)
    )
    
    yield store

def test_successful_retry_execution(seeded_db):
    # Create an open case
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
    
    # Propose a retry action
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions",
        json={"action_type": "RETRY_PAYMENT", "attempt_number": 1}
    )
    assert res.status_code == 200
    action_list = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
    assert len(action_list) == 1
    action = action_list[0]
    assert action.status == RecoveryActionStatus.ALLOWED
    
    # Execute (should default to success)
    res_exec = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res_exec.status_code == 200
    data = res_exec.json()
    assert data["status"] == "EXECUTED"
    assert data["updated_case_status"] == "RECOVERED"
    assert data["result"]["success"] is True
    assert "transaction_id" in data["result"]
    
    # Verify DB states
    assert store.recovery_cases[case.id].status == RecoveryCaseStatus.RECOVERED
    assert store.recovery_actions[action.id].status == RecoveryActionStatus.EXECUTED
    
    # Verify audits
    audits = [log.action for log in store.audit_logs if log.recovery_case_id == case.id]
    assert "ACTION_EXECUTION_STARTED" in audits
    assert "ACTION_EXECUTED" in audits
    assert "CASE_RECOVERED" in audits
    
    # Verify success RevenueEvent created
    success_events = [
        e for e in store.revenue_events.values()
        if e.customer_id == CUSTOMER_ID
        and e.event_type == RevenueEventType.PAYMENT_RETRY
        and e.status == "SUCCESS"
    ]
    assert len(success_events) == 1

def test_failed_retry_execution(seeded_db):
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
    
    # Propose
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions",
        json={"action_type": "RETRY_PAYMENT", "attempt_number": 1}
    )
    action = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id][0]
    
    # Execute with forced failure payload
    res_exec = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={"payload": {"simulate_failure": True, "error_code": "INSUFFICIENT_FUNDS"}}
    )
    assert res_exec.status_code == 200
    data = res_exec.json()
    assert data["status"] == "FAILED"
    assert data["updated_case_status"] == "IN_PROGRESS"
    assert data["result"]["success"] is False
    assert data["result"]["error_code"] == "INSUFFICIENT_FUNDS"
    
    # Verify failed RevenueEvent created
    failed_events = [
        e for e in store.revenue_events.values()
        if e.customer_id == CUSTOMER_ID
        and e.event_type == RevenueEventType.PAYMENT_RETRY
        and e.status == "FAILED"
    ]
    assert len(failed_events) == 1
    
    # Verify audits
    audits = [log.action for log in store.audit_logs if log.recovery_case_id == case.id]
    assert "ACTION_EXECUTION_FAILED" in audits
    assert "CASE_RECOVERED" not in audits

def test_guardrail_rejection_attempts_limit(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # Create 3 prior executed retry actions
    for i in range(3):
        act = RecoveryAction(
            id=uuid.uuid4(),
            recovery_case_id=case.id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED,
            attempt_number=i + 1,
            created_at=datetime.now(timezone.utc) - timedelta(days=4 - i)
        )
        store.recovery_actions[act.id] = act
        
    # Now propose retry number 4 (which should be blocked by propose, but let's force an ALLOWED action state to verify execute recheck)
    allowed_action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=4,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_actions[allowed_action.id] = allowed_action
    
    # Execute (recheck should block it)
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{allowed_action.id}/execute",
        json={}
    )
    assert res.status_code == 400
    assert "Guardrail check failed" in res.json()["detail"]
    assert store.recovery_actions[allowed_action.id].status == RecoveryActionStatus.BLOCKED

def test_guardrail_rejection_cooldown(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    # 1 retry executed 2 hours ago
    act = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED,
        attempt_number=1,
        created_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    store.recovery_actions[act.id] = act
    
    # Propose another allowed action (forced to verify execute recheck)
    allowed_action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=2,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_actions[allowed_action.id] = allowed_action
    
    # Execute (should trigger cooldown rejection)
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{allowed_action.id}/execute",
        json={}
    )
    assert res.status_code == 400
    assert "Retry blocked: Cooldown active" in res.json()["detail"]
    assert store.recovery_actions[allowed_action.id].status == RecoveryActionStatus.BLOCKED

def test_stop_recovery_transitions_to_stopped(seeded_db):
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
    
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions",
        json={"action_type": "STOP_RECOVERY"}
    )
    action = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id][0]
    
    res_exec = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res_exec.status_code == 200
    data = res_exec.json()
    assert data["status"] == "EXECUTED"
    assert data["updated_case_status"] == "STOPPED"
    assert store.recovery_cases[case.id].status == RecoveryCaseStatus.STOPPED
    
    audits = [log.action for log in store.audit_logs if log.recovery_case_id == case.id]
    assert "CASE_STOPPED" in audits

def test_escalate_to_human_transitions_to_escalated(seeded_db):
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
    
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions",
        json={"action_type": "ESCALATE_TO_HUMAN"}
    )
    action = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id][0]
    
    res_exec = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res_exec.status_code == 200
    data = res_exec.json()
    assert data["status"] == "EXECUTED"
    assert data["updated_case_status"] == "ESCALATED"
    assert store.recovery_cases[case.id].status == RecoveryCaseStatus.ESCALATED
    
    audits = [log.action for log in store.audit_logs if log.recovery_case_id == case.id]
    assert "CASE_ESCALATED" in audits

def test_recovered_case_cannot_execute_retry(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.RECOVERED, # already recovered
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=1,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_actions[action.id] = action
    
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res.status_code == 400
    assert "Guardrail check failed" in res.json()["detail"]
    assert "already RECOVERED" in res.json()["detail"]

def test_stopped_case_cannot_execute_retry(seeded_db):
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.STOPPED, # already stopped
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_cases[case.id] = case
    
    action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=1,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_actions[action.id] = action
    
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res.status_code == 400
    assert "Guardrail check failed" in res.json()["detail"]
    assert "already STOPPED" in res.json()["detail"]

def test_duplicate_action_execution_prevented(seeded_db):
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
    
    action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED, # already executed!
        attempt_number=1,
        created_at=datetime.now(timezone.utc)
    )
    store.recovery_actions[action.id] = action
    
    res = client.post(
        f"/api/v1/recovery-cases/{case.id}/actions/{action.id}/execute",
        json={}
    )
    assert res.status_code == 400
    assert "Action cannot be executed. Current status: EXECUTED" in res.json()["detail"]
