# Database Schema — Cognitive Stability Monitoring System

**Version:** 0.1 (Draft)  
**Database:** Supabase (PostgreSQL 15+)

> **Demo note:** Supabase is used for hosted Postgres, Auth, and Realtime. Schema runs on Supabase Postgres with `pgvector` extension enabled for face embeddings.

---

## 1. Entity Relationship Overview

```
auth.users (Supabase) ─── caregivers (profile)
         │                    │
         │                    └── patient_caregiver_map ──┬── patients
         │                                                  │
         └── (Supabase Auth handles JWT/refresh)            ├── medications
                                                            ├── medication_logs
                                                            ├── appointments
                                                            ├── caregiver_surveys
                                                            ├── known_faces
                                                            ├── camera_events
                                                            ├── location_logs
                                                            ├── alerts
                                                            └── monitoring_config
```

---

## 2. Table Definitions

### 2.1 `caregivers`

**Supabase Auth integration:** `id` = `auth.users.id`. Profile is created via trigger or app logic on first signup.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, REFERENCES auth.users(id) ON DELETE CASCADE | Same as Supabase auth user id |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |
| is_active | BOOLEAN | DEFAULT true | Soft delete flag |

**Note:** Email/password live in `auth.users`. No `password_hash` or `email` in this table.

**Indexes:** `is_active`

---

### 2.2 `patients`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| full_name | VARCHAR(255) | NOT NULL | |
| date_of_birth | DATE | | |
| home_latitude | DECIMAL(11, 8) | | Home geolocation |
| home_longitude | DECIMAL(11, 8) | | Home geolocation |
| geofence_radius_km | DECIMAL(5, 2) | DEFAULT 0.5 | Breach threshold in km |
| baseline_start_date | DATE | NOT NULL | First day of baseline period |
| notes | TEXT | | |
| monitoring_paused | BOOLEAN | DEFAULT false | Privacy: pause vision/location |
| monitoring_paused_at | TIMESTAMPTZ | | When paused |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | Soft delete |

**Indexes:** `deleted_at`, `baseline_start_date`

---

### 2.3 `patient_caregiver_map`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| caregiver_id | UUID | FK→caregivers, NOT NULL | |
| role | VARCHAR(50) | DEFAULT 'secondary' | 'primary' or 'secondary' |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| UNIQUE(patient_id, caregiver_id) | | | One mapping per pair |

**Constraints:** Only one `primary` per patient. Edits to patient profile allowed for primary only.

**Indexes:** `patient_id`, `caregiver_id`

---

### 2.4 `medications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | e.g. "Donepezil" |
| dosage | VARCHAR(100) | | e.g. "10mg" |
| frequency | VARCHAR(50) | NOT NULL | daily, twice_daily, weekly, etc. |
| times | TIME[] | | Scheduled times (e.g. 08:00, 20:00) |
| notes | TEXT | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `patient_id`, `is_active`

---

### 2.5 `medication_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| medication_id | UUID | FK→medications, NOT NULL | |
| scheduled_at | TIMESTAMPTZ | NOT NULL | When dose was due |
| status | VARCHAR(20) | NOT NULL | taken, missed, delayed |
| actual_at | TIMESTAMPTZ | | When taken (for taken/delayed) |
| notes | TEXT | | |
| logged_by | UUID | FK→caregivers | Who logged it |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `medication_id`, `scheduled_at`, `(medication_id, scheduled_at)` unique

---

### 2.6 `appointments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| scheduled_at | TIMESTAMPTZ | NOT NULL | |
| status | VARCHAR(20) | DEFAULT 'scheduled' | scheduled, completed, missed, cancelled |
| location | VARCHAR(255) | | |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `patient_id`, `scheduled_at`, `status`

---

### 2.7 `caregiver_surveys`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| caregiver_id | UUID | FK→caregivers, NOT NULL | |
| week_ending | DATE | NOT NULL | End of survey week |
| confusion_increased | BOOLEAN | NOT NULL | |
| safety_concern_increased | BOOLEAN | NOT NULL | |
| stress_level | SMALLINT | NOT NULL, CHECK (1-5) | 1–5 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| UNIQUE(patient_id, week_ending) | | | One survey per patient per week |

**Indexes:** `patient_id`, `week_ending`

---

