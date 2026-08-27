import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.store import store, MemoryStore
from app.models.domain import (
    Merchant,
    RecoveryCase,
    RecoveryCaseStatus,
    RiskLevel,
    RevenueEvent,
    RevenueEventType,
    SimulationRunResponse,
    SimulatedCaseDetail
)

client = TestClient(app)

@pytest.fixture
def clean_store():
    store.merchants.clear()
    store.revenue_events.clear()
    store.recovery_cases.clear()
    store.recovery_actions.clear()
    store.audit_logs.clear()
    if hasattr(store, "recovery_lifecycles"):
        store.recovery_lifecycles.clear()
    if hasattr(store, "simulations"):
        store.simulations.clear()
    store.latest_simulation = None
    yield store

def test_command_center_no_simulation_does_not_mutate(clean_store):
    merchant_id = uuid.uuid4()
    clean_store.merchants[merchant_id] = Merchant(
        id=merchant_id,
        name="Test Merchant"
    )
    
    # Take snapshot of store lengths
    initial_sims = len(getattr(clean_store, "simulations", {}))
    
    response = client.get(f"/api/v1/merchant-command-center?merchant_id={merchant_id}")
    assert response.status_code == 200
    data = response.json()
    
    # 1. Ensure simulation_available is False
    assert data["simulation_available"] is False
    assert len(data["revenue_comparison"]) == 0
    
    # 2. Ensure store was not mutated
    assert len(getattr(clean_store, "simulations", {})) == initial_sims
    assert getattr(clean_store, "latest_simulation", None) is None

def test_command_center_with_simulation_is_read_only(clean_store):
    merchant_id = uuid.uuid4()
    clean_store.merchants[merchant_id] = Merchant(
        id=merchant_id,
        name="Test Merchant"
    )
    
    # Inject a mock simulation
    sim_id = uuid.uuid4()
    sim = SimulationRunResponse(
        simulation_id=sim_id,
        total_revenue_at_risk=Decimal("10000.00"),
        no_intervention_recovered_amount=Decimal("0.00"),
        basic_retry_recovered_amount=Decimal("2000.00"),
        sentinel_recovered_amount=Decimal("8000.00"),
        sentinel_recovery_rate=80.0,
        incremental_recovery_vs_no_intervention=Decimal("8000.00"),
        incremental_recovery_vs_basic_retry=Decimal("6000.00"),
        additional_recovery_percentage=300.0,
        total_intervention_cost=Decimal("50.00"),
        sentinel_net_recovery=Decimal("7950.00"),
        number_of_simulated_cases=1,
        number_of_simulated_successful_recoveries=1,
        cases=[],
        run_at=datetime.now(timezone.utc)
    )
    clean_store.simulations = {sim_id: sim}
    clean_store.latest_simulation = sim
    
    # Take a snapshot
    initial_cases = len(clean_store.recovery_cases)
    initial_actions = len(clean_store.recovery_actions)
    
    # First call
    response1 = client.get(f"/api/v1/merchant-command-center?merchant_id={merchant_id}")
    assert response1.status_code == 200
    data1 = response1.json()
    
    # Validate separation of concerns
    assert data1["simulation_available"] is True
    assert len(data1["revenue_comparison"]) == 3
    
    sentinel_metrics = next(c for c in data1["revenue_comparison"] if c["scenario_type"] == "SENTINEL_OPTIMIZED")
    assert sentinel_metrics["is_simulated"] is True
    assert Decimal(str(sentinel_metrics["simulated_projected_recovery"])) == Decimal("8000.00")
    
    # Second call (check determinism)
    response2 = client.get(f"/api/v1/merchant-command-center?merchant_id={merchant_id}")
    data2 = response2.json()
    del data1["generated_at"]
    del data2["generated_at"]
    assert data2 == data1
    
    # Verify no state changes
    assert len(clean_store.recovery_cases) == initial_cases
    assert len(clean_store.recovery_actions) == initial_actions

def test_command_center_aggregates_actuals_correctly(clean_store):
    merchant_id = uuid.uuid4()
    clean_store.merchants[merchant_id] = Merchant(
        id=merchant_id,
        name="Test Merchant"
    )
    
    event_id = uuid.uuid4()
    clean_store.revenue_events[event_id] = RevenueEvent(
        id=event_id,
        merchant_id=merchant_id,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("1000.00"),
        status="FAILED",
        occurred_at=datetime.now(timezone.utc)
    )
    
    # Case 1: Open, at risk
    case1 = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=merchant_id,
        revenue_event_id=event_id,
        amount_at_risk=Decimal("1000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN
    )
    clean_store.recovery_cases[case1.id] = case1
    
    # Case 2: Recovered
    case2 = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=merchant_id,
        revenue_event_id=event_id,
        amount_at_risk=Decimal("500.00"),
        recovered_amount=Decimal("500.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.RECOVERED
    )
    clean_store.recovery_cases[case2.id] = case2
    
    response = client.get(f"/api/v1/merchant-command-center?merchant_id={merchant_id}")
    assert response.status_code == 200
    data = response.json()
    
    metrics = data["metrics"]
    assert Decimal(str(metrics["total_revenue_at_risk"])) == Decimal("1500.00")
    assert Decimal(str(metrics["total_confirmed_recovered"])) == Decimal("500.00")
    assert metrics["total_cases"] == 2
    assert metrics["active_cases"] == 1
    assert metrics["recovered_cases"] == 1
