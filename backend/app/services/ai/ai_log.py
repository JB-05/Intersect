"""Log transcript, intent, response to patient_ai_logs. No raw audio or full prompt."""
from uuid import UUID

from supabase import create_client

from app.config import settings


def log_interaction(patient_id: UUID, transcript: str, intent: str, response: str) -> None:
    """Insert one row into patient_ai_logs. Does not store prompt or audio."""
    sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
    sb.table("patient_ai_logs").insert({
        "patient_id": str(patient_id),
        "transcript": transcript,
        "intent": intent,
        "response": response,
    }).execute()
