from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: date | None = None
    address: str | None = None
    geofence_radius_km: Decimal | float | None = None
    home_latitude: Decimal | float | None = None
    home_longitude: Decimal | float | None = None
    severity: str | None = None
    personal_history: str | None = None
    diagnosis_type: str | None = None
    diagnosis_date: date | None = None
    diagnosing_physician: str | None = None
    diagnosis_stage: str | None = None
    diagnosis_symptoms: str | None = None
    diagnosis_treatment_plan: str | None = None
    mmse_score_at_diagnosis: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    primary_care_physician: str | None = None
    baseline_start_date: date
    baseline_notes: str | None = None
    notes: str | None = None

    @field_validator("date_of_birth", "diagnosis_date", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class PatientUpdate(BaseModel):
    """Partial update; all fields optional."""
    full_name: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    geofence_radius_km: Decimal | float | None = None
    home_latitude: Decimal | float | None = None
    home_longitude: Decimal | float | None = None
    severity: str | None = None
    personal_history: str | None = None
    diagnosis_type: str | None = None
    diagnosis_date: date | None = None
    diagnosing_physician: str | None = None
    diagnosis_stage: str | None = None
    diagnosis_symptoms: str | None = None
    diagnosis_treatment_plan: str | None = None
    mmse_score_at_diagnosis: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    primary_care_physician: str | None = None
    baseline_start_date: date | None = None
    baseline_notes: str | None = None
    notes: str | None = None

    @field_validator("date_of_birth", "diagnosis_date", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    full_name: str
    date_of_birth: date | None = None
    address: str | None = None
    home_latitude: Decimal | None = None
    home_longitude: Decimal | None = None
    geofence_radius_km: Decimal | None = None
    severity: str | None = None
    personal_history: str | None = None
    diagnosis_type: str | None = None
    diagnosis_date: date | None = None
    diagnosing_physician: str | None = None
    diagnosis_stage: str | None = None
    diagnosis_symptoms: str | None = None
    diagnosis_treatment_plan: str | None = None
    mmse_score_at_diagnosis: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    primary_care_physician: str | None = None
    baseline_start_date: date
    baseline_notes: str | None = None
    notes: str | None = None
    monitoring_paused: bool = False
    created_at: str
