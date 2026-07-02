-- ============================================================
-- SECURITY ADVISOR FIXES
-- Addresses WARN-level findings from `supabase db advisors --type security`
-- ============================================================

-- handle_new_user() was a no-op placeholder never wired to a trigger
-- (profiles are created manually on /setup-profile). Dead code that was
-- also exposed as a callable RPC with a mutable search_path — just drop it.
DROP FUNCTION IF EXISTS public.handle_new_user();

-- increment_tags_count() only needs to run as the AFTER INSERT trigger on
-- cats, never as a direct RPC call. Pin search_path (fixes search-path
-- hijacking) and revoke direct EXECUTE (trigger firing doesn't require it —
-- only the session's own RPC/SQL access is affected).
CREATE OR REPLACE FUNCTION public.increment_tags_count()
RETURNS trigger AS $$
BEGIN
  IF NEW.tagged_by IS NOT NULL THEN
    UPDATE public.profiles SET tags_count = tags_count + 1 WHERE id = NEW.tagged_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.increment_tags_count() FROM PUBLIC;

-- nearby_cats() only reads from the publicly-readable cats table, so it
-- doesn't need SECURITY DEFINER's elevated privileges — SECURITY INVOKER
-- runs it as the caller instead, which also satisfies the linter's
-- "no SECURITY DEFINER RPC" check. Pin search_path too.
CREATE OR REPLACE FUNCTION public.nearby_cats(
  user_lat  double precision,
  user_lng  double precision,
  radius_km double precision DEFAULT 1.0
)
RETURNS TABLE (
  id                uuid,
  name              text,
  primary_photo_url text,
  lat               double precision,
  lng               double precision,
  is_ear_tipped     boolean,
  notes             text,
  tagged_by         uuid,
  confidence_score  int,
  created_at        timestamptz,
  distance_km       double precision
) AS $$
DECLARE
  lat_delta double precision := radius_km / 111.0;
  lng_delta double precision := radius_km / (111.0 * cos(radians(user_lat)));
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.primary_photo_url,
    c.lat, c.lng, c.is_ear_tipped, c.notes,
    c.tagged_by, c.confidence_score, c.created_at,
    111.0 * sqrt(
      power(c.lat - user_lat, 2) +
      power((c.lng - user_lng) * cos(radians(user_lat)), 2)
    ) AS distance_km
  FROM public.cats c
  WHERE
    c.lat BETWEEN user_lat - lat_delta AND user_lat + lat_delta
    AND c.lng BETWEEN user_lng - lng_delta AND user_lng + lng_delta
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '';

-- Relocate the vector extension out of the public schema.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- The cat-photos bucket is public, so individual objects are already
-- fetchable by URL without any RLS policy. A SELECT policy on
-- storage.objects additionally allows listing every file in the bucket,
-- which is broader than intended — drop it.
DROP POLICY IF EXISTS "Cat photos are publicly readable" ON storage.objects;
