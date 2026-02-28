from pydantic import BaseModel


class MedicationCreate(BaseModel):
    name: str
    dosage: str | None = None
    frequency: str
    times: list[str] | None = None
    notes: str | None = None


class MedicationResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    dosage: str | None = None
    frequency: str
    times: list[str] | None = None
    notes: str | None = None
    is_active: bool = True
