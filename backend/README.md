# Cognitive Stability Monitoring — Backend

FastAPI backend for the caregiver-oriented cognitive stability monitoring system.

## Setup

1. Create `.env.local` from `.env.example` and fill in Supabase credentials.
2. In Supabase: **Dashboard → SQL Editor** → run `supabase_schema.sql` to create tables.
3. Install dependencies: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --reload`

## Patient AI (voice assistant)

- **Whisper:** Runs **locally** via `openai-whisper` (no API key). For better transcription: `WHISPER_MODEL=small` (or `medium`). Leave `WHISPER_LANGUAGE` unset for auto-detect, or set to `ml` for Malayalam only.
- **ffmpeg required:** Whisper decodes audio (webm, mp3, etc.) using **ffmpeg**. Install and add to PATH:  
  **Windows:** `winget install ffmpeg` or [download](https://ffmpeg.org/download.html) and add the `bin` folder to PATH.
- **LLM:** Uses **OpenRouter** (OSS models). Set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL` (e.g. `meta-llama/llama-3.2-3b-instruct:free`). Get a key at [openrouter.ai](https://openrouter.ai).

## Endpoints

- `GET /health` — Health check
- `GET /api/v1/` — API root
- `POST /api/v1/patient/interact` — Voice interaction (multipart: audio + patient_id)
- `GET /docs` — OpenAPI docs
