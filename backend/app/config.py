from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from backend dir so keys load even when uvicorn is run from project root
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_LOCAL = _BACKEND_DIR / ".env.local"
_ENV = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_ENV_LOCAL), str(_ENV)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Internal API
    internal_api_secret: str = ""

    # App
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Patient AI (voice assistant)
    # Whisper: runs locally (openai-whisper), no API key needed
    # For better ASR accuracy use small/medium (base is fast but less accurate, especially for Malayalam)
    whisper_model: str = "small"  # tiny | base | small | medium | large-v3
    whisper_language: str = ""   # "" = auto-detect (English + Malayalam); "en" or "ml" to force one
    ai_temp_dir: str = ""  # optional; default is system temp for uploads
    # LLM: OpenRouter (OSS models). Uses OpenAI-compatible API.
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.2-3b-instruct:free"  # or google/gemma-2-9b-it, etc.
    # TTS: edge-tts (free, no API key). Malayalam: ml-IN-MidhunNeural, ml-IN-SobhanaNeural
    tts_voice: str = "ml-IN-MidhunNeural"

    # Face recognition: L2 distance below this = match (face-api.js 128-d). Lower = stricter. Default 0.5.
    face_recognition_threshold: float = 0.5

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
