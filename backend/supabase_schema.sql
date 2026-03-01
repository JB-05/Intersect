-- Cognitive Stability Monitoring Schema for Supabase
-- Run in Supabase SQL Editor after creating project
-- 1. Enable pgvector extension first (Supabase may already have it)

CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Caregivers (id = auth.users.id)
CREATE TABLE IF NOT EXISTS public.caregivers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_caregivers_is_active ON public.caregivers(is_active);

-- 3. Patients
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    address VARCHAR(500),
    home_latitude DOUBLE PRECISION,
    home_longitude DOUBLE PRECISION,
    geofence_radius_km DECIMAL(5, 2) DEFAULT 0.5,
    severity VARCHAR(20),
    personal_history TEXT,
    diagnosis_type VARCHAR(100),
    diagnosis_date DATE,
    diagnosing_physician VARCHAR(255),
    diagnosis_stage VARCHAR(50),
    diagnosis_symptoms TEXT,
    diagnosis_treatment_plan TEXT,
    mmse_score_at_diagnosis SMALLINT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    primary_care_physician VARCHAR(255),
    baseline_start_date DATE NOT NULL,
    baseline_notes TEXT,
    notes TEXT,
    monitoring_paused BOOLEAN DEFAULT false,
    monitoring_paused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON public.patients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_patients_baseline_start_date ON public.patients(baseline_start_date);

-- 4. Patient-Caregiver mapping
CREATE TABLE IF NOT EXISTS public.patient_caregiver_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'secondary' CHECK (role IN ('primary', 'secondary')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(patient_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_pcm_patient_id ON public.patient_caregiver_map(patient_id);
CREATE INDEX IF NOT EXISTS idx_pcm_caregiver_id ON public.patient_caregiver_map(caregiver_id);

-- 5. Medications
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(50) NOT NULL,
    times TIME[],
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_is_active ON public.medications(is_active);

-- 6. Medication logs
CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('taken', 'missed', 'delayed')),
    actual_at TIMESTAMPTZ,
    notes TEXT,
    logged_by UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(medication_id, scheduled_at)
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON public.medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_scheduled_at ON public.medication_logs(scheduled_at);

-- 7. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 8. Caregiver surveys
CREATE TABLE IF NOT EXISTS public.caregiver_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
    week_ending DATE NOT NULL,
    confusion_increased BOOLEAN NOT NULL,
    safety_concern_increased BOOLEAN NOT NULL,
    stress_level SMALLINT NOT NULL CHECK (stress_level >= 1 AND stress_level <= 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(patient_id, week_ending)
);

CREATE INDEX IF NOT EXISTS idx_surveys_patient_id ON public.caregiver_surveys(patient_id);
CREATE INDEX IF NOT EXISTS idx_surveys_week_ending ON public.caregiver_surveys(week_ending);

-- 9. Known faces (pgvector)
CREATE TABLE IF NOT EXISTS public.known_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    embedding vector(128),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_known_faces_patient_id ON public.known_faces(patient_id);

-- 10. Camera events
CREATE TABLE IF NOT EXISTS public.camera_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('recognized_person', 'unknown_person', 'inactivity')),
    detected_at TIMESTAMPTZ NOT NULL,
    confidence DECIMAL(5, 4),
    known_face_id UUID REFERENCES public.known_faces(id) ON DELETE SET NULL,
    duration_seconds INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camera_events_patient_id ON public.camera_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_camera_events_detected_at ON public.camera_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_camera_events_event_type ON public.camera_events(event_type);
CREATE INDEX IF NOT EXISTS idx_camera_events_patient_detected ON public.camera_events(patient_id, detected_at);

-- 11. Location logs
CREATE TABLE IF NOT EXISTS public.location_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance_from_home_km DECIMAL(8, 4),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_logs_patient_id ON public.location_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_recorded_at ON public.location_logs(recorded_at);

-- 12. Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    level VARCHAR(30) NOT NULL CHECK (level IN ('informational', 'attention_required', 'teleconsult_recommended')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    domain VARCHAR(50),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON public.alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON public.alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged_at ON public.alerts(acknowledged_at);

-- 13. Monitoring config
CREATE TABLE IF NOT EXISTS public.monitoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
    esp32_stream_url VARCHAR(500),
    inactivity_threshold_seconds INTEGER DEFAULT 300,
    face_confidence_threshold DECIMAL(5, 4) DEFAULT 0.85,
    tts_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Teleconsult summaries
CREATE TABLE IF NOT EXISTS public.teleconsult_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ DEFAULT now(),
    summary_text TEXT,
    stability_level VARCHAR(30),
    domains_snapshot JSONB,
    created_by UUID REFERENCES public.caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teleconsult_patient_id ON public.teleconsult_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_teleconsult_generated_at ON public.teleconsult_summaries(generated_at);

-- 15. Patient AI interaction logs (transcript, intent, response only; no raw audio or prompts)
CREATE TABLE IF NOT EXISTS public.patient_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    intent VARCHAR(50) NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_ai_logs_patient_id ON public.patient_ai_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_ai_logs_created_at ON public.patient_ai_logs(created_at);

-- Trigger: create caregiver profile on auth user signup (Supabase)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.caregivers (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this only if trigger doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
