import uuid
from decimal import Decimal
import pytest
from app.store import store, seed_store
from app.models.domain import RecoveryCaseStatus, RiskLevel

@pytest.fixture(autouse=True)
def setup_killer_scenario():
    store.clear()
    seed_store(store, with_killer_scenario=True)
    yield

def test_f18_killer_scenario_seeding():
    """
    Verifies that explicitly seeding the killer scenario correctly produces the 5 expected cases
    with their precise deterministic outcomes, isolated from normal unit tests.
    """
    # 5 demo cases should exist
    assert len(store.recovery_cases) == 5
    
    # 1: ₹50,000 → Critical → Retry → Recovered
    case1 = next(c for c in store.recovery_cases.values() if c.amount_at_risk == Decimal("50000.00"))
    assert case1.risk_level == RiskLevel.CRITICAL
    assert case1.status == RecoveryCaseStatus.RECOVERED

    # 2: ₹25,000 → High → Cooldown / Waiting
    case2 = next(c for c in store.recovery_cases.values() if c.amount_at_risk == Decimal("25000.00"))
    assert case2.risk_level == RiskLevel.HIGH
    assert case2.status == RecoveryCaseStatus.OPEN

    # 3: ₹15,000 → High → Human Escalation
    case3 = next(c for c in store.recovery_cases.values() if c.amount_at_risk == Decimal("15000.00"))
    assert case3.risk_level == RiskLevel.HIGH
    assert case3.status == RecoveryCaseStatus.IN_PROGRESS

    # 4: ₹8,000 → Medium → Retry → Recovered
    case4 = next(c for c in store.recovery_cases.values() if c.amount_at_risk == Decimal("8000.00"))
    assert case4.risk_level == RiskLevel.MEDIUM
    assert case4.status == RecoveryCaseStatus.RECOVERED

    # 5: ₹60,000 → Critical → Guardrail Blocked / Stopped
    case5 = next(c for c in store.recovery_cases.values() if c.amount_at_risk == Decimal("60000.00"))
    assert case5.risk_level == RiskLevel.CRITICAL
    assert case5.status == RecoveryCaseStatus.STOPPED

def test_f12_boundary_preserved():
    """
    Verifies that despite seeding the killer scenario, F12 simulations are NOT automatically run.
    """
    assert len(store.simulations) == 0
    assert store.latest_simulation is None
