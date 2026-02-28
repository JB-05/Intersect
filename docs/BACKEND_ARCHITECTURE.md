# Backend Architecture — Cognitive Stability Monitoring System

**Version:** 0.1 (Draft)  
**Stack:** FastAPI, Supabase (Postgres + Auth), SQLAlchemy, Python 3.11+

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL / LAN                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Caregiver Web App          Patient Device (GPS)         ESP32-CAM          │
│  (HTTPS)                    (periodic POST)              (MJPEG stream)     │
└────────┬────────────────────────────┬────────────────────────────┬─────────┘
         │                            │                            │
         ▼                            ▼                            │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOCAL SERVER (same LAN as ESP32)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌─────────────────┐│
│  │   FastAPI Backend    │    │  Camera Worker        │    │  Supabase DB    ││
│  │   (REST API)         │◄───│  (Separate Process)   │    │                 ││
│  │                      │    │                      │    │  - All tables   ││
│  │  - Validates Supabase JWT │  │  - Pull MJPEG stream  │    │  - Supabase DB  ││
│  │  - CRUD endpoints    │    │  - 1 FPS sampling     │    │                 ││
│  │  - Stability engine  │    │  - Face detect/recog  │    │                 ││
│  │  - Teleconsult gen   │    │  - Motion analysis    │    │                 ││
│  └──────────┬───────────┘    │  - Event generation  │    └────────┬────────┘│
│             │                 │  - TTS trigger      │             │         │
│             │                 └─────────────────────┘             │         │
│             │                              │                       │         │
│             └─────────────────────────────┴──────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings (env, DB URL, JWT secret)
│   ├── dependencies.py         # DI (get_current_caregiver_id)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py       # Aggregates all route modules
│   │   │   ├── auth.py
│   │   │   ├── caregivers.py
│   │   │   ├── patients.py
│   │   │   ├── known_faces.py
│   │   │   ├── medications.py
│   │   │   ├── appointments.py
│   │   │   ├── surveys.py
│   │   │   ├── camera_events.py
│   │   │   ├── location.py
│   │   │   ├── alerts.py
│   │   │   ├── stability.py
│   │   │   └── internal.py     # Internal endpoints (camera worker, device)
│   │   │
│   │   └── deps.py             # Shared API dependencies
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py         # JWT, password hashing
│   │   └── exceptions.py      # Custom exceptions, handlers
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── *.py               # SQLAlchemy models (one per table)
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── *.py               # Pydantic request/response schemas
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py     # Supabase JWT validation, caregiver profile sync
│   │   ├── patient_service.py
│   │   ├── medication_service.py
│   │   ├── appointment_service.py
│   │   ├── survey_service.py
│   │   ├── stability_engine.py # Deviation logic, level calculation
│   │   ├── teleconsult_service.py
│   │   └── face_embedding_service.py
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── *.py               # Optional: data access layer
│   │
│
├── worker/                     # Camera worker (separate process)
│   ├── __init__.py
│   ├── main.py                # Worker entry point
│   ├── config.py
│   ├── stream_client.py       # MJPEG pull from ESP32
│   ├── face_processor.py      # Face detection, embedding, recognition
│   ├── motion_analyzer.py      # Inactivity detection
│   ├── event_sender.py        # POST events to backend
│   └── tts_client.py          # Optional: TTS trigger (local or API)
│
├── tests/
│   ├── conftest.py            # Pytest fixtures
│   ├── test_api/
│   └── test_services/
│
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 3. Key Components

### 3.1 FastAPI Application

- **Async** throughout (async def, async SQLAlchemy)
- **CORS** configured for caregiver web app origin
- **Middleware:** request logging, error handling
- **Routers:** mounted at `/api/v1`
- **OpenAPI** at `/docs`, `/redoc`

### 3.2 Authentication (Supabase Auth)

**Demo approach:** Frontend uses Supabase client (`supabase.auth.signUp`, `signInWithPassword`). Backend validates Supabase-issued JWT.

1. **Signup/Login:** Handled by Supabase Auth (frontend or optional proxy endpoints)
2. **Protected routes:** `Authorization: Bearer <supabase_access_token>`
3. **Validation:** Verify JWT using Supabase project JWT secret. Extract `sub` (user id) = `caregiver_id`
4. **Profile:** On first login, ensure `caregivers` row exists for `auth.uid()` (create if missing)
5. **Refresh:** Supabase client handles token refresh; no custom refresh endpoint needed

### 3.3 Authorization (RBAC)

- **Caregiver** can access only patients linked via `patient_caregiver_map`
- **Primary caregiver** only: patient profile edit, known faces management
- **Secondary caregiver**: view, log meds/appointments, submit surveys
- Internal endpoints (`/internal/*`): API key or shared secret, not JWT

### 3.4 Stability Deviation Engine

**Location:** `services/stability_engine.py`

**Inputs (rolling 2–4 week window):**

