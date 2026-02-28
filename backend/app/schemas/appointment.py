from datetime import datetime

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    title: str
    scheduled_at: datetime
    location: str | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    title: str
    scheduled_at: str
    status: str = "scheduled"
    location: str | None = None
    notes: str | None = None
