-- ============================================================
-- RESOLVE CAT TAGS
-- Adds a soft-resolve state to cat_tags (needs_medical/possible_rabies can be
-- marked recovered/cleared by any authenticated user, not just the adder),
-- an additional hard-delete policy for the cat's owner, and a trigger that
-- auto-resolves other active tags when a cat is marked deceased.
-- ============================================================

ALTER TABLE cat_tags ADD COLUMN resolved_at timestamptz;
ALTER TABLE cat_tags ADD COLUMN resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Mirrors the existing community-wide INSERT policy: tagging is already
-- unilateral and community-wide, so resolving should be too.
CREATE POLICY "Authenticated users can resolve cat tags"
  ON cat_tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated' AND resolved_by = auth.uid());

-- Additive alongside the existing "Tag adder can remove their own tag" DELETE
-- policy — Postgres ORs multiple permissive policies for the same command,
-- so a tag can be hard-deleted by whoever added it OR the cat's owner.
CREATE POLICY "Cat owner can remove tags on their own cat"
  ON cat_tags FOR DELETE USING (
    auth.uid() = (SELECT tagged_by FROM public.cats WHERE id = cat_tags.cat_id)
  );

-- When a cat is tagged deceased, any other active tags on it are moot —
-- auto-resolve them in the same operation so the UI never shows a
-- contradictory "Needs medical" + "Passed away" state. SECURITY DEFINER +
-- pinned search_path + revoked direct EXECUTE matches the house pattern for
-- AFTER INSERT trigger functions (see increment_tags_count()).
CREATE OR REPLACE FUNCTION public.resolve_other_tags_on_deceased()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cat_tags
  SET resolved_at = now(), resolved_by = NEW.added_by
  WHERE cat_id = NEW.cat_id AND tag <> 'deceased' AND resolved_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER cat_tags_after_insert_deceased_cascade
  AFTER INSERT ON cat_tags
  FOR EACH ROW
  WHEN (NEW.tag = 'deceased')
  EXECUTE FUNCTION public.resolve_other_tags_on_deceased();

REVOKE EXECUTE ON FUNCTION public.resolve_other_tags_on_deceased() FROM PUBLIC, anon, authenticated;
