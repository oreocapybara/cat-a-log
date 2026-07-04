-- ============================================================
-- RELEASE & UNDO: let the tagger detach from or delete their cat
-- ============================================================

-- 1. UPDATE policy: owner can update their own cat (needed for releasing)
CREATE POLICY "Tagger can update own cats"
  ON cats FOR UPDATE
  USING (auth.uid() = tagged_by)
  WITH CHECK (true);

-- 2. DELETE policy: owner can delete their own cat (undo within grace period)
CREATE POLICY "Tagger can delete own cats"
  ON cats FOR DELETE USING (auth.uid() = tagged_by);

-- 3. Decrement tags_count when tagged_by goes from a user to null (release)
--    or when a cat row is deleted entirely (undo).
CREATE OR REPLACE FUNCTION public.decrement_tags_count()
RETURNS trigger AS $$
BEGIN
  -- On UPDATE: tagged_by changed from non-null to null (release)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.tagged_by IS NOT NULL AND NEW.tagged_by IS NULL THEN
      UPDATE public.profiles SET tags_count = GREATEST(tags_count - 1, 0) WHERE id = OLD.tagged_by;
    END IF;
    RETURN NEW;
  END IF;

  -- On DELETE: cat removed entirely (undo)
  IF TG_OP = 'DELETE' THEN
    IF OLD.tagged_by IS NOT NULL THEN
      UPDATE public.profiles SET tags_count = GREATEST(tags_count - 1, 0) WHERE id = OLD.tagged_by;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER cats_after_update_decrement_tags_count
  AFTER UPDATE ON cats
  FOR EACH ROW
  EXECUTE FUNCTION decrement_tags_count();

CREATE TRIGGER cats_after_delete_decrement_tags_count
  AFTER DELETE ON cats
  FOR EACH ROW
  EXECUTE FUNCTION decrement_tags_count();

-- Restrict direct calls — only triggers should fire this.
REVOKE EXECUTE ON FUNCTION public.decrement_tags_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_tags_count() FROM anon, authenticated;
