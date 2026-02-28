-- Fix numeric overflow for lat/lng columns
-- Run in Supabase SQL Editor if you get: "A field with precision 10, scale 8 must round to an absolute value less than 10^2"
-- Switch to DOUBLE PRECISION to avoid overflow entirely (simpler for demo).

ALTER TABLE public.patients ALTER COLUMN home_latitude TYPE DOUBLE PRECISION USING home_latitude::double precision;
ALTER TABLE public.patients ALTER COLUMN home_longitude TYPE DOUBLE PRECISION USING home_longitude::double precision;
ALTER TABLE public.location_logs ALTER COLUMN latitude TYPE DOUBLE PRECISION USING latitude::double precision;
ALTER TABLE public.location_logs ALTER COLUMN longitude TYPE DOUBLE PRECISION USING longitude::double precision;
