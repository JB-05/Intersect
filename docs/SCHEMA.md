# Full Schema Reference — Cognitive Stability Monitoring System

**Version:** Current (as of last update)  
**Source of truth:** [`../backend/supabase_schema.sql`](../backend/supabase_schema.sql)  
**Database:** Supabase (PostgreSQL 15+) with `pgvector` extension

This document is the single reference for the complete database schema. For entity relationships and higher-level design, see [DB_SCHEMA.md](DB_SCHEMA.md).

---

## 1. Schema source and migrations

| File | Purpose |
|------|--------|
| [`backend/supabase_schema.sql`](../backend/supabase_schema.sql) | Full base schema. Run in Supabase SQL Editor on a new project. |
| [`backend/migrations/add_dementia_care_fields.sql`](../backend/migrations/add_dementia_care_fields.sql) | Adds `address`, diagnosis fields, emergency contact, primary care physician, baseline_notes to `patients`. |
| [`backend/migrations/add_severity_history_diagnosis_details.sql`](../backend/migrations/add_severity_history_diagnosis_details.sql) | Adds `severity`, `personal_history`, diagnosing physician, stage, symptoms, treatment plan, MMSE to `patients`. |
| [`backend/migrations/fix_lat_lng_overflow.sql`](../backend/migrations/fix_lat_lng_overflow.sql) | Changes `patients` and `location_logs` lat/long columns from `DECIMAL(10,8)` to `DOUBLE PRECISION`. |
| [`backend/migrations/add_patient_ai_logs.sql`](../backend/migrations/add_patient_ai_logs.sql) | Adds `patient_ai_logs` table for Patient AI interaction logging (transcript, intent, response only). |

If the database already existed before these columns were introduced, run the migrations in the Supabase SQL Editor in the order above (after the base schema).

---

## 2. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Used for `known_faces.embedding vector(128)`.

---

## 3. Tables

### 3.1 `public.caregivers`

Caregiver profile; `id` matches `auth.users.id`.

| Column      | Type         | Constraints                          | Default   |
|-------------|--------------|--------------------------------------|-----------|
| id          | UUID         | PK, REFERENCES auth.users(id) CASCADE | —         |
| full_name   | VARCHAR(255) | NOT NULL                             | —         |
| created_at  | TIMESTAMPTZ  | —                                    | now()     |
| updated_at  | TIMESTAMPTZ  | —                                    | now()     |
| is_active   | BOOLEAN      | —                                    | true      |

**Indexes:** `idx_caregivers_is_active (is_active)`

---

### 3.2 `public.patients`

Patient demographic and dementia-care profile.

| Column                     | Type              | Constraints                    | Default        |
|----------------------------|-------------------|--------------------------------|----------------|
| id                         | UUID              | PK, gen_random_uuid()          | gen_random_uuid() |
| full_name                  | VARCHAR(255)      | NOT NULL                       | —              |
| date_of_birth               | DATE              | —                              | —              |
| address                    | VARCHAR(500)      | —                              | —              |
| home_latitude              | DOUBLE PRECISION  | —                              | —              |
| home_longitude             | DOUBLE PRECISION  | —                              | —              |
| geofence_radius_km         | DECIMAL(5,2)      | —                              | 0.5            |
| severity                   | VARCHAR(20)       | —                              | —              |
| personal_history           | TEXT              | —                              | —              |
| diagnosis_type             | VARCHAR(100)      | —                              | —              |
| diagnosis_date             | DATE              | —                              | —              |
| diagnosing_physician       | VARCHAR(255)      | —                              | —              |
| diagnosis_stage            | VARCHAR(50)       | —                              | —              |
| diagnosis_symptoms         | TEXT              | —                              | —              |
| diagnosis_treatment_plan   | TEXT              | —                              | —              |
| mmse_score_at_diagnosis    | SMALLINT          | —                              | —              |
| emergency_contact_name     | VARCHAR(255)      | —                              | —              |
| emergency_contact_phone    | VARCHAR(50)       | —                              | —              |
| primary_care_physician     | VARCHAR(255)      | —                              | —              |
| baseline_start_date        | DATE              | NOT NULL                       | —              |
| baseline_notes             | TEXT              | —                              | —              |
| notes                      | TEXT              | —                              | —              |
| monitoring_paused          | BOOLEAN           | —                              | false          |
| monitoring_paused_at       | TIMESTAMPTZ       | —                              | —              |
| created_at                 | TIMESTAMPTZ       | —                              | now()          |
| updated_at                 | TIMESTAMPTZ       | —                              | now()          |
| deleted_at                 | TIMESTAMPTZ       | —                              | —              |

