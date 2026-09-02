import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.store import store
from app.models.domain import WhatIfPolicy, WhatIfComparison
from app.services.policy_what_if import run_policy_what_if

router = APIRouter(prefix="/policy-what-if", tags=["Policy What-If Lab"])

class WhatIfRequest(BaseModel):
    merchant_id: uuid.UUID
    proposed_max_retries: int

@router.get("/current", response_model=WhatIfPolicy)
def get_current_policy(merchant_id: uuid.UUID):
    merchant = store.merchants.get(merchant_id)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
        
    return WhatIfPolicy(
        current_max_retries=merchant.max_retry_attempts,
        proposed_max_retries=merchant.max_retry_attempts
    )

@router.post("/run", response_model=WhatIfComparison)
def run_what_if(req: WhatIfRequest):
    try:
        return run_policy_what_if(
            merchant_id=req.merchant_id,
            proposed_retries=req.proposed_max_retries,
            store_inst=store
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
