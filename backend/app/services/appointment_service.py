from uuid import UUID

from supabase import create_client

from app.config import settings
from app.schemas.appointment import AppointmentCreate, AppointmentResponse


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def list_appointments(patient_id: UUID) -> list[AppointmentResponse]:
    sb = get_supabase()
    res = (
        sb.table("appointments")
        .select("*")
        .eq("patient_id", str(patient_id))
        .order("scheduled_at", desc=False)
        .execute()
    )
    return [AppointmentResponse(**a) for a in res.data]


def create_appointment(patient_id: UUID, data: AppointmentCreate) -> AppointmentResponse:
    sb = get_supabase()
    payload = {
        "patient_id": str(patient_id),
        "title": data.title,
        "scheduled_at": data.scheduled_at.isoformat(),
        "location": data.location,
        "notes": data.notes,
    }
    res = sb.table("appointments").insert(payload).execute()
    if not res.data:
        raise ValueError("Failed to create appointment")
    return AppointmentResponse(**res.data[0])
