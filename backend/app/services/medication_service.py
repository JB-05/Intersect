from uuid import UUID

from supabase import create_client

from app.config import settings
from app.schemas.medication import MedicationCreate, MedicationResponse


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def list_medications(patient_id: UUID) -> list[MedicationResponse]:
    sb = get_supabase()
    res = sb.table("medications").select("*").eq("patient_id", str(patient_id)).eq("is_active", True).execute()
    return [MedicationResponse(**m) for m in res.data]


def _normalize_time_string(s: str) -> str | None:
    """Convert to PostgreSQL TIME format HH:MM:SS. '08' -> '08:00:00', '08:30' -> '08:30:00'."""
    s = (s or "").strip()
    if not s:
        return None
    if ":" in s:
        parts = s.split(":")
        if len(parts) == 2:
            return f"{int(parts[0]):02d}:{int(parts[1]):02d}:00"
        if len(parts) >= 3:
            return f"{int(parts[0]):02d}:{int(parts[1]):02d}:{int(parts[2]):02d}"
        return None
    try:
        h = int(s)
        return f"{h:02d}:00:00"
    except ValueError:
        return None


def _normalize_times(times: list[str] | None) -> list[str] | None:
    """Normalize list of time strings for PostgreSQL TIME[]."""
    if not times:
        return None
    out = []
    for t in times:
        if isinstance(t, str) and t.strip():
            n = _normalize_time_string(t.strip())
            if n:
                out.append(n)
    return out if out else None


def create_medication(patient_id: UUID, data: MedicationCreate) -> MedicationResponse:
    sb = get_supabase()
    payload = {
        "patient_id": str(patient_id),
        "name": data.name,
        "dosage": data.dosage,
        "frequency": data.frequency,
        "notes": data.notes,
    }
    if data.times:
        normalized = _normalize_times(data.times)
        if normalized:
            payload["times"] = normalized
    res = sb.table("medications").insert(payload).execute()
    if not res.data:
        raise ValueError("Failed to create medication")
    return MedicationResponse(**res.data[0])
