-- ============================================================
-- TAGS COUNT TRIGGER
-- Keeps profiles.tags_count in sync with the cats a user has tagged
-- ============================================================

CREATE OR REPLACE FUNCTION increment_tags_count()
RETURNS trigger AS $$
BEGIN
  IF NEW.tagged_by IS NOT NULL THEN
    UPDATE profiles SET tags_count = tags_count + 1 WHERE id = NEW.tagged_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER cats_after_insert_increment_tags_count
  AFTER INSERT ON cats
  FOR EACH ROW
  EXECUTE FUNCTION increment_tags_count();

-- ponytail: no decrement-on-delete trigger yet since cats aren't deletable
-- anywhere in the app. Add one on DELETE ON cats if that changes.
