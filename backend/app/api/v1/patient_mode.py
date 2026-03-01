"""Patient Interaction AI: voice-based Malayalam assistant (push-to-talk)."""
import asyncio
import base64
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, status, UploadFile
from fastapi.responses import Response

from app.config import settings
from app.dependencies import get_current_caregiver_id
from app.services.patient_service import get_patient
from app.services.ai.pipeline import run_interact_pipeline
from app.services.ai.tts import text_to_speech_async

_executor = ThreadPoolExecutor(max_workers=2)
_TTS_TIMEOUT_SEC = 25

router = APIRouter(prefix="/patient", tags=["patient-ai"])


@router.get(
    "/voice-info",
    response_model=dict,
    summary="Voice pipeline status",
    description="Confirm Whisper runs locally and ffmpeg is available. No auth required.",
)
async def voice_info():
    """Return whether Whisper is local and ffmpeg is on PATH. Use this to verify local setup."""
    whisper_model = getattr(settings, "whisper_model", "base") or "base"
    whisper_language = getattr(settings, "whisper_language", "") or ""
    ffmpeg_available = bool(shutil.which("ffmpeg"))
    return {
        "whisper": "local",
        "whisper_model": whisper_model,
        "whisper_language": whisper_language or "auto",
        "ffmpeg_available": ffmpeg_available,
        "message": "Whisper runs on this server (openai-whisper). No audio is sent to any external API.",
    }


@router.post(
    "/tts",
    summary="Text-to-speech (Malayalam)",
    description="Convert text to speech; returns MP3. Use for playing assistant response aloud.",
)
async def patient_tts(
    text: str = Form(..., description="Text to speak (e.g. assistant response)"),
    caregiver_id: str = Depends(get_current_caregiver_id),
) -> Response:
    """POST form with text=... Returns audio/mpeg. No patient_id required."""
    audio_bytes = await text_to_speech_async(text)
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="TTS failed")
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post(
    "/interact",
    response_model=dict,
    summary="Patient voice interaction",
    description="Accept short audio (push-to-talk), transcribe with Whisper, classify intent, return Malayalam response. Logs transcript+intent only.",
)
async def patient_interact(
    audio: UploadFile = File(..., description="Short audio clip (e.g. webm, mp3, wav)"),
    patient_id: str = Form(..., description="Patient ID (caregiver must have access)"),
    with_tts: bool = Form(False, description="Include response as TTS audio (base64) for fast demo"),
    caregiver_id: str = Depends(get_current_caregiver_id),
):
    """
    POST multipart/form-data: audio file + patient_id.
    Returns { transcript, intent, response }. Does not store raw audio.
    """
    try:
        pid = UUID(patient_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patient_id")

    if not get_patient(pid, caregiver_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found or access denied")

    # Save upload to temp file (deleted inside pipeline after transcription)
    suffix = Path(audio.filename or "audio").suffix or ".webm"
    if suffix.lower() not in (".webm", ".mp3", ".wav", ".m4a", ".ogg", ".mp4", ".flac"):
        suffix = ".webm"
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = Path(tmp.name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save audio",
        ) from e

    try:
        loop = asyncio.get_event_loop()
        transcript, intent, response = await loop.run_in_executor(
            _executor,
            lambda: run_interact_pipeline(tmp_path, pid, caregiver_id),
        )
    except Exception as e:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Interaction failed",
        ) from e
    # If pipeline did not delete (e.g. transcribe failed early), clean up
    if tmp_path.exists():
        try:
            tmp_path.unlink()
        except OSError:
            pass

    out: dict = {
        "transcript": transcript,
        "intent": intent,
        "response": response,
    }
    if with_tts and response:
        try:
            audio_bytes = await asyncio.wait_for(
                text_to_speech_async(response),
                timeout=_TTS_TIMEOUT_SEC,
            )
            if audio_bytes:
                out["response_audio_base64"] = base64.b64encode(audio_bytes).decode("ascii")
                out["response_audio_media_type"] = "audio/mpeg"
        except asyncio.TimeoutError:
            pass
    return out
