-- ============================================================
-- INVASIVE RISK TAG
-- Adds 'invasive_risk' to cat_tags vocabulary, verification_status
-- column, invasive_risk_votes table, auto-resolve trigger, and
-- updates the deceased cascade to skip invasive_risk.
-- ============================================================

-- 1. Extend CHECK constraint
ALTER TABLE cat_tags DROP CONSTRAINT cat_tags_tag_check;
ALTER TABLE cat_tags ADD CONSTRAINT cat_tags_tag_check
  CHECK (tag IN ('needs_medical', 'possible_rabies', 'deceased', 'invasive_risk'));

-- 2. Add verification_status (NULL for medical tags)
ALTER TABLE cat_tags ADD COLUMN verification_status text
  CHECK (verification_status IS NULL OR verification_status IN ('pending', 'verified', 'dismissed'));

-- 3. Create votes table
CREATE TABLE invasive_risk_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_tag_id  uuid NOT NULL REFERENCES cat_tags(id) ON DELETE CASCADE,
  voted_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote        text NOT NULL CHECK (vote IN ('confirm', 'deny')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cat_tag_id, voted_by)
);

ALTER TABLE invasive_risk_votes ENABLE ROW LEVEL SECURITY;

-- 4. RLS for invasive_risk_votes
CREATE POLICY "Invasive risk votes are publicly readable"
  ON invasive_risk_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on invasive risk"
  ON invasive_risk_votes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = voted_by);

-- No UPDATE or DELETE policies — votes are immutable

-- 5. Auto-resolve trigger: counts votes and updates verification_status
CREATE OR REPLACE FUNCTION public.update_invasive_risk_status()
RETURNS trigger AS $$
DECLARE
  confirm_count int;
  deny_count int;
BEGIN
  SELECT
    count(*) FILTER (WHERE vote = 'confirm'),
    count(*) FILTER (WHERE vote = 'deny')
  INTO confirm_count, deny_count
  FROM public.invasive_risk_votes
  WHERE cat_tag_id = NEW.cat_tag_id;

  IF confirm_count >= 3 THEN
    UPDATE public.cat_tags SET verification_status = 'verified'
    WHERE id = NEW.cat_tag_id AND verification_status = 'pending';
  ELSIF deny_count >= 3 THEN
    UPDATE public.cat_tags SET verification_status = 'dismissed'
    WHERE id = NEW.cat_tag_id AND verification_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER invasive_risk_votes_after_insert
  AFTER INSERT ON invasive_risk_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invasive_risk_status();

REVOKE EXECUTE ON FUNCTION public.update_invasive_risk_status() FROM PUBLIC, anon, authenticated;

-- 6. Update deceased cascade to skip invasive_risk
CREATE OR REPLACE FUNCTION public.resolve_other_tags_on_deceased()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cat_tags
  SET resolved_at = now(), resolved_by = NEW.added_by
  WHERE cat_id = NEW.cat_id
    AND tag <> 'deceased'
    AND tag <> 'invasive_risk'
    AND resolved_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7. Guard existing resolve/delete policies for verified invasive tags
DROP POLICY "Authenticated users can resolve cat tags" ON cat_tags;
CREATE POLICY "Authenticated users can resolve cat tags"
  ON cat_tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    auth.role() = 'authenticated'
    AND resolved_by = auth.uid()
    AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
  );

DROP POLICY "Tag adder can remove their own tag" ON cat_tags;
CREATE POLICY "Tag adder can remove their own tag"
  ON cat_tags FOR DELETE USING (
    auth.uid() = added_by
    AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
  );

DROP POLICY "Cat owner can remove tags on their own cat" ON cat_tags;
CREATE POLICY "Cat owner can remove tags on their own cat"
  ON cat_tags FOR DELETE USING (
    auth.uid() = (SELECT tagged_by FROM public.cats WHERE id = cat_tags.cat_id)
    AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
  );
