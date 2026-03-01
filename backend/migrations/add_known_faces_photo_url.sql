-- Add photo URL to known_faces for storing uploaded face photos (e.g. in Supabase Storage)
-- The backend creates the "known-faces" bucket automatically on first photo upload if it does not exist (public).
-- You can also create it manually: Supabase Dashboard → Storage → New bucket → name "known-faces", set Public.
ALTER TABLE public.known_faces
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

COMMENT ON COLUMN public.known_faces.photo_url IS 'Public URL of the face photo (e.g. Supabase Storage).';
