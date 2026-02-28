from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_caregiver_id
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.schemas.medication import MedicationCreate, MedicationResponse
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.schemas.survey import SurveyCreate, SurveyResponse
from app.services.appointment_service import create_appointment, list_appointments
from app.services.medication_service import create_medication, list_medications
from app.services.patient_service import (
    create_patient,
    get_patient,
    list_patients_for_caregiver,
    soft_delete_patient,
    update_patient,
)
from app.services.survey_service import create_survey, list_surveys

router = APIRouter()


@router.get("", response_model=dict)
async def list_patients(
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """List patients for the authenticated caregiver."""
    patients = list_patients_for_caregiver(caregiver_id)
    return {"items": [p.model_dump(mode="json") for p in patients], "total": len(patients)}


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_patient_endpoint(
    data: PatientCreate,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Create a new patient and link caregiver as primary."""
    try:
        patient = create_patient(caregiver_id, data)
        return patient.model_dump(mode="json")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e


@router.get("/{id}", response_model=dict)
async def get_patient_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Get a patient by ID (if caregiver has access)."""
    patient = get_patient(id, caregiver_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient.model_dump(mode="json")


@router.get("/{id}/stability", response_model=dict)
async def get_stability_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Get cognitive stability summary for a patient (stub until full pipeline exists)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return {
        "patient_id": str(id),
        "current_level": "informational",
        "domains": {},
        "last_calculated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


@router.patch("/{id}", response_model=dict)
async def update_patient_endpoint(
    id: UUID,
    data: PatientUpdate,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Update a patient (if caregiver has access)."""
    patient = update_patient(id, caregiver_id, data)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient.model_dump(mode="json")


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Soft-delete a patient (if caregiver has access)."""
    if not soft_delete_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")


@router.get("/{id}/medications", response_model=list)
async def list_medications_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """List medications for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    meds = list_medications(id)
    return [m.model_dump(mode="json") for m in meds]


@router.post("/{id}/medications", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_medication_endpoint(
    id: UUID,
    data: MedicationCreate,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Add a medication for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    try:
        med = create_medication(id, data)
        return med.model_dump(mode="json")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{id}/appointments", response_model=list)
async def list_appointments_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """List appointments for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    apts = list_appointments(id)
    return [a.model_dump(mode="json") for a in apts]


@router.post("/{id}/appointments", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_appointment_endpoint(
    id: UUID,
    data: AppointmentCreate,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Add an appointment for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    try:
        apt = create_appointment(id, data)
        return apt.model_dump(mode="json")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{id}/surveys", response_model=list)
async def list_surveys_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """List caregiver surveys for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    surveys = list_surveys(id)
    return [s.model_dump(mode="json") for s in surveys]


@router.post("/{id}/surveys", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_survey_endpoint(
    id: UUID,
    data: SurveyCreate,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Submit a weekly caregiver survey (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    try:
        survey = create_survey(id, caregiver_id, data)
        return survey.model_dump(mode="json")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
