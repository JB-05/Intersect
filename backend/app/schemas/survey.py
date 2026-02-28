from datetime import date

from pydantic import BaseModel


class SurveyCreate(BaseModel):
    week_ending: date
    confusion_increased: bool
    safety_concern_increased: bool
    stress_level: int  # 1-5


class SurveyResponse(BaseModel):
    id: str
    patient_id: str
    week_ending: str
    confusion_increased: bool
    safety_concern_increased: bool
    stress_level: int
    created_at: str
