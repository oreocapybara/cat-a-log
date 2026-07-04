-- Add a times_spotted count to nearby_cats(), for surfacing "spotted N times"
-- in the map preview card. A cat's initial tagging never inserts a row into
-- sightings (see match-found-screen.tsx — sightings only get a row when a
-- later catch is confirmed as the *same* animal), so the true total is
-- 1 (the initial tag) + count(sightings).
--
-- Postgres won't let CREATE OR REPLACE change a function's return columns,
-- so the existing nearby_cats() must be dropped first.
DROP FUNCTION IF EXISTS public.nearby_cats(double precision, double precision, double precision);

CREATE FUNCTION public.nearby_cats(
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
  distance_km       double precision,
  times_spotted     bigint
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
    ) AS distance_km,
    1 + (SELECT count(*) FROM public.sightings s WHERE s.cat_id = c.id) AS times_spotted
  FROM public.cats c
  WHERE
    c.lat BETWEEN user_lat - lat_delta AND user_lat + lat_delta
    AND c.lng BETWEEN user_lng - lng_delta AND user_lng + lng_delta
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '';
