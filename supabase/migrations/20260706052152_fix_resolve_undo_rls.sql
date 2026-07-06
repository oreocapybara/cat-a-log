-- ============================================================
-- FIX RESOLVE UNDO RLS
-- The existing UPDATE policy's WITH CHECK requires resolved_by = auth.uid(),
-- which prevents setting resolved_by back to NULL when undoing a resolve.
-- This migration replaces the policy to allow the resolver to also undo
-- their own resolve (set resolved_by/resolved_at back to NULL).
-- ============================================================

DROP POLICY "Authenticated users can resolve cat tags" ON cat_tags;

CREATE POLICY "Authenticated users can resolve cat tags"
  ON cat_tags FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (resolved_by IS NULL OR resolved_by = auth.uid())
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (resolved_by IS NULL OR resolved_by = auth.uid())
  );
