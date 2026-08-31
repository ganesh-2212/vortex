import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_recovery_benchmark_runs_successfully():
    payload = {
        "case_count": 100,
        "seed": 42
    }
    
    response = client.post("/api/v1/recovery-benchmark/run", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "evaluation_id" in data
    assert data["seed"] == 42
    assert "evaluated_at" in data
    
    metrics = data["metrics"]
    assert metrics["cases_evaluated"] == 100
    assert float(metrics["total_revenue_at_risk"]) > 0
    assert float(metrics["recoverable_revenue"]) > 0
    assert float(metrics["recovered_revenue"]) > 0
    assert float(metrics["recovery_rate"]) > 0
    
    safety = data["safety"]
    assert "guardrail_violations" in safety
    assert "unsafe_actions_blocked" in safety
    assert "human_escalations" in safety
    assert "stopped_cases" in safety

def test_recovery_benchmark_determinism():
    payload = {
        "case_count": 50,
        "seed": 99
    }
    
    response1 = client.post("/api/v1/recovery-benchmark/run", json=payload)
    response2 = client.post("/api/v1/recovery-benchmark/run", json=payload)
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    data1 = response1.json()
    data2 = response2.json()
    
    # Evaluation IDs and timestamps will differ, but metrics must be identical
    assert data1["metrics"] == data2["metrics"]
    assert data1["strategy_comparisons"] == data2["strategy_comparisons"]
    assert data1["safety"] == data2["safety"]

def test_benchmark_razorpay_isolation(monkeypatch):
    """
    Ensure the benchmark NEVER calls Razorpay or generates webhook logic.
    """
    from app.services.razorpay_service import razorpay_service
    
    razorpay_calls = []
    
    def mock_create_order(*args, **kwargs):
        razorpay_calls.append("create_order")
        return {}
        
    def mock_fetch_payment(*args, **kwargs):
        razorpay_calls.append("fetch_payment")
        return {}
        
    monkeypatch.setattr(razorpay_service, "create_order", mock_create_order)
    monkeypatch.setattr(razorpay_service, "fetch_payment", mock_fetch_payment)
    
    payload = {
        "case_count": 50,
        "seed": 123
    }
    
    response = client.post("/api/v1/recovery-benchmark/run", json=payload)
    assert response.status_code == 200
    
    # Verify Razorpay was completely bypassed
    assert len(razorpay_calls) == 0
