-- ============================================================
-- FIX: Avatar upload fails with RLS violation
-- The INSERT policy on storage.objects requires an accompanying
-- SELECT policy for Supabase Storage's internal upsert logic to
-- function. Scope it to the user's own folder only (no bucket-wide
-- listing).
-- ============================================================

-- Users can only SELECT (read metadata of) their own avatar file.
-- This does NOT expose other users' files or allow bucket listing.
CREATE POLICY "Users can read own avatar metadata"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