**Indexes:** `idx_patients_deleted_at (deleted_at)`, `idx_patients_baseline_start_date (baseline_start_date)`

---

### 3.3 `public.patient_caregiver_map`

Links caregivers to patients with a role.

| Column       | Type        | Constraints                                      | Default        |
|--------------|-------------|--------------------------------------------------|----------------|
| id           | UUID        | PK, gen_random_uuid()                            | gen_random_uuid() |
| patient_id   | UUID        | NOT NULL, REFERENCES patients(id) CASCADE        | —              |
| caregiver_id | UUID        | NOT NULL, REFERENCES caregivers(id) CASCADE     | —              |
| role         | VARCHAR(50) | CHECK (role IN ('primary', 'secondary'))         | 'secondary'    |
| created_at   | TIMESTAMPTZ | —                                                | now()          |

**Unique:** (patient_id, caregiver_id)  
**Indexes:** `idx_pcm_patient_id (patient_id)`, `idx_pcm_caregiver_id (caregiver_id)`

---

### 3.4 `public.medications`

Medications per patient.

| Column      | Type         | Constraints                         | Default        |
|-------------|--------------|-------------------------------------|----------------|
| id          | UUID         | PK, gen_random_uuid()               | gen_random_uuid() |
| patient_id  | UUID         | NOT NULL, REFERENCES patients(id) CASCADE | —        |
| name        | VARCHAR(255) | NOT NULL                            | —              |
| dosage      | VARCHAR(100) | —                                   | —              |
| frequency   | VARCHAR(50)  | NOT NULL                            | —              |
| times       | TIME[]       | —                                   | —              |
| notes       | TEXT         | —                                   | —              |
| is_active   | BOOLEAN      | —                                   | true           |
| created_at  | TIMESTAMPTZ  | —                                   | now()          |
| updated_at  | TIMESTAMPTZ  | —                                   | now()          |

**Indexes:** `idx_medications_patient_id (patient_id)`, `idx_medications_is_active (is_active)`

---

### 3.5 `public.medication_logs`

Per-dose log (taken / missed / delayed).

| Column        | Type        | Constraints                                    | Default |
|---------------|-------------|------------------------------------------------|---------|
| id            | UUID        | PK, gen_random_uuid()                           | gen_random_uuid() |
| medication_id | UUID        | NOT NULL, REFERENCES medications(id) CASCADE   | —       |
| scheduled_at  | TIMESTAMPTZ | NOT NULL                                       | —       |
| status        | VARCHAR(20) | NOT NULL, CHECK (status IN ('taken','missed','delayed')) | — |
| actual_at     | TIMESTAMPTZ | —                                              | —       |
| notes         | TEXT        | —                                              | —       |
| logged_by     | UUID        | REFERENCES caregivers(id) ON DELETE SET NULL   | —       |
| created_at    | TIMESTAMPTZ | —                                              | now()   |

**Unique:** (medication_id, scheduled_at)  
**Indexes:** `idx_medication_logs_medication_id (medication_id)`, `idx_medication_logs_scheduled_at (scheduled_at)`

---

### 3.6 `public.appointments`

Appointments per patient.

| Column       | Type         | Constraints                                                          | Default        |
|--------------|--------------|----------------------------------------------------------------------|----------------|
| id           | UUID         | PK, gen_random_uuid()                                               | gen_random_uuid() |
| patient_id   | UUID         | NOT NULL, REFERENCES patients(id) CASCADE                            | —              |
| title        | VARCHAR(255) | NOT NULL                                                             | —              |
| scheduled_at | TIMESTAMPTZ  | NOT NULL                                                             | —              |
| status       | VARCHAR(20)  | CHECK (status IN ('scheduled','completed','missed','cancelled'))     | 'scheduled'    |
| location     | VARCHAR(255) | —                                                                    | —              |
| notes        | TEXT         | —                                                                    | —              |
| created_at   | TIMESTAMPTZ  | —                                                                    | now()          |
| updated_at   | TIMESTAMPTZ  | —                                                                    | now()          |

**Indexes:** `idx_appointments_patient_id (patient_id)`, `idx_appointments_scheduled_at (scheduled_at)`, `idx_appointments_status (status)`

