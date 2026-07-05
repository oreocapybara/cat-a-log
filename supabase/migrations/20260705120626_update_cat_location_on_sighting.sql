-- ============================================================
-- Allow any authenticated user to update a cat's location
-- when recording a new sighting. Uses SECURITY DEFINER to
-- bypass the "tagger can update own cats" RLS policy.
-- ============================================================

CREATE OR REPLACE FUNCTION update_cat_location(
  p_cat_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE cats
  SET lat = p_lat, lng = p_lng
  WHERE id = p_cat_id;
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION update_cat_location(uuid, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_cat_location(uuid, double precision, double precision) TO authenticated;
