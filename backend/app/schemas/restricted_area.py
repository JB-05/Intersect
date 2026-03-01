from pydantic import BaseModel


class RestrictedAreaCreate(BaseModel):
    name: str


class RestrictedAreaUpdate(BaseModel):
    name: str | None = None
    camera_enabled: bool | None = None
    audio_enabled: bool | None = None


class RestrictedAreaResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    image_url: str | None = None
    camera_enabled: bool
    audio_enabled: bool
    created_at: str
    updated_at: str
