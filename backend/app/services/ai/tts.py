"""Text-to-speech for assistant responses using edge-tts (Malayalam). No API key required."""
import io
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Malayalam neural voice (Edge TTS). Use ml-IN-SobhanaNeural for female.
DEFAULT_VOICE = "ml-IN-MidhunNeural"


async def text_to_speech_async(text: str) -> bytes:
    """
    Generate MP3 audio from text using edge-tts. Runs in event loop (non-blocking).
    Returns raw MP3 bytes; empty bytes if TTS fails.
    """
    text = (text or "").strip()
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
