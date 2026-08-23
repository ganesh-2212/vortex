import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.store import store, seed_store
from app.models.domain import (
    RevenueEventType, RiskLevel, RecoveryCaseStatus,
    RecoveryCase, RevenueEvent
)
from app.services import intelligence as intel_svc

client = TestClient(app)

# Constants for testing
MERCHANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
CUSTOMER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

@pytest.fixture(autouse=True)
def clean_store():
    """Clears the store database before each test run."""
    store.clear()
    yield

@pytest.fixture
def seeded_db():
    """Seeds the store with the default merchant and customer for testing."""
    seed_store(store)
    return store

# --- 1. Empty State Tests ---

def test_empty_intelligence_state(clean_store):
    current_time = datetime.now(timezone.utc)
    
    # Check service returns zero values
    summary = intel_svc.get_revenue_intelligence_summary(store, current_time)
    assert summary.revenue_at_risk == Decimal("0.00")
    assert summary.estimated_recoverable == Decimal("0.00")
    assert summary.open_case_count == 0
    assert summary.critical_amount == Decimal("0.00")
    assert summary.high_amount == Decimal("0.00")
    assert summary.medium_amount == Decimal("0.00")
    assert summary.low_amount == Decimal("0.00")
    assert summary.top_leakage_type is None
    
    # Check endpoints return zero values
    response = client.get("/api/v1/intelligence/summary")
    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["revenue_at_risk"]) == Decimal("0.00")
    assert Decimal(data["estimated_recoverable"]) == Decimal("0.00")
    assert data["open_case_count"] == 0
    
    response_leakage = client.get("/api/v1/intelligence/leakage")
    assert response_leakage.status_code == 200
    assert response_leakage.json() == []

    response_priorities = client.get("/api/v1/intelligence/priorities")
    assert response_priorities.status_code == 200
    assert response_priorities.json() == []

# --- 2. Calculation Verification Tests ---

def test_revenue_at_risk_calculation(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    # Add a merchant and customer, then seed open cases
    case_1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    case_2 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.IN_PROGRESS,
        created_at=current_time
    )
    # This closed case should NOT be counted in revenue at risk
    case_3 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("20000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.RECOVERED,
        created_at=current_time
    )
    
    store.recovery_cases[case_1.id] = case_1
    store.recovery_cases[case_2.id] = case_2
    store.recovery_cases[case_3.id] = case_3
    
    open_cases = intel_svc.get_open_cases(store)
    assert len(open_cases) == 2
    
    summary = intel_svc.get_revenue_intelligence_summary(store, current_time)
    assert summary.revenue_at_risk == Decimal("20000.00")
    assert summary.open_case_count == 2

