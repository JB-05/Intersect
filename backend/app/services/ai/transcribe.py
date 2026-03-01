"""Transcribe short audio with Whisper. Deletes the temp file after use. Requires ffmpeg on PATH."""
import logging
import shutil
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

FFMPEG_MSG = (
    "Whisper needs ffmpeg to decode audio. Install it and add to PATH: "
    "Windows: winget install ffmpeg  or  choco install ffmpeg  |  "
    "See https://ffmpeg.org/download.html"
)


def _check_ffmpeg() -> None:
    if not shutil.which("ffmpeg"):
        raise RuntimeError(FFMPEG_MSG)


_cached_whisper_model = None
_cached_whisper_name = None


def _get_whisper_model():
    """Load Whisper model once and cache it. Huge latency win after first request."""
    global _cached_whisper_model, _cached_whisper_name
    import whisper
    model_name = getattr(settings, "whisper_model", "base") or "base"
    if _cached_whisper_model is not None and _cached_whisper_name == model_name:
        return _cached_whisper_model
    _cached_whisper_model = whisper.load_model(model_name, device="cpu", download_root=None)
    _cached_whisper_name = model_name
    return _cached_whisper_model


# Biases Whisper decoding. Keep language-neutral so English stays English and Malayalam stays Malayalam.
# First line steers auto-detect: transcribe in the language spoken.
_WHISPER_INITIAL_PROMPT = (
    "Transcribe in the same language the user speaks. If English, output English. If Malayalam, output Malayalam. "
    "Medications, appointment, medicine, when, today, date, time, dose, doctor, nurse. "
    "മരുന്ന്, എപ്പോൾ, ഡോക്ടർ, തീയതി, ഇന്ന്, മരുന്ന് എടുക്കണം, ക്ലിനിക്ക്."
)


def transcribe_audio(audio_path: Path) -> str:
    """
    Transcribe audio file to text using Whisper.
    Deletes the file at audio_path after transcription. Requires ffmpeg on PATH.
    Runs 100% locally (no API calls).
    """
    model_name = getattr(settings, "whisper_model", "base") or "base"
    lang = (getattr(settings, "whisper_language", None) or "").strip() or None  # None = auto-detect
    try:
        _check_ffmpeg()
        logger.info("Whisper (local): model=%s language=%s transcribing %s", model_name, lang or "auto", audio_path.name)
        model = _get_whisper_model()
        kwargs = {"fp16": False, "initial_prompt": _WHISPER_INITIAL_PROMPT}
        if lang:
            kwargs["language"] = lang
        result = model.transcribe(str(audio_path), **kwargs)
        text = (result.get("text") or "").strip()
        if result.get("language"):
            logger.info("Whisper (local): done. language=%s transcript length=%d", result.get("language"), len(text))
        else:
            logger.info("Whisper (local): done. transcript length=%d chars", len(text))
    except FileNotFoundError as e:
        raise RuntimeError(FFMPEG_MSG) from e
    except Exception:
        text = ""
    finally:
        try:
            audio_path.unlink(missing_ok=True)
        except OSError:
            pass
    return text
