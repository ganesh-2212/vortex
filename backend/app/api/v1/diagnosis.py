import uuid
from fastapi import APIRouter, HTTPException

from app.models.diagnosis import DiagnosisResult
from app.services.ai_diagnosis import generate_diagnosis
from app.store import store

router = APIRouter()

@router.get("/recovery-cases/{case_id}/diagnosis", response_model=DiagnosisResult)
def get_case_diagnosis(case_id: uuid.UUID):
    """
    Returns the AI Root-Cause Diagnosis for a specific recovery case.
    This is a purely additive, read-only endpoint that does not modify
    any cases, execute any recovery actions, or call Razorpay.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery Case not found")
        
    diagnosis = generate_diagnosis(case_id)
    if not diagnosis:
        raise HTTPException(status_code=500, detail="Failed to generate diagnosis for the case.")
        
    return diagnosis
