-- Patient AI interaction logs (transcript, intent, response only; no raw audio or full prompts)
-- Run in Supabase SQL Editor

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
