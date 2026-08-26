import os
import sys
import uuid
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.main import app
from app.store import store
from app.models.domain import (
    Merchant, Customer, RecoveryCase, RecoveryCaseStatus,
    RecoveryAction, RecoveryActionType, RecoveryActionStatus, RiskLevel
)
from app.services.strategy_optimizer import (
    optimize_strategy,
    optimize_all_strategies,
    get_strategy_statistics,
)

client = TestClient(app)
MERCHANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
CUSTOMER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


@pytest.fixture
def clean_store():
    store.clear()
    store.merchants[MERCHANT_ID] = Merchant(
        id=MERCHANT_ID,
        name="Test Merchant",
        email="test@merchant.com",
        recovery_enabled=True,
        max_retry_attempts=3,
        retry_cooldown_hours=24,
        supported_recovery_actions=["RETRY_PAYMENT", "ESCALATE_TO_HUMAN", "STOP_RECOVERY", "OFFER_ALTERNATIVE_METHOD"]
    )
    store.customers[CUSTOMER_ID] = Customer(
        id=CUSTOMER_ID,
        merchant_id=MERCHANT_ID,
        name="Alice Smith",
        email="alice@smith.com"
    )
    yield store


def test_fresh_retryable_case(clean_store):
    """Test strategy optimization for a fresh retryable case."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    current_time = datetime.now(timezone.utc)
    res = optimize_strategy(store, case, current_time)

    assert res.case_id == case.id
    assert res.recommended_strategy in ("IMMEDIATE_RETRY", "DELAYED_RETRY")
    assert 0 <= res.recovery_probability <= 100
    assert res.expected_recovery_amount == case.amount_at_risk * Decimal(str(res.recovery_probability)) / Decimal("100")
    assert res.expected_net_recovery == res.expected_recovery_amount - Decimal("5.00")


def test_risk_level_strategy_comparison(clean_store):
    """Test that critical risk vs medium risk adjust probabilities appropriately."""
    case_medium = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    case_critical = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case_medium.id] = case_medium
    store.recovery_cases[case_critical.id] = case_critical

    current_time = datetime.now(timezone.utc)

    res_med = optimize_strategy(store, case_medium, current_time)
    res_crit = optimize_strategy(store, case_critical, current_time)

    # For critical cases, human escalation yields higher expected net recovery than immediate retry penalty
    assert res_crit.recommended_strategy == "ESCALATE_TO_HUMAN"
    assert res_med.recommended_strategy == "IMMEDIATE_RETRY"


def test_exhausted_retries_recommends_no_intervention(clean_store):
    """Test that cases with exhausted retry attempts receive STOP/NO_INTERVENTION."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("150.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    # Add 3 attempts (max retry limit is 3)
    for i in range(3):
        action = RecoveryAction(
            id=uuid.uuid4(),
            recovery_case_id=case.id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED,
            attempt_number=i + 1
        )
        store.recovery_actions[action.id] = action

    current_time = datetime.now(timezone.utc)
    res = optimize_strategy(store, case, current_time)

    # Retry options should be blocked, NO_INTERVENTION or ESCALATE_TO_HUMAN is recommended
    assert res.recommended_strategy in ("NO_INTERVENTION", "ESCALATE_TO_HUMAN", "ALTERNATE_PAYMENT")
    retry_opt = [s for s in res.strategies if s.strategy_name == "IMMEDIATE_RETRY"][0]
    assert retry_opt.guardrail_status == "BLOCKED"


def test_active_cooldown_recommends_delayed_retry(clean_store):
    """Test that active cooldown blocks immediate retry but allows delayed retry."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("2000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    current_time = datetime.now(timezone.utc)

    # Create a recent retry attempt (1 hour ago)
    action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED,
        attempt_number=1,
        created_at=current_time - timedelta(hours=1)
    )
    store.recovery_actions[action.id] = action

    res = optimize_strategy(store, case, current_time)

    # Immediate retry should be blocked by cooldown, but delayed retry is allowed
    imm_opt = [s for s in res.strategies if s.strategy_name == "IMMEDIATE_RETRY"][0]
    del_opt = [s for s in res.strategies if s.strategy_name == "DELAYED_RETRY"][0]

    assert imm_opt.guardrail_status == "BLOCKED"
    assert del_opt.guardrail_status == "ALLOWED"
    assert res.recommended_strategy == "DELAYED_RETRY"


def test_resolved_terminal_cases_rejected(clean_store):
    """Test that terminal cases raise ValueError."""
    case_recovered = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("500.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.RECOVERED
    )
    case_stopped = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("500.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.STOPPED
    )
    store.recovery_cases[case_recovered.id] = case_recovered
    store.recovery_cases[case_stopped.id] = case_stopped

    current_time = datetime.now(timezone.utc)
    with pytest.raises(ValueError):
        optimize_strategy(store, case_recovered, current_time)
    with pytest.raises(ValueError):
        optimize_strategy(store, case_stopped, current_time)


def test_probability_confidence_clamping(clean_store):
    """Verify probability and confidence ratings stay between 0 and 100."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("500.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    # Add 2 attempts to lower retry probability significantly
    for i in range(2):
        action = RecoveryAction(
            id=uuid.uuid4(),
            recovery_case_id=case.id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED,
            attempt_number=i + 1
        )
        store.recovery_actions[action.id] = action

    current_time = datetime.now(timezone.utc)
    res = optimize_strategy(store, case, current_time)

    for strat in res.strategies:
        assert 0 <= strat.recovery_probability <= 100
        assert 0 <= strat.confidence <= 100


def test_strategy_statistics_aggregation(clean_store):
    """Test strategy statistics collection endpoint logic."""
    case1 = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    case2 = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("2000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case1.id] = case1
    store.recovery_cases[case2.id] = case2

    current_time = datetime.now(timezone.utc)
    stats = get_strategy_statistics(store, current_time)

    assert stats.cases_optimized == 2
    assert stats.total_expected_recovery > 0
    assert stats.average_confidence > 0


def test_api_endpoints_integration(clean_store):
    """Test strategy optimization REST API endpoints."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("3000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    # API: GET /api/v1/recovery-cases/{case_id}/strategy
    response = client.get(f"/api/v1/recovery-cases/{case.id}/strategy")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == str(case.id)
    assert data["recommended_strategy"] in ("IMMEDIATE_RETRY", "DELAYED_RETRY", "ESCALATE_TO_HUMAN")

    # API: GET /api/v1/strategy-optimization
    response = client.get("/api/v1/strategy-optimization")
    assert response.status_code == 200
    assert len(response.json()) >= 1

    # API: GET /api/v1/strategy-statistics
    response = client.get("/api/v1/strategy-statistics")
    assert response.status_code == 200
    assert response.json()["cases_optimized"] >= 1
