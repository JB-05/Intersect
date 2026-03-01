"""Text-to-speech for assistant responses using edge-tts (Malayalam). No API key required."""
import io
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Malayalam neural voice (Edge TTS). Use ml-IN-SobhanaNeural for female.
DEFAULT_VOICE = "ml-IN-MidhunNeural"

# Cap length so TTS and playback stay short (~20–30 s). ~400 chars ≈ 25–35 s speech.
MAX_TTS_CHARS = 400


def _truncate_for_tts(text: str, max_chars: int = MAX_TTS_CHARS) -> str:
    """Keep text short for fast TTS and short playback. Prefer cutting at sentence end."""
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    short = text[: max_chars + 1]
    last_dot = short.rfind(".")
    last_danda = short.rfind("।")
    cut = max(last_dot, last_danda)
    if cut > max_chars // 2:
        return text[: cut + 1].strip()
    return text[:max_chars].rstrip()


async def text_to_speech_async(text: str) -> bytes:
    """
    Generate MP3 audio from text using edge-tts. Runs in event loop (non-blocking).
    Long text is truncated so playback stays under ~30 seconds.
    Returns raw MP3 bytes; empty bytes if TTS fails.
    """
    text = _truncate_for_tts(text or "")
    if not text:
        return b""
    voice = getattr(settings, "tts_voice", None) or DEFAULT_VOICE
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                buf.write(chunk["data"])
        result = buf.getvalue()
        logger.info("TTS: generated %d bytes for %d chars (voice=%s)", len(result), len(text), voice)
        return result
    except Exception as e:
        logger.warning("TTS failed: %s", e)
        return b""
