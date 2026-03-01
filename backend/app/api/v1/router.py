from fastapi import APIRouter

from app.api.v1 import patients
from app.api.v1 import patient_mode

api_router = APIRouter()

api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(patient_mode.router)


@api_router.get("/")
async def root():
    return {"message": "Cognitive Stability Monitoring API v1"}