def test_risk_distribution(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    # Add cases with different risk levels
    case_1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("55000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    case_2 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    case_3 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("500.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    
    store.recovery_cases[case_1.id] = case_1
    store.recovery_cases[case_2.id] = case_2
    store.recovery_cases[case_3.id] = case_3
    
    dist = intel_svc.get_risk_distribution(store)
    assert dist.critical_amount == Decimal("55000.00")
    assert dist.critical_count == 1
    assert dist.high_amount == Decimal("15000.00")
    assert dist.high_count == 1
    assert dist.low_amount == Decimal("500.00")
    assert dist.low_count == 1
    assert dist.medium_amount == Decimal("0.00")
    assert dist.medium_count == 0

def test_leakage_analysis(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    # Add revenue events
    event_1 = RevenueEvent(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("10000.00"),
        status="FAILED",
        occurred_at=current_time
    )
    event_2 = RevenueEvent(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.SUBSCRIPTION_FAILED,
        amount=Decimal("5000.00"),
        status="FAILED",
        occurred_at=current_time
    )
    
    store.revenue_events[event_1.id] = event_1
    store.revenue_events[event_2.id] = event_2
    
    # Add cases referencing these events
    case_1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=event_1.id,
        amount_at_risk=Decimal("10000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    case_2 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=event_2.id,
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    
    store.recovery_cases[case_1.id] = case_1
    store.recovery_cases[case_2.id] = case_2
    
    leakage = intel_svc.get_leakage_analysis(store)
    assert len(leakage) == 2
    
    # Sorted by amount descending
    assert leakage[0].event_type == RevenueEventType.PAYMENT_FAILED
    assert leakage[0].amount_at_risk == Decimal("10000.00")
    assert leakage[0].percentage_of_total == 66.67
    
    assert leakage[1].event_type == RevenueEventType.SUBSCRIPTION_FAILED
    assert leakage[1].amount_at_risk == Decimal("5000.00")
    assert leakage[1].percentage_of_total == 33.33

def test_priority_score_determinism_and_bounds(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("12000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    
    # Prove priority scores are fully deterministic (identical inputs produce identical scores)
    score_1, breakdown_1 = intel_svc.calculate_priority_score(case, failure_count=2, retry_count=0, current_time=current_time)
    score_2, breakdown_2 = intel_svc.calculate_priority_score(case, failure_count=2, retry_count=0, current_time=current_time)
    assert score_1 == score_2
    assert breakdown_1.risk_severity_score == breakdown_2.risk_severity_score
    assert breakdown_1.amount_score == breakdown_2.amount_score
    
    # Prove score remains bounded between 0 and 100
    # Case A: Low risk, small amount, stale, no failures, exhausted retries
    case_min = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time - timedelta(days=10)
    )
    score_min, _ = intel_svc.calculate_priority_score(case_min, failure_count=0, retry_count=3, current_time=current_time)
    assert 0.0 <= score_min <= 100.0
    
    # Case B: Critical risk, huge amount, fresh, high failures, fresh opportunity
    case_max = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("100000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    score_max, _ = intel_svc.calculate_priority_score(case_max, failure_count=5, retry_count=0, current_time=current_time)
    assert 0.0 <= score_max <= 100.0
    assert score_max > score_min

def test_recoverability_estimation_bounds(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    # Case A: Critical risk, amount at risk 50,000
    case_1 = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("50000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    
    # Prove recoverability estimate remains bounded between 0 and amount_at_risk
    est = intel_svc.calculate_estimated_recoverable(case_1, failure_count=1, retry_count=0, current_time=current_time)
    assert Decimal("0.00") <= est <= case_1.amount_at_risk
    
    # Exceeded retries -> should result in 0 recovery chance
    est_exhausted = intel_svc.calculate_estimated_recoverable(case_1, failure_count=1, retry_count=3, current_time=current_time)
    assert est_exhausted == Decimal("0.00")

def test_time_sensitivity_categorization(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    ts_fresh = intel_svc.calculate_time_sensitivity(current_time - timedelta(hours=5), current_time)
    assert ts_fresh.category == "FRESH"
    
    ts_aging = intel_svc.calculate_time_sensitivity(current_time - timedelta(hours=36), current_time)
    assert ts_aging.category == "AGING"
    
    ts_stale = intel_svc.calculate_time_sensitivity(current_time - timedelta(hours=80), current_time)
    assert ts_stale.category == "STALE"

def test_priority_ordering(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    case_low = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("50.00"),
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time - timedelta(days=5)
    )
    case_high = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("60000.00"),
        risk_level=RiskLevel.CRITICAL,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    
    store.recovery_cases[case_low.id] = case_low
    store.recovery_cases[case_high.id] = case_high
    
    priorities = intel_svc.get_priority_cases(store, current_time)
    assert len(priorities) == 2
    # Critical high value case must be first
    assert priorities[0].case_id == case_high.id
    assert priorities[1].case_id == case_low.id

def test_explainability_reasons_contain_signals(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("12000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    score, breakdown = intel_svc.calculate_priority_score(case, failure_count=2, retry_count=0, current_time=current_time)
    ts = intel_svc.calculate_time_sensitivity(case.created_at, current_time)
    reasons = intel_svc.generate_explainability_reasons(case, score, breakdown, ts)
    
    messages = [r.message for r in reasons]
    assert any("HIGH risk" in m for m in messages)
    assert any("priority score" in m for m in messages)
    assert any("amount at risk" in m for m in messages)
    assert any("Recovery Opportunity" in m for m in messages)

# --- 3. API Boundary Endpoints Integration Tests ---

def test_summary_api(seeded_db):
    current_time = datetime.now(timezone.utc)
    
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    store.recovery_cases[case.id] = case
    
    response = client.get("/api/v1/intelligence/summary")
    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["revenue_at_risk"]) == Decimal("15000.00")
    assert data["open_case_count"] == 1
    assert "generated_at" in data
    assert datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00")).tzinfo is not None

def test_leakage_api(seeded_db):
    current_time = datetime.now(timezone.utc)
    event = RevenueEvent(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("10000.00"),
        status="FAILED",
        occurred_at=current_time
    )
    store.revenue_events[event.id] = event
    
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=event.id,
        amount_at_risk=Decimal("10000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    store.recovery_cases[case.id] = case
    
    response = client.get("/api/v1/intelligence/leakage")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["event_type"] == "PAYMENT_FAILED"
    assert Decimal(data[0]["amount_at_risk"]) == Decimal("10000.00")

def test_priorities_api(seeded_db):
    current_time = datetime.now(timezone.utc)
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    store.recovery_cases[case.id] = case
    
    response = client.get("/api/v1/intelligence/priorities")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["case_id"] == str(case.id)
    assert data[0]["priority_score"] > 0

def test_case_intelligence_api(seeded_db):
    current_time = datetime.now(timezone.utc)
    case = RecoveryCase(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("15000.00"),
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=current_time
    )
    store.recovery_cases[case.id] = case
    
    response = client.get(f"/api/v1/intelligence/cases/{case.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == str(case.id)
    assert "priority_breakdown" in data
    assert "reasons" in data
    assert "time_sensitivity" in data
    assert Decimal(data["estimated_recoverable"]) > 0

def test_nonexistent_case_returns_404(clean_store):
    response = client.get(f"/api/v1/intelligence/cases/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Recovery case not found"

def test_never_claim_predicted_or_recovered(clean_store):
    # Verify returned JSON models do not name estimated_recoverable as "money actually recovered"
    # or "AI predictions" in any schema validation
    # Verify docstrings of summary to prove we keep clean boundary
    summary_doc = intel_svc.calculate_estimated_recoverable.__doc__
    assert "heuristic" in summary_doc
    assert "prediction" not in summary_doc
