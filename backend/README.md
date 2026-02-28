# Cognitive Stability Monitoring — Backend

FastAPI backend for the caregiver-oriented cognitive stability monitoring system.

## Setup

1. Create `.env.local` from `.env.example` and fill in Supabase credentials.
2. In Supabase: **Dashboard → SQL Editor** → run `supabase_schema.sql` to create tables.
3. Install dependencies: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --reload`

## Endpoints

- `GET /health` — Health check
- `GET /api/v1/` — API root
- `GET /docs` — OpenAPI docs