- Medication adherence: 14-day rolling % taken
- Appointment misses: count vs baseline
- Caregiver survey: stress level trend, confusion/safety flags
- Camera events: frequency of `unknown_person`, `inactivity` vs baseline
- Geofence: breach count

**Baseline:** First 14 days after `baseline_start_date`

**Logic (rule-based for MVP):**

- Score each domain (0–1 or categorical)
- Multi-domain confirmation: e.g. 2+ domains deviate → escalate
- Escalation levels:
  - **Level 1 (Informational):** Single domain minor deviation
  - **Level 2 (Attention Required):** 2+ domains or one domain severe
  - **Level 3 (Teleconsult Recommended):** Sustained Level 2 or critical flags

**Output:**

- Stability level
- Domain breakdown
- Alerts generated when level changes
- Cached per patient, recalculated on: new survey, new event, new med log, scheduled job

### 3.5 Face Embedding Service

- **Input:** Image file (JPEG/PNG) from caregiver upload
- **Process:** Extract face, compute embedding (e.g. FaceNet, deepface, or InsightFace)
- **Storage:** Embedding in `known_faces.embedding`
- **Recognition:** Camera worker loads embeddings for patient, compares frame embeddings via cosine similarity

### 3.6 Camera Worker

**Separate process** (not part of FastAPI), runs on same machine or LAN-accessible server.

**Pipeline:**

1. **Stream client:** Connect to ESP32-CAM MJPEG URL, sample at 1 FPS
2. **Face detector:** Detect faces in frame (e.g. OpenCV Haar, MTCNN, or RetinaFace)
3. **Face recognizer:** For each face, compute embedding, compare to known_faces (from API/DB or cached), apply confidence threshold
4. **Motion analyzer:** Track movement of primary person (e.g. bounding box centroid), detect sustained minimal movement
5. **Event sender:** POST to `POST /internal/camera-events`
6. **TTS trigger:** If enabled, call local TTS or API on recognized/unknown
7. **Cooldown:** Prevent repeated TTS for same event type (e.g. 5 min cooldown)

**Failure handling:**

- Stream disconnect → log, optionally notify caregiver via alert
- API unreachable → queue events in memory/disk, retry
- Auto-restart via systemd/supervisor

---

## 4. Database Access (Supabase Postgres)

- **SQLAlchemy 2.0** (async) with `asyncpg` driver
- **Connection URL:** Use Supabase **Transaction pooler** URL (port 6543) for long-lived connections
  - Format: `postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- **Direct URL** (port 5432): For migrations only; pooler for app runtime
- **pgvector:** Enabled in Supabase; use for `known_faces.embedding`

---

## 5. Internal API Security

- `/internal/*` endpoints: Require `X-API-Key` header or `Authorization: Internal <secret>`
- Shared secret in env: `INTERNAL_API_SECRET`
- Camera worker and device clients use this; caregiver app does not

---

## 6. Configuration (Environment)

```
# Supabase
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=<anon key - for optional client-side>
SUPABASE_SERVICE_ROLE_KEY=<service role - backend admin operations>
SUPABASE_JWT_SECRET=<JWT secret for verifying tokens - Project Settings → API>

# Internal API (camera worker, device)
INTERNAL_API_SECRET=<for /internal/* endpoints>

# App
CORS_ORIGINS=https://caregiver-app.example.com
FACE_EMBEDDING_MODEL=insightface
```

---

## 7. Deployment (Demo with Supabase)

- **DB & Auth:** Hosted on Supabase; no self-hosting
- **Backend:** FastAPI on Railway, Render, Fly.io, or local; connects to Supabase Postgres
- **Worker:** Runs locally (same LAN as ESP32) or on a server with camera stream access
- **SSL:** HTTPS for API; Supabase handles DB encryption

---

## 8. Supabase Setup (Demo)

1. **Create project** at supabase.com
2. **Enable pgvector:** SQL Editor → `CREATE EXTENSION IF NOT EXISTS vector;`
3. **Run migrations:** Apply schema from DB_SCHEMA.md (omit refresh_tokens)
4. **Create caregiver on signup:** Database trigger or FastAPI hook when `auth.users` gets new row — insert into `caregivers(id, full_name)` using `auth.uid()` and `raw_user_meta_data->>'full_name'`
5. **API keys:** Use `SUPABASE_JWT_SECRET` (Project Settings → API → JWT Secret) to verify tokens; use `SUPABASE_SERVICE_ROLE_KEY` for admin operations (e.g. creating caregiver profile server-side)
6. **Realtime (optional):** Subscribe to `alerts` table for live notification push

---

## 9. Open Questions / TBD

- [ ] Caching layer (Redis) for stability scores? Or DB-only for MVP
- [ ] Background job scheduler (Celery, APScheduler) for periodic stability recalculation
- [ ] Exact face embedding model choice (InsightFace vs deepface vs custom)
- [ ] TTS: local (espeak, pyttsx) vs cloud API
- [ ] Worker-to-backend: pull config (worker fetches known_faces) vs push (backend pushes on change)