---

### 3.7 `public.caregiver_surveys`

Weekly caregiver survey per patient (one row per patient per week_ending).

| Column                    | Type        | Constraints                                    | Default |
|---------------------------|-------------|------------------------------------------------|---------|
| id                        | UUID        | PK, gen_random_uuid()                          | gen_random_uuid() |
| patient_id                | UUID        | NOT NULL, REFERENCES patients(id) CASCADE      | —       |
| caregiver_id              | UUID        | NOT NULL, REFERENCES caregivers(id) CASCADE   | —       |
| week_ending                | DATE        | NOT NULL                                       | —       |
| confusion_increased       | BOOLEAN     | NOT NULL                                       | —       |
| safety_concern_increased   | BOOLEAN     | NOT NULL                                       | —       |
| stress_level               | SMALLINT    | NOT NULL, CHECK (stress_level BETWEEN 1 AND 5) | —       |
| created_at                 | TIMESTAMPTZ | —                                              | now()   |

**Unique:** (patient_id, week_ending)  
**Indexes:** `idx_surveys_patient_id (patient_id)`, `idx_surveys_week_ending (week_ending)`

---

### 3.8 `public.known_faces`

Known faces (contacts) with optional pgvector embedding.

| Column       | Type         | Constraints                         | Default        |
|--------------|--------------|-------------------------------------|----------------|
| id           | UUID         | PK, gen_random_uuid()              | gen_random_uuid() |
| patient_id   | UUID         | NOT NULL, REFERENCES patients(id) CASCADE | —   |
| name         | VARCHAR(255) | NOT NULL                            | —              |
| relationship | VARCHAR(100) | —                                   | —              |
| embedding    | vector(128)  | —                                   | —              |
| created_at   | TIMESTAMPTZ  | —                                   | now()          |
| updated_at   | TIMESTAMPTZ  | —                                   | now()          |

**Indexes:** `idx_known_faces_patient_id (patient_id)`

---

### 3.9 `public.camera_events`

Events from camera/vision pipeline (e.g. ESP32-CAM).

| Column           | Type         | Constraints                                                                 | Default |
|------------------|--------------|-----------------------------------------------------------------------------|---------|
| id               | UUID         | PK, gen_random_uuid()                                                      | gen_random_uuid() |
| patient_id       | UUID         | NOT NULL, REFERENCES patients(id) CASCADE                                   | —       |
| event_type       | VARCHAR(50)  | NOT NULL, CHECK (event_type IN ('recognized_person','unknown_person','inactivity')) | — |
| detected_at      | TIMESTAMPTZ  | NOT NULL                                                                    | —       |
| confidence       | DECIMAL(5,4) | —                                                                           | —       |
| known_face_id    | UUID         | REFERENCES known_faces(id) ON DELETE SET NULL                               | —       |
| duration_seconds | INTEGER      | —                                                                           | —       |
| metadata         | JSONB        | —                                                                           | —       |
| created_at       | TIMESTAMPTZ  | —                                                                           | now()   |

**Indexes:** `idx_camera_events_patient_id`, `idx_camera_events_detected_at`, `idx_camera_events_event_type`, `idx_camera_events_patient_detected (patient_id, detected_at)`

---

### 3.10 `public.location_logs`

Location samples (e.g. from device).

| Column                 | Type             | Constraints                         | Default |
|------------------------|------------------|-------------------------------------|---------|
| id                     | UUID             | PK, gen_random_uuid()              | gen_random_uuid() |
| patient_id             | UUID             | NOT NULL, REFERENCES patients(id) CASCADE | — |
| device_id              | VARCHAR(255)     | —                                   | —       |
| latitude               | DOUBLE PRECISION | NOT NULL                            | —       |
| longitude              | DOUBLE PRECISION | NOT NULL                            | —       |
| distance_from_home_km  | DECIMAL(8,4)     | —                                   | —       |
| recorded_at            | TIMESTAMPTZ      | NOT NULL                            | —       |
| created_at             | TIMESTAMPTZ      | —                                   | now()   |

**Indexes:** `idx_location_logs_patient_id (patient_id)`, `idx_location_logs_recorded_at (recorded_at)`

---

### 3.11 `public.alerts`

Alerts for a patient (informational / attention_required / teleconsult_recommended).

