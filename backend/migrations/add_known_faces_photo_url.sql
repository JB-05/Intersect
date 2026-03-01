-- Add photo URL to known_faces for storing uploaded face photos (e.g. in Supabase Storage)
-- Storage: Create a bucket named "known-faces" in Supabase Dashboard (Storage), set it to Public so photo_url works.
ALTER TABLE public.known_faces
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

COMMENT ON COLUMN public.known_faces.photo_url IS 'Public URL of the face photo (e.g. Supabase Storage).';
