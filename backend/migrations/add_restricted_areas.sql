-- Restricted areas per patient: caregiver uploads an image of the area and can toggle camera/audio off for that zone.
-- Storage: create bucket "restricted-areas" (public) in Supabase Dashboard, or backend will create on first upload.

CREATE TABLE IF NOT EXISTS public.patient_restricted_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    camera_enabled BOOLEAN DEFAULT true,
    audio_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restricted_areas_patient_id ON public.patient_restricted_areas(patient_id);

COMMENT ON TABLE public.patient_restricted_areas IS 'Areas where caregiver can disable camera/audio; image shows the zone.';
