from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.endpoints import router as api_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.lifecycle import router as lifecycle_router
from app.api.v1.recommendations import router as recommendations_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    from app.store import seed_store
    seed_store()

# Setup CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(intelligence_router, prefix=f"{settings.API_V1_STR}/intelligence")
app.include_router(webhooks_router, prefix=f"{settings.API_V1_STR}/webhooks")
app.include_router(lifecycle_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)

@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENV,
        "project": settings.PROJECT_NAME,
        "version": "0.1.0"
    }
