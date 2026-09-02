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
from app.services.recovery_simulator import run_simulation

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
    # Clear simulations dynamic fields too
    store.simulations = {}
    store.latest_simulation = None
    yield store


def test_empty_batch_fallback_to_all_active(clean_store):
    """Test that an empty batch falls back to all active open cases."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1500.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    res = run_simulation(store_inst=store, case_ids=[])
    assert res.number_of_simulated_cases == 1
    assert res.cases[0].case_id == case.id


def test_single_case_simulation_metrics(clean_store):
    """Verify metrics calculation for a single case simulation."""
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

    res = run_simulation(store_inst=store, case_ids=[case.id])
    assert res.total_revenue_at_risk == Decimal("1000.00")
    assert res.no_intervention_recovered_amount == Decimal("0.00")
    assert res.basic_retry_recovered_amount == Decimal("500.00")  # prob 50%
    assert res.sentinel_recovered_amount == Decimal("700.00")  # F11 probability is 70%

    assert res.incremental_recovery_vs_no_intervention == Decimal("700.00")
    assert res.incremental_recovery_vs_basic_retry == Decimal("200.00")
    assert res.additional_recovery_percentage == 40.0  # (200/500)*100
    assert res.total_intervention_cost == Decimal("5.00")
    assert res.sentinel_net_recovery == Decimal("695.00")
    assert res.number_of_simulated_cases == 1


def test_deterministic_repeated_simulation(clean_store):
    """Ensure identical inputs always produce identical simulation outcomes."""
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

    res1 = run_simulation(store_inst=store, case_ids=[case.id])
    res2 = run_simulation(store_inst=store, case_ids=[case.id])

    assert res1.sentinel_recovered_amount == res2.sentinel_recovered_amount
    assert res1.basic_retry_recovered_amount == res2.basic_retry_recovered_amount
    assert res1.sentinel_net_recovery == res2.sentinel_net_recovery


def test_exhausted_retries_and_terminal_cases(clean_store):
    """Test that exhausted retries and terminal cases are handled correctly and safely."""
    case_exhausted = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    # Add 3 attempts (max retry limit is 3)
    for i in range(3):
        action = RecoveryAction(
            id=uuid.uuid4(),
            recovery_case_id=case_exhausted.id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED,
            attempt_number=i + 1
        )
        store.recovery_actions[action.id] = action

    case_recovered = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("500.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.RECOVERED
    )
    store.recovery_cases[case_exhausted.id] = case_exhausted
    store.recovery_cases[case_recovered.id] = case_recovered

    res = run_simulation(store_inst=store, case_ids=[case_exhausted.id, case_recovered.id])
    
    # Verify case_recovered has 0 probability and sentinel_recovered = 0
    recovered_sim = [c for c in res.cases if c.case_id == case_recovered.id][0]
    assert recovered_sim.sentinel_probability == 0
    assert recovered_sim.sentinel_recovered == Decimal("0.00")

    # Verify case_exhausted basic retry is blocked (NO_INTERVENTION)
    exhausted_sim = [c for c in res.cases if c.case_id == case_exhausted.id][0]
    assert exhausted_sim.basic_retry_strategy == "NO_INTERVENTION"


def test_invalid_and_zero_amounts(clean_store):
    """Verify that zero and negative amounts are handled gracefully with 0 simulated money."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("0.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    res = run_simulation(store_inst=store, case_ids=[case.id])
    assert res.total_revenue_at_risk == Decimal("0.00")
    assert res.cases[0].sentinel_recovered == Decimal("0.00")
    assert res.cases[0].basic_retry_recovered == Decimal("0.00")


def test_simulation_api_endpoints(clean_store):
    """Test the POST and GET router endpoints for simulations."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("2000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN
    )
    store.recovery_cases[case.id] = case

    # 1. API: POST /api/v1/recovery-simulation/run
    response = client.post("/api/v1/recovery-simulation/run", json={"case_ids": [str(case.id)]})
    assert response.status_code == 200
    data = response.json()
    assert float(data["total_revenue_at_risk"]) == 2000.0
    assert len(data["cases"]) == 1

    # 2. API: GET /api/v1/recovery-simulation/latest
    response = client.get("/api/v1/recovery-simulation/latest")
    assert response.status_code == 200
    assert float(response.json()["total_revenue_at_risk"]) == 2000.0

    # 3. API: GET /api/v1/recovery-simulation/statistics
    response = client.get("/api/v1/recovery-simulation/statistics")
    assert response.status_code == 200
    stats = response.json()
    assert stats["simulations_run"] == 1
    assert stats["total_cases_simulated"] == 1
