"""Orchestrate: transcribe -> intent -> context -> LLM -> log -> return. Single request, no repeated DB for same patient."""
import logging
from pathlib import Path
from uuid import UUID

from app.services.patient_service import get_patient

logger = logging.getLogger(__name__)
from app.services.ai.transcribe import transcribe_audio
from app.services.ai.intent import classify_intent
from app.services.ai.context_builder import build_context_for_intent
from app.services.ai.llm import generate_response
from app.services.ai.ai_log import log_interaction


def run_interact_pipeline(
    audio_path: Path,
    patient_id: UUID,
    caregiver_id: str,
) -> tuple[str, str, str]:
    """
    Run full pipeline: transcribe, classify intent, build context, generate response, log.
    Returns (transcript, intent, response).
    Temp file at audio_path is deleted inside transcribe_audio.
    """
    # 1) Transcribe (deletes file after)
    transcript = transcribe_audio(audio_path)
    if not transcript:
        transcript = ""

    # 2) Intent
    intent = classify_intent(transcript)
    logger.info("Pipeline: transcript=%r intent=%s", (transcript or "")[:80], intent)

    # 3) Verify access and build minimal context (single patient fetch cached per request via one call)
    patient = get_patient(patient_id, caregiver_id)
    if not patient:
        response = "ക്ഷമിക്കണം, ഈ രോഗിയുടെ വിവരങ്ങൾ ലഭ്യമല്ല."
    else:
        context = build_context_for_intent(patient_id, caregiver_id, intent)
        response = generate_response(transcript, intent, context)

    # 4) Log only transcript, intent, response, timestamp (DB default)
    log_interaction(patient_id, transcript, intent, response)

    return transcript, intent, response
