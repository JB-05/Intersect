-- Add dementia care patient fields
-- Run in Supabase SQL Editor

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS diagnosis_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS diagnosis_date DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_care_physician VARCHAR(255),
  ADD COLUMN IF NOT EXISTS baseline_notes TEXT;
