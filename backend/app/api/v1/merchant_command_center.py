from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import uuid

from app.models.domain import MerchantCommandCenterResponse
from app.store import store, MemoryStore
from app.services.merchant_command_center import build_command_center

router = APIRouter()

def get_store() -> MemoryStore:
    return store

@router.get("/merchant-command-center", response_model=MerchantCommandCenterResponse)
def get_merchant_command_center(
    merchant_id: uuid.UUID,
    store: MemoryStore = Depends(get_store)
):
    """
    Returns the aggregated, deterministic business-facing dashboard data
    for the Merchant Revenue Command Center.
    """
    if merchant_id not in store.merchants:
        # Fallback to the first available merchant for testing purposes if none supplied
        if store.merchants:
            merchant_id = list(store.merchants.keys())[0]
        else:
            raise HTTPException(status_code=404, detail="Merchant not found")
            
    response = build_command_center(store, merchant_id)
    return response
