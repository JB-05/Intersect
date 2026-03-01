from pydantic import BaseModel


class KnownFaceCreate(BaseModel):
    name: str
    relationship: str | None = None


class KnownFaceResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    relationship: str | None = None
    photo_url: str | None = None
    created_at: str
