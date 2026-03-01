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
    # Whisper: runs locally (openai-whisper), model is cached after first load for low latency
    # tiny | base = faster, less accurate; small | medium = slower, better (especially Malayalam)
    whisper_model: str = "base"  # Set to "base" or "tiny" in .env for faster response
    whisper_language: str = ""   # "" = auto-detect (recommended). Do not set "ml" if users speak English.
    ai_temp_dir: str = "0.5"  # optional; default is system temp for uploads
    # LLM: OpenRouter (OSS models). Uses OpenAI-compatible API.
    openrouter_api_key: str = "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"
    openrouter_model: str = "openai/gpt-oss-120b:free"  # or google/gemma-2-9b-it, etc.
    # TTS: edge-tts (free, no API key). Malayalam: ml-IN-MidhunNeural, ml-IN-SobhanaNeural
    tts_voice: str = "ml-IN-MidhunNeural"

    # Face recognition: L2 distance below this = match (face-api.js 128-d). Lower = stricter. Default 0.5.
    face_recognition_threshold: float = 0.5

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
