import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field

class DiagnosisResult(BaseModel):
    root_cause_category: str
    root_cause: str
    evidence: List[str] = Field(default_factory=list)
    risk_explanation: str
    recommended_action: str
    action_reason: str
    confidence: int
    guardrail_status: str
    analysis_source: str = "Deterministic analysis"
    diagnosis_version: str = "1.0"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
