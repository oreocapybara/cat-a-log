-- ============================================================
-- FIX SUPABASE SECURITY LINT WARNINGS
-- 1. rls_policy_always_true: "Tagger can update own cats"
-- 2. public_bucket_allows_listing: "avatars" SELECT policy
-- 3. anon/authenticated_security_definer_function_executable:
--    update_cat_location
-- ============================================================

-- 1. Fix RLS policy "Tagger can update own cats"
-- ------------------------------------------------
-- The WITH CHECK (true) is overly permissive. Now that the community
-- policy "Authenticated users can update cat info" (WITH CHECK
-- auth.role() = 'authenticated') covers all authenticated writes,
-- this tagger-specific policy can be scoped properly.
-- Releasing a cat (setting tagged_by = null) passes through the
-- community policy's WITH CHECK, so this policy no longer needs
-- WITH CHECK (true).

DROP POLICY IF EXISTS "Tagger can update own cats" ON cats;

CREATE POLICY "Tagger can update own cats"
  ON cats FOR UPDATE
  USING (auth.uid() = tagged_by)
  WITH CHECK (auth.uid() = tagged_by);

-- 2. Fix public bucket 'avatars' SELECT policy
-- ------------------------------------------------
-- Public buckets serve objects via direct URL without needing a SELECT
-- policy on storage.objects. The existing policy allows clients to LIST
-- all files in the bucket, exposing user avatar paths. Drop it.

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 3. Fix update_cat_location SECURITY DEFINER
-- ------------------------------------------------
-- This function was originally SECURITY DEFINER to bypass the tagger-only
-- RLS policy. Now that "Authenticated users can update cat info" exists,
-- any authenticated user can update cats via normal RLS. Switch to
-- SECURITY INVOKER so the function runs with the caller's permissions.

CREATE OR REPLACE FUNCTION update_cat_location(
  p_cat_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE cats
  SET lat = p_lat, lng = p_lng
  WHERE id = p_cat_id;
END;
$$;

-- Grant/revoke stays the same: only authenticated users can call it
REVOKE ALL ON FUNCTION update_cat_location(uuid, double precision, double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_cat_location(uuid, double precision, double precision) FROM anon;
GRANT EXECUTE ON FUNCTION update_cat_location(uuid, double precision, double precision) TO authenticated;
