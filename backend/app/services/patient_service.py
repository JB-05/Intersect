from datetime import datetime, timezone
from uuid import UUID

from supabase import create_client

from app.config import settings
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def list_patients_for_caregiver(caregiver_id: str) -> list[PatientResponse]:
    """List patients linked to the caregiver via patient_caregiver_map."""
    sb = get_supabase()
    map_res = (
        sb.table("patient_caregiver_map")
        .select("patient_id")
        .eq("caregiver_id", caregiver_id)
        .execute()
    )
    if not map_res.data:
        return []
    patient_ids = [r["patient_id"] for r in map_res.data]
    patients_res = (
        sb.table("patients")
        .select("*")
        .in_("id", patient_ids)
        .is_("deleted_at", "null")
        .execute()
    )
    return [PatientResponse(**p) for p in patients_res.data]


def create_patient(caregiver_id: str, data: PatientCreate) -> PatientResponse:
    """Create patient and link caregiver as primary."""
    sb = get_supabase()
    payload = {
        "full_name": data.full_name,
        "date_of_birth": data.date_of_birth.isoformat() if data.date_of_birth else None,
        "address": data.address,
        "home_latitude": float(data.home_latitude) if data.home_latitude is not None else None,
        "home_longitude": float(data.home_longitude) if data.home_longitude is not None else None,
        "severity": data.severity,
        "personal_history": data.personal_history,
        "diagnosis_type": data.diagnosis_type,
        "diagnosis_date": data.diagnosis_date.isoformat() if data.diagnosis_date else None,
        "diagnosing_physician": data.diagnosing_physician,
        "diagnosis_stage": data.diagnosis_stage,
        "diagnosis_symptoms": data.diagnosis_symptoms,
        "diagnosis_treatment_plan": data.diagnosis_treatment_plan,
        "mmse_score_at_diagnosis": data.mmse_score_at_diagnosis,
        "emergency_contact_name": data.emergency_contact_name,
        "emergency_contact_phone": data.emergency_contact_phone,
        "primary_care_physician": data.primary_care_physician,
        "baseline_start_date": data.baseline_start_date.isoformat(),
        "baseline_notes": data.baseline_notes,
        "notes": data.notes,
    }
    if data.geofence_radius_km is not None:
        payload["geofence_radius_km"] = float(data.geofence_radius_km)
    patient_res = sb.table("patients").insert(payload).execute()
    if not patient_res.data:
        raise ValueError("Failed to create patient")
    patient = patient_res.data[0]
    patient_id = patient["id"]
    sb.table("patient_caregiver_map").insert({
        "patient_id": patient_id,
        "caregiver_id": caregiver_id,
        "role": "primary",
    }).execute()
    return PatientResponse(**patient)


def get_patient(patient_id: UUID, caregiver_id: str) -> PatientResponse | None:
    """Get patient if caregiver has access."""
    sb = get_supabase()
    map_res = (
        sb.table("patient_caregiver_map")
        .select("patient_id")
        .eq("patient_id", str(patient_id))
        .eq("caregiver_id", caregiver_id)
        .execute()
    )
    if not map_res.data:
        return None
    patient_res = (
        sb.table("patients")
        .select("*")
        .eq("id", str(patient_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not patient_res.data:
        return None
    return PatientResponse(**patient_res.data[0])


def update_patient(patient_id: UUID, caregiver_id: str, data: PatientUpdate) -> PatientResponse | None:
    """Update patient; returns updated patient or None if no access."""
    if not get_patient(patient_id, caregiver_id):
        return None
    sb = get_supabase()
    raw = data.model_dump(exclude_unset=True)
    payload = {}
    for k, v in raw.items():
        if v is None:
            payload[k] = None
        elif k in ("date_of_birth", "diagnosis_date", "baseline_start_date") and hasattr(v, "isoformat"):
            payload[k] = v.isoformat()
        elif k in ("home_latitude", "home_longitude", "geofence_radius_km") and v is not None:
            payload[k] = float(v)
        else:
            payload[k] = v
    sb.table("patients").update(payload).eq("id", str(patient_id)).execute()
    return get_patient(patient_id, caregiver_id)


def soft_delete_patient(patient_id: UUID, caregiver_id: str) -> bool:
    """Soft-delete patient (set deleted_at). Returns True if deleted, False if no access."""
    if not get_patient(patient_id, caregiver_id):
        return False
    sb = get_supabase()
    sb.table("patients").update({
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(patient_id)).execute()
    return True
