# Cognitive Stability Monitoring — Backend

FastAPI backend for the caregiver-oriented cognitive stability monitoring system.

## Setup

1. Create `.env.local` from `.env.example` in the **backend** folder and fill in Supabase credentials. (Config loads from the backend directory so it works even when running from the project root.)
2. In Supabase: **Dashboard → SQL Editor** → run `supabase_schema.sql` to create tables, then run any migrations in `migrations/` (e.g. `add_known_faces_photo_url.sql`, `add_patient_ai_logs.sql`, `add_restricted_areas.sql`).
3. **Storage buckets** (optional; backend can create on first upload): `known-faces` (public) for Known faces photos; `restricted-areas` (public) for restricted area images.
4. Install dependencies: `pip install -r requirements.txt`
5. Start: `uvicorn app.main:app --reload`

## Patient AI (voice assistant)

- **Whisper:** Runs **locally** via `openai-whisper` (no API key). Set `WHISPER_MODEL=small` (or `medium`) for better transcription. `WHISPER_LANGUAGE` empty = auto-detect (English + Malayalam); set `ml` for Malayalam only.
- **ffmpeg required:** Whisper decodes audio (webm, mp3, etc.) using **ffmpeg**. Install and add to PATH: **Windows:** `winget install ffmpeg` or [download](https://ffmpeg.org/download.html).
- **LLM:** **OpenRouter** (OSS models). Set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL`. Get a key at [openrouter.ai](https://openrouter.ai). For free models, enable “Free model publication” at [openrouter.ai/settings/privacy](https://openrouter.ai/settings/privacy). On 429 rate limit, try another model or add a provider key.
- **TTS:** **edge-tts** (no API key). Malayalam voice: `TTS_VOICE=ml-IN-MidhunNeural` (or `ml-IN-SobhanaNeural`).

## Known faces & face recognition

- **Known faces:** Add with name, relationship, and photo. Photos are uploaded to Supabase Storage (`known-faces` bucket). Optional 128-d face embedding (from frontend face-api.js) is stored for recognition.
- **Recognize face:** `POST /api/v1/patients/{id}/recognize-face` with body `{ "embedding": [128 floats] }` returns the best-matching known face (name, relationship) or `{ "matched": false }`. Threshold configurable via `FACE_RECOGNITION_THRESHOLD` (default 0.5).

## Restricted areas

- **Per patient:** Add restricted zones with an optional image. Each area has two toggles: **turn off camera** and **turn off audio**. Stored in `patient_restricted_areas`; images in Storage bucket `restricted-areas`.

## Notifications

- **GET /api/v1/notifications?patient_id=...** — Returns alerts (unresolved), upcoming appointments (next 24h), and medicine reminders for the caregiver’s patients. Optional `patient_id` filters to that patient only.

## Endpoints

- `GET /health` — Health check
- `GET /api/v1/` — API root
- **Voice:** `GET /api/v1/patient/voice-info` — Whisper/TTS status  
  `POST /api/v1/patient/interact` — Voice interaction (multipart: audio, patient_id, optional with_tts)  
  `POST /api/v1/patient/tts` — Text-to-speech (form: text) → returns MP3
- **Patients:** `GET/POST /api/v1/patients/{id}/known-faces`, `DELETE .../known-faces/{face_id}`, `POST .../recognize-face`; `GET/POST/PATCH/DELETE .../restricted-areas`, `.../restricted-areas/{area_id}`
- **Notifications:** `GET /api/v1/notifications?patient_id=...` (optional)
- `GET /docs` — OpenAPI docs
