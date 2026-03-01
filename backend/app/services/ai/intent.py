"""Rule-based intent classification from Malayalam transcript (keyword detection)."""
import re

# Supported intents (MVP only)
INTENT_MEDICATION = "medication_query"
INTENT_APPOINTMENT = "appointment_query"
INTENT_IDENTITY = "identity_query"
INTENT_DATE = "date_query"
INTENT_GENERAL = "general"

# English + Malayalam keywords so "speak English, respond Malayalam" works.
MEDICATION_KEYWORDS = [
    "medicine", "medication", "മരുന്ന്", "marrunnu", "pill", "tablet", "pills",
    "എപ്പോൾ", "eppol", "എടുക്കണം", "edukkanam", "when take", "dose", "take",
    "ഡോസ്", "dosage", "അളവ്", "alav", "time", "സമയം", "samayam",
    "what medicine", "my medication", "drug",
]
APPOINTMENT_KEYWORDS = [
    "appointment", "അപ്പോയിന്റ്മെന്റ്", "doctor", "ഡോക്ടർ", "visit", "see doctor",
    "എപ്പോൾ", "eppol", "when", "സമയം", "samayam", "clinic", "ക്ലിനിക്ക്",
    "മുന്ദ്", "munde", "upcoming", "date", "തീയതി", "thiyathi",
    "next appointment", "when is my", "schedule",
]
IDENTITY_KEYWORDS = [
    "who", "ആര്", "aar", "name", "പേര്", "peru", "contact", "ബന്ധപ്പെടുക",
    "കണ്ടുമുട്ടുക", "kandumuttuka", "know", "അറിയുക", "ariyuka",
    "എന്നെ", "enne", "me", "ഞാൻ", "njan", "I am", "my name", "remember",
]
DATE_KEYWORDS = [
    "date", "തീയതി", "thiyathi", "day", "ദിവസം", "divasam", "today",
    "ഇന്ന്", "innu", "what date", "എന്ത് തീയതി", "enth thiyathi",
    "time", "സമയം", "samayam", "now", "ഇപ്പോൾ", "ippol",
    "what day", "what time", "current",
]


def classify_intent(transcript: str) -> str:
    """
    Classify intent from transcript using simple keyword matching.
    Returns one of: medication_query, appointment_query, identity_query, date_query, general.
    """
    if not transcript or not isinstance(transcript, str):
        return INTENT_GENERAL
    t = transcript.lower().strip()
    t = re.sub(r"\s+", " ", t)
    # Check in order of specificity; first match wins
    for kw in MEDICATION_KEYWORDS:
        if kw in t:
            return INTENT_MEDICATION
    for kw in APPOINTMENT_KEYWORDS:
        if kw in t:
            return INTENT_APPOINTMENT
    for kw in IDENTITY_KEYWORDS:
        if kw in t:
            return INTENT_IDENTITY
    for kw in DATE_KEYWORDS:
        if kw in t:
            return INTENT_DATE
    return INTENT_GENERAL