### 2.8 `known_faces`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | e.g. "Dr. Smith" |
| relationship | VARCHAR(100) | | e.g. "Doctor", "Family" |
| embedding | VECTOR(128) | | Face embedding (pgvector) or BYTEA if no pgvector |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Supabase:** Enable `pgvector` extension in Supabase SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;`

**Indexes:** `patient_id`. Optional: HNSW/IVFFlat on embedding for similarity search.

---

### 2.9 `camera_events`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| event_type | VARCHAR(50) | NOT NULL | recognized_person, unknown_person, inactivity |
| detected_at | TIMESTAMPTZ | NOT NULL | |
| confidence | DECIMAL(5, 4) | | 0–1 for recognized_person |
| known_face_id | UUID | FK→known_faces | If recognized_person |
| duration_seconds | INTEGER | | For inactivity |
| metadata | JSONB | | Extra fields if needed |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `patient_id`, `detected_at`, `event_type`, `(patient_id, detected_at)` composite

---

### 2.10 `location_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| device_id | VARCHAR(255) | | Patient device identifier |
| latitude | DECIMAL(11, 8) | NOT NULL | |
| longitude | DECIMAL(11, 8) | NOT NULL | |
| distance_from_home_km | DECIMAL(8, 4) | | Computed on insert |
| recorded_at | TIMESTAMPTZ | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `patient_id`, `recorded_at`

---

### 2.11 `alerts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| level | VARCHAR(30) | NOT NULL | informational, attention_required, teleconsult_recommended |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | | |
| domain | VARCHAR(50) | | medication, appointment, survey, camera, geofence |
| acknowledged_at | TIMESTAMPTZ | | |
| resolved_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| metadata | JSONB | | Supporting data |

**Indexes:** `patient_id`, `level`, `created_at`, `acknowledged_at`

---

### 2.12 `monitoring_config`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, UNIQUE, NOT NULL | One config per patient |
| esp32_stream_url | VARCHAR(500) | | MJPEG URL for camera worker |
| inactivity_threshold_seconds | INTEGER | DEFAULT 300 | |
| face_confidence_threshold | DECIMAL(5, 4) | DEFAULT 0.85 | Below = unknown |
| tts_enabled | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

### 2.13 `teleconsult_summaries` (optional, for export/share)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| patient_id | UUID | FK→patients, NOT NULL | |
| generated_at | TIMESTAMPTZ | DEFAULT now() | |
| summary_text | TEXT | | Generated narrative |
| stability_level | VARCHAR(30) | | |
| domains_snapshot | JSONB | | Point-in-time domain scores |
| created_by | UUID | FK→caregivers | |

**Indexes:** `patient_id`, `generated_at`

---

### 2.14 `refresh_tokens` — **Not used with Supabase Auth**

Supabase Auth handles refresh tokens. This table is **omitted** when using Supabase Auth.

---

## 3. Migrations Strategy

**Supabase options:**
- **SQL Editor:** Run migrations directly in Supabase Dashboard → SQL Editor
- **Supabase CLI:** `supabase db push` with local migration files
- **Schema:** Apply via Supabase SQL Editor; run `supabase_schema.sql`

**Connection strings:**
- **Direct** (migrations, pgvector): Project Settings → Database → Connection string (Session mode)
- **Pooler** (app): Use "Transaction" pooler URL for serverless/long-lived connections

---

## 4. Data Retention (TBD)

- `camera_events`: Retain 90 days? Configurable per deployment
- `location_logs`: Retain 30 days?
- `medication_logs`: Retain indefinitely for adherence history
- `alerts`: Retain indefinitely, soft-resolve

---

## 5. Row Level Security (RLS) — Supabase

If the frontend or external services query Supabase directly (e.g. Realtime subscriptions), enable RLS on all tables:

| Table | Policy idea |
|-------|-------------|
| caregivers | `id = auth.uid()` for own row |
| patients | Via `patient_caregiver_map`: caregiver can access linked patients |
| patient_caregiver_map | Caregiver sees own mappings |
| medications, medication_logs, appointments, etc. | JOIN through patient_caregiver_map |

**Note:** When FastAPI is the only client (recommended for MVP), RLS can be permissive. Tighten when/if frontend uses Supabase client directly.

---

## 6. Open Questions

- [ ] Device registration table for patient GPS devices?
- [ ] Audit log table for sensitive actions (profile edits, monitoring pause)?
