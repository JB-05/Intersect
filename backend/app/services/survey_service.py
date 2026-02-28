from uuid import UUID

from supabase import create_client

from app.config import settings
from app.schemas.survey import SurveyCreate, SurveyResponse


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def list_surveys(patient_id: UUID) -> list[SurveyResponse]:
    sb = get_supabase()
    res = (
        sb.table("caregiver_surveys")
        .select("*")
        .eq("patient_id", str(patient_id))
        .order("week_ending", desc=True)
        .execute()
    )
    return [SurveyResponse(**s) for s in res.data]


def create_survey(patient_id: UUID, caregiver_id: str, data: SurveyCreate) -> SurveyResponse:
    sb = get_supabase()
    payload = {
        "patient_id": str(patient_id),
        "caregiver_id": caregiver_id,
        "week_ending": data.week_ending.isoformat(),
        "confusion_increased": data.confusion_increased,
        "safety_concern_increased": data.safety_concern_increased,
        "stress_level": data.stress_level,
    }
    res = sb.table("caregiver_surveys").insert(payload).execute()
    if not res.data:
        raise ValueError("Failed to create survey")
    return SurveyResponse(**res.data[0])
