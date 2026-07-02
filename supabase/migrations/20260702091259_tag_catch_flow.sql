-- ============================================================
-- TAG CATCH FLOW
-- Adds visual-similarity matching and medical/welfare status tags
-- ============================================================

-- Enable pgvector extension if not already enabled
-- (already enabled in schema.sql, but explicitly here for safety)
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Vector embedding for visual similarity matching (photo → CLIP embedding).
-- Nullable: only populated for cats caught after this migration, or when
-- the Hugging Face call at catch-time succeeds.
ALTER TABLE cats ADD COLUMN photo_embedding extensions.vector(512);

-- Medical/welfare status tags. Fixed vocabulary, not user-extensible.
-- TNR status is NOT duplicated here — it's already cats.is_ear_tipped.
CREATE TABLE cat_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id     uuid NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  tag        text NOT NULL CHECK (tag IN ('needs_medical', 'possible_rabies', 'deceased')),
  added_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cat_id, tag)
);

ALTER TABLE cat_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cat tags are publicly readable"
  ON cat_tags FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add cat tags"
  ON cat_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = added_by);

CREATE POLICY "Tag adder can remove their own tag"
  ON cat_tags FOR DELETE USING (auth.uid() = added_by);

-- Re-rank an already-fetched set of nearby candidates by embedding
-- similarity. query_embedding is passed as text (a JSON-stringified array,
-- e.g. "[0.1,0.2,...]") and cast to vector internally — this sidesteps any
-- ambiguity in how PostgREST would otherwise coerce a JSON array RPC
-- argument directly into a vector parameter.
-- With search_path pinned to '' (fixes search-path hijacking, matching the
-- convention in 20260702042949_fix_security_advisor_warnings.sql), the
-- <=> operator must be schema-qualified via OPERATOR(extensions.<=>) —
-- a bare <=> does not resolve here even with extensions on the caller's
-- default search_path, since operator lookup for a LANGUAGE sql function
-- body is resolved independently of the invoking session's path.
CREATE OR REPLACE FUNCTION nearby_cats_by_similarity(
  cat_ids uuid[],
  query_embedding text,
  limit_n int DEFAULT 5
)
RETURNS TABLE (id uuid, similarity double precision)
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT id, 1 - (photo_embedding OPERATOR(extensions.<=>) query_embedding::extensions.vector) AS similarity
  FROM public.cats
  WHERE id = ANY(cat_ids) AND photo_embedding IS NOT NULL
  ORDER BY photo_embedding OPERATOR(extensions.<=>) query_embedding::extensions.vector
  LIMIT limit_n;
$$;
