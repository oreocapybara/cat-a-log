-- ============================================================
-- FIX: Allow the tagger to set tagged_by to null (release)
-- The original policy's implicit WITH CHECK reuses USING, which
-- rejects the update because the new row has tagged_by = null.
-- ============================================================

DROP POLICY IF EXISTS "Tagger can update own cats" ON cats;

CREATE POLICY "Tagger can update own cats"
  ON cats FOR UPDATE
  USING (auth.uid() = tagged_by)
  WITH CHECK (true);
