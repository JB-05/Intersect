from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, status, UploadFile, Body

from app.dependencies import get_current_caregiver_id
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.schemas.medication import MedicationCreate, MedicationResponse
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.schemas.known_face import KnownFaceCreate, KnownFaceResponse
from app.schemas.restricted_area import RestrictedAreaResponse
from app.schemas.survey import SurveyCreate, SurveyResponse
from app.services.appointment_service import create_appointment, list_appointments
from app.services.medication_service import create_medication, list_medications
from app.services.known_face_service import list_known_faces, create_known_face, create_known_face_with_photo, delete_known_face, recognize_face
from app.services.restricted_area_service import (
    list_restricted_areas,
    create_restricted_area,
    create_restricted_area_with_image,
    update_restricted_area,
    delete_restricted_area,
)
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


@router.get("/{id}/known-faces", response_model=list)
async def list_known_faces_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """List known faces for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    faces = list_known_faces(id)
    return [f.model_dump(mode="json") for f in faces]


@router.post("/{id}/known-faces", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_known_face_endpoint(
    id: UUID,
    name: str = Form(..., description="Name of the person"),
    relationship: str | None = Form(None, description="Relationship to patient (e.g. daughter, neighbor)"),
    photo: UploadFile | None = File(None, description="Face photo (JPEG/PNG)"),
    embedding: str | None = Form(None, description="Optional 128-d face embedding as JSON array (for recognition)"),
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Add a known face with name, relationship, and optional photo. Include embedding from frontend for face recognition."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    emb_list: list[float] | None = None
    if embedding:
        try:
            import json
            emb_list = json.loads(embedding)
            if not isinstance(emb_list, list) or len(emb_list) != 128:
                emb_list = None
        except Exception:
            emb_list = None
    try:
        if photo and photo.filename:
            content_type = photo.content_type or "image/jpeg"
            if content_type not in ("image/jpeg", "image/png", "image/webp"):
                content_type = "image/jpeg"
            photo_bytes = await photo.read()
            if len(photo_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Photo must be under 10MB")
            if len(photo_bytes) > 0:
                face = create_known_face_with_photo(id, name, relationship, photo_bytes, content_type, embedding=emb_list)
            else:
                from app.schemas.known_face import KnownFaceCreate
                face = create_known_face(id, KnownFaceCreate(name=name, relationship=relationship))
        else:
            from app.schemas.known_face import KnownFaceCreate
            face = create_known_face(id, KnownFaceCreate(name=name, relationship=relationship))
        return face.model_dump(mode="json")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{id}/recognize-face", response_model=dict)
async def recognize_face_endpoint(
    id: UUID,
    body: dict,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Recognize a face from a 128-d embedding (e.g. from face-api.js). Returns { matched: true, name, relationship } or { matched: false }."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    emb = body.get("embedding")
    if not isinstance(emb, list) or len(emb) != 128:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="embedding must be an array of 128 numbers")
    try:
        emb = [float(x) for x in emb]
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="embedding must be 128 floats")
    match = recognize_face(id, emb)
    if match:
        return {"matched": True, "name": match["name"], "relationship": match["relationship"]}
    return {"matched": False}


@router.delete("/{id}/known-faces/{face_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_known_face_endpoint(
    id: UUID,
    face_id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Remove a known face (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if not delete_known_face(id, face_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Known face not found")


# ---------- Restricted areas ----------


@router.get("/{id}/restricted-areas", response_model=list)
async def list_restricted_areas_endpoint(
    id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """List restricted areas for a patient (if caregiver has access)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    areas = list_restricted_areas(id)
    return [a.model_dump(mode="json") for a in areas]


@router.post("/{id}/restricted-areas", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_restricted_area_endpoint(
    id: UUID,
    name: str = Form(..., description="Name/label for the area"),
    image: UploadFile | None = File(None, description="Optional image of the restricted area"),
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Add a restricted area with optional image. Camera and audio start enabled (toggle in UI)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    try:
        if image and image.filename and getattr(image, "size", 0) != 0:
            content_type = image.content_type or "image/jpeg"
            if content_type not in ("image/jpeg", "image/png", "image/webp"):
                content_type = "image/jpeg"
            image_bytes = await image.read()
            if len(image_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be under 10MB")
            if image_bytes:
                area = create_restricted_area_with_image(id, name, image_bytes, content_type)
            else:
                area = create_restricted_area(id, name)
        else:
            area = create_restricted_area(id, name)
        return area.model_dump(mode="json")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{id}/restricted-areas/{area_id}", response_model=dict)
async def update_restricted_area_endpoint(
    id: UUID,
    area_id: UUID,
    body: dict = Body(..., description="Fields to update: name, camera_enabled, audio_enabled"),
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Update a restricted area (name and/or camera/audio toggles)."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    area = update_restricted_area(
        id,
        area_id,
        name=body.get("name"),
        camera_enabled=body.get("camera_enabled"),
        audio_enabled=body.get("audio_enabled"),
    )
    if not area:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restricted area not found")
    return area.model_dump(mode="json")


@router.delete("/{id}/restricted-areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restricted_area_endpoint(
    id: UUID,
    area_id: UUID,
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """Remove a restricted area."""
    if not get_patient(id, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if not delete_restricted_area(id, area_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restricted area not found")
