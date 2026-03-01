# Cognitive Stability Monitoring — Frontend

Caregiver web app for the cognitive stability monitoring system.

## Setup

1. Copy `.env.example` to `.env` (or `.env.local`) and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_API_URL`.
2. Install: `npm install`
3. Run: `npm run dev`

## Stack

- Vite + React + TypeScript
- Supabase Auth (client-side)
- React Router
- TanStack Query
- face-api.js (face detection & 128-d descriptors for Known faces and Face recognition)

## Patient features

- **Overview** — Stability badge, quick links to medications, appointments, Known faces, Face recognition, Restricted areas, Voice assistant, Settings
- **Known faces** — Add people with a photo, name, and relationship. Optional face embedding is computed (face-api.js) and sent so the face can be recognized later.
- **Face recognition** — Start camera; face-api.js detects faces and sends the descriptor to the API. When a known face is matched, TTS plays in Malayalam: “ഇത് [Name], [Relationship].” (relationships mapped to hardcoded Malayalam words)
- **Restricted areas** — Upload an image of each restricted zone; two switches per area to **turn off camera** and/or **turn off audio**
- **Voice assistant** — Record → send audio → get transcript, intent, and Malayalam response; optional TTS to play the response aloud

## Notifications

- **Notification bell** (header) — Fetches from `GET /notifications`; shows alerts, appointment reminders, and medicine reminders. When you’re on a patient page, notifications are filtered to that patient only.
