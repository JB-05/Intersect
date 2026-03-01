"""Build minimal context for LLM by intent. Never send full patient object or PII."""
from datetime import datetime, timezone
from uuid import UUID

from app.services.patient_service import get_patient
from app.services.medication_service import list_medications
from app.services.appointment_service import list_appointments
from app.services.ai.intent import (
    INTENT_MEDICATION,
    INTENT_APPOINTMENT,
    INTENT_IDENTITY,
    INTENT_DATE,
)


def _get_known_contact_names_only(patient_id: UUID) -> list[str]:
    """Fetch only names from known_faces (no phone/address)."""
    from supabase import create_client
    from app.config import settings
    sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
    res = sb.table("known_faces").select("name").eq("patient_id", str(patient_id)).execute()
    return [r["name"] for r in (res.data or []) if r.get("name")]


def build_context_for_intent(
    patient_id: UUID,
    caregiver_id: str,
    intent: str,
) -> str:
    """
    Return minimal context string for the given intent.
    medication_query -> medication schedule only
    appointment_query -> upcoming appointments only
    identity_query -> known contact names only
    date_query -> system date only
    general -> no sensitive data
    """
    patient = get_patient(patient_id, caregiver_id)
    if not patient:
        return ""

    if intent == INTENT_MEDICATION:
        meds = list_medications(patient_id)
        if not meds:
            return "Medications: None listed."
        lines = []
        for m in meds:
            times = (m.times or []) if hasattr(m, "times") else []
            times_str = ", ".join(str(t)[:5] for t in times) if times else "-"
            lines.append(f"- {m.name}: {m.dosage or '-'}, {m.frequency}, times: {times_str}")
        return "Medications (name, dosage, frequency, times):\n" + "\n".join(lines)

    if intent == INTENT_APPOINTMENT:
        appointments = list_appointments(patient_id)
        now = datetime.now(timezone.utc)
        upcoming = [
            a for a in appointments
            if a.status == "scheduled"
            and datetime.fromisoformat(a.scheduled_at.replace("Z", "+00:00")) >= now
        ]
        upcoming = upcoming[:10]
        if not upcoming:
            return "Upcoming appointments: None."
        lines = []
        for a in upcoming:
            loc = getattr(a, "location", None) or ""
            lines.append(f"- {a.title} at {a.scheduled_at}" + (f" ({loc})" if loc else ""))
        return "Upcoming appointments:\n" + "\n".join(lines)

    if intent == INTENT_IDENTITY:
        names = _get_known_contact_names_only(patient_id)
        if not names:
            return "Known contacts: None listed."
        return "Known contact names only: " + ", ".join(names)

    if intent == INTENT_DATE:
        return "Current date and time (UTC): " + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

    return ""
