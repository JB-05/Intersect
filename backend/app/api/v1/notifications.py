from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_caregiver_id
from app.services.notification_service import list_notifications_for_caregiver

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list)
async def list_notifications(
    caregiver_id: str = Depends(get_current_caregiver_id),
    patient_id: UUID | None = Query(None, description="Filter by patient (optional)"),
):
    """List notifications for the caregiver: alerts, upcoming appointments, medicine reminders. Optionally filter by patient."""
    return list_notifications_for_caregiver(caregiver_id, patient_id)