| Column          | Type         | Constraints                                                                 | Default |
|-----------------|--------------|-----------------------------------------------------------------------------|---------|
| id              | UUID         | PK, gen_random_uuid()                                                       | gen_random_uuid() |
| patient_id      | UUID         | NOT NULL, REFERENCES patients(id) CASCADE                                   | —       |
| level           | VARCHAR(30)  | NOT NULL, CHECK (level IN ('informational','attention_required','teleconsult_recommended')) | — |
| title           | VARCHAR(255) | NOT NULL                                                                    | —       |
| message         | TEXT         | —                                                                           | —       |
| domain          | VARCHAR(50)  | —                                                                           | —       |
| acknowledged_at | TIMESTAMPTZ  | —                                                                           | —       |
| resolved_at     | TIMESTAMPTZ  | —                                                                           | —       |
| created_at      | TIMESTAMPTZ  | —                                                                           | now()   |
| metadata        | JSONB        | —                                                                           | —       |

**Indexes:** `idx_alerts_patient_id`, `idx_alerts_level`, `idx_alerts_created_at`, `idx_alerts_acknowledged_at`

---

### 3.12 `public.monitoring_config`

Per-patient monitoring settings (one row per patient).

| Column                      | Type          | Constraints                         | Default |
|-----------------------------|---------------|-------------------------------------|---------|
| id                          | UUID          | PK, gen_random_uuid()               | gen_random_uuid() |
| patient_id                  | UUID          | NOT NULL UNIQUE, REFERENCES patients(id) CASCADE | — |
| esp32_stream_url            | VARCHAR(500)  | —                                   | —       |
| inactivity_threshold_seconds | INTEGER       | —                                   | 300     |
| face_confidence_threshold   | DECIMAL(5,4)  | —                                   | 0.85    |
| tts_enabled                 | BOOLEAN       | —                                   | true    |
| created_at                  | TIMESTAMPTZ   | —                                   | now()   |
| updated_at                  | TIMESTAMPTZ   | —                                   | now()   |

---

### 3.13 `public.teleconsult_summaries`

Generated teleconsult summaries per patient.

| Column           | Type         | Constraints                         | Default        |
|------------------|--------------|-------------------------------------|----------------|
| id               | UUID         | PK, gen_random_uuid()              | gen_random_uuid() |
| patient_id       | UUID         | NOT NULL, REFERENCES patients(id) CASCADE | —   |
| generated_at     | TIMESTAMPTZ  | —                                   | now()          |
| summary_text     | TEXT         | —                                   | —              |
| stability_level  | VARCHAR(30)  | —                                   | —              |
| domains_snapshot | JSONB        | —                                   | —              |
| created_by       | UUID         | REFERENCES caregivers(id) ON DELETE SET NULL | — |

**Indexes:** `idx_teleconsult_patient_id (patient_id)`, `idx_teleconsult_generated_at (generated_at)`

---

### 3.14 `public.patient_ai_logs`

Patient AI voice interaction logs (transcript, intent, response only; no raw audio or full prompts).

| Column     | Type        | Constraints                         | Default        |
|------------|-------------|-------------------------------------|----------------|
| id         | UUID        | PK, gen_random_uuid()               | gen_random_uuid() |
| patient_id | UUID        | NOT NULL, REFERENCES patients(id) CASCADE | —        |
| transcript | TEXT        | NOT NULL                            | —              |
| intent     | VARCHAR(50) | NOT NULL                            | —              |
| response   | TEXT        | NOT NULL                            | —              |
| created_at | TIMESTAMPTZ | —                                   | now()          |

**Indexes:** `idx_patient_ai_logs_patient_id (patient_id)`, `idx_patient_ai_logs_created_at (created_at)`

---

## 4. Trigger

**`handle_new_user`** — After insert on `auth.users`, insert a row into `public.caregivers` with `id = NEW.id` and `full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)`. Uses `ON CONFLICT (id) DO NOTHING`.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Entity relationship (high level)

```
auth.users ──► caregivers
                   │
                   └── patient_caregiver_map ◄──► patients
                                                      │
         ┌────────────────────────────────────────────┼─────────────────────────────────────────┐
         │                                            │                                         │
         ▼                                            ▼                                         ▼
   medications (► medication_logs)           appointments              caregiver_surveys
   known_faces                               camera_events              location_logs
   alerts                                    monitoring_config          teleconsult_summaries
   patient_ai_logs
```

For detailed ER and design notes, see [DB_SCHEMA.md](DB_SCHEMA.md).
