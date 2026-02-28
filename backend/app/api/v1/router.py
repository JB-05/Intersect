from fastapi import APIRouter

from app.api.v1 import patients

api_router = APIRouter()

api_router.include_router(patients.router, prefix="/patients", tags=["patients"])


@api_router.get("/")
async def root():
    return {"message": "Cognitive Stability Monitoring API v1"}
