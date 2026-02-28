# Cognitive Stability Monitoring System

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth-3ecf8e.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8.svg)](https://tailwindcss.com/)

Caregiver-oriented cognitive stability monitoring for dementia care, with patient onboarding, medications, appointments, caregiver surveys, and an ESP32-CAM vision module integration path.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment & Configuration](#environment--configuration)
- [Documentation](#documentation)
- [Schema Reference](#schema-reference)
- [License](#license)

---

## Features

- **Caregiver auth** — Sign up / sign in via Supabase Auth; JWT-protected API
- **Patient management** — Create, edit, soft-delete patients; full dementia-care profile (severity, diagnosis, baseline, medications, emergency contacts)
- **Medications** — List and add medications with dosage, frequency, and times
- **Appointments** — Track scheduled appointments with status (scheduled, completed, missed, cancelled)
- **Caregiver surveys** — Weekly surveys (confusion, safety concern, stress level)
- **Stability overview** — Stub stability endpoint and badge for future cognitive stability pipeline
- **Known faces & camera events** — Frontend placeholders; backend schema ready for pgvector and ESP32-CAM integration

---

## Project Structure

```
Intersect/
├── backend/                    # FastAPI API + Supabase client
│   ├── app/
│   │   ├── api/v1/             # API routes — see [API Design](docs/API_DESIGN.md)
│   │   │   ├── router.py       # Router registration
│   │   │   └── patients.py     # Patients, medications, appointments, surveys, stability
│   │   ├── core/               # Security, config, exceptions
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── services/           # Business logic (patient, medication, appointment, survey)
│   │   ├── config.py           # Settings from environment
│   │   ├── dependencies.py     # Auth dependency (Supabase JWT)
│   │   └── main.py             # FastAPI app entry
│   ├── migrations/             # One-off SQL for existing DBs (run in Supabase SQL Editor)
│   │   ├── add_dementia_care_fields.sql
│   │   ├── add_severity_history_diagnosis_details.sql
│   │   └── fix_lat_lng_overflow.sql
│   ├── supabase_schema.sql     # Full DB schema — see [Full Schema](docs/SCHEMA.md)
│   ├── .env.example            # Backend env template
│   ├── pyproject.toml          # Python deps (FastAPI, Supabase, PyJWT, etc.)
│   └── README.md               # Backend-specific notes
│
├── frontend/                   # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/         # UI and layout (Layout, Sidebar, PatientLayout, auth, patients)
│   │   ├── contexts/           # AuthContext (Supabase session)
│   │   ├── hooks/              # usePatient, usePatients
│   │   ├── lib/                # api.ts (fetch + Bearer), supabase.ts
│   │   ├── pages/              # Landing, Login, Signup, Dashboard, Patient list/new, patient sub-pages
│   │   └── types/              # TypeScript types (Patient, Medication, Appointment, etc.)
│   ├── .env.example            # Frontend env template
│   ├── package.json            # Scripts: dev, build, preview
│   ├── vite.config.ts          # Proxy /api → backend
│   └── README.md               # Frontend-specific notes
│
└── docs/                       # Design and reference docs
    ├── API_DESIGN.md           # API endpoints, auth, request/response shapes
    ├── DB_SCHEMA.md            # Database schema overview and table definitions
    ├── SCHEMA.md               # Full schema reference (current state)
    ├── BACKEND_ARCHITECTURE.md  # Backend structure and patterns
    ├── FRONTEND_DESIGN.md      # Frontend structure and patterns
    └── DESIGN_INDEX.md         # Doc index
```

---

## Prerequisites

- **Python 3.11+** — Backend
- **Node.js 18+** — Frontend (npm or yarn)
- **Supabase project** — Postgres + Auth; run [`backend/supabase_schema.sql`](backend/supabase_schema.sql) in the SQL Editor (and any [migrations](backend/migrations/) if the DB already existed)

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env.local   # or .env — fill Supabase URL, service role key, JWT secret
pip install -e .             # or: pip install -r requirements.txt if you use requirements.txt
uvicorn app.main:app --reload
```

API: [http://localhost:8000](http://localhost:8000)  
Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # fill VITE_SUPABASE_* and VITE_API_URL
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

The frontend proxies `/api` to the backend (see [`frontend/vite.config.ts`](frontend/vite.config.ts)), so use `VITE_API_URL=http://localhost:8000/api/v1` (or leave default).

---

## Environment & Configuration

| File | Purpose |
|------|--------|
| [`backend/.env.example`](backend/.env.example) | Template: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGINS` |
| [`frontend/.env.example`](frontend/.env.example) | Template: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` |

Copy to `.env` or `.env.local` and fill in your Supabase project values. Do not commit secrets.

---

## Documentation

| Document | Description |
|----------|-------------|
| [**API Design**](docs/API_DESIGN.md) | Endpoints, auth, request/response schemas |
| [**DB Schema**](docs/DB_SCHEMA.md) | Database overview and table definitions |
| [**Full Schema Reference**](docs/SCHEMA.md) | Complete schema as of current state (tables, columns, indexes) |
| [**Backend Architecture**](docs/BACKEND_ARCHITECTURE.md) | Backend layout and patterns |
| [**Frontend Design**](docs/FRONTEND_DESIGN.md) | Frontend layout and patterns |
| [**Design Index**](docs/DESIGN_INDEX.md) | Index of all design docs |

---

## Schema Reference

The application uses **Supabase (PostgreSQL)** with schema defined in:

- **[`backend/supabase_schema.sql`](backend/supabase_schema.sql)** — Base schema (caregivers, patients, medications, appointments, surveys, known_faces, camera_events, alerts, etc.). Run this in the Supabase SQL Editor on a new project.
- **Optional migrations** in [`backend/migrations/`](backend/migrations/) — Apply if the database already existed before new columns were added (e.g. dementia fields, severity, lat/long type fix).

A single **full schema reference** (tables, columns, types, indexes) is maintained in **[`docs/SCHEMA.md`](docs/SCHEMA.md)** for further reference.

---

## License

Proprietary. All rights reserved.
