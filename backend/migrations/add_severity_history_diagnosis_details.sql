-- Add severity, personal history, and detailed diagnosis fields
-- Run in Supabase SQL Editor

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20),
  ADD COLUMN IF NOT EXISTS personal_history TEXT,
  ADD COLUMN IF NOT EXISTS diagnosing_physician VARCHAR(255),
  ADD COLUMN IF NOT EXISTS diagnosis_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS diagnosis_symptoms TEXT,
  ADD COLUMN IF NOT EXISTS diagnosis_treatment_plan TEXT,
  ADD COLUMN IF NOT EXISTS mmse_score_at_diagnosis SMALLINT;
